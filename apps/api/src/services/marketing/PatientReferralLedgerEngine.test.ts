import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	PatientReferralLedgerEngine,
	type ReferralAttribution,
} from "./PatientReferralLedgerEngine.js";

describe("PatientReferralLedgerEngine — Feature #190 Referral Marketing & Bonus Allocation", () => {
	test("1. Generates clean normalized referral code", () => {
		const code = PatientReferralLedgerEngine.generateReferralCode("pat-9876-uuid");
		assert.equal(code, "REF-PAT9876U");
	});

	test("2. Evaluates bonus eligibility strictly based on completed and paid visit", () => {
		const baseAttribution: ReferralAttribution = {
			id: "attr-1",
			organizationId: "org-1",
			referrerPatientId: "pat-1",
			invitedPatientId: "pat-2",
			referralCode: "REF-PAT1",
			attributedAt: new Date("2026-08-01"),
			isFirstVisitCompleted: false,
			isFirstVisitFullyPaid: false,
			rewardBonusPoints: 1000,
			isRewardAllocated: false,
		};

		// 1. Visit not completed -> Not eligible
		const resNotCompleted = PatientReferralLedgerEngine.evaluateRewardEligibility(baseAttribution);
		assert.equal(resNotCompleted.isEligible, false);
		assert.equal(resNotCompleted.pointsToCredit, 0);

		// 2. Completed but not paid -> Not eligible
		const resNotPaid = PatientReferralLedgerEngine.evaluateRewardEligibility({
			...baseAttribution,
			isFirstVisitCompleted: true,
			isFirstVisitFullyPaid: false,
		});
		assert.equal(resNotPaid.isEligible, false);

		// 3. Completed and paid -> Eligible!
		const resEligible = PatientReferralLedgerEngine.evaluateRewardEligibility(
			{
				...baseAttribution,
				isFirstVisitCompleted: true,
				isFirstVisitFullyPaid: true,
			},
			1500,
		);
		assert.equal(resEligible.isEligible, true);
		assert.equal(resEligible.pointsToCredit, 1500);

		// 4. Already allocated -> Not eligible (anti-double spend)
		const resAlreadyAllocated = PatientReferralLedgerEngine.evaluateRewardEligibility({
			...baseAttribution,
			isFirstVisitCompleted: true,
			isFirstVisitFullyPaid: true,
			isRewardAllocated: true,
		});
		assert.equal(resAlreadyAllocated.isEligible, false);
	});
});
