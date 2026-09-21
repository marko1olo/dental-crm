/**
 * ═══════════════════════════════════════════════════════════════════════════
 * N3.HEALTH VIPNET EGISZ ROUTES COMPREHENSIVE TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import registerEgiszRoutes from "../../routes/egisz.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "ee550000-0000-4000-8000-0000000000e1";
const TEST_SECRET = "k".repeat(48);

describe("N3.Health ViPNet EGISZ Fastify Routes", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicToken = "";

	async function inject(
		method: "POST" | "GET",
		url: string,
		opts: {
			body?: unknown;
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
		const response = await app.inject({
			method,
			url,
			headers,
			payload: opts.body !== undefined ? opts.body : undefined,
		});

		let json: any = null;
		try {
			json = JSON.parse(response.body);
		} catch {
			// ignore non-json
		}
		return {
			status: response.statusCode,
			json,
			body: response.body,
		};
	}

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;

		// Set test env variables for N3.Health ViPNet (fixtures)
		process.env.EGISZ_N3_AUTH_GUID = "11111111-2222-3333-4444-555555555555";
		process.env.EGISZ_N3_ID_LPU = "22222222-3333-4444-5555-666666666666";
		process.env.EGISZ_CLINIC_OID = "1.2.643.5.1.13.13.12.2.77.99999";
		process.env.EGISZ_N3_EVENTLOG_TOKEN = "N3 fixture-test-token-47276d92"; // gitleaks:allow
		process.env.EGISZ_N3_VIPNET_ACTIVE = "1";

		resetAuthSecretCacheForTests();

		clinicToken = signToken({ organizationId: ORG_ID }, TEST_SECRET, 3600);

		app = Fastify({ logger: false });
		await registerEgiszRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("GET /api/egisz/n3health/status requires authentication", async () => {
		const res = await inject("GET", "/api/egisz/n3health/status", { withClinic: false });
		assert.ok(res.status === 401 || res.status === 403);
	});

	test("GET /api/egisz/n3health/status returns configured status with masked tokens", async () => {
		const res = await inject("GET", "/api/egisz/n3health/status");
		assert.equal(res.status, 200);
		assert.equal(res.json.ok, true);
		assert.equal(res.json.configured, true);
		assert.equal(res.json.clinicOid, "1.2.643.5.1.13.13.12.2.77.99999");
		assert.equal(res.json.idLpu, "22222222-3333-4444-5555-666666666666");
		// Secret tokens are masked
		assert.ok(res.json.authGuidMasked.includes("..."));
		assert.ok(!res.json.authGuidMasked.includes("11111111-2222-3333-4444-555555555555"));
	});

	test("POST /api/egisz/n3health/emk/add-document with dryRun returns SOAP envelope preview", async () => {
		const res = await inject("POST", "/api/egisz/n3health/emk/add-document", {
			body: {
				dryRun: true,
				idDocumentMis: "DOC-DENT-001",
				idCaseMis: "CASE-01",
				documentType: "108",
				documentName: "Протокол стоматологического осмотра",
				documentDate: "2026-09-21T10:00:00Z",
				cdaXmlContent: "<ClinicalDocument>cda test content here with minimum 50 characters long text</ClinicalDocument>",
				patient: {
					idPatientMis: "P-100",
					snils: "11223344595",
					familyName: "Смирнова",
					givenName: "Елена",
					birthDate: "1990-01-01",
					gender: "2",
				},
				doctor: {
					snils: "12345678964",
					familyName: "Барабаш",
					givenName: "Сергей",
				},
			},
		});

		assert.equal(res.status, 200);
		assert.equal(res.json.ok, true);
		assert.equal(res.json.dryRun, true);
		assert.equal(res.json.soapAction, "http://tempuri.org/IEMKService/AddDocument");
		assert.ok(res.json.previewSnippet.includes("<tem:AddDocument>"));
		assert.ok(res.json.previewSnippet.includes("<tem:AuthToken>"));
	});

	test("POST /api/egisz/n3health/emk/send-document with dryRun returns preview", async () => {
		const res = await inject("POST", "/api/egisz/n3health/emk/send-document", {
			body: {
				dryRun: true,
				idDocumentMis: "DOC-DENT-001",
				targetSystem: "REMD",
			},
		});

		assert.equal(res.status, 200);
		assert.equal(res.json.ok, true);
		assert.equal(res.json.dryRun, true);
		assert.equal(res.json.soapAction, "http://tempuri.org/IEMKService/SendDocument");
	});

	test("POST /api/egisz/n3health/emk/close-case with dryRun returns preview", async () => {
		const res = await inject("POST", "/api/egisz/n3health/emk/close-case", {
			body: {
				dryRun: true,
				idCaseMis: "CASE-01",
				closeDate: "2026-09-21",
			},
		});

		assert.equal(res.status, 200);
		assert.equal(res.json.ok, true);
		assert.equal(res.json.dryRun, true);
		assert.equal(res.json.soapAction, "http://tempuri.org/IEMKService/CloseCase");
	});

	test("POST /api/egisz/n3health/pix/add-patient with dryRun returns preview", async () => {
		const res = await inject("POST", "/api/egisz/n3health/pix/add-patient", {
			body: {
				dryRun: true,
				idPatientMis: "PAT-001",
				familyName: "Иванов",
				givenName: "Иван",
				birthDate: "1980-05-15",
				gender: "1",
				snils: "11223344595",
			},
		});

		assert.equal(res.status, 200);
		assert.equal(res.json.ok, true);
		assert.equal(res.json.dryRun, true);
		assert.equal(res.json.soapAction, "http://tempuri.org/IPixService/AddPatient");
	});

	test("POST /api/egisz/n3health/pix/find-patients with dryRun returns preview", async () => {
		const res = await inject("POST", "/api/egisz/n3health/pix/find-patients", {
			body: {
				dryRun: true,
				snils: "11223344595",
				familyName: "Иванов",
			},
		});

		assert.equal(res.status, 200);
		assert.equal(res.json.ok, true);
		assert.equal(res.json.dryRun, true);
		assert.equal(res.json.soapAction, "http://tempuri.org/IPixService/FindPatients");
	});

	test("POST /api/egisz/n3health/emk/add-document returns 400 on validation failure", async () => {
		const res = await inject("POST", "/api/egisz/n3health/emk/add-document", {
			body: {
				dryRun: true,
				// missing idDocumentMis, cdaXmlContent, etc.
			},
		});

		assert.equal(res.status, 400);
		assert.equal(res.json.ok, false);
		assert.equal(res.json.error, "ValidationError");
	});
});
