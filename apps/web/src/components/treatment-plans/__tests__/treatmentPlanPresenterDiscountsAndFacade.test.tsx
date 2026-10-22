/**
 * treatmentPlanPresenterDiscountsAndFacade.test.tsx — скидки врача и фасадные модалки.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
	applyDoctorDiscountToStages,
	applyDoctorFixedDiscountToStages,
	recalculateTierTotals,
} from "../treatmentPlanMath";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { PlanScenarioComparisonModal } from "../PlanScenarioComparisonModal";
import { sampleTeethSsot, standardTierSsot } from "./helpers/ssotTestHelpers";

describe("Treatment Plan Presenter — Doctor Discounts & Modal Consolidation", () => {
	it("applies fixed ruble discount proportionally across stages without precision loss", () => {
		const initialTotalRub = standardTierSsot.totalRub;
		const discountRub = 15000;

		const discountedStages = applyDoctorFixedDiscountToStages(standardTierSsot.stages, discountRub);
		const recalculatedTier = recalculateTierTotals(standardTierSsot, discountedStages);

		const difference = Math.abs(recalculatedTier.totalRub - (initialTotalRub - discountRub));
		expect(difference).toBeLessThanOrEqual(5);
	});

	it("applies discount exclusively to a target stage when stageNumber is provided", () => {
		const stage1Initial = standardTierSsot.stages.find((s) => s.stageNumber === 1)!.totalRub;
		const stage2Initial = standardTierSsot.stages.find((s) => s.stageNumber === 2)!.totalRub;

		const discountedStages = applyDoctorDiscountToStages(standardTierSsot.stages, 20, 1);
		const stage1Discounted = discountedStages.find((s) => s.stageNumber === 1)!.totalRub;
		const stage2Discounted = discountedStages.find((s) => s.stageNumber === 2)!.totalRub;

		expect(stage1Discounted).toBe(Math.round(stage1Initial * 0.8));
		expect(stage2Discounted).toBe(stage2Initial);
	});

	it("allows 100% warranty discount reducing plan price to 0 ₽", () => {
		const discountedStages = applyDoctorDiscountToStages(standardTierSsot.stages, 100);
		const recalculatedTier = recalculateTierTotals(standardTierSsot, discountedStages);
		expect(recalculatedTier.totalRub).toBe(0);
	});

	it("renders PlanScenarioComparisonModal facade cleanly delegating to SSOT", () => {
		const html = renderToString(
			<PlanScenarioComparisonModal isOpen={true} patientName="Иванова Анна" doctorName="Д-р Орлов" isDemoMode={true} />
		);
		expect(html).toContain("Студия сравнения планов лечения");
		expect(html).toContain("Иванова Анна");
	});

	it("renders full TreatmentPlanPresenterModal with tools strip and zero cartoon emojis", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				patientName="Кузнецов Петр"
				doctorFullName="Д-р Ковалев С. П."
				teeth={sampleTeethSsot}
				planId="PLAN-TEST-42"
				patientId="PAT-101"
			/>
		);

		expect(html).toContain('data-testid="treatment-plan-presenter-modal"');
		expect(html).toContain('data-testid="toggle-discount-panel-btn"');
		expect(html).toContain('data-testid="treatment-plan-fdi-formula"');
		expect(html).toContain('data-testid="stages-accordion-section"');

		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u;
		expect(emojiRegex.test(html)).toBe(false);
	});
});
