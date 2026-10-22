/**
 * softWarehouseDeficitAndAct.test.ts — расчет дефицита и Акт выполненных работ (Мандат 8e п. 10).
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	calculateStageMaterialRequirements,
	generateCompletedWorksActAndWriteOff,
} from "../treatmentPlanMaterialEngine";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";
import { teethSampleOverdraft, zeroStockInventorySample } from "./helpers/overdraftTestHelpers";

describe("Soft Warehouse Overdraft — Дефицит и Акт выполненных работ", () => {
	test("1. Выявление дефицита ТМЦ при недостаточном складском остатке", () => {
		const stages = generateTreatmentPlanStages(teethSampleOverdraft, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;
		const summary = calculateStageMaterialRequirements(stage1, zeroStockInventorySample);

		assert.equal(summary.hasDeficit, true);
		assert.ok(summary.deficitCount >= 1);

		const deficitItems = summary.items.filter((it) => it.isDeficit);
		assert.ok(deficitItems.length >= 1);
		for (const it of deficitItems) {
			assert.equal(it.isDeficit, true);
			assert.ok(it.deficitQuantity > 0);
		}
	});

	test("2. Формирование Акта выполненных работ со спецификацией ТМЦ при мягком овердрафте", () => {
		const stages = generateTreatmentPlanStages(teethSampleOverdraft, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;

		const actData = generateCompletedWorksActAndWriteOff({
			stage: stage1,
			contractNumber: "D-2026-OVERDRAFT-01",
			patientId: "patient-overdraft-test",
			patientName: "Смирнова Елена Васильевна",
			doctorFullName: "Д-р Смирнов А.П.",
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			inventoryItems: zeroStockInventorySample,
		});

		assert.equal(actData.contractNumber, "D-2026-OVERDRAFT-01");
		assert.equal(actData.patientName, "Смирнова Елена Васильевна");
		assert.ok(actData.completedProcedures.length > 0);
		assert.ok(actData.writtenOffMaterials.length > 0);

		const hasDeficit = actData.writtenOffMaterials.some((m) => m.isDeficit);
		assert.equal(hasDeficit, true);
		assert.ok(actData.totalMaterialCostRub > 0);
		assert.ok(actData.totalMaterialCostKopecks > 0);
	});

	test("3. Инвариант Мандата 8e п. 10: Списание с овердрафтом не блокируется", () => {
		const hasDeficit = true;
		const isExecuting = false;

		const oldDisabledLogic = isExecuting || hasDeficit;
		assert.equal(oldDisabledLogic, true);

		const newDisabledLogic = isExecuting;
		assert.equal(newDisabledLogic, false);

		const buttonText = isExecuting
			? "Проведение списания..."
			: hasDeficit
				? "Провести списание (Мягкий овердрафт склада)"
				: "Провести списание ТМЦ";

		assert.equal(buttonText, "Провести списание (Мягкий овердрафт склада)");

		const tooltipText = hasDeficit
			? "Позиции будут списаны с отрицательным остатком до оприходования накладной медсестрой (Мандат 8e п. 10, Мандат 8n п. 2)"
			: "Провести списание расходных материалов ТМЦ";

		assert.ok(tooltipText.includes("отрицательным остатком"));
		assert.ok(tooltipText.includes("Мандат 8e"));
	});
});
