/**
 * treatmentPlanPresenterCopilotActions.test.tsx — тулбар Copilot в модалке презентера и расчет рассрочки/НДФЛ.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { calculatePlanTaxDeductionBreakdown, parseKopecks } from "@dental/shared";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { COPILOT_PRESET_ACTIONS } from "../../../services/ai/treatmentPlanCopilot";
import { computeTierInstallments, generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanItem } from "../types";

describe("TreatmentPlanPresenterModal — Copilot Actions, Installments & NDFL", () => {
	const sampleTeeth: ToothData[] = [
		{ id: 16, toothNumber: 16, state: "Caries" } as any,
		{ id: 36, toothNumber: 36, state: "Missing" } as any,
	];
	const sampleTiers = generate3TierPlanComparison(sampleTeeth);

	it("renders AI Copilot quick actions toolbar inside TreatmentPlanPresenterModal", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				patientName="Смирнова Екатерина Васильевна"
			/>,
		);

		assert.ok(html.includes("AI Copilot у кресла"));
		assert.ok(html.includes("presenter-copilot-btn-budget_optimize"));
		assert.ok(html.includes("presenter-copilot-btn-implant_to_bridge"));
		assert.ok(html.includes("presenter-copilot-btn-all_on_4_upper"));
		assert.ok(html.includes("presenter-copilot-btn-all_on_4_lower"));
		assert.ok(html.includes("presenter-copilot-btn-bone_graft_bio_oss"));
		assert.ok(html.includes("presenter-copilot-btn-recalculate_anesthesia_isolation"));
	});

	it("preset actions constant contains all 6 mandatory actions with metadata", () => {
		assert.equal(COPILOT_PRESET_ACTIONS.length, 6);
		const ids = COPILOT_PRESET_ACTIONS.map((a) => a.id);
		assert.ok(ids.includes("budget_optimize"));
		assert.ok(ids.includes("implant_to_bridge"));
		assert.ok(ids.includes("all_on_4_upper"));
		assert.ok(ids.includes("all_on_4_lower"));
		assert.ok(ids.includes("bone_graft_bio_oss"));
		assert.ok(ids.includes("recalculate_anesthesia_isolation"));
	});

	it("installments (3, 6, 12, 24 mo) and 13% NDFL recalculate accurately for price edits", () => {
		const totalKopecks = parseKopecks(120000);
		const installments = computeTierInstallments(totalKopecks);

		assert.equal(installments[3].monthlyPaymentRub, 40000);
		assert.equal(installments[6].monthlyPaymentRub, 20000);
		assert.equal(installments[12].monthlyPaymentRub, 10000);
		assert.equal(installments[24].monthlyPaymentRub, 5000);

		const sampleItems: TreatmentPlanItem[] = [
			{
				id: "test-item-1",
				code804n: "A16.07.002.001",
				name: "Терапевтическое лечение",
				category: "Терапия",
				priceRub: 50000,
				unitPriceRub: 50000,
				discountRub: 0,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
			},
		];
		const ndfl = calculatePlanTaxDeductionBreakdown(sampleItems);
		assert.equal(ndfl.grandTotalRefund13Rub, 6500);
		assert.equal(ndfl.netPriceWithRefundRub, 43500);
	});
});
