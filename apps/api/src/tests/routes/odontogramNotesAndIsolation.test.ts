import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerPediatricDiplomaRoutes } from "../../routes/pediatric/pediatricDiplomaRoutes.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { db } from "../../db/client.js";
import {
	toothStates,
	toothStateHistory,
	patients,
	organizations,
	users,
	generatedDocuments,
} from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";

describe("Domain 27: Odontogram Doctor Notes Protection, UUID Stability & Bravery Diploma", () => {
	it("1. Protects doctor clinical text notes from JSON stringification across MODBL mutations (DEF 2.1)", async () => {
		const app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await app.ready();

		const testOrgId = "00000000-0000-0000-0000-000000000001";
		const testPatientId = "11111111-1111-1111-1111-111111111111";
		const testUserId = "22222222-2222-2222-2222-222222222222";

		await db
			.insert(organizations)
			.values({ id: testOrgId, name: "Dente Test Clinic" })
			.onConflictDoNothing();

		await db
			.insert(users)
			.values({
				id: testUserId,
				organizationId: testOrgId,
				fullName: "Доктор Хирург-Ортопед",
				role: "doctor",
				passwordHash: "hash123",
			})
			.onConflictDoNothing();

		await db
			.insert(patients)
			.values({
				id: testPatientId,
				organizationId: testOrgId,
				fullName: "Пациент с клиническими заметками",
				phone: "+79998887766",
			})
			.onConflictDoNothing();

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: testOrgId }, secret);
		const staffToken = signToken(
			{
				organizationId: testOrgId,
				userId: testUserId,
				role: "doctor",
				clinicalRole: "dentist",
				canSignMedicalRecords: true,
			},
			secret,
		);

		const headers = {
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
			"content-type": "application/json",
		};

		// Clean up tooth 16 state
		await db
			.delete(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, testOrgId),
					eq(toothStates.patientId, testPatientId),
					eq(toothStates.toothNumber, 16),
				),
			);

		const doctorText = "Кариес дентина в области медиальной фиссуры, термопроба положительна, перкуссия безболезненна";

		// Step 1: Set filling with doctor text note
		const res1 = await app.inject({
			method: "POST",
			url: "/api/odontogram/status",
			headers,
			payload: {
				patientId: testPatientId,
				toothNumber: 16,
				state: "Filled",
				surfaces: ["mesial"],
				notes: doctorText,
				reason: "Первичное пломбирование",
			},
		});

		assert.equal(res1.statusCode, 200);
		const body1 = JSON.parse(res1.body);
		assert.equal(body1.success, true);
		const t1 = body1.states.find((t: { toothNumber: number }) => t.toothNumber === 16);
		assert.ok(t1);
		assert.equal(t1.notes, doctorText, "Response must return clean doctor notes text, NOT JSON");

		// Inspect DB record directly
		const [dbRow1] = await db
			.select()
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, testOrgId),
					eq(toothStates.patientId, testPatientId),
					eq(toothStates.toothNumber, 16),
				),
			);
		assert.ok(dbRow1);
		assert.equal(dbRow1.notes, doctorText, "DB column notes MUST contain clean text note, NOT JSON string");
		assert.ok(dbRow1.clinicalData, "DB column clinical_data MUST store structured JSONB");

		const initialUuid = dbRow1.id;

		// Step 2: Surface union merge without passing new notes (MODBL: add occlusal caries)
		const res2 = await app.inject({
			method: "POST",
			url: "/api/odontogram/status",
			headers,
			payload: {
				patientId: testPatientId,
				toothNumber: 16,
				state: "Caries",
				surfaces: ["occlusal"],
				reason: "Кариес окклюзионной поверхности",
			},
		});

		assert.equal(res2.statusCode, 200);
		const body2 = JSON.parse(res2.body);
		const t2 = body2.states.find((t: { toothNumber: number }) => t.toothNumber === 16);
		assert.ok(t2);
		assert.equal(t2.notes, doctorText, "Doctor notes must remain preserved across MODBL surface merge");
		assert.deepEqual(t2.surfaces, ["mesial", "occlusal"]);

		// Step 3: Verify UUID stability (DEF 2.3) — onConflictDoUpdate prevents ID regeneration!
		const [dbRow2] = await db
			.select()
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, testOrgId),
					eq(toothStates.patientId, testPatientId),
					eq(toothStates.toothNumber, 16),
				),
			);
		assert.ok(dbRow2);
		assert.equal(
			dbRow2.id,
			initialUuid,
			"Tooth UUID MUST remain stable across updates via onConflictDoUpdate (DEF 2.3)",
		);
		assert.equal(dbRow2.notes, doctorText, "DB notes column must STILL contain clean doctor text");

		await app.close();
	});

	it("2. Persists bravery diploma with legal document_kind 'bravery_diploma' in PostgreSQL 18 (DEF 2.6)", async () => {
		const app = createTenantTestApp();
		registerPediatricDiplomaRoutes(app);
		await app.ready();

		const testOrgId = "00000000-0000-0000-0000-000000000001";
		const testPatientId = "11111111-1111-1111-1111-111111111111";
		const testUserId = "22222222-2222-2222-2222-222222222222";

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: testOrgId }, secret);
		const staffToken = signToken(
			{
				organizationId: testOrgId,
				userId: testUserId,
				role: "doctor",
				clinicalRole: "pediatric_dentist",
				canSignMedicalRecords: true,
			},
			secret,
		);

		const headers = {
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
			"content-type": "application/json",
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${testPatientId}/pediatric/bravery-diploma`,
			headers,
			payload: {
				patientName: "Артём Смирнов (6 лет)",
				patientAgeYears: 6,
				doctorName: "Д-р Айболит",
				clinicName: "DENTE Детство",
				awardReasonRu: "За храбрость при лечении зубика 54!",
			},
		});

		assert.equal(res.statusCode, 201);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.ok(body.diploma.id);

		// Verify record in PostgreSQL 18 generated_documents table
		const [doc] = await db
			.select()
			.from(generatedDocuments)
			.where(eq(generatedDocuments.id, body.diploma.id));

		assert.ok(doc, "Diploma document must exist in generated_documents table");
		assert.equal(
			doc.kind,
			"bravery_diploma",
			"Document kind MUST be 'bravery_diploma', NOT fake 'post_visit_recommendations'",
		);
		assert.equal(doc.title, "Диплом за храбрость");

		await app.close();
	});
});
