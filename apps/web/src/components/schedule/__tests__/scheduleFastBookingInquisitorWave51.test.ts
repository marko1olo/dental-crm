import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SOLO_CHAIR } from "../grid/gridConstants.js";
import {
	validatePatientDraftWithRequirements,
} from "../../patients/patientFieldRequirementsConfig.js";
import { parseSearchQueryForQuickPatient } from "../patientSearchEngine.js";
import { buildQuickBookingPayload } from "../quickBookingSubmitPayload.js";
import {
	extractStageBookingServices,
	hasTreatmentPlanStageContext,
} from "../quickBookingService/quickServiceHelpers.js";
import { detectWaitlistUrgency } from "../waitlist/waitlistTypes.js";

describe("Wave 51 Schedule & Fast Booking Inquisitor: Frictionless Booking & Overbooking Integrity", () => {
	describe("1. Patient Field Requirements: CITO Emergency Frictionless Name Policy (Mandates 8e, 8n)", () => {
		it("allows empty full name when isEmergencyOrPrimary is true (auto-defaults to CITO patient)", () => {
			const citoDraft = {
				fullName: "",
				phone: "+7 (999) 123-45-67",
				isEmergencyOrPrimary: true,
			};
			const result = validatePatientDraftWithRequirements(citoDraft);
			assert.equal(
				result.isValid,
				true,
				"CITO emergency draft must be valid without full name",
			);
			assert.equal(result.errors.fullName, undefined);
			assert.equal(result.missingRequiredLabels.includes("ФИО"), false);
		});

		it("blocks empty full name when isEmergencyOrPrimary is false (standard planned intake)", () => {
			const standardDraft = {
				fullName: "   ",
				phone: "+7 (999) 123-45-67",
				isEmergencyOrPrimary: false,
			};
			const result = validatePatientDraftWithRequirements(standardDraft);
			assert.equal(
				result.isValid,
				false,
				"Planned intake must require full name",
			);
			assert.equal(result.errors.fullName, "Укажите ФИО пациента");
			assert.equal(result.missingRequiredLabels.includes("ФИО"), true);
		});
	});

	describe("2. Smart Phone Parser & QuickBooking Payload Construction (Mandate 8e, 8k)", () => {
		it("extracts phone and clean name from mixed search query via parseSearchQueryForQuickPatient", () => {
			const parsed = parseSearchQueryForQuickPatient("Иван +7 (999) 111-22-33");
			assert.equal(parsed.fullName, "Иван");
			assert.equal(parsed.phone, "+7 (999) 111-22-33");
		});

		it("normalizes phone-only queries without losing digits", () => {
			const parsed = parseSearchQueryForQuickPatient("+79991112233");
			assert.equal(parsed.fullName, "");
			assert.equal(parsed.phone, "+7 (999) 111-22-33");
		});

		it("builds honest quick booking payload with CITO/overbook flags and stage services", () => {
			const stageSlot = {
				treatmentPlanId: "plan-1",
				stageId: "11111111-1111-4111-8111-111111111111",
				stageTitle: "Этап 1: Терапия",
				services: [{ id: "srv-1", title: "Пломба", priceKopecks: 450000 }],
			};
			assert.equal(hasTreatmentPlanStageContext(stageSlot as never), true);
			assert.equal(extractStageBookingServices(stageSlot as never).length, 1);

			const emergencyPayload = buildQuickBookingPayload({
				params: {
					doctorUserId: "",
					dutyDoctorId: "",
					doctors: [],
					chairId: "",
					chairs: [],
					assistantUserId: "asst-ignored",
					isSoloClinic: true,
					reason: "",
					comment: "",
					status: "planned",
					initialSlot: stageSlot as never,
				} as never,
				activePatientId: null,
				startsAtIso: "2026-10-15T09:00:00.000Z",
				endsAtIso: "2026-10-15T09:30:00.000Z",
				isEmergency: true,
				overbookOverride: false,
			});

			assert.equal(emergencyPayload.doctorUserId, null);
			assert.equal(emergencyPayload.chairId, null);
			assert.equal(emergencyPayload.assistantUserId, null);
			assert.equal(emergencyPayload.isCito, true);
			assert.equal(emergencyPayload.allowOverbooking, true);
			assert.equal(emergencyPayload.reason, "Срочно! Острая боль");
			assert.ok(emergencyPayload.comment.includes("План лечения: plan-1"));

			const plannedPayload = buildQuickBookingPayload({
				params: {
					doctorUserId: "doc-1",
					dutyDoctorId: "",
					doctors: [{ id: "doc-1" }],
					chairId: "chair-1",
					chairs: [{ id: "chair-1" }],
					assistantUserId: "asst-1",
					isSoloClinic: false,
					reason: "Осмотр",
					comment: "",
					status: "planned",
				} as never,
				activePatientId: "pat-1",
				startsAtIso: "2026-10-15T10:00:00.000Z",
				endsAtIso: "2026-10-15T10:30:00.000Z",
				isEmergency: false,
				overbookOverride: false,
			});

			assert.equal(plannedPayload.doctorUserId, "doc-1");
			assert.equal(plannedPayload.assistantUserId, "asst-1");
			assert.equal(plannedPayload.allowOverbooking, false);
			assert.equal(plannedPayload.isCito, false);
		});
	});

	describe("3. Waitlist & Solo Chair Resilience (Mandate 8n)", () => {
		it("provides canonical DEFAULT_SOLO_CHAIR fallback id and capacity", () => {
			assert.equal(DEFAULT_SOLO_CHAIR.id, "default-chair");
			assert.ok(DEFAULT_SOLO_CHAIR.name.length > 0);
		});

		it("detects waitlist urgency deterministically across priority and urgency fields", () => {
			assert.equal(detectWaitlistUrgency({ urgency: "acute_pain" }), "acute_pain");
			assert.equal(detectWaitlistUrgency({ priorityLevel: "high" }), "acute_pain");
			assert.equal(detectWaitlistUrgency({ urgency: "treatment_plan" }), "ortho_endo");
			assert.equal(detectWaitlistUrgency({ priorityLevel: "vip" }), "vip");
			assert.equal(detectWaitlistUrgency({ urgency: "hygiene" }), "hygiene");
			assert.equal(detectWaitlistUrgency(null), "routine");
		});
	});
});
