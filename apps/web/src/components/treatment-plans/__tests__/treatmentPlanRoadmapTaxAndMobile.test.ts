import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculatePlanTaxDeductionBreakdown } from "@dental/shared";
import { formatKopecksToRubExact, TreatmentPlanRoadmap } from "../roadmap";

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

	it("7. Renders TreatmentPlanRoadmap with canonical stage controls, tax banner, and touch classes", () => {
		const stage2 = {
			stageNumber: 2 as const,
			stageKind: "stage_2_therapy" as const,
			titleRu: "Этап 2: Терапевтическая санация",
			subtitleRu: "Лечение кариеса и каналов",
			patientGoalRu: "Полностью ликвидировать кариес",
			timelineRu: "1–2 недели",
			preparationRu: "Профессиональная гигиена",
			warrantyRu: "1 год",
			status: "planned" as const,
			teethFdiList: ["16", "26"],
			procedures: [
				{
					id: "proc-1",
					code804n: "A16.07.002.001",
					medicalTitleRu: "Лечение кариеса",
					patientFriendlyTitleRu: "Лечение кариеса 1.6",
					toothFdi: "16",
					priceRub: 15000,
					priceKopecks: 1500000,
					quantity: 1,
					categoryCode: "1" as const,
				},
			],
			totalRub: 15000,
			totalKopecks: 1500000,
			completedRub: 0,
			completedKopecks: 0,
			remainingRub: 15000,
			remainingKopecks: 1500000,
			estimatedVisitsCount: 2,
		};

		const html = renderToStaticMarkup(
			React.createElement(TreatmentPlanRoadmap, {
				customRoadmapStages: [stage2],
				planTitle: "Комплексный план санации",
				patientFullName: "Соколов Дмитрий",
				curatingDoctorName: "Др. Орлов",
				onBookStage: () => {},
				onSelectStage: () => {},
				onBookStageSlot: () => {},
				onRequestTaxCertificate: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="treatment-plan-roadmap"'));
		assert.ok(html.includes('data-testid="roadmap-tax-banner"'));
		assert.ok(html.includes('data-testid="request-tax-cert-btn"'));
		assert.ok(html.includes("Этап 2: Терапевтическая санация"));
		assert.ok(html.includes('data-testid="roadmap-send-to-visit-2"'));
		assert.ok(html.includes('data-testid="roadmap-send-to-invoice-2"'));
		assert.ok(html.includes("min-h-[44px]"));
		assert.equal(html.includes("1 клик"), false);
	});
});
