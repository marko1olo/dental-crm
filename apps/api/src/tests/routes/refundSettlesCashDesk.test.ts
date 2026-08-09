/**
 * СТОРОЖ ШВА «ВОЗВРАТ → КАССА»: ВЫДАННЫЙ ВОЗВРАТ ОБЯЗАН УЙТИ ИЗ ВЫРУЧКИ.
 *
 * ЧТО БЫЛО СЛОМАНО, И ЭТО ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. Возврат существовал
 * только как документ. Ни один файл в `apps/api/src` не переводил платёж в статус
 * `refunded`: было объявление перечисления в схеме, чтение статуса в
 * `documents/guards.ts` и признание проблемы в комментарии там же. Сквозной прогон
 * денежной цепточки 2026-07-29 замерил следствие: заявление на возврат 500 ₽
 * оформлено и ВЫДАНО (HTTP 200), а `payments.status` того платежа остался `paid`.
 *
 * ВРЕД КЛИНИКЕ. Выручка считается как `sum(amount_rub) where status = 'paid'`
 * (services/reports/managerReports.ts), поэтому отчёт руководителю показывал
 * возвращённые пациенту деньги как полученные: касса не сходилась с фактическим
 * остатком в ящике, а налоговая справка собрала бы возвращённую сумму в вычет
 * пациента как оплату — клиника выдала бы пациенту документ для ФНС на деньги,
 * которые ему же и вернула.
 *
 * ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ — СВЯЗЬ И ПОСЛЕДСТВИЕ В БАЗЕ, А НЕ КОД ОТВЕТА. HTTP 200 на
 * выдаче был и ДО правки; именно он и скрывал дефект. Поэтому каждое утверждение
 * ниже читает базу независимым SQL и сравнивает ТЕКСТ из numeric-колонки: выручка
 * до, выручка после и разница до копейки.
 *
 * ПОЧЕМУ ЧЕРЕЗ МАРШРУТ, А НЕ ВЫЗОВОМ ФУНКЦИИ. Прямой вызов сведения доказал бы
 * только то, что функция умеет писать статус, но не то, что до неё доходит клиент:
 * выдача документа стоит за гейтом клинических изменений, за подписанным токеном,
 * за проверкой реквизитов клиники и за проверкой личности плательщика в каждом
 * включённом платеже. Fastify поднимается в этом же процессе через `app.inject` —
 * сервер разработки на 4100 отдаёт СТАРУЮ сборку и доказательством служить не может.
 *
 * ЧЕТЫРЕ ЧАСТИЧНЫХ ВОЗВРАТА — НЕ УКРАШЕНИЕ СЦЕНАРИЯ, А ЗАМОК НА КОПЕЙКУ.
 * Чек на 400.00 ₽ возвращается частями 100.10 + 100.10 + 100.10 + 99.70. В
 * плавающей точке эта сумма равна 399.99999999999994 (замерено), то есть решение
 * «покрыт целиком» по рублёвой сумме было бы ЛОЖНЫМ и полностью возвращённый чек
 * остался бы в выручке навсегда. Заодно проверяется остаток по чеку: после трёх
 * частей доступно ровно 99.70 ₽, а `400 − 300.30` в double даёт 99.69999999999999,
 * откуда законному последнему возврату отказывают словами «превышает остаток».
 *
 * ЖИВАЯ БАЗА, СВОЯ КЛИНИКА. Идентификаторы выведены из имени этого файла
 * (`fixtureUuid`), уборка идёт и на входе, и на выходе: прогон, убитый снаружи, до
 * `after` не доходит и оставил бы строки в живой базе. Демонстрационные клиники не
 * читаются и не меняются — выручка считается только по своей организации.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { registerBillingRoutes } from "../../routes/billing.js";
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

const NAMESPACE = "refundSettlesCashDesk";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 11);
const OWNER_ID = fixtureUuid(NAMESPACE, 21);
/** Пациент полного возврата: один чек, один возврат на всю сумму. */
const PATIENT_FULL = fixtureUuid(NAMESPACE, 41);
/** Пациент частичных возвратов: один чек, четыре возврата частями. */
const PATIENT_PARTIAL = fixtureUuid(NAMESPACE, 42);
const VISIT_FULL = fixtureUuid(NAMESPACE, 51);
const VISIT_PARTIAL = fixtureUuid(NAMESPACE, 52);

const FULL_RECEIPT_RUB = 500;
const PARTIAL_RECEIPT_RUB = 400;
/**
 * Части возврата чека на 400.00 ₽. Сумма частей РАВНА чеку до копейки, но в
 * плавающей точке даёт 399.99999999999994 — на этом и стоит замок.
 */
const PARTIAL_REFUND_PARTS = [100.1, 100.1, 100.1, 99.7] as const;

const FULL_RECEIPT_NUMBER = "ФН 8888000000000101";
const PARTIAL_RECEIPT_NUMBER = "ФН 8888000000000102";
const RECEIPT_DATE = "2026-07-29";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type Injected = { statusCode: number; body: string; json: any };

/**
 * Выручка организации — независимым SQL, ТЕКСТОМ из numeric-колонки.
 *
 * Запрос написан здесь руками и повторяет формулу отчёта руководителю
 * (`sum(amount_rub) where status = 'paid'`), ни одного построителя проверяемого
 * кода не используя. Текст, а не число: `3491.4900000000002` и `3491.49` — разные
 * вещи, и в квитанции они напечатаются по-разному.
 */
async function revenueText(): Promise<string> {
	// Сверка идёт под тенант-контекстом клиники: под FORCE RLS запрос без
	// `app.current_tenant` не падает, а возвращает НОЛЬ строк, и выручка вышла бы
	// «0.00» независимо от того, что в кассе на самом деле.
	const result = await withFixtureTenant(ORGANIZATION_ID, async () =>
		db.execute<{ paid: string }>(sql`
			select coalesce(sum(amount_rub), 0)::numeric(12,2)::text as paid
			  from payments
			 where organization_id = ${ORGANIZATION_ID}::uuid and status = 'paid'
		`),
	);
	return (result.rows as { paid: string }[])[0]?.paid ?? "нет строки";
}

async function paymentStatus(paymentId: string): Promise<string> {
	const result = await withFixtureTenant(ORGANIZATION_ID, async () =>
		db.execute<{ status: string }>(sql`
			select status::text as status from payments
			 where id = ${paymentId}::uuid and organization_id = ${ORGANIZATION_ID}::uuid
		`),
	);
	const row = (result.rows as { status: string }[])[0];
	assert.ok(row, `платёж ${paymentId} не найден в базе — сверять нечего`);
	return row.status;
}

/** Разница двух денежных строк в копейках — без плавающей точки. */
function kopecksDelta(beforeText: string, afterText: string): number {
	const toKopecks = (text: string): number => {
		const match = /^(-)?(\d+)\.(\d{2})$/.exec(text);
		assert.ok(match, `«${text}» не денежная строка из numeric(12,2)`);
		const [, sign, whole, fraction] = match;
		const value = Number(whole) * 100 + Number(fraction);
		return sign ? -value : value;
	};
	return toKopecks(beforeText) - toKopecks(afterText);
}

describe("выданное заявление на возврат снимает деньги с кассы", () => {
	let app: FastifyInstance;
	let headers: Record<string, string> = {};
	let fullPaymentId = "";
	let partialPaymentId = "";
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

	/** Платёж заводится штатным маршрутом кассы, а не вставкой в таблицу. */
	async function acceptPayment(options: {
		patientId: string;
		visitId: string;
		amountRub: number;
		fiscalReceiptNumber: string;
		payerFullName: string;
	}): Promise<string> {
		const response = await call("POST", "/api/billing/payments", {
			patientId: options.patientId,
			visitId: options.visitId,
			amountRub: options.amountRub,
			method: "cash",
			clientMutationId: `${NAMESPACE}-${options.fiscalReceiptNumber}`,
			fiscalReceiptNumber: options.fiscalReceiptNumber,
			fiscalReceiptIssuedAt: RECEIPT_DATE,
			/*
			 * ПЛАТЕЛЬЩИК НАЗВАН ПОЛНОСТЬЮ, И ЭТО НЕ УКРАШЕНИЕ ФИКСТУРЫ. Выдача
			 * заявления на возврат требует у КАЖДОГО включённого платежа ФИО, дату
			 * рождения, ИНН, документ и родство (documents/renderDocument.ts,
			 * hasPaymentPayerIdentity). Неполная фикстура даёт 409 на выдаче, и такой
			 * отказ легко принять за дефект шва — он опаснее пропущенного.
			 */
			payerFullName: options.payerFullName,
			payerBirthDate: "1990-05-17",
			payerInn: "770000000199",
			payerIdentityDocument: "паспорт 12 34 567890",
			payerRelationship: "пациент",
		});
		assert.equal(
			response.statusCode,
			201,
			`касса не приняла оплату: ${response.body}`,
		);
		return response.json.id as string;
	}

	/** Черновик заявления на возврат штатным маршрутом документов. */
	async function createRefundDraft(options: {
		patientId: string;
		visitId: string;
		paymentId: string;
		amountRub: number;
		receiptNumber: string;
		title: string;
	}): Promise<Injected> {
		return await call("POST", "/api/documents", {
			patientId: options.patientId,
			visitId: options.visitId,
			kind: "payment_refund_correction_request",
			title: options.title,
			payload: {
				paymentRefundCorrection: {
					action: "full_refund",
					selectedPaymentIds: [options.paymentId],
					amountRub: options.amountRub,
					reason:
						"Сторож шва «возврат → касса»: возврат согласован бухгалтерией.",
					refundMethod: "cash",
					recipientFullName: "Плательщик сторожа возврата",
					recipientIdentityDocument: "паспорт 12 34 567890",
					originalFiscalReceiptNumber: options.receiptNumber,
					accountantDecision:
						"Возврат согласован: сверка кассы за день подтверждена.",
				},
			},
		});
	}

	async function issueDocument(documentId: string): Promise<Injected> {
		return await call("POST", `/api/documents/${documentId}/issue`, {
			signatureAttestation: {
				mode: "paper_signed",
				signedAt: RECEIPT_DATE,
				recipientFullName: "Плательщик сторожа возврата",
				recipientRole: "пациент",
				staffFullName: "Владелец сторожа возврата",
				staffRole: "владелец клиники",
				identityChecked: true,
				documentOpenedAndChecked: true,
				recipientSigned: true,
				clinicRepresentativeSigned: true,
			},
		});
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		/*
		 * Секрет периметра случайный на прогон и в вывод не попадает: гейт остаётся
		 * настоящим — заголовок проверяется, а не обходится послаблением
		 * DENTE_*_ALLOW_UNGUARDED_*.
		 */
		const adminSecret = randomBytes(32).toString("base64url");
		process.env.DENTE_CLINICAL_ADMIN_SECRET = adminSecret;
		process.env.DENTE_SETTINGS_ADMIN_SECRET = adminSecret;

		// Уборка следов прерванного прогона ДО посева: см. докстринг фикстуры.
		await purgeFixtureOrganizations([ORGANIZATION_ID]);

		// Весь сев — под контекстом своей клиники: в WITH CHECK тенант-таблиц стоит
		// только `organization_id = current_tenant`, без дизъюнкта обхода, поэтому
		// вставка без контекста (и вставка под обходом RLS) отвергается кодом 42501.
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.execute(sql`
				insert into organizations (id, name)
				values (${ORGANIZATION_ID}::uuid, ${"Сторож шва возврат → касса"})
				on conflict (id) do nothing`);
			await db.execute(sql`
				insert into clinics (id, organization_id, name, timezone)
				values (${CLINIC_ID}::uuid, ${ORGANIZATION_ID}::uuid, ${"Кабинет сторожа возврата"}, 'Europe/Moscow')`);
			await db.execute(sql`
				insert into users (id, organization_id, full_name, role, is_active)
				values (${OWNER_ID}::uuid, ${ORGANIZATION_ID}::uuid, ${"Владелец сторожа возврата"}, 'owner', true)`);
			/*
			 * ДАТА РОЖДЕНИЯ И ТЕЛЕФОН В КАРТЕ ОБЯЗАТЕЛЬНЫ. Шапка документа печатает их, а
			 * при пустом значении подставляет «не указана»/«не указан» — ровно те строки,
			 * по которым сторож выдачи считает документ незаполненным и отвечает 409, не
			 * называя поле.
			 */
			await db.execute(sql`
				insert into patients (id, organization_id, full_name, birth_date, phone, status)
				values (${PATIENT_FULL}::uuid, ${ORGANIZATION_ID}::uuid, ${"Пациент полного возврата"}, '1990-05-17', '+79000000021', 'active'),
				       (${PATIENT_PARTIAL}::uuid, ${ORGANIZATION_ID}::uuid, ${"Пациент частичного возврата"}, '1988-02-03', '+79000000022', 'active')`);
			await db.execute(sql`
				insert into visits (id, organization_id, patient_id, status)
				values (${VISIT_FULL}::uuid, ${ORGANIZATION_ID}::uuid, ${PATIENT_FULL}::uuid, 'draft'),
				       (${VISIT_PARTIAL}::uuid, ${ORGANIZATION_ID}::uuid, ${PATIENT_PARTIAL}::uuid, 'draft')`);
		});

		const staffToken = signToken(
			{ organizationId: ORGANIZATION_ID, userId: OWNER_ID, role: "owner" },
			authTokenSecret(),
		);
		headers = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORGANIZATION_ID },
				authTokenSecret(),
			),
			"x-dente-staff-token": staffToken,
			"x-dente-admin-secret": adminSecret,
			"content-type": "application/json",
		};

		app = createTenantTestApp();
		await registerSettingsRoutes(app);
		await registerBillingRoutes(app);
		await registerDocumentRoutes(app);
		await app.ready();

		/*
		 * РЕКВИЗИТЫ КЛИНИКИ — ЧАСТЬ ДЕНЕЖНОГО ШВА. Без ИНН, адреса, телефона и
		 * лицензии выдача любого платёжного документа отклоняется
		 * (routes/documents.ts: documentIssueBlockReason). Ставятся штатным маршрутом
		 * настроек — тем же, которым пользуется экран.
		 */
		const profile = await call("PUT", "/api/settings/clinic/profile", {
			clinicName: "Кабинет сторожа возврата",
			legalName: "Сторож шва возврат → касса",
			inn: "7700000021",
			kpp: "770001001",
			ogrn: "1027700000021",
			address: "г. Москва, ул. Проверочная, 21",
			phone: "+79000000020",
			email: "refund-settles@example.test",
			medicalLicenseNumber: "ЛО-77-01-000021",
			medicalLicenseIssuedAt: "2025-01-15",
			medicalLicenseIssuer: "Департамент здравоохранения города Москвы",
			bankDetails: "р/с 40702810000000000021, БИК 049999999",
			signatoryName: "Владелец сторожа возврата",
			signatoryTitle: "главный врач",
			timezone: "Europe/Moscow",
		});
		assert.equal(
			profile.statusCode,
			200,
			`реквизиты клиники не записаны: ${profile.body}`,
		);

		fullPaymentId = await acceptPayment({
			patientId: PATIENT_FULL,
			visitId: VISIT_FULL,
			amountRub: FULL_RECEIPT_RUB,
			fiscalReceiptNumber: FULL_RECEIPT_NUMBER,
			payerFullName: "Пациент полного возврата",
		});
		partialPaymentId = await acceptPayment({
			patientId: PATIENT_PARTIAL,
			visitId: VISIT_PARTIAL,
			amountRub: PARTIAL_RECEIPT_RUB,
			fiscalReceiptNumber: PARTIAL_RECEIPT_NUMBER,
			payerFullName: "Пациент частичного возврата",
		});
	});

	after(async () => {
		await app?.close();
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
		// Счёт остатка — под тенант-контекстом: политика оставляет видимыми ровно
		// строки этой клиники, поэтому уцелевший платёж был бы виден. Без контекста
		// запрос вернул бы ноль в любом случае и подтвердил бы уборку, ничего не измерив.
		const leftovers = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ n: number }>(sql`
				select count(*)::int as n from payments where organization_id = ${ORGANIZATION_ID}::uuid
			`),
		);
		assert.equal(
			(leftovers.rows as { n: number }[])[0]?.n,
			0,
			"сторож не убрал свои платежи из живой базы",
		);
		process.env = originalEnv;
		await pool.end();
	});

	test("черновик заявления кассы не касается: деньги ещё не выходили", async () => {
		const revenueBefore = await revenueText();
		assert.equal(
			revenueBefore,
			"900.00",
			`в кассе не два посеянных чека: ${revenueBefore}`,
		);

		const draft = await createRefundDraft({
			patientId: PATIENT_FULL,
			visitId: VISIT_FULL,
			paymentId: fullPaymentId,
			amountRub: FULL_RECEIPT_RUB,
			receiptNumber: FULL_RECEIPT_NUMBER,
			title: "Заявление на возврат (сторож, полная сумма)",
		});
		assert.equal(
			draft.statusCode,
			201,
			`черновик возврата не создан: ${draft.body}`,
		);

		assert.equal(
			await paymentStatus(fullPaymentId),
			"paid",
			"ЧЕРНОВИК заявления снял деньги с кассы. Черновик можно изменить или удалить, " +
				"деньги ещё не покидали ящик — снимать их с выручки без юридического основания нельзя.",
		);
		assert.equal(
			await revenueText(),
			revenueBefore,
			"выручка изменилась от одного черновика",
		);
	});

	test("ВЫДАЧА заявления на полный возврат уменьшает выручку РОВНО на сумму чека", async () => {
		const revenueBefore = await revenueText();
		const draft = await createRefundDraft({
			patientId: PATIENT_FULL,
			visitId: VISIT_FULL,
			paymentId: fullPaymentId,
			amountRub: FULL_RECEIPT_RUB,
			receiptNumber: FULL_RECEIPT_NUMBER,
			title: "Заявление на возврат (сторож, выдаётся)",
		});
		assert.equal(
			draft.statusCode,
			201,
			`черновик возврата не создан: ${draft.body}`,
		);
		assert.equal(
			await paymentStatus(fullPaymentId),
			"paid",
			"до выдачи платёж обязан быть «paid»",
		);

		const issued = await issueDocument(draft.json.id as string);
		assert.equal(
			issued.statusCode,
			200,
			`заявление на возврат не выдано: ${issued.body}`,
		);

		assert.equal(
			await paymentStatus(fullPaymentId),
			"refunded",
			"заявление на возврат ВЫДАНО (HTTP 200), а payments.status остался «paid». Именно это и было " +
				"сломано: возврат существовал как документ и не существовал как движение денег. Выручка " +
				"`sum(amount_rub) where status = 'paid'` продолжает считать возвращённые пациенту деньги " +
				"полученными — касса не сходится с ящиком, а налоговая справка соберёт возвращённую сумму " +
				"как оплату пациента.",
		);

		const revenueAfter = await revenueText();
		const delta = kopecksDelta(revenueBefore, revenueAfter);
		assert.equal(
			delta,
			FULL_RECEIPT_RUB * 100,
			`выручка уменьшилась не на ${FULL_RECEIPT_RUB}.00 ₽: было ${revenueBefore}, стало ${revenueAfter} ` +
				`(разница ${delta} коп.). Касса обязана сойтись до копейки.`,
		);
		assert.equal(
			revenueAfter,
			"400.00",
			`в кассе должен остаться только чек частичного пациента: ${revenueAfter}`,
		);
		console.log(
			`  выручка: было ${revenueBefore} ₽ → стало ${revenueAfter} ₽ (−${delta / 100} ₽)`,
		);
	});

	test("повторный возврат по тому же чеку по-прежнему отклоняется", async () => {
		const revenueBefore = await revenueText();
		const repeat = await createRefundDraft({
			patientId: PATIENT_FULL,
			visitId: VISIT_FULL,
			paymentId: fullPaymentId,
			amountRub: FULL_RECEIPT_RUB,
			receiptNumber: FULL_RECEIPT_NUMBER,
			title: "Второе заявление на возврат того же чека",
		});
		assert.equal(
			repeat.statusCode,
			409,
			`второй возврат по чеку на ${FULL_RECEIPT_RUB}.00 ₽ принят (HTTP ${repeat.statusCode}). ` +
				`Клиника выплатила бы ${FULL_RECEIPT_RUB * 2} ₽ по одному чеку — прямая утрата денег. ${repeat.body}`,
		);
		assert.equal(
			await revenueText(),
			revenueBefore,
			"отклонённый возврат всё равно сдвинул выручку",
		);
	});

	test("аннулирование выданного заявления возвращает деньги в выручку", async () => {
		/*
		 * ОБРАТНЫЙ ХОД ОБЯЗАТЕЛЕН, А НЕ ЖЕЛАТЕЛЕН. Учёт возвратов идёт только по
		 * ВЫДАННЫМ заявлениям, поэтому аннулирование обнуляет учтённый возврат по
		 * чеку. Без обратного хода платёж навсегда остался бы «refunded» при нулевом
		 * учтённом возврате: деньги пропали бы из выручки без действующего основания,
		 * а новый возврат по тому же чеку упирался бы в отказ «уже выполнен полный
		 * возврат средств» — то есть чек стал бы невозвратным навсегда.
		 */
		// Поиск выданного заявления — тоже под контекстом клиники: без него список
		// документов пуст, и «аннулировать нечего» стало бы ложным выводом.
		const issuedRefund = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ id: string }>(sql`
				select id::text as id from generated_documents
				 where organization_id = ${ORGANIZATION_ID}::uuid
				   and patient_id = ${PATIENT_FULL}::uuid
				   and kind = 'payment_refund_correction_request'
				   and status = 'issued'
				 order by issued_at desc limit 1
			`),
		);
		const refundDocumentId = (issuedRefund.rows as { id: string }[])[0]?.id;
		assert.ok(
			refundDocumentId,
			"выданного заявления на возврат нет — аннулировать нечего",
		);

		assert.equal(
			await paymentStatus(fullPaymentId),
			"refunded",
			"предпосылка теста не выполнена",
		);
		const revenueBefore = await revenueText();

		const voided = await call(
			"POST",
			`/api/documents/${refundDocumentId}/void`,
			{
				voidAttestation: {
					reasonCode: "payment_correction",
					reasonText:
						"Возврат отменён: деньги пациенту не выдавались, чек остаётся действующим.",
					voidedAt: RECEIPT_DATE,
					staffFullName: "Владелец сторожа возврата",
					staffRole: "владелец клиники",
					correctionDocumentId: null,
					replacementRequired: false,
					patientOrPayerNotified: true,
					archivePreserved: true,
					statusReviewed: true,
				},
			},
		);
		assert.equal(
			voided.statusCode,
			200,
			`заявление на возврат не аннулировано: ${voided.body}`,
		);

		assert.equal(
			await paymentStatus(fullPaymentId),
			"paid",
			"заявление на возврат аннулировано, а платёж остался «refunded». Учтённый возврат по чеку " +
				"обнулился вместе с документом, значит деньги пропали из выручки без основания, а новый " +
				"возврат по этому чеку заблокирован отказом «уже выполнен полный возврат средств».",
		);
		const revenueAfter = await revenueText();
		assert.equal(
			kopecksDelta(revenueAfter, revenueBefore),
			FULL_RECEIPT_RUB * 100,
			`выручка вернулась не на ${FULL_RECEIPT_RUB}.00 ₽: было ${revenueBefore}, стало ${revenueAfter}`,
		);
		console.log(
			`  после аннулирования: выручка ${revenueBefore} ₽ → ${revenueAfter} ₽`,
		);
	});

	test("частичный возврат оставляет чек в выручке, а последняя часть закрывает его до копейки", async () => {
		let issuedSoFarKopecks = 0;
		for (const [index, part] of PARTIAL_REFUND_PARTS.entries()) {
			const isLastPart = index === PARTIAL_REFUND_PARTS.length - 1;
			const revenueBefore = await revenueText();

			const draft = await createRefundDraft({
				patientId: PATIENT_PARTIAL,
				visitId: VISIT_PARTIAL,
				paymentId: partialPaymentId,
				amountRub: part,
				receiptNumber: PARTIAL_RECEIPT_NUMBER,
				title: `Заявление на частичный возврат ${index + 1} из ${PARTIAL_REFUND_PARTS.length}`,
			});
			assert.equal(
				draft.statusCode,
				201,
				`частичный возврат ${part} ₽ (часть ${index + 1}) отклонён при создании. Остаток по чеку обязан ` +
					`считаться в целых копейках: из ${PARTIAL_RECEIPT_RUB}.00 ₽ уже возвращено ` +
					`${issuedSoFarKopecks / 100} ₽, доступно ${(PARTIAL_RECEIPT_RUB * 100 - issuedSoFarKopecks) / 100} ₽. ` +
					`Ответ: ${draft.body}`,
			);

			const issued = await issueDocument(draft.json.id as string);
			assert.equal(
				issued.statusCode,
				200,
				`частичный возврат ${part} ₽ не выдан: ${issued.body}`,
			);
			issuedSoFarKopecks += Math.round(part * 100);

			const status = await paymentStatus(partialPaymentId);
			const revenueAfter = await revenueText();
			console.log(
				`  часть ${index + 1}: возвращено ${issuedSoFarKopecks / 100} из ${PARTIAL_RECEIPT_RUB} ₽ → ` +
					`статус ${status}, выручка ${revenueAfter} ₽`,
			);

			if (!isLastPart) {
				assert.equal(
					status,
					"paid",
					`ЧАСТИЧНЫЙ возврат (${issuedSoFarKopecks / 100} из ${PARTIAL_RECEIPT_RUB} ₽) пометил чек как ` +
						"полностью возвращённый. В `payments` нет столбца, которым частичный возврат выражается: " +
						"`status` — один флаг на всю строку, `amount_rub` — сумма исходного фискального чека. " +
						"Пометить такой чек «refunded» значит убрать из выручки ВЕСЬ чек вместо возвращённой части " +
						"и соврать налоговой справке о полном возврате.",
				);
				assert.equal(
					revenueAfter,
					revenueBefore,
					`частичный возврат сдвинул выручку с ${revenueBefore} на ${revenueAfter}. Выразить частичный ` +
						"возврат существующими столбцами нечем — он объявлен долгом и кассу не двигает.",
				);
			} else {
				assert.equal(
					status,
					"refunded",
					`последняя часть довела возврат до ${issuedSoFarKopecks / 100} ₽ = полной суммы чека ` +
						`${PARTIAL_RECEIPT_RUB}.00 ₽, а чек остался в выручке. Причина этого класса отказа — сложение ` +
						"рублей в плавающей точке: 100.10 + 100.10 + 100.10 + 99.70 даёт 399.99999999999994, то есть " +
						"«почти покрыт», и полностью возвращённый чек остаётся в выручке НАВСЕГДА. Складывать " +
						"обязано целые копейки.",
				);
				assert.equal(
					kopecksDelta(revenueBefore, revenueAfter),
					PARTIAL_RECEIPT_RUB * 100,
					`закрытие чека убрало из выручки не ${PARTIAL_RECEIPT_RUB}.00 ₽: было ${revenueBefore}, ` +
						`стало ${revenueAfter}`,
				);
			}
		}

		assert.equal(
			issuedSoFarKopecks,
			PARTIAL_RECEIPT_RUB * 100,
			"сумма частей возврата не равна чеку — сценарий проверял не то, что заявлено",
		);
	});
});
