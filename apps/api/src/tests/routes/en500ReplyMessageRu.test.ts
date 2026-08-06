/**
 * Contract: operator-facing 500 replies on files/waitlist/lab/inventory
 * must carry Cyrillic `message` (message-first gameplay). No English
 * "Failed to …" in reply.send bodies.
 *
 * Source scan + AUTH-first inject smoke. No mocks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import { registerWaitlistRoutes } from "../../routes/waitlist.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = path.resolve(HERE, "../../routes");

const ROUTE_FILES = [
	"files.ts",
	"waitlist.ts",
	"lab.ts",
	"inventory.ts",
] as const;

const CYRILLIC = /[А-Яа-яЁё]/;
const EN_FAILED_SEND =
	/send\(\s*\{[^}]*Failed to\b|\berror:\s*["']Failed to\b/s;

const EXPECTED_CODES = [
	"AttachmentNotSaved",
	"WaitlistNotSaved",
	"LabOrderNotSaved",
	"LabPortalError",
	"InventoryItemNotSaved",
] as const;

describe("EN 500 reply → RU message (files/waitlist/lab/inventory)", () => {
	test("source: no English Failed-to in reply.send on four routes", () => {
		for (const name of ROUTE_FILES) {
			const text = readFileSync(path.join(ROUTES_DIR, name), "utf8");
			assert.equal(
				EN_FAILED_SEND.test(text),
				false,
				`${name} still has English Failed-to in reply body`,
			);
			assert.equal(
				text.includes('error: "Failed to'),
				false,
				`${name} still has error: "Failed to…"`,
			);
			assert.equal(
				text.includes("Failed to insert attachment") ||
					text.includes("Failed to add to waitlist") ||
					text.includes("Failed to create lab order") ||
					text.includes("Failed to create item") ||
					text.includes("Failed to update item"),
				false,
				`${name} still contains banned EN 500 string`,
			);
		}
	});

	test("source: each 500 branch exposes Cyrillic message + PascalCase code", () => {
		const combined = ROUTE_FILES.map((n) =>
			readFileSync(path.join(ROUTES_DIR, n), "utf8"),
		).join("\n");
		for (const code of EXPECTED_CODES) {
			assert.ok(
				combined.includes(`error: "${code}"`),
				`missing machine code ${code}`,
			);
		}
		// Every new 500 block pairs error with message containing Cyrillic.
		const messageHits =
			combined.match(/message:\s*\n?\s*"[^"]*[А-Яа-яЁё][^"]*"/g) ?? [];
		assert.ok(
			messageHits.length >= 6,
			`expected ≥6 RU message strings on four routes, got ${messageHits.length}`,
		);
		for (const hit of messageHits) {
			assert.match(hit, CYRILLIC);
			assert.ok(
				!/\bFailed to\b/i.test(hit),
				`RU message still has Failed to: ${hit}`,
			);
		}
	});

	describe("inject AUTH-first waitlist (live route, no mocks)", () => {
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
			assert.notEqual(response.statusCode, 400);
			assert.notEqual(response.statusCode, 500);
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
			assert.notEqual(response.statusCode, 500);
			let body: { error?: unknown; message?: unknown } = {};
			try {
				body = JSON.parse(response.body) as typeof body;
			} catch {
				body = {};
			}
			assert.equal(body.error, "ValidationError");
			assert.equal(typeof body.message, "string");
			assert.match(String(body.message), CYRILLIC);
		});
	});
});
