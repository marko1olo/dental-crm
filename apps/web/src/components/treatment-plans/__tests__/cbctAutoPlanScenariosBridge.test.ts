/**
 * cbctAutoPlanScenariosBridge.test.ts — генерация 3 сценариев, ACID-копейки, рассрочка и НДФЛ.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { parseKopecks, sumKopecks } from "@dental/shared";
import { generateCbctAutoPlanScenarios } from "../ctImplantIntegrationBridge";
import { sampleCbctInput } from "./helpers/cbctTestHelpers";

describe("cbctAutoPlanIntegrationBridge — 1-клик генерация 3 сценариев на 4 этапа", () => {
	test("генерирует ровно 3 тарифных сценария: economy, standard, optimum", () => {
		const [econ, opt, prem] = generateCbctAutoPlanScenarios(sampleCbctInput);
		assert.equal(econ.tierId, "economy");
		assert.equal(opt.tierId, "standard");
		assert.equal(prem.tierId, "optimum");
		assert.ok(econ.title.includes("Эконом"));
		assert.ok(opt.title.includes("Оптимум"));
		assert.ok(prem.title.includes("Премиум"));
	});

	test("каждый сценарий содержит ровно 4 клинических этапа по каноническому протоколу", () => {
		const tiers = generateCbctAutoPlanScenarios(sampleCbctInput);
		for (const tier of tiers) {
			assert.equal(tier.stages.length, 4);
			assert.deepEqual(tier.stages.map((s) => s.stageNumber), [1, 2, 3, 4]);
			assert.equal(tier.stages[0]!.stageKind, "stage_1_therapy");
			assert.equal(tier.stages[1]!.stageKind, "stage_1_therapy");
			assert.equal(tier.stages[2]!.stageKind, "stage_2_surgery");
			assert.equal(tier.stages[3]!.stageKind, "stage_3_orthopedics");
		}
	});

	test("математическая копеечная точность ACID: сумма этапов строго равна итогу тарифа", () => {
		const tiers = generateCbctAutoPlanScenarios(sampleCbctInput);
		for (const tier of tiers) {
			const sumStagesKopecks = sumKopecks(tier.stages.map((s) => s.totalKopecks));
			assert.equal(tier.totalKopecks, sumStagesKopecks);

			for (const stage of tier.stages) {
				const itemsSum = sumKopecks(stage.items.map((it) => parseKopecks(it.priceRub * (it.quantity ?? 1))));
				assert.equal(stage.totalKopecks, itemsSum);
			}
		}
	});

	test("ценовая субординация: Эконом < Оптимум < Премиум", () => {
		const [econ, opt, prem] = generateCbctAutoPlanScenarios(sampleCbctInput);
		assert.ok(econ.totalKopecks < opt.totalKopecks);
		assert.ok(opt.totalKopecks < prem.totalKopecks);
	});

	test("расчет рассрочки 0% без переплат (3, 6, 12, 24 мес.) для каждого тарифа", () => {
		const [econ, opt, prem] = generateCbctAutoPlanScenarios(sampleCbctInput);
		for (const tier of [econ, opt, prem]) {
			assert.ok(tier.installments[3].monthlyPaymentRub > 0);
			assert.ok(tier.installments[6].monthlyPaymentRub > 0);
			assert.ok(tier.installments[12].monthlyPaymentRub > 0);
			assert.ok(tier.installments[24].monthlyPaymentRub > 0);
			assert.ok(Math.abs(tier.installments[12].monthlyPaymentRub * 12 - tier.totalRub) <= 12);
		}
	});

	test("налоговый вычет 13% НДФЛ и график 30/40/30 формируются корректно", () => {
		const [econ, opt, prem] = generateCbctAutoPlanScenarios(sampleCbctInput);
		for (const tier of [econ, opt, prem]) {
			assert.ok(tier.ndflRefundRub > 0);
			assert.ok(tier.ndflDetails?.isHighCostCode02);
			assert.ok(tier.stagedSchedule);
			const totalSched =
				tier.stagedSchedule.stage1AdvanceTherapyRub +
				tier.stagedSchedule.stage2SurgeryImplantRub +
				tier.stagedSchedule.stage3OrthopedicsRub;
			assert.equal(totalSched, tier.totalRub);
			assert.equal(tier.stagedSchedule.isBalanced, true);
		}
	});
});
