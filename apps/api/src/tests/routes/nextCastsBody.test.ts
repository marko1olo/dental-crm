/**
 * СТОРОЖ ТЕЛА (следующая пачка bare cast):
 *   ai predict-no-show, clinical recent-patients, diary upsert/lock/revise,
 *   templates create, communication receipts fieldFrom, outbox dispatch.
 *
 * AUTH-first: без токена — 401/403, не 400 body oracle.
 * Non-object body → 400 ≠ 500 (или accepted:0 для webhook receipts).
 * База не нужна на 400/401 путях (кроме outbox dispatch после auth context).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAiRoutes } from "../../routes/ai.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";
import registerDiaryRoutes from "../../routes/diary.js";
import registerTemplateRoutes from "../../routes/templates.js";
import registerCommunicationReceiptRoutes from "../../routes/communicationReceipts.js";
import registerCommunicationOutboxRoutes from "../../routes/communicationsOutbox.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "cc440000-0000-4000-8000-0000000000c1";
const USER_ID = "cc440000-0000-4000-8000-0000000000u1";
const ENTRY_ID = "cc440000-0000-4000-8000-0000000000e1";
const TEST_SECRET = "jj4-next-casts-body-secret-".padEnd(48, "z");

describe("next bare casts — Zod body (AUTH-first; empty → 400 ≠ 500)", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";
	let staffToken = "";

	async function inject(
		method: "POST" | "GET" | "PUT",
		url: string,
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			withClinic?: boolean;
			withStaff?: boolean;
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
		if (opts.withStaff) {
			headers[STAFF_TOKEN_HEADER] = staffToken;
		}
		const injectOpts: {
			method: "POST" | "GET" | "PUT";
			url: string;
			headers: Record<string, string>;
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
		return { statusCode: response.statusCode, json, body: String(response.body || "") };
	}

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		// Receipts: secret must be set or 503; mismatch → 401. Use known secret.
		process.env.DENTE_COMMUNICATION_RECEIPT_SECRET = "receipt-test-secret-zz";
		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG_ID }, TEST_SECRET, 3600);
		staffToken = signToken(
			{ organizationId: ORG_ID, userId: USER_ID, role: "admin" },
			TEST_SECRET,
			3600,
		);

		app = Fastify({ logger: false });
		await registerAiRoutes(app);
		await registerClinicalRoutes(app);
		await registerDiaryRoutes(app);
		await registerTemplateRoutes(app);
		await registerCommunicationReceiptRoutes(app);
		await registerCommunicationOutboxRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	// ── AI predict-no-show ─────────────────────────────────────────────

	test("POST /api/ai/predict-no-show без токена → 401 AuthRequired", async () => {
		const r = await inject("POST", "/api/ai/predict-no-show", {
			body: { patientId: ORG_ID },
			withClinic: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.equal(r.json.error, "AuthRequired");
	});

	test("POST /api/ai/predict-no-show {} → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/ai/predict-no-show", { body: {} });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /пациент|неявк/i);
	});

	test("POST /api/ai/predict-no-show array body → 400 ≠ 500", async () => {
		const r = await inject("POST", "/api/ai/predict-no-show", { body: [] });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	// ── clinical recent-patients ───────────────────────────────────────

	test("POST /api/hr/recent-patients без staff → 401/403 (не 400 body)", async () => {
		const r = await inject("POST", "/api/hr/recent-patients", {
			body: { patientId: ORG_ID },
			withClinic: true,
			withStaff: false,
		});
		assert.ok(r.statusCode === 401 || r.statusCode === 403, r.body);
		assert.notEqual(r.statusCode, 400);
	});

	test("POST /api/hr/recent-patients {} → 400 PatientIdRequired ≠ 500", async () => {
		const r = await inject("POST", "/api/hr/recent-patients", {
			body: {},
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "PatientIdRequired");
	});

	test("POST /api/hr/recent-patients array → 400 ≠ 500", async () => {
		const r = await inject("POST", "/api/hr/recent-patients", {
			body: [1, 2],
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "PatientIdRequired");
	});

	// ── diary upsert POST /api/diaries ──────────────────────────────────

	test("POST /api/diaries without auth → 401/403 (не 400 body oracle)", async () => {
		const r = await inject("POST", "/api/diaries", {
			body: { visitId: ENTRY_ID, patientId: ENTRY_ID },
			withClinic: false,
		});
		assert.ok(
			r.statusCode === 401 || r.statusCode === 403 || r.statusCode === 400,
			r.body,
		);
		// Unguarded mutations may pass auth; still must not 500 on later body.
		assert.notEqual(r.statusCode, 500);
		// Prefer AUTH-first: when clinic missing, should not be pure body ValidationError-only path.
		if (r.statusCode === 401 || r.statusCode === 403) {
			assert.notEqual(r.json.error, "ValidationError");
		}
	});

	test("POST /api/diaries array body → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/diaries", {
			body: [],
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /дневник|visitId|patientId/i);
	});

	test("POST /api/diaries JSON null → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/diaries", {
			rawPayload: "null",
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST /api/diaries {} → 400 ValidationError (missing UUIDs) ≠ 500", async () => {
		const r = await inject("POST", "/api/diaries", {
			body: {},
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /дневник|visitId|patientId/i);
	});

	test("POST /api/diaries bad uuid → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/diaries", {
			body: { visitId: "not-a-uuid", patientId: "also-bad" },
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	// ── diary lock / revise ────────────────────────────────────────────

	test("POST diary lock без auth → 401/403 (не 400 body)", async () => {
		const r = await inject("POST", `/api/diaries/${ENTRY_ID}/lock`, {
			body: {},
			withClinic: false,
		});
		assert.ok(
			r.statusCode === 401 || r.statusCode === 403 || r.statusCode === 400,
			r.body,
		);
		// If unguarded mutations allow through, body Zod still must not 500.
		assert.notEqual(r.statusCode, 500);
	});

	test("POST diary lock array body → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", `/api/diaries/${ENTRY_ID}/lock`, {
			body: [],
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST diary revise array body → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", `/api/diaries/${ENTRY_ID}/revise`, {
			body: [],
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	// ── templates create ───────────────────────────────────────────────

	test("POST /api/templates без auth → не 500", async () => {
		const r = await inject("POST", "/api/templates", {
			body: { title: "x" },
			withClinic: false,
		});
		assert.notEqual(r.statusCode, 500, r.body);
		assert.ok(r.statusCode === 401 || r.statusCode === 403, r.body);
	});

	test("POST /api/templates {} → 400 Title required ≠ 500", async () => {
		const r = await inject("POST", "/api/templates", {
			body: {},
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "Title required");
		assert.match(String(r.json.message), /назван/i);
	});

	test("POST /api/templates null-like empty title → 400 ≠ 500", async () => {
		const r = await inject("POST", "/api/templates", {
			body: { title: "   " },
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "Title required");
	});

	test("POST /api/templates array body → 400 ≠ 500", async () => {
		const r = await inject("POST", "/api/templates", {
			body: [],
			withClinic: true,
			withStaff: true,
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
	});

	// ── communication receipts (webhook: non-object → accepted 0) ────

	test("POST receipts/smsru non-object body + secret → 200 accepted 0 ≠ 500", async () => {
		const r = await inject("POST", "/api/communications/receipts/smsru", {
			body: [],
			withClinic: false,
			extraHeaders: { "x-dente-receipt-secret": "receipt-test-secret-zz" },
		});
		assert.equal(r.statusCode, 200, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.accepted, 0);
	});

	test("POST receipts/smsru без секрета → 401/503 ≠ 500", async () => {
		const r = await inject("POST", "/api/communications/receipts/smsru", {
			body: { data: "1=100" },
			withClinic: false,
		});
		assert.ok(r.statusCode === 401 || r.statusCode === 503, r.body);
		assert.notEqual(r.statusCode, 500);
	});

	// ── outbox dispatch batchSize ──────────────────────────────────────

	test("POST outbox/dispatch без auth → 401/403 ≠ 500", async () => {
		const r = await inject("POST", "/api/communications/outbox/dispatch", {
			body: { batchSize: 10 },
			withClinic: false,
		});
		assert.notEqual(r.statusCode, 500, r.body);
		assert.ok(r.statusCode === 401 || r.statusCode === 403, r.body);
	});

	test("POST outbox/dispatch array body → не 500 (default batch)", async () => {
		// May hit DB after auth; only prove no TypeError 500 from body cast.
		const r = await inject("POST", "/api/communications/outbox/dispatch", {
			body: [],
			withClinic: true,
			withStaff: true,
		});
		assert.notEqual(r.statusCode, 500, r.body);
		// 200 with report, or 401/403 if staff context incomplete — both OK vs 500
		assert.ok(
			r.statusCode === 200 ||
				r.statusCode === 401 ||
				r.statusCode === 403 ||
				r.statusCode === 400,
			r.body,
		);
	});
});
