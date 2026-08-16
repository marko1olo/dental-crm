import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	REFERRAL_PRIORITIES,
	REFERRAL_TYPES,
	SpecialistReferralService,
	type SpecialistReferralInput,
	dbWrapper,
} from "./SpecialistReferralService.js";

describe("SpecialistReferralService — Feature #110 Inter-Specialist Referrals", () => {
	test("1. Constants and Types definitions", () => {
		assert.equal(REFERRAL_TYPES.length, 4);
		assert.ok(REFERRAL_TYPES.includes("consultation"));
		assert.ok(REFERRAL_TYPES.includes("treatment_stage"));
		assert.ok(REFERRAL_TYPES.includes("urgent_surgical"));
		assert.ok(REFERRAL_TYPES.includes("diagnostic_ct"));

		assert.equal(REFERRAL_PRIORITIES.length, 3);
		assert.ok(REFERRAL_PRIORITIES.includes("routine"));
		assert.ok(REFERRAL_PRIORITIES.includes("urgent"));
		assert.ok(REFERRAL_PRIORITIES.includes("emergency"));
	});

	test("2. Creates referral task with full clinical context (ICD-10, teeth, notes)", async () => {
		let capturedOrgId: string | null = null;
		let capturedPayload: any = null;

		dbWrapper.insertClinicalTaskInDb = async (orgId: string, payload: any) => {
			capturedOrgId = orgId;
			capturedPayload = payload;
			return {
				id: "task-uuid-1",
				organizationId: orgId,
				patientId: payload.patientId,
				taskType: payload.taskType,
				title: payload.title,
				description: payload.description,
				status: payload.status,
				treatmentPlanId: payload.treatmentPlanId,
				assignedDoctorId: payload.assignedDoctorId,
				dueAt: null,
				createdAt: "2026-08-16T10:00:00.000Z",
			};
		};

		const service = new SpecialistReferralService();
		const input: SpecialistReferralInput = {
			organizationId: "org-1",
			patientId: "patient-101",
			referralType: "urgent_surgical",
			priority: "emergency",
			assignedDoctorId: "surgeon-doc-5",
			treatmentPlanId: "plan-99",
			toothCodes: ["36", "37"],
			diagnosisIcd10: "K04.7",
			notes: "Острый гнойный периодонтит, требуется экстренное удаление и дренирование",
		};

		const result = await service.createReferral(input);

		assert.equal(capturedOrgId, "org-1");
		assert.equal(capturedPayload.patientId, "patient-101");
		assert.equal(capturedPayload.taskType, "referral:urgent_surgical");
		assert.equal(capturedPayload.title, "Направление: Срочная хирургия (emergency)");
		assert.equal(capturedPayload.assignedDoctorId, "surgeon-doc-5");
		assert.equal(capturedPayload.treatmentPlanId, "plan-99");
		assert.ok(capturedPayload.description.includes("K04.7"));
		assert.ok(capturedPayload.description.includes("36, 37"));
		assert.ok(capturedPayload.description.includes("Острый гнойный периодонтит"));
		assert.equal(result.id, "task-uuid-1");
	});

	test("3. Creates routine consultation without optional tooth codes or plan", async () => {
		let capturedPayload: any = null;

		dbWrapper.insertClinicalTaskInDb = async (orgId: string, payload: any) => {
			capturedPayload = payload;
			return {
				id: "task-uuid-2",
				organizationId: orgId,
				patientId: payload.patientId,
				taskType: payload.taskType,
				title: payload.title,
				description: payload.description,
				status: payload.status,
				treatmentPlanId: null,
				assignedDoctorId: null,
				dueAt: null,
				createdAt: "2026-08-16T11:00:00.000Z",
			};
		};

		const service = new SpecialistReferralService();
		const input: SpecialistReferralInput = {
			organizationId: "org-1",
			patientId: "patient-202",
			referralType: "consultation",
			priority: "routine",
			notes: "Консультация ортодонта по поводу дистального прикуса",
		};

		const result = await service.createReferral(input);
		assert.equal(capturedPayload.taskType, "referral:consultation");
		assert.equal(capturedPayload.title, "Направление: Консультация (routine)");
		assert.equal(capturedPayload.treatmentPlanId, null);
		assert.equal(capturedPayload.assignedDoctorId, null);
		assert.equal(capturedPayload.description, "Комментарий: Консультация ортодонта по поводу дистального прикуса");
		assert.equal(result.id, "task-uuid-2");
	});
});
