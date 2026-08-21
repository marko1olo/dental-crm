/**
 * treatmentPlanMaterialEngine.test.ts — тестирование норм расхода ТМЦ, списания со склада и калькуляции себестоимости.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { parseKopecks, sumKopecks } from "@dental/shared";
import type { ToothData } from "../../odontogram/ToothChart";
import {
	calculatePlanTotalMaterialCost,
	calculateStageMaterialRequirements,
	generateCompletedWorksActAndWriteOff,
	type InventoryItemLookup,
	matchMaterialToInventoryItem,
	ORDER_804N_MATERIAL_NORMS_MAP,
} from "../treatmentPlanMaterialEngine";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";

describe("treatmentPlanMaterialEngine: Order 804n Material Consumption Norms", () => {
	test("Все нормы расхода материалов содержат корректные единицы измерения, количества и цены", () => {
		const codes = Object.keys(ORDER_804N_MATERIAL_NORMS_MAP);
		assert.ok(codes.length >= 10, "Должно быть определено не менее 10 кодов Номенклатуры 804н");

		for (const code of codes) {
			const norms = ORDER_804N_MATERIAL_NORMS_MAP[code]!;
			assert.ok(norms.length > 0, `Нормы для кода ${code} не должны быть пустыми`);

			for (const norm of norms) {
				assert.ok(norm.id.length > 0, "ID нормы не пустой");
				assert.ok(norm.materialName.length > 0, "Наименование материала не пустое");
				assert.ok(norm.quantityPerProcedure > 0, "Расход на процедуру > 0");
				assert.ok(
					["г", "мл", "шт.", "карп.", "компл.", "порц.", "упак."].includes(norm.unitOfMeasure),
					`Единица измерения ${norm.unitOfMeasure} валидна`,
				);
				assert.ok(norm.defaultUnitCostRub > 0, "Базовая себестоимость единицы > 0");
				assert.equal(typeof norm.mandatory, "boolean", "Флаг обязательности булевый");
			}
		}
	});

	test("matchMaterialToInventoryItem находит точные и частичные совпадения со складом", () => {
		const mockInventory: InventoryItemLookup[] = [
			{
				id: "inv-1",
				name: "Нанокомпозит светоотверждаемый Estelite Asteria Syringe",
				stockQuantity: 15,
				unitCostRub: "1350",
			},
			{
				id: "inv-2",
				name: "Анестетик артикаиновый 4% Убистезин Форте",
				stockQuantity: 100,
				unitCostRub: "195",
			},
		];

		const matchExact = matchMaterialToInventoryItem(
			"Нанокомпозит светоотверждаемый Estelite Asteria Syringe",
			mockInventory,
		);
		assert.ok(matchExact);
		assert.equal(matchExact.id, "inv-1");

		const matchKeyword = matchMaterialToInventoryItem(
			"Нанокомпозит светоотверждаемый (Estelite Asteria / Filtek)",
			mockInventory,
		);
		assert.ok(matchKeyword);
		assert.equal(matchKeyword.id, "inv-1");

		const noMatch = matchMaterialToInventoryItem("Неизвестный материал XYZ", mockInventory);
		assert.equal(noMatch, undefined);
	});

	test("calculateStageMaterialRequirements рассчитывает расход, себестоимость и маржинальность", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 26, state: "Caries" },
		];

		const stages = generateTreatmentPlanStages(teeth);
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
				stockQuantity: 1, // Дефицит! Нужно 2 карпулы на 2 зуба
				unitCostRub: 200,
			},
		];

		const summary = calculateStageMaterialRequirements(stage1, mockInventory);

		assert.equal(summary.stageNumber, 1);
		assert.ok(summary.items.length > 0, "Материалы должны быть рассчитаны");
		assert.ok(summary.totalMaterialsCostKopecks > 0, "Себестоимость ТМЦ в копейках > 0");
		assert.ok(summary.serviceRevenueKopecks > 0, "Выручка за этап > 0");
		assert.ok(summary.grossMarginKopecks > 0, "Валовая маржа > 0");
		assert.ok(summary.marginPercent > 0 && summary.marginPercent < 100, "Процент маржи в [1..99]");

		// Проверяем выявление дефицита
		assert.equal(summary.hasDeficit, true, "Должен быть зафиксирован дефицит");
		assert.ok(summary.deficitCount >= 1, "Количество дефицитных позиций >= 1");
	});

	test("calculatePlanTotalMaterialCost суммирует себестоимость и маржу по всем этапам", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Pulpitis" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth);
		const total = calculatePlanTotalMaterialCost(stages);

		assert.equal(total.summaries.length, 3, "Должно быть 3 сводки по этапам");
		assert.ok(total.totalMaterialsCostKopecks > 0);
		assert.ok(total.totalServiceRevenueKopecks > 0);
		assert.ok(total.totalGrossMarginKopecks > 0);
		assert.ok(total.overallMarginPercent > 50, "Стоматологическая маржинальность обычно > 50%");
	});

	test("generateCompletedWorksActAndWriteOff формирует официальный Акт сдачи-приемки и спецификацию ТМЦ", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Caries" }];
		const stages = generateTreatmentPlanStages(teeth);
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
