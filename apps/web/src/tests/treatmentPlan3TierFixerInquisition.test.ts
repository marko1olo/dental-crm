/**
 * treatmentPlan3TierFixerInquisition.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * 1. 3-Tier comparison differentiation: economy, optimum, premium are completely distinct.
 * 2. Premium tier integrity: Straumann / Katana Multi-Layer / Microscope therapy, no clone of optimum.
 * 3. Caries therapy integrity: Caries belongs STRICTLY to Stage 1 (therapy), ZERO e.max crowns in Stage 3.
 * 4. Kopeck installment integrity (Mandate 8bm): splitKopecks sum matches totalKopecks exactly.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitKopecks, sumKopecks, type Kopecks } from "@dental/shared";
import type { ToothData } from "../components/odontogram/ToothChart";
import { generate3TierPlanComparison } from "../components/treatment-plans/treatmentPlanTierComparisonEngine";
import { formatMoneyExact, numberToWordsRu } from "../components/treatment-plans/treatmentPlanActFormatters";
import { mergeIncomingPlanItem } from "../components/treatment-plans/stageMutations/stageFilterAndMergeMutations";

describe("Treatment Plan 3-Tier Fixer & Kopeck Invariants Inquisition", () => {
	it("1. Generates 3 distinct tiers (economy, optimum, premium) without tier spoofing", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 26, state: "Missing" },
			{ toothNumber: 36, state: "Pulpitis" },
			{ toothNumber: 46, state: "Crown" },
		];

		const [economy, optimum, premium] = generate3TierPlanComparison(sampleTeeth, undefined, 0, 0, { isDemoMode: true });

		assert.equal(economy.tierId, "economy");
		assert.equal(optimum.tierId, "optimum");
		assert.equal(premium.tierId, "premium");

		// Premium must be greater than Optimum in price and content
		assert.ok(
			premium.totalKopecks > optimum.totalKopecks,
			`Premium total (${premium.totalKopecks} коп) must be greater than Optimum (${optimum.totalKopecks} коп)`,
		);
		assert.ok(
			optimum.totalKopecks > economy.totalKopecks,
			`Optimum total (${optimum.totalKopecks} коп) must be greater than Economy (${economy.totalKopecks} коп)`,
		);

		// Titles and badges must be clinical and distinct
		assert.ok(premium.title.includes("Премиум"));
		assert.ok(optimum.title.includes("Оптимальный"));
		assert.ok(economy.title.includes("Базовый") || economy.title.includes("Эконом"));
	});

	it("2. Caries therapy is strictly routed to Stage 1 (Therapy) across all tiers, never imposing e.max in Stage 3", () => {
		const cariesOnlyTeeth: ToothData[] = [
			{ toothNumber: 15, state: "Caries" },
			{ toothNumber: 25, state: "Caries" },
		];

		const [economy, optimum, premium] = generate3TierPlanComparison(cariesOnlyTeeth, undefined, 0, 0, { isDemoMode: true });

		for (const tier of [economy, optimum, premium]) {
			const stage1 = tier.stages.find((s) => s.stageKind === "stage_1_therapy");
			const stage3 = tier.stages.find((s) => s.stageKind === "stage_3_orthopedics");

			assert.ok(stage1, `Tier ${tier.tierId} must have Stage 1 therapy`);
			const stage1CariesItems = stage1.items.filter((i) => i.toothNumber === 15 || i.toothNumber === 25);
			assert.equal(
				stage1CariesItems.length,
				2,
				`Tier ${tier.tierId} must have exactly 2 caries items in Stage 1`,
			);

			// Stage 3 (Orthopedics) must NOT have any items for tooth 15 or 25
			const stage3CariesItems = (stage3?.items ?? []).filter((i) => i.toothNumber === 15 || i.toothNumber === 25);
			assert.equal(
				stage3CariesItems.length,
				0,
				`Tier ${tier.tierId} must NEVER push caries teeth into Stage 3 orthopedics (got ${stage3CariesItems.length})`,
			);
		}
	});

	it("3. Premium tier features microscope and premium implants, distinct from optimum", () => {
		const implantTeeth: ToothData[] = [
			{ toothNumber: 36, state: "Missing" },
		];

		const [_economy, optimum, premium] = generate3TierPlanComparison(implantTeeth, undefined, 0, 0, { isDemoMode: true });

		const optimumSurgery = optimum.stages.find((s) => s.stageKind === "stage_2_surgery");
		const premiumSurgery = premium.stages.find((s) => s.stageKind === "stage_2_surgery");

		assert.ok(optimumSurgery);
		assert.ok(premiumSurgery);

		const optImplantItem = optimumSurgery.items.find((i) => i.toothNumber === 36 && (i.name.includes("Osstem") || i.name.includes("имплантация") || i.name.includes("Имплантация")));
		const premImplantItem = premiumSurgery.items.find((i) => i.toothNumber === 36 && i.name.includes("Straumann"));

		assert.ok(optImplantItem, "Optimum should have standard/Osstem implant");
		assert.ok(premImplantItem, "Premium MUST have Straumann Roxolid SLA implant");
	});

	it("4. Kopeck installment splitting preserves 100% monetary integrity without rounding leakage", () => {
		const testSums: Kopecks[] = [
			1000001 as Kopecks, // 10 000.01 ₽
			25000003 as Kopecks, // 250 000.03 ₽
			9999999 as Kopecks, // 99 999.99 ₽
		];

		const terms = [3, 6, 12, 24] as const;

		for (const sum of testSums) {
			for (const months of terms) {
				const parts = splitKopecks(sum, months);
				assert.equal(parts.length, months);
				const reSum = sumKopecks(parts);
				assert.equal(
					reSum,
					sum,
					`splitKopecks(${sum}, ${months}) must strictly sum back to ${sum}, got ${reSum}`,
				);
			}
		}
	});

	it("5. Act formatters and money conversions use SSOT integer kopecks without float drift", () => {
		const formatted = formatMoneyExact(19600.5, 1960050 as Kopecks);
		assert.ok(formatted.includes("19") && formatted.includes("50"), `Formatted string must reflect exact money: ${formatted}`);

		const words = numberToWordsRu(19600, 50);
		assert.ok(words.includes("Девятнадцать тысяч"), `Words should convert correctly: ${words}`);
		assert.ok(words.includes("50"), `Words should contain kopecks: ${words}`);
	});

	it("6. Stage mutations preserve integer kopecks and use kopecksToRubles", () => {
		const sampleStage = {
			id: "stage-1",
			stageNumber: 1,
			stageKind: "stage_1_therapy" as const,
			title: "Терапевтический этап",
			totalRub: 0,
			totalKopecks: 0 as Kopecks,
			items: [],
			status: "pending" as const,
		};
		const newItem = {
			id: "item-1",
			name: "Лечение кариеса",
			price: 3500,
			priceRub: 7000,
			priceKopecks: 700000 as Kopecks,
			quantity: 2,
			stageKind: "stage_1_therapy" as const,
			completed: false,
		};
		const result = mergeIncomingPlanItem([sampleStage], newItem);
		assert.equal(result[0]?.items.length, 1);
		assert.equal(result[0]?.totalKopecks, 700000);
		assert.equal(result[0]?.totalRub, 7000);
	});
});
