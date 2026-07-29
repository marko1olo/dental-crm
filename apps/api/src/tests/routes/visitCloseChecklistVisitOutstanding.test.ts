/**
 * ЗАМОК: ОСТАТОК В КАРТОЧКЕ ЗАКРЫТИЯ ПРИЁМА — ПО ЭТОМУ ПРИЁМУ, А НЕ ПО КЛИНИКЕ.
 *
 * ЧТО ЭТОТ ФАЙЛ ЛОВИТ, И ЧЕМ ЭТО ВРЕДИЛО КЛИНИКЕ. Пункт «Оплата связана» читал
 * `buildBillingSummary().totalDueRub` — функцию БЕЗ АРГУМЕНТОВ, которая
 * складывает все позиции лечения и все платежи КЛИНИКИ и вычитает одно из
 * другого. Приём в расчёт не входил вообще. Замер на живой базе 2026-07-29 (до
 * правки): все ДЕСЯТЬ приёмов клиники `d0000000-…-d001` получали одну и ту же
 * строку «Остаток по плану 51 400 ₽» и незакрытую галочку — включая приём
 * `…-000000000401`, где пациент заплатил 5 400,00 из 5 400,00, то есть ровно
 * всё. Администратор, закрывающий такой приём, требовал с пациента 51 400 ₽,
 * которых тот не должен, либо не закрывал приём.
 *
 * ПОЧЕМУ ЧЕРЕЗ МАРШРУТ, А НЕ ВЫЗОВОМ ФУНКЦИИ. Проверяется не арифметика — её
 * проверяет `apps/api/src/money/patientDebt.test.ts` — а то, что ответ на
 * ПОДПИСАНИЕ приёма несёт остаток именно этого приёма. Между расчётом и ответом
 * стоят охрана периметра, гидратация доменного состояния и разбор схемой
 * `acceptVisitDraftResponseSchema`; вызов функции ни одного из этих звеньев не
 * проходит. Приложение поднимается в СВОЁМ процессе (`app.inject`): сервер на
 * порту 4100 отдаёт другую сборку, и через него не доказывается ничего.
 *
 * ПОЧЕМУ ЧЕТЫРЕ ПРИЁМА, А НЕ ОДИН. Карточка, одинаковая для любого приёма,
 * ничего не сообщает — именно так дефект и выглядел. Поэтому здесь оплаченный,
 * недоплаченный, переплаченный и приём без денег вообще: четыре разных ответа
 * на одних и тех же данных одной клиники.
 *
 * ПОЧЕМУ ЕСТЬ ЛИШНЯЯ ПОЗИЦИЯ БЕЗ ПРИЁМА. 26 500,00 ₽ у второго пациента не
 * привязаны ни к одному приёму: они делают нетто по клинике (26 500,00)
 * непохожим ни на один остаток по приёму. Без этого перекоса «0,00» в карточке
 * оплаченного приёма совпал бы с нулём по клинике, и тест прошёл бы на прежнем,
 * неверном коде.
 *
 * СВОЯ КЛИНИКА, ЧУЖИЕ ДАННЫЕ НЕ ТРОГАЮТСЯ. Идентификаторы выводятся из имени
 * этого файла (`fixtureUuid`), уборка идёт и на входе, и на выходе: прогон,
 * убитый снаружи, до `after` не доходит и оставил бы строки в живой базе.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
	acceptVisitDraftResponseSchema,
	formatKopecksRu,
	type VisitCloseChecklist,
} from "@dental/shared";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "visitCloseChecklistVisitOutstanding";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
/** Второй пациент нужен только для перекоса итога по клинике. */
const SKEW_PATIENT_ID = fixtureUuid(NAMESPACE, 3);

const PAID_VISIT_ID = fixtureUuid(NAMESPACE, 10);
const UNDERPAID_VISIT_ID = fixtureUuid(NAMESPACE, 11);
const OVERPAID_VISIT_ID = fixtureUuid(NAMESPACE, 12);
const EMPTY_VISIT_ID = fixtureUuid(NAMESPACE, 13);

/**
 * Суммы намеренно с копейками и намеренно такие, что их разности не круглые:
 * 3 491,49 = 1 000,00 + 1 001,82 + 1 489,67 — то сложение, которое в рублях даёт
 * 3491.4900000000002 и не проходит `moneyRubSchema`. Если где-то на пути от
 * позиции до текста пункта деньги пойдут через плавающую точку, разность
 * 1 990,99 − 1 500,50 = 490,49 это покажет.
 */
const PAID_CHARGE_RUB = "3491.49";
const PAID_PAYMENT_RUB = "3491.49";
const UNDERPAID_CHARGE_RUB = "1990.99";
const UNDERPAID_PAYMENT_RUB = "1500.50";
const OVERPAID_CHARGE_RUB = "1500.50";
const OVERPAID_PAYMENT_RUB = "1990.99";
/** Позиция БЕЗ приёма: перекашивает итог клиники, ни в один приём не входит. */
const UNLINKED_CHARGE_RUB = "26500.00";

const EXPECTED_UNDERPAID_KOPECKS = 49_049; // 1 990,99 − 1 500,50
const EXPECTED_OVERPAID_KOPECKS = 49_049; // 1 990,99 − 1 500,50

async function firstRow<T extends Record<string, unknown>>(
	query: ReturnType<typeof sql>,
): Promise<T | null> {
	const result = await db.execute(query);
	return ((result.rows as T[])[0] ?? null) as T | null;
}

async function insertVisit(visitId: string, patientId: string): Promise<void> {
	await db.execute(sql`
		insert into visits (id, organization_id, patient_id, status, revision)
		values (${visitId}, ${ORG_ID}, ${patientId}, 'draft', 1)
	`);
}

async function insertCharge(
	visitId: string | null,
	patientId: string,
	amountRub: string,
): Promise<void> {
	await db.execute(sql`
		insert into treatment_items
			(organization_id, patient_id, visit_id, title, quantity, price_rub, unit_price_rub, discount_rub, status)
		values (${ORG_ID}, ${patientId}, ${visitId}, ${"Замок остатка по приёму"}, 1,
		        ${amountRub}::numeric, ${amountRub}::numeric, 0, 'completed')
	`);
}

async function insertPayment(
	visitId: string,
	patientId: string,
	amountRub: string,
): Promise<void> {
	await db.execute(sql`
		insert into payments (organization_id, patient_id, visit_id, amount_rub, method, status)
		values (${ORG_ID}, ${patientId}, ${visitId}, ${amountRub}::numeric, 'card', 'paid')
	`);
}

/** Тело подписания: тесту важна только заполненность полей ЭМК. */
function acceptPayload() {
	return {
		draft: {
			warnings: [],
			complaint: "Боль при накусывании",
			anamnesis: "Впервые",
			objectiveStatus: "Глубокая кариозная полость 36",
			diagnosis: "K02.1 Кариес дентина",
			treatmentPlan: "Лечение кариеса 36",
		},
		doctorSummary: "Лечение кариеса 36 выполнено",
		clientMutationId: null,
		baseRevision: null,
		clientSavedAt: null,
	};
}

function paymentItem(checklist: VisitCloseChecklist) {
	const item = checklist.items.find((entry) => entry.id === "payment-link");
	assert.ok(item, "в карточке закрытия приёма нет пункта «payment-link»");
	return item;
}

describe("карточка закрытия приёма: остаток ПО ЭТОМУ ПРИЁМУ через маршрут подписания", () => {
	let app: FastifyInstance | null = null;
	let clinicToken = "";
	let databaseAvailable = true;
	/** Нетто по клинике — то самое число, которое стояло в карточке раньше. */
	let clinicNetRub = "";
	const cards = new Map<string, VisitCloseChecklist>();

	before(async () => {
		try {
			// Периметр открыт только для своего процесса: секрета администратора у
			// теста нет, а мягкий режим разрешён вне production (accessGuard.ts).
			process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

			// Уборка НА ВХОДЕ: прогон, убитый снаружи, до `after` не доходит.
			await purgeFixtureOrganizations([ORG_ID]);

			await db.execute(sql`
				insert into organizations (id, name) values (${ORG_ID}, ${"Клиника замка остатка по приёму"})
			`);
			await db.execute(sql`
				insert into patients (id, organization_id, full_name, status)
				values (${PATIENT_ID}, ${ORG_ID}, ${"Замок остатка по приёму (удалить)"}, 'active')
			`);
			await db.execute(sql`
				insert into patients (id, organization_id, full_name, status)
				values (${SKEW_PATIENT_ID}, ${ORG_ID}, ${"Перекос итога клиники (удалить)"}, 'active')
			`);

			await insertVisit(PAID_VISIT_ID, PATIENT_ID);
			await insertVisit(UNDERPAID_VISIT_ID, PATIENT_ID);
			await insertVisit(OVERPAID_VISIT_ID, PATIENT_ID);
			await insertVisit(EMPTY_VISIT_ID, PATIENT_ID);

			await insertCharge(PAID_VISIT_ID, PATIENT_ID, PAID_CHARGE_RUB);
			await insertPayment(PAID_VISIT_ID, PATIENT_ID, PAID_PAYMENT_RUB);
			await insertCharge(UNDERPAID_VISIT_ID, PATIENT_ID, UNDERPAID_CHARGE_RUB);
			await insertPayment(
				UNDERPAID_VISIT_ID,
				PATIENT_ID,
				UNDERPAID_PAYMENT_RUB,
			);
			await insertCharge(OVERPAID_VISIT_ID, PATIENT_ID, OVERPAID_CHARGE_RUB);
			await insertPayment(OVERPAID_VISIT_ID, PATIENT_ID, OVERPAID_PAYMENT_RUB);
			// Приём EMPTY_VISIT_ID остаётся без позиций и без оплат намеренно.
			await insertCharge(null, SKEW_PATIENT_ID, UNLINKED_CHARGE_RUB);

			const clinic = await firstRow<{ net: string }>(sql`
				select (
					coalesce((select sum(greatest(unit_price_rub * quantity - discount_rub, 0))
					            from treatment_items
					           where organization_id = ${ORG_ID} and status <> 'cancelled'), 0)
					- coalesce((select sum(amount_rub) from payments
					             where organization_id = ${ORG_ID} and status = 'paid'), 0)
				)::numeric(12,2)::text as net
			`);
			assert.ok(clinic, "нетто по клинике не посчиталось");
			clinicNetRub = clinic.net;

			app = Fastify();
			await registerVisitRoutes(app);
			await app.ready();
			clinicToken = signToken({ organizationId: ORG_ID }, TOKEN_SECRET());

			for (const visitId of [
				PAID_VISIT_ID,
				UNDERPAID_VISIT_ID,
				OVERPAID_VISIT_ID,
				EMPTY_VISIT_ID,
			]) {
				const response = await app.inject({
					method: "POST",
					url: `/api/visits/${visitId}/draft/accept`,
					headers: {
						"x-dente-clinic-token": clinicToken,
						"content-type": "application/json",
					},
					payload: acceptPayload(),
				});
				assert.equal(
					response.statusCode,
					200,
					`POST /api/visits/${visitId}/draft/accept ответил ${response.statusCode}: ${response.body.slice(0, 400)}`,
				);
				const parsed = acceptVisitDraftResponseSchema.safeParse(
					JSON.parse(response.body),
				);
				assert.ok(
					parsed.success,
					`ответ маршрута не сходится с acceptVisitDraftResponseSchema: ${
						parsed.success
							? ""
							: JSON.stringify(parsed.error.issues.slice(0, 6))
					}`,
				);
				cards.set(visitId, parsed.data.visitCloseChecklist);
			}
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				databaseAvailable = false;
				return;
			}
			throw error;
		}
	});

	after(async () => {
		if (app) await app.close();
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
			const leftovers = await firstRow<{ n: number }>(
				sql`select count(*)::int as n from organizations where id = ${ORG_ID}`,
			);
			assert.equal(leftovers?.n, 0, "замок не убрал за собой свою клинику");
		}
		await pool.end();
	});

	it("перекос итога по клинике на месте: иначе тест прошёл бы и на прежнем коде", (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		// 3 491,49 + 1 990,99 + 1 500,50 + 26 500,00 назначено, 6 982,98 получено.
		assert.equal(clinicNetRub, "26500.00");
	});

	it("полностью оплаченный приём: остаток 0,00 ₽ и галочка ЗАКРЫТА", (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		const item = paymentItem(cards.get(PAID_VISIT_ID) as VisitCloseChecklist);

		assert.equal(item.visitId, PAID_VISIT_ID);
		assert.equal(
			item.ready,
			true,
			"пациент заплатил 3 491,49 из 3 491,49 — требовать нечего",
		);
		assert.equal(
			item.detail,
			`Оплата по приёму закрыта: остаток ${formatKopecksRu(0)}.`,
		);
		assert.ok(
			!item.detail.includes("26"),
			`в карточке приёма оказалось нетто по клинике (${clinicNetRub}): ${item.detail}`,
		);
	});

	it("недоплаченный приём: остаток ровно 490,49 ₽, а не сумма по клинике", (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		const item = paymentItem(
			cards.get(UNDERPAID_VISIT_ID) as VisitCloseChecklist,
		);

		assert.equal(item.visitId, UNDERPAID_VISIT_ID);
		assert.equal(item.ready, false);
		assert.equal(
			item.detail,
			`Остаток по приёму ${formatKopecksRu(EXPECTED_UNDERPAID_KOPECKS)} (позиций 1, оплат 1).`,
		);
		// Копейки не потерялись: 1 990,99 − 1 500,50 = 490,49, а не 490,5 и не 490.
		assert.ok(item.detail.includes("490,49"), item.detail);
		assert.ok(
			!item.detail.includes("26 500") && !item.detail.includes("26500"),
			`остаток по клинике (${clinicNetRub}) снова попал в карточку приёма: ${item.detail}`,
		);
	});

	it("остаток по приёму сходится с прямым SQL по ЭТОМУ приёму", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		for (const visitId of [
			PAID_VISIT_ID,
			UNDERPAID_VISIT_ID,
			OVERPAID_VISIT_ID,
		]) {
			const row = await firstRow<{ outstanding: string }>(sql`
				select greatest(
					coalesce((select sum(greatest(unit_price_rub * quantity - discount_rub, 0))
					            from treatment_items
					           where visit_id = ${visitId} and status <> 'cancelled'), 0)
					- coalesce((select sum(amount_rub) from payments
					             where visit_id = ${visitId} and status = 'paid'), 0),
					0
				)::numeric(12,2)::text as outstanding
			`);
			assert.ok(row, `SQL не посчитал остаток приёма ${visitId}`);

			const kopecks = Math.round(Number(row.outstanding) * 100);
			const item = paymentItem(cards.get(visitId) as VisitCloseChecklist);
			const expected =
				kopecks > 0
					? `Остаток по приёму ${formatKopecksRu(kopecks)} (позиций 1, оплат 1).`
					: null;
			if (expected) {
				assert.equal(item.detail, expected, `приём ${visitId}`);
			} else {
				assert.equal(
					item.ready,
					true,
					`приём ${visitId}: по SQL остаток 0, а галочка не закрыта`,
				);
			}
		}
	});

	it("переплаченный приём: остаток 0, но переплата НАЗВАНА, а не спрятана в нуль", (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		const item = paymentItem(
			cards.get(OVERPAID_VISIT_ID) as VisitCloseChecklist,
		);

		assert.equal(
			item.ready,
			true,
			"с пациента по этому приёму требовать нечего",
		);
		assert.equal(
			item.detail,
			`Приём оплачен полностью, переплата ${formatKopecksRu(EXPECTED_OVERPAID_KOPECKS)} — ` +
				"вернуть пациенту или зачесть в счёт следующего приёма.",
		);
	});

	it("приём без позиций и оплат: «неизвестно», а не «остаток 0» — галочка НЕ закрыта", (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		const item = paymentItem(cards.get(EMPTY_VISIT_ID) as VisitCloseChecklist);

		assert.equal(
			item.ready,
			false,
			"галочка, закрытая по незнанию, хуже незакрытой: администратор проверит вторую и не проверит первую",
		);
		assert.match(item.detail, /^Остаток по приёму не рассчитан: /);
		assert.match(
			item.detail,
			/не заведено ни одной позиции лечения и ни одной оплаты/,
		);
		assert.ok(
			!item.detail.includes("0,00") && !item.detail.includes("26"),
			`незнание напечатано суммой: ${item.detail}`,
		);
	});

	it("четыре приёма — четыре РАЗНЫХ карточки, а не одна на всю клинику", (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");
		const visitIds = [
			PAID_VISIT_ID,
			UNDERPAID_VISIT_ID,
			OVERPAID_VISIT_ID,
			EMPTY_VISIT_ID,
		];

		const details = visitIds.map(
			(visitId) =>
				paymentItem(cards.get(visitId) as VisitCloseChecklist).detail,
		);
		assert.equal(
			new Set(details).size,
			4,
			`пункт «Оплата связана» повторился на разных приёмах:\n${details.join("\n")}`,
		);

		for (const visitId of visitIds) {
			const card = cards.get(visitId) as VisitCloseChecklist;
			assert.equal(card.visitId, visitId);
			for (const item of card.items) {
				assert.equal(
					item.visitId,
					visitId,
					`пункт «${item.id}» указывает на чужой приём`,
				);
			}
		}

		// Одинаковая целиком карточка означает, что она собрана по общему
		// состоянию клиники, а не по приёму.
		assert.notEqual(
			JSON.stringify(cards.get(PAID_VISIT_ID)),
			JSON.stringify(cards.get(UNDERPAID_VISIT_ID)),
		);
	});
});
