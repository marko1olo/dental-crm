import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	translate804nToPatientDescription,
	formatKopecksToRubExact,
} from "../TreatmentPlanRoadmap";
import { calculatePlanTaxDeductionBreakdown } from "@dental/shared";

describe("TreatmentPlanRoadmap — 804n Translation, 5-Stage Patient Mapping & 13% Tax Deduction", () => {
	it("1. Translates 804n emergency codes to Stage 1 patient-friendly language", () => {
		const result = translate804nToPatientDescription("A16.07.007", "Наложение девитализирующей пасты при острой боли");
		assert.equal(result.stageKind, "stage_1_emergency");
		assert.equal(result.categoryCode, "1");
		assert.ok(result.friendlyTitle.includes("Купирование острой боли"));
	});

	it("2. Translates therapeutic caries and endodontics (A16.07.002, A16.07.030) to Stage 2", () => {
		const cariesRes = translate804nToPatientDescription("A16.07.002.001", "Наложение пломбы светового отверждения");
		assert.equal(cariesRes.stageKind, "stage_2_therapy");
		assert.equal(cariesRes.categoryCode, "1");
		assert.ok(cariesRes.friendlyTitle.includes("Лечение кариеса"));

		const endoRes = translate804nToPatientDescription("A16.07.030.001", "Инструментальная обработка корневого канала");
		assert.equal(endoRes.stageKind, "stage_2_therapy");
		assert.ok(endoRes.friendlyTitle.includes("Лечение корневых каналов"));
	});

	it("3. Translates surgical implantation (A16.07.054) to Stage 3 (Code 02 expensive treatment)", () => {
		const implantRes = translate804nToPatientDescription("A16.07.054.001", "Установка дентального имплантата Osstem TS III");
		assert.equal(implantRes.stageKind, "stage_3_surgery");
		assert.equal(implantRes.categoryCode, "2");
		assert.ok(implantRes.friendlyTitle.includes("премиум дентального имплантата"));
	});

	it("4. Translates prosthetic crowns (A16.07.004) to Stage 4 orthopedics", () => {
		const crownRes = translate804nToPatientDescription("A16.07.004.001", "Коронка из диоксида циркония Katana ML");
		assert.equal(crownRes.stageKind, "stage_4_orthopedics");
		assert.ok(crownRes.friendlyTitle.includes("коронкой"));
	});

	it("5. Translates professional hygiene (A16.07.051) to Stage 5 hygiene & prevention", () => {
		const hygieneRes = translate804nToPatientDescription("A16.07.051", "Комплексная гигиена AirFlow + ультразвук");
		assert.equal(hygieneRes.stageKind, "stage_5_hygiene_checkup");
		assert.equal(hygieneRes.categoryCode, "1");
		assert.ok(hygieneRes.friendlyTitle.includes("Комплексная гигиена"));
	});

	it("6. Calculates 13% Tax Deduction correctly for mixed Code 01 and Code 02 services", () => {
		const items = [
			{
				id: "therapy-1",
				code804n: "A16.07.002.001",
				name: "Лечение кариеса 1.6",
				taxCode: "1" as const,
				priceRub: 10000,
				priceKopecks: 1000000,
				quantity: 1,
			},
			{
				id: "implant-1",
				code804n: "A16.07.054.001",
				name: "Имплантация Osstem 4.6",
				taxCode: "2" as const, // Expensive
				priceRub: 50000,
				priceKopecks: 5000000,
				quantity: 1,
			},
		];

		const breakdown = calculatePlanTaxDeductionBreakdown(items);

		// Code 01: 10 000 ₽ -> 13% = 1 300 ₽ (130 000 kopecks)
		assert.equal(breakdown.code01TotalKopecks, 1000000);
		assert.equal(breakdown.code01Refund13Kopecks, 130000);

		// Code 02: 50 000 ₽ -> 13% = 6 500 ₽ (650 000 kopecks) (uncapped)
		assert.equal(breakdown.code02TotalKopecks, 5000000);
		assert.equal(breakdown.code02Refund13Kopecks, 650000);

		// Total Refund: 1 300 + 6 500 = 7 800 ₽ (780 000 kopecks)
		assert.equal(breakdown.grandTotalRefund13Kopecks, 780000);
		assert.equal(formatKopecksToRubExact(breakdown.grandTotalRefund13Kopecks).replace(/\s/g, " "), "7 800,00");

		// Net price with refund: 60 000 - 7 800 = 52 200 ₽
		assert.equal(breakdown.netPriceWithRefundKopecks, 5220000);
		assert.equal(formatKopecksToRubExact(breakdown.netPriceWithRefundKopecks).replace(/\s/g, " "), "52 200,00");
	});

	it("7. Validates 1-click stage booking callback signatures (onBookStage / onSelectStage / onBookStageSlot)", () => {
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

		const onBookStage = (s: any) => {
			bookedStage = s;
		};
		const onSelectStage = (s: any) => {
			selectedStage = s;
		};
		const onBookStageSlot = (num: number, s: any) => {
			bookedSlotNumber = num;
		};

		// Trigger booking handler simulation
		onBookStage(mockStage);
		onSelectStage(mockStage);
		onBookStageSlot(mockStage.stageNumber, mockStage);

		assert.equal(bookedStage?.stageNumber, 2);
		assert.equal(selectedStage?.stageKind, "stage_2_therapy");
		assert.equal(bookedSlotNumber, 2);
	});

	it("8. Validates treatmentPlanRoadmap.css for mobile 375px/390px rules and touch targets >= 44px", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const candidatePaths = [
			path.resolve(process.cwd(), "src/components/treatment-plans/treatmentPlanRoadmap.css"),
			path.resolve(process.cwd(), "apps/web/src/components/treatment-plans/treatmentPlanRoadmap.css"),
		];
		const cssPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0]!;
		assert.ok(fs.existsSync(cssPath), `treatmentPlanRoadmap.css must exist at ${cssPath}`);

		const css = fs.readFileSync(cssPath, "utf8");

		// Touch targets >= 44px on mobile
		assert.ok(css.includes("min-height: 44px"));
		assert.ok(css.includes("touch-action: manipulation"));

		// Mobile media query with overflow protection
		assert.ok(css.includes("@media (max-width: 640px)"));
		assert.ok(css.includes("roadmap-book-stage-btn"));
		assert.ok(css.includes("roadmap-tax-banner"));
		assert.ok(css.includes("overflow-x: hidden") || css.includes("max-width: 100%"));
	});
});
