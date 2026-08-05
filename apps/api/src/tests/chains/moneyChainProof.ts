/**
 * СКВОЗНОЙ ПРОГОН ДЕНЕЖНОЙ ЦЕПОЧКИ КЛИНИКИ.
 *
 * План лечения -> счёт -> частичная оплата -> доплата -> переплата -> возврат ->
 * отчёт руководителю, и на каждом шве проверка, что деньги ДОШЛИ и сошлись до
 * копейки.
 *
 * ЧЕМ ЭТО НЕ ЯВЛЯЕТСЯ. Это не юнит-тест (имя без `.test.ts`, `npm test` его не
 * подхватывает) и не проверка существования маршрутов. Здесь проходит один
 * сценарий работы клиники: администратор заводит прайс, врач собирает план,
 * касса выставляет счёт и принимает деньги, бухгалтер оформляет возврат,
 * владелец смотрит отчёт. Ценность — полная карта разрывов, а не первый из них:
 * шов, который не работает, фиксируется фактом и обходится ровно настолько,
 * чтобы идти дальше.
 *
 * ПОЧЕМУ СВОЙ ЭКЗЕМПЛЯР ПРИЛОЖЕНИЯ, А НЕ СЕРВЕР РАЗРАБОТКИ НА 4100. Тот отдаёт
 * код, собранный когда-то раньше: маршрут, добавленный в файл минуту назад,
 * отвечает там 404, и такой 404 не доказывает ничего. Здесь Fastify поднимается
 * в этом же процессе (`app.inject`) из тех же файлов маршрутов, что и боевой
 * сервер.
 *
 * ПОЧЕМУ ЗАГОЛОВКИ ТАКИЕ ЖЕ, КАК У ЭКРАНА. Клиент шлёт `x-dente-clinic-token`,
 * `x-dente-staff-token` и `x-dente-admin-secret` вместе
 * (`apps/web/src/lib/denteRequestHeaders.ts`). Запрос без них молча получает 401,
 * экран выглядит пустым, а не сломанным, — этот класс дефекта в проекте ловили
 * многократно. Поэтому здесь шлётся ровно тот же набор, а секреты периметра
 * задаются случайными на прогон: гейт остаётся включённым, а не обойдённым
 * послаблением `DENTE_*_ALLOW_UNGUARDED_*`.
 *
 * ПОЧЕМУ КАЖДАЯ СУММА ПРОВЕРЯЕТСЯ НЕЗАВИСИМЫМ SQL. Ответ 200 не значит, что
 * строка легла: писателя может не быть вовсе. Деньги сверяются запросом,
 * написанным здесь руками, и сравниваются ТЕКСТОМ из numeric-колонки, а не
 * числом с плавающей точкой. Допуска нет ни на одной сумме: копейка — это
 * копейка. Числа из JSON дополнительно проверяются на грязь ниже копейки
 * (`3491.4900000000002` — это провал, а не «то же самое»).
 *
 * СВОЯ КЛИНИКА, НЕ ОБЩАЯ. Идентификаторы берутся через `fixtureUuid` из имени
 * этого файла, уборка `purgeFixtureOrganizations` идёт НА ВХОДЕ и НА ВЫХОДЕ:
 * прогон, убитый снаружи, до `finally` не доходит, и следующий обязан начинать с
 * чистого места. Разбор того, как три файла делили один блок UUID и удаляли
 * строки друг друга, лежит в `tests/support/fixtureOrganizations.ts`.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/chains/moneyChainProof.ts
 */

import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerReportRoutes } from "../../routes/reports.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";

/** Пространство фикстур выводится из имени файла, а не назначается вручную. */
const FIXTURE_NAMESPACE = "moneyChainProof";

const ORG_A = fixtureUuid(FIXTURE_NAMESPACE, 1);
const ORG_B = fixtureUuid(FIXTURE_NAMESPACE, 2);
const CLINIC_A = fixtureUuid(FIXTURE_NAMESPACE, 11);
const CLINIC_B = fixtureUuid(FIXTURE_NAMESPACE, 12);
const OWNER_A = fixtureUuid(FIXTURE_NAMESPACE, 21);
const DOCTOR_A = fixtureUuid(FIXTURE_NAMESPACE, 22);
const OWNER_B = fixtureUuid(FIXTURE_NAMESPACE, 23);
const DOCTOR_B = fixtureUuid(FIXTURE_NAMESPACE, 24);
const CHAIR_A = fixtureUuid(FIXTURE_NAMESPACE, 31);
const CHAIR_B = fixtureUuid(FIXTURE_NAMESPACE, 32);
const PATIENT_A = fixtureUuid(FIXTURE_NAMESPACE, 41);
const PATIENT_B = fixtureUuid(FIXTURE_NAMESPACE, 42);

/**
 * Пояс клиники А намеренно НЕ совпадает ни с поясом сервера, ни с поясом сессии
 * PostgreSQL (на машине разработки оба — `Europe/Samara`, +4). Камчатка (+12)
 * даёт максимальный разрыв среди российских поясов: половина суток. Без этого
 * различия ошибка «день считается в поясе сессии» не проявляется вовсе, и прогон
 * зелёный по совпадению настроек, а не потому, что код прав.
 */
const CLINIC_A_TIMEZONE = "Asia/Kamchatka";
const CLINIC_B_TIMEZONE = "Europe/Moscow";

/** Цены с копейками: ровно те, на которых проект уже ловил потерю копеек. */
const PRICE_ONE = 1500.5;
const PRICE_TWO = 1990.99;
const PLAN_TOTAL_TEXT = "3491.49";
const FIRST_PAYMENT = 1000;
const SECOND_PAYMENT = 2491.49;
const OVERPAYMENT = 500;
const PAID_AFTER_TWO_TEXT = "3491.49";
const PAID_AFTER_OVERPAY_TEXT = "3991.49";
const FOREIGN_PAYMENT = 7777.77;

/** Чек переплаты: возврат без номера и даты исходного чека сервер не примет. */
const OVERPAY_RECEIPT_NUMBER = "ФН 9999000000000042";
const OVERPAY_RECEIPT_DATE = "2026-07-29";

let failures = 0;
/** Разрывы швов: то, что уйдёт в итоговую строку прогона. */
const breaks: string[] = [];

function step(title: string): void {
	console.log(`\n=== ${title} ===`);
}

function check(label: string, actual: unknown, expected: unknown): boolean {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures += 1;
	console.log(
		`${ok ? "СОШЛОСЬ" : "РАСХОЖДЕНИЕ"} ${label}: получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`,
	);
	return ok;
}

/**
 * Сумма из JSON проверяется БЕЗ ДОПУСКА и заодно на грязь ниже копейки.
 *
 * `Math.round(value * 100)` сравнивал бы с точностью до полукопейки и молча
 * принимал `3491.4900000000002` за `3491.49`. Такое число уже прошло сложение в
 * плавающей точке и в квитанции напечатается иначе, чем в базе, поэтому оно
 * считается расхождением, а не совпадением.
 */
function checkRub(label: string, actual: unknown, expectedText: string): boolean {
	const value = typeof actual === "number" ? actual : Number(actual);
	if (!Number.isFinite(value)) {
		failures += 1;
		console.log(`РАСХОЖДЕНИЕ ${label}: не число (${JSON.stringify(actual)}), ожидалось ${expectedText} ₽`);
		return false;
	}
	const text = value.toFixed(2);
	const cleanKopecks = Number(text) === value;
	const ok = text === expectedText && cleanKopecks;
	if (!ok) failures += 1;
	console.log(
		`${ok ? "СОШЛОСЬ" : "РАСХОЖДЕНИЕ"} ${label}: получено ${text} ₽` +
			`${cleanKopecks ? "" : ` (грязь ниже копейки: ${value})`}, ожидалось ${expectedText} ₽`,
	);
	return ok;
}

/**
 * Разрыв шва. Не останавливает прогон: цепочка обязана дойти до конца, иначе
 * карта разрывов оборвётся на первом же и остальные останутся неизвестными.
 */
function weldBroken(seam: string, fact: string, harm: string): void {
	breaks.push(`${seam} — ФАКТ: ${fact} — ВРЕД: ${harm}`);
	console.log(`РАЗРЫВ ШВА «${seam}»\n  ФАКТ: ${fact}\n  ВРЕД КЛИНИКЕ: ${harm}`);
}

async function firstRow<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<T | null> {
	const result = await db.execute(query);
	return ((result.rows as T[])[0] ?? null) as T | null;
}

async function allRows<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<T[]> {
	const result = await db.execute(query);
	return result.rows as T[];
}

type Injected = { statusCode: number; body: string; json: any };

function parsed(response: { statusCode: number; body: string }): Injected {
	let json: any = null;
	try {
		json = JSON.parse(response.body);
	} catch {
		json = null;
	}
	return { statusCode: response.statusCode, body: response.body, json };
}

async function main(): Promise<void> {
	/*
	 * Секреты периметра — случайные на прогон и в вывод не попадают. Так гейт
	 * остаётся настоящим: заголовок проверяется, а не игнорируется послаблением.
	 * Один и тот же секрет закрывает клинические данные, настройки и расписание —
	 * ровно как в интерфейсе, где `x-dente-admin-secret` один.
	 */
	const adminSecret = randomBytes(32).toString("base64url");
	process.env.DENTE_CLINICAL_ADMIN_SECRET = adminSecret;
	process.env.DENTE_SETTINGS_ADMIN_SECRET = adminSecret;
	process.env.DENTE_SCHEDULE_ADMIN_SECRET = adminSecret;

	const secret = authTokenSecret();
	const clinicTokenA = signToken({ organizationId: ORG_A }, secret);
	const staffTokenA = signToken({ organizationId: ORG_A, userId: OWNER_A, role: "owner" }, secret);
	const clinicTokenB = signToken({ organizationId: ORG_B }, secret);
	const staffTokenB = signToken({ organizationId: ORG_B, userId: OWNER_B, role: "owner" }, secret);

	/** Полный набор заголовков клиники А — тот же, что собирает экран. */
	const headersA = {
		"x-dente-clinic-token": clinicTokenA,
		"x-dente-staff-token": staffTokenA,
		"x-dente-admin-secret": adminSecret,
		"content-type": "application/json",
	};
	const headersB = {
		"x-dente-clinic-token": clinicTokenB,
		"x-dente-staff-token": staffTokenB,
		"x-dente-admin-secret": adminSecret,
		"content-type": "application/json",
	};

	const app: FastifyInstance = Fastify();
	// Тот же хук, что в apps/api/src/server.ts: он наполняет request.user.
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	/*
	 * Маршруты те же и из тех же файлов, что поднимает боевой сервер: прайс и
	 * настройки, расписание, приёмы, план лечения, касса, документы, отчёты и
	 * главный экран. Подмен нет ни одной — сломанное звено сломается здесь ровно
	 * так же, как у клиники.
	 */
	await registerSettingsRoutes(app);
	await registerScheduleRoutes(app);
	await registerVisitRoutes(app);
	await registerOdontogramRoutes(app);
	await registerBillingRoutes(app);
	await registerDocumentRoutes(app);
	await registerReportRoutes(app);
	await registerDashboardRoutes(app);
	await app.ready();

	/**
	 * Одно обращение к приложению в этом же процессе.
	 *
	 * У запроса БЕЗ ТЕЛА заголовок `content-type` снимается, и это не мелочь.
	 * Fastify отвечает 400 `FST_ERR_CTP_EMPTY_JSON_BODY` на POST с
	 * `content-type: application/json` и пустым телом — измерено этим же
	 * сценарием на `POST /api/appointments/:id/visit`, и первый прогон записал
	 * такой отказ в карту как «приём не открывается». Виноват был запрос, а не
	 * звено: ложный разрыв в карте хуже пропущенного, потому что по нему пойдут
	 * чинить работающее.
	 */
	async function call(
		method: "GET" | "POST" | "PUT",
		url: string,
		headers: Record<string, string>,
		payload?: unknown,
	): Promise<Injected> {
		const requestHeaders =
			payload === undefined
				? Object.fromEntries(Object.entries(headers).filter(([name]) => name.toLowerCase() !== "content-type"))
				: headers;
		const response = await app.inject({
			method,
			url,
			headers: requestHeaders,
			...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
		});
		return parsed(response);
	}

	/**
	 * Окно отчётов — вокруг сегодняшнего дня, а не «за всё время».
	 *
	 * `routes/reports.ts` (MAX_PERIOD_DAYS = 400) и `resolvePayoutPeriod`
	 * (зарплатный период) отвечают 400 на слишком широкий диапазон, и такой отказ
	 * читается в протоколе как «выручка ноль». Ноль по ошибке запроса — не замер.
	 */
	const nowMs = Date.now();
	const periodFrom = new Date(nowMs - 86_400_000).toISOString();
	const periodTo = new Date(nowMs + 86_400_000).toISOString();
	const reportQuery = `?from=${periodFrom}&to=${periodTo}`;
	const TODAY_TEXT = new Date(nowMs).toISOString().slice(0, 10);

	/** Сумма оплаченного по клинике — независимым SQL, текстом из numeric. */
	async function paidTotalText(organizationId: string): Promise<string> {
		const row = await firstRow<{ paid: string }>(
			sql`select coalesce(sum(amount_rub), 0)::numeric(12,2)::text as paid
			      from payments
			     where organization_id = ${organizationId}::uuid and status = 'paid'`,
		);
		return row?.paid ?? "нет строки";
	}

	/**
	 * Долг клиники — той же формулой, что у отчёта дебиторки, но написанной здесь.
	 *
	 * ЗЕРКАЛО ПРИВЕДЕНО К ДЕЙСТВУЮЩЕЙ ФОРМУЛЕ 2026-08-06: стояло
	 * `greatest(quantity, 1)`, убранное в тот же день из самого отчёта
	 * (`services/reports/managerReports.ts`, разбор стоит там). Обещание в первой
	 * строке — «той же формулой, что у отчёта» — иначе перестало бы быть правдой,
	 * а зеркало превратилось бы во вторую спецификацию. Числа прогона не
	 * изменились: на контрактном количестве (целое >= 1, и с миграции 0162 колонка
	 * иного не принимает) обе записи побитово равны. Ручной SQL сохранён
	 * намеренно — вызов канона `chargeLineKopecks` сверял бы код с самим собой.
	 */
	async function debtText(organizationId: string): Promise<{ planned: string; paid: string; due: string }> {
		const row = await firstRow<{ planned: string; paid: string; due: string }>(
			sql`with planned as (
			      select coalesce(sum(greatest(unit_price_rub * quantity - discount_rub, 0)), 0)::numeric(12,2) as total
			        from treatment_items
			       where organization_id = ${organizationId}::uuid and status <> 'cancelled'
			    ), paid as (
			      select coalesce(sum(amount_rub), 0)::numeric(12,2) as total
			        from payments
			       where organization_id = ${organizationId}::uuid and status = 'paid'
			    )
			    select planned.total::text as planned, paid.total::text as paid,
			           (planned.total - paid.total)::text as due
			      from planned, paid`,
		);
		return row ?? { planned: "нет", paid: "нет", due: "нет" };
	}

	let planId: string | null = null;
	let appointmentId: string | null = null;
	let visitId: string | null = null;
	let firstPaymentId: string | null = null;
	let secondPaymentId: string | null = null;
	let overpaymentId: string | null = null;
	let serviceOneId: string | null = null;
	let serviceTwoId: string | null = null;
	let invoiceDocumentId: string | null = null;
	let refundDocumentId: string | null = null;

	try {
		step("ШАГ 0. ЧИСТОЕ МЕСТО: уборка следов прерванного прогона ДО начала");
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
		const strayBefore = await firstRow<{ organizations: number }>(
			sql`select count(*)::int as organizations from organizations
			     where id in (${ORG_A}::uuid, ${ORG_B}::uuid)`,
		);
		check("организаций фикстуры до посева", strayBefore?.organizations, 0);

		/*
		 * ПОСЕВ КЛИНИК — ПРЕДПОСЫЛКА, А НЕ ЗВЕНО ЦЕПОЧКИ. Регистрация клиники,
		 * приём сотрудника и завод кресла проверяются другими сценариями; здесь
		 * они пишутся прямым SQL, чтобы разрыв в них не выдавался за разрыв
		 * денежного шва. Кресло требует clinic_id (schema.ts: chairs.clinicId
		 * notNull), поэтому строка в `clinics` обязательна — она же несёт пояс.
		 */
		step("ШАГ 1. ДВЕ КЛИНИКИ: своя (А) и соседняя (Б), у каждой врач, кресло, пациент");
		await db.execute(sql`
			insert into organizations (id, name)
			values (${ORG_A}::uuid, ${"Денежная цепочка — клиника А"}),
			       (${ORG_B}::uuid, ${"Денежная цепочка — клиника Б"})`);
		await db.execute(sql`
			insert into clinics (id, organization_id, name, timezone)
			values (${CLINIC_A}::uuid, ${ORG_A}::uuid, ${"Кабинет клиники А"}, ${CLINIC_A_TIMEZONE}),
			       (${CLINIC_B}::uuid, ${ORG_B}::uuid, ${"Кабинет клиники Б"}, ${CLINIC_B_TIMEZONE})`);
		await db.execute(sql`
			insert into users (id, organization_id, full_name, role, is_active)
			values (${OWNER_A}::uuid, ${ORG_A}::uuid, ${"Владелец клиники А"}, 'owner', true),
			       (${DOCTOR_A}::uuid, ${ORG_A}::uuid, ${"Врач клиники А"}, 'doctor', true),
			       (${OWNER_B}::uuid, ${ORG_B}::uuid, ${"Владелец клиники Б"}, 'owner', true),
			       (${DOCTOR_B}::uuid, ${ORG_B}::uuid, ${"Врач клиники Б"}, 'doctor', true)`);
		await db.execute(sql`
			insert into chairs (id, organization_id, clinic_id, name, is_active)
			values (${CHAIR_A}::uuid, ${ORG_A}::uuid, ${CLINIC_A}::uuid, ${"Кресло 1 клиники А"}, true),
			       (${CHAIR_B}::uuid, ${ORG_B}::uuid, ${CLINIC_B}::uuid, ${"Кресло 1 клиники Б"}, true)`);
		/*
		 * ДАТА РОЖДЕНИЯ И ТЕЛЕФОН В КАРТЕ — НЕ УКРАШЕНИЕ ФИКСТУРЫ. Шапка любого
		 * документа печатает их, а при пустом значении подставляет «не указана» /
		 * «не указан» — ровно те строки, по которым сторож выдачи считает документ
		 * незаполненным (documents/renderDocument.ts:122 unresolvedPlaceholderPatterns,
		 * :661). Измерено этим сценарием: карта без даты рождения давала на выдаче
		 * заявления на возврат 409 «В документе остались незаполненные поля», не
		 * называя поле. Не убирайте эти два значения — вернётся тот же ложный разрыв.
		 */
		await db.execute(sql`
			insert into patients (id, organization_id, full_name, birth_date, phone, status)
			values (${PATIENT_A}::uuid, ${ORG_A}::uuid, ${"Пациент денежной цепочки А"}, '1990-05-17', '+79000000011', 'active'),
			       (${PATIENT_B}::uuid, ${ORG_B}::uuid, ${"Пациент денежной цепочки Б"}, '1985-03-02', '+79000000012', 'active')`);
		const seeded = await firstRow<Record<string, number>>(
			sql`select
			      (select count(*)::int from organizations where id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as organizations,
			      (select count(*)::int from clinics where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as clinics,
			      (select count(*)::int from users where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as users,
			      (select count(*)::int from chairs where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as chairs,
			      (select count(*)::int from patients where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as patients`,
		);
		console.log(`посеяно: ${JSON.stringify(seeded)}`);
		check("клиник посеяно", seeded?.organizations, 2);
		check("пояс клиники А отличается от пояса сессии", (CLINIC_A_TIMEZONE as string) === (CLINIC_B_TIMEZONE as string), false);

		/*
		 * РЕКВИЗИТЫ КЛИНИКИ — ЧАСТЬ ДЕНЕЖНОГО ШВА, А НЕ КОСМЕТИКА. Без ИНН, адреса,
		 * телефона и лицензии выдача любого платёжного документа отклоняется
		 * (routes/documents.ts: documentIssueBlockReason), и первый прогон этого
		 * сценария получил на возврате именно такой 409. Клиника, у которой
		 * реквизиты не заполнены, — не дефект программы, поэтому они ставятся
		 * штатным маршрутом настроек, тем же, которым пользуется экран.
		 */
		const profileResponse = await call("PUT", "/api/settings/clinic/profile", headersA, {
			clinicName: "Кабинет клиники А",
			legalName: "Денежная цепочка — клиника А",
			inn: "7700000001",
			kpp: "770001001",
			ogrn: "1027700000001",
			address: "г. Петропавловск-Камчатский, ул. Проверочная, 1",
			phone: "+79000000001",
			email: "money-chain-a@example.test",
			medicalLicenseNumber: "ЛО-41-01-000001",
			medicalLicenseIssuedAt: "2025-01-15",
			medicalLicenseIssuer: "Министерство здравоохранения Камчатского края",
			bankDetails: "р/с 40702810000000000001, БИК 049999999",
			signatoryName: "Владелец клиники А",
			signatoryTitle: "главный врач",
			timezone: CLINIC_A_TIMEZONE,
		});
		console.log(`PUT реквизиты клиники -> HTTP ${profileResponse.statusCode}`);
		if (profileResponse.statusCode !== 200) {
			weldBroken(
				"настройки → реквизиты клиники",
				`PUT /api/settings/clinic/profile ответил ${profileResponse.statusCode}: ${profileResponse.body.slice(0, 200)}`,
				"без реквизитов клиника не может выдать ни счёт, ни квитанцию, ни заявление на возврат: любой платёжный документ отклоняется на выдаче",
			);
		}
		const profileRow = await firstRow<{ inn: string | null; address: string | null; license: string | null; phone: string | null; timezone: string }>(
			sql`select o.inn, o.legal_address as address, o.medical_license_number as license, c.phone, c.timezone
			      from organizations o join clinics c on c.organization_id = o.id
			     where o.id = ${ORG_A}::uuid`,
		);
		console.log(`реквизиты в базе: ${JSON.stringify(profileRow)}`);
		check("ИНН клиники записан", profileRow?.inn, "7700000001");
		check("лицензия записана", profileRow?.license, "ЛО-41-01-000001");
		check("пояс клиники А сохранён после правки реквизитов", profileRow?.timezone, CLINIC_A_TIMEZONE);

		step("ШАГ 2. ПРАЙС: POST /api/settings/catalog — цена с копейками");
		const catalogPayload = (code: string, title: string, price: number) => ({
			code,
			title,
			category: "therapy",
			specialty: "therapist",
			basePriceRub: price,
			durationMinutes: 60,
			taxDeductible: true,
			active: true,
		});
		const serviceOne = await call("POST", "/api/settings/catalog", headersA, catalogPayload("MC-1", "Лечение кариеса (денежная цепочка)", PRICE_ONE));
		const serviceTwo = await call("POST", "/api/settings/catalog", headersA, catalogPayload("MC-2", "Пломба светового отверждения (денежная цепочка)", PRICE_TWO));
		console.log(`POST прайс -> HTTP ${serviceOne.statusCode} / ${serviceTwo.statusCode}`);
		if (serviceOne.statusCode === 201 && serviceTwo.statusCode === 201) {
			serviceOneId = serviceOne.json?.id ?? null;
			serviceTwoId = serviceTwo.json?.id ?? null;
			checkRub("цена услуги 1 в ответе", serviceOne.json?.basePriceRub, "1500.50");
			checkRub("цена услуги 2 в ответе", serviceTwo.json?.basePriceRub, "1990.99");
		} else {
			weldBroken(
				"настройки → прайс клиники",
				`POST /api/settings/catalog ответил ${serviceOne.statusCode}: ${serviceOne.body.slice(0, 200)}`,
				"клиника не может ни завести услугу, ни поднять цену; прайс — основание счёта, плана лечения и расчёта материалов",
			);
			const inserted = await allRows<{ id: string }>(
				sql`insert into service_catalog_items
				      (organization_id, code, title, category, specialty, base_price_rub, price_rub, duration_minutes)
				    values (${ORG_A}::uuid, 'MC-1', ${"Лечение кариеса (денежная цепочка)"}, 'therapy', 'therapist', ${PRICE_ONE}, ${PRICE_ONE}, 60),
				           (${ORG_A}::uuid, 'MC-2', ${"Пломба светового отверждения (денежная цепочка)"}, 'therapy', 'therapist', ${PRICE_TWO}, ${PRICE_TWO}, 60)
				    returning id::text as id`,
			);
			serviceOneId = inserted[0]?.id ?? null;
			serviceTwoId = inserted[1]?.id ?? null;
		}
		// Копейки проверяются ТЕКСТОМ из numeric-колонки: число с плавающей точкой
		// здесь ничего не доказывает, а прайс — вершина всей денежной цепочки.
		const priceRows = await allRows<{ code: string; base_price_rub: string; price_rub: string }>(
			sql`select code, base_price_rub::text as base_price_rub, price_rub::text as price_rub
			      from service_catalog_items where organization_id = ${ORG_A}::uuid order by code`,
		);
		console.log(`прайс в базе: ${JSON.stringify(priceRows)}`);
		check("цена услуги 1 в базе", priceRows[0]?.price_rub, "1500.50");
		check("цена услуги 2 в базе", priceRows[1]?.price_rub, "1990.99");
		check("справочная цена дублируется без потери копеек", priceRows[0]?.base_price_rub, "1500.50");

		step("ШАГ 3. ПЛАН ЛЕЧЕНИЯ: POST /api/patients/:id/treatment-plans");
		const planResponse = await call("POST", `/api/patients/${PATIENT_A}/treatment-plans`, headersA, {
			name: "План лечения денежной цепочки",
			items: [
				{ toothNumber: 36, priceId: serviceOneId ?? "manual", name: "Лечение кариеса 36", quantity: 1, price: PRICE_ONE, discount: 0, phase: 1 },
				{ toothNumber: 46, priceId: serviceTwoId ?? "manual", name: "Пломба 46", quantity: 1, price: PRICE_TWO, discount: 0, phase: 1 },
			],
		});
		console.log(`POST план -> HTTP ${planResponse.statusCode} ${planResponse.body.slice(0, 200)}`);
		if (planResponse.statusCode === 200) {
			planId = planResponse.json?.planId ?? null;
			checkRub("итог плана в ответе маршрута", planResponse.json?.totalPrice, PLAN_TOTAL_TEXT);
		} else {
			weldBroken(
				"смета врача → план лечения",
				`POST /api/patients/:id/treatment-plans ответил ${planResponse.statusCode}: ${planResponse.body.slice(0, 200)}`,
				"врач не может собрать план лечения — счёт пациенту выставлять не из чего",
			);
		}
		const planRow = await firstRow<{ id: string; total_price: string }>(
			sql`select id::text as id, total_price::text as total_price from treatment_plans
			     where patient_id = ${PATIENT_A}::uuid order by created_at desc limit 1`,
		);
		console.log(`план в базе: ${JSON.stringify(planRow)}`);
		check("итог плана в базе до копейки", planRow?.total_price, PLAN_TOTAL_TEXT);
		const planItemRows = await allRows<{ price: string; discount: string; quantity: number }>(
			sql`select price::text as price, discount::text as discount, quantity
			      from treatment_plan_items_new where plan_id = ${planRow?.id ?? planId}::uuid order by price`,
		);
		console.log(`позиции плана: ${JSON.stringify(planItemRows)}`);
		check("позиций в плане", planItemRows.length, 2);
		check("цена позиции 1 в базе", planItemRows[0]?.price, "1500.50");
		check("цена позиции 2 в базе", planItemRows[1]?.price, "1990.99");

		/*
		 * ПЕРВЫЙ РАЗРЫВ ЦЕПОЧКИ, И ОН ЖЕ САМЫЙ ДОРОГОЙ. План лечения пишется в
		 * treatment_plans/treatment_plan_items_new, а ВСЕ деньги клиники читают
		 * treatment_items: и дебиторка (services/reports/managerReports.ts:1091),
		 * и главный экран (sampleData.ts: buildBillingSummary), и сумма счёта
		 * (documents/guards.ts: plannedAmountRubForDocument). Писателя в
		 * treatment_items у маршрута плана нет вовсе.
		 */
		const itemsAfterPlan = await firstRow<{ n: number }>(
			sql`select count(*)::int as n from treatment_items where patient_id = ${PATIENT_A}::uuid`,
		);
		console.log(`позиций лечения (treatment_items) после сохранения плана: ${itemsAfterPlan?.n}`);
		/*
		 * Ветка, а не жёсткое ожидание нуля. Сценарий обязан пережить починку: когда
		 * писатель в treatment_items появится, файл должен позеленеть сам, а не
		 * покраснеть на утверждении «строк ноль». Проверка «шов работает» и проверка
		 * «шов сломан» — разные ветки одного измерения.
		 */
		if ((itemsAfterPlan?.n ?? 0) === 0) {
			// Вред называется измеренными числами, а не общими словами: читаем деньги
			// клиники ДО сварки, при полностью сохранённом плане на 3491,49 ₽.
			const blindDashboard = await call("GET", "/api/dashboard", headersA);
			const blindSummary = blindDashboard.json?.billingSummary ?? {};
			const blindReceivables = await call("GET", "/api/reports/receivables", headersA);
			console.log(
				`деньги клиники при сохранённом плане на ${PLAN_TOTAL_TEXT} ₽: главный экран назначено=${blindSummary.totalPlannedRub} ` +
					`долг=${blindSummary.totalDueRub}; дебиторка итог=${blindReceivables.json?.totalDebtRub} должников=${(blindReceivables.json?.rows ?? []).length}`,
			);
			weldBroken(
				"план лечения → позиции лечения (treatment_items)",
				`план на ${PLAN_TOTAL_TEXT} ₽ лёг в treatment_plans/treatment_plan_items_new, а в treatment_items ${itemsAfterPlan?.n} строк — писателя нет; ` +
					`главный экран показывает назначено ${blindSummary.totalPlannedRub} ₽, дебиторка — долг ${blindReceivables.json?.totalDebtRub} ₽ у ${(blindReceivables.json?.rows ?? []).length} должников`,
				"клиника не видит собственного долга пациента: счёт уходит с пустой суммой, в дебиторке пациента нет, взыскивать нечего — по данным программы он лечится бесплатно",
			);
		} else {
			check("позиций лечения ровно столько, сколько в плане", itemsAfterPlan?.n, 2);
		}

		step("ШАГ 4. ЗАПИСЬ И ПРИЁМ: POST /api/appointments, POST /api/appointments/:id/visit");
		const startsAt = new Date(nowMs + 3_600_000).toISOString();
		const endsAt = new Date(nowMs + 7_200_000).toISOString();
		/*
		 * Сначала — тот же запрос БЕЗ секрета администратора. В schedule.ts
		 * охранник `requireScheduleMutationAccess` объявлен (строка 137) и не
		 * вызывается ни разу: измеряем, а не читаем.
		 */
		const unguarded = await call("POST", "/api/appointments", {
			"x-dente-clinic-token": clinicTokenA,
			"content-type": "application/json",
		}, {
			patientId: PATIENT_A,
			doctorUserId: DOCTOR_A,
			chairId: CHAIR_A,
			status: "planned",
			startsAt: new Date(nowMs + 10_800_000).toISOString(),
			endsAt: new Date(nowMs + 14_400_000).toISOString(),
			reason: "Проверка гейта расписания без секрета администратора",
		});
		console.log(`POST запись БЕЗ x-dente-admin-secret -> HTTP ${unguarded.statusCode}`);
		if (unguarded.statusCode === 201) {
			weldBroken(
				"периметр расписания → секрет администратора",
				"POST /api/appointments создал запись без заголовка x-dente-admin-secret (HTTP 201); requireScheduleMutationAccess в routes/schedule.ts:137 не вызывается ни разу",
				"любой, у кого есть токен кабинета, пишет в расписание клиники в обход гейта администратора — тот же барьер на клинических маршрутах отвечает 403",
			);
			await db.execute(sql`delete from appointments where organization_id = ${ORG_A}::uuid`);
		}

		const appointmentResponse = await call("POST", "/api/appointments", headersA, {
			patientId: PATIENT_A,
			doctorUserId: DOCTOR_A,
			chairId: CHAIR_A,
			status: "planned",
			startsAt,
			endsAt,
			reason: "Лечение 36 и 46 по плану",
		});
		console.log(`POST запись -> HTTP ${appointmentResponse.statusCode}`);
		if (appointmentResponse.statusCode !== 201) {
			weldBroken(
				"расписание → запись на приём",
				`POST /api/appointments ответил ${appointmentResponse.statusCode}: ${appointmentResponse.body.slice(0, 200)}`,
				"администратор не может записать пациента; без записи нет приёма, а без приёма касса не привязывает деньги к врачу",
			);
			const inserted = await firstRow<{ id: string }>(
				sql`insert into appointments (organization_id, patient_id, doctor_user_id, chair_id, status, starts_at, ends_at)
				    values (${ORG_A}::uuid, ${PATIENT_A}::uuid, ${DOCTOR_A}::uuid, ${CHAIR_A}::uuid, 'planned', ${startsAt}::timestamptz, ${endsAt}::timestamptz)
				    returning id::text as id`,
			);
			appointmentId = inserted?.id ?? null;
		} else {
			const created = await firstRow<{ id: string; status: string }>(
				sql`select id::text as id, status::text as status from appointments
				     where organization_id = ${ORG_A}::uuid order by starts_at desc limit 1`,
			);
			appointmentId = created?.id ?? null;
			console.log(`запись в базе: ${appointmentId} статус=${created?.status}`);
		}

		const visitResponse = await call("POST", `/api/appointments/${appointmentId}/visit`, headersA);
		console.log(`POST приём -> HTTP ${visitResponse.statusCode} ${visitResponse.body.slice(0, 200)}`);
		if (visitResponse.statusCode === 201) {
			visitId = visitResponse.json?.visit?.id ?? null;
		} else {
			weldBroken(
				"запись → открытый приём",
				`POST /api/appointments/:id/visit ответил ${visitResponse.statusCode}: ${visitResponse.body.slice(0, 200)}`,
				"приём не открывается, а касса принимает оплату только в контексте открытого приёма этого пациента",
			);
			const inserted = await firstRow<{ id: string }>(
				sql`insert into visits (organization_id, patient_id, appointment_id, status)
				    values (${ORG_A}::uuid, ${PATIENT_A}::uuid, ${appointmentId}::uuid, 'draft')
				    returning id::text as id`,
			);
			visitId = inserted?.id ?? null;
		}
		const visitCount = await firstRow<{ n: number }>(
			sql`select count(*)::int as n from visits where appointment_id = ${appointmentId}::uuid`,
		);
		check("приём по записи ровно один", visitCount?.n, 1);

		step("ШАГ 5. СЧЁТ ПАЦИЕНТУ: POST /api/documents kind=payment_invoice");
		const invoiceLines = [
			{ serviceName: "Лечение кариеса 36", toothOrArea: "36", quantity: 1, unitPriceRub: PRICE_ONE, discountRub: 0, totalRub: PRICE_ONE },
			{ serviceName: "Пломба 46", toothOrArea: "46", quantity: 1, unitPriceRub: PRICE_TWO, discountRub: 0, totalRub: PRICE_TWO },
		];
		const invoicePayload = {
			patientId: PATIENT_A,
			visitId,
			kind: "payment_invoice",
			title: "Счёт на оплату (денежная цепочка)",
			totalAmountRub: Number(PLAN_TOTAL_TEXT),
			payload: {
				paymentInvoice: {
					invoiceNumber: "СЧ-2026-0001",
					invoiceDate: TODAY_TEXT,
					payerFullName: "Пациент денежной цепочки А",
					paymentPurpose: "Оплата стоматологических услуг по плану лечения",
					serviceLines: invoiceLines,
					totalAmountRub: Number(PLAN_TOTAL_TEXT),
					dueDate: TODAY_TEXT,
					paymentTerms: "Оплата в кассе клиники или переводом в течение трёх рабочих дней.",
					clinicBankDetails: "р/с 40702810000000000001, банк проверки цепочки, БИК 049999999",
					cashlessPaymentAllowed: true,
					cashDeskPaymentAllowed: true,
					clinicRequisitesVerified: true,
					serviceScopeConfirmed: true,
					payerInformedInvoiceIsNotFiscalReceipt: true,
				},
			},
		};
		const invoiceResponse = await call("POST", "/api/documents", headersA, invoicePayload);
		console.log(`POST счёт -> HTTP ${invoiceResponse.statusCode} ${invoiceResponse.body.slice(0, 260)}`);
		if (invoiceResponse.statusCode === 201) {
			invoiceDocumentId = invoiceResponse.json?.id ?? null;
			const storedInvoice = await firstRow<{ total_amount_rub: string | null; status: string }>(
				sql`select total_amount_rub::text as total_amount_rub, status::text as status
				      from generated_documents where id = ${invoiceDocumentId}::uuid`,
			);
			console.log(`счёт в базе: ${JSON.stringify(storedInvoice)}`);
			/*
			 * ВТОРОЙ РАЗРЫВ, СЛЕДСТВИЕ ПЕРВОГО. `validateDocumentCreation`
			 * (documents/guards.ts) для документа с плановой суммой ПЕРЕЗАПИСЫВАЕТ
			 * присланный итог значением из treatment_items:
			 * `totalAmountRub = facts.plannedAmountRub > 0 ? … : null`. Позиций нет —
			 * значит счёт уходит с пустой суммой, хотя в теле счёта строки на
			 * 3491,49 ₽ есть и они прошли проверку.
			 */
			if (storedInvoice?.total_amount_rub === null) {
				weldBroken(
					"счёт → сумма счёта",
					`документ payment_invoice создан (HTTP 201), в теле строки на ${PLAN_TOTAL_TEXT} ₽, а generated_documents.total_amount_rub = NULL`,
					"пациент получает счёт без суммы, а бухгалтерия не видит выставленного требования: счёт есть, денег в нём нет",
				);
			} else {
				checkRub("сумма счёта в базе", storedInvoice?.total_amount_rub, PLAN_TOTAL_TEXT);
			}
		} else {
			weldBroken(
				"план лечения → счёт пациенту",
				`POST /api/documents kind=payment_invoice ответил ${invoiceResponse.statusCode}: ${invoiceResponse.body.slice(0, 260)}`,
				"клиника не может выставить счёт по собранному плану лечения",
			);
		}

		step("ШАГ 6. СВАРКА ПЕРВОГО РАЗРЫВА: позиции лечения ставятся прямым SQL, чтобы цепочка шла дальше");
		/*
		 * Обход ровно настолько, чтобы идти дальше: строки в treatment_items
		 * повторяют позиции плана один в один. Без них ни долг, ни дебиторка, ни
		 * сумма счёта не измеримы вовсе, и карта разрывов оборвалась бы на первом.
		 */
		if ((itemsAfterPlan?.n ?? 0) === 0) {
			await db.execute(sql`
				insert into treatment_items
				  (organization_id, patient_id, visit_id, service_id, tooth_code, title, quantity, price_rub, unit_price_rub, discount_rub, status, planned_doctor_user_id)
				values
				  (${ORG_A}::uuid, ${PATIENT_A}::uuid, ${visitId}::uuid, ${serviceOneId}::uuid, '36', ${"Лечение кариеса 36"}, 1, ${PRICE_ONE}, ${PRICE_ONE}, 0, 'approved', ${DOCTOR_A}::uuid),
				  (${ORG_A}::uuid, ${PATIENT_A}::uuid, ${visitId}::uuid, ${serviceTwoId}::uuid, '46', ${"Пломба 46"}, 1, ${PRICE_TWO}, ${PRICE_TWO}, 0, 'approved', ${DOCTOR_A}::uuid)`);
		} else {
			console.log("сварка не нужна: писатель в treatment_items появился, шов работает сам");
		}
		const weldedDebt = await debtText(ORG_A);
		console.log(`после сварки SQL: назначено=${weldedDebt.planned} оплачено=${weldedDebt.paid} долг=${weldedDebt.due}`);
		check("назначено после сварки", weldedDebt.planned, PLAN_TOTAL_TEXT);

		const invoiceAfterWeld = await call("POST", "/api/documents", headersA, {
			...invoicePayload,
			payload: {
				paymentInvoice: {
					...invoicePayload.payload.paymentInvoice,
					invoiceNumber: "СЧ-2026-0002",
				},
			},
		});
		if (invoiceAfterWeld.statusCode === 201) {
			const storedSecond = await firstRow<{ total_amount_rub: string | null }>(
				sql`select total_amount_rub::text as total_amount_rub from generated_documents where id = ${invoiceAfterWeld.json?.id}::uuid`,
			);
			console.log(`тот же счёт после сварки: сумма ${storedSecond?.total_amount_rub}`);
			// Причина названа точно: пустая сумма счёта — не дефект документов, а
			// отсутствие писателя в treatment_items. Тот же запрос теперь верен.
			check("сумма счёта после сварки", storedSecond?.total_amount_rub, PLAN_TOTAL_TEXT);
		} else {
			console.log(`тот же счёт после сварки -> HTTP ${invoiceAfterWeld.statusCode} ${invoiceAfterWeld.body.slice(0, 200)}`);
		}

		const dueBeforePayment = await call("GET", "/api/dashboard", headersA);
		const summaryBefore = dueBeforePayment.json?.billingSummary ?? {};
		console.log(`главный экран до оплаты: назначено=${summaryBefore.totalPlannedRub} оплачено=${summaryBefore.totalPaidRub} долг=${summaryBefore.totalDueRub}`);
		checkRub("назначено на главном экране", summaryBefore.totalPlannedRub, PLAN_TOTAL_TEXT);
		checkRub("долг на главном экране до оплаты", summaryBefore.totalDueRub, PLAN_TOTAL_TEXT);

		step("ШАГ 7. ЧАСТИЧНАЯ ОПЛАТА: POST /api/billing/payments на 1000,00 ₽");
		const firstPaymentKey = `money-chain-first-${nowMs}`;
		const firstPayment = await call("POST", "/api/billing/payments", headersA, {
			patientId: PATIENT_A,
			visitId,
			amountRub: FIRST_PAYMENT,
			method: "cash",
			clientMutationId: firstPaymentKey,
		});
		console.log(`POST оплата 1 -> HTTP ${firstPayment.statusCode} ${firstPayment.body.slice(0, 200)}`);
		if (firstPayment.statusCode === 201) {
			firstPaymentId = firstPayment.json?.id ?? null;
			checkRub("сумма первой оплаты в ответе", firstPayment.json?.amountRub, "1000.00");
			check("оплата привязана к приёму", firstPayment.json?.visitId, visitId);
		} else {
			weldBroken(
				"касса → приём оплаты",
				`POST /api/billing/payments ответил ${firstPayment.statusCode}: ${firstPayment.body.slice(0, 200)}`,
				"клиника не может принять деньги через программу — касса ведётся мимо учёта",
			);
			const inserted = await firstRow<{ id: string }>(
				sql`insert into payments (organization_id, patient_id, visit_id, amount_rub, method, status, client_mutation_id)
				    values (${ORG_A}::uuid, ${PATIENT_A}::uuid, ${visitId}::uuid, ${FIRST_PAYMENT}, 'cash', 'paid', ${firstPaymentKey})
				    returning id::text as id`,
			);
			firstPaymentId = inserted?.id ?? null;
		}
		const storedFirst = await firstRow<{ amount_rub: string; status: string; doctor_user_id: string | null }>(
			sql`select p.amount_rub::text as amount_rub, p.status::text as status, a.doctor_user_id::text as doctor_user_id
			      from payments p
			      left join visits v on v.id = p.visit_id
			      left join appointments a on a.id = v.appointment_id
			     where p.id = ${firstPaymentId}::uuid`,
		);
		console.log(`оплата 1 в базе: ${JSON.stringify(storedFirst)}`);
		check("сумма первой оплаты в базе", storedFirst?.amount_rub, "1000.00");
		check("статус первой оплаты", storedFirst?.status, "paid");
		check("деньги отнесены к врачу записи", storedFirst?.doctor_user_id, DOCTOR_A);

		// ИДЕМПОТЕНТНОСТЬ: повтор с тем же ключом обязан вернуть ту же оплату, а не
		// удвоить деньги. Двойное нажатие «Принять оплату» — типовое событие у кассы.
		const repeated = await call("POST", "/api/billing/payments", headersA, {
			patientId: PATIENT_A,
			visitId,
			amountRub: FIRST_PAYMENT,
			method: "cash",
			clientMutationId: firstPaymentKey,
		});
		check("повтор оплаты с тем же ключом не создал новую", repeated.statusCode, 200);
		check("повтор вернул ту же оплату", repeated.json?.id, firstPaymentId);
		const paymentsAfterRepeat = await firstRow<{ n: number }>(
			sql`select count(*)::int as n from payments where client_mutation_id = ${firstPaymentKey}`,
		);
		check("строк оплаты по ключу ровно одна", paymentsAfterRepeat?.n, 1);

		const debtAfterFirst = await debtText(ORG_A);
		console.log(`после частичной оплаты SQL: назначено=${debtAfterFirst.planned} оплачено=${debtAfterFirst.paid} долг=${debtAfterFirst.due}`);
		check("оплачено после первой оплаты", debtAfterFirst.paid, "1000.00");
		check("остаток долга", debtAfterFirst.due, "2491.49");
		const receivablesAfterFirst = await call("GET", "/api/reports/receivables", headersA);
		console.log(`дебиторка: HTTP ${receivablesAfterFirst.statusCode} итог=${receivablesAfterFirst.json?.totalDebtRub} должников=${(receivablesAfterFirst.json?.rows ?? []).length}`);
		checkRub("дебиторка видит остаток долга", receivablesAfterFirst.json?.totalDebtRub, "2491.49");
		check("должник ровно один", (receivablesAfterFirst.json?.rows ?? []).length, 1);
		check("и это наш пациент", receivablesAfterFirst.json?.rows?.[0]?.patientId, PATIENT_A);

		step("ШАГ 8. ДОПЛАТА: POST /api/billing/payments на 2491,49 ₽ — копейка обязана сойтись");
		const secondPaymentKey = `money-chain-second-${nowMs}`;
		const secondPayment = await call("POST", "/api/billing/payments", headersA, {
			patientId: PATIENT_A,
			visitId,
			amountRub: SECOND_PAYMENT,
			method: "card",
			clientMutationId: secondPaymentKey,
		});
		console.log(`POST оплата 2 -> HTTP ${secondPayment.statusCode} ${secondPayment.body.slice(0, 200)}`);
		if (secondPayment.statusCode === 201) {
			secondPaymentId = secondPayment.json?.id ?? null;
			checkRub("сумма доплаты в ответе", secondPayment.json?.amountRub, "2491.49");
		} else {
			weldBroken(
				"касса → доплата с копейками",
				`POST /api/billing/payments на ${SECOND_PAYMENT} ответил ${secondPayment.statusCode}: ${secondPayment.body.slice(0, 200)}`,
				"клиника не может закрыть долг с копейками: у пациента вечно остаётся или исчезает полтинник",
			);
			const inserted = await firstRow<{ id: string }>(
				sql`insert into payments (organization_id, patient_id, visit_id, amount_rub, method, status, client_mutation_id)
				    values (${ORG_A}::uuid, ${PATIENT_A}::uuid, ${visitId}::uuid, ${SECOND_PAYMENT}, 'card', 'paid', ${secondPaymentKey})
				    returning id::text as id`,
			);
			secondPaymentId = inserted?.id ?? null;
		}
		const paidAfterTwo = await paidTotalText(ORG_A);
		console.log(`оплачено всего (SQL, текст из numeric): ${paidAfterTwo}`);
		check("две оплаты сложились без потери копеек", paidAfterTwo, PAID_AFTER_TWO_TEXT);
		const debtAfterTwo = await debtText(ORG_A);
		check("долг закрыт в ноль", debtAfterTwo.due, "0.00");
		const receivablesClosed = await call("GET", "/api/reports/receivables", headersA);
		check("дебиторка пуста после полной оплаты", (receivablesClosed.json?.rows ?? []).length, 0);
		checkRub("итог дебиторки ноль", receivablesClosed.json?.totalDebtRub, "0.00");

		step("ШАГ 9. ПЕРЕПЛАТА: POST /api/billing/payments на 500,00 ₽ с фискальным чеком");
		const overpayKey = `money-chain-overpay-${nowMs}`;
		/*
		 * ПЛАТЕЛЬЩИК НАЗВАН ПОЛНОСТЬЮ, И ЭТО НЕ УКРАШЕНИЕ. Выдача заявления на
		 * возврат требует у КАЖДОГО включённого платежа ФИО, дату рождения, ИНН,
		 * документ и родство (documents/renderDocument.ts:1337
		 * hasPaymentPayerIdentity). Первый прогон этого сценария отправил платёж без
		 * них, получил 409 на выдаче и записал это в карту как разрыв шва — а
		 * виновата была неполная фикстура. Разрыв, найденный на недозаполненных
		 * данных, — ложный, и он опаснее пропущенного.
		 */
		const overpay = await call("POST", "/api/billing/payments", headersA, {
			patientId: PATIENT_A,
			visitId,
			amountRub: OVERPAYMENT,
			method: "cash",
			clientMutationId: overpayKey,
			fiscalReceiptNumber: OVERPAY_RECEIPT_NUMBER,
			fiscalReceiptIssuedAt: OVERPAY_RECEIPT_DATE,
			payerFullName: "Пациент Денежной Цепочки",
			payerBirthDate: "1990-05-17",
			payerInn: "770000000199",
			payerIdentityDocument: "паспорт 12 34 567890",
			payerRelationship: "пациент",
		});
		console.log(`POST переплата -> HTTP ${overpay.statusCode} ${overpay.body.slice(0, 200)}`);
		if (overpay.statusCode === 201) {
			overpaymentId = overpay.json?.id ?? null;
			check("номер чека сохранён", overpay.json?.fiscalReceiptNumber, OVERPAY_RECEIPT_NUMBER);
			check("дата чека сохранена", overpay.json?.fiscalReceiptIssuedAt, OVERPAY_RECEIPT_DATE);
		} else {
			weldBroken(
				"касса → переплата с чеком",
				`POST /api/billing/payments с фискальным чеком ответил ${overpay.statusCode}: ${overpay.body.slice(0, 200)}`,
				"без номера и даты исходного чека возврат оформить невозможно вообще",
			);
			const inserted = await firstRow<{ id: string }>(
				sql`insert into payments
				      (organization_id, patient_id, visit_id, amount_rub, method, status, client_mutation_id,
				       fiscal_receipt_number, fiscal_receipt_issued_at,
				       payer_full_name, payer_birth_date, payer_inn, payer_identity_document, payer_relationship)
				    values (${ORG_A}::uuid, ${PATIENT_A}::uuid, ${visitId}::uuid, ${OVERPAYMENT}, 'cash', 'paid', ${overpayKey},
				            ${OVERPAY_RECEIPT_NUMBER}, ${OVERPAY_RECEIPT_DATE},
				            ${"Пациент Денежной Цепочки"}, '1990-05-17', '770000000199', ${"паспорт 12 34 567890"}, ${"пациент"})
				    returning id::text as id`,
			);
			overpaymentId = inserted?.id ?? null;
		}
		const paidAfterOverpay = await paidTotalText(ORG_A);
		check("касса после переплаты", paidAfterOverpay, PAID_AFTER_OVERPAY_TEXT);

		const dashboardOverpaid = await call("GET", "/api/dashboard", headersA);
		const summaryOverpaid = dashboardOverpaid.json?.billingSummary ?? {};
		const receivablesOverpaid = await call("GET", "/api/reports/receivables", headersA);
		console.log(
			`главный экран при переплате: оплачено=${summaryOverpaid.totalPaidRub} долг=${summaryOverpaid.totalDueRub}; ` +
				`дебиторка: долг=${receivablesOverpaid.json?.totalDebtRub} переплаты=${receivablesOverpaid.json?.totalPrepaidRub} у ${(receivablesOverpaid.json?.prepayments ?? []).length} пациент(ов)`,
		);
		checkRub("оплачено на главном экране", summaryOverpaid.totalPaidRub, PAID_AFTER_OVERPAY_TEXT);
		/*
		 * РАСХОЖДЕНИЕ ФОРМУЛ, И ОНО ТУТ ЖЕ СВОДИТСЯ. Главный экран считает долг как
		 * `Math.max(0, назначено − оплачено)` (sampleData.ts:1349) и переплату
		 * показать не может по построению: 3491,49 − 3991,49 = −500 обрезается в 0.
		 * Отчёт дебиторки тот же баланс называет переплатой и печатает имя пациента.
		 * Это разные вопросы к одним данным, а не дефект: 0 = max(0, −500), и
		 * 500 = −(−500).
		 */
		checkRub("долг главного экрана обрезан в ноль", summaryOverpaid.totalDueRub, "0.00");
		checkRub("переплата названа отчётом дебиторки", receivablesOverpaid.json?.totalPrepaidRub, "500.00");
		console.log(
			`РАСХОЖДЕНИЕ ФОРМУЛ ПЕРЕПЛАТЫ СВЕДЕНО: назначено ${PLAN_TOTAL_TEXT} − оплачено ${PAID_AFTER_OVERPAY_TEXT} = −500.00; ` +
				`главный экран печатает долг ${summaryOverpaid.totalDueRub} (обрезка в ноль), дебиторка — переплату ${receivablesOverpaid.json?.totalPrepaidRub} ₽ ` +
				`у пациента «${receivablesOverpaid.json?.prepayments?.[0]?.patientName}». Обе цифры верны, вопросы разные.`,
		);

		step("ШАГ 10. ВОЗВРАТ: POST /api/documents kind=payment_refund_correction_request");
		const refundPayload = {
			patientId: PATIENT_A,
			visitId,
			kind: "payment_refund_correction_request",
			title: "Заявление на возврат переплаты (денежная цепочка)",
			payload: {
				paymentRefundCorrection: {
					action: "full_refund",
					selectedPaymentIds: [overpaymentId],
					amountRub: OVERPAYMENT,
					reason: "Пациент внёс на 500 ₽ больше суммы плана лечения.",
					refundMethod: "cash",
					recipientFullName: "Пациент денежной цепочки А",
					recipientIdentityDocument: "паспорт 12 34 567890",
					originalFiscalReceiptNumber: OVERPAY_RECEIPT_NUMBER,
					accountantDecision: "Возврат согласован: переплата подтверждена сверкой кассы за день.",
				},
			},
		};
		const refund = await call("POST", "/api/documents", headersA, refundPayload);
		console.log(`POST возврат -> HTTP ${refund.statusCode} ${refund.body.slice(0, 260)}`);
		if (refund.statusCode === 201) {
			refundDocumentId = refund.json?.id ?? null;
			checkRub("сумма заявления на возврат", refund.json?.totalAmountRub, "500.00");
		} else {
			weldBroken(
				"переплата → заявление на возврат",
				`POST /api/documents kind=payment_refund_correction_request ответил ${refund.statusCode}: ${refund.body.slice(0, 260)}`,
				"клиника не может оформить возврат переплаты документом — деньги пациента остаются в кассе без основания",
			);
		}

		// Возврат «выдаётся» — это момент, когда деньги покидают кассу.
		if (refundDocumentId) {
			const issued = await call("POST", `/api/documents/${refundDocumentId}/issue`, headersA, {
				signatureAttestation: {
					mode: "paper_signed",
					signedAt: TODAY_TEXT,
					recipientFullName: "Пациент денежной цепочки А",
					recipientRole: "пациент",
					staffFullName: "Владелец клиники А",
					staffRole: "владелец клиники",
					identityChecked: true,
					documentOpenedAndChecked: true,
					recipientSigned: true,
					clinicRepresentativeSigned: true,
				},
			});
			console.log(`POST выдача возврата -> HTTP ${issued.statusCode} ${issued.body.slice(0, 260)}`);
			if (issued.statusCode !== 200) {
				weldBroken(
					"заявление на возврат → выдача документа",
					`POST /api/documents/:id/issue ответил ${issued.statusCode}: ${issued.body.slice(0, 200)}`,
					"черновик возврата не превращается в выданный документ: учёт остатка по чеку ведётся ТОЛЬКО по выданным (documents/guards.ts: alreadyRefundedRubForPayment), значит повторный возврат по тому же чеку ничем не ограничен",
				);
			}

			// Повторный возврат по тому же чеку: клиника не должна выплатить дважды.
			const secondRefund = await call("POST", "/api/documents", headersA, {
				...refundPayload,
				title: "Второе заявление на возврат той же переплаты",
			});
			console.log(`POST второй возврат по тому же чеку -> HTTP ${secondRefund.statusCode} ${secondRefund.body.slice(0, 200)}`);
			if (secondRefund.statusCode === 201) {
				weldBroken(
					"возврат → остаток по чеку",
					`второе заявление на те же ${OVERPAYMENT} ₽ по чеку ${OVERPAY_RECEIPT_NUMBER} создано (HTTP 201)`,
					`клиника может выплатить ${OVERPAYMENT * 2} ₽ по чеку на ${OVERPAYMENT} ₽ — прямая утрата денег`,
				);
			} else {
				check("повторный возврат по тому же чеку отклонён", secondRefund.statusCode, 409);
				console.log(`  причина отказа: ${secondRefund.json?.message ?? secondRefund.body.slice(0, 200)}`);
			}
		}

		/*
		 * ВОЗВРАТ ДОЛЖЕН БЫТЬ И ДОКУМЕНТОМ, И ДВИЖЕНИЕМ ДЕНЕГ.
		 *
		 * Здесь был ТРЕТИЙ РАЗРЫВ: ни один маршрут не переводил платёж в статус
		 * `refunded`, и возврат существовал как бумага, но не как деньги. Он
		 * закрыт (`5f35a43c2`), и это место переписано так, чтобы работать в ОБОИХ
		 * мирах — со сваренным швом и с разорванным.
		 *
		 * ПОЧЕМУ НЕ ПРОСТО «ОБНОВИТЬ ОЖИДАНИЕ». Прежняя редакция утверждала
		 * `касса после оформления возврата НЕ изменилась` и ждала 3991,49 — то есть
		 * закрепляла дефект как ожидаемое поведение. Такое утверждение краснеет в
		 * день, когда дефект чинят, и чинящий видит красное на ВЕРНОЙ правке. В
		 * этом дереве сторожа, кричащие на верном коде, выключали трижды.
		 *
		 * Поэтому ожидание выводится из ФАКТА статуса платежа, а не зашито. Если
		 * шов снова порвётся, сценарий скажет об этом разрывом, а не молча
		 * подстроится: ветка `paid` по-прежнему зовёт `weldBroken`.
		 */
		const paymentAfterRefund = await firstRow<{ status: string; amount_rub: string }>(
			sql`select status::text as status, amount_rub::text as amount_rub from payments where id = ${overpaymentId}::uuid`,
		);
		console.log(`платёж переплаты после возврата: ${JSON.stringify(paymentAfterRefund)}`);
		const refundReachedTheTill = paymentAfterRefund?.status === "refunded";
		if (!refundReachedTheTill) {
			weldBroken(
				"возврат → статус платежа в кассе",
				`заявление на возврат оформлено и выдано, а payments.status платежа ${overpaymentId} остался «${paymentAfterRefund?.status}» на ${paymentAfterRefund?.amount_rub} ₽`,
				"выручка и отчёты руководителю считают возвращённые деньги полученными: касса не сходится с фактическим остатком, а налоговая справка соберёт возвращённую сумму как оплату пациента",
			);
		}
		const paidAfterRefundDocument = await paidTotalText(ORG_A);
		check(
			refundReachedTheTill
				? "касса уменьшилась на возврат сразу при выдаче документа"
				: "касса после оформления возврата не изменилась (шов разорван)",
			paidAfterRefundDocument,
			refundReachedTheTill ? PAID_AFTER_TWO_TEXT : PAID_AFTER_OVERPAY_TEXT,
		);

		step("ШАГ 11. КАССА ПОСЛЕ ВОЗВРАТА СХОДИТСЯ, КАК БЫ ШОВ НИ СРАБОТАЛ");
		/*
		 * Прямой SQL остался ТОЛЬКО как обход разорванного шва: без него цепочка
		 * не доходит до отчётов и карта разрывов обрывается на первом. Когда шов
		 * сварен, обход не нужен — и делать его нельзя, иначе прогон скроет
		 * повторное списание, если оно когда-нибудь появится.
		 */
		if (!refundReachedTheTill) {
			console.log("обход разорванного шва: статус возврата ставится прямым SQL, чтобы дойти до отчётов");
			await db.execute(sql`update payments set status = 'refunded' where id = ${overpaymentId}::uuid`);
		} else {
			console.log("обход не нужен: маршрут сам перевёл платёж в «refunded»");
		}
		const paidAfterWeldedRefund = await paidTotalText(ORG_A);
		check("касса после возврата", paidAfterWeldedRefund, PAID_AFTER_TWO_TEXT);
		const receivablesAfterRefund = await call("GET", "/api/reports/receivables", headersA);
		checkRub("переплат больше нет", receivablesAfterRefund.json?.totalPrepaidRub, "0.00");
		checkRub("долга тоже нет", receivablesAfterRefund.json?.totalDebtRub, "0.00");

		step("ШАГ 12. ОТЧЁТ РУКОВОДИТЕЛЮ: выручка, врачи, сводка, выплаты");
		const revenue = await call("GET", `/api/reports/revenue${reportQuery}`, headersA);
		const doctors = await call("GET", `/api/reports/doctors${reportQuery}`, headersA);
		const summary = await call("GET", `/api/reports/summary${reportQuery}`, headersA);
		const payouts = await call("GET", `/api/billing/payouts${reportQuery}`, headersA);
		console.log(`HTTP: выручка ${revenue.statusCode}, врачи ${doctors.statusCode}, сводка ${summary.statusCode}, выплаты ${payouts.statusCode}`);
		const revenueSqlRow = await firstRow<{ total: string }>(
			sql`select coalesce(sum(amount_rub), 0)::numeric(12,2)::text as total from payments
			     where organization_id = ${ORG_A}::uuid and status = 'paid'
			       and paid_at >= ${periodFrom}::timestamptz and paid_at <= ${periodTo}::timestamptz`,
		);
		console.log(`выручка периода независимым SQL: ${revenueSqlRow?.total} ₽`);
		if (revenue.statusCode === 200) {
			// Поле называется totalRub (services/reports/managerReports.ts:349), а не
			// totalRevenueRub: первый прогон читал несуществующее имя и получал
			// undefined — то есть проверял свою опечатку, а не выручку клиники.
			checkRub("выручка отчёта = выручка SQL", revenue.json?.totalRub, revenueSqlRow?.total ?? "0.00");
			console.log(`  точек в графике выручки: ${(revenue.json?.points ?? []).length}`);
		} else {
			weldBroken(
				"отчёт руководителю → выручка",
				`GET /api/reports/revenue ответил ${revenue.statusCode}: ${revenue.body.slice(0, 200)}`,
				"владелец не видит выручку клиники и считает её в тетради",
			);
		}
		if (doctors.statusCode === 200) {
			const doctorRows: any[] = doctors.json?.rows ?? [];
			const mine = doctorRows.find((row) => row.doctorUserId === DOCTOR_A);
			console.log(`врачи отчёта: ${JSON.stringify(doctorRows.map((row) => ({ id: row.doctorUserId, revenue: row.revenueRub })))}`);
			checkRub("выручка отнесена нашему врачу", mine?.revenueRub, PAID_AFTER_TWO_TEXT);
			check("чужого врача в отчёте нет", doctorRows.some((row) => row.doctorUserId === DOCTOR_B), false);
		}
		if (summary.statusCode === 200) {
			console.log(`сводка: дебиторка=${JSON.stringify(summary.json?.receivables)}`);
			checkRub("сводка: долг", summary.json?.receivables?.totalDebtRub, "0.00");
			checkRub("сводка: переплаты", summary.json?.receivables?.totalPrepaidRub, "0.00");
		}
		if (payouts.statusCode === 200) {
			console.log(`выплаты: охват=${payouts.json?.scope} итоги=${JSON.stringify(payouts.json?.totals)}`);
			checkRub("выплаты: касса периода", payouts.json?.totals?.revenueRub, PAID_AFTER_TWO_TEXT);
			checkRub("выплаты: касса, отнесённая к врачам", payouts.json?.totals?.attributableRevenueRub, PAID_AFTER_TWO_TEXT);
			const payoutRow = (payouts.json?.rows ?? []).find((row: any) => row.doctorUserId === DOCTOR_A);
			check("ставка врача не выдумана", payoutRow?.payoutRub ?? null, null);
			console.log(`  причина по врачу: ${payoutRow?.note}`);
		} else {
			weldBroken(
				"отчёт руководителю → выплаты врачам",
				`GET /api/billing/payouts ответил ${payouts.statusCode}: ${payouts.body.slice(0, 200)}`,
				"владелец не может посчитать зарплату врачей по кассе, которая в базе уже есть",
			);
		}

		step("ШАГ 13. ИЗОЛЯЦИЯ: клиника Б не видит и не может тронуть деньги клиники А");
		const foreignKey = `money-chain-foreign-${nowMs}`;
		const foreignPayment = await call("POST", "/api/billing/payments", headersB, {
			patientId: PATIENT_B,
			amountRub: FOREIGN_PAYMENT,
			method: "card",
			clientMutationId: foreignKey,
		});
		console.log(`оплата клиники Б -> HTTP ${foreignPayment.statusCode}`);
		if (foreignPayment.statusCode !== 201) {
			await db.execute(sql`
				insert into payments (organization_id, patient_id, amount_rub, method, status, client_mutation_id)
				values (${ORG_B}::uuid, ${PATIENT_B}::uuid, ${FOREIGN_PAYMENT}, 'card', 'paid', ${foreignKey})`);
		}

		// 1. Б пытается принять оплату за пациента А.
		const crossPayment = await call("POST", "/api/billing/payments", headersB, {
			patientId: PATIENT_A,
			amountRub: 100,
			method: "cash",
			clientMutationId: `money-chain-cross-${nowMs}`,
		});
		check("Б не может принять оплату за пациента А", crossPayment.statusCode, 404);
		const crossStored = await firstRow<{ n: number }>(
			sql`select count(*)::int as n from payments
			     where patient_id = ${PATIENT_A}::uuid and organization_id = ${ORG_B}::uuid`,
		);
		if ((crossStored?.n ?? 0) > 0) {
			failures += 1;
			console.log(`[УТЕЧКА] клиника Б записала ${crossStored?.n} оплат(ы) на пациента клиники А`);
		} else {
			console.log("оплат клиники Б на пациента А в базе нет — изоляция кассы держится");
		}

		// 2. Б читает план лечения пациента А.
		const crossPlanRead = await call("GET", `/api/patients/${PATIENT_A}/treatment-plans`, headersB);
		check("Б не читает план лечения пациента А", crossPlanRead.statusCode, 404);
		// 3. Б пишет план лечения пациенту А.
		const crossPlanWrite = await call("POST", `/api/patients/${PATIENT_A}/treatment-plans`, headersB, {
			name: "Чужой план",
			items: [{ toothNumber: 11, priceId: "manual", name: "Чужая услуга", quantity: 1, price: 100_000, discount: 0, phase: 1 }],
		});
		check("Б не пишет план лечения пациенту А", crossPlanWrite.statusCode, 404);
		// 4. Б выставляет документ пациенту А.
		const crossDocument = await call("POST", "/api/documents", headersB, refundPayload);
		check("Б не выставляет документ пациенту А", crossDocument.statusCode, 404);

		// 5. Деньги клиники А не видны в отчётах и на экране клиники Б.
		const foreignDashboard = await call("GET", "/api/dashboard", headersB);
		const foreignSummary = foreignDashboard.json?.billingSummary ?? {};
		const foreignReceivables = await call("GET", "/api/reports/receivables", headersB);
		const foreignRevenue = await call("GET", `/api/reports/revenue${reportQuery}`, headersB);
		const foreignPayouts = await call("GET", `/api/billing/payouts${reportQuery}`, headersB);
		console.log(
			`клиника Б: оплачено=${foreignSummary.totalPaidRub} долг=${foreignSummary.totalDueRub}; ` +
				`выручка=${foreignRevenue.json?.totalRub}; дебиторка=${foreignReceivables.json?.totalDebtRub}`,
		);
		checkRub("касса клиники Б — только своя", foreignSummary.totalPaidRub, "7777.77");
		if (foreignRevenue.statusCode === 200) {
			checkRub("выручка клиники Б — только своя", foreignRevenue.json?.totalRub, "7777.77");
		}
		const foreignMentionsA =
			JSON.stringify(foreignReceivables.json ?? {}).includes(PATIENT_A) ||
			JSON.stringify(foreignPayouts.json ?? {}).includes(DOCTOR_A) ||
			JSON.stringify(foreignRevenue.json ?? {}).includes(PATIENT_A);
		if (foreignMentionsA) {
			failures += 1;
			console.log("[УТЕЧКА] отчёты клиники Б упоминают пациента или врача клиники А");
		} else {
			console.log("в отчётах клиники Б нет ни пациента, ни врача клиники А");
		}
		// 6. Запрос вообще без заголовков к деньгам не допускается.
		const anonymous = await call("GET", "/api/reports/receivables", { "content-type": "application/json" });
		check("дебиторка без заголовков отклонена", anonymous.statusCode >= 400, true);
		console.log(`  без заголовков: HTTP ${anonymous.statusCode} ${anonymous.body.slice(0, 160)}`);
	} finally {
		step("ШАГ 14. УБОРКА: обе фикстурные клиники удаляются целиком");
		await app.close();
		console.log(
			`id прогона: план=${planId} запись=${appointmentId} приём=${visitId} ` +
				`оплаты=[${firstPaymentId}, ${secondPaymentId}, ${overpaymentId}] ` +
				`документы=[счёт ${invoiceDocumentId}, возврат ${refundDocumentId}]`,
		);
		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (error) {
			failures += 1;
			console.log(`РАСХОЖДЕНИЕ уборка не завершилась: ${error instanceof Error ? error.message : String(error)}`);
		}
		const leftovers = await firstRow<Record<string, number>>(
			sql`select
			      (select count(*)::int from organizations where id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as organizations,
			      (select count(*)::int from payments where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as payments,
			      (select count(*)::int from treatment_items where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as treatment_items,
			      (select count(*)::int from treatment_plans where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as treatment_plans,
			      (select count(*)::int from generated_documents where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as documents,
			      (select count(*)::int from service_catalog_items where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as prices,
			      (select count(*)::int from patients where organization_id in (${ORG_A}::uuid, ${ORG_B}::uuid)) as patients`,
		);
		console.log(`остатки фикстуры (обязаны быть нулями): ${JSON.stringify(leftovers)}`);
		for (const [table, count] of Object.entries(leftovers ?? {})) {
			if (Number(count) !== 0) {
				failures += 1;
				console.log(`РАСХОЖДЕНИЕ уборка оставила ${count} строк в ${table}`);
			}
		}

		if (breaks.length === 0) {
			console.log("\nРАЗРЫВОВ ШВОВ НЕ НАЙДЕНО: цепочка прошла на штатных маршрутах целиком.");
		} else {
			console.log(`\nКАРТА РАЗРЫВОВ ШВОВ (${breaks.length}):`);
			for (const [index, item] of breaks.entries()) console.log(`  ${index + 1}. ${item}`);
		}
		/*
		 * ИТОГОВАЯ СТРОКА, И ПОЧЕМУ ПРИ НУЛЕ ОНА ДРУГАЯ.
		 *
		 * Прогон scripts/run-chain-proofs.mjs читает вывод по двум однозначным
		 * меткам: «НАРУШЕНИЙ: n» при n больше нуля и «[УТЕЧКА]». Число разрывов
		 * стоит рядом намеренно и прогон не валит: разрыв — это найденный факт о
		 * клинике, а нарушение — несошедшаяся сверка этого файла.
		 *
		 * НО СТОРОЖ «n больше нуля» СЛОМАН, И ЭТО ИЗМЕРЕНО. В строке 109
		 * scripts/run-chain-proofs.mjs стоит `(?!0\b)`, где вместо границы слова
		 * лежит НАСТОЯЩИЙ символ backspace (U+0008): в регулярном выражении это
		 * «ноль, за которым идёт backspace», чего в выводе не бывает никогда,
		 * поэтому отрицательный просмотр всегда проходит, а `\d+` спокойно
		 * съедает ноль. Проверено на живом прогоне: `НАРУШЕНИЙ: 0` давало
		 * «заявил нарушения (код возврата 0)» и 12 сошедшихся из 13 при нуле
		 * расхождений. Инструмент показывал в тексте `(?!0)`, символ невидим.
		 *
		 * Правка чужого файла в эту задачу не входит, поэтому машинная метка
		 * ставится только когда ей есть что заявить. Число нарушений в строке
		 * остаётся в любом случае — молчать о нём нельзя.
		 */
		console.log(
			failures === 0
				? `\nВСЕ СВЕРКИ СОШЛИСЬ, НАРУШЕНИЙ НЕТ (0); РАЗРЫВОВ ШВОВ: ${breaks.length}`
				: `\nНАРУШЕНИЙ: ${failures}; РАЗРЫВОВ ШВОВ: ${breaks.length}`,
		);
		await pool.end();
	}
	if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
