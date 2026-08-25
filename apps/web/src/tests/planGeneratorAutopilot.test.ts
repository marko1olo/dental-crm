/**
 * planGeneratorAutopilot.test.ts — Comprehensive Unit Test Suite for 1-Click 3-Tier Treatment Plan Generator,
 * Minzdrav Order 804n Classification, 13% NDFL Tax Deduction, and Staged 30/40/30 Payment Schedules.
 *
 * (DOMAIN: TREATMENT PLAN AUTOPILOT & FISCAL NDFL)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generate3TierPlanComparison,
	generate3TierTreatmentPlanOptions,
	generateTierPlanStages,
	generateTreatmentPlanStages,
	ORDER_804N_DICTIONARY,
	calculatePlanNdflDeduction,
	calculateStagedPayment304030,
	computeTierInstallments,
} from "../components/treatment-plans/treatmentPlanStagesEngine";
import type { ToothData } from "../components/odontogram/ToothChart";
import type { TreatmentPlanItem } from "../components/treatment-plans/types";
import {
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
	resolveTaxDeductionCategoryShared,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	type Kopecks,
} from "@dental/shared";

describe("1-Click 3-Tier Treatment Plan Generator (Economy, Standard, Optimum)", () => {
	// Sample adult clinical case:
	// - Tooth 16: Missing (requires extraction of root + bridge in Economy, Osstem in Standard, Straumann + 3D guide in Optimum)
	// - Tooth 11: Destroyed crown (metal-ceramic in Economy, zirconia in Standard, E.max in Optimum)
	// - Tooth 24: Caries (basic composite in Economy, nanohybrid in Standard, E.max inlay in Optimum)
	// - Tooth 36: Pulpitis (endo treatment in Stage 1)
	const sampleAdultOdontogram: ToothData[] = [
		{ toothNumber: 16, state: "Missing" },
		{ toothNumber: 11, state: "Crown" },
		{ toothNumber: 24, state: "Caries" },
		{ toothNumber: 36, state: "Pulpitis" },
		{ toothNumber: 17, state: "Healthy" },
		{ toothNumber: 21, state: "Filled" },
	];

	it("generates exactly 3 distinct clinical tiers with full stage hierarchy", () => {
		const [economy, standard, optimum] = generate3TierPlanComparison(sampleAdultOdontogram);
		const tiers = [economy, standard, optimum];

		assert.equal(tiers.length, 3);
		assert.equal(economy.tierId, "economy");
		assert.equal(standard.tierId, "standard");
		assert.equal(optimum.tierId, "optimum");

		// Optimum should be flagged as recommended
		assert.equal(optimum.isRecommended, true);
		assert.equal(economy.isRecommended, false);
		assert.equal(standard.isRecommended, false);

		// Every tier must have 3 stages (Therapy/Diagnostics, Surgery, Orthopedics)
		for (const tier of tiers) {
			assert.equal(tier.stages.length, 3);
			assert.equal(tier.stages[0]?.stageKind, "stage_1_therapy");
			assert.equal(tier.stages[1]?.stageKind, "stage_2_surgery");
			assert.equal(tier.stages[2]?.stageKind, "stage_3_orthopedics");
			assert.ok(tier.totalRub > 0);
			assert.ok(tier.totalKopecks > 0);
			assert.equal(tier.itemsCount, tier.stages.reduce((acc, s) => acc + s.items.length, 0));
		}
	});

	it("differentiates clinical procedures across Economy, Standard, and Optimum tiers according to clinical standards", () => {
		const [economy, standard, optimum] = generate3TierPlanComparison(sampleAdultOdontogram);

		// 1. ECONOMY TIER:
		// - Caries: basic light-cured composite (A16.07.002)
		// - Crown: metal-ceramic crown (A16.07.004)
		// - Missing tooth 16: metal-ceramic bridge / clasp prosthesis (A16.07.005) in Orthopedics, NO implant
		const econStage1Codes = economy.stages[0]?.items.map((i) => i.code804n) || [];
		const econStage2Codes = economy.stages[1]?.items.map((i) => i.code804n) || [];
		const econStage3Codes = economy.stages[2]?.items.map((i) => i.code804n) || [];

		assert.ok(econStage1Codes.includes("A16.07.002"), "Economy must use basic composite A16.07.002 for caries");
		assert.ok(econStage2Codes.includes("A16.07.001.001"), "Economy stage 2 must extract missing tooth root");
		assert.ok(!econStage2Codes.includes("A16.07.054.001"), "Economy stage 2 must NOT include dental implantation");
		assert.ok(econStage3Codes.includes("A16.07.004"), "Economy must use metal-ceramic crown A16.07.004");
		assert.ok(econStage3Codes.includes("A16.07.005"), "Economy must use bridge prosthesis A16.07.005 for missing tooth");
		assert.equal(economy.warrantyYears, 1);

		// 2. STANDARD TIER:
		// - Caries: nanohybrid composite (A16.07.002.001)
		// - Crown: monolithic zirconia crown (A16.07.004.001)
		// - Missing tooth 16: Osstem TS-III implant (A16.07.054.001) in Surgery + zirconia crown on implant (A16.07.006) in Orthopedics
		const stdStage1Codes = standard.stages[0]?.items.map((i) => i.code804n) || [];
		const stdStage2Codes = standard.stages[1]?.items.map((i) => i.code804n) || [];
		const stdStage3Codes = standard.stages[2]?.items.map((i) => i.code804n) || [];

		assert.ok(stdStage1Codes.includes("A16.07.002.001"), "Standard must use nanohybrid composite A16.07.002.001");
		assert.ok(stdStage2Codes.includes("A16.07.054.001"), "Standard must include dental implantation Osstem");
		assert.ok(stdStage3Codes.includes("A16.07.004.001"), "Standard must use zirconia crown A16.07.004.001");
		assert.ok(stdStage3Codes.includes("A16.07.006"), "Standard must use implant crown A16.07.006");
		assert.equal(standard.warrantyYears, 2);

		// 3. OPTIMUM / VIP TIER:
		// - Caries: ceramic Inlay/Onlay IPS e.max (A16.07.003) in Orthopedics
		// - Crown: individual IPS e.max / Katana UTML crown (A16.07.004.002)
		// - Missing tooth 16: 3D surgical guide (A16.07.054) + Straumann Roxolid SLActive implant (A16.07.054.001) in Surgery
		//   + custom Ti-Base zirconia abutment & E.max crown (A16.07.006) in Orthopedics
		const optStage2Codes = optimum.stages[1]?.items.map((i) => i.code804n) || [];
		const optStage3Codes = optimum.stages[2]?.items.map((i) => i.code804n) || [];

		assert.ok(optStage2Codes.includes("A16.07.054"), "Optimum must include 3D surgical navigation guide");
		assert.ok(optStage2Codes.includes("A16.07.054.001"), "Optimum must include Straumann dental implantation");
		assert.ok(optStage3Codes.includes("A16.07.003"), "Optimum must include ceramic Inlay/Onlay A16.07.003");
		assert.ok(optStage3Codes.includes("A16.07.004.002"), "Optimum must include individual E.max crown A16.07.004.002");
		assert.ok(optStage3Codes.includes("A16.07.006"), "Optimum must include custom Ti-Base implant crown A16.07.006");

		// Pricing monotonicity: Economy < Standard < Optimum
		assert.ok(
			economy.totalRub < standard.totalRub,
			`Economy (${economy.totalRub} ₽) should be cheaper than Standard (${standard.totalRub} ₽)`,
		);
		assert.ok(
			standard.totalRub < optimum.totalRub,
			`Standard (${standard.totalRub} ₽) should be cheaper than Optimum (${optimum.totalRub} ₽)`,
		);
	});

	it("supports generate3TierTreatmentPlanOptions alias smoothly", () => {
		const options = generate3TierTreatmentPlanOptions(sampleAdultOdontogram);
		assert.equal(options.length, 3);
		assert.equal(options[0]?.tierId, "economy");
		assert.equal(options[1]?.tierId, "standard");
		assert.equal(options[2]?.tierId, "optimum");
	});
});

describe("13% NDFL Tax Deduction Engine (Code 01 vs Code 02 Separation)", () => {
	it("correctly applies Code 01 annual limit (150 000 ₽) and Code 02 unlimited expensive deduction", () => {
		// Case 1: Pure therapy & crowns (Code 01) = 200 000 ₽ -> Base capped at 150k -> Refund = 19 500 ₽
		const therapyItems = [
			{ code804n: "A16.07.002.001", serviceName: "Лечение кариеса", priceRub: 80000, quantity: 1 },
			{ code804n: "A16.07.004.001", serviceName: "Коронка цирконий", priceRub: 120000, quantity: 1 },
		];
		const resTherapy = calculatePlanTaxDeductionBreakdown(therapyItems);
		assert.equal(resTherapy.code01TotalRub, 200000);
		assert.equal(resTherapy.code01EligibleRub, 150000);
		assert.equal(resTherapy.isCode01Capped, true);
		assert.equal(resTherapy.code01Refund13Rub, 19500); // 150 000 * 0.13
		assert.equal(resTherapy.code02TotalRub, 0);
		assert.equal(resTherapy.grandTotalRefund13Rub, 19500);
		assert.equal(resTherapy.netPriceWithRefundRub, 180500); // 200 000 - 19 500

		// Case 2: Pure expensive implant surgery (Code 02) = 300 000 ₽ -> Unlimited base -> Refund = 39 000 ₽
		const implantItems = [
			{ code804n: "A16.07.054.001", serviceName: "Имплантация Straumann", priceRub: 68000, quantity: 3 },
			{ code804n: "A16.07.041", serviceName: "Костная пластика Bio-Oss", priceRub: 48000, quantity: 2 },
		];
		const resImplants = calculatePlanTaxDeductionBreakdown(implantItems);
		assert.equal(resImplants.code01TotalRub, 0);
		assert.equal(resImplants.code02TotalRub, 300000);
		assert.equal(resImplants.code02EligibleRub, 300000);
		assert.equal(resImplants.code02Refund13Rub, 39000); // 300 000 * 0.13
		assert.equal(resImplants.grandTotalRefund13Rub, 39000);
		assert.equal(resImplants.netPriceWithRefundRub, 261000);

		// Case 3: Mixed treatment (Code 01: 180k + Code 02: 120k = 300k total)
		// Code 01 refund = 13% of 150k = 19 500 ₽
		// Code 02 refund = 13% of 120k = 15 600 ₽
		// Total refund = 35 100 ₽
		const mixedItems = [
			...therapyItems.slice(0, 1), // 80 000 ₽ Code 01
			{ code804n: "A16.07.004", serviceName: "Металлокерамика", priceRub: 100000, quantity: 1 }, // 100 000 ₽ Code 01 -> total 180k
			{ code804n: "A16.07.054.001", serviceName: "Имплантация Osstem", priceRub: 60000, quantity: 2 }, // 120 000 ₽ Code 02
		];
		const resMixed = calculatePlanTaxDeductionBreakdown(mixedItems);
		assert.equal(resMixed.code01TotalRub, 180000);
		assert.equal(resMixed.code01EligibleRub, 150000);
		assert.equal(resMixed.code01Refund13Rub, 19500);
		assert.equal(resMixed.code02TotalRub, 120000);
		assert.equal(resMixed.code02EligibleRub, 120000);
		assert.equal(resMixed.code02Refund13Rub, 15600);
		assert.equal(resMixed.grandTotalRub, 300000);
		assert.equal(resMixed.grandTotalRefund13Rub, 35100);
		assert.equal(resMixed.netPriceWithRefundRub, 264900);
	});

	it("calculates plan NDFL deduction directly via calculatePlanNdflDeduction helper", () => {
		const items: TreatmentPlanItem[] = [
			{ id: "1", code804n: "A16.07.050", priceRub: 6500, quantity: 1, name: "Гигиена", category: "Гигиена", unitPriceRub: 6500, phase: 1, stageKind: "stage_1_therapy", isAuto: true, priceId: null, fromCatalog: false, discountRub: 0 },
			{ id: "2", code804n: "A16.07.054.001", priceRub: 42000, quantity: 1, name: "Имплантация", category: "Хирургия", unitPriceRub: 42000, phase: 2, stageKind: "stage_2_surgery", isAuto: true, priceId: null, fromCatalog: false, discountRub: 0 },
		];
		const res = calculatePlanNdflDeduction(items);
		assert.equal(res.hasCode02ExpensiveServices, true);
		assert.equal(res.code01TotalRub, 6500);
		assert.equal(res.code02TotalRub, 42000);
		assert.equal(res.grandTotalRub, 48500);
		// 6500 * 0.13 = 845 ₽, 42000 * 0.13 = 5460 ₽ -> Total 6305 ₽
		assert.equal(res.grandTotalRefund13Rub, 6305);
		assert.equal(res.netPriceWithRefundRub, 42195);
	});
});

describe("Staged Payment Schedule 30% / 40% / 30% with Exact Penny Balancing", () => {
	it("divides total amount into 30% advance/therapy, 40% surgery, 30% orthopedics with zero penny loss", () => {
		const testAmounts = [
			100000,
			150000.50,
			234567.89,
			99999.99,
			1.01,
		];

		for (const amount of testAmounts) {
			const schedule = calculateStaged304030Schedule(amount);
			assert.equal(schedule.isBalanced, true);
			assert.equal(
				schedule.stage1AdvanceTherapyKopecks +
					schedule.stage2SurgeryImplantKopecks +
					schedule.stage3OrthopedicsKopecks,
				schedule.totalKopecks,
				`Failed exact kopeck balance for ${amount} ₽`,
			);
			assert.ok(schedule.stage1AdvanceTherapyRub >= 0);
			assert.ok(schedule.stage2SurgeryImplantRub >= 0);
			assert.ok(schedule.stage3OrthopedicsRub >= 0);
		}
	});

	it("computes 0% installments for 3, 6, 12, 24 months with exact penny distributions", () => {
		const totalKopecks = 12000000 as unknown as Kopecks; // 120 000.00 ₽
		const installments = computeTierInstallments(totalKopecks);

		// 3 months: 40 000 ₽ / month
		const plan3 = installments[3];
		assert.ok(plan3);
		assert.equal(plan3.monthlyPaymentRub, 40000);
		assert.equal(plan3.partsKopecks.length, 3);
		assert.equal(plan3.partsKopecks.reduce((a, b) => a + b, 0), 12000000);

		// 6 months: 20 000 ₽ / month
		const plan6 = installments[6];
		assert.ok(plan6);
		assert.equal(plan6.monthlyPaymentRub, 20000);
		assert.equal(plan6.partsKopecks.length, 6);

		// 12 months: 10 000 ₽ / month
		const plan12 = installments[12];
		assert.ok(plan12);
		assert.equal(plan12.monthlyPaymentRub, 10000);
		assert.equal(plan12.partsKopecks.length, 12);

		// 24 months: 5 000 ₽ / month
		const plan24 = installments[24];
		assert.ok(plan24);
		assert.equal(plan24.monthlyPaymentRub, 5000);
		assert.equal(plan24.partsKopecks.length, 24);
	});
});

describe("Pediatric and Parodontology Autopilot Invariants", () => {
	it("recognizes deciduous teeth and generates pediatric-specific protocols", () => {
		const pedOdontogram: ToothData[] = [
			{ toothNumber: 54, state: "Caries" },
			{ toothNumber: 64, state: "Pulpitis" },
			{ toothNumber: 75, state: "Missing" },
		];

		const [stage1, stage2, stage3] = generateTreatmentPlanStages(pedOdontogram);
		const stage1Codes = stage1.items.map((i) => i.code804n);
		const stage2Codes = stage2.items.map((i) => i.code804n);
		const stage3Codes = stage3.items.map((i) => i.code804n);

		assert.ok(stage1Codes.includes("A16.07.002.001"), "Must include pediatric caries therapy");
		assert.ok(stage1Codes.includes("A16.07.008.001"), "Must include pediatric pulpotomy");
		assert.ok(stage2Codes.includes("A16.07.001"), "Must include pediatric tooth extraction");
		assert.ok(stage3Codes.includes("A16.07.004.003"), "Must include pediatric stainless steel crown (SSC)");
		assert.ok(stage1.items.some((i) => i.category === "Детская терапия"), "Must contain pediatric therapy category");
		assert.ok(stage3.items.some((i) => i.category === "Детская ортопедия"), "Must contain pediatric orthopedics category");
	});

	it("triggers SRP, curettage, and splinting for parodontal pathologies", () => {
		const perioOdontogram: ToothData[] = [
			{ toothNumber: 41, state: "Healthy", boneLossLevel: 3, mobility: 2, furcationGrade: 1 },
		];

		const [perioStage1] = generateTreatmentPlanStages(perioOdontogram);
		const stage1Codes = perioStage1.items.map((i) => i.code804n);

		assert.ok(stage1Codes.includes("A16.07.051"), "Must include SRP scaling");
		assert.ok(stage1Codes.includes("A16.07.039"), "Must include closed curettage for grade 3 bone loss");
		assert.ok(stage1Codes.includes("A16.07.019"), "Must include fiber splinting for grade 2 mobility");
	});
});
