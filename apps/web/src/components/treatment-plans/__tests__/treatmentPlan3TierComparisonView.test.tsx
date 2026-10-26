/**
 * treatmentPlan3TierComparisonView.test.tsx — отображение 3-уровневого сравнения (Apple HIG, Segmented Control).
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlan3TierComparison } from "../TreatmentPlan3TierComparison";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import { sampleTiers3Tier } from "./helpers/threeTierTestHelpers";

import type { TreatmentPlanTierId } from "../types";

const baseProps = {
	tiers: sampleTiers3Tier,
	selectedTierId: "optimum" as TreatmentPlanTierId,
	onSelectTier: () => {},
	onApproveAndSign: () => {},
	onOpenInstallment: () => {},
	onPrintContract: () => {},
};

describe("TreatmentPlan3TierComparison — View & Mobile Segmented Control", () => {
	it("renders 3-tier side-by-side comparison with sticky bottom approval actions", () => {
		const html = renderToString(<TreatmentPlan3TierComparison {...baseProps} />);

		assert.ok(html.includes("3-Tier Сравнение планов"));
		assert.ok(html.includes("Рассрочка 0%"));
		assert.ok(html.includes("Этапы (30/40/30)"));
		assert.ok(html.includes("Утвердить план"));
		assert.ok(html.includes("sticky bottom-0"));
		assert.ok(html.includes("tier-card-optimum"));
		assert.ok(html.includes("tier-card-standard"));
		assert.ok(html.includes("tier-card-economy"));
	});

	it("renders Apple HIG native Segmented Control on mobile screens (<= 640px)", () => {
		const html = renderToString(<TreatmentPlan3TierComparison {...baseProps} />);

		assert.ok(html.includes("treatment-3tier-segmented-control"));
		assert.ok(html.includes("sm:hidden"));
		assert.ok(html.includes("segmented-tab-optimum"));
		assert.ok(html.includes("segmented-tab-standard"));
		assert.ok(html.includes("segmented-tab-economy"));
		assert.ok(html.includes("tier-card-mobile-optimum"));
	});

	it("renders 3-tier materials headline, service life, and messenger copy buttons", () => {
		const html = renderToString(<TreatmentPlan3TierComparison {...baseProps} selectedTierId={"standard" as TreatmentPlanTierId} />);

		assert.ok(html.includes("Эконом"));
		assert.ok(html.includes("Оптимум"));
		assert.ok(html.includes("Премиум"));
		assert.ok(html.includes("Клинические материалы"));
		assert.ok(html.includes("Срок службы"));
		assert.ok(html.includes("data-testid=\"top-copy-messenger-btn\""));
	});

	it("renders rich clinical turnkey presets with zero 0 ₽ values when patient has no charted pathology", () => {
		const emptyTiers = generate3TierPlanComparison([]);
		assert.equal(emptyTiers.length, 3);
		assert.equal(emptyTiers[0]?.totalRub, 45000);
		assert.equal(emptyTiers[1]?.totalRub, 145000);
		assert.equal(emptyTiers[2]?.totalRub, 380000);

		const html = renderToString(<TreatmentPlan3TierComparison {...baseProps} tiers={emptyTiers} />);
		assert.ok(html.includes("45 000"));
		assert.ok(html.includes("145 000"));
		assert.ok(html.includes("380 000"));
		assert.equal(html.includes("0 ₽/мес"), false);
	});

	it("eliminates button landfill in 3-tier toolbar: clean segmented controls and parameters dropdown", () => {
		const html = renderToString(<TreatmentPlan3TierComparison {...baseProps} onOpenComparatorStudio={() => {}} />);
		assert.ok(html.includes("data-testid=\"tp-3tier-params-btn\""));
		assert.ok(html.includes("Параметры сметы"));
		assert.ok(html.includes("Вычет 13% (НДФЛ)"));
		assert.ok(html.includes("Студия сравнения планов"));
	});
});
