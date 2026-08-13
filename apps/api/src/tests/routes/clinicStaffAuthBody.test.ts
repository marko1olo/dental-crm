/**
 * СТОРОЖ ТЕЛА clinic/login + staff/unlock.
 *
 * Раньше bare cast:
 *   (request.body as ClinicLoginBody) ?? {}
 *   → email.toLowerCase() TypeError 500 на number/object email
 *   (request.body as StaffUnlockBody) ?? {}
 *   → pin object / null body → 500 или мусор до ClinicAuthRequired
 *
 * Zod parseAuthPayload:
 *   null/{}/typed bad → 400 ValidationError + дословные RU-сообщения
 *   pin number OK (union string|number → String)
 *   unlock: валидное тело без clinic token → 401 ClinicAuthRequired (body прошёл)
 *
 * Только registerAuthRoutes. Без моков. 400-ветки до DB.
 *
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/clinicStaffAuthBody.test.ts
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerAuthRoutes } from "../../routes/auth.js";
import { getRequestIdentity } from "../../security/identity.js";

const CLINIC_LOGIN_URL = "/api/auth/clinic/login";
const STAFF_UNLOCK_URL = "/api/auth/staff/unlock";

const CLINIC_LOGIN_MSG = "Введите логин и пароль клиники.";
const STAFF_UNLOCK_MSG = "Необходимо указать сотрудника и ввести PIN-код.";
const CLINIC_AUTH_REQUIRED_MSG = "Сначала выполните вход в кабинет клиники.";

const STAFF_ID = "00000000-0000-4000-8000-000000000088";

describe("Clinic/staff auth — body guard (null/typed → 400, не 500)", () => {
	let app: FastifyInstance;
	const savedEnv: Record<string, string | undefined> = {};

	before(async () => {
		for (const key of [
			"NODE_ENV",
			"DENTAL_STATE_PERSISTENCE",
			"DENTE_ALLOW_DEMO_LOGIN",
		]) {
			savedEnv[key] = process.env[key];
		}
		process.env.NODE_ENV = "test";
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		// Демо-вход не нужен: 400-ветки до credentials.
		process.env.DENTE_ALLOW_DEMO_LOGIN = "0";

		app = Fastify({ logger: false });
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await registerAuthRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		for (const [key, value] of Object.entries(savedEnv)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});

	async function post(
		url: string,
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			headers?: Record<string, string>;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
			...(opts.headers ?? {}),
		};
		const injectOpts: {
			method: "POST";
			url: string;
			headers: Record<string, string>;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			payload?: any;
		} = {
			method: "POST",
			url,
			headers,
		};
		if (opts.rawPayload !== undefined) {
			if (opts.rawPayload !== null) injectOpts.payload = opts.rawPayload;
		} else if (opts.body !== undefined) {
			injectOpts.payload = opts.body;
		}
		const response = await app.inject(injectOpts);
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			json = {};
		}
		return {
			statusCode: response.statusCode,
			json,
			body: String(response.body || ""),
		};
	}

	// ── clinic/login ──────────────────────────────────────────────────────────

	test("clinic/login: JSON null body → 400 ValidationError + exact RU, не 500", async () => {
		const refused = await post(CLINIC_LOGIN_URL, { rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, CLINIC_LOGIN_MSG);
	});

	test("clinic/login: пустое {} → 400 exact RU, не 500", async () => {
		const refused = await post(CLINIC_LOGIN_URL, { body: {} });
		assert.equal(
			refused.statusCode,
			400,
			`пустой body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, CLINIC_LOGIN_MSG);
	});

	test("clinic/login: email number → 400, не 500 TypeError toLowerCase", async () => {
		const refused = await post(CLINIC_LOGIN_URL, {
			body: { email: 12345, password: "x" },
		});
		assert.equal(
			refused.statusCode,
			400,
			`email number дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, CLINIC_LOGIN_MSG);
		assert.notEqual(refused.json.error, "InternalError");
	});

	test("clinic/login: password object → 400, не 500", async () => {
		const refused = await post(CLINIC_LOGIN_URL, {
			body: { email: "a@b.c", password: { nested: true } },
		});
		assert.equal(
			refused.statusCode,
			400,
			`password object дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, CLINIC_LOGIN_MSG);
	});

	// ── staff/unlock ──────────────────────────────────────────────────────────

	test("staff/unlock: JSON null body → 400 ValidationError + exact RU, не 500", async () => {
		const refused = await post(STAFF_UNLOCK_URL, { rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, STAFF_UNLOCK_MSG);
	});

	test("staff/unlock: пустое {} → 400 exact RU, не 500", async () => {
		const refused = await post(STAFF_UNLOCK_URL, { body: {} });
		assert.equal(
			refused.statusCode,
			400,
			`пустой body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, STAFF_UNLOCK_MSG);
	});

	test("staff/unlock: pinCode object → 400, не 500", async () => {
		const refused = await post(STAFF_UNLOCK_URL, {
			body: { userId: STAFF_ID, pinCode: { nested: true } },
		});
		assert.equal(
			refused.statusCode,
			400,
			`pin object дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, STAFF_UNLOCK_MSG);
	});

	test("staff/unlock: userId number → 400, не 500", async () => {
		const refused = await post(STAFF_UNLOCK_URL, {
			body: { userId: 99, pinCode: "1234" },
		});
		assert.equal(
			refused.statusCode,
			400,
			`userId number дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, STAFF_UNLOCK_MSG);
	});

	test("staff/unlock: валидное тело без clinic token → 401 ClinicAuthRequired (body OK)", async () => {
		const refused = await post(STAFF_UNLOCK_URL, {
			body: { userId: STAFF_ID, pinCode: "1234" },
		});
		assert.equal(
			refused.statusCode,
			401,
			`valid body no token дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.notEqual(refused.statusCode, 400);
		assert.equal(refused.json.error, "ClinicAuthRequired");
		assert.equal(refused.json.message, CLINIC_AUTH_REQUIRED_MSG);
	});

	test("staff/unlock: pinCode number проходит схему → 401 ClinicAuthRequired, не 400", async () => {
		// number pin OK via union; без токена — auth gate, не validation.
		const refused = await post(STAFF_UNLOCK_URL, {
			body: { userId: STAFF_ID, pinCode: 1234 },
		});
		assert.equal(
			refused.statusCode,
			401,
			`pin number дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 400);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ClinicAuthRequired");
	});
});
