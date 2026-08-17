/**
 * casePresentationPricing.test.ts — тестирование генератора планов лечения и финтех-расчетов.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { formatKopecksRu, parseKopecks } from "@dental/shared";
import {
	analyzeTeethFindings,
	calculateInstallmentMonthly,
	calculateNdflRefund,
	type CasePresentationCatalogItem,
	type CasePresentationTooth,
	findMatchingCatalogPrice,
	formatPresentationMessengerText,
	generate3TierPlans,
	pluralizeRu,
	type SavedTreatmentPlan,
} from "../components/perspectives/casePresentationPricing";

describe("casePresentationPricing: NDFL tax deduction arithmetic", () => {
	test("Code 01 (Standard) caps base at 150 000 ₽ and max refund at 19 500 ₽", () => {
		// 100 000 ₽ -> 13 000 ₽ refund
		const k100k = parseKopecks(100000);
		const res1 = calculateNdflRefund(k100k, false);
		assert.equal(res1.taxRefundKopecks, parseKopecks(13000));
		assert.equal(res1.finalPriceWithRefundKopecks, parseKopecks(87000));

		// 300 000 ₽ -> capped at 150 000 ₽ base -> 19 500 ₽ refund
		const k300k = parseKopecks(300000);
		const res2 = calculateNdflRefund(k300k, false);
		assert.equal(res2.taxRefundKopecks, parseKopecks(19500));
		assert.equal(res2.finalPriceWithRefundKopecks, parseKopecks(280500));
	});

	test("Code 02 (High cost) calculates 13% without cap", () => {
		const k300k = parseKopecks(300000);
		const res = calculateNdflRefund(k300k, true);
		assert.equal(res.taxRefundKopecks, parseKopecks(39000));
		assert.equal(res.finalPriceWithRefundKopecks, parseKopecks(261000));
	});

	test("Zero or negative kopecks return zero refund", () => {
		const res = calculateNdflRefund(parseKopecks(0), true);
		assert.equal(res.taxRefundKopecks, 0);
		assert.equal(res.finalPriceWithRefundKopecks, 0);
	});
});

describe("casePresentationPricing: Installments with splitKopecks", () => {
	test("splits exactly without rounding drift", () => {
		const totalKopecks = parseKopecks(120000);
		const monthly = calculateInstallmentMonthly(totalKopecks, 12);
		assert.equal(monthly, parseKopecks(10000));

		const total100k = parseKopecks(100000);
		const monthly3 = calculateInstallmentMonthly(total100k, 3);
		// 10 000 000 / 3 = 3 333 334 first part (splitKopecks puts remainder into first part)
		assert.equal(monthly3, 3333334);
	});
});

describe("casePresentationPricing: Catalog matching", () => {
	const mockCatalog: CasePresentationCatalogItem[] = [
		{
			id: "srv_caries",
			title: "Лечение глубокого кариеса светоотверждаемым композитом",
			category: "therapy",
			basePriceRub: 5200,
			active: true,
		},
		{
			id: "srv_implant",
			title: "Установка дентального имплантата Osstem TS-III",
			category: "surgery",
			basePriceRub: 41000,
			active: true,
		},
	];

	test("finds active matching service in catalog", () => {
		const match = findMatchingCatalogPrice(
			mockCatalog,
			"therapy",
			["кариес"],
			4500,
		);
		assert.equal(match.priceRub, 5200);
		assert.equal(match.id, "srv_caries");
		assert.equal(match.fromCatalog, true);
	});

	test("falls back to default price if not found in catalog", () => {
		const match = findMatchingCatalogPrice(
			mockCatalog,
			"prosthetics",
			["коронка"],
			28000,
		);
		assert.equal(match.priceRub, 28000);
		assert.equal(match.id, null);
		assert.equal(match.fromCatalog, false);
	});
});

describe("casePresentationPricing: 3-Tier Treatment Plan generation", () => {
	test("generates 3 distinct clinical tiers for patient with pathologies", () => {
		const teeth: CasePresentationTooth[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Caries" },
			{ toothNumber: 26, state: "Pulpitis" },
			{ toothNumber: 36, state: "Missing" },
		];

		const tiers = generate3TierPlans(teeth, []);
		assert.equal(tiers.length, 3);

		const [basic, optimum, premium] = tiers;

		// IDs & Hierarchy
		assert.equal(basic?.id, "basic");
		assert.equal(optimum?.id, "optimum");
		assert.equal(premium?.id, "premium");

		// Optimum is recommended by default
		assert.equal(optimum?.isRecommended, true);
		assert.equal(basic?.isRecommended, false);

		// Dynamic prices: basic < optimum < premium
		assert.ok(
			basic!.totalRub < optimum!.totalRub,
			`Basic (${basic!.totalRub}) should be < Optimum (${optimum!.totalRub})`,
		);
		assert.ok(
			optimum!.totalRub < premium!.totalRub,
			`Optimum (${optimum!.totalRub}) should be < Premium (${premium!.totalRub})`,
		);

		// Tooth numbers referenced in features
		const basicText = basic!.features.join(" ");
		assert.ok(basicText.includes("16"), "Should mention tooth 16");
		assert.ok(basicText.includes("24"), "Should mention tooth 24");
		assert.ok(basicText.includes("26"), "Should mention tooth 26");

		const optimumText = optimum!.features.join(" ");
		assert.ok(
			optimumText.includes("36"),
			"Should mention implant for tooth 36",
		);

		// Stages are generated
		assert.ok(basic!.stages.length >= 2);
		assert.ok(optimum!.stages.length >= 3);
	});

	test("generates 3 prophylactic tiers for healthy patient", () => {
		const teeth: CasePresentationTooth[] = [
			{ toothNumber: 11, state: "Healthy" },
			{ toothNumber: 21, state: "Healthy" },
		];

		const tiers = generate3TierPlans(teeth, []);
		assert.equal(tiers.length, 3);
		assert.ok(tiers[0]!.features.some((f) => f.includes("гигиена")));
		assert.ok(tiers[1]!.features.some((f) => f.includes("3D-чекап")));
	});

	test("includes saved treatment plan from patient's record if present", () => {
		const teeth: CasePresentationTooth[] = [
			{ toothNumber: 16, state: "Caries" },
		];
		const savedPlans: SavedTreatmentPlan[] = [
			{
				id: "plan_saved_123",
				name: "План от хирурга-ортопеда",
				totalPrice: 125000,
				items: [
					{
						name: "Имплантация Osstem",
						toothNumber: 36,
						price: 45000,
						discount: 0,
						phase: 2,
						quantity: 1,
					},
					{
						name: "Коронка циркониевая",
						toothNumber: 36,
						price: 35000,
						discount: 0,
						phase: 3,
						quantity: 1,
					},
				],
			},
		];

		const tiers = generate3TierPlans(teeth, [], savedPlans);
		assert.equal(tiers.length, 4);
		assert.equal(tiers[0]?.id, "saved_plan_saved_123");
		assert.equal(tiers[0]?.isSavedPlan, true);
		assert.equal(tiers[0]?.title, "План от хирурга-ортопеда");
	});
});

describe("casePresentationPricing: Messenger format text", () => {
	test("formats clean message text with financial schedule and features", () => {
		const tier = generate3TierPlans(
			[{ toothNumber: 16, state: "Caries" }],
			[],
		)[1]!; // Optimum
		const text = formatPresentationMessengerText("Иван Иванович", tier, 12, true);

		assert.ok(text.includes("Иван Иванович"));
		assert.ok(text.includes(tier.title));
		assert.ok(text.includes("Рассрочка 0%"));
		assert.ok(text.includes("вычета 13% НДФЛ"));
	});
});
