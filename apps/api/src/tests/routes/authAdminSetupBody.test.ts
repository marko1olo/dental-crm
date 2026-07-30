/**
 * СТОРОЖ ТЕЛА set-password / set-pin / setup/init.
 *
 * Раньше bare cast:
 *   (request.body as { organizationId?; newPassword?; adminKey? }) ?? {}
 *   (request.body as { userId?; newPin?; adminKey? }) ?? {}
 *   (request.body as SetupInitBody) ?? {}
 *   → email.toLowerCase() / String(pin) TypeError 500 на number/object
 *
 * Zod + AUTH-first:
 *   set-password/set-pin: anon null/typed → 403 Forbidden exact RU (не 400 oracle)
 *   set-password/set-pin + ADMIN_SETUP_KEY: bad body → 400 exact RU, не 500
 *   setup/init public: null/{}/typed bad → 400 exact RU, не 500
 *
 * Только registerAuthRoutes. Без моков. 400/403 до DB write.
 *
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/authAdminSetupBody.test.ts
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerAuthRoutes } from "../../routes/auth.js";
import { getRequestIdentity } from "../../security/identity.js";

const SET_PASSWORD_URL = "/api/auth/clinic/set-password";
const SET_PIN_URL = "/api/auth/staff/set-pin";
const SETUP_INIT_URL = "/api/auth/setup/init";

const SET_PASSWORD_FORBIDDEN = "Недостаточно прав для смены пароля клиники.";
const SET_PIN_FORBIDDEN = "Недостаточно прав для смены PIN сотрудника.";
const NEW_PASSWORD_MSG = "Новый пароль должен быть не короче 8 символов.";
const ORG_REQUIRED_MSG = "Не указана организация.";
const USER_REQUIRED_MSG = "Не указан сотрудник.";
const PIN_MSG = "PIN должен состоять из 4–12 цифр.";
const SETUP_REQUIRED_MSG = "Укажите название клиники, логин и пароль.";
const SETUP_PASSWORD_MSG = "Пароль должен быть не короче 8 символов.";

const SETUP_KEY = "test-admin-setup-key-auth-body-guard-2026";
const ORG_ID = "00000000-0000-4000-8000-000000000011";
const STAFF_ID = "00000000-0000-4000-8000-000000000088";

describe("Admin/setup auth — body guard (AUTH-first 403, Zod 400, не 500)", () => {
	let app: FastifyInstance;
	const savedEnv: Record<string, string | undefined> = {};

	before(async () => {
		for (const key of [
			"NODE_ENV",
			"DENTAL_STATE_PERSISTENCE",
			"DENTE_ALLOW_DEMO_LOGIN",
			"ADMIN_SETUP_KEY",
		]) {
			savedEnv[key] = process.env[key];
		}
		process.env.NODE_ENV = "test";
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		process.env.DENTE_ALLOW_DEMO_LOGIN = "0";
		process.env.ADMIN_SETUP_KEY = SETUP_KEY;

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
			payload?: unknown;
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
		return { statusCode: response.statusCode, json, body: response.body };
	}

	// ── set-password: anon always 403 (no policy oracle) ──────────────────────

	test("set-password anon: JSON null → 403 Forbidden exact RU, не 400/500", async () => {
		const refused = await post(SET_PASSWORD_URL, { rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			403,
			`null body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 400);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "Forbidden");
		assert.equal(refused.json.message, SET_PASSWORD_FORBIDDEN);
	});

	test("set-password anon: {} → 403 exact RU (не 400 oracle)", async () => {
		const refused = await post(SET_PASSWORD_URL, { body: {} });
		assert.equal(refused.statusCode, 403, `{} дал HTTP ${refused.statusCode}: ${refused.body}`);
		assert.notEqual(refused.statusCode, 400);
		assert.equal(refused.json.error, "Forbidden");
		assert.equal(refused.json.message, SET_PASSWORD_FORBIDDEN);
	});

	test("set-password anon: short newPassword → 403 same RU (не 400 policy leak)", async () => {
		const refused = await post(SET_PASSWORD_URL, {
			body: { newPassword: "1", organizationId: ORG_ID },
		});
		assert.equal(
			refused.statusCode,
			403,
			`short pw anon дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 400);
		assert.equal(refused.json.message, SET_PASSWORD_FORBIDDEN);
	});

	// ── set-password: setup key auth → body Zod 400 ───────────────────────────

	test("set-password + setup key: short newPassword → 400 exact RU, не 500", async () => {
		const refused = await post(SET_PASSWORD_URL, {
			body: {
				adminKey: SETUP_KEY,
				organizationId: ORG_ID,
				newPassword: "short",
			},
		});
		assert.equal(
			refused.statusCode,
			400,
			`short pw auth дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, NEW_PASSWORD_MSG);
	});

	test("set-password + setup key: missing newPassword → 400, не 500", async () => {
		const refused = await post(SET_PASSWORD_URL, {
			body: { adminKey: SETUP_KEY, organizationId: ORG_ID },
		});
		assert.equal(
			refused.statusCode,
			400,
			`missing pw дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, NEW_PASSWORD_MSG);
	});

	test("set-password + setup key: newPassword object → 400, не 500", async () => {
		const refused = await post(SET_PASSWORD_URL, {
			body: {
				adminKey: SETUP_KEY,
				organizationId: ORG_ID,
				newPassword: { nested: true },
			},
		});
		assert.equal(
			refused.statusCode,
			400,
			`pw object дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
	});

	test("set-password + setup key: valid pw missing org → 400 org required", async () => {
		const refused = await post(SET_PASSWORD_URL, {
			body: { adminKey: SETUP_KEY, newPassword: "longenough" },
		});
		assert.equal(
			refused.statusCode,
			400,
			`missing org дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, ORG_REQUIRED_MSG);
	});

	// ── set-pin: anon always 403 ──────────────────────────────────────────────

	test("set-pin anon: null → 403 Forbidden exact RU, не 400/500", async () => {
		const refused = await post(SET_PIN_URL, { rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			403,
			`null body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 400);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "Forbidden");
		assert.equal(refused.json.message, SET_PIN_FORBIDDEN);
	});

	test("set-pin anon: bad pin object → 403 same RU (не 400 oracle)", async () => {
		const refused = await post(SET_PIN_URL, {
			body: { userId: STAFF_ID, newPin: { nested: true } },
		});
		assert.equal(
			refused.statusCode,
			403,
			`pin object anon дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 400);
		assert.equal(refused.json.message, SET_PIN_FORBIDDEN);
	});

	// ── set-pin: setup key auth → body Zod 400 ────────────────────────────────

	test("set-pin + setup key: missing userId → 400 exact RU, не 500", async () => {
		const refused = await post(SET_PIN_URL, {
			body: { adminKey: SETUP_KEY, newPin: "1234" },
		});
		assert.equal(
			refused.statusCode,
			400,
			`missing userId дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, USER_REQUIRED_MSG);
	});

	test("set-pin + setup key: newPin object → 400 PIN msg, не 500", async () => {
		const refused = await post(SET_PIN_URL, {
			body: { adminKey: SETUP_KEY, userId: STAFF_ID, newPin: { nested: true } },
		});
		assert.equal(
			refused.statusCode,
			400,
			`pin object auth дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, PIN_MSG);
	});

	test("set-pin + setup key: newPin short digits → 400 PIN msg", async () => {
		const refused = await post(SET_PIN_URL, {
			body: { adminKey: SETUP_KEY, userId: STAFF_ID, newPin: "12" },
		});
		assert.equal(
			refused.statusCode,
			400,
			`short pin дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, PIN_MSG);
	});

	// ── setup/init: public route → 400 on bad body ────────────────────────────

	test("setup/init: JSON null → 400 ValidationError exact RU, не 500", async () => {
		const refused = await post(SETUP_INIT_URL, { rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, SETUP_REQUIRED_MSG);
	});

	test("setup/init: {} → 400 exact RU, не 500", async () => {
		const refused = await post(SETUP_INIT_URL, { body: {} });
		assert.equal(
			refused.statusCode,
			400,
			`{} дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, SETUP_REQUIRED_MSG);
	});

	test("setup/init: email number → 400, не 500 TypeError toLowerCase", async () => {
		const refused = await post(SETUP_INIT_URL, {
			body: {
				clinicName: "Test",
				email: 12345,
				password: "longenough",
			},
		});
		assert.equal(
			refused.statusCode,
			400,
			`email number дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, SETUP_REQUIRED_MSG);
	});

	test("setup/init: short password → 400 exact password RU", async () => {
		const refused = await post(SETUP_INIT_URL, {
			body: {
				clinicName: "Test",
				email: "owner@clinic.test",
				password: "short",
			},
		});
		assert.equal(
			refused.statusCode,
			400,
			`short pw дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, SETUP_PASSWORD_MSG);
	});

	test("setup/init: ownerPin object → 400 PIN msg, не 500", async () => {
		const refused = await post(SETUP_INIT_URL, {
			body: {
				clinicName: "Test",
				email: "owner@clinic.test",
				password: "longenough",
				ownerPin: { nested: true },
			},
		});
		assert.equal(
			refused.statusCode,
			400,
			`ownerPin object дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "ValidationError");
		assert.equal(refused.json.message, PIN_MSG);
	});
});
