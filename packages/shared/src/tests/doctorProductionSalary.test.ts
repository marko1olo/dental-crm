import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	calculateDiscountSalaryBase,
	calculateDoctorNetSalary,
	calculateDoctorSalary,
	extractDeductibleMaterialsFromWriteoff,
} from "../finance/doctorNetSalaryEngine.js";
import {
	processClinicalMaterialWriteoff,
	formatClinicalMaterialWriteoffAct,
	type ClinicalConsumableNorm,
} from "../warehouse/clinicalMaterialWriteoffEngine.js";
import type { Kopecks } from "../money.js";

describe("Doctor Production Piece-Rate Salary & Material Write-Off (DENTE First Principles)", () => {
	// ─── 1. DISCOUNT & PARTIAL PAYMENT POLICIES ─────────────────────────────────

	test("calculateDiscountSalaryBase: gross_unconditional gives doctor full base regardless of discount/debt", () => {
		const result = calculateDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 800000 as Kopecks,
			paidKop: 500000 as Kopecks,
			discountKop: 200000 as Kopecks,
			clinicCostsKop: 300000 as Kopecks,
			policy: "gross_unconditional",
		});

		assert.equal(result.doctorBaseKop, 700000);
		assert.equal(result.doctorBaseRub, 7000);
		assert.equal(result.isFullyPaid, false);
		assert.equal(result.debtKop, 300000);
	});

	test("calculateDiscountSalaryBase: clinic_first prioritizes clinic costs coverage", () => {
		const partialUnder = calculateDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 1000000 as Kopecks,
			paidKop: 200000 as Kopecks,
			discountKop: 0 as Kopecks,
			clinicCostsKop: 300000 as Kopecks,
			policy: "clinic_first",
		});
		assert.equal(partialUnder.doctorBaseKop, 0);
		assert.equal(partialUnder.clinicShareKop, 200000);

		const partialOver = calculateDiscountSalaryBase({
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

	test("calculateDiscountSalaryBase: doctor_first pays doctor fee first", () => {
		const result = calculateDiscountSalaryBase({
			grossRevenueKop: 1000000 as Kopecks,
			invoiceTotalKop: 1000000 as Kopecks,
			paidKop: 500000 as Kopecks,
			discountKop: 0 as Kopecks,
			clinicCostsKop: 300000 as Kopecks,
			policy: "doctor_first",
		});
		assert.equal(result.doctorBaseKop, 500000);
		assert.equal(result.clinicShareKop, 0);

		const resultHigh = calculateDiscountSalaryBase({
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

	test("calculateDiscountSalaryBase: proportional scales doctor base by payment ratio", () => {
		const result = calculateDiscountSalaryBase({
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

	// ─── 2. ONE-TIME DOCTOR PERCENTAGE DEDUCTION ───────────────────────────────

	test("calculateDoctorNetSalary: correctly applies one-time deduction from piecework", () => {
		const result = calculateDoctorNetSalary({
			grossRevenueRub: 50000,
			labCostRub: 10000,
			materialsCostRub: 5000,
			categoryPercent: 30,
			fixedSalaryRub: 0,
			oneTimeDeductions: [
				{
					id: "ded-01",
					amountKop: 200000 as Kopecks,
					reason: "Брак слепка / переделка коронки ЗТЛ наряд № 841",
					orderNumber: "ЗТЛ-841",
				},
			],
			ndflRatePercent: 13,
		});

		assert.equal(result.netBaseRevenueRub, 35000);
		assert.equal(result.pieceworkAccruedKop, 1050000);
		assert.equal(result.oneTimeDeductionsTotalKop, 200000);
		assert.equal(result.oneTimeDeductionsTotalRub, 2000);
		assert.equal(result.totalAccruedKop, 850000);
		assert.equal(result.totalAccruedRub, 8500);
		assert.equal(result.ndflTaxKop, 110500);
		assert.equal(result.netPayoutKop, 739500);
		assert.equal(result.netPayoutRub, 7395);
	});

	// ─── 3. 2-LEVEL MATERIAL WRITE-OFF (ВН / ВИ ФЛАГИ) ──────────────────────────

	test("processClinicalMaterialWriteoff: segregates cheap overhead from expensive clinical materials", () => {
		const norms: ClinicalConsumableNorm[] = [
			{
				inventoryItemId: "mat-gloves",
				itemName: "Перчатки нитриловые смотровые",
				tier: "cheap_overhead",
				defaultQuantity: 1,
				unit: "пара",
				costPriceKopecks: 3500,
				canOmit: false,
				canAdjustQuantity: false,
			},
			{
				inventoryItemId: "mat-saliva",
				itemName: "Слюноотсос одноразовый",
				tier: "cheap_overhead",
				defaultQuantity: 1,
				unit: "шт",
				costPriceKopecks: 600,
				canOmit: false,
				canAdjustQuantity: false,
			},
			{
				inventoryItemId: "mat-implant-osstem",
				itemName: "Дентальный имплантат Osstem TS III",
				tier: "expensive_clinical",
				defaultQuantity: 1,
				unit: "шт",
				costPriceKopecks: 650000,
				canOmit: false,
				canAdjustQuantity: false,
			},
			{
				inventoryItemId: "mat-membrane-collagen",
				itemName: "Коллагеновая резорбируемая мембрана",
				tier: "expensive_clinical",
				defaultQuantity: 1,
				unit: "шт",
				costPriceKopecks: 420000,
				canOmit: true,
				canAdjustQuantity: false,
				isOmitted: true,
			},
			{
				inventoryItemId: "mat-anesthetic-articaine",
				itemName: "Анестетик Артикаин с адреналином 1:100 000",
				tier: "expensive_clinical",
				defaultQuantity: 1,
				unit: "карпула",
				costPriceKopecks: 14500,
				canOmit: false,
				canAdjustQuantity: true,
				actualQuantity: 2,
			},
		];

		const stocks = {
			"mat-gloves": 50,
			"mat-saliva": 100,
			"mat-implant-osstem": 5,
			"mat-membrane-collagen": 2,
			"mat-anesthetic-articaine": 10,
		};

		const result = processClinicalMaterialWriteoff({
			visitId: "vis-1029",
			treatmentServiceId: "srv-impl-01",
			treatmentServiceTitle: "Установка дентального имплантата Osstem",
			norms,
			currentStocks: stocks,
			allowOverdraft: true,
		});

		assert.equal(result.overheadItems.length, 2);
		assert.equal(result.overheadTotalCostKopecks, 4100);
		assert.equal(result.clinicalItems.length, 3);
		assert.equal(result.clinicalTotalCostKopecks, 679000);
		assert.equal(result.totalDoctorDeductibleCostKopecks, 679000);

		const membraneItem = result.clinicalItems.find((i) => i.inventoryItemId === "mat-membrane-collagen");
		assert.ok(membraneItem);
		assert.equal(membraneItem.isOmitted, true);
		assert.equal(membraneItem.quantity, 0);

		const anesItem = result.clinicalItems.find((i) => i.inventoryItemId === "mat-anesthetic-articaine");
		assert.ok(anesItem);
		assert.equal(anesItem.wasAdjusted, true);
		assert.equal(anesItem.quantity, 2);
		assert.equal(anesItem.totalCostKopecks, 29000);

		const actText = formatClinicalMaterialWriteoffAct(result, "Барабаш С.В.", "Иванов И.И.");
		assert.ok(actText.includes("АКТ 2-УРОВНЕВОГО СПИСАНИЯ МАТЕРИАЛОВ (СТАНДАРТ DENTE)"));
		assert.ok(actText.includes("НЕ ИСПОЛЬЗОВАН ВРАЧОМ / ФЛАГ ВН"));
		assert.ok(actText.includes("СКОРРЕКТИРОВАН ВРАЧОМ / ФЛАГ ВИ"));
		assert.ok(!/[🎉🚀💡🦷📦📄⚠️]/.test(actText), "Mandate 8d: zero cartoon emojis");
	});

	// ─── 4. DOCTOR SALARY CALCULATION MODELS (GROSS / NET / CASH_BASIS) ─────────

	test("calculateDoctorSalary: model 'gross' computes percentage from full gross without deducting lab/materials", () => {
		const res = calculateDoctorSalary({
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
			penaltiesRub: 1000,
			ndflRatePercent: 13,
		});

		assert.equal(res.effectiveBaseRub, 100000);
		assert.equal(res.effectiveBaseKop, 10000000);
		assert.equal(res.pieceworkAccruedRub, 30000);
		assert.equal(res.salaryPriceAdditionRub, 2000);
		assert.equal(res.fixedSalaryRub, 10000);
		assert.equal(res.effectiveBonusesRub, 4000);
		assert.equal(res.totalAccruedRub, 46000);
		assert.equal(res.totalAccruedKop, 4600000);
		assert.equal(res.deductedLabKop, 0);
		assert.equal(res.deductedExpensiveMaterialsKop, 0);
		assert.equal(res.coveredOverheadMaterialsRub, 5000);
		assert.equal(res.ndflTaxRub, 5980);
		assert.equal(res.netPayoutRub, 40020);
		assert.equal(res.netPayoutKop, 4002000);
	});

	test("calculateDoctorSalary: model 'net' deducts lab and expensive materials but never cheap overhead", () => {
		const res = calculateDoctorSalary({
			model: "net",
			grossRevenueRub: 100000,
			labCostRub: 25000,
			expensiveMaterialsCostRub: 15000,
			overheadMaterialsCostRub: 4000,
			doctorPercent: 25,
			fixedSalaryRub: 0,
			ndflRatePercent: 13,
		});

		assert.equal(res.effectiveBaseRub, 60000);
		assert.equal(res.effectiveBaseKop, 6000000);
		assert.equal(res.coveredOverheadMaterialsRub, 4000);
		assert.equal(res.pieceworkAccruedRub, 15000);
		assert.equal(res.totalAccruedRub, 15000);
		assert.equal(res.ndflTaxRub, 1950);
		assert.equal(res.netPayoutRub, 13050);
	});

	test("calculateDoctorSalary: model 'cash_basis' with partial payment, 'replaces_gross_base' and deferred pending earnings", () => {
		const res = calculateDoctorSalary({
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

		assert.equal(res.paidRatio, 0.5);
		assert.equal(res.effectiveBaseRub, 17500);
		assert.equal(res.effectiveBaseKop, 1750000);
		assert.equal(res.pieceworkAccruedRub, 5250);
		assert.equal(res.totalAccruedRub, 5250);
		assert.equal(res.deferredPendingDoctorEarningsRub, 5250);
		assert.equal(res.deferredPendingDoctorEarningsKop, 525000);
		assert.equal(res.ndflTaxKop, 68250);
	});

	test("calculateDoctorSalary: handles materialWriteoffResult auto-extraction and deduction", () => {
		const norms: ClinicalConsumableNorm[] = [
			{
				inventoryItemId: "mat-gloves-std",
				itemName: "Перчатки нитриловые",
				tier: "cheap_overhead",
				defaultQuantity: 2,
				unit: "пара",
				costPriceKopecks: 3000,
				canOmit: false,
				canAdjustQuantity: false,
			},
			{
				inventoryItemId: "mat-crown-zirconia",
				itemName: "Диоксид циркония предокрашенный",
				tier: "expensive_clinical",
				defaultQuantity: 1,
				unit: "диск",
				costPriceKopecks: 800000,
				canOmit: false,
				canAdjustQuantity: false,
			},
		];

		const writeoffRes = processClinicalMaterialWriteoff({
			visitId: "v-8841",
			treatmentServiceId: "s-crown-01",
			treatmentServiceTitle: "Коронка из диоксида циркония",
			norms,
			currentStocks: { "mat-gloves-std": 100, "mat-crown-zirconia": 10 },
		});

		const extracted = extractDeductibleMaterialsFromWriteoff(writeoffRes);
		assert.equal(extracted.cheapOverheadCostKop, 6000);
		assert.equal(extracted.expensiveClinicalCostKop, 800000);

		const salaryRes = calculateDoctorSalary({
			model: "net",
			grossRevenueRub: 35000,
			labCostRub: 5000,
			materialWriteoffResult: writeoffRes,
			doctorPercent: 25,
			oneTimeDeductions: [
				{
					id: "ded-1",
					amountKop: 100000 as Kopecks,
					reason: "Скол при примерке",
				},
			],
		});

		assert.equal(salaryRes.effectiveBaseRub, 22000);
		assert.equal(salaryRes.coveredOverheadMaterialsRub, 60);
		assert.equal(salaryRes.pieceworkAccruedRub, 5500);
		assert.equal(salaryRes.oneTimeDeductionsTotalRub, 1000);
		assert.equal(salaryRes.totalAccruedRub, 4500);
		assert.equal(salaryRes.totalAccruedKop, 450000);
	});
});
