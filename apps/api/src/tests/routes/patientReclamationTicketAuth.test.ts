import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerPatientRoutes } from "../../routes/patients.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	ORGANIZATION_HEADER,
} from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * ЧТО ЗАКРЕПЛЕНО ЗДЕСЬ.
 *
 * Восемь маршрутов рекламаций и задач стояли на второй, более слабой проверке
 * доступа этого файла (readClinicOrgId): она возвращала null и когда токена
 * кабинета нет, и когда он негодный, поэтому оба состояния отвечали одной фразой
 * «Требуется авторизация рабочего кабинета клиники.». Клиент, не получив
 * различия причин, строит совет по коду 401
 * (apps/web/src/lib/panelStateText.ts) и отправляет человека к администратору,
 * хотя при оборвавшейся смене достаточно войти в кабинет заново.
 *
 * Проверка идёт по ТЕЛУ обработчика, а не по строке регистрации: маршрут
 * вызывается через app.inject, и утверждается ответ. Поэтому диагноз нельзя
 * поставить по имени функции в исходнике — только по тому, что маршрут ответил.
 *
 * ПОЧЕМУ ЗДЕСЬ НЕТ ЗАПИСИ В БАЗУ. База разработки одна на всех агентов, засев
 * ради теста изменил бы общее состояние. Все утверждения ниже держатся на
 * ответах, до которых база не нужна: без годного токена обработчик выходит до
 * первого запроса к базе.
 *
 * ЗАЧЕМ ПРОВЕРЯЕТСЯ ЗАГОЛОВОК ОРГАНИЗАЦИИ. Ровно здесь рукописная проверка
 * строже общего пути: requireOrganizationId на чтении принял бы организацию из
 * заголовка x-organization-id при DENTE_DEV_ALLOW_HEADER_ORG=1
 * (security/identity.ts, unverifiedOrganizationUsable отбрасывает только
 * изменяющие запросы). Здешняя проверка не принимает его ни при какой переменной
 * среды, и это свойство обязано пережить любое будущее сведение на общий гейт.
 */

const ORG_TOKEN = "cc330000-0000-4000-8000-0000000000c1";
const ORG_FOREIGN = "cc330000-0000-4000-8000-0000000000c2";
const PATIENT_ID = "cc330000-0000-4000-8000-0000000000d1";
const RECORD_ID = "cc330000-0000-4000-8000-0000000000d2";
const TEST_SECRET = "jj3-reclamation-ticket-auth-secret-".padEnd(48, "z");

type Probe = { method: "GET" | "POST" | "PUT" | "DELETE"; url: string };

const reclamationAndTicketRoutes: readonly Probe[] = [
	{ method: "GET", url: `/api/patients/${PATIENT_ID}/reclamations` },
	{ method: "POST", url: `/api/patients/${PATIENT_ID}/reclamations` },
	{
		method: "PUT",
		url: `/api/patients/${PATIENT_ID}/reclamations/${RECORD_ID}`,
	},
	{
		method: "DELETE",
		url: `/api/patients/${PATIENT_ID}/reclamations/${RECORD_ID}`,
	},
	{ method: "GET", url: `/api/patients/${PATIENT_ID}/tickets` },
	{ method: "POST", url: `/api/patients/${PATIENT_ID}/tickets` },
	{ method: "PUT", url: `/api/patients/${PATIENT_ID}/tickets/${RECORD_ID}` },
	{ method: "DELETE", url: `/api/patients/${PATIENT_ID}/tickets/${RECORD_ID}` },
];

describe("рекламации и задачи различают «входа нет» и «вход не принят»", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";

	before(async () => {
		// Самое разрешающее окружение из возможных: клинические гейты пропускают
		// запрос без секрета, заголовок организации разрешён. Если бы защита этих
		// обработчиков держалась на переменных среды, утверждения ниже упали бы.
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

	test("без удостоверения все восемь маршрутов отвечают 401 AuthRequired с текстом", async () => {
		const observed: string[] = [];
		for (const route of reclamationAndTicketRoutes) {
			const response = await app.inject({
				method: route.method,
				url: route.url,
				payload: {},
			});
			const body = response.json() as { error?: string; message?: string };
			observed.push(
				`${route.method} ${route.url} -> ${response.statusCode} ${body.error}`,
			);
			assert.equal(
				response.statusCode,
				401,
				`${route.method} ${route.url}: ${response.body}`,
			);
			assert.equal(body.error, "AuthRequired");
			// Тело без message оставляет клиенту только совет по коду ответа: именно
			// из-за него врача отправляли к администратору.
			assert.match(String(body.message), /Войдите в кабинет клиники/);
		}
		assert.equal(observed.length, 8);
	});

	test("негодный токен отвечает AuthExpired и советует войти заново, а не идти к администратору", async () => {
		for (const route of reclamationAndTicketRoutes) {
			const response = await app.inject({
				method: route.method,
				url: route.url,
				payload: {},
				headers: { [CLINIC_TOKEN_HEADER]: `${clinicToken}X` },
			});
			const body = response.json() as { error?: string; message?: string };
			assert.equal(
				response.statusCode,
				401,
				`${route.method} ${route.url}: ${response.body}`,
			);
			assert.equal(
				body.error,
				"AuthExpired",
				`${route.method} ${route.url}: ${response.body}`,
			);
			assert.match(String(body.message), /Войдите в кабинет клиники заново/);
		}
	});

	test("истёкший токен кабинета не принимается", async () => {
		const expired = signToken({ organizationId: ORG_TOKEN }, TEST_SECRET, -60);
		const response = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/tickets`,
			headers: { [CLINIC_TOKEN_HEADER]: expired },
		});

		assert.equal(response.statusCode, 401);
		assert.equal((response.json() as { error?: string }).error, "AuthExpired");
	});

	test("заголовок организации не заменяет токен даже при DENTE_DEV_ALLOW_HEADER_ORG=1", async () => {
		for (const route of reclamationAndTicketRoutes) {
			const response = await app.inject({
				method: route.method,
				url: route.url,
				payload: {},
				headers: { [ORGANIZATION_HEADER]: ORG_FOREIGN },
			});

			assert.equal(
				response.statusCode,
				401,
				`${route.method} ${route.url}: ${response.body}`,
			);
			assert.equal(
				(response.json() as { error?: string }).error,
				"AuthRequired",
			);
		}
	});
});
