/**
 * Gameplay inject: egisz validate-doctor-snils Zod, vk webhook non-object silent,
 * workspace preset body Zod.
 *
 * AUTH-first (egisz/workspace): no token → 401/403, not 400 body oracle.
 * Non-object body → 400 ≠ 500 (egisz/workspace) or 200 "ok" (vk webhook).
 * InvalidSnils* RU messages preserved.
 * No mocks — real app.inject.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import registerEgiszRoutes from "../../routes/egisz.js";
import { registerVkRoutes } from "../../routes/vk.js";
import { workspaceProfileRoutes } from "../../routes/workspaceProfile.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "ee550000-0000-4000-8000-0000000000e1";
const TEST_SECRET = "k".repeat(48);
/** Pre-checksum-era SNILS (number part ≤ 001001998) — valid without checksum math. */
const VALID_SNILS_EARLY = "00000000100";
/** 11 digits that fail checksum (and not all-same). */
const BAD_CHECKSUM_SNILS = "12345678901";

describe("egisz + vk + workspace preset — body guards (AUTH-first; inject)", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";

	async function inject(
		method: "POST" | "GET",
		url: string,
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			withClinic?: boolean;
			extraHeaders?: Record<string, string>;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
			...(opts.extraHeaders ?? {}),
		};
		if (opts.withClinic !== false) {
			headers[CLINIC_TOKEN_HEADER] = clinicToken;
		}
		const injectOpts: {
			method: "POST" | "GET";
			url: string;
			headers: Record<string, string>;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			payload?: any;
		} = { method, url, headers };
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

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		// VK: no secret → dev warn path accepts (same as messengerWebhookBody).
		delete process.env.VK_WEBHOOK_SECRET;
		delete process.env.DENTE_WEBHOOK_SECRET;
		delete process.env.VK_CONFIRMATION_TOKEN;
		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG_ID }, TEST_SECRET, 3600);

		app = Fastify({ logger: false });
		await registerEgiszRoutes(app);
		await registerVkRoutes(app);
		await workspaceProfileRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	// ── egisz validate-doctor-snils ──────────────────────────────────────────

	test("POST egisz snils without auth → AUTH gate (not 400 body)", async () => {
		// Strict AUTH: unguarded reads would let anonymous through to body/200.
		// Without admin secret, gate may be 401/403 or 503 ClinicalReadSecretMissing —
		// any of those is AUTH-first; body oracle (400) is the failure mode.
		const prev = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		try {
			const r = await inject(
				"POST",
				"/api/clinical/egisz/validate-doctor-snils",
				{ body: { snils: VALID_SNILS_EARLY }, withClinic: false },
			);
			assert.ok(
				r.statusCode === 401 || r.statusCode === 403 || r.statusCode === 503,
				r.body,
			);
			assert.notEqual(r.statusCode, 400);
			assert.notEqual(r.statusCode, 200);
			assert.notEqual(r.statusCode, 500);
		} finally {
			if (prev === undefined) {
				process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
			} else {
				process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = prev;
			}
		}
	});

	test("POST egisz snils array body → 400 ValidationError ≠ 500", async () => {
		const r = await inject(
			"POST",
			"/api/clinical/egisz/validate-doctor-snils",
			{ body: [] },
		);
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /объект|snils/i);
	});

	test("POST egisz snils JSON null → 400 ValidationError ≠ 500", async () => {
		const r = await inject(
			"POST",
			"/api/clinical/egisz/validate-doctor-snils",
			{ rawPayload: "null" },
		);
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST egisz snils missing field → 400 InvalidSnilsFormat (preserved)", async () => {
		const r = await inject(
			"POST",
			"/api/clinical/egisz/validate-doctor-snils",
			{ body: {} },
		);
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "InvalidSnilsFormat");
		assert.match(String(r.json.message), /11 цифр|СНИЛС/i);
	});

	test("POST egisz snils bad checksum → 400 InvalidSnilsChecksum (preserved)", async () => {
		const r = await inject(
			"POST",
			"/api/clinical/egisz/validate-doctor-snils",
			{ body: { snils: BAD_CHECKSUM_SNILS } },
		);
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "InvalidSnilsChecksum");
		assert.match(String(r.json.message), /Контрольное|ФРМР/i);
	});

	test("POST egisz snils valid early number → 200 ok", async () => {
		const r = await inject(
			"POST",
			"/api/clinical/egisz/validate-doctor-snils",
			{ body: { snils: VALID_SNILS_EARLY } },
		);
		assert.equal(r.statusCode, 200, r.body);
		assert.equal(r.json.ok, true);
		assert.equal(r.json.validForFrmr, true);
		assert.match(String(r.json.snilsFormatted), /000-000-001 00/);
	});

	// ── vk webhook non-object silent ─────────────────────────────────────────

	const vkUrl = `/api/public/${ORG_ID}/vk/webhook`;

	test("POST vk webhook JSON null → 200 ok string, no throw", async () => {
		const r = await inject("POST", vkUrl, {
			rawPayload: "null",
			withClinic: false,
		});
		assert.equal(r.statusCode, 200, r.body);
		assert.equal(r.body, "ok");
	});

	test("POST vk webhook array body → 200 ok string, no throw", async () => {
		const r = await inject("POST", vkUrl, {
			body: [1, 2],
			withClinic: false,
		});
		assert.equal(r.statusCode, 200, r.body);
		assert.equal(r.body, "ok");
	});

	test("POST vk webhook empty object → 200 ok (no event type)", async () => {
		const r = await inject("POST", vkUrl, {
			body: {},
			withClinic: false,
		});
		assert.equal(r.statusCode, 200, r.body);
		assert.equal(r.body, "ok");
	});

	// ── workspace preset body ────────────────────────────────────────────────

	test("POST workspace preset without auth → 401 (not 400 body)", async () => {
		const r = await inject("POST", "/api/workspace/preset/solo_therapist", {
			body: { hasPediatricMode: true },
			withClinic: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.notEqual(r.statusCode, 400);
	});

	test("POST workspace preset array body → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/workspace/preset/solo_therapist", {
			body: [],
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST workspace preset null body → 400 ValidationError ≠ 500", async () => {
		// null coerced to {} by handler → passes Zod empty object.
		// Typed non-object string must 400.
		const r = await inject("POST", "/api/workspace/preset/solo_therapist", {
			rawPayload: '"not-object"',
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST workspace preset bad hasPediatricMode type → 400 ≠ 500", async () => {
		const r = await inject("POST", "/api/workspace/preset/solo_therapist", {
			body: { hasPediatricMode: "yes" },
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	// ── workspace profile POST body (flag toggles) ───────────────────────────

	test("POST workspace profile without auth → 401 (not 400 body)", async () => {
		const r = await inject("POST", "/api/workspace/profile", {
			body: { hasInventoryModule: false },
			withClinic: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.notEqual(r.statusCode, 400);
	});

	test("POST workspace profile array body → 400 ValidationError ≠ 500", async () => {
		// Arrays are typeof object in JS — bare guard used to accept them as 200.
		const r = await inject("POST", "/api/workspace/profile", {
			body: [],
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message ?? ""), /модул|JSON|объект/i);
	});

	test("POST workspace profile string body → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/workspace/profile", {
			rawPayload: '"not-object"',
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST workspace profile null body → not 500 (empty partial OK or 404 org)", async () => {
		// null coerced to {} by handler. Org may be missing in inject DB → 404;
		// must never be 500 from body cast.
		const r = await inject("POST", "/api/workspace/profile", {
			rawPayload: "null",
		});
		assert.notEqual(r.statusCode, 500, r.body);
		assert.ok(
			r.statusCode === 200 || r.statusCode === 404 || r.statusCode === 400,
			r.body,
		);
	});
});
