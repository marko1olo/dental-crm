import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	calculateDoctorPeriodPayroll,
	extractDeductibleMaterialsFromWriteoff,
} from "../finance/payrollModules/index.js";
import {
	processClinicalMaterialWriteoff,
	formatClinicalMaterialWriteoffAct,
	type ClinicalConsumableNorm,
} from "../warehouse/clinicalMaterialWriteoffEngine.js";

describe("Doctor Production Piece-Rate Salary & Material Write-Off (DENTE First Principles)", () => {
	// ─── 1. 2-LEVEL MATERIAL WRITE-OFF (ВН / ВИ ФЛАГИ) ──────────────────────────

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

	// ─── 2. EXTRACT DEDUCTIBLE MATERIALS ────────────────────────────────────────

	test("extractDeductibleMaterialsFromWriteoff: isolates expensive clinical costs from general overhead", () => {
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
		assert.equal(extracted.totalDoctorDeductibleKop, 800000);
	});

	// ─── 3. DOCTOR PRODUCTION NET SALARY CALCULATION ─────────────────────────────

	test("calculateDoctorPeriodPayroll: deducts lab and expensive materials but never cheap overhead", () => {
		// Scenario: Gross = 100 000 ₽ (10 000 000 kop)
		// Lab = 25 000 ₽ (2 500 000 kop)
		// Expensive Materials = 15 000 ₽ (1 500 000 kop)
		// Cheap Overhead Supplies = 4 000 ₽ (400 000 kop)
		// Doctor Percent = 25%
		// Expected: Net Base = 100 000 - 25 000 - 15 000 = 60 000 ₽ (6 000 000 kop)
		// Overhead Covered = 4 000 ₽ (400 000 kop) — paid by clinic!
		// Piecework commission = 60 000 * 25% = 15 000 ₽ (1 500 000 kop)
		// 13% NDFL = 15 000 * 13% = 1 950 ₽ (195 000 kop)
		// Net Payout = 15 000 - 1 950 = 13 050 ₽ (1 305 000 kop)
		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-ortho-1",
			doctorName: "Сидоров Алексей Петрович",
			specialtyId: "orthopedics",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			customBasePercentage: 25,
			services: [
				{
					id: "srv-ortho-1",
					dateIso: "2026-08-10",
					patientName: "Ковалев И.Н.",
					medicalCardNumber: "043-501",
					serviceNameRu: "Коронка E.max",
					category: "orthopedics",
					grossRevenueKop: 10000000,
					labCostKop: 2500000,
					materialCostKop: 0,
					materialItems: [
						{ name: "Перчатки смотровые и салфетки", costKop: 400000, isOverhead: true },
						{ name: "Слепочная масса Elite HD+", costKop: 1500000, isOverhead: false },
					],
				},
			],
		});

		assert.equal(res.totalGrossRevenueKop, 10000000);
		assert.equal(res.totalLabDeductionsKop, 2500000);
		assert.equal(res.totalMaterialDeductionsKop, 1500000);
		assert.equal(res.overheadConsumablesCoveredKop, 400000);
		assert.equal(res.totalNetBaseKop, 6000000);
		assert.equal(res.earnedBaseCommissionKop, 1500000);
		assert.equal(res.grossPayoutBeforeTaxKop, 1500000);
		assert.equal(res.ndflTaxKop, 195000);
		assert.equal(res.netPayoutToDoctorKop, 1305000);
	});

	// ─── 4. LABOR CODE RF (ТК РФ СТ. 137, 192) & GUARANTEED MINIMUM ───────────────

	test("calculateDoctorPeriodPayroll: applies minimum monthly guarantee when accrued earnings are below threshold", () => {
		// Scenario: A doctor has 1 small service, earning 2 500 ₽ commission.
		// Therapy preset monthly minimum guarantee is 60 000 ₽ (6 000 000 kop).
		// With applyMinimumGuarantee: true, payout must rise to 60 000 ₽!
		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-guar-1",
			doctorName: "Новиков Денис Игоревич",
			specialtyId: "therapy",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			applyMinimumGuarantee: true,
			services: [
				{
					id: "srv-small",
					dateIso: "2026-08-05",
					patientName: "Тестовый Пациент",
					medicalCardNumber: "043-11",
					serviceNameRu: "Осмотр и консультация",
					category: "therapy",
					grossRevenueKop: 1000000, // 10 000 ₽
					labCostKop: 0,
					materialCostKop: 0,
					customCommissionPercent: 25, // 2 500 ₽
				},
			],
		});

		assert.equal(res.earnedBaseCommissionKop, 250000);
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.grossPayoutBeforeTaxKop, 6000000); // 60 000 ₽ guaranteed floor
		assert.equal(res.ndflTaxKop, 780000); // 60 000 * 13% = 7 800 ₽ (780 000 kop)
		assert.equal(res.netPayoutToDoctorKop, 5220000); // 52 200 ₽ net
	});
});
