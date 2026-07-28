import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import {
	patientArchiveRowsBlockBooking,
	registerPatientRoutes,
	selectPatientArchiveRows,
} from "../../routes/patients.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, ORGANIZATION_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * ЧТО ПРОВЕРЯЕТСЯ.
 *
 * 1. Отбор строк архива и черного списка по пациенту. БЫЛО: маршрут
 *    GET /api/patients/:patientId/archive-status отдавал строки ВСЕЙ клиники,
 *    потому что db/patientArchiveReasonsAndBlacklistsQuery.ts:7 принимает
 *    пациента под именем `_patientId` и не использует его. Виджет карточки
 *    (components/patients/PatientArchiveAndBlacklistWidget.tsx:86) читает
 *    reasons[0].isBookingBlocked как статус ОТКРЫТОГО пациента, поэтому один
 *    человек в черном списке красил карточки всех остальных.
 *
 * 2. Аутентификация обработчиков patients.ts. Организация берётся только из
 *    подписанного токена кабинета, заголовок x-organization-id не принимается ни
 *    при какой переменной среды — в отличие от общего пути
 *    security/identity.ts:112-115, который на GET его принимает.
 *
 * ПОЧЕМУ ЗДЕСЬ НЕТ ЗАПИСИ В БАЗУ. Таблица patient_archive_reasons_and_blacklists
 * в общей базе разработки пуста, а база одна на всех агентов: засеять её строками
 * ради теста значит изменить общее состояние. Поэтому правило отбора проверяется
 * на самой функции, а маршруты — теми ответами, которым база не нужна.
 */

const ORG_TOKEN = "aa110000-0000-4000-8000-0000000000a1";
const ORG_FOREIGN = "aa110000-0000-4000-8000-0000000000a2";
const PATIENT_MINE = "aa110000-0000-4000-8000-0000000000b1";
const PATIENT_OTHER = "aa110000-0000-4000-8000-0000000000b2";
const TEST_SECRET = "x6-patients-archive-scope-secret-".padEnd(48, "z");

type Row = {
	isBookingBlocked: boolean;
	patientId: string | null;
	patientName: string | null;
	tag: string;
};

function row(tag: string, patientId: string | null, patientName: string | null, blocked = true): Row {
	return { tag, patientId, patientName, isBookingBlocked: blocked };
}

describe("archive-status отдаёт запрет записи только по открытому пациенту", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";

	before(async () => {
		// Самое разрешающее окружение из возможных: клинические гейты пропускают
		// запрос без секрета, заголовок организации разрешён. Если бы защита
		// обработчиков держалась на переменных среды, проверки на 401 ниже упали бы.
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG_TOKEN }, TEST_SECRET, 3600);

		app = Fastify({ logger: false });
		await registerPatientRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("строки чужих пациентов в ответ не попадают", () => {
		const clinicRows: Row[] = [
			row("чужой-по-id", PATIENT_OTHER, "Петров Пётр Петрович"),
			row("мой-по-id", PATIENT_MINE, "Иванов Иван Иванович"),
			row("чужой-без-id", null, "Петров Пётр Петрович"),
		];

		const selected = selectPatientArchiveRows(clinicRows, PATIENT_MINE, "Иванов Иван Иванович");

		assert.deepEqual(
			selected.map((r) => r.tag),
			["мой-по-id"],
		);
	});

	test("одна блокировка в клинике не блокирует всех остальных", () => {
		// Ровно тот сценарий, который ломал карточку: в клинике заблокирован один
		// человек, открыт совершенно другой.
		const clinicRows: Row[] = [row("единственная-блокировка", PATIENT_OTHER, "Петров Пётр Петрович")];

		const selected = selectPatientArchiveRows(clinicRows, PATIENT_MINE, "Иванов Иван Иванович");

		assert.deepEqual(selected, []);
		assert.equal(patientArchiveRowsBlockBooking(selected), false);
		// А тот, кто действительно в списке, по-прежнему заблокирован.
		assert.equal(
			patientArchiveRowsBlockBooking(
				selectPatientArchiveRows(clinicRows, PATIENT_OTHER, "Петров Пётр Петрович"),
			),
			true,
		);
	});

	test("строка без patient_id (до миграции 0136) находится по ФИО, регистр и пробелы не мешают", () => {
		const clinicRows: Row[] = [row("старая-строка", null, "  иванов   иван Иванович ")];

		assert.equal(
			patientArchiveRowsBlockBooking(selectPatientArchiveRows(clinicRows, PATIENT_MINE, "Иванов Иван Иванович")),
			true,
		);
	});

	test("тезка не забирает строку, у которой указан чужой patient_id", () => {
		// Иначе снятие запрета у однофамильца сняло бы его у настоящего нарушителя:
		// ветка удаления в setPatientArchiveStatusInDb сверяет и ФИО тоже.
		const clinicRows: Row[] = [row("чужая-строка-тот-же-ФИО", PATIENT_OTHER, "Иванов Иван Иванович")];

		assert.deepEqual(selectPatientArchiveRows(clinicRows, PATIENT_MINE, "Иванов Иван Иванович"), []);
	});

	test("снятый флаг is_booking_blocked запретом не считается", () => {
		// Карточка и расписание должны читать один и тот же признак: запрет решает
		// флаг, а не факт наличия строки архива.
		const clinicRows: Row[] = [row("архив-без-запрета", PATIENT_MINE, "Иванов Иван Иванович", false)];

		const selected = selectPatientArchiveRows(clinicRows, PATIENT_MINE, "Иванов Иван Иванович");

		assert.equal(selected.length, 1);
		assert.equal(patientArchiveRowsBlockBooking(selected), false);
	});

	test("пациент без ФИО не подбирает строки с пустым ФИО", () => {
		const clinicRows: Row[] = [row("строка-без-ФИО", null, null), row("строка-с-пустым-ФИО", null, "   ")];

		assert.deepEqual(selectPatientArchiveRows(clinicRows, PATIENT_MINE, null), []);
		assert.deepEqual(selectPatientArchiveRows(clinicRows, PATIENT_MINE, "   "), []);
	});

	test("без удостоверения все семь обработчиков отвечают 401 AuthRequired", async () => {
		const routes: Array<{ method: "GET" | "POST" | "PUT"; url: string }> = [
			{ method: "GET", url: "/api/patients" },
			{ method: "POST", url: "/api/patients" },
			{ method: "PUT", url: `/api/patients/${PATIENT_MINE}` },
			{ method: "PUT", url: `/api/patients/${PATIENT_MINE}/administrative-profile` },
			{ method: "GET", url: `/api/patients/${PATIENT_MINE}/communication-timelines` },
			{ method: "GET", url: `/api/patients/${PATIENT_MINE}/archive-status` },
			{ method: "POST", url: `/api/patients/${PATIENT_MINE}/archive-status` },
		];

		const observed: string[] = [];
		for (const route of routes) {
			const response = await app.inject({ method: route.method, url: route.url, payload: {} });
			observed.push(`${route.method} ${route.url} -> ${response.statusCode} ${response.json().error}`);
			assert.equal(response.statusCode, 401, `${route.method} ${route.url}: ${response.body}`);
			assert.equal(response.json().error, "AuthRequired");
		}
		assert.equal(observed.length, 7);
	});

	test("заголовок организации не заменяет токен даже при DENTE_DEV_ALLOW_HEADER_ORG=1", async () => {
		// Именно здесь ручная проверка строже общего пути: requireOrganizationId на
		// GET приняла бы эту организацию (security/identity.ts:112-115), потому что
		// unverifiedOrganizationUsable отбрасывает только изменяющие запросы.
		for (const url of [
			"/api/patients",
			`/api/patients/${PATIENT_MINE}/communication-timelines`,
			`/api/patients/${PATIENT_MINE}/archive-status`,
		]) {
			const response = await app.inject({
				method: "GET",
				url,
				headers: { [ORGANIZATION_HEADER]: ORG_FOREIGN },
			});
			assert.equal(response.statusCode, 401, `${url}: ${response.body}`);
			assert.equal(response.json().error, "AuthRequired");
		}
	});

	test("подделанная подпись токена отклонена как AuthExpired", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/patients",
			headers: { [CLINIC_TOKEN_HEADER]: `${clinicToken}X` },
		});

		assert.equal(response.statusCode, 401);
		assert.equal(response.json().error, "AuthExpired");
	});

	test("токен, подписанный другим секретом, отклонён", async () => {
		const foreignToken = signToken({ organizationId: ORG_FOREIGN }, `${TEST_SECRET}-other`, 3600);

		const response = await app.inject({
			method: "GET",
			url: "/api/patients",
			headers: { [CLINIC_TOKEN_HEADER]: foreignToken },
		});

		assert.equal(response.statusCode, 401);
		assert.equal(response.json().error, "AuthExpired");
	});

	test("истёкший токен кабинета отклонён", async () => {
		const expired = signToken({ organizationId: ORG_TOKEN }, TEST_SECRET, -60);

		const response = await app.inject({
			method: "GET",
			url: "/api/patients",
			headers: { [CLINIC_TOKEN_HEADER]: expired },
		});

		assert.equal(response.statusCode, 401);
		assert.equal(response.json().error, "AuthExpired");
	});

	test("токен без organizationId отклонён", async () => {
		const noOrg = signToken({ userId: "aa110000-0000-4000-8000-0000000000c1" }, TEST_SECRET, 3600);

		const response = await app.inject({
			method: "GET",
			url: "/api/patients",
			headers: { [CLINIC_TOKEN_HEADER]: noOrg },
		});

		assert.equal(response.statusCode, 401);
		assert.equal(response.json().error, "AuthExpired");
	});

	test("POST archive-status без поля отвечает по-русски, а не именем поля запроса", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_MINE}/archive-status`,
			headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
			payload: {},
		});

		assert.equal(response.statusCode, 400, response.body);
		const body = response.json() as { error?: string; message?: string };
		assert.equal(body.error, "ValidationError");
		assert.equal(
			body.message,
			"Не указано действие: запретить пациенту запись на приём или снять запрет.",
		);
		assert.ok(!/isBlacklisted/.test(response.body), `имя поля утекло в ответ: ${response.body}`);
	});

	test("POST archive-status с нестроковым значением тоже отклонён до записи", async () => {
		for (const payload of [{ isBlacklisted: "true" }, { isBlacklisted: 1 }, { isBlacklisted: null }]) {
			const response = await app.inject({
				method: "POST",
				url: `/api/patients/${PATIENT_MINE}/archive-status`,
				headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
				payload,
			});
			assert.equal(response.statusCode, 400, `${JSON.stringify(payload)}: ${response.body}`);
			assert.equal(response.json().error, "ValidationError");
		}
	});
});
