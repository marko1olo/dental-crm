/**
 * Contract: operator-facing errors and 500 replies on files/waitlist/inventory
 * must carry Cyrillic `message` (message-first UX) and PascalCase machine code,
 * with no English "Failed to …" in reply payloads.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { db as apiDb } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import { registerFilesRoutes } from "../../routes/files.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { handleCreateInventoryItem } from "../../routes/inventory/itemCatalog/itemCatalogMutations.js";
import { registerWaitlistRoutes } from "../../routes/waitlist.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const CYRILLIC = /[А-Яа-яЁё]/;
const EN_FAILED = /\bFailed to\b/i;

function makeEmptyReturningTx(): TenantDb {
	return new Proxy(apiDb, {
		get(target, prop, receiver) {
			if (prop === "insert") {
				return () => ({
					values: () => ({
						returning: async () => [],
					}),
				});
			}
			return Reflect.get(target, prop, receiver);
		},
	});
}

function parseJsonObject(raw: string): { error?: unknown; message?: unknown } {
	const parsed: unknown = JSON.parse(raw);
	if (typeof parsed === "object" && parsed !== null) {
		return parsed;
	}
	return {};
}

describe("RU error/500 messages (waitlist/files/inventory — live routes)", () => {
	const originalEnv = { ...process.env };
	const ORG_ID = "ee550000-0000-4000-8000-0000000000e3";
	const USER_ID = "ee550000-0000-4000-8000-0000000000u3";
	const TEST_SECRET = "k".repeat(48);
	let app: FastifyInstance;
	let clinicToken = "";
	let staffToken = "";

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG_ID }, TEST_SECRET, 3600);
		staffToken = signToken(
			{ organizationId: ORG_ID, userId: USER_ID, role: "admin" },
			TEST_SECRET,
			3600,
		);

		app = Fastify({ logger: false });
		await registerWaitlistRoutes(app);
		await registerFilesRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		app.post("/_test/inventory-create", (req, reply) =>
			handleCreateInventoryItem(
				ORG_ID,
				req.body,
				req,
				reply,
				makeEmptyReturningTx(),
			),
		);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("POST /api/waitlist without auth → 401 (not 400 body oracle)", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/waitlist",
			headers: { "content-type": "application/json" },
			payload: { patientId: ORG_ID, priorityLevel: 1 },
		});
		assert.equal(response.statusCode, 401, response.body);
		assert.notEqual(response.statusCode, 500);
		assert.equal(EN_FAILED.test(response.body), false);
	});

	test("POST /api/waitlist bad body with auth → 400 RU ValidationError ≠ 500", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/waitlist",
			headers: {
				"content-type": "application/json",
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: [],
		});
		assert.equal(response.statusCode, 400, response.body);
		const body = parseJsonObject(response.body);
		assert.equal(body.error, "ValidationError");
		assert.equal(typeof body.message, "string");
		assert.match(String(body.message), CYRILLIC);
		assert.equal(EN_FAILED.test(response.body), false);
	});

	test("GET & POST /api/patients/:id/attachments → AUTH-first 401 and 400 RU ValidationError on invalid UUID", async () => {
		const unauthPost = await app.inject({
			method: "POST",
			url: `/api/patients/${ORG_ID}/attachments`,
		});
		assert.equal(unauthPost.statusCode, 401, unauthPost.body);
		assert.equal(EN_FAILED.test(unauthPost.body), false);

		const badUuid = await app.inject({
			method: "GET",
			url: "/api/patients/not-a-uuid/attachments",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
		});
		assert.equal(badUuid.statusCode, 400, badUuid.body);
		const body = parseJsonObject(badUuid.body);
		assert.equal(body.error, "ValidationError");
		assert.match(String(body.message), CYRILLIC);
		assert.equal(EN_FAILED.test(badUuid.body), false);
	});

	test("POST /api/inventory/current without auth → 401 without EN Failed-to leak", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/inventory/current",
			headers: { "content-type": "application/json" },
			payload: { name: "Перчатки нитриловые" },
		});
		assert.equal(response.statusCode, 401, response.body);
		assert.equal(EN_FAILED.test(response.body), false);
	});

	test("handleCreateInventoryItem → RU 400 NameRequired / ExpirationDateInvalid and RU 500 InventoryItemNotSaved", async () => {
		const missingName = await app.inject({
			method: "POST",
			url: "/_test/inventory-create",
			headers: { "content-type": "application/json" },
			payload: { unit: "шт" },
		});
		assert.equal(missingName.statusCode, 400, missingName.body);
		const missingBody = parseJsonObject(missingName.body);
		assert.equal(missingBody.error, "NameRequired");
		assert.match(String(missingBody.message), CYRILLIC);

		const badDate = await app.inject({
			method: "POST",
			url: "/_test/inventory-create",
			headers: { "content-type": "application/json" },
			payload: { name: "Композит A2", expirationDate: "not-a-date" },
		});
		assert.equal(badDate.statusCode, 400, badDate.body);
		const badDateBody = parseJsonObject(badDate.body);
		assert.equal(badDateBody.error, "ExpirationDateInvalid");
		assert.match(String(badDateBody.message), CYRILLIC);

		const notSaved500 = await app.inject({
			method: "POST",
			url: "/_test/inventory-create",
			headers: { "content-type": "application/json" },
			payload: { name: "Композит A2", unit: "шт" },
		});
		assert.equal(notSaved500.statusCode, 500, notSaved500.body);
		const saved500Body = parseJsonObject(notSaved500.body);
		assert.equal(saved500Body.error, "InventoryItemNotSaved");
		assert.match(String(saved500Body.message), CYRILLIC);
		assert.equal(EN_FAILED.test(notSaved500.body), false);
	});
});
