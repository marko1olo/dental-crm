/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD STATUTORY CDA R3 XML VALIDATION & OUTBOX DLQ RETRY ENGINE TEST
 * Live PostgreSQL 18.4 Database Verification Suite (Order 911n, Order 804n, FDI)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	clinics,
	egiszAuditLogs,
	egiszLogs,
	egiszOutbox,
	organizations,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import {
	generateDentalCdaXml,
	type DentalCdaXmlParams,
} from "../../services/cda/index.js";
import {
	calculateEgiszRetryDelayMs,
	EgiszOutboxDispatcher,
} from "../../services/egisz/EgiszOutboxDispatcher.js";
import {
	OiisGatewayClient,
	type RemdSubmissionResponse,
} from "../../services/egisz/OiisGatewayClient.js";
import {
	EGISZ_OIDS,
	validateCdaXmlStructure,
	validateCdaParams,
	validateFdiToothNumber,
	validateOrder804nCode,
	VALID_FDI_TEETH,
} from "@dental/shared";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "egiszSubsystemAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const VISIT_ID = fixtureUuid(NAMESPACE, 5);
const VISIT_ID_2 = fixtureUuid(NAMESPACE, 6);

describe("EGISZ REMD: CDA R3 Statutory Validation & Outbox DLQ (PostgreSQL 18.4)", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);

		// Seed real PostgreSQL 18.4 entities for our fixture tenant
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "ООО Стоматология ЕГИСЗ Аудит",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await tx.insert(clinics).values({
				id: CLINIC_ID,
				organizationId: ORG_ID,
				name: "Главное отделение ЕГИСЗ",
				address: "г. Москва, ул. Стоматологическая, д. 1",
				timezone: "Europe/Moscow",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Стоматологов Владимир Сергеевич",
				email: "doctor.egisz@audit.test",
				role: "doctor",
				createdAt: new Date(),
			});

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пациентов Алексей Игоревич",
				birthDate: "1985-06-15",
				phone: "+79991112233",
				createdAt: new Date(),
			});

			await tx.insert(visits).values([
				{
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "signed",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: VISIT_ID_2,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "signed",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// БЛОК 1: ВАЛИДАЦИЯ СХЕМЫ CDA R3 XML ПО ТРЕБОВАНИЯМ МИНЗДРАВА РФ
	// ═══════════════════════════════════════════════════════════════════════════
	describe("1. CDA R3 XML Statutory Validation (Order 911n, 804n, FDI ISO 3950)", () => {
		const validBaseParams: DentalCdaXmlParams = {
			patientId: PATIENT_ID,
			patientName: { first: "Алексей", last: "Пациентов", middle: "Игоревич" },
			patientSnils: "112-233-445 95", // Valid checksum: sum mod 101
			patientBirthDate: "1985-06-15T00:00:00.000Z",
			patientGender: "male",
			clinicOid: "1.2.643.5.1.13.13.12.2.77012345", // FRMO MO OID
			clinicOgrn: "1027700132195",
			clinicInn: "7701234567",
			clinicName: "ООО Стоматология ЕГИСЗ Аудит",
			doctorName: { first: "Владимир", last: "Стоматологов", middle: "Сергеевич" },
			doctorSnils: "001-234-567 84", // Valid checksum: sum mod 101 = 84
			doctorPosition: "Врач-стоматолог-терапевт",
			doctorPositionCode: "18",
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина",
			tooth: 16,
			anamnesis: "Жалобы на кратковременные боли от термических раздражителей",
			treatmentDescription: "Препарирование кариозной полости зуба 16, пломбирование светоотверждаемым композитом",
			services: [
				{
					code: "A16.07.002.001",
					name: "Восстановление зуба пломбой",
					tooth: 16,
					quantity: 1,
				},
			],
			dentalStatus: [
				{
					tooth: 16,
					condition: "caries",
					conditionCode: "C",
					conditionName: "Кариес",
				},
			],
			visitDate: new Date("2026-09-02T10:00:00.000Z"),
			documentId: "doc-audit-001",
		};

		test("1.1 Full valid CDA XML generation: passes statutory XSD validation", () => {
			const genRes = generateDentalCdaXml(validBaseParams);
			assert.ok(genRes.success, "XML generation must succeed");

			const valRes = validateCdaXmlStructure(genRes.xml, "108");
			assert.ok(valRes.valid, `XML must be valid according to statutory rules: ${valRes.errors.join("; ")}`);
			assert.equal(valRes.errors.length, 0, "Errors array must be strictly empty");

			// Verify presence of statutory doctor SNILS and MO OID
			assert.ok(genRes.xml.includes('root="1.2.643.100.3"'), "Must contain doctor SNILS OID");
			assert.ok(genRes.xml.includes('root="1.2.643.5.1.13.13.12.2"'), "Must contain FRMO MO root OID");
			assert.ok(genRes.xml.includes('codeSystem="1.2.643.5.1.13.13.11.1466"'), "Must contain FDI tooth OID");
			assert.ok(genRes.xml.includes('codeSystem="1.2.643.5.1.13.13.11.1070"'), "Must contain Order 804n service OID");
		});

		test("1.2 Doctor SNILS validation: rejects missing or invalid doctor SNILS in author section", () => {
			const genRes = generateDentalCdaXml(validBaseParams);
			assert.ok(genRes.success);

			// Corrupt doctor SNILS specifically in author section (checksum failure: 123-456-789 00)
			const tamperedXml = genRes.xml.replace(
				/<author>[\s\S]*?<\/author>/i,
				(match) =>
					match.replace(
						/root="1\.2\.643\.100\.3"\s+extension="[^"]+"/i,
						'root="1.2.643.100.3" extension="123-456-789 00"',
					),
			);

			const valRes = validateCdaXmlStructure(tamperedXml, "108");
			assert.equal(valRes.valid, false, "Must reject XML with invalid doctor SNILS checksum");
			assert.ok(
				valRes.errors.some((e) => e.includes("СНИЛС врача")),
				"Error message must specify doctor SNILS failure",
			);
		});

		test("1.3 Medical Organization identification: rejects XML missing MO identifiers in custodian", () => {
			const genRes = generateDentalCdaXml(validBaseParams);
			assert.ok(genRes.success);

			// Remove all MO identifiers from custodian section
			const strippedXml = genRes.xml.replace(
				/<custodian>[\s\S]*?<\/custodian>/i,
				"<custodian><assignedCustodian><representedCustodianOrganization><name>Анонимная клиника без OID</name></representedCustodianOrganization></assignedCustodian></custodian>",
			);

			const valRes = validateCdaXmlStructure(strippedXml, "108");
			assert.equal(valRes.valid, false, "Must reject XML missing MO identifiers in custodian");
			assert.ok(
				valRes.errors.some((e) => e.includes("идентификатор МО")),
				"Error must flag missing MO FRMO / Passport OID",
			);
		});

		test("1.4 MO Passport OID 1.2.643.5.1.13.13.11.1008 is accepted as valid MO identifier", () => {
			const genRes = generateDentalCdaXml(validBaseParams);
			assert.ok(genRes.success);

			// Replace FRMO OID with statutory MO Passport OID 1.2.643.5.1.13.13.11.1008
			const passportXml = genRes.xml.replace(
				/root="1\.2\.643\.5\.1\.13\.13\.12\.2\.\d+"/i,
				`root="${EGISZ_OIDS.MO_PASSPORT}" extension="MO-PASSPORT-770123"`,
			);

			const valRes = validateCdaXmlStructure(passportXml, "108");
			assert.ok(valRes.valid, `MO Passport OID 1008 must be accepted: ${valRes.errors.join("; ")}`);
		});

		test("1.5 Order 804n nomenclature validation: rejects invalid medical service codes", () => {
			const genRes = generateDentalCdaXml(validBaseParams);
			assert.ok(genRes.success);

			// Inject invalid medical service code into Order 804n section
			const invalidServiceXml = genRes.xml.replace(
				/code="A16\.07\.002\.001"/i,
				'code="INVALID-SERVICE-999"',
			);

			const valRes = validateCdaXmlStructure(invalidServiceXml, "108");
			assert.equal(valRes.valid, false, "Must reject invalid Order 804n code");
			assert.ok(
				valRes.errors.some((e) => e.includes("804н")),
				"Error message must specify Order 804n failure",
			);

			// Check standalone helper function
			assert.equal(validateOrder804nCode("A16.07.002.001"), true);
			assert.equal(validateOrder804nCode("B01.065.001"), true);
			assert.equal(validateOrder804nCode("A11.07.012"), true);
			assert.equal(validateOrder804nCode("X99.999.001"), false);
			assert.equal(validateOrder804nCode(""), false);
		});

		test("1.6 FDI ISO 3950 tooth formula validation: strictly validates 11..48 and 51..85", () => {
			// Verify all statutory permanent teeth (32) and deciduous teeth (20)
			assert.equal(VALID_FDI_TEETH.size, 52, "Total valid FDI teeth count must be 52");
			for (let q = 1; q <= 4; q++) {
				for (let t = 1; t <= 8; t++) {
					assert.equal(validateFdiToothNumber(q * 10 + t), true, `Permanent tooth ${q * 10 + t} must be valid`);
				}
			}
			for (let q = 5; q <= 8; q++) {
				for (let t = 1; t <= 5; t++) {
					assert.equal(validateFdiToothNumber(q * 10 + t), true, `Deciduous tooth ${q * 10 + t} must be valid`);
				}
			}

			// Verify invalid numbers
			assert.equal(validateFdiToothNumber(19), false);
			assert.equal(validateFdiToothNumber(29), false);
			assert.equal(validateFdiToothNumber(49), false);
			assert.equal(validateFdiToothNumber(56), false);
			assert.equal(validateFdiToothNumber(99), false);
			assert.equal(validateFdiToothNumber(0), false);

			// Inject invalid tooth 99 into XML targetSiteCode
			const genRes = generateDentalCdaXml(validBaseParams);
			assert.ok(genRes.success);
			const invalidToothXml = genRes.xml.replace(
				/code="16"\s+codeSystem="1\.2\.643\.5\.1\.13\.13\.11\.1466"/i,
				'code="99" codeSystem="1.2.643.5.1.13.13.11.1466"',
			);

			const valRes = validateCdaXmlStructure(invalidToothXml, "108");
			assert.equal(valRes.valid, false, "Must reject XML containing invalid FDI tooth number 99");
			assert.ok(
				valRes.errors.some((e) => e.includes("FDI") && e.includes("99")),
				"Error message must specify invalid FDI tooth number 99",
			);
		});
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// БЛОК 2: ТЕСТИРОВАНИЕ ОЧЕРЕДИ EGISZ_OUTBOX НА РЕАЛЬНОЙ БАЗЕ POSTGRESQL 18.4
	// ═══════════════════════════════════════════════════════════════════════════
	describe("2. Outbox Queue, Network Errors (502/503), Retry Backoff & DLQ on PostgreSQL 18.4", () => {
		test("2.1 calculateEgiszRetryDelayMs enforces exact monotonic backoff schedule", () => {
			assert.equal(calculateEgiszRetryDelayMs(1), 5_000, "Attempt 1 must backoff 5 seconds");
			assert.equal(calculateEgiszRetryDelayMs(2), 30_000, "Attempt 2 must backoff 30 seconds");
			assert.equal(calculateEgiszRetryDelayMs(3), 300_000, "Attempt 3 must backoff 5 minutes");
			assert.equal(calculateEgiszRetryDelayMs(4), 3_600_000, "Attempt 4 must backoff 1 hour");
			assert.equal(calculateEgiszRetryDelayMs(5), 86_400_000, "Attempt 5+ must cap at 24 hours");
		});

		test("2.2 Live PostgreSQL 18.4 Outbox: HTTP 502/503 network error triggers exponential backoff", async () => {
			// Enqueue a real package into egisz_outbox in PostgreSQL 18.4
			const [insertedRow] = await db
				.insert(egiszOutbox)
				.values({
					organizationId: ORG_ID,
					visitId: VISIT_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					docTypeNsiCode: "108",
					status: "ready_for_dispatch",
					payloadXml: "<ClinicalDocument>Test 502</ClinicalDocument>",
					payloadHashSha256: "a".repeat(64),
					doctorSignaturePkcs7: "MIIFakeDoctorSig==",
					doctorCertSerial: "1234567890",
					doctorCertSubject: "CN=Стоматологов",
					doctorSignedAt: new Date(),
					attempts: 0,
					maxAttempts: 5,
					scheduledAt: new Date(),
					nextAttemptAt: new Date(Date.now() - 1000), // Due now
					dedupeKey: `audit-502-${Date.now()}`,
				})
				.returning();

			assert.ok(insertedRow?.id, "Must insert outbox row into PostgreSQL 18.4");

			// Create gateway client that simulates HTTP 502 Bad Gateway
			const failingGateway = new OiisGatewayClient({
				baseUrl: "http://127.0.0.1:9999",
				guid: "00000000-0000-0000-0000-000000000000",
				lpuId: "LPU-TEST",
				clinicOid: "1.2.643.5.1.13.13.12.2.77012345",
				isSandbox: false,
			});

			// Intercept sendRemdDocument to simulate exact HTTP 502 from EGISZ gateway
			failingGateway.sendRemdDocument = async (): Promise<RemdSubmissionResponse> => {
				return {
					success: false,
					transactionId: `ERR-502-${Date.now()}`,
					status: "Error",
					errorMessage: "Шлюз ОИИС вернул HTTP 502: Bad Gateway. Сервис РЭМД временно недоступен.",
				};
			};

			const dispatcher = new EgiszOutboxDispatcher(failingGateway);

			// Process the pending queue on live database
			const processRes = await dispatcher.processPendingQueue(ORG_ID);
			assert.equal(processRes.processedCount, 1, "Must process exactly 1 row");
			assert.equal(processRes.failedCount, 1, "Must record 1 failure");

			// Inspect row in PostgreSQL 18.4
			const [updatedRow] = await db
				.select()
				.from(egiszOutbox)
				.where(eq(egiszOutbox.id, insertedRow.id));

			assert.ok(updatedRow);
			assert.equal(updatedRow.status, "failed", "Status must transition to 'failed' on network error");
			assert.equal(updatedRow.attempts, 1, "Attempts must increment to 1");
			assert.equal(updatedRow.lastErrorClass, "Error", "lastErrorClass must record gateway error");
			assert.ok(updatedRow.lastErrorMessage?.includes("502"), "lastErrorMessage must contain HTTP 502 details");
			assert.equal(updatedRow.lockedAt, null, "Lock must be released");
			assert.ok(updatedRow.nextAttemptAt, "nextAttemptAt must be scheduled in future");
			assert.ok(
				updatedRow.nextAttemptAt.getTime() > Date.now(),
				"nextAttemptAt must be in the future (backoff applied)",
			);

			// Inspect audit log entry in PostgreSQL 18.4
			const auditLogs = await db
				.select()
				.from(egiszAuditLogs)
				.where(
					and(
						eq(egiszAuditLogs.organizationId, ORG_ID),
						eq(egiszAuditLogs.entityId, insertedRow.id),
					),
				);

			assert.ok(auditLogs.length > 0, "Must record audit entry");
			const retryLog = auditLogs.find((l) => l.eventType === "REMD_SEMD_RETRY_SCHEDULED");
			assert.ok(retryLog, "Must emit REMD_SEMD_RETRY_SCHEDULED event");
		});

		test("2.3 Live PostgreSQL 18.4 DLQ Exhaustion: row enters Dead Letter Queue after 5 failed attempts", async () => {
			// Enqueue package with attempts = 4 (1 attempt left before maxAttempts = 5)
			const [dlqRow] = await db
				.insert(egiszOutbox)
				.values({
					organizationId: ORG_ID,
					visitId: VISIT_ID_2,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					docTypeNsiCode: "108",
					status: "failed",
					payloadXml: "<ClinicalDocument>Test DLQ</ClinicalDocument>",
					payloadHashSha256: "b".repeat(64),
					doctorSignaturePkcs7: "MIIFakeDoctorSig2==",
					doctorCertSerial: "1234567891",
					doctorCertSubject: "CN=Стоматологов",
					doctorSignedAt: new Date(),
					attempts: 4,
					maxAttempts: 5,
					scheduledAt: new Date(),
					nextAttemptAt: new Date(Date.now() - 1000), // Due now
					dedupeKey: `audit-dlq-${Date.now()}`,
				})
				.returning();

			assert.ok(dlqRow?.id);

			// Gateway client simulating HTTP 503 Service Unavailable
			const failingGateway503 = new OiisGatewayClient({
				baseUrl: "http://127.0.0.1:9999",
				guid: "00000000-0000-0000-0000-000000000000",
				lpuId: "LPU-TEST",
				clinicOid: "1.2.643.5.1.13.13.12.2.77012345",
				isSandbox: false,
			});

			failingGateway503.sendRemdDocument = async (): Promise<RemdSubmissionResponse> => {
				return {
					success: false,
					transactionId: `ERR-503-${Date.now()}`,
					status: "Error",
					errorMessage: "Шлюз ОИИС вернул HTTP 503: Service Unavailable. Лимит соединений ЕГИСЗ исчерпан.",
				};
			};

			const dispatcher = new EgiszOutboxDispatcher(failingGateway503);

			// 5th attempt processing
			const processRes = await dispatcher.processPendingQueue(ORG_ID);
			assert.ok(processRes.processedCount >= 1, "Must process the due row");

			// Verify row state in PostgreSQL 18.4
			const [exhaustedRow] = await db
				.select()
				.from(egiszOutbox)
				.where(eq(egiszOutbox.id, dlqRow.id));

			assert.ok(exhaustedRow);
			assert.equal(exhaustedRow.status, "failed", "Status must remain failed (DLQ)");
			assert.equal(exhaustedRow.attempts, 5, "Attempts must reach 5 (maxAttempts)");
			assert.equal(
				exhaustedRow.lastErrorClass,
				"DeadLetterQueueExhausted",
				"lastErrorClass must explicitly declare DeadLetterQueueExhausted",
			);
			assert.ok(
				exhaustedRow.lastErrorMessage?.includes("[DLQ]"),
				"lastErrorMessage must be tagged with [DLQ]",
			);

			// Verify DLQ audit event in PostgreSQL 18.4
			const dlqAuditLogs = await db
				.select()
				.from(egiszAuditLogs)
				.where(
					and(
						eq(egiszAuditLogs.organizationId, ORG_ID),
						eq(egiszAuditLogs.entityId, dlqRow.id),
					),
				);

			const dlqEvent = dlqAuditLogs.find((l) => l.eventType === "REMD_DLQ_EXHAUSTED");
			assert.ok(dlqEvent, "Must record REMD_DLQ_EXHAUSTED audit event");
			const payload = (dlqEvent.payloadJson ?? (dlqEvent as any).payload) as { isDeadLetterQueue?: boolean; attempts?: number };
			assert.equal(payload.isDeadLetterQueue, true, "Payload must confirm isDeadLetterQueue: true");
			assert.equal(payload.attempts, 5, "Payload must record attempts = 5");

			// CRITICAL: Verify that subsequent queue processor calls NEVER pick up this row again!
			const nextRunRes = await dispatcher.processPendingQueue(ORG_ID);
			assert.equal(
				nextRunRes.processedCount,
				0,
				"Queue worker must NOT pick up exhausted DLQ row (attempts < maxAttempts constraint)",
			);
		});
	});
});
