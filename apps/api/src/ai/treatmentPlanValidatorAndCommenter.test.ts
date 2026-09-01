import assert from "node:assert/strict";
import { test } from "node:test";
import {
	getAnatomicalRootCanalCount,
	isDeciduousTooth,
	runDeterministicClinicalValidation,
	calculateDeterministicFinancialArgumentation,
	validateAndCommentTreatmentPlan,
} from "./treatmentPlanValidatorAndCommenter.js";

test("Treatment Plan Validator and Commenter Suite", async (t) => {
	const originalEnv = process.env;

	t.afterEach(() => {
		process.env = { ...originalEnv };
	});

	await t.test("FDI Anatomical canal counts are correct", () => {
		assert.strictEqual(getAnatomicalRootCanalCount(11), 1);
		assert.strictEqual(getAnatomicalRootCanalCount(14), 2);
		assert.strictEqual(getAnatomicalRootCanalCount(16), 3);
		assert.strictEqual(getAnatomicalRootCanalCount(36), 3);
		assert.strictEqual(getAnatomicalRootCanalCount(41), 1);
		assert.strictEqual(isDeciduousTooth(55), true);
		assert.strictEqual(isDeciduousTooth(16), false);
	});

	await t.test("Detects endodontic canal count mismatch and missing crown on devitalized tooth", () => {
		const sampleStages = [
			{
				stageNumber: 1,
				title: "Терапевтический этап",
				totalRub: 25000,
				items: [
					{
						id: "endo-item-1",
						toothNumber: 16, // Upper molar (3-4 canals)
						code804n: "A16.07.030.001", // Mismatch: 1 canal code instead of 3 canals!
						name: "Инструментальная обработка корневого канала",
						quantity: 1,
						category: "Терапия",
						priceRub: 8000,
					},
					{
						id: "endo-item-2",
						toothNumber: 46, // Lower molar (3 canals)
						code804n: "A16.07.008.003",
						name: "Пломбирование корневых каналов зуба 46",
						quantity: 1,
						category: "Терапия",
						priceRub: 12000,
					},
				],
			},
		];

		const val = runDeterministicClinicalValidation(sampleStages);

		// 1. Should flag canal count mismatch for tooth 16
		const mismatchCheck = val.anatomicalChecks.find(
			(c) => c.toothNumber === 16 && c.rule === "FDI_ENDO_CANAL_PREPARATION_COUNT",
		);
		assert.ok(mismatchCheck, "Must detect canal count mismatch for tooth 16");
		assert.strictEqual(mismatchCheck.status, "warning");

		// 2. Should flag devitalized tooth 46 missing crown/onlay protection
		const crownCheck = val.anatomicalChecks.find(
			(c) => c.toothNumber === 46 && c.rule === "DEVITALIZED_POSTERIOR_CROWN_PROTECTION",
		);
		assert.ok(crownCheck, "Must detect missing crown on devitalized tooth 46");
		assert.strictEqual(crownCheck.status, "warning");
		assert.ok(val.criticalWarnings.length > 0);
	});

	await t.test("Calculates 13% NDFL tax deduction Code 01 vs Code 02 and 0% installments", () => {
		const stages = [
			{
				stageNumber: 1,
				title: "Санация и терапия",
				totalRub: 60000,
				items: [
					{
						id: "t1",
						toothNumber: 11,
						code804n: "A16.07.002.001",
						name: "Лечение кариеса",
						quantity: 1,
						category: "Терапия",
						priceRub: 60000,
					},
				],
			},
			{
				stageNumber: 2,
				title: "Хирургия и имплантация",
				totalRub: 200000,
				items: [
					{
						id: "s1",
						toothNumber: 36,
						code804n: "A16.07.054.001",
						name: "Дентальная имплантация системы Straumann",
						quantity: 1,
						category: "Хирургия",
						priceRub: 150000,
					},
					{
						id: "s2",
						toothNumber: 36,
						code804n: "A16.07.041",
						name: "Костная пластика Bio-Oss",
						quantity: 1,
						category: "Хирургия",
						priceRub: 50000,
					},
				],
			},
		];

		const fin = calculateDeterministicFinancialArgumentation(stages, 12);
		assert.strictEqual(fin.totalRub, 260000);
		// Code 01: 60 000 руб (under 150k limit) -> 13% = 7 800 руб
		assert.strictEqual(fin.ndflDeduction.code01AmountRub, 60000);
		assert.strictEqual(fin.ndflDeduction.code01RefundRub, 7800);
		// Code 02: 200 000 руб (expensive treatment, no limit) -> 13% = 26 000 руб
		assert.strictEqual(fin.ndflDeduction.code02AmountRub, 200000);
		assert.strictEqual(fin.ndflDeduction.code02RefundRub, 26000);
		// Total refund: 7800 + 26000 = 33 800 руб
		assert.strictEqual(fin.ndflDeduction.totalRefundRub, 33800);
		assert.strictEqual(fin.ndflDeduction.netPriceWithRefundRub, 260000 - 33800);

		// Installment 12m: 260 000 / 12 = 21 667 руб/мес
		assert.strictEqual(fin.installments["12"]?.monthlyPaymentRub, Math.round(260000 / 12));
		assert.strictEqual(fin.installments["12"]?.overpaymentRub, 0);

		// Staged 30/40/30 split exact balancing
		assert.strictEqual(
			fin.stagedPaymentSchedule.stage1AdvanceRub +
				fin.stagedPaymentSchedule.stage2SurgicalRub +
				fin.stagedPaymentSchedule.stage3FinalRub,
			260000,
		);
	});

	await t.test("validateAndCommentTreatmentPlan falls back to rule-engine when AI disabled", async () => {
		process.env.DENTAL_AI_NEURAL_DRAFT = "false";

		const request = {
			stages: [
				{
					stageNumber: 1,
					title: "Терапевтический этап",
					totalRub: 35000,
					items: [
						{
							id: "item-1",
							toothNumber: 16,
							code804n: "A16.07.002.001",
							name: "Лечение кариеса жевательной поверхности зуба 16",
							quantity: 1,
							category: "Терапия",
							priceRub: 35000,
						},
					],
				},
			],
		};

		const res = await validateAndCommentTreatmentPlan(request);
		assert.ok(res);
		assert.strictEqual(res.financialArgumentation.totalRub, 35000);
		assert.ok(res.chairsideCommentary.patientFriendlySummary.length > 0);
		assert.ok(res.chairsideCommentary.urgencyArgument.includes("Математика здоровья"));
		assert.strictEqual(res.providerUsed, "local_rules");
	});

	await t.test("validateAndCommentTreatmentPlan uses LLM when available", async () => {
		process.env.DENTAL_AI_NEURAL_DRAFT = "true";
		process.env.GROQ_API_KEY = "test-groq-key";

		const fetchMock = t.mock.method(global, "fetch", async () => {
			return {
				ok: true,
				json: async () => ({
					choices: [
						{
							message: {
								content: JSON.stringify({
									chairsideCommentary: {
										patientFriendlySummary: "Умное объяснение плана от Qwen 3.8 27B",
										urgencyArgument: "Аргумент срочности от ИИ",
										hygieneAndCareAdvice: "ИИ гигиенический совет",
									},
								}),
							},
						},
					],
				}),
			};
		});

		const request = {
			stages: [
				{
					stageNumber: 1,
					title: "Терапия",
					totalRub: 15000,
					items: [
						{
							id: "it-1",
							toothNumber: 21,
							code804n: "A16.07.002.001",
							name: "Эстетическая реставрация зуба 21",
							quantity: 1,
							category: "Терапия",
							priceRub: 15000,
						},
					],
				},
			],
		};

		const res = await validateAndCommentTreatmentPlan(request);
		assert.strictEqual(fetchMock.mock.callCount(), 1);
		assert.strictEqual(
			res.chairsideCommentary.patientFriendlySummary,
			"Умное объяснение плана от Qwen 3.8 27B",
		);
		assert.strictEqual(res.providerUsed, "groq");
	});
});
