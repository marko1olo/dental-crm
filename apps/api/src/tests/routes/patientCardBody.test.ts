/**
 * СТОРОЖ ТЕЛА: рекламации / задачи / чёрный список.
 *
 * Раньше тела читались bare cast'ом `request.body as { … } | null | undefined`.
 * Zod safeParse после AUTH (requireClinicOrganizationId) → 400 с прежними RU
 * текстами. Без токена — 401 AuthRequired (не 400 body oracle).
 *
 * База не нужна: все 400-пути выходят до getPatientByIdFromDb.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerPatientRoutes } from "../../routes/patients.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_TOKEN = "cc440000-0000-4000-8000-0000000000c1";
const PATIENT_ID = "cc440000-0000-4000-8000-0000000000d1";
const RECORD_ID = "cc440000-0000-4000-8000-0000000000d2";
const TEST_SECRET = "jj4-patient-card-body-secret-".padEnd(48, "z");

describe("пациент карта — Zod body (AUTH-first 401; empty → 400 ≠ 500)", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";

	async function inject(
		method: "POST" | "PUT",
		url: string,
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
			headers[CLINIC_TOKEN_HEADER] = clinicToken;
		}
		const injectOpts: {
			method: "POST" | "PUT";
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

	test("POST reclamations без токена → 401 AuthRequired (не 400 body)", async () => {
		const r = await inject("POST", `/api/patients/${PATIENT_ID}/reclamations`, {
			body: {},
			withAuth: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.equal(r.json.error, "AuthRequired");
	});

	test("POST reclamations {} → 400 ValidationError (суть жалобы)", async () => {
		const r = await inject("POST", `/api/patients/${PATIENT_ID}/reclamations`, {
			body: {},
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /суть жалобы|осложнения/i);
	});

	test("POST reclamations details без врача → 400 (врач)", async () => {
		const r = await inject("POST", `/api/patients/${PATIENT_ID}/reclamations`, {
			body: { complicationDetails: "отёк после удаления" },
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /врач/i);
	});

	test("PUT reclamation status {} → 400 (состояние инцидента)", async () => {
		const r = await inject(
			"PUT",
			`/api/patients/${PATIENT_ID}/reclamations/${RECORD_ID}`,
			{ body: {} },
		);
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /состояни/i);
	});

	test("POST tickets {} → 400 (название задачи)", async () => {
		const r = await inject("POST", `/api/patients/${PATIENT_ID}/tickets`, {
			body: {},
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /назван|сделать/i);
	});

	test("POST tickets title без ответственного → 400", async () => {
		const r = await inject("POST", `/api/patients/${PATIENT_ID}/tickets`, {
			body: { title: "перезвонить" },
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /ответственн/i);
	});

	test("PUT ticket status {} → 400 (состояние задачи)", async () => {
		const r = await inject(
			"PUT",
			`/api/patients/${PATIENT_ID}/tickets/${RECORD_ID}`,
			{ body: {} },
		);
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /состояни/i);
	});

	test("POST archive-status {} → 400 (запретить/снять)", async () => {
		const r = await inject("POST", `/api/patients/${PATIENT_ID}/archive-status`, {
			body: {},
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.notEqual(r.statusCode, 500);
		assert.equal(r.json.error, "ValidationError");
		assert.match(String(r.json.message), /запретить|запрет/i);
	});

	test("POST archive-status isBlacklisted string → 400", async () => {
		const r = await inject("POST", `/api/patients/${PATIENT_ID}/archive-status`, {
			body: { isBlacklisted: "true" },
		});
		assert.equal(r.statusCode, 400, r.body);
		assert.equal(r.json.error, "ValidationError");
	});

	test("POST archive-status без токена → 401 (не 400)", async () => {
		const r = await inject("POST", `/api/patients/${PATIENT_ID}/archive-status`, {
			body: { isBlacklisted: true },
			withAuth: false,
		});
		assert.equal(r.statusCode, 401, r.body);
		assert.equal(r.json.error, "AuthRequired");
	});
});
