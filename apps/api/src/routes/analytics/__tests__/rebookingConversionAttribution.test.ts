import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRebookingAttribution } from "../../../db/appointmentsQueryModules/appointmentsCreateQuery.js";
import { calculateRebookingDeltaMinutes } from "../utils.js";

describe("Rebooking Conversion 15-Minute Attribution Engine (Feature 54)", () => {
	const fixedNow = new Date("2026-11-21T12:00:00.000Z");
	const doctorUserId = "doc-uuid-001";
	const adminUserId = "admin-uuid-002";
	const visitId = "visit-uuid-101";

	it("1. Solo Doctor practice (Mandate 8n): 100% attribution to doctor with zero friction", () => {
		const result = computeRebookingAttribution({
			isSoloDoctor: true,
			doctorUserId,
			creatorUserId: adminUserId,
			now: fixedNow,
		});

		assert.equal(result.attributedRole, "doctor");
		assert.equal(result.attributedUserId, doctorUserId);
		assert.equal(result.attributionReason, "solo_doctor_auto");
		assert.equal(result.deltaMinutes, 0);
	});

	it("2. Patient currently chairside in treatment (active visit): 100% doctor attribution (delta = 0)", () => {
		const result = computeRebookingAttribution({
			isSoloDoctor: false,
			doctorUserId,
			creatorUserId: adminUserId,
			activeVisit: {
				id: visitId,
				doctorUserId,
			},
			now: fixedNow,
		});

		assert.equal(result.attributedRole, "doctor");
		assert.equal(result.attributedUserId, doctorUserId);
		assert.equal(result.attributionReason, "chairside_rebooking_under_15m");
		assert.equal(result.deltaMinutes, 0);
		assert.equal(result.sourceVisitId, visitId);
	});

	it("3. Visit completed 10 minutes ago (<= 15 min window): attributed to chairside doctor", () => {
		const tenMinutesAgo = new Date(fixedNow.getTime() - 10 * 60 * 1000);

		const result = computeRebookingAttribution({
			isSoloDoctor: false,
			doctorUserId: "fallback-doc",
			creatorUserId: adminUserId,
			lastCompletedVisit: {
				id: visitId,
				doctorUserId,
				completedAt: tenMinutesAgo,
			},
			now: fixedNow,
		});

		assert.equal(result.attributedRole, "doctor");
		assert.equal(result.attributedUserId, doctorUserId);
		assert.equal(result.attributionReason, "chairside_rebooking_under_15m");
		assert.equal(result.deltaMinutes, 10);
		assert.equal(result.sourceVisitId, visitId);
	});

	it("4. Boundary test: visit completed exactly 15 minutes ago (<= 15 min): attributed to doctor", () => {
		const fifteenMinutesAgo = new Date(fixedNow.getTime() - 15 * 60 * 1000);

		const result = computeRebookingAttribution({
			isSoloDoctor: false,
			doctorUserId,
			creatorUserId: adminUserId,
			lastCompletedVisit: {
				id: visitId,
				doctorUserId,
				completedAt: fifteenMinutesAgo,
			},
			now: fixedNow,
		});

		assert.equal(result.attributedRole, "doctor");
		assert.equal(result.attributedUserId, doctorUserId);
		assert.equal(result.attributionReason, "chairside_rebooking_under_15m");
		assert.equal(result.deltaMinutes, 15);
	});

	it("5. Visit completed 16 minutes ago (> 15 min): attributed to frontdesk administrator", () => {
		const sixteenMinutesAgo = new Date(fixedNow.getTime() - 16 * 60 * 1000);

		const result = computeRebookingAttribution({
			isSoloDoctor: false,
			doctorUserId,
			creatorUserId: adminUserId,
			lastCompletedVisit: {
				id: visitId,
				doctorUserId,
				completedAt: sixteenMinutesAgo,
			},
			now: fixedNow,
		});

		assert.equal(result.attributedRole, "administrator");
		assert.equal(result.attributedUserId, adminUserId);
		assert.equal(result.attributionReason, "frontdesk_rebooking_over_15m");
		assert.equal(result.deltaMinutes, 16);
		assert.equal(result.sourceVisitId, visitId);
	});

	it("6. Negative delta defense (future visit completion timestamp normalized via Math.max(0, ...))", () => {
		const futureCompleted = new Date(fixedNow.getTime() + 5 * 60 * 1000);

		const result = computeRebookingAttribution({
			isSoloDoctor: false,
			doctorUserId,
			creatorUserId: adminUserId,
			lastCompletedVisit: {
				id: visitId,
				doctorUserId,
				completedAt: futureCompleted,
			},
			now: fixedNow,
		});

		assert.equal(result.attributedRole, "doctor");
		assert.equal(result.attributedUserId, doctorUserId);
		assert.equal(result.attributionReason, "chairside_rebooking_under_15m");
		assert.equal(result.deltaMinutes, 0, "Negative delta must be clamped to 0");
		assert.equal(result.sourceVisitId, visitId);
	});

	it("7. No preceding visit within 24 hours: attributed to administrator as independent booking", () => {
		const result = computeRebookingAttribution({
			isSoloDoctor: false,
			doctorUserId,
			creatorUserId: adminUserId,
			now: fixedNow,
		});

		assert.equal(result.attributedRole, "administrator");
		assert.equal(result.attributedUserId, adminUserId);
		assert.equal(result.attributionReason, "frontdesk_rebooking_over_15m");
		assert.equal(result.deltaMinutes, null);
		assert.equal(result.sourceVisitId, null);
	});

	it("8. calculateRebookingDeltaMinutes utility mirrors clinical logic identically", () => {
		const completed = new Date("2026-11-21T10:00:00Z");
		const createdChairside = new Date("2026-11-21T10:12:00Z"); // 12 min
		const createdFrontdesk = new Date("2026-11-21T10:25:00Z"); // 25 min

		const chairsideRes = calculateRebookingDeltaMinutes(createdChairside, completed, false);
		assert.equal(chairsideRes.creditedRole, "doctor");
		assert.equal(chairsideRes.deltaMinutes, 12);
		assert.equal(chairsideRes.attributionReason, "chairside_rebooking_under_15m");

		const frontdeskRes = calculateRebookingDeltaMinutes(createdFrontdesk, completed, false);
		assert.equal(frontdeskRes.creditedRole, "administrator");
		assert.equal(frontdeskRes.deltaMinutes, 25);
		assert.equal(frontdeskRes.attributionReason, "frontdesk_rebooking_over_15m");

		// Solo practice override
		const soloRes = calculateRebookingDeltaMinutes(createdFrontdesk, completed, true);
		assert.equal(soloRes.creditedRole, "doctor");
		assert.equal(soloRes.attributionReason, "chairside_rebooking_under_15m");
	});
});
