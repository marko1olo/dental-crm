/**
 * СТОРОЖ СУММЫ СЧЁТА: ДОКУМЕНТ НЕ ИМЕЕТ ПРАВА ПРОТИВОРЕЧИТЬ САМ СЕБЕ.
 *
 * ЧТО БЫЛО СЛОМАНО, И ЭТО ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. В `documents/guards.ts`
 * стояло `totalAmountRub = facts.plannedAmountRub > 0 ? facts.plannedAmountRub : null`,
 * и это БЕЗУСЛОВНО затирало присланный итог. Сквозной прогон денежной цепочки
 * 2026-07-29 замерил следствие: счёт `payment_invoice` создан (HTTP 201), в теле
 * счёта строки на 3491,49 ₽ — они прошли и проверку состава строк, и проверку
 * итога, — а `generated_documents.total_amount_rub = NULL`.
 *
 * ВРЕД КЛИНИКЕ. Пациент получал счёт без суммы, а бухгалтерия не видела
 * выставленного требования: счёт есть, денег в нём нет. Это не «сумма
 * неизвестна» — печатная форма и учёт расходились ВНУТРИ ОДНОГО документа, и
 * какая из двух половин правда, по данным определить нельзя.
 *
 * ПОЧЕМУ ЭТОТ СТОРОЖ ОБЯЗАН ДЕРЖАТЬ ДВА МИРА. Первопричина пустого плана — свой
 * отдельный долг: позиции плана лечения не доходят до `treatment_items`, и по
 * нему работает другой инженер. Поэтому здесь проверяются ОБА состояния мира:
 * когда позиций плана нет (сумма счёта обязана взяться из тела документа) и
 * когда они появились (сумма обязана взяться из плана). Правка, верная только в
 * одном из двух, — не правка.
 *
 * ЧТО ЗДЕСЬ НЕ ОСЛАБЛЕНО. Если план лечения существует и расходится с телом
 * документа, счёт по-прежнему отбивается с 409: подстановка тела вместо плана
 * не заменяет проверку, а работает только там, где плана нет вовсе. Отдельная
 * проверка ниже это и держит.
 *
 * И ЧТО ОСТАЛОСЬ ЗАКОННЫМ NULL. У заказ-наряда в лабораторию денежного поля нет
 * ни в теле, ни в плане — у него сумма ДЕЙСТВИТЕЛЬНО неизвестна, и пустая
 * колонка правдива. Подставлять туда ноль было бы ложью, неотличимой от суммы.
 *
 * ЖИВАЯ БАЗА, СВОЯ КЛИНИКА. Идентификаторы выведены из имени этого файла
 * (`fixtureUuid`), уборка идёт и на входе, и на выходе. Суммы сверяются ТЕКСТОМ
 * из numeric-колонки: 3491,49 обязано быть ровно «3491.49», а не
 * 3491.4900000000002 — такое число уже прошло сложение в плавающей точке и в
 * печатной форме встанет иначе, чем в базе.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "invoiceKeepsItsAmount:" + randomUUID();
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 11);
const OWNER_ID = fixtureUuid(NAMESPACE, 21);
/** Пациент без позиций плана: сумма счёта существует только в теле документа. */
const PATIENT_NO_PLAN = fixtureUuid(NAMESPACE, 41);
/** Пациент с позициями плана: сумма счёта обязана взяться из плана. */
const PATIENT_WITH_PLAN = fixtureUuid(NAMESPACE, 42);
const VISIT_NO_PLAN = fixtureUuid(NAMESPACE, 51);
const VISIT_WITH_PLAN = fixtureUuid(NAMESPACE, 52);

/** Цены с копейками: ровно те, на которых проект уже ловил потерю копеек. */
const PRICE_ONE = 1500.5;
const PRICE_TWO = 1990.99;
const PLAN_TOTAL_TEXT = "3491.49";
const PLAN_TOTAL_RUB = 3491.49;
/** Итог, заведомо НЕ равный плану: им проверяется, что план всё ещё главный. */
const WRONG_TOTAL_RUB = 1000;

const TODAY_TEXT = new Date().toISOString().slice(0, 10);

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type Injected = { statusCode: number; body: string; json: any };

/** Сумма документа — независимым SQL, ТЕКСТОМ из numeric-колонки. */
async function storedTotalText(documentId: string): Promise<string | null> {
	/*
	 * Чтение под тенант-контекстом. Под принудительным RLS SELECT без него не
	 * ошибается, а отдаёт ноль строк, и сверка суммы упиралась бы в «документа нет»
	 * вместо самой суммы.
	 */
	const result = await withFixtureTenant(ORGANIZATION_ID, async () =>
		db.execute<{ total: string | null }>(sql`
			select total_amount_rub::text as total from generated_documents
			 where id = ${documentId}::uuid and organization_id = ${ORGANIZATION_ID}::uuid
		`),
	);
	const row = (result.rows as { total: string | null }[])[0];
	assert.ok(
		row !== undefined,
		`документ ${documentId} не найден в базе — сверять нечего`,
	);
	return row.total;
}

describe("сумма счёта не теряется по дороге в базу", () => {
	let app: FastifyInstance;
	let headers: Record<string, string> = {};
	const originalEnv = { ...process.env };

	async function call(
		method: "GET" | "POST" | "PUT",
		url: string,
		payload?: unknown,
	): Promise<Injected> {
		const requestHeaders =
			payload === undefined
				? Object.fromEntries(
						Object.entries(headers).filter(
							([name]) => name.toLowerCase() !== "content-type",
						),
					)
				: headers;
		const response = await app.inject({
			method,
			url,
			headers: requestHeaders,
			...(payload === undefined
				? {}
				: { payload: payload as Record<string, unknown> }),
		});
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		let json: any = null;
		try {
			json = JSON.parse(response.body);
		} catch {
			json = null;
		}
		return { statusCode: response.statusCode, body: response.body, json };
	}

	function invoicePayload(options: {
		patientId: string;
		visitId: string;
		invoiceNumber: string;
		totalAmountRub: number;
		lines: { serviceName: string; toothOrArea: string; unitPriceRub: number }[];
	}) {
		return {
			patientId: options.patientId,
			visitId: options.visitId,
			kind: "payment_invoice",
			title: `Счёт на оплату ${options.invoiceNumber}`,
			totalAmountRub: options.totalAmountRub,
			payload: {
				paymentInvoice: {
					invoiceNumber: options.invoiceNumber,
					invoiceDate: TODAY_TEXT,
					payerFullName: "Плательщик сторожа суммы счёта",
					paymentPurpose: "Оплата стоматологических услуг по плану лечения",
					serviceLines: options.lines.map((line) => ({
						serviceName: line.serviceName,
						toothOrArea: line.toothOrArea,
						quantity: 1,
						unitPriceRub: line.unitPriceRub,
						discountRub: 0,
						totalRub: line.unitPriceRub,
					})),
					totalAmountRub: options.totalAmountRub,
					dueDate: TODAY_TEXT,
					paymentTerms:
						"Оплата в кассе клиники или переводом в течение трёх рабочих дней.",
					clinicBankDetails:
						"р/с 40702810000000000031, банк сторожа суммы, БИК 049999999",
					cashlessPaymentAllowed: true,
					cashDeskPaymentAllowed: true,
					clinicRequisitesVerified: true,
					serviceScopeConfirmed: true,
					payerInformedInvoiceIsNotFiscalReceipt: true,
				},
			},
		};
	}

	const planLines = [
		{
			serviceName: "Лечение кариеса 36",
			toothOrArea: "36",
			unitPriceRub: PRICE_ONE,
		},
		{ serviceName: "Пломба 46", toothOrArea: "46", unitPriceRub: PRICE_TWO },
	];

	before(async () => {
		process.env.NODE_ENV = "test";
		const adminSecret = randomBytes(32).toString("base64url");
		process.env.DENTE_CLINICAL_ADMIN_SECRET = adminSecret;
		process.env.DENTE_SETTINGS_ADMIN_SECRET = adminSecret;

		// Уборка следов прерванного прогона ДО посева: см. докстринг фикстуры.
		await purgeFixtureOrganizations([ORGANIZATION_ID]);

		/*
		 * Сев под тенант-контекстом клиники: у `clinics`, `users`, `patients`,
		 * `visits` и `treatment_items` в WITH CHECK стоит только
		 * `organization_id = current_tenant`, без дизъюнкта обхода, поэтому вставка
		 * без контекста отвергается кодом 42501.
		 */
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.execute(sql`
				insert into organizations (id, name)
				values (${ORGANIZATION_ID}::uuid, ${"Сторож суммы счёта"})
				on conflict (id) do nothing`);
			await db.execute(sql`
				insert into clinics (id, organization_id, name, timezone)
				values (${CLINIC_ID}::uuid, ${ORGANIZATION_ID}::uuid, ${"Кабинет сторожа суммы"}, 'Europe/Moscow')`);
			await db.execute(sql`
				insert into users (id, organization_id, full_name, role, is_active)
				values (${OWNER_ID}::uuid, ${ORGANIZATION_ID}::uuid, ${"Владелец сторожа суммы"}, 'owner', true)`);
			// Дата рождения и телефон обязательны: без них шапка документа печатает
			// «не указана»/«не указан», и выдача отбивается как незаполненный документ.
			await db.execute(sql`
				insert into patients (id, organization_id, full_name, birth_date, phone, status)
				values (${PATIENT_NO_PLAN}::uuid, ${ORGANIZATION_ID}::uuid, ${"Пациент без позиций плана"}, '1991-04-12', '+79000000031', 'active'),
				       (${PATIENT_WITH_PLAN}::uuid, ${ORGANIZATION_ID}::uuid, ${"Пациент с позициями плана"}, '1987-09-30', '+79000000032', 'active')`);
			await db.execute(sql`
				insert into visits (id, organization_id, patient_id, status)
				values (${VISIT_NO_PLAN}::uuid, ${ORGANIZATION_ID}::uuid, ${PATIENT_NO_PLAN}::uuid, 'draft'),
				       (${VISIT_WITH_PLAN}::uuid, ${ORGANIZATION_ID}::uuid, ${PATIENT_WITH_PLAN}::uuid, 'draft')`);
			/*
			 * ВТОРОЕ СОСТОЯНИЕ МИРА — позиции плана лечения существуют. Первопричина их
			 * отсутствия закрывается другим инженером, поэтому здесь они ставятся прямым
			 * SQL: правка обязана быть верной и когда суммы плана появятся. Второй
			 * пациент намеренно оставлен БЕЗ позиций — на нём проверяется сегодняшнее
			 * состояние живой базы.
			 */
			await db.execute(sql`
				insert into treatment_items
				  (organization_id, patient_id, visit_id, tooth_code, title, quantity, price_rub, unit_price_rub, discount_rub, status, planned_doctor_user_id)
				values
				  (${ORGANIZATION_ID}::uuid, ${PATIENT_WITH_PLAN}::uuid, ${VISIT_WITH_PLAN}::uuid, '36', ${"Лечение кариеса 36"}, 1, ${PRICE_ONE}, ${PRICE_ONE}, 0, 'approved', ${OWNER_ID}::uuid),
				  (${ORGANIZATION_ID}::uuid, ${PATIENT_WITH_PLAN}::uuid, ${VISIT_WITH_PLAN}::uuid, '46', ${"Пломба 46"}, 1, ${PRICE_TWO}, ${PRICE_TWO}, 0, 'approved', ${OWNER_ID}::uuid)`);
		});

		headers = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORGANIZATION_ID },
				authTokenSecret(),
			),
			"x-dente-staff-token": signToken(
				{ organizationId: ORGANIZATION_ID, userId: OWNER_ID, role: "owner" },
				authTokenSecret(),
			),
			"x-dente-admin-secret": adminSecret,
			"content-type": "application/json",
		};

		// Оба хука изоляции боевого server.ts: он наполняет request.user и
		// оборачивает обработчик в `withTenantCtx`, без которого маршрут документов
		// не видит ни клинику, ни план лечения.
		app = createTenantTestApp();
		await registerSettingsRoutes(app);
		await registerDocumentRoutes(app);
		await app.ready();

		// Реквизиты клиники нужны выдаче любого платёжного документа
		// (routes/documents.ts: documentIssueBlockReason).
		const profile = await call("PUT", "/api/settings/clinic/profile", {
			clinicName: "Кабинет сторожа суммы",
			legalName: "Сторож суммы счёта",
			inn: "7700000031",
			kpp: "770001001",
			ogrn: "1027700000031",
			address: "г. Москва, ул. Проверочная, 31",
			phone: "+79000000030",
			email: "invoice-keeps-amount@example.test",
			medicalLicenseNumber: "ЛО-77-01-000031",
			medicalLicenseIssuedAt: "2025-01-15",
			medicalLicenseIssuer: "Департамент здравоохранения города Москвы",
			bankDetails: "р/с 40702810000000000031, БИК 049999999",
			signatoryName: "Владелец сторожа суммы",
			signatoryTitle: "главный врач",
			timezone: "Europe/Moscow",
		});
		assert.equal(
			profile.statusCode,
			200,
			`реквизиты клиники не записаны: ${profile.body}`,
		);
	});

	after(async () => {
		await app?.close();
                await withFixtureTenant(ORGANIZATION_ID, async () => {
                        await db.execute(
                                sql.raw(
                                        "delete from generated_documents where organization_id = '" +
                                                ORGANIZATION_ID +
                                                "'",
                                ),
                        );
                });
		// Счёт остатка — под тенант-контекстом: без него политика прячет от счёта
		// любые уцелевшие документы, и проверка «мусора не осталось» стала бы тождеством.
		const leftovers = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ n: number }>(sql`
				select count(*)::int as n from generated_documents where organization_id = ${ORGANIZATION_ID}::uuid
			`),
		);
		assert.equal(
			(leftovers.rows as { n: number }[])[0]?.n,
			0,
			"сторож не убрал свои документы из живой базы",
		);
		process.env = originalEnv;
		await pool.end();
	});

	test("позиций плана НЕТ: сумма счёта берётся из его собственного тела, а не теряется", async () => {
		// Предпосылка проверяется под тенант-контекстом: без него счёт всегда ноль,
		// и «плана нет» подтверждалось бы скрытием строк, а не их отсутствием.
		const itemsBefore = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ n: number }>(sql`
				select count(*)::int as n from treatment_items
				 where organization_id = ${ORGANIZATION_ID}::uuid and patient_id = ${PATIENT_NO_PLAN}::uuid
			`),
		);
		assert.equal(
			(itemsBefore.rows as { n: number }[])[0]?.n,
			0,
			"предпосылка теста не выполнена: позиции плана уже есть, а проверяется случай пустого плана",
		);

		const created = await call(
			"POST",
			"/api/documents",
			invoicePayload({
				patientId: PATIENT_NO_PLAN,
				visitId: VISIT_NO_PLAN,
				invoiceNumber: "СЧ-СТОРОЖ-0001",
				totalAmountRub: PLAN_TOTAL_RUB,
				lines: planLines,
			}),
		);
		assert.equal(created.statusCode, 201, `счёт не создан: ${created.body}`);

		const stored = await storedTotalText(created.json.id as string);
		assert.equal(
			stored,
			PLAN_TOTAL_TEXT,
			`счёт создан (HTTP 201), в теле строки на ${PLAN_TOTAL_TEXT} ₽, а в базе total_amount_rub = ` +
				`${stored === null ? "NULL" : stored}. Пациент получает счёт без суммы, бухгалтерия не видит ` +
				"выставленного требования: счёт есть, денег в нём нет. Пустой план лечения — не основание " +
				"выбросить сумму, напечатанную в теле того же документа.",
		);

		// Копейки проверяются и в ответе маршрута: экран печатает именно его.
		assert.equal(
			created.json.totalAmountRub,
			PLAN_TOTAL_RUB,
			`в ответе маршрута сумма ${created.json.totalAmountRub}, а не ${PLAN_TOTAL_RUB}`,
		);
		assert.equal(
			created.json.totalAmountRub.toFixed(2),
			PLAN_TOTAL_TEXT,
			`грязь ниже копейки в ответе: ${created.json.totalAmountRub}`,
		);
		console.log(`  план пуст: сумма счёта в базе ${stored} ₽`);
	});

	test("позиции плана ЕСТЬ: сумма счёта берётся из плана, и план остаётся главным", async () => {
		const created = await call(
			"POST",
			"/api/documents",
			invoicePayload({
				patientId: PATIENT_WITH_PLAN,
				visitId: VISIT_WITH_PLAN,
				invoiceNumber: "СЧ-СТОРОЖ-0003",
				totalAmountRub: PLAN_TOTAL_RUB,
				lines: planLines,
			}),
		);
		assert.equal(
			created.statusCode,
			201,
			`счёт по существующему плану не создан: ${created.body}`,
		);
		assert.equal(
			await storedTotalText(created.json.id as string),
			PLAN_TOTAL_TEXT,
			"при существующем плане лечения сумма счёта обязана совпадать с планом до копейки",
		);
	});

	test("выданный счёт уносит свою сумму пациенту, а не пустую колонку", async () => {
		/*
		 * ВЫДАЧА ИДЁТ ПО ПАЦИЕНТУ С ПЛАНОМ, И ЭТО НЕ УДОБНАЯ ПОДГОНКА. Выдача
		 * финансового документа отдельно требует состав услуг ИЗ ПЛАНА ЛЕЧЕНИЯ
		 * (routes/documents.ts: documentIssueBlockReason — «нужен состав услуг из
		 * плана лечения»). Замерено этой проверкой: счёт при пустом плане создаётся
		 * с верной суммой, но выдать его нельзя вовсе — 409. Этот гейт принадлежит
		 * долгу «план лечения → treatment_items», а не сумме счёта, и подменять им
		 * замок на сумму нельзя: тогда проверка мерила бы чужое звено.
		 */
		const created = await call(
			"POST",
			"/api/documents",
			invoicePayload({
				patientId: PATIENT_WITH_PLAN,
				visitId: VISIT_WITH_PLAN,
				invoiceNumber: "СЧ-СТОРОЖ-0002",
				totalAmountRub: PLAN_TOTAL_RUB,
				lines: planLines,
			}),
		);
		assert.equal(created.statusCode, 201, `счёт не создан: ${created.body}`);

		const issued = await call(
			"POST",
			`/api/documents/${created.json.id}/issue`,
			{
				signatureAttestation: {
					mode: "paper_signed",
					signedAt: TODAY_TEXT,
					recipientFullName: "Плательщик сторожа суммы счёта",
					recipientRole: "пациент",
					staffFullName: "Владелец сторожа суммы",
					staffRole: "владелец клиники",
					identityChecked: true,
					documentOpenedAndChecked: true,
					recipientSigned: true,
					clinicRepresentativeSigned: true,
				},
			},
		);
		assert.equal(issued.statusCode, 200, `счёт не выдан: ${issued.body}`);
		assert.equal(
			await storedTotalText(created.json.id as string),
			PLAN_TOTAL_TEXT,
			"выдача счёта потеряла его сумму: на руках у пациента документ, требования по которому в учёте нет",
		);
	});

	test("тело счёта, расходящееся с планом лечения, по-прежнему отбивается", async () => {
		/*
		 * ЭТО ЗАМОК НА ТО, ЧТО ПРАВКА НИЧЕГО НЕ ОСЛАБИЛА. Подстановка тела документа
		 * работает ТОЛЬКО там, где плана нет вовсе. Если план есть и расходится с
		 * телом, счёт обязан быть отклонён, а не тихо записан по телу — иначе клиника
		 * выставила бы требование на сумму, которой в плане лечения нет.
		 */
		const wrongLines = [
			{
				serviceName: "Лечение кариеса 36",
				toothOrArea: "36",
				unitPriceRub: WRONG_TOTAL_RUB,
			},
		];
		const rejected = await call(
			"POST",
			"/api/documents",
			invoicePayload({
				patientId: PATIENT_WITH_PLAN,
				visitId: VISIT_WITH_PLAN,
				invoiceNumber: "СЧ-СТОРОЖ-0004",
				totalAmountRub: WRONG_TOTAL_RUB,
				lines: wrongLines,
			}),
		);
		assert.equal(
			rejected.statusCode,
			409,
			`счёт на ${WRONG_TOTAL_RUB}.00 ₽ при плане на ${PLAN_TOTAL_TEXT} ₽ принят (HTTP ` +
				`${rejected.statusCode}). Проверка совпадения с планом лечения ослаблена: клиника выставит ` +
				`требование на сумму, которой в плане нет. ${rejected.body}`,
		);
		assert.match(
			String(rejected.json?.message ?? rejected.body),
			/не совпадает с актуальным планом лечения/,
			`отказ пришёл по другой причине, значит проверка плана не сработала: ${rejected.body}`,
		);
	});

	test("документ без денежного поля сохраняет пустую сумму: NULL — не подставленный ноль", async () => {
		/*
		 * У заказ-наряда в лабораторию нет денежного поля ни в теле, ни в плане. Его
		 * сумма ДЕЙСТВИТЕЛЬНО неизвестна, и пустая колонка правдива. Подставить сюда
		 * 0.00 было бы ложью, неотличимой от настоящей нулевой суммы, — этим правка
		 * заниматься не должна.
		 */
		const created = await call("POST", "/api/documents", {
			patientId: PATIENT_NO_PLAN,
			visitId: VISIT_NO_PLAN,
			kind: "lab_work_order",
			title: "Зуботехнический заказ-наряд (сторож суммы)",
			payload: {
				labWorkOrder: {
					clinicalToothRows: [
						{
							toothOrArea: "36",
							surfaces: ["occlusal"],
							status: "caries",
							diagnosisOrFinding:
								"Разрушение коронковой части более половины объёма",
							indication: "Показано восстановление коронкой",
							plannedAction: "Изготовление цельнокерамической коронки",
						},
					],
					workType: "Цельнокерамическая коронка",
					teethOrArea: "36",
					material: "Дисиликат лития",
					shade: "A2",
					source: `Внутриротовое сканирование от ${TODAY_TEXT}`,
					deadline: "5 рабочих дней",
				},
			},
		});
		assert.equal(
			created.statusCode,
			201,
			`заказ-наряд не создан: ${created.body}`,
		);
		assert.equal(
			await storedTotalText(created.json.id as string),
			null,
			"у заказ-наряда в лабораторию нет денежного поля ни в теле, ни в плане — его сумма неизвестна, " +
				"и колонка обязана остаться пустой. Подставленный ноль неотличим от настоящей нулевой суммы.",
		);
	});
});
