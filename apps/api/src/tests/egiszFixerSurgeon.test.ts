/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ & N3.HEALTH FIXER SURGEON COMPREHENSIVE TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * Mandates: 8v (Тихий бэк-офис), 8bo (ACID & Idempotency), 8bk (Методология Разминирования),
 * 8bf (Единый SSOT и истребление сирот), BOLA/IDOR protection.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import {
	emkAddDocumentBodySchema,
	emkCloseCaseBodySchema,
	emkSendDocumentBodySchema,
	eventLogReexportBodySchema,
	pixFindPatientsBodySchema,
	pixPatientBodySchema,
} from "../routes/egisz/n3/n3Schemas.js";
import { eq } from "drizzle-orm";
import { N3EventLogClient } from "@dental/shared";
import { n3ConfigHeadersSchema } from "../routes/egisz/n3HealthRoutes.js";
import { outboxHeadersSchema } from "../routes/egisz/outbox/outboxActionHandlers.js";
import registerEgiszRoutes from "../routes/egisz.js";
import { resetAuthSecretCacheForTests } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";
import { db } from "../db/client.js";
import { egiszOutbox, organizations, patients, users, visits } from "../db/schema.js";

const ORG_ID_MINE = "11111111-0000-4000-8000-000000000001";
const ORG_ID_ALIEN = "22222222-0000-4000-8000-000000000002";
const TEST_SECRET = "k".repeat(48);

describe("egiszFixerSurgeon — EGISZ & N3.Health Fixes & Invariants", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let clinicTokenMine: string;
	let clinicTokenAlien: string;

	const testPatientId = "33333333-0000-4000-8000-000000000001";
	const testDoctorId = "44444444-0000-4000-8000-000000000001";
	const testVisitId = "55555555-0000-4000-8000-000000000001";
	const testDocId = "66666666-0000-4000-8000-000000000001";

	async function inject(
		method: "POST" | "GET",
		url: string,
		opts: {
			body?: unknown;
			token?: string;
			extraHeaders?: Record<string, string>;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
			[CLINIC_TOKEN_HEADER]: opts.token ?? clinicTokenMine,
			...(opts.extraHeaders ?? {}),
		};
		const injectOpts: {
			method: "POST" | "GET";
			url: string;
			headers: Record<string, string>;
			payload?: unknown;
		} = {
			method,
			url,
			headers,
		};
		if (opts.body !== undefined) {
			injectOpts.payload = opts.body;
		}
		const response = await app.inject(injectOpts);

		let json: Record<string, unknown> | null = null;
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			// ignore non-json
		}
		return {
			status: response.statusCode,
			json,
			body: response.body,
		};
	}

	const origGetDocStatus = N3EventLogClient.prototype.getDocumentStatus;
	const origQueueReexport = N3EventLogClient.prototype.queueForReexport;

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;

		process.env.EGISZ_N3_AUTH_GUID = "11111111-2222-3333-4444-555555555555";
		process.env.EGISZ_N3_ID_LPU = "22222222-3333-4444-5555-666666666666";
		process.env.EGISZ_CLINIC_OID = "1.2.643.5.1.13.13.12.2.77.99999";
		process.env.EGISZ_N3_EVENTLOG_TOKEN = "N3 fixture-test-token-47276d92"; // gitleaks:allow
		process.env.EGISZ_N3_VIPNET_ACTIVE = "1";

		resetAuthSecretCacheForTests();

		N3EventLogClient.prototype.getDocumentStatus = async (idDocumentMis: string) => {
			return {
				idDocumentMis,
				status: "Registered",
				statusCode: 1,
				statusDescription: "Зарегистрирован в РЭМД ЕГИСЗ",
				timestamp: new Date().toISOString(),
			};
		};

		N3EventLogClient.prototype.queueForReexport = async (idDocumentMis: string, queue: string) => {
			return {
				success: true,
				message: `Документ ${idDocumentMis} успешно поставлен в очередь ${queue}`,
			};
		};

		clinicTokenMine = signToken({ organizationId: ORG_ID_MINE }, TEST_SECRET, 3600);
		clinicTokenAlien = signToken({ organizationId: ORG_ID_ALIEN }, TEST_SECRET, 3600);

		app = Fastify({ logger: false });
		await registerEgiszRoutes(app);
		await app.ready();

		// Seed minimal test records into real PG18 for BOLA testing
		try {
			await db.insert(organizations).values([
				{ id: ORG_ID_MINE, name: "Fixer Clinic Mine" },
				{ id: ORG_ID_ALIEN, name: "Fixer Clinic Alien" },
			]).onConflictDoNothing();

			await db.insert(users).values({
				id: testDoctorId,
				organizationId: ORG_ID_MINE,
				fullName: "Барабаш С.В.",
				role: "doctor",
				email: "doctor.fixer@clinic.local",
			}).onConflictDoNothing();

			await db.insert(patients).values({
				id: testPatientId,
				organizationId: ORG_ID_MINE,
				fullName: "Смирнова Елена Александровна",
				phone: "+79991234567",
			}).onConflictDoNothing();

			await db.insert(visits).values({
				id: testVisitId,
				organizationId: ORG_ID_MINE,
				patientId: testPatientId,
				status: "signed",
			}).onConflictDoNothing();

			await db.insert(egiszOutbox).values({
				id: testDocId,
				organizationId: ORG_ID_MINE,
				visitId: testVisitId,
				patientId: testPatientId,
				doctorId: testDoctorId,
				docTypeNsiCode: "108",
				status: "ready_for_dispatch",
				payloadXml: "<ClinicalDocument>Payload</ClinicalDocument>",
				payloadHashSha256: "hash123",
				doctorSignaturePkcs7: "pkcs7-signature-data",
				doctorCertSerial: "123456",
				doctorCertSubject: "CN=Барабаш",
				dedupeKey: `DOC-MINE-001-v1`,
				remdDocumentId: "DOC-MINE-001",
			}).onConflictDoNothing();
		} catch {
			// Seed conflicts or existing test state are safe to ignore
		}
	});

	after(async () => {
		N3EventLogClient.prototype.getDocumentStatus = origGetDocStatus;
		N3EventLogClient.prototype.queueForReexport = origQueueReexport;
		try {
			await db.delete(egiszOutbox).where(eq(egiszOutbox.id, testDocId));
		} catch {
			// cleanup
		}
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	describe("1. Strict Zod Schemas Gate (.strict() enforcement)", () => {
		test("emkAddDocumentBodySchema rejects unknown top-level and nested properties", () => {
			const validPayload = {
				idDocumentMis: "DOC-001",
				documentName: "Протокол осмотра",
				documentDate: "2026-11-24T10:00:00Z",
				cdaXmlContent: "A".repeat(60),
				patient: {
					idPatientMis: "PAT-01",
					snils: "11223344595",
					familyName: "Иванов",
					givenName: "Иван",
					birthDate: "1990-01-01",
					gender: "1" as const,
				},
				doctor: {
					snils: "11223344595",
					familyName: "Петров",
					givenName: "Петр",
				},
			};

			const validCheck = emkAddDocumentBodySchema.safeParse(validPayload);
			assert.equal(validCheck.success, true);

			// Injected unknown top-level property
			const hackedTopLevel = emkAddDocumentBodySchema.safeParse({
				...validPayload,
				injectedKey: "hacked",
			});
			assert.equal(hackedTopLevel.success, false);

			// Injected unknown nested property in patient
			const hackedPatient = emkAddDocumentBodySchema.safeParse({
				...validPayload,
				patient: {
					...validPayload.patient,
					injectedPatientField: 12345,
				},
			});
			assert.equal(hackedPatient.success, false);

			// Injected unknown nested property in doctor
			const hackedDoctor = emkAddDocumentBodySchema.safeParse({
				...validPayload,
				doctor: {
					...validPayload.doctor,
					injectedDoctorField: "fraud",
				},
			});
			assert.equal(hackedDoctor.success, false);
		});

		test("emkSendDocumentBodySchema rejects unknown injected properties", () => {
			const validPayload = {
				idDocumentMis: "DOC-001",
				targetSystem: "REMD" as const,
			};
			assert.equal(emkSendDocumentBodySchema.safeParse(validPayload).success, true);

			const hackedPayload = {
				...validPayload,
				maliciousBypass: true,
			};
			assert.equal(emkSendDocumentBodySchema.safeParse(hackedPayload).success, false);
		});

		test("emkCloseCaseBodySchema rejects unknown properties", () => {
			const validPayload = {
				idCaseMis: "CASE-001",
				closeDate: "2026-11-24",
			};
			assert.equal(emkCloseCaseBodySchema.safeParse(validPayload).success, true);

			const hackedPayload = {
				...validPayload,
				extraField: "invalid",
			};
			assert.equal(emkCloseCaseBodySchema.safeParse(hackedPayload).success, false);
		});

		test("pixPatientBodySchema and pixFindPatientsBodySchema reject extra properties", () => {
			const validPix = {
				idPatientMis: "PAT-001",
				familyName: "Иванов",
				givenName: "Иван",
				birthDate: "1980-05-15",
				gender: "1" as const,
				snils: "11223344595",
			};
			assert.equal(pixPatientBodySchema.safeParse(validPix).success, true);
			assert.equal(pixPatientBodySchema.safeParse({ ...validPix, hacked: true }).success, false);

			const validFind = {
				snils: "11223344595",
			};
			assert.equal(pixFindPatientsBodySchema.safeParse(validFind).success, true);
			assert.equal(pixFindPatientsBodySchema.safeParse({ ...validFind, alienParam: 99 }).success, false);
		});

		test("eventLogReexportBodySchema rejects extra properties", () => {
			const valid = { idDocumentMis: "DOC-001", queue: "REMD" as const };
			assert.equal(eventLogReexportBodySchema.safeParse(valid).success, true);
			assert.equal(eventLogReexportBodySchema.safeParse({ ...valid, bypass: true }).success, false);
		});
	});

	describe("2. Idempotency-Key & Header Schema Validation", () => {
		test("n3ConfigHeadersSchema validates optional UUID format", () => {
			const validHeaders = {
				"idempotency-key": "a0000000-0000-0000-0000-000000000001",
				organizationid: "b0000000-0000-0000-0000-000000000002",
			};
			assert.equal(n3ConfigHeadersSchema.safeParse(validHeaders).success, true);

			const emptyHeaders = {};
			assert.equal(n3ConfigHeadersSchema.safeParse(emptyHeaders).success, true);

			const invalidHeaders = {
				"idempotency-key": "not-a-valid-uuid",
			};
			assert.equal(n3ConfigHeadersSchema.safeParse(invalidHeaders).success, false);
		});

		test("outboxHeadersSchema validates optional UUID format", () => {
			const validHeaders = {
				"idempotency-key": "a0000000-0000-0000-0000-000000000001",
			};
			assert.equal(outboxHeadersSchema.safeParse(validHeaders).success, true);

			const invalidHeaders = {
				"idempotency-key": "invalid-uuid-format",
			};
			assert.equal(outboxHeadersSchema.safeParse(invalidHeaders).success, false);
		});

		test("POST /api/egisz/n3health/config rejects invalid idempotency-key with 400", async () => {
			const res = await inject("POST", "/api/egisz/n3health/config", {
				body: { timeoutMs: 15000 },
				extraHeaders: {
					"idempotency-key": "not-a-uuid",
				},
			});
			assert.equal(res.status, 400);
			assert.ok(res.json?.error === "ValidationError" || res.json?.error === "Bad Request");
		});

		test("POST /api/egisz/outbox/dispatch rejects invalid idempotency-key with 400", async () => {
			const res = await inject("POST", "/api/egisz/outbox/dispatch", {
				extraHeaders: {
					"idempotency-key": "malformed-uuid",
				},
			});
			assert.equal(res.status, 400);
			assert.ok(res.json?.error === "ValidationError" || res.json?.error === "Bad Request");
		});
	});

	describe("3. BOLA / IDOR Protection (Cross-Tenant Document Access)", () => {
		test("GET /api/egisz/n3health/eventlog/status/:idDocumentMis returns 404 for alien document", async () => {
			// Alien clinic requests status for DOC-MINE-001
			const res = await inject("GET", "/api/egisz/n3health/eventlog/status/DOC-MINE-001", {
				token: clinicTokenAlien,
			});
			assert.equal(res.status, 404);
			assert.equal(res.json?.success, false);
			assert.equal(res.json?.error, "Document not found or access denied");
		});

		test("GET /api/egisz/n3health/eventlog/status/:idDocumentMis returns 404 for non-existent document", async () => {
			const res = await inject("GET", "/api/egisz/n3health/eventlog/status/NON-EXISTENT-DOC-999", {
				token: clinicTokenMine,
			});
			assert.equal(res.status, 404);
			assert.equal(res.json?.success, false);
			assert.equal(res.json?.error, "Document not found or access denied");
		});

		test("POST /api/egisz/n3health/eventlog/reexport returns 404 for alien document", async () => {
			const res = await inject("POST", "/api/egisz/n3health/eventlog/reexport", {
				token: clinicTokenAlien,
				body: {
					idDocumentMis: "DOC-MINE-001",
					queue: "REMD",
				},
			});
			assert.equal(res.status, 404);
			assert.equal(res.json?.success, false);
			assert.equal(res.json?.error, "Document not found or access denied");
		});

		test("POST /api/egisz/n3health/emk/send-document returns 404 for alien document in live mode", async () => {
			const res = await inject("POST", "/api/egisz/n3health/emk/send-document", {
				token: clinicTokenAlien,
				body: {
					idDocumentMis: "DOC-MINE-001",
					targetSystem: "REMD",
					dryRun: false,
				},
			});
			assert.equal(res.status, 404);
			assert.equal(res.json?.success, false);
			assert.equal(res.json?.error, "Document not found or access denied");
		});

		test("POST /api/egisz/n3health/emk/add-document returns 404 for non-existent patient in live mode", async () => {
			const res = await inject("POST", "/api/egisz/n3health/emk/add-document", {
				token: clinicTokenMine,
				body: {
					dryRun: false,
					idDocumentMis: "DOC-NEW-001",
					documentName: "Протокол осмотра",
					documentDate: "2026-11-24T10:00:00Z",
					cdaXmlContent: "B".repeat(60),
					patient: {
						idPatientMis: "99999999-9999-4999-8999-999999999999",
						snils: "11223344595",
						familyName: "Чужой",
						givenName: "Пациент",
						birthDate: "1990-01-01",
						gender: "1",
					},
					doctor: {
						snils: "11223344595",
						familyName: "Барабаш",
						givenName: "Сергей",
					},
				},
			});
			assert.equal(res.status, 404);
			assert.equal(res.json?.error, "PatientNotFound");
		});

		test("GET /api/egisz/n3health/eventlog/status/:idDocumentMis returns 200 for document belonging to caller organization", async () => {
			const res = await inject("GET", "/api/egisz/n3health/eventlog/status/DOC-MINE-001", {
				token: clinicTokenMine,
			});
			assert.equal(res.status, 200);
			assert.equal(res.json?.ok, true);
			assert.equal(res.json?.idDocumentMis, "DOC-MINE-001");
			assert.equal(res.json?.status, "Registered");
		});

		test("POST /api/egisz/n3health/eventlog/reexport returns 200 for document belonging to caller organization", async () => {
			const res = await inject("POST", "/api/egisz/n3health/eventlog/reexport", {
				token: clinicTokenMine,
				body: {
					idDocumentMis: "DOC-MINE-001",
					queue: "REMD",
				},
			});
			assert.equal(res.status, 200);
			assert.equal(res.json?.ok, true);
		});
	});
});
