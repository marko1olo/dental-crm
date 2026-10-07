/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD REAL JOURNAL & OUTBOX INTEGRATION TEST — DENTE DENTAL CRM
 *
 * PROVOCATIVE RED TEAM INQUISITION:
 * Mandate 8c & Mandate 8f: Zero Synthetic Static Arrays, 100% Real Database Persistence
 *
 * Verifies that:
 * 1. GET /api/egisz/journal and GET /api/egisz/outbox perform live SQL joins with
 *    egisz_outbox, patients, users (doctors), and organizations.
 * 2. Honest status translation:
 *    - registered_in_remd -> "registered"
 *    - ready_for_dispatch -> "signed"
 *    - sending            -> "sent"
 *    - failed             -> "error" with actionable remediation hints
 *    - rejected_by_remd   -> "rejected_by_egisz"
 * 3. Status query filtering (?status=...) executes strictly at SQL layer without mock arrays.
 * 4. Zero Mocks Guarantee: Organization with 0 outbox records receives an honest empty array
 *    items: [] (0 records), proving ZERO fallback to SAMPLE_REMD_JOURNAL_RECORDS or static fakes!
 * 5. GET /api/egisz/outbox/:outboxId/receipt returns statutory REMD registration receipt.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerEgiszOutboxRoutes } from "../../routes/egisz/outboxRoutes.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "egiszRealJournalOutbox";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const EMPTY_ORG_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 10);
const EMPTY_DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 11);
const PATIENT_ID = fixtureUuid(NAMESPACE, 20);
const VISIT_ID = fixtureUuid(NAMESPACE, 30);

const OUTBOX_ID_REG = fixtureUuid(NAMESPACE, 40);
const OUTBOX_ID_DISPATCH = fixtureUuid(NAMESPACE, 41);
const OUTBOX_ID_ERR = fixtureUuid(NAMESPACE, 42);
const OUTBOX_ID_REJECT = fixtureUuid(NAMESPACE, 43);

describe("RED TEAM INQUISITION: Real EGISZ REMD Journal & Outbox Persistence", () => {
	let app: FastifyInstance;
	let doctorHeaders: Record<string, string>;
	let emptyDoctorHeaders: Record<string, string>;
	let databaseAvailable = true;
	const adminSecret = "test-clinical-admin-secret-key-at-least-32-chars-long";

	before(async () => {
		process.env.DENTE_CLINICAL_ADMIN_SECRET = adminSecret;
		try {
			await purgeFixtureOrganizations([ORG_ID, EMPTY_ORG_ID]);
		} catch (e) {
			console.warn("[EGISZ Test] Purge before error:", e);
		}

		app = createTenantTestApp();
		registerEgiszOutboxRoutes(app);
		await app.ready();

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: ORG_ID }, secret);
		const doctorStaffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
		);

		doctorHeaders = {
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": doctorStaffToken,
			"x-dente-admin-secret": adminSecret,
		};

		const emptyClinicToken = signToken({ organizationId: EMPTY_ORG_ID }, secret);
		const emptyStaffToken = signToken(
			{
				organizationId: EMPTY_ORG_ID,
				userId: EMPTY_DOCTOR_USER_ID,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
		);

		emptyDoctorHeaders = {
			"x-dente-clinic-token": emptyClinicToken,
			"x-dente-staff-token": emptyStaffToken,
			"x-dente-admin-secret": adminSecret,
		};

		try {
			// 1. Seed Active Clinic with real outbox records
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(schema.organizations).values({
					id: ORG_ID,
					name: 'ООО "Стоматологический Центр ДЕНТЕ РЭМД"',
					inn: "7701234560",
					kpp: "770101001",
					ogrn: "1157746123457",
				}).onConflictDoNothing();

				await tx.insert(schema.users).values({
					id: DOCTOR_USER_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Кузнецов Иван Сергеевич",
					role: "doctor",
					snils: "123-456-789 64",
				}).onConflictDoNothing();

				await tx.insert(schema.patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Петрова Елена Михайловна",
					birthDate: "1992-04-15",
					administrativeProfile: {
						snils: "987-654-321 00",
						cardNumber: "043/у-7712",
						polisOms: "1234567890123456",
					} as any,
				}).onConflictDoNothing();

				await tx.insert(schema.visits).values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "signed",
				}).onConflictDoNothing();

				// Real DB Outbox Rows
				await tx.insert(schema.egiszOutbox).values([
					// Row 1: Registered in REMD
					{
						id: OUTBOX_ID_REG,
						organizationId: ORG_ID,
						visitId: VISIT_ID,
						patientId: PATIENT_ID,
						doctorId: DOCTOR_USER_ID,
						docTypeNsiCode: "105",
						status: "registered_in_remd",
						payloadXml: "<ClinicalDocument>SEMD 105</ClinicalDocument>",
						payloadHashSha256: "98f13708210194c475687be6106a3b84e4e9f783389fcb306b99de0fbf1a8d8e",
						doctorSignaturePkcs7: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzAN...",
						doctorCertSerial: "00A1B2C3D4E5F678",
						doctorCertSubject: "Кузнецов И.С.",
						doctorSignedAt: new Date("2026-08-28T10:00:00Z"),
						remdDocumentId: "REMD-DOC-99001",
						remdTransactionId: "TX-77-99120",
						dedupeKey: `dedupe-${OUTBOX_ID_REG}`,
					},
					// Row 2: Ready for Dispatch (Signed)
					{
						id: OUTBOX_ID_DISPATCH,
						organizationId: ORG_ID,
						visitId: VISIT_ID,
						patientId: PATIENT_ID,
						doctorId: DOCTOR_USER_ID,
						docTypeNsiCode: "108",
						status: "ready_for_dispatch",
						payloadXml: "<ClinicalDocument>SEMD 108</ClinicalDocument>",
						payloadHashSha256: "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",
						doctorSignaturePkcs7: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzAN...",
						doctorCertSerial: "00A1B2C3D4E5F678",
						doctorCertSubject: "Кузнецов И.С.",
						doctorSignedAt: new Date("2026-08-28T11:00:00Z"),
						dedupeKey: `dedupe-${OUTBOX_ID_DISPATCH}`,
					},
					// Row 3: Validation Error (Failed)
					{
						id: OUTBOX_ID_ERR,
						organizationId: ORG_ID,
						visitId: VISIT_ID,
						patientId: PATIENT_ID,
						doctorId: DOCTOR_USER_ID,
						docTypeNsiCode: "302",
						status: "failed",
						payloadXml: "<ClinicalDocument>SEMD 302</ClinicalDocument>",
						payloadHashSha256: "b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1",
						doctorSignaturePkcs7: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzAN...",
						doctorCertSerial: "00A1B2C3D4E5F678",
						doctorCertSubject: "Кузнецов И.С.",
						lastErrorClass: "ERR_FRMR_SNILS_NOT_FOUND",
						lastErrorMessage: "СНИЛС врача не найден в Федеральном регистре медицинских работников (ФРМР)",
						dedupeKey: `dedupe-${OUTBOX_ID_ERR}`,
					},
					// Row 4: Rejected by REMD
					{
						id: OUTBOX_ID_REJECT,
						organizationId: ORG_ID,
						visitId: VISIT_ID,
						patientId: PATIENT_ID,
						doctorId: DOCTOR_USER_ID,
						docTypeNsiCode: "1151156",
						status: "rejected_by_remd",
						payloadXml: "<FnsTaxCertificate>KND 1151156</FnsTaxCertificate>",
						payloadHashSha256: "c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2",
						doctorSignaturePkcs7: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzAN...",
						doctorCertSerial: "00A1B2C3D4E5F678",
						doctorCertSubject: "Кузнецов И.С.",
						lastErrorClass: "ERR_FNS_SCHEMA_VALIDATION",
						lastErrorMessage: "Ошибка валидации схемы ФНС: некорректный ИНН налогоплательщика",
						dedupeKey: `dedupe-${OUTBOX_ID_REJECT}`,
					},
				]).onConflictDoNothing();
			});

			// 2. Seed Empty Clinic (Zero outbox entries)
			await withFixtureTenant(EMPTY_ORG_ID, async (tx) => {
				await tx.insert(schema.organizations).values({
					id: EMPTY_ORG_ID,
					name: 'ООО "Чистая Клиника Без Документов"',
					inn: "7709998877",
					kpp: "770901001",
					ogrn: "1157746999887",
				}).onConflictDoNothing();

				await tx.insert(schema.users).values({
					id: EMPTY_DOCTOR_USER_ID,
					organizationId: EMPTY_ORG_ID,
					fullName: "Д-р Пустой Врач",
					role: "doctor",
					snils: "111-222-333 44",
				}).onConflictDoNothing();
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID, EMPTY_ORG_ID]);
		} catch (e) {
			console.warn("[EGISZ Test] Purge after error:", e);
		}
		if (app) await app.close();
	});

	it("1. GET /api/egisz/journal performs honest live SQL join between egisz_outbox, patients, users, and organizations", async (ctx) => {
		if (!databaseAvailable) return ctx.skip("Database is unavailable in test environment");

		const res = await app.inject({
			method: "GET",
			url: "/api/egisz/journal",
			headers: doctorHeaders,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.ok(Array.isArray(json.items));
		assert.ok(json.items.length >= 4, "Expected at least 4 seeded outbox records");

		// Locate registered record
		const regItem = json.items.find((i: any) => i.id === OUTBOX_ID_REG);
		assert.ok(regItem, "Registered record OUTBOX_ID_REG exists in database output");
		assert.equal(regItem.status, "registered");
		assert.equal(regItem.patient.fullName, "Петрова Елена Михайловна");
		assert.equal(regItem.patient.snils, "987-654-321 00");
		assert.equal(regItem.patient.cardNumber, "043/у-7712");
		assert.equal(regItem.doctor.fullName, "Д-р Кузнецов Иван Сергеевич");
		assert.equal(regItem.doctor.snils, "123-456-789 64");
		assert.equal(regItem.clinic.name, 'ООО "Стоматологический Центр ДЕНТЕ РЭМД"');
		assert.equal(regItem.registrationInfo?.regNumber, "РЭМД-77-2026-TX-77-99");
		assert.equal(regItem.registrationInfo?.remdDocId, "REMD-DOC-99001");
		assert.equal(regItem.doctorSignature?.certificateSerialNumber, "00A1B2C3D4E5F678");

		// Locate ready_for_dispatch record
		const signedItem = json.items.find((i: any) => i.id === OUTBOX_ID_DISPATCH);
		assert.ok(signedItem, "Signed record exists");
		assert.equal(signedItem.status, "signed");

		// Locate failed record
		const failedItem = json.items.find((i: any) => i.id === OUTBOX_ID_ERR);
		assert.ok(failedItem, "Failed record exists");
		assert.equal(failedItem.status, "error");
		assert.equal(failedItem.validationError?.errorCode, "ERR_FRMR_SNILS_NOT_FOUND");
		assert.equal(failedItem.validationError?.errorCategory, "frmr");
		assert.ok(failedItem.validationError?.actionableHint.includes("ФРМР"));

		// Locate rejected record
		const rejectedItem = json.items.find((i: any) => i.id === OUTBOX_ID_REJECT);
		assert.ok(rejectedItem, "Rejected record exists");
		assert.equal(rejectedItem.status, "rejected_by_egisz");
		assert.equal(rejectedItem.validationError?.errorCode, "ERR_FNS_SCHEMA_VALIDATION");
	});

	it("2. GET /api/egisz/outbox is a valid endpoint alias and returns identical transactional queue", async (ctx) => {
		if (!databaseAvailable) return ctx.skip("Database is unavailable in test environment");

		const res = await app.inject({
			method: "GET",
			url: "/api/egisz/outbox",
			headers: doctorHeaders,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.ok(json.items.length >= 4);
		assert.ok(json.items.some((i: any) => i.id === OUTBOX_ID_REG));
	});

	it("3. Status filtering (?status=...) executes strictly at SQL layer without mock data contamination", async (ctx) => {
		if (!databaseAvailable) return ctx.skip("Database is unavailable in test environment");

		// Filter for registered
		const resReg = await app.inject({
			method: "GET",
			url: "/api/egisz/journal?status=registered",
			headers: doctorHeaders,
		});
		assert.equal(resReg.statusCode, 200);
		const jsonReg = resReg.json();
		assert.ok(jsonReg.items.length >= 1);
		for (const item of jsonReg.items) {
			assert.equal(item.status, "registered");
		}

		// Filter for error
		const resErr = await app.inject({
			method: "GET",
			url: "/api/egisz/journal?status=error",
			headers: doctorHeaders,
		});
		assert.equal(resErr.statusCode, 200);
		const jsonErr = resErr.json();
		assert.ok(jsonErr.items.length >= 2, "Expected failed and rejected records");
		for (const item of jsonErr.items) {
			assert.ok(item.status === "error" || item.status === "rejected_by_egisz");
		}
	});

	it("4. Mandate 8c Zero Mocks: Organization with 0 outbox records receives honest empty array without fake presets", async (ctx) => {
		if (!databaseAvailable) return ctx.skip("Database is unavailable in test environment");

		const res = await app.inject({
			method: "GET",
			url: "/api/egisz/journal",
			headers: emptyDoctorHeaders,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.deepEqual(json.items, [], "Items array MUST be strictly empty [] for tenant with 0 records");
		assert.equal(json.totalCount, 0, "totalCount MUST be strictly 0");
	});

	it("5. GET /api/egisz/outbox/:outboxId/receipt returns statutory REMD registration receipt for registered record", async (ctx) => {
		if (!databaseAvailable) return ctx.skip("Database is unavailable in test environment");

		const res = await app.inject({
			method: "GET",
			url: `/api/egisz/outbox/${OUTBOX_ID_REG}/receipt`,
			headers: doctorHeaders,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.ok, true);
		assert.equal(json.receipt.remdDocumentId, "REMD-DOC-99001");
		assert.equal(json.receipt.remdTransactionId, "TX-77-99120");
		assert.equal(json.receipt.payloadHashSha256, "98f13708210194c475687be6106a3b84e4e9f783389fcb306b99de0fbf1a8d8e");
		assert.equal(json.receipt.doctorCertSerial, "00A1B2C3D4E5F678");
		assert.ok(json.receipt.receiptId.startsWith("RCP-REMD-"));
	});
});
