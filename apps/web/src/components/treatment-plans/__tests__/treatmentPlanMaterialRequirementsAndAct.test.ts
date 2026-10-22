/**
 * treatmentPlanMaterialRequirementsAndAct.test.ts — расчет себестоимости материалов и Акт сдачи-приемки.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { ToothData } from "../../odontogram/ToothChart";
import {
	calculatePlanTotalMaterialCost,
	calculateStageMaterialRequirements,
	generateCompletedWorksActAndWriteOff,
	type InventoryItemLookup,
} from "../treatmentPlanMaterialEngine";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";

describe("treatmentPlanMaterialEngine — Потребности материалов и Акт выполненных работ", () => {
	test("calculateStageMaterialRequirements рассчитывает расход, себестоимость и маржинальность", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 26, state: "Caries" },
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;

		const mockInventory: InventoryItemLookup[] = [
			{
				id: "inv-comp",
				name: "Нанокомпозит светоотверждаемый (Estelite Asteria / Filtek)",
				stockQuantity: 10,
				unitCostRub: 1200,
			},
			{
				id: "inv-anes",
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 (Убистезин / Септонест)",
				stockQuantity: 1,
				unitCostRub: 200,
			},
		];

		const summary = calculateStageMaterialRequirements(stage1, mockInventory);
		assert.equal(summary.stageNumber, 1);
		assert.ok(summary.items.length > 0);
		assert.ok(summary.totalMaterialsCostKopecks > 0);
		assert.ok(summary.serviceRevenueKopecks > 0);
		assert.ok(summary.grossMarginKopecks > 0);
		assert.ok(summary.marginPercent > 0 && summary.marginPercent < 100);
		assert.equal(summary.hasDeficit, true);
		assert.ok(summary.deficitCount >= 1);
	});

	test("calculatePlanTotalMaterialCost суммирует себестоимость и маржу по всем этапам", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Pulpitis" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const total = calculatePlanTotalMaterialCost(stages);

		assert.equal(total.summaries.length, 3);
		assert.ok(total.totalMaterialsCostKopecks > 0);
		assert.ok(total.totalServiceRevenueKopecks > 0);
		assert.ok(total.totalGrossMarginKopecks > 0);
		assert.ok(total.overallMarginPercent > 50);
	});

	test("generateCompletedWorksActAndWriteOff формирует официальный Акт сдачи-приемки и спецификацию ТМЦ", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Caries" }];
		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const stage1 = stages[0]!;

		const act = generateCompletedWorksActAndWriteOff({
			stage: stage1,
			contractNumber: "D-2026-TEST01",
			patientId: "patient-12345",
			patientName: "Иванов Иван Иванович",
			doctorFullName: "Петрова Анна Сергеевна",
			clinicName: "Клиника ДЕНТЕ",
		});

		assert.ok(act.actNumber.startsWith("ACT-2026-1-"));
		assert.equal(act.contractNumber, "D-2026-TEST01");
		assert.equal(act.patientName, "Иванов Иван Иванович");
		assert.equal(act.doctorFullName, "Петрова Анна Сергеевна");
		assert.equal(act.stageNumber, 1);
		assert.ok(act.completedProcedures.length > 0);
		assert.ok(act.writtenOffMaterials.length > 0);
		assert.equal(act.status, "draft");
	});
});
