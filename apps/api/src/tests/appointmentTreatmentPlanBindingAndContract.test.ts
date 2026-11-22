/**
 * appointmentTreatmentPlanBindingAndContract.test.ts
 *
 * Invariant verification for Appointment <-> Treatment Plan binding:
 * 1. Zero Contract Stripping in Zod schemas (createAppointmentSchema / updateAppointmentSchema)
 * 2. CITO / acute emergency flag preservation (isCito / cito)
 * 3. Exact persistence of treatmentPlanId and stageId in PostgreSQL 18 and in-memory sampleData
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
	createAppointmentSchema,
	updateAppointmentSchema,
	appointmentSchema,
} from "@dental/shared";
import {
	createAppointment as createAppointmentInMemory,
	updateAppointment as updateAppointmentInMemory,
} from "../sampleData/appointmentMutations.js";
import {
	createAppointmentInDb,
	updateAppointmentInDb,
} from "../db/appointmentsQuery.js";
import { db } from "../db/client.js";
import { organizations, clinics, users, patients, chairs } from "../db/schema.js";
import { patients as samplePatients, doctorUserId, chairId as sampleChairId } from "../sampleData.js";

describe("Appointment <-> Treatment Plan & CITO Contract Integrity", () => {
	const planId = "01940000-0000-7000-8000-000000000001";
	const stageId = "01940000-0000-7000-8000-000000000002";
	const startsAt = new Date(Date.now() + 86400000).toISOString();
	const endsAt = new Date(Date.now() + 86400000 + 30 * 60000).toISOString();

	test("createAppointmentSchema preserves treatmentPlanId, stageId, isCito, cito without stripping", () => {
		const rawPayload = {
			startsAt,
			endsAt,
			reason: "Лечение по плану",
			treatmentPlanId: planId,
			stageId: stageId,
			isCito: true,
			cito: true,
		};

		const parsed = createAppointmentSchema.parse(rawPayload);
		assert.equal(parsed.treatmentPlanId, planId, "treatmentPlanId must NOT be stripped");
		assert.equal(parsed.stageId, stageId, "stageId must NOT be stripped");
		assert.equal(parsed.isCito, true, "isCito must NOT be stripped");
		assert.equal(parsed.cito, true, "cito must NOT be stripped");
	});

	test("createAppointmentSchema normalizes empty string treatmentPlanId to null", () => {
		const rawPayload = {
			startsAt,
			endsAt,
			treatmentPlanId: "   ",
			stageId: "",
		};

		const parsed = createAppointmentSchema.parse(rawPayload);
		assert.equal(parsed.treatmentPlanId, null, "empty string should normalize to null");
		assert.equal(parsed.stageId, null, "empty string should normalize to null");
	});

	test("updateAppointmentSchema preserves treatmentPlanId, stageId, isCito, cito", () => {
		const rawPayload = {
			treatmentPlanId: planId,
			stageId: stageId,
			isCito: true,
			cito: true,
		};

		const parsed = updateAppointmentSchema.parse(rawPayload);
		assert.equal(parsed.treatmentPlanId, planId, "treatmentPlanId must NOT be stripped on update");
		assert.equal(parsed.stageId, stageId, "stageId must NOT be stripped on update");
		assert.equal(parsed.isCito, true, "isCito must NOT be stripped on update");
		assert.equal(parsed.cito, true, "cito must NOT be stripped on update");
	});

	test("In-memory mutations persist and return treatmentPlanId and stageId", () => {
		const patientId = samplePatients[0]?.id;
		const inMemStarts = "2026-01-15T10:00:00+04:00";
		const inMemEnds = "2026-01-15T10:30:00+04:00";
		const created = createAppointmentInMemory({
			patientId,
			doctorUserId,
			chairId: sampleChairId,
			startsAt: inMemStarts,
			endsAt: inMemEnds,
			reason: "Первичный приём",
			status: "completed",
			treatmentPlanId: planId,
			stageId: stageId,
			isCito: true,
		});

		assert.ok(created.id, "appointment has id");
		assert.equal(created.treatmentPlanId, planId);
		assert.equal(created.stageId, stageId);
		assert.equal(created.isCito, true);

		const nextStageId = "01940000-0000-7000-8000-000000000003";
		const updated = updateAppointmentInMemory(created.id, {
			stageId: nextStageId,
		});

		assert.equal(updated.stageId, nextStageId);
	});

	test("PostgreSQL 18 DB query persists and retrieves treatmentPlanId and stageId", async () => {
		// Ensure baseline test fixtures exist
		const orgId = randomUUID();
		const clinicId = randomUUID();
		const docId = randomUUID();
		const patId = randomUUID();
		const chairId = randomUUID();

		await db.insert(organizations).values({
			id: orgId,
			name: "Test Clinic Plan Binding",
		});

		await db.insert(clinics).values({
			id: clinicId,
			organizationId: orgId,
			name: "Отделение Планов",
		});

		await db.insert(users).values({
			id: docId,
			organizationId: orgId,
			role: "doctor",
			fullName: "Доктор План",
		});

		await db.insert(patients).values({
			id: patId,
			organizationId: orgId,
			fullName: "Пациент План",
		});

		await db.insert(chairs).values({
			id: chairId,
			organizationId: orgId,
			clinicId: clinicId,
			name: "Кресло 1",
		});

		const dbStarts = new Date(Date.now() + 172800000).toISOString();
		const dbEnds = new Date(Date.now() + 172800000 + 45 * 60000).toISOString();

		const created = await createAppointmentInDb(orgId, {
			patientId: patId,
			doctorUserId: docId,
			chairId: chairId,
			startsAt: dbStarts,
			endsAt: dbEnds,
			status: "planned",
			reason: "Этап 1: Препарирование под коронку",
			treatmentPlanId: planId,
			stageId: stageId,
			isCito: true,
		});

		assert.ok(created.id, "created DB appointment has id");
		assert.equal(created.treatmentPlanId, planId, "treatmentPlanId persisted in DB");
		assert.equal(created.stageId, stageId, "stageId persisted in DB");

		// Update to stage 2
		const updatedStageId = "01940000-0000-7000-8000-000000000099";
		const updated = await updateAppointmentInDb(orgId, created.id, {
			stageId: updatedStageId,
		});

		assert.equal(updated.treatmentPlanId, planId, "treatmentPlanId preserved on update");
		assert.equal(updated.stageId, updatedStageId, "stageId updated in DB");
	});
});
