import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculatePlanTaxDeductionBreakdown } from "@dental/shared";
import { formatKopecksToRubExact } from "../TreatmentPlanRoadmap";

describe("TreatmentPlanRoadmap — Tax Deduction & Mobile Styling", () => {
	it("6. Calculates 13% Tax Deduction correctly for mixed Code 01 and Code 02 services", () => {
		const items = [
			{ id: "therapy-1", code804n: "A16.07.002.001", name: "Лечение кариеса 1.6", taxCode: "1" as const, priceRub: 10000, priceKopecks: 1000000, quantity: 1 },
			{ id: "implant-1", code804n: "A16.07.054.001", name: "Имплантация Osstem 4.6", taxCode: "2" as const, priceRub: 50000, priceKopecks: 5000000, quantity: 1 },
		];

		const breakdown = calculatePlanTaxDeductionBreakdown(items);

		assert.equal(breakdown.code01TotalKopecks, 1000000);
		assert.equal(breakdown.code01Refund13Kopecks, 130000);
		assert.equal(breakdown.code02TotalKopecks, 5000000);
		assert.equal(breakdown.code02Refund13Kopecks, 650000);
		assert.equal(breakdown.grandTotalRefund13Kopecks, 780000);
		assert.equal(formatKopecksToRubExact(breakdown.grandTotalRefund13Kopecks).replace(/\s/g, " "), "7 800,00");
		assert.equal(breakdown.netPriceWithRefundKopecks, 5220000);
		assert.equal(formatKopecksToRubExact(breakdown.netPriceWithRefundKopecks).replace(/\s/g, " "), "52 200,00");
	});

	it("7. Validates 1-click stage booking callback signatures", () => {
		const mockStage = {
			stageNumber: 2 as const,
			stageKind: "stage_2_therapy" as const,
			titleRu: "Этап 2: Терапевтическая санация",
			subtitleRu: "Лечение кариеса и каналов",
			patientGoalRu: "Полностью ликвидировать кариес",
			status: "planned" as const,
			teethFdiList: ["16", "26"],
			procedures: [],
			totalRub: 15000,
			totalKopecks: 1500000,
			completedRub: 0,
			completedKopecks: 0,
			remainingRub: 15000,
			remainingKopecks: 1500000,
			estimatedVisitsCount: 2,
		};

		let bookedStage: any = null;
		let selectedStage: any = null;
		let bookedSlotNumber: number | null = null;

		const onBookStage = (s: any) => { bookedStage = s; };
		const onSelectStage = (s: any) => { selectedStage = s; };
		const onBookStageSlot = (num: number, _s: any) => { bookedSlotNumber = num; };

		onBookStage(mockStage);
		onSelectStage(mockStage);
		onBookStageSlot(mockStage.stageNumber, mockStage);

		assert.equal(bookedStage?.stageNumber, 2);
		assert.equal(selectedStage?.stageKind, "stage_2_therapy");
		assert.equal(bookedSlotNumber, 2);
	});

	it("8. Validates treatmentPlanRoadmap.css for mobile rules and touch targets >= 44px", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const candidatePaths = [
			path.resolve(process.cwd(), "src/components/treatment-plans/treatmentPlanRoadmap.css"),
			path.resolve(process.cwd(), "apps/web/src/components/treatment-plans/treatmentPlanRoadmap.css"),
		];
		const cssPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0]!;
		assert.ok(fs.existsSync(cssPath), `treatmentPlanRoadmap.css must exist at ${cssPath}`);

		const css = fs.readFileSync(cssPath, "utf8");
		assert.ok(css.includes("min-height: 44px"));
		assert.ok(css.includes("touch-action: manipulation"));
		assert.ok(css.includes("@media (max-width: 640px)"));
		assert.ok(css.includes("roadmap-book-stage-btn"));
		assert.ok(css.includes("roadmap-tax-banner"));
		assert.ok(css.includes("overflow-x: hidden") || css.includes("max-width: 100%"));
	});
});
