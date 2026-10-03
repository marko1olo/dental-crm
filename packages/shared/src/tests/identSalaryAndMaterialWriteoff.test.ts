import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	calculateIdentDiscountSalaryBase,
	calculateDoctorNetSalary,
	calculateIdentDoctorSalary,
	extractDeductibleMaterialsFromWriteoff,
} from "../finance/doctorNetSalaryEngine.js";
import {
	processIdentMaterialWriteoff,
	formatIdentMaterialWriteoffAct,
	type IdentConsumableNorm,
} from "../warehouse/identMaterialWriteoffEngine.js";
import type { Kopecks } from "../money.js";

describe("IDENT & Dentaro Reverse Engineering — Doctor Salary & Material Write-Off", () => {
	// ─── 1. IDENT 3 SALARY FORMULAS & POLICIES ─────────────────────────────────

	test("calculateIdentDiscountSalaryBase: gross_unconditional gives doctor full base regardless of discount/debt", () => {
		// Gross: 10 000 ₽ (1 000 000 kop), Discount: 2 000 ₽, Invoice Total: 8 000 ₽, Paid: 5 000 ₽
		// Clinic costs (materials + lab): 3 000 ₽ (300 000 kop)
		const result = calculateIdentDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 800000 as Kopecks,
			paidKop: 500000 as Kopecks,
			discountKop: 200000 as Kopecks,
			clinicCostsKop: 300000 as Kopecks,
			policy: "gross_unconditional",
		});

		// Doctor base = Gross (1 000 000) - Costs (300 000) = 700 000 kop (7 000 ₽)
		assert.equal(result.doctorBaseKop, 700000);
		assert.equal(result.doctorBaseRub, 7000);
		assert.equal(result.isFullyPaid, false);
		assert.equal(result.debtKop, 300000); // 8 000 - 5 000 = 3 000 ₽ debt
	});

	test("calculateIdentDiscountSalaryBase: clinic_first prioritizes clinic costs coverage", () => {
		// Gross: 10 000 ₽, Costs: 3 000 ₽ (300 000 kop), Paid: 2 000 ₽ (200 000 kop)
		// Patient paid less than clinic costs -> doctor gets 0, clinic gets all 200 000 kop
		const partialUnder = calculateIdentDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 1000000 as Kopecks,
			paidKop: 200000 as Kopecks,
			discountKop: 0 as Kopecks,
			clinicCostsKop: 300000 as Kopecks,
			policy: "clinic_first",
		});
		assert.equal(partialUnder.doctorBaseKop, 0);
		assert.equal(partialUnder.clinicShareKop, 200000);

		// Patient paid 5 000 ₽ (500 000 kop) -> clinic takes 300 000 kop, doctor gets remaining 200 000 kop
		const partialOver = calculateIdentDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 1000000 as Kopecks,
			paidKop: 500000 as Kopecks,
			discountKop: 0 as Kopecks,
			clinicCostsKop: 300000 as Kopecks,
			policy: "clinic_first",
		});
		assert.equal(partialOver.doctorBaseKop, 200000);
		assert.equal(partialOver.clinicShareKop, 300000);
	});

	test("calculateIdentDiscountSalaryBase: doctor_first pays doctor fee first", () => {
		// Gross: 10 000 ₽, Costs: 3 000 ₽ -> Target doctor base = 7 000 ₽ (700 000 kop)
		// Paid: 5 000 ₽ (500 000 kop) -> Doctor gets full 500 000 kop, clinic gets 0 until doctor is paid
		const result = calculateIdentDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 1000000 as Kopecks,
			paidKop: 500000 as Kopecks,
			discountKop: 0 as Kopecks,
			clinicCostsKop: 300000 as Kopecks,
			policy: "doctor_first",
		});
		assert.equal(result.doctorBaseKop, 500000);
		assert.equal(result.clinicShareKop, 0);

		// Paid: 8 000 ₽ (800 000 kop) -> Doctor gets full 700 000 kop, clinic gets 100 000 kop
		const resultHigh = calculateIdentDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 1000000 as Kopecks,
			paidKop: 800000 as Kopecks,
			discountKop: 0 as Kopecks,
			clinicCostsKop: 300000 as Kopecks,
			policy: "doctor_first",
		});
		assert.equal(resultHigh.doctorBaseKop, 700000);
		assert.equal(resultHigh.clinicShareKop, 100000);
	});

	test("calculateIdentDiscountSalaryBase: proportional scales doctor base by payment ratio", () => {
		// Gross: 10 000 ₽, Costs: 2 000 ₽, Discount: 1 000 ₽ -> Invoice Total: 9 000 ₽ (900 000 kop)
		// Target doctor base = 10 000 - 2 000 - 1 000 = 7 000 ₽ (700 000 kop)
		// Paid: 4 500 ₽ (450 000 kop) -> ratio = 450 000 / 900 000 = 0.5
		// Doctor base = 700 000 * 0.5 = 350 000 kop (3 500 ₽)
		const result = calculateIdentDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 900000 as Kopecks,
			paidKop: 450000 as Kopecks,
			discountKop: 100000 as Kopecks,
			clinicCostsKop: 200000 as Kopecks,
			policy: "proportional",
		});
		assert.equal(result.doctorBaseKop, 350000);
		assert.equal(result.doctorBaseRub, 3500);
		assert.equal(result.clinicShareKop, 100000);
	});

	// ─── 2. DENTARO ONE-TIME DOCTOR PERCENTAGE DEDUCTION ───────────────────────

	test("calculateDoctorNetSalary: correctly applies Dentaro one-time deduction from piecework", () => {
		const result = calculateDoctorNetSalary({
			grossRevenueRub: 50000,
			labCostRub: 10000,
			materialsCostRub: 5000,
			categoryPercent: 30, // 35 000 * 30% = 10 500 ₽ (1 050 000 kop)
			fixedSalaryRub: 0,
			oneTimeDeductions: [
				{
					id: "ded-01",
					amountKop: 200000 as Kopecks, // 2 000 ₽ вычет за переделку коронки ЗТЛ
					reason: "Брак слепка / переделка коронки ЗТЛ наряд № 841",
					orderNumber: "ЗТЛ-841",
				},
			],
			ndflRatePercent: 13,
		});

		// Net base: 50 000 - 10 000 - 5 000 = 35 000 ₽
		assert.equal(result.netBaseRevenueRub, 35000);
		// Piecework accrued before deduction: 10 500 ₽ (1 050 000 kop)
		assert.equal(result.pieceworkAccruedKop, 1050000);
		// One-time deductions total: 2 000 ₽ (200 000 kop)
		assert.equal(result.oneTimeDeductionsTotalKop, 200000);
		assert.equal(result.oneTimeDeductionsTotalRub, 2000);
		// Total Accrued: 10 500 - 2 000 = 8 500 ₽ (850 000 kop)
		assert.equal(result.totalAccruedKop, 850000);
		assert.equal(result.totalAccruedRub, 8500);
		// NDFL 13%: round(850 000 * 0.13) = 110 500 kop (1 105 ₽)
		assert.equal(result.ndflTaxKop, 110500);
		// Net Payout: 850 000 - 110 500 = 739 500 kop (7 395 ₽)
		assert.equal(result.netPayoutKop, 739500);
		assert.equal(result.netPayoutRub, 7395);
	});

	// ─── 3. IDENT 2-LEVEL MATERIAL WRITE-OFF (ВН / ВИ ФЛАГИ) ──────────────────

	test("processIdentMaterialWriteoff: segregates cheap overhead from expensive clinical materials", () => {
		const norms: IdentConsumableNorm[] = [
			// Дешевый расходник (Уровень 1)
			{
				inventoryItemId: "mat-gloves",
				itemName: "Перчатки нитриловые смотровые",
				tier: "cheap_overhead",
				defaultQuantity: 1,
				unit: "пара",
				costPriceKopecks: 3500, // 35 ₽
				canOmit: false,
				canAdjustQuantity: false,
			},
			{
				inventoryItemId: "mat-saliva",
				itemName: "Слюноотсос одноразовый",
				tier: "cheap_overhead",
				defaultQuantity: 1,
				unit: "шт",
				costPriceKopecks: 600, // 6 ₽
				canOmit: false,
				canAdjustQuantity: false,
			},
			// Дорогостоящие материалы (Уровень 2)
			{
				inventoryItemId: "mat-implant-osstem",
				itemName: "Дентальный имплантат Osstem TS III",
				tier: "expensive_clinical",
				defaultQuantity: 1,
				unit: "шт",
				costPriceKopecks: 650000, // 6 500 ₽
				canOmit: false,
				canAdjustQuantity: false,
			},
			{
				inventoryItemId: "mat-membrane-collagen",
				itemName: "Коллагеновая резорбируемая мембрана",
				tier: "expensive_clinical",
				defaultQuantity: 1,
				unit: "шт",
				costPriceKopecks: 420000, // 4 200 ₽
				canOmit: true, // Флаг ВН
				canAdjustQuantity: false,
				isOmitted: true, // Врач не использовал мембрану!
			},
			{
				inventoryItemId: "mat-anesthetic-articaine",
				itemName: "Анестетик Артикаин с адреналином 1:100 000",
				tier: "expensive_clinical",
				defaultQuantity: 1,
				unit: "карпула",
				costPriceKopecks: 14500, // 145 ₽
				canOmit: false,
				canAdjustQuantity: true, // Флаг ВИ
				actualQuantity: 2, // Врач потребовал 2 карпулы!
			},
		];

		const stocks = {
			"mat-gloves": 50,
			"mat-saliva": 100,
			"mat-implant-osstem": 5,
			"mat-membrane-collagen": 2,
			"mat-anesthetic-articaine": 10,
		};

		const result = processIdentMaterialWriteoff({
			visitId: "vis-1029",
			treatmentServiceId: "srv-impl-01",
			treatmentServiceTitle: "Установка дентального имплантата Osstem",
			norms,
			currentStocks: stocks,
			allowOverdraft: true,
		});

		// Overhead items: gloves (35 ₽) + saliva ejector (6 ₽) = 41 ₽ (4 100 kop)
		assert.equal(result.overheadItems.length, 2);
		assert.equal(result.overheadTotalCostKopecks, 4100);

		// Clinical items: implant (6 500 ₽) + membrane (0 ₽, omitted) + 2x anesthetic (290 ₽)
		assert.equal(result.clinicalItems.length, 3);
		// Implant: 6 500 ₽ (650 000 kop)
		// Membrane: omitted -> 0 kop
		// Anesthetic: 2 * 14 500 = 29 000 kop (290 ₽)
		// Total doctor deductible cost = 650 000 + 0 + 29 000 = 679 000 kop (6 790 ₽)
		assert.equal(result.clinicalTotalCostKopecks, 679000);
		assert.equal(result.totalDoctorDeductibleCostKopecks, 679000);

		// Verify omission details
		const membraneItem = result.clinicalItems.find((i) => i.inventoryItemId === "mat-membrane-collagen");
		assert.ok(membraneItem);
		assert.equal(membraneItem.isOmitted, true);
		assert.equal(membraneItem.quantity, 0);

		// Verify quantity adjustment
		const anesItem = result.clinicalItems.find((i) => i.inventoryItemId === "mat-anesthetic-articaine");
		assert.ok(anesItem);
		assert.equal(anesItem.wasAdjusted, true);
		assert.equal(anesItem.quantity, 2);
		assert.equal(anesItem.totalCostKopecks, 29000);

		// Format statutory act and check absence of emojis (Mandate 8d)
		const actText = formatIdentMaterialWriteoffAct(result, "Барабаш С.В.", "Иванов И.И.");
		assert.ok(actText.includes("АКТ 2-УРОВНЕВОГО СПИСАНИЯ МАТЕРИАЛОВ (СТАНДАРТ IDENT)"));
		assert.ok(actText.includes("НЕ ИСПОЛЬЗОВАН ВРАЧОМ / ФЛАГ ВН"));
		assert.ok(actText.includes("СКОРРЕКТИРОВАН ВРАЧОМ / ФЛАГ ВИ"));
		assert.ok(!/[🎉🚀💡🦷📦📄⚠️]/.test(actText), "Mandate 8d: zero cartoon emojis");
	});

	// ─── 4. IDENT 3 SALARY CALCULATION MODELS (GROSS / NET / CASH_BASIS) ───────

	test("calculateIdentDoctorSalary: model 'gross' computes percentage from full gross without deducting lab/materials", () => {
		// Gross: 100 000 ₽ (10 000 000 kop), Lab: 20 000 ₽, Expensive Materials: 15 000 ₽, Overhead Materials: 5 000 ₽
		// Rate: 30%, Salary Price: 2 000 ₽ flat addition
		const res = calculateIdentDoctorSalary({
			model: "gross",
			grossRevenueRub: 100000,
			labCostRub: 20000,
			expensiveMaterialsCostRub: 15000,
			overheadMaterialsCostRub: 5000,
			doctorPercent: 30,
			salaryPriceRub: 2000,
			salaryPriceApplication: "flat_addition",
			fixedSalaryRub: 10000,
			bonusesRub: 5000,
			penaltiesRub: 1000, // депремирование 1 000 ₽ из бонусов
			ndflRatePercent: 13,
		});

		// Base = Gross (100 000 ₽) — lab and materials are NOT deducted in Gross model!
		assert.equal(res.effectiveBaseRub, 100000);
		assert.equal(res.effectiveBaseKop, 10000000);
		// Piecework = 100 000 * 30% = 30 000 ₽ (3 000 000 kop)
		assert.equal(res.pieceworkAccruedRub, 30000);
		assert.equal(res.salaryPriceAdditionRub, 2000);
		// Fixed: 10 000 ₽
		assert.equal(res.fixedSalaryRub, 10000);
		// Effective bonuses = 5 000 - 1 000 = 4 000 ₽
		assert.equal(res.effectiveBonusesRub, 4000);
		// Total accrued = 30 000 (piecework) + 2 000 (salary_price) + 10 000 (fixed) + 4 000 (bonus) = 46 000 ₽
		assert.equal(res.totalAccruedRub, 46000);
		assert.equal(res.totalAccruedKop, 4600000);
		// Deductions recorded: 0 for Gross
		assert.equal(res.deductedLabKop, 0);
		assert.equal(res.deductedExpensiveMaterialsKop, 0);
		// Overhead covered: 5 000 ₽
		assert.equal(res.coveredOverheadMaterialsRub, 5000);
		// NDFL 13%: 46 000 * 0.13 = 5 980 ₽ (598 000 kop)
		assert.equal(res.ndflTaxRub, 5980);
		// Net payout: 46 000 - 5 980 = 40 020 ₽ (4 002 000 kop)
		assert.equal(res.netPayoutRub, 40020);
		assert.equal(res.netPayoutKop, 4002000);
	});

	test("calculateIdentDoctorSalary: model 'net' deducts lab and expensive materials but never cheap overhead", () => {
		// Gross: 100 000 ₽, Lab: 25 000 ₽, Expensive Materials: 15 000 ₽, Cheap Overhead: 4 000 ₽
		// Rate: 25%
		const res = calculateIdentDoctorSalary({
			model: "net",
			grossRevenueRub: 100000,
			labCostRub: 25000,
			expensiveMaterialsCostRub: 15000,
			overheadMaterialsCostRub: 4000, // салфетки и перчатки
			doctorPercent: 25,
			fixedSalaryRub: 0,
			ndflRatePercent: 13,
		});

		// Net base = 100 000 - 25 000 (Lab) - 15 000 (Expensive Materials) = 60 000 ₽ (6 000 000 kop)
		// Cheap overhead 4 000 ₽ is NOT deducted (Art. 129 Labor Code RF)
		assert.equal(res.effectiveBaseRub, 60000);
		assert.equal(res.effectiveBaseKop, 6000000);
		assert.equal(res.coveredOverheadMaterialsRub, 4000);
		// Piecework = 60 000 * 25% = 15 000 ₽ (1 500 000 kop)
		assert.equal(res.pieceworkAccruedRub, 15000);
		assert.equal(res.totalAccruedRub, 15000);
		// NDFL 13% = 1 950 ₽ (195 000 kop)
		assert.equal(res.ndflTaxRub, 1950);
		// Net payout = 15 000 - 1 950 = 13 050 ₽ (1 305 000 kop)
		assert.equal(res.netPayoutRub, 13050);
	});

	test("calculateIdentDoctorSalary: model 'cash_basis' with partial payment, 'replaces_gross_base' and deferred pending earnings", () => {
		// Gross: 50 000 ₽, Invoice Total: 45 000 ₽ (10% discount), Paid: 22 500 ₽ (50% paid in cash desk)
		// Lab: 5 000 ₽, Expensive Materials: 5 000 ₽ -> Clinic costs = 10 000 ₽
		// Doctor percent: 30%, Proportional discount policy
		const res = calculateIdentDoctorSalary({
			model: "cash_basis",
			grossRevenueRub: 50000,
			invoiceTotalRub: 45000,
			paidAmountRub: 22500,
			labCostRub: 5000,
			expensiveMaterialsCostRub: 5000,
			doctorPercent: 30,
			discountPolicy: "proportional",
			fixedSalaryRub: 0,
			ndflRatePercent: 13,
		});

		// Paid ratio = 22 500 / 45 000 = 0.5 (50%)
		assert.equal(res.paidRatio, 0.5);
		// Full target base at 100% = 50 000 - 10 000 (costs) - 5 000 (discount) = 35 000 ₽ (3 500 000 kop)
		// At 50% payment: Doctor base = 35 000 * 0.5 = 17 500 ₽ (1 750 000 kop)
		assert.equal(res.effectiveBaseRub, 17500);
		assert.equal(res.effectiveBaseKop, 1750000);
		// Piecework accrued now = 17 500 * 30% = 5 250 ₽ (525 000 kop)
		assert.equal(res.pieceworkAccruedRub, 5250);
		assert.equal(res.totalAccruedRub, 5250);
		// Deferred pending doctor earnings (unpaid 50% remainder) = (35 000 * 30%) - 5 250 = 10 500 - 5 250 = 5 250 ₽
		assert.equal(res.deferredPendingDoctorEarningsRub, 5250);
		assert.equal(res.deferredPendingDoctorEarningsKop, 525000);
		// NDFL 13% = 682.50 -> 683 ₽ (68 250 kop rounded)
		assert.equal(res.ndflTaxKop, 68250);
	});

	test("calculateIdentDoctorSalary: handles materialWriteoffResult auto-extraction and Dentaro deduction", () => {
		const norms: IdentConsumableNorm[] = [
			{
				inventoryItemId: "mat-gloves-std",
				itemName: "Перчатки нитриловые",
				tier: "cheap_overhead",
				defaultQuantity: 2,
				unit: "пара",
				costPriceKopecks: 3000, // 30 ₽ * 2 = 60 ₽
				canOmit: false,
				canAdjustQuantity: false,
			},
			{
				inventoryItemId: "mat-crown-zirconia",
				itemName: "Диоксид циркония предокрашенный",
				tier: "expensive_clinical",
				defaultQuantity: 1,
				unit: "диск",
				costPriceKopecks: 800000, // 8 000 ₽
				canOmit: false,
				canAdjustQuantity: false,
			},
		];

		const writeoffRes = processIdentMaterialWriteoff({
			visitId: "v-8841",
			treatmentServiceId: "s-crown-01",
			treatmentServiceTitle: "Коронка из диоксида циркония",
			norms,
			currentStocks: { "mat-gloves-std": 100, "mat-crown-zirconia": 10 },
		});

		// Auto extraction: cheap overhead = 60 ₽, expensive clinical = 8 000 ₽
		const extracted = extractDeductibleMaterialsFromWriteoff(writeoffRes);
		assert.equal(extracted.cheapOverheadCostKop, 6000);
		assert.equal(extracted.expensiveClinicalCostKop, 800000);

		// Calculate doctor salary passing writeoffRes directly
		const salaryRes = calculateIdentDoctorSalary({
			model: "net",
			grossRevenueRub: 35000,
			labCostRub: 5000,
			materialWriteoffResult: writeoffRes, // auto extracts expensive: 8 000 ₽, overhead: 60 ₽
			doctorPercent: 25,
			oneTimeDeductions: [
				{
					id: "dentaro-ded-1",
					amountKop: 100000 as Kopecks, // 1 000 ₽ удержание за скол
					reason: "Скол при примерке",
				},
			],
		});

		// Net base = 35 000 - 5 000 (Lab) - 8 000 (Expensive Material) = 22 000 ₽ (2 200 000 kop)
		// Gloves 60 ₽ NOT deducted
		assert.equal(salaryRes.effectiveBaseRub, 22000);
		assert.equal(salaryRes.coveredOverheadMaterialsRub, 60);
		// Piecework before deduction = 22 000 * 25% = 5 500 ₽ (550 000 kop)
		assert.equal(salaryRes.pieceworkAccruedRub, 5500);
		// After 1 000 ₽ Dentaro deduction = 4 500 ₽ (450 000 kop)
		assert.equal(salaryRes.oneTimeDeductionsTotalRub, 1000);
		assert.equal(salaryRes.totalAccruedRub, 4500);
		assert.equal(salaryRes.totalAccruedKop, 450000);
	});
});

