/**
 * treatmentPlanPresenterFinancialsAndEmojiClean.test.tsx — точность копеек и чистота от эмодзи.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { sumKopecks } from "@dental/shared";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import { TreatmentPlanPhased4StageView } from "../TreatmentPlanPhased4StageView";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import { createPlanItem, sampleTeethPresentation } from "./helpers/presentationTestHelpers";

describe("Treatment Plan Presenter — Точность копеек и отсутствие эмодзи (Мандаты 8b, 8d)", () => {
	const tiers = generate3TierPlanComparison(sampleTeethPresentation);
	const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

	it("calculates line item prices strictly in integer kopecks without floating point roundoff", () => {
		const item = createPlanItem("A16.07.002.001", "Эстетическая реставрация зуба", 16, 1, 6500.5, 500.25, "Estelite Asteria");
		assert.equal(item.unitPriceKopecks, 650050);
		assert.equal(item.discountKopecksPerUnit, 50025);
		assert.equal(item.finalUnitPriceKopecks, 600025);
		assert.equal(item.totalKopecks, 600025);
		assert.equal(item.totalDiscountKopecks, 50025);
		assert.equal(item.priceRub, 6000);
	});

	it("builds tiers where totalKopecks is strictly sumKopecks of all stages", () => {
		for (const tier of tiers) {
			const expectedTotalKop = sumKopecks(tier.stages.map((s) => s.totalKopecks));
			assert.equal(tier.totalKopecks, expectedTotalKop);
		}
	});

	it("TreatmentPlanPhased4StageView computes phase totals strictly via integer kopeck sum", () => {
		const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0];
		const html = renderToString(<TreatmentPlanPhased4StageView stages={standardTier.stages} onToggleStage={() => {}} />);

		assert.ok(html.includes("phased-4stage-view"));
		assert.ok(html.includes("phased-stage-card"));
		const normalizedHtml = html.replace(/[\s\u00A0\u202F]+/g, " ");
		const expectedGrandRub = (standardTier.totalRub || 0).toLocaleString("ru-RU").replace(/[\s\u00A0\u202F]+/g, " ");
		assert.ok(normalizedHtml.includes(expectedGrandRub));
	});

	it("ensures TreatmentPlanPresenterModal and SignatureModal output contains zero cartoon emojis", () => {
		const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0];
		const htmlPresenter = renderToString(<TreatmentPlanPresenterModal isOpen={true} onClose={() => {}} tiers={tiers} />);
		assert.equal(emojiRegex.test(htmlPresenter), false);

		const htmlSignature = renderToString(<TreatmentPlanSignatureModal isOpen={true} tier={standardTier} patientName="Петров И.В." patientId="PAT-1" onClose={() => {}} onSignedSuccess={() => {}} />);
		assert.equal(emojiRegex.test(htmlSignature), false);
	});
});
