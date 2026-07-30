/**
 * СТОРОЖ ТЕЛА СКЛАДА + ВЕБХУКОВ АТС.
 *
 * Раньше маршруты читали тело через bare destructure:
 *   const { adjustment } = request.body
 *   const { event, from } = request.body
 *   const { from, message } = request.body
 * При null/undefined body (POST/PATCH без JSON) TypeError → 500.
 * Zod safeParse после auth/webhook-secret → 400 с прежними текстами.
 *
 * Проверки: inventory stock auth-first 401; null/{} body → 400≠500;
 * telephony call/sms null body → 400≠500 (NODE_ENV=test, secret not required).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { db } from "../../db/client.js";
import { organizations, users } from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { telephonyRoutes } from "../../routes/telephony.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "inventoryTelephonyBody";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const ITEM_ID = fixtureUuid(NAMESPACE, 3);

describe("склад + АТС — Zod body (null → 400, не 500)", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	async function patchStock(
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			withAuth?: boolean;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (opts.withAuth !== false) {
			headers["x-dente-staff-token"] = staffToken;
		}
		const injectOpts: {
			method: "PATCH";
			url: string;
			headers: Record<string, string>;
			payload?: unknown;
		} = {
			method: "PATCH",
			url: `/api/inventory/${ORGANIZATION_ID}/${ITEM_ID}/stock`,
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

	async function postTelephony(
		path: "webhook" | "sms/webhook",
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		const injectOpts: {
			method: "POST";
			url: string;
			headers: Record<string, string>;
			payload?: unknown;
		} = {
			method: "POST",
			url: `/api/telephony/${ORGANIZATION_ID}/${path}`,
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

	before(async () => {
		process.env.NODE_ENV = "test";
		// Без секрета verifyWebhookSecret в non-production пропускает (warn).
		delete process.env.TELEPHONY_WEBHOOK_SECRET;
		delete process.env.DENTE_WEBHOOK_SECRET;

		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
		}

		if (databaseReady) {
			await db.insert(organizations).values({
				id: ORGANIZATION_ID,
				name: "Клиника сторожа тела склада/АТС",
			});
			await db.insert(users).values({
				id: STAFF_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Кладовщик сторожа тела",
				role: "admin",
			});
		}

		staffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		app = Fastify();
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.register(telephonyRoutes, { prefix: "/api/telephony" });
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	test("склад stock без токена → 401 (auth-first)", async () => {
		const refused = await patchStock({ body: { adjustment: 1 }, withAuth: false });
		assert.ok(
			refused.statusCode === 401 || refused.statusCode === 403,
			`ожидали 401/403 без токена, получили ${refused.statusCode}: ${refused.body}`,
		);
	});

	test("склад stock пустое {} → 400 AdjustmentInvalid, не 500", async () => {
		const refused = await patchStock({ body: {} });
		assert.equal(
			refused.statusCode,
			400,
			`пустой body stock дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "AdjustmentInvalid");
	});

	test("склад stock JSON null → 400, не 500", async () => {
		const refused = await patchStock({ rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body stock дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "AdjustmentInvalid");
	});

	test("АТС webhook null body → 400, не 500", async () => {
		const refused = await postTelephony("webhook", { rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body telephony webhook дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "Missing 'from' phone number");
	});

	test("АТС SMS webhook {} → 400, не 500", async () => {
		const refused = await postTelephony("sms/webhook", { body: {} });
		assert.equal(
			refused.statusCode,
			400,
			`empty body sms webhook дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "Missing 'from' or 'message'");
	});
});
