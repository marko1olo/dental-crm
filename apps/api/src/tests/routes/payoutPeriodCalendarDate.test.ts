/**
 * ЗАРПЛАТНЫЙ МЕСЯЦ: КАЛЕНДАРНУЮ ДАТУ РАЗРЕШАЕТ СЕРВЕР, В ПОЯСЕ КЛИНИКИ.
 *
 * ЧТО БЫЛО СЛОМАНО, И ПОЧЕМУ ЭТО ДОРОЖЕ ОСТАЛЬНОГО
 *
 * Экран выплат считал границы месяца сам:
 * `new Date(year, monthIndex, 1, 0, 0, 0, 0).toISOString()`
 * (`apps/web/src/pages/DoctorPayoutDashboard.tsx`). `new Date(год, месяц, число)`
 * строит местную дату БРАУЗЕРА, а пояс клиники живёт в `clinics.timezone` и
 * браузеру неизвестен. Измерено на выборе «июль 2026»: браузер в Москве (+3)
 * посылал `2026-06-30T21:00:00.000Z`, браузер на Камчатке (+12) —
 * `2026-06-30T12:00:00.000Z`. Девять часов разницы на одном и том же выборе.
 *
 * Это ЗАРПЛАТА. Для камчатской клиники московская граница месяца — 1-е число
 * 09:00 по её часам: касса первой смены месяца не входила в расчёт выплаты, а
 * девять часов 1-го числа следующего месяца — входили. Владелец сети, считающий
 * зарплату филиалам из своего часового пояса, получал у каждого филиала свой
 * сдвиг, и ни один не совпадал с кассовой сменой. Ошибка не в копейках, а в
 * целой смене, и замечают её не в отчёте, а в разговоре с врачом.
 *
 * ВТОРАЯ ПОЛОВИНА ДЕФЕКТА БЫЛА НА СЕРВЕРЕ. `payoutQuerySchema` принимает любую
 * непустую строку, поэтому маршрут «принимал» `2026-05-01` и раньше — но разбирал
 * её `new Date("2026-05-01")` внутри `resolvePayoutPeriod`, а это по
 * спецификации UTC-полночь. То есть календарная дата молча разрешалась в ЧУЖОМ
 * поясе, без единого отказа: не ошибка формата, а неверная сумма.
 *
 * ЧЕМ ПРОВЕРЯЕТСЯ ЗДЕСЬ. Клинике ставится пояс +12, оплата — 00:30 первого мая
 * по её часам, то есть ровно та первая смена. Один и тот же май запрашивается
 * тремя способами, и все три границы читаются из ответа маршрута:
 *   1. календарной датой — границы в поясе клиники, оплата в расчёте ЕСТЬ;
 *   2. мгновением, посчитанным браузером в Москве (прежнее поведение клиента) —
 *      оплаты в расчёте НЕТ;
 *   3. полным ISO со смещением — прежний контракт цел, границы не переразобраны.
 *
 * ЗАПУСК: npx tsx --test apps/api/src/tests/routes/payoutPeriodCalendarDate.test.ts
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	clinics,
	doctorCommissions,
	organizations,
	patients,
	payments,
	users,
	visits,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/** Свой префикс идентификаторов: строки этого файла не пересекаются ни с чьими. */
const ORG_ID = "dce70000-0000-4000-8000-0000000004b0";
const CLINIC_ID = "dce70000-0000-4000-8000-0000000004b1";
const DOCTOR_ID = "dce70000-0000-4000-8000-0000000004b2";
const PATIENT_ID = "dce70000-0000-4000-8000-0000000004b3";
const APPOINTMENT_ID = "dce70000-0000-4000-8000-0000000004b4";
const VISIT_ID = "dce70000-0000-4000-8000-0000000004b5";

const FAR_ZONE = "Asia/Kamchatka";
/** 00:30 первого мая на Камчатке (+12) — первая смена зарплатного месяца. */
const FIRST_SHIFT_PAID_AT = new Date("2026-04-30T12:30:00.000Z");
const FIRST_SHIFT_AMOUNT_RUB = 12_345;

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(
		message,
	);
}

/**
 * Уборка строк фикстуры под тенант-контекстом клиники.
 *
 * Под FORCE RLS `DELETE` без `app.current_tenant` не видит ни одной строки
 * клиники и снимает ноль, а ноль удалённых строк ошибкой не является — уборка
 * доходила бы до конца и молчала. Контекст заодно сужает удаление до своего
 * арендатора: чужую клинику этими восемью строками не задеть даже при ошибке в
 * предикате.
 */
async function removeFixtureRows(): Promise<void> {
	await withFixtureTenant(ORG_ID, async () => {
		await db.delete(payments).where(eq(payments.organizationId, ORG_ID));
		await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
		await db
			.delete(appointments)
			.where(eq(appointments.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db
			.delete(doctorCommissions)
			.where(eq(doctorCommissions.organizationId, ORG_ID));
		await db.delete(users).where(eq(users.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	});
}

type PayoutAnswer = {
	statusCode: number;
	body: string;
	report: {
		period: { from: string; to: string };
		totals: { revenueRub: number; paymentCount: number };
	};
};

describe("зарплатный месяц: календарная дата в поясе клиники", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseAvailable = true;
	const originalEnv = { ...process.env };

	before(async () => {
		// Секрет периметра — первый барьер маршрута выплат; в проверке он снят так
		// же, как в остальных тестах чтения. Личность сотрудника при этом
		// ОБЯЗАТЕЛЬНА и подписывается настоящим токеном: `requirePayoutAccess`
		// отклоняет непроверенную организацию даже на чтение.
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.NODE_ENV = "development";

		// Оба хука боевого server.ts: организация из подписанного токена кладётся в
		// request.tenantId, а обработчик оборачивается в withTenantCtx. Без второго
		// расчёт выплат под FORCE RLS не увидел бы ни одной оплаты, и «первая смена
		// не попала в расчёт» говорило бы о политике, а не о поясе.
		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await app.ready();

		try {
			await removeFixtureRows();
			/*
			 * Весь сев — под тенант-контекстом клиники. Под FORCE RLS в WITH CHECK
			 * политик тенант-таблиц дизъюнкта обхода нет, поэтому вставка без
			 * `app.current_tenant` отвергается кодом 42501 на каждой из этих таблиц.
			 */
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Клиника зарплатной границы" })
					.onConflictDoNothing();
				await db
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Камчатский филиал",
						timezone: FAR_ZONE,
					})
					.onConflictDoNothing();
				await db
					.insert(users)
					.values({
						id: DOCTOR_ID,
						organizationId: ORG_ID,
						fullName: "Сидоров Сидор Сидорович",
						role: "doctor",
					})
					.onConflictDoNothing();
				// Ставка нужна, чтобы расчёт состоялся: без неё строка приходит с
				// признаком «ставка не задана», и касса в итогах не сложилась бы.
				await db
					.insert(doctorCommissions)
					.values({
						organizationId: ORG_ID,
						userId: DOCTOR_ID,
						// specialty и serviceCategory в схеме NOT NULL — те же значения,
						// что и в doctorPayoutsProof.ts.
						specialty: "universal",
						serviceCategory: "therapy",
						commissionPct: "40.00",
						materialCostDeductionPct: "100.00",
						isActive: true,
					})
					.onConflictDoNothing();
				await db
					.insert(patients)
					.values({
						id: PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Ночной Пациент Первомаевич",
					})
					.onConflictDoNothing();
				await db
					.insert(appointments)
					.values({
						id: APPOINTMENT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						doctorUserId: DOCTOR_ID,
						status: "completed",
						startsAt: FIRST_SHIFT_PAID_AT,
						endsAt: new Date(FIRST_SHIFT_PAID_AT.getTime() + 60 * 60_000),
					})
					.onConflictDoNothing();
				await db
					.insert(visits)
					.values({
						id: VISIT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						// Только через приём оплата доходит до врача: своего поля «врач»
						// у визита нет.
						appointmentId: APPOINTMENT_ID,
						status: "signed",
						createdAt: FIRST_SHIFT_PAID_AT,
					})
					.onConflictDoNothing();
				await db
					.insert(payments)
					.values({
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						visitId: VISIT_ID,
						amountRub: FIRST_SHIFT_AMOUNT_RUB,
						status: "paid",
						paidAt: FIRST_SHIFT_PAID_AT,
					})
					.onConflictDoNothing();
			});

			staffToken = signToken(
				{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "owner" },
				authTokenSecret(),
			);
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) await removeFixtureRows();
		await app.close();
		process.env = originalEnv;
	});

	async function callPayouts(query: string): Promise<PayoutAnswer> {
		const response = await app.inject({
			method: "GET",
			url: `/api/billing/payouts?${query}`,
			headers: { "x-dente-staff-token": staffToken },
		});
		let report: PayoutAnswer["report"];
		try {
			report = JSON.parse(response.body);
		} catch {
			report = null as never;
		}
		return { statusCode: response.statusCode, body: response.body, report };
	}

	test("календарная дата даёт границы месяца в поясе клиники, и первая смена в расчёте", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const answer = await callPayouts("from=2026-05-01&to=2026-05-31");
		assert.equal(answer.statusCode, 200, answer.body);

		// Границы до миллисекунды. Конец периода ВКЛЮЧАЮЩИЙ: начало следующих
		// суток минус миллисекунда — длину месяца никто не считает руками.
		assert.equal(
			answer.report.period.from,
			"2026-04-30T12:00:00.000Z",
			`начало зарплатного месяца посчитано не в поясе клиники: ${answer.report.period.from}`,
		);
		assert.equal(
			answer.report.period.to,
			"2026-05-31T11:59:59.999Z",
			`конец зарплатного месяца посчитан не в поясе клиники: ${answer.report.period.to}`,
		);
		assert.equal(
			answer.report.totals.paymentCount,
			1,
			"оплата первой смены месяца не попала в расчёт выплат: граница снова считается в чужом поясе",
		);
		assert.equal(answer.report.totals.revenueRub, FIRST_SHIFT_AMOUNT_RUB);
	});

	test("мгновение из браузера в Москве теряет первую смену — цена прежнего поведения", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		/*
		 * Ровно то, что посылал экран выплат до правки для «мая 2026» из Москвы:
		 * new Date(2026, 4, 1, 0, 0, 0, 0).toISOString() === 2026-04-30T21:00:00.000Z
		 * new Date(2026, 5, 0, 23, 59, 59, 999).toISOString() === 2026-05-31T20:59:59.999Z
		 */
		const answer = await callPayouts(
			"from=2026-04-30T21%3A00%3A00.000Z&to=2026-05-31T20%3A59%3A59.999Z",
		);
		assert.equal(answer.statusCode, 200, answer.body);
		assert.equal(answer.report.period.from, "2026-04-30T21:00:00.000Z");
		assert.equal(
			answer.report.totals.paymentCount,
			0,
			"московская граница внезапно захватила камчатскую первую смену: проверка перестала показывать дефект",
		);
		assert.equal(answer.report.totals.revenueRub, 0);
	});

	test("полный ISO со смещением маршрут выплат принимает и границы не переразбирает", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const answer = await callPayouts(
			"from=2026-05-01T00%3A00%3A00%2B12%3A00&to=2026-05-31T23%3A59%3A59%2B12%3A00",
		);
		assert.equal(answer.statusCode, 200, answer.body);
		assert.equal(
			answer.report.period.from,
			"2026-04-30T12:00:00.000Z",
			answer.body,
		);
		assert.equal(
			answer.report.period.to,
			"2026-05-31T11:59:59.000Z",
			answer.body,
		);
		assert.equal(answer.report.totals.paymentCount, 1, answer.body);
	});

	test("несуществующая календарная дата отклоняется, а не превращается в соседнюю", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		for (const broken of ["2026-02-30", "2026-13-01"]) {
			const answer = await callPayouts(`from=${broken}&to=2026-05-31`);
			assert.equal(answer.statusCode, 400, `${broken} принят: ${answer.body}`);
		}
	});
});
