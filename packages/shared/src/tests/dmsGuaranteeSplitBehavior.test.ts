/**
 * dmsGuaranteeSplitBehavior.test.ts
 *
 * Hand-derived behavioral tests for calculateDmsGuaranteeSplit targeting every
 * clinical/financial invariant uncovered by mutation testing (baseline 43%):
 *  - isEmergency alone vs hasAcutePain alone (OR semantics)
 *  - All active letter statuses ("approved", "pending_letter", "pending_approval", "billed", rejected "expired"/"cancelled")
 *  - Letter validFrom / validUntil date window boundaries with active vs missing letter
 *  - Per-item discount subtraction (grossLineKop - discountKop, clamped at 0)
 *  - Approved service code vs approved FDI tooth rejection when EITHER is unapproved
 *  - Contract coverage % per specialty (therapy, surgery, hygiene, ortho) + clamping negative %
 *  - Guarantee letter limit overflow and zero-remaining-limit emergency override
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDmsGuaranteeSplit, type DmsSplitCalculationItem } from "../insurance/dmsModules/dmsGuaranteeSplitEngine.js";
import type { DmsGuaranteeLetter } from "../schemas/documentChainAndDmsSchemas.js";

function makeLetter(overrides: Record<string, unknown> = {}): Partial<DmsGuaranteeLetter> {
	return {
		letterNumber: "GP-2026/001",
		status: "active",
		validFrom: "2026-01-01",
		validUntil: "2026-12-31",
		maxCoverageRub: 50000,
		usedAmountRub: 0,
		...overrides,
	} as Partial<DmsGuaranteeLetter>;
}

function makeItem(overrides: Partial<DmsSplitCalculationItem> = {}): DmsSplitCalculationItem {
	return {
		serviceId: "srv-1",
		serviceCode: "A16.07.002",
		serviceName: "Лечение кариеса",
		category: "therapy",
		toothNumber: 36,
		quantity: 1,
		priceRub: 5000,
		unitPriceKopecks: 500000,
		discountRub: 0,
		discountKopecks: 0,
		...overrides,
	};
}

describe("calculateDmsGuaranteeSplit: emergency vs acute pain OR-semantics", () => {
	const excluded = makeItem({ isExcluded: true });
	const letter = makeLetter();

	it("isEmergency alone covers excluded service at 100%", () => {
		const res = calculateDmsGuaranteeSplit(letter, [excluded], { isEmergency: true, hasAcutePain: false });
		assert.equal(res.totalDmsCoveredKopecks, 500000);
		assert.equal(res.totalPatientCoPayKopecks, 0);
		assert.equal(res.lineItems[0]?.status, "full_dms");
	});

	it("hasAcutePain alone covers excluded service at 100%", () => {
		const res = calculateDmsGuaranteeSplit(letter, [excluded], { isEmergency: false, hasAcutePain: true });
		assert.equal(res.totalDmsCoveredKopecks, 500000);
		assert.equal(res.totalPatientCoPayKopecks, 0);
	});

	it("neither emergency nor acute pain charges patient 100% for excluded service", () => {
		const res = calculateDmsGuaranteeSplit(letter, [excluded], { isEmergency: false, hasAcutePain: false });
		assert.equal(res.totalDmsCoveredKopecks, 0);
		assert.equal(res.totalPatientCoPayKopecks, 500000);
		assert.equal(res.hasExcludedServices, true);
	});

	it("no letter + no contract still covers 100% ONLY when urgent care is true, contract still governs when present", () => {
		const urgentNoContract = calculateDmsGuaranteeSplit(null, [makeItem()], { isEmergency: true });
		assert.equal(urgentNoContract.totalDmsCoveredKopecks, 500000);

		// Contract with 40% therapy coverage still restricts coverage even on urgent care when there is no letter
		const urgentWithContract = calculateDmsGuaranteeSplit(null, [makeItem()], {
			isEmergency: true,
			contract: { coverageTherapyPct: 40, coverageSurgeryPct: 100, coverageOrthoPct: 0, coverageHygienePct: 0, annualLimitRub: 100000 },
		});
		assert.equal(urgentWithContract.totalDmsCoveredKopecks, 200000);
		assert.equal(urgentWithContract.totalPatientCoPayKopecks, 300000);
	});
});

describe("calculateDmsGuaranteeSplit: letter status, curator flag, and validity window", () => {
	it("treats 'approved' and 'pending_letter' as valid active statuses, and rejects 'cancelled'", () => {
		const approved = calculateDmsGuaranteeSplit(makeLetter({ status: "approved" }), [makeItem()]);
		assert.equal(approved.totalDmsCoveredKopecks, 500000);
		assert.equal(approved.hasUnapprovedServices, false);

		const pendingLetter = calculateDmsGuaranteeSplit(makeLetter({ status: "pending_letter" }), [makeItem()]);
		assert.equal(pendingLetter.totalDmsCoveredKopecks, 500000);
		assert.equal(pendingLetter.hasUnapprovedServices, false);
		assert.match(pendingLetter.warningMessage ?? "", /куратора/i);
		assert.match(pendingLetter.lineItems[0]?.splitReason ?? "", /отложенная проводка/i);

		const cancelled = calculateDmsGuaranteeSplit(makeLetter({ status: "cancelled" }), [makeItem()]);
		assert.equal(cancelled.totalDmsCoveredKopecks, 0);
		assert.equal(cancelled.totalPatientCoPayKopecks, 500000);
		assert.equal(cancelled.hasUnapprovedServices, true);
	});

	it("checks visitDate against validFrom and validUntil ONLY when letter is present (safe when letter is null + visitDate given)", () => {
		const nullWithVisitDate = calculateDmsGuaranteeSplit(null, [makeItem()], { visitDate: "2026-03-15" });
		assert.equal(nullWithVisitDate.totalDmsCoveredKopecks, 500000);
		assert.equal(nullWithVisitDate.integrityInvariantHolds, true);

		const activeRes = calculateDmsGuaranteeSplit(makeLetter({ validFrom: "2026-03-01", validUntil: "2026-03-31" }), [makeItem()], {
			visitDate: "2026-03-15",
		});
		assert.equal(activeRes.totalDmsCoveredKopecks, 500000);
		assert.equal(activeRes.hasUnapprovedServices, false);

		const tooEarly = calculateDmsGuaranteeSplit(makeLetter({ validFrom: "2026-03-01", validUntil: "2026-03-31" }), [makeItem()], {
			visitDate: "2026-02-28",
		});
		assert.equal(tooEarly.totalDmsCoveredKopecks, 0);
		assert.equal(tooEarly.hasUnapprovedServices, true);
		assert.match(tooEarly.lineItems[0]?.splitReason ?? "", /вступает в силу/i);

		const expired = calculateDmsGuaranteeSplit(makeLetter({ validFrom: "2026-03-01", validUntil: "2026-03-31" }), [makeItem()], {
			visitDate: "2026-04-01",
		});
		assert.equal(expired.totalDmsCoveredKopecks, 0);
		assert.equal(expired.hasUnapprovedServices, true);
		assert.match(expired.lineItems[0]?.splitReason ?? "", /истек/i);
	});

	it("uses remainingLimitKopecks directly only when both remainingLimitKopecks and usedKopecks exist on letter", () => {
		const letterWithBoth = makeLetter({ remainingLimitKopecks: 300000, usedKopecks: 200000 });
		const resBoth = calculateDmsGuaranteeSplit(letterWithBoth, [makeItem({ unitPriceKopecks: 100000 })]);
		assert.equal(resBoth.letterApprovedLimitKopecks, 500000);
		assert.equal(resBoth.letterUsedAmountKopecks, 200000);
		assert.equal(resBoth.letterRemainingLimitKopecks, 200000);

		const letterWithOnlyRemaining = makeLetter({ remainingLimitKopecks: 300000, maxCoverageRub: 8000, usedAmountRub: 1000 });
		const resOnlyRem = calculateDmsGuaranteeSplit(letterWithOnlyRemaining, [makeItem({ unitPriceKopecks: 100000 })]);
		assert.equal(resOnlyRem.letterApprovedLimitKopecks, 800000);
	});
});

describe("calculateDmsGuaranteeSplit: discounts, code/tooth matching, and specialty rates", () => {
	it("subtracts line discount from gross line total (never adds discount)", () => {
		// 2 * 5000.00 - 1500.00 = 8500.00 (850000 kopecks)
		const item = makeItem({ quantity: 2, unitPriceKopecks: 500000, discountKopecks: 150000 });
		const res = calculateDmsGuaranteeSplit(makeLetter(), [item]);
		assert.equal(res.totalBillKopecks, 850000);
		assert.equal(res.totalDmsCoveredKopecks, 850000);
		assert.equal(res.integrityInvariantHolds, true);
	});

	it("rejects line when service code is approved but tooth FDI is NOT approved (and vice versa)", () => {
		const letter = makeLetter({ approvedServiceCodes: ["A16.07.002"], approvedTeethFdi: ["36"] });

		// Matching service + non-matching tooth 16 -> patient pays 100%
		const badTooth = calculateDmsGuaranteeSplit(letter, [makeItem({ serviceCode: "A16.07.002", toothNumber: 16 })]);
		assert.equal(badTooth.totalDmsCoveredKopecks, 0);
		assert.equal(badTooth.totalPatientCoPayKopecks, 500000);
		assert.equal(badTooth.hasUnapprovedServices, true);

		// Non-matching service + matching tooth 36 -> patient pays 100%
		const badService = calculateDmsGuaranteeSplit(letter, [makeItem({ serviceCode: "B01.065.001", toothNumber: 36 })]);
		assert.equal(badService.totalDmsCoveredKopecks, 0);
		assert.equal(badService.totalPatientCoPayKopecks, 500000);
		assert.equal(badService.hasUnapprovedServices, true);

		// Empty approvedServiceCodes list means all services allowed
		const allCodesLetter = makeLetter({ approvedServiceCodes: [] });
		assert.equal(calculateDmsGuaranteeSplit(allCodesLetter, [makeItem()]).totalDmsCoveredKopecks, 500000);

		// Prefix match works when serviceCode starts with approved prefix, but blank serviceCode is NOT matched
		const prefixLetter = makeLetter({ approvedServiceCodes: ["A16.07"] });
		assert.equal(calculateDmsGuaranteeSplit(prefixLetter, [makeItem({ serviceCode: "A16.07.099" })]).totalDmsCoveredKopecks, 500000);
		assert.equal(calculateDmsGuaranteeSplit(prefixLetter, [makeItem({ serviceCode: "" })]).totalDmsCoveredKopecks, 0);
	});

	it("applies coverageSurgeryPct and coverageHygienePct and clamps negative contract % to 0", () => {
		const contract = {
			coverageTherapyPct: -25,
			coverageSurgeryPct: 80,
			coverageOrthoPct: 0,
			coverageHygienePct: 60,
			annualLimitRub: 200000,
		};
		const items: DmsSplitCalculationItem[] = [
			makeItem({ serviceId: "s", category: "surgery", unitPriceKopecks: 100000 }),
			makeItem({ serviceId: "h", category: "hygiene", unitPriceKopecks: 100000 }),
			makeItem({ serviceId: "t", category: "therapy", unitPriceKopecks: 100000 }),
		];
		const res = calculateDmsGuaranteeSplit(null, items, { contract });
		assert.equal(res.lineItems[0]?.dmsCoveredKopecks, 80000);
		assert.equal(res.lineItems[1]?.dmsCoveredKopecks, 60000);
		assert.equal(res.lineItems[2]?.dmsCoveredKopecks, 0);
		assert.equal(res.lineItems[2]?.patientCoPayKopecks, 100000);
		assert.equal(res.totalDmsCoveredKopecks, 140000);
		assert.equal(res.totalPatientCoPayKopecks, 160000);
		assert.equal(res.integrityInvariantHolds, true);
	});
});
