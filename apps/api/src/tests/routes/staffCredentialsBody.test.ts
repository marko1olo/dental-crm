/**
 * СТОРОЖ ТЕЛА POST /api/settings/staff/:staffId/credentials.
 *
 * Раньше: bare cast
 *   (request.body as { email?: string; password?: string; pinCode?: string }) ?? {}
 * Null body не ронял (?? {}), но number/object в email/password/pinCode →
 * TypeError на .toLowerCase() / hashCredential ДО try/catch → 500.
 *
 * Zod parseSettingsPayload после auth-first:
 *   null/non-object/typed non-string → 400 SettingsValidationError
 *   {} / пустые поля → 400 «Не переданы данные для обновления.»
 *
 * Auth-first: requireSettingsAccess до parse. Секрет задан на прогон;
 * DENTAL_STATE_PERSISTENCE=off — org без PostgreSQL (как body-only proofs).
 * Не ходим в updateStaffCredentialsInDb: только ветки 400/403/503 до hash.
 *
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/staffCredentialsBody.test.ts
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { getRequestIdentity } from "../../security/identity.js";

const STAFF_ID = "00000000-0000-4000-8000-000000000099";
const SETTINGS_ADMIN_SECRET = "staff-credentials-body-proof-secret";
const CREDENTIALS_URL = `/api/settings/staff/${STAFF_ID}/credentials`;

const EMPTY_UPDATE_MESSAGE = "Не переданы данные для обновления.";

describe("Staff credentials — body guard (null/typed → 400, не 500)", () => {
	let app: FastifyInstance;
	const savedEnv: Record<string, string | undefined> = {};

	before(async () => {
		for (const key of [
			"NODE_ENV",
			"DENTE_SETTINGS_ADMIN_SECRET",
			"DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
			"DENTAL_STATE_PERSISTENCE",
		]) {
			savedEnv[key] = process.env[key];
		}

		process.env.NODE_ENV = "test";
		process.env.DENTE_SETTINGS_ADMIN_SECRET = SETTINGS_ADMIN_SECRET;
		delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;
		// Org без PostgreSQL: requireSettingsAccess после секрета берёт dev-org.
		process.env.DENTAL_STATE_PERSISTENCE = "off";

		app = Fastify({ logger: false });
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await registerSettingsRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		for (const [key, value] of Object.entries(savedEnv)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});

	async function postCredentials(
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			withAdminSecret?: boolean;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (opts.withAdminSecret !== false) {
			headers["x-dente-admin-secret"] = SETTINGS_ADMIN_SECRET;
		}
		const injectOpts: {
			method: "POST";
			url: string;
			headers: Record<string, string>;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			payload?: any;
		} = {
			method: "POST",
			url: CREDENTIALS_URL,
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

	test("без admin secret → 403 SettingsAdminSecretRequired (auth-first)", async () => {
		const refused = await postCredentials({
			body: { email: "a@b.c" },
			withAdminSecret: false,
		});
		assert.equal(
			refused.statusCode,
			403,
			`без секрета HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.equal(refused.json.error, "SettingsAdminSecretRequired");
		assert.notEqual(refused.statusCode, 500);
	});

	test("JSON null body → 400 SettingsValidationError, не 500", async () => {
		const refused = await postCredentials({ rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "SettingsValidationError");
		assert.ok(
			typeof refused.json.message === "string" &&
				/[А-Яа-яЁё]/.test(refused.json.message),
			`message должен быть русским: ${refused.json.message}`,
		);
	});

	test("пустое {} → 400 «Не переданы данные для обновления.», не 500", async () => {
		const refused = await postCredentials({ body: {} });
		assert.equal(
			refused.statusCode,
			400,
			`пустой body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "SettingsValidationError");
		assert.equal(refused.json.message, EMPTY_UPDATE_MESSAGE);
	});

	test("email number → 400, не 500 TypeError toLowerCase", async () => {
		const refused = await postCredentials({ body: { email: 12345 } });
		assert.equal(
			refused.statusCode,
			400,
			`email number дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "SettingsValidationError");
		assert.notEqual(refused.json.error, "InternalError");
	});

	test("password object → 400, не 500 hashCredential TypeError", async () => {
		const refused = await postCredentials({
			body: { password: { nested: true } },
		});
		assert.equal(
			refused.statusCode,
			400,
			`password object дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "SettingsValidationError");
	});

	test("pinCode array → 400, не 500", async () => {
		const refused = await postCredentials({ body: { pinCode: ["1", "2"] } });
		assert.equal(
			refused.statusCode,
			400,
			`pinCode array дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "SettingsValidationError");
	});
});
