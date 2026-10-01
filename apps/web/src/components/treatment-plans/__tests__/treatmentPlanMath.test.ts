import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Kopecks } from "@dental/shared";
import {
	formatChairsidePrice,
	formatKopecksToRubString,
	calculateStageTotals,
	calculatePlanStagesTotals,
	calculateChairsideInstallments,
	calculateChairsideTaxDeduction,
	applyDoctorDiscountToStages,
	recalculateTierTotals,
	validatePlanFinancialIntegrity,
	NDFL_STANDARD_ANNUAL_LIMIT_RUB,
	NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS,
} from "../treatmentPlanMath";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTier } from "../types";

describe("treatmentPlanMath — Chairside Financials, Parity & Doctor Autonomy", () => {
	describe("1. Currency & Chairside Price Formatting", () => {
		it("formats ruble amounts for chairside viewing with non-breaking spaces", () => {
			assert.equal(formatChairsidePrice(0), "0 ₽");
			assert.equal(formatChairsidePrice(154000).replace(/\s/g, " "), "154 000 ₽");
			assert.equal(formatChairsidePrice(1500000).replace(/\s/g, " "), "1 500 000 ₽");
			assert.equal(formatChairsidePrice(null), "0 ₽");
			assert.equal(formatChairsidePrice(undefined), "0 ₽");
			assert.equal(formatChairsidePrice(NaN), "0 ₽");
		});

		it("formats kopecks amounts to integer rubles with chairside formatting", () => {
			assert.equal(formatKopecksToRubString(0 as Kopecks), "0 ₽");
			assert.equal(formatKopecksToRubString(15400000 as Kopecks).replace(/\s/g, " "), "154 000 ₽");
			assert.equal(formatKopecksToRubString(99 as Kopecks), "1 ₽"); // 0.99 rub rounds to 1
			assert.equal(formatKopecksToRubString(40 as Kopecks), "0 ₽"); // 0.40 rub rounds to 0
		});
	});

	describe("2. Stage & Plan Totals Calculation", () => {
		it("calculates stage totals for empty items cleanly", () => {
			const res = calculateStageTotals([]);
			assert.equal(res.totalKopecks, 0 as Kopecks);
			assert.equal(res.totalRub, 0);
		});

		it("calculates items with quantities and individual line discounts", () => {
			const items: TreatmentPlanItem[] = [
				{
					id: "item-1",
					name: "Лечение кариеса",
					code804n: "A16.07.002",
					category: "Терапия",
					stageKind: "stage_1_therapy",
					unitPriceRub: 5000,
					quantity: 2,
					discountRub: 1000,
					priceRub: 9000,
				},
				{
					id: "item-2",
					name: "Анестезия инфильтрационная",
					code804n: "B01.003.004.004",
					category: "Терапия",
					stageKind: "stage_1_therapy",
					unitPriceRub: 1200,
					quantity: 1,
					discountRub: 0,
					priceRub: 1200,
				},
			];

			const res = calculateStageTotals(items);
			// 5000 * 2 - 1000 = 9000 rub = 900 000 kopecks
			// 1200 * 1 = 1200 rub = 120 000 kopecks
			// total = 10 200 rub = 1 020 000 kopecks
			assert.equal(res.totalKopecks, 1020000 as Kopecks);
			assert.equal(res.totalRub, 10200);
		});

		it("aggregates multiple stages with weeks and visits metrics", () => {
			const stages: TreatmentPlanStage[] = [
				{
					stageNumber: 1,
					stageKind: "stage_1_therapy",
					title: "Терапевтический этап",
					subtitle: "Санация полости рта",
					clinicalGoal: "Купирование воспаления",
					order804nCodes: ["A16.07.002"],
					totalRub: 25000,
					totalKopecks: 2500000 as Kopecks,
					estimatedWeeks: 2,
					estimatedVisits: 3,
					items: [
						{
							id: "it-1",
							name: "Пломба",
							code804n: "A16.07.002",
							category: "Терапия",
							stageKind: "stage_1_therapy",
							priceRub: 25000,
							unitPriceRub: 25000,
							discountRub: 0,
							quantity: 1,
						},
					],
				},
				{
					stageNumber: 2,
					stageKind: "stage_2_surgery",
					title: "Хирургический этап",
					subtitle: "Дентальная имплантация",
					clinicalGoal: "Восстановление дефекта зубного ряда",
					order804nCodes: ["A16.07.054.001"],
					totalRub: 75000,
					totalKopecks: 7500000 as Kopecks,
					estimatedWeeks: 4,
					estimatedVisits: 2,
					items: [
						{
							id: "it-2",
							name: "Имплантация",
							code804n: "A16.07.054.001",
							category: "Хирургия",
							stageKind: "stage_2_surgery",
							priceRub: 75000,
							unitPriceRub: 75000,
							discountRub: 0,
							quantity: 1,
						},
					],
				},
			];

			const planTotals = calculatePlanStagesTotals(stages);
			assert.equal(planTotals.totalKopecks, 10000000 as Kopecks);
			assert.equal(planTotals.totalRub, 100000);
			assert.equal(planTotals.itemsCount, 2);
			assert.equal(planTotals.estimatedWeeks, 6);
			assert.equal(planTotals.estimatedVisits, 5);
		});
	});

	describe("3. 0% Installments Calculation (Zero Penny Drift)", () => {
		it("returns 0 for zero or negative kopecks", () => {
			const installments = calculateChairsideInstallments(0 as Kopecks);
			for (const months of [3, 6, 12, 24] as const) {
				const plan = installments[months];
				assert.ok(plan);
				assert.equal(plan.monthlyPaymentRub, 0);
				assert.equal(plan.remainderKopecks, 0);
				assert.equal(plan.partsKopecks.length, months);
			}
		});

		it("distributes odd kopecks to first payment ensuring exact sum parity", () => {
			// 100 000.01 ₽ = 10 000 001 kopecks
			const oddKopecks = 10000001 as Kopecks;
			const installments = calculateChairsideInstallments(oddKopecks);

			for (const months of [3, 6, 12, 24] as const) {
				const plan = installments[months];
				assert.ok(plan);
				assert.equal(plan.months, months);
				assert.equal(plan.partsKopecks.length, months);

				// Parity check: sum of parts MUST strictly match totalKopecks
				const sumOfParts = plan.partsKopecks.reduce((acc, p) => (acc + p) as Kopecks, 0 as Kopecks);
				assert.equal(sumOfParts, oddKopecks, `Drift detected in ${months} months installment!`);

				// First part absorbs remainder
				assert.equal(plan.partsKopecks[0], (plan.monthlyPaymentKopecks + plan.remainderKopecks) as Kopecks);
			}
		});

		it("calculates 12 months installment for 120 000 ₽ exactly", () => {
			const total = 12000000 as Kopecks; // 120 000.00 ₽
			const installments = calculateChairsideInstallments(total);
			const plan12 = installments[12];
			assert.ok(plan12);
			assert.equal(plan12.monthlyPaymentRub, 10000);
			assert.equal(plan12.remainderKopecks, 0);
			assert.equal(plan12.partsKopecks.every((p) => p === 1000000), true);
		});
	});

	describe("4. 13% NDFL Tax Deduction (Art. 219 Tax Code of RF)", () => {
		it("calculates Code 01 standard deduction capped at 150 000 ₽ limit", () => {
			assert.equal(NDFL_STANDARD_ANNUAL_LIMIT_RUB, 150000);
			assert.equal(NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS, 15000000);

			// Under limit: 100 000 ₽
			const under = calculateChairsideTaxDeduction(10000000 as Kopecks, false);
			assert.equal(under.code, "01");
			assert.equal(under.isHighCostTreatment, false);
			assert.equal(under.refundRub, 13000); // 13% of 100k
			assert.equal(under.finalPriceWithRefundRub, 87000);

			// Over limit: 300 000 ₽
			const over = calculateChairsideTaxDeduction(30000000 as Kopecks, false);
			assert.equal(over.code, "01");
			assert.equal(over.refundRub, 19500); // 13% of 150 000 ₽ max limit
			assert.equal(over.finalPriceWithRefundRub, 280500); // 300 000 - 19 500
		});

		it("calculates Code 02 expensive treatment deduction WITHOUT limit", () => {
			// Expensive: 400 000 ₽ (implants, sinus lift)
			const highCost = calculateChairsideTaxDeduction(40000000 as Kopecks, true);
			assert.equal(highCost.code, "02");
			assert.equal(highCost.isHighCostCode02, true);
			assert.equal(highCost.annualLimitRub, undefined);
			assert.equal(highCost.refundRub, 52000); // 13% of 400 000 ₽ = 52 000 ₽
			assert.equal(highCost.finalPriceWithRefundRub, 348000);
		});
	});

	describe("5. Doctor Discount Autonomy (Mandate 8e)", () => {
		const sampleStages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Реставрация зубов",
				subtitle: "Эстетическое восстановление",
				clinicalGoal: "Восстановление формы коронок",
				order804nCodes: ["A16.07.002.001"],
				totalRub: 20000,
				totalKopecks: 2000000 as Kopecks,
				estimatedWeeks: 1,
				estimatedVisits: 1,
				items: [
					{
						id: "i1",
						name: "Реставрация 11 зуба",
						code804n: "A16.07.002.001",
						category: "Терапия",
						stageKind: "stage_1_therapy",
						unitPriceRub: 10000,
						priceRub: 10000,
						quantity: 1,
						discountRub: 0,
					},
					{
						id: "i2",
						name: "Реставрация 21 зуба",
						code804n: "A16.07.002.001",
						category: "Терапия",
						stageKind: "stage_1_therapy",
						unitPriceRub: 10000,
						priceRub: 10000,
						quantity: 1,
						discountRub: 0,
					},
				],
			},
		];

		it("applies 20% doctor discount accurately", () => {
			const discounted = applyDoctorDiscountToStages(sampleStages, 20);
			assert.equal(discounted[0]?.totalRub, 16000);
			assert.equal(discounted[0]?.totalKopecks, 1600000 as Kopecks);
			assert.equal(discounted[0]?.items[0]?.priceRub, 8000);
			assert.equal(discounted[0]?.items[0]?.discountRub, 2000);
		});

		it("applies 100% guarantee discount (0 ₽ clinical warranty case)", () => {
			const freeWarranty = applyDoctorDiscountToStages(sampleStages, 100);
			assert.equal(freeWarranty[0]?.totalRub, 0);
			assert.equal(freeWarranty[0]?.totalKopecks, 0 as Kopecks);
			assert.equal(freeWarranty[0]?.items[0]?.priceRub, 0);
			assert.equal(freeWarranty[0]?.items[0]?.discountRub, 10000);
		});

		it("clamps invalid discount percentages to [0, 100]", () => {
			const negative = applyDoctorDiscountToStages(sampleStages, -15);
			assert.equal(negative[0]?.totalRub, 20000);

			const excessive = applyDoctorDiscountToStages(sampleStages, 150);
			assert.equal(excessive[0]?.totalRub, 0);
		});
	});

	describe("6. Recalculation & Financial Parity Audit", () => {
		const baseTier: TreatmentPlanTier = {
			tierId: "optimum",
			title: "Оптимальный",
			subtitle: "Надежный баланс",
			badge: "Рекомендация врача",
			badgeClass: "badge-optimum",
			borderClass: "border-optimum",
			isRecommended: true,
			totalRub: 0,
			totalKopecks: 0 as Kopecks,
			durationWeeks: 0,
			durationVisits: 0,
			warrantyYears: 3,
			materialsHeadline: "Керамика и титан",
			materialsList: ["Керамика E.max", "Импланты Osstem"],
			keyAdvantages: ["Долговечность 15+ лет"],
			stages: [],
			itemsCount: 0,
			ndflRefundRub: 0,
			priceWithNdflRefundRub: 0,
			monthlyInstallment12Rub: 0,
			installments: calculateChairsideInstallments(0 as Kopecks),
			ndflDetails: calculateChairsideTaxDeduction(0 as Kopecks, false),
		};

		it("detects high-cost codes and updates complete tier metrics", () => {
			const stagesWithImplant: TreatmentPlanStage[] = [
				{
					stageNumber: 1,
					stageKind: "stage_2_surgery",
					title: "Имплантология",
					subtitle: "Установка дентального импланта",
					clinicalGoal: "Остеоинтеграция",
					order804nCodes: ["A16.07.054.001"],
					totalRub: 80000,
					totalKopecks: 8000000 as Kopecks,
					estimatedWeeks: 3,
					estimatedVisits: 2,
					items: [
						{
							id: "it-impl",
							name: "Внутрикостная дентальная имплантация",
							code804n: "A16.07.054.001",
							category: "Хирургия",
							stageKind: "stage_2_surgery",
							unitPriceRub: 80000,
							priceRub: 80000,
							discountRub: 0,
							quantity: 1,
						},
					],
				},
			];

			const updated = recalculateTierTotals(baseTier, stagesWithImplant);
			assert.equal(updated.totalRub, 80000);
			assert.equal(updated.ndflDetails.code, "02"); // Code 02 detected from A16.07.054.001!
			assert.equal(updated.ndflRefundRub, 10400); // 13% of 80 000 = 10 400
			assert.equal(updated.monthlyInstallment12Rub, Math.round(80000 / 12));
			assert.ok(updated.stagedSchedule);
		});

		it("validates financial integrity and detects drift", () => {
			const validTier: TreatmentPlanTier = {
				...baseTier,
				totalRub: 50000,
				totalKopecks: 5000000 as Kopecks,
				itemsCount: 1,
				durationWeeks: 1,
				durationVisits: 1,
				stages: [
					{
						stageNumber: 1,
						stageKind: "stage_1_therapy",
						title: "Терапия",
						subtitle: "Пломбирование",
						clinicalGoal: "Санация",
						order804nCodes: ["A16.07.002"],
						totalRub: 50000,
						totalKopecks: 5000000 as Kopecks,
						estimatedWeeks: 1,
						estimatedVisits: 1,
						items: [
							{
								id: "it1",
								name: "Пломба",
								code804n: "A16.07.002",
								category: "Терапия",
								stageKind: "stage_1_therapy",
								priceRub: 50000,
								unitPriceRub: 50000,
								discountRub: 0,
								quantity: 1,
							},
						],
					},
				],
				installments: calculateChairsideInstallments(5000000 as Kopecks),
			};

			const validAudit = validatePlanFinancialIntegrity(validTier);
			assert.equal(validAudit.isValid, true);
			assert.equal(validAudit.kopecksDrift, 0);
			assert.equal(validAudit.errors.length, 0);

			// Test drift detection
			const corruptedTier: TreatmentPlanTier = {
				...validTier,
				totalKopecks: 4900000 as Kopecks, // Intentionally 1000 rub short
			};
			const invalidAudit = validatePlanFinancialIntegrity(corruptedTier);
			assert.equal(invalidAudit.isValid, false);
			assert.equal(invalidAudit.kopecksDrift, 100000);
			assert.ok(invalidAudit.errors.length > 0);
		});
	});
});
