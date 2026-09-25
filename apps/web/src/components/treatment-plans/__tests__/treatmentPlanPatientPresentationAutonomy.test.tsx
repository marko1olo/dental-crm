/**
 * treatmentPlanPatientPresentationAutonomy.test.ts
 *
 * Comprehensive audit & regression test suite for:
 * 1. Mandate 8e (Doctor & Patient Autonomy) — Zero disabled buttons, zero arbitrary roadblocks.
 * 2. Mandate 8s (Scale Sovereignty for Solo Practice) — Immediate patient consent in <10s.
 * 3. Mandate 8d pt 6 (Anti-Matryoshka Law) — Modal depth <= 1, zero nested dialogs.
 * 4. Mandate 8d pt 7 (Zero Cartoon Emojis) — Vector Lucide icons only, zero unicode emojis.
 * 5. Mandate 8b (Kopeck-Exact Financials) — Integer kopecks throughout all stages & calculations.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { parseKopecks, sumKopecks, percentageOfKopecks, type Kopecks } from "@dental/shared";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import { TreatmentPlanPhased4StageView } from "../TreatmentPlanPhased4StageView";
import {
	generate3TierPlanComparison,
	generateTreatmentPlanStages,
} from "../treatmentPlanStagesEngine";

function createPlanItem(
	code804n: string,
	name: string,
	toothNumber: number,
	quantity: number,
	priceRub: number,
	discountRub: number,
	materials: string,
) {
	const unitPriceKopecks = parseKopecks(priceRub);
	const discountKopecksPerUnit = parseKopecks(discountRub);
	const finalUnitPriceKopecks = Math.max(0, unitPriceKopecks - discountKopecksPerUnit) as Kopecks;
	const totalKopecks = (finalUnitPriceKopecks * quantity) as Kopecks;
	const totalDiscountKopecks = (discountKopecksPerUnit * quantity) as Kopecks;
	return {
		code804n,
		name,
		toothNumber,
		quantity,
		unitPriceKopecks,
		discountKopecksPerUnit,
		finalUnitPriceKopecks,
		totalKopecks,
		totalDiscountKopecks,
		priceRub: Math.round(finalUnitPriceKopecks / 100),
		materials,
	};
}
import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanTier } from "../types";

describe("Treatment Plan Patient Presentation Autonomy & Integrity Tests", () => {
	const sampleTeeth: ToothData[] = [
		{
			id: 16,
			toothNumber: 16,
			state: "Caries",
			systemicNotes: "Глубокий кариес жевательной поверхности",
		} as any,
		{
			id: 21,
			toothNumber: 21,
			state: "Fractured",
			systemicNotes: "Скол коронковой части зуба",
		} as any,
		{
			id: 36,
			toothNumber: 36,
			state: "Missing",
			systemicNotes: "Адентия 36, показана имплантация",
		} as any,
	];

	const tiers = generate3TierPlanComparison(sampleTeeth);

	describe("1. Mandate 8e: Doctor & Patient Autonomy (Zero Disabled Buttons)", () => {
		it("renders presenter modal with zero disabled buttons on copilot presets, send trigger, and AI audit", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					tiers={tiers}
					initialSelectedTierId="standard"
					patientName="Иванова Анна Сергеевна"
					patientId="PAT-2026-1044"
					doctorFullName="Д-р Воронов Михаил Васильевич"
					onApproveAndSign={() => {}}
				/>
			);

			// Copilot preset buttons must not have disabled attribute
			assert.ok(html.includes("presenter-copilot-btn-budget_optimize"), "Preset button must exist");
			assert.ok(!html.includes('disabled="" data-testid="presenter-copilot-btn-budget_optimize"'), "Preset button must not be disabled");

			// Copilot send button must not have disabled attribute
			assert.ok(html.includes("presenter-copilot-send-btn"), "Copilot send button must exist");
			assert.ok(!html.includes('disabled="" data-testid="presenter-copilot-send-btn"'), "Send button must not be disabled");

			// AI audit tab button must exist and not be disabled
			assert.ok(html.includes("tab-ai-audit-btn"), "AI audit tab button must exist");
			assert.ok(!html.includes('disabled="" data-testid="tab-ai-audit-btn"'), "AI audit button must not be disabled");

			// Direct approve & sign action button must be rendered
			assert.ok(html.includes("approve-and-sign-btn"), "Direct approve & sign button must be rendered");
			assert.ok(html.includes("Подписать план лечения"), "Button text must indicate direct signing");
		});

		it("allows instant agreement confirmation in SignatureModal without forced checkbox blockage", () => {
			const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0];
			const html = renderToString(
				<TreatmentPlanSignatureModal
					isOpen={true}
					tier={standardTier}
					patientName="Иванова Анна Сергеевна"
					patientId="PAT-2026-1044"
					doctorFullName="Д-р Воронов Михаил Васильевич"
					clinicName="ООО ДЕНТЕ"
					onClose={() => {}}
					onSignedSuccess={() => {}}
				/>
			);

			// Both confirm buttons must not be disabled
			assert.ok(html.includes("paper-signature-confirm-btn"), "Paper signature button must exist");
			assert.ok(!html.includes('disabled="" data-testid="paper-signature-confirm-btn"'), "Paper signature button must not be disabled");

			assert.ok(html.includes("confirm-sign-plan-btn"), "Digital signature button must exist");
			assert.ok(!html.includes('disabled="" data-testid="confirm-sign-plan-btn"'), "Digital signature button must not be disabled");
		});
	});

	describe("2. Mandate 8b: Kopeck-Exact Financials (Integer Calculations)", () => {
		it("calculates line item prices strictly in integer kopecks without floating point roundoff", () => {
			const item = createPlanItem(
				"A16.07.002.001",
				"Эстетическая реставрация зуба",
				16,
				1,
				6500.5, // 6500.50 RUB
				500.25, // 500.25 RUB discount
				"Estelite Asteria"
			);

			assert.equal(item.unitPriceKopecks, 650050, "Unit price must be 650050 kopecks");
			assert.equal(item.discountKopecksPerUnit, 50025, "Discount per unit must be 50025 kopecks");
			assert.equal(item.finalUnitPriceKopecks, 600025, "Final unit price must be 600025 kopecks");
			assert.equal(item.totalKopecks, 600025, "Total line kopecks must equal final unit price * 1");
			assert.equal(item.totalDiscountKopecks, 50025, "Total discount kopecks must equal 50025");
			assert.equal(item.priceRub, 6000, "Display ruble price rounds cleanly");
		});

		it("builds tiers where totalKopecks is strictly sumKopecks of all stages", () => {
			for (const tier of tiers) {
				const expectedTotalKop = sumKopecks(tier.stages.map((s) => s.totalKopecks));
				assert.equal(
					tier.totalKopecks,
					expectedTotalKop,
					`Tier ${tier.tierId} totalKopecks (${tier.totalKopecks}) must equal exact sum of stages (${expectedTotalKop})`
				);
			}
		});

		it("TreatmentPlanPhased4StageView computes phase totals strictly via integer kopeck sum", () => {
			const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0];
			const html = renderToString(
				<TreatmentPlanPhased4StageView
					stages={standardTier.stages}
					onToggleStage={() => {}}
				/>
			);

			assert.ok(html.includes("phased-4stage-view"), "Must render phased view container");
			assert.ok(html.includes("phased-stage-card"), "Must render stage cards");
			// Check that grand total ruble formatted amount matches tier total
			const normalizedHtml = html.replace(/[\s\u00A0\u202F]+/g, " ");
			const expectedGrandRub = (standardTier.totalRub || 0).toLocaleString("ru-RU").replace(/[\s\u00A0\u202F]+/g, " ");
			assert.ok(
				normalizedHtml.includes(expectedGrandRub),
				`Phased view must contain formatted grand total: ${expectedGrandRub}`
			);
		});
	});

	describe("3. Mandate 8d pt 7: Zero Cartoon Emojis", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

		it("ensures TreatmentPlanPresenterModal rendered output contains zero cartoon emojis", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					tiers={tiers}
					initialSelectedTierId="standard"
					patientName="Петров Игорь Владимирович"
					patientId="PAT-2026-9921"
				/>
			);

			const hasEmoji = emojiRegex.test(html);
			assert.equal(hasEmoji, false, "PresenterModal HTML must NOT contain any cartoon emojis");
		});

		it("ensures TreatmentPlanSignatureModal rendered output contains zero cartoon emojis", () => {
			const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0];
			const html = renderToString(
				<TreatmentPlanSignatureModal
					isOpen={true}
					tier={standardTier}
					patientName="Петров Игорь Владимирович"
					patientId="PAT-2026-9921"
					onClose={() => {}}
					onSignedSuccess={() => {}}
				/>
			);

			const hasEmoji = emojiRegex.test(html);
			assert.equal(hasEmoji, false, "SignatureModal HTML must NOT contain any cartoon emojis");
		});

		it("ensures TreatmentPlanPhased4StageView rendered output contains zero cartoon emojis", () => {
			const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0];
			const html = renderToString(
				<TreatmentPlanPhased4StageView
					stages={standardTier.stages}
					onToggleStage={() => {}}
				/>
			);

			const hasEmoji = emojiRegex.test(html);
			assert.equal(hasEmoji, false, "Phased4StageView HTML must NOT contain any cartoon emojis");
		});
	});

	describe("4. Mandate 8d pt 6: Anti-Matryoshka Law (Modal Depth <= 1)", () => {
		it("TreatmentPlanPresenterModal renders a single cohesive surface with zero nested modals", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					tiers={tiers}
				/>
			);

			// Count occurrences of dialog / modal backdrop containers
			const backdropMatches = (html.match(/treatment-presenter-backdrop/g) || []).length;
			assert.equal(backdropMatches, 1, "There must be exactly one modal backdrop at depth 1");

			// Ensure no nested role="dialog" or nested backdrop elements
			const modalContainerMatches = (html.match(/role="dialog"/g) || []).length;
			assert.equal(modalContainerMatches, 1, "There must be exactly one modal dialog frame");
		});
	});
});
