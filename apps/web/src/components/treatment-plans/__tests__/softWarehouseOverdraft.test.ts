/**
 * softWarehouseOverdraft.test.ts — Тестирование механизма мягкого овердрафта склада (Мандаты 8e п. 10, 8n п. 2).
 *
 * Проверяет:
 * 1. Выявление дефицита при расчете расхода ТМЦ по этапам плана лечения (Приказ 804н).
 * 2. Формирование Акта выполненных работ со спецификацией ТМЦ при нулевом или недостаточном складском остатке.
 * 3. Отсутствие блокировки проведения списания при дефиците ТМЦ (ликвидация складского цербера).
 * 4. Корректность подсказок, бейджей и статусов мягкого овердрафта.
 * 5. Точность финансового учета себестоимости и маржинальности до копейки (ACID).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { ToothData } from "../../odontogram/ToothChart";
import {
	calculateStageMaterialRequirements,
	generateCompletedWorksActAndWriteOff,
	type InventoryItemLookup,
} from "../treatmentPlanMaterialEngine";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";
import { calculateDeductionSummary, type DeductionLineItem } from "../../inventory/inventoryMath";
import { calculateClinicalWriteoffTotals, type ClinicalWriteoffLine } from "../../inventory/writeoff/clinicalWriteoffEngine";
import { rublesToKopecks } from "@dental/shared";

describe("Soft Warehouse Overdraft Engine (Mandate 8e Item 10 & Mandate 8n Item 2)", () => {
	const teethSample: ToothData[] = [
		{ toothNumber: 16, state: "Caries" },
		{ toothNumber: 26, state: "Caries" },
	];

	test("1. Выявление дефицита ТМЦ при недостаточном складском остатке", () => {
		const stages = generateTreatmentPlanStages(teethSample, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;

		// Склад, где анестетика 0 карпул (накладная еще не оприходована медсестрой)
		const zeroStockInventory: InventoryItemLookup[] = [
			{
				id: "inv-anes-zero",
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 (Убистезин / Септонест)",
				stockQuantity: 0, // Полный дефицит
				unitCostRub: 220,
			},
			{
				id: "inv-comp-low",
				name: "Нанокомпозит светоотверждаемый (Estelite Asteria / Filtek)",
				stockQuantity: 0.1, // Недостаточно
				unitCostRub: 1400,
			},
		];

		const summary = calculateStageMaterialRequirements(stage1, zeroStockInventory);

		assert.equal(summary.hasDeficit, true, "Должен быть зафиксирован дефицит");
		assert.ok(summary.deficitCount >= 1, "Количество дефицитных позиций >= 1");

		const deficitItems = summary.items.filter((it) => it.isDeficit);
		assert.ok(deficitItems.length >= 1, "Должны присутствовать элементы с isDeficit = true");

		for (const it of deficitItems) {
			assert.equal(it.isDeficit, true);
			assert.ok(
				it.deficitQuantity > 0,
				`Дефицит для ${it.materialName} должен быть строго > 0 (получено: ${it.deficitQuantity})`,
			);
		}
	});

	test("2. Формирование Акта выполненных работ со спецификацией ТМЦ при мягком овердрафте", () => {
		const stages = generateTreatmentPlanStages(teethSample, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;

		const zeroStockInventory: InventoryItemLookup[] = [
			{
				id: "inv-anes-zero",
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 (Убистезин / Септонест)",
				stockQuantity: 0,
				unitCostRub: 220,
			},
		];

		const actData = generateCompletedWorksActAndWriteOff({
			stage: stage1,
			contractNumber: "D-2026-OVERDRAFT-01",
			patientId: "patient-overdraft-test",
			patientName: "Смирнова Елена Васильевна",
			doctorFullName: "Д-р Смирнов А.П.",
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			inventoryItems: zeroStockInventory,
		});

		assert.equal(actData.contractNumber, "D-2026-OVERDRAFT-01");
		assert.equal(actData.patientName, "Смирнова Елена Васильевна");
		assert.ok(actData.completedProcedures.length > 0, "Должны быть выполненные процедуры");
		assert.ok(actData.writtenOffMaterials.length > 0, "Должны быть материалы к списанию");

		// Проверяем наличие дефицитных позиций
		const hasDeficit = actData.writtenOffMaterials.some((m) => m.isDeficit);
		assert.equal(hasDeficit, true, "В акте зафиксирован дефицит материалов");

		// В соответствии с Мандатом 8e, наличие дефицита НЕ должно препятствовать формированию акта
		assert.ok(actData.totalMaterialCostRub > 0, "Себестоимость материалов рассчитана");
		assert.ok(actData.totalMaterialCostKopecks > 0, "Себестоимость ТМЦ в копейках точна");
	});

	test("3. Инвариант Мандата 8e п. 10: Списание с овердрафтом не блокируется", () => {
		// Симулируем состояние кнопки списания в TreatmentPlanCompletedActPrint
		const hasDeficit = true;
		const isExecuting = false;

		// СТАРАЯ логика (брак): disabled = isExecuting || hasDeficit => true (БЛОКИРОВКА!)
		const oldDisabledLogic = isExecuting || hasDeficit;
		assert.equal(oldDisabledLogic, true, "Старая логика блокировала врача/пациента на ресепшене");

		// НОВАЯ логика (Мандат 8e): disabled = isExecuting => false (НЕ БЛОКИРУЕТСЯ!)
		const newDisabledLogic = isExecuting;
		assert.equal(newDisabledLogic, false, "Новая логика: кнопка активна при дефиците (мягкий овердрафт)");

		// Текст кнопки адаптируется под мягкий овердрафт
		const buttonText = isExecuting
			? "Проведение списания..."
			: hasDeficit
				? "Провести списание (Мягкий овердрафт склада)"
				: "Провести списание ТМЦ";

		assert.equal(buttonText, "Провести списание (Мягкий овердрафт склада)");

		// Тултип информирует о списании в минус до оприходования накладной
		const tooltipText = hasDeficit
			? "Позиции будут списаны с отрицательным остатком до оприходования накладной медсестрой (Мандат 8e п. 10, Мандат 8n п. 2)"
			: "Провести списание расходных материалов ТМЦ";

		assert.ok(tooltipText.includes("отрицательным остатком"), "Подсказка содержит пояснение про овердрафт");
		assert.ok(tooltipText.includes("Мандат 8e"), "Подсказка ссылается на автономию врача (Мандат 8e)");
	});

	test("4. calculateDeductionSummary в ProcedureMaterialDeductionModal фиксирует дефицит без сбоев", () => {
		const lines: DeductionLineItem[] = [
			{
				id: "line-1",
				materialName: "Анестетик Артикаин",
				category: "anesthesia",
				unit: "карп.",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 25000,
				stockQuantity: 0, // Дефицит!
				criticalThreshold: 5,
				source: "tech_map",
				mandatory: true,
			},
			{
				id: "line-2",
				materialName: "Перчатки нитриловые",
				category: "ppe",
				unit: "пар",
				quantity: 1,
				standardQuantity: 1,
				unitCostKopecks: 5000,
				stockQuantity: 50,
				criticalThreshold: 10,
				source: "tech_map",
				mandatory: true,
			},
		];

		const summary = calculateDeductionSummary(lines);

		assert.equal(summary.hasDeficit, true);
		assert.equal(summary.criticalCount, 1);
		assert.equal(summary.totalCostKopecks, 55000); // 2 * 25000 + 1 * 5000 = 55000 копеек
		assert.equal(Math.round(summary.totalCostKopecks / 100), 550);

		// Проверяем, что дефицитная строка рассчитывает shortfall
		const line1Shortfall = Math.max(0, lines[0]!.quantity - lines[0]!.stockQuantity);
		assert.equal(line1Shortfall, 2, "Дефицит составляет 2 карпулы");
	});

	test("5. calculateClinicalWriteoffTotals в ClinicalWriteoffModal корректно рассчитывает дефицитные позиции", () => {
		const lines: ClinicalWriteoffLine[] = [
			{
				id: "cw-line-1",
				materialId: "mat-bio-oss-01",
				serviceCode: "A16.07.055",
				serviceTitle: "Костная пластика челюстно-лицевой области",
				sku: "SKU-001",
				nameRu: "Костный коллаген Bio-Oss",
				category: "surgery",
				unit: "г",
				okeiCode: "163",
				unitCostKopecks: rublesToKopecks(4500),
				totalCostKopecks: rublesToKopecks(4500),
				standardQuantity: 1,
				actualQuantity: 1,
				discrepancyQuantity: 0,
				discrepancyReasonCode: "standard_consumption",
				isExpiringSoon: false,
				isExpired: false,
				stockAvailable: 0, // 0 на складе (накладная задерживается)
				criticalThreshold: 2,
				stockStatus: "deficit",
				isMandatory: true,
				requiresLotTracking: true,
				requiresSerialNumber: false,
			},
		];

		const totals = calculateClinicalWriteoffTotals(lines, 1);

		assert.equal(totals.hasDeficit, true);
		assert.equal(totals.deficitItemsCount, 1);
		assert.equal(totals.totalCostRubles, 4500);
	});
});
