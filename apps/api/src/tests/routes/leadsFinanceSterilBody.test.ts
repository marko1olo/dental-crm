/**
 * Gameplay inject: leads + finance_family + sterilization body Zod guards.
 *
 * AUTH-first: no clinic/staff token → 401, not 400 body oracle.
 * Non-object body (null/array) → 400 ValidationError ≠ 500.
 * Minimal Fastify without global ZodError handler — routes must safeParse.
 * No mocks — real app.inject.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerFamilyFinanceRoutes } from "../../routes/finance_family.js";
import { registerLeadsRoutes } from "../../routes/leads.js";
import { registerSterilizationRoutes } from "../../routes/sterilization.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "ee550000-0000-4000-8000-0000000000e2";
const USER_ID = "ee550000-0000-4000-8000-0000000000u2";
const LEAD_ID = "ee550000-0000-4000-8000-0000000000a1";
const FAMILY_ID = "ee550000-0000-4000-8000-0000000000f1";
const TEST_SECRET = "k".repeat(48);

describe("leads + finance_family + sterilization — body guards (AUTH-first; inject)", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";
	let staffToken = "";

	async function inject(
		method: "POST" | "PUT" | "PATCH" | "GET",
		url: string,
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
			withClinic?: boolean;
			withStaff?: boolean;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (opts.withClinic !== false) {
			headers[CLINIC_TOKEN_HEADER] = clinicToken;
		}
		if (opts.withStaff !== false) {
			headers[STAFF_TOKEN_HEADER] = staffToken;
		}
		const injectOpts: {
			method: "POST" | "PUT" | "PATCH" | "GET";
			url: string;
			headers: Record<string, string>;
			payload?: unknown;
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
		return { statusCode: response.statusCode, json, body: response.body };
	}

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
		await registerLeadsRoutes(app);
		await registerFamilyFinanceRoutes(app);
		await registerSterilizationRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	// ── leads ──────────────────────────────────────────────────────────

	test("POST /api/leads without auth → 401 (not 400 body)", async () => {
		const r = await inject("POST", "/api/leads", {
			body: { name: "Иванов" },
			withClinic: false,
			withStaff: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.notEqual(r.statusCode, 400);
		assert.notEqual(r.statusCode, 500);
	});

	test("POST /api/leads clinic only (no staff) → 401 StaffAuthRequired", async () => {
		const r = await inject("POST", "/api/leads", {
			body: { name: "Иванов" },
			withClinic: true,
			withStaff: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.ok(
			r.json.error === "StaffAuthRequired" || r.json.error === "AuthRequired",
			r.body,
		);
		assert.notEqual(r.statusCode, 400);
	});

	test("POST /api/leads array body → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/leads", { body: [] });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /лид|имя/i);
	});

	test("POST /api/leads JSON null → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/leads", { rawPayload: "null" });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST /api/leads {} → 400 ValidationError (empty name)", async () => {
		const r = await inject("POST", "/api/leads", { body: {} });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("PATCH /api/leads/:id/status array → 400 ValidationError ≠ 500", async () => {
		const r = await inject("PATCH", `/api/leads/${LEAD_ID}/status`, {
			body: [],
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("PUT /api/leads/:id null body → 400 ValidationError ≠ 500", async () => {
		const r = await inject("PUT", `/api/leads/${LEAD_ID}`, {
			rawPayload: "null",
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST /api/leads/:id/convert array → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", `/api/leads/${LEAD_ID}/convert`, {
			body: [1, 2],
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /конверт|дат|кресл|врач/i);
	});

	// ── finance_family ─────────────────────────────────────────────────

	test("POST /api/finance/family without auth → 401 (not 400 body)", async () => {
		const r = await inject("POST", "/api/finance/family", {
			body: { name: "Семья" },
			withClinic: false,
			withStaff: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.notEqual(r.statusCode, 400);
		assert.notEqual(r.statusCode, 500);
	});

	test("POST /api/finance/family array body → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/finance/family", { body: [] });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /семейн|имя/i);
	});

	test("POST /api/finance/family null → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/finance/family", {
			rawPayload: "null",
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("PUT /api/finance/family/:id array → 400 ValidationError ≠ 500", async () => {
		const r = await inject("PUT", `/api/finance/family/${FAMILY_ID}`, {
			body: [],
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST /api/finance/family/pay array → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/finance/family/pay", { body: [] });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /оплат|семей|рубл/i);
	});

	test("POST /api/finance/family/pay {} → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/finance/family/pay", { body: {} });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST /api/finance/family/topup array → 400 ValidationError (already safeParse)", async () => {
		const r = await inject("POST", "/api/finance/family/topup", { body: [] });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /пополнен|рубл/i);
	});

	// ── sterilization ──────────────────────────────────────────────────

	test("POST /api/sterilization/scan without auth → 401 (not 400 body)", async () => {
		const r = await inject("POST", "/api/sterilization/scan", {
			body: {
				barcode: "X",
				autoclaveId: "A1",
				status: "passed",
			},
			withClinic: false,
			withStaff: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.notEqual(r.statusCode, 400);
		assert.notEqual(r.statusCode, 500);
	});

	test("POST /api/sterilization/scan array → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/sterilization/scan", { body: [] });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /стерил|barcode|autoclave/i);
	});

	test("POST /api/sterilization/scan null → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/sterilization/scan", {
			rawPayload: "null",
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST /api/sterilization/link array → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/sterilization/link", { body: [] });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /привяз|visitId|barcode/i);
	});

	test("POST /api/sterilization/link {} → 400 ValidationError ≠ 500", async () => {
		const r = await inject("POST", "/api/sterilization/link", { body: {} });
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
	});
});
