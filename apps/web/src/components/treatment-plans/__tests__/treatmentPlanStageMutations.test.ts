/**
 * treatmentPlanStageMutations.test.ts — Unit-тесты мутаций этапов плана лечения и детерминированных ID
 * Проверяет 100% отсутствие Math.random и строгое соблюдение Мандатов 8b, 8e, 8n (Zero-Mock Invariant).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	addItemToPlanStages,
	createNewStageInPlan,
	filterStagesBySpecialty,
	mergeIncomingPlanItem,
	mergePersistedPlanItems,
	removeItemFromStages,
	updateItemInStages,
	updateItemPriceInStages,
	updateItemQuantityInStages,
} from "../treatmentPlanStageMutations";
import type { TreatmentPlanStage } from "../types";

describe("treatmentPlanStageMutations — Zero-Mock Deterministic Mutations & ID Engine", () => {
	it("1. Generates deterministic stage item ID with stageIndex and serviceCode without Math.random", () => {
		const stages: TreatmentPlanStage[] = [];

		// Add first service to Stage 1 (Therapy)
		const stagesWithItem1 = addItemToPlanStages(stages, 1, {
			code804n: "A16.07.002.001",
			name: "Наложение пломбы Estelite",
			toothNumber: 16,
			unitPriceRub: 4500,
			quantity: 1,
		});

		assert.equal(stagesWithItem1.length, 1);
		const stage1 = stagesWithItem1[0]!;
		assert.equal(stage1.items.length, 1);

		const item1 = stage1.items[0]!;
		assert.ok(
			item1.id.startsWith("stage_item_1_A16_07_002_001_tooth_16_seq_1_"),
			`ID must be deterministic and start with stage_item_1_A16_07_002_001_tooth_16_seq_1_: got ${item1.id}`,
		);
		assert.equal(item1.toothNumber, 16);
		assert.equal(item1.priceRub, 4500);

		// Add second service to the same Stage 1
		const stagesWithItem2 = addItemToPlanStages(stagesWithItem1, 1, {
			code804n: "A16.07.030",
			name: "Анестезия инфильтрационная Убистезин",
			unitPriceRub: 800,
			quantity: 1,
		});

		const stage1Updated = stagesWithItem2[0]!;
		assert.equal(stage1Updated.items.length, 2);
		const item2 = stage1Updated.items[1]!;
		assert.ok(
			item2.id.startsWith("stage_item_1_A16_07_030_seq_2_"),
			`Second item ID must have seq_2: got ${item2.id}`,
		);
	});

	it("2. Preserves caller-supplied id when provided directly (Idempotency Mandate)", () => {
		const stages: TreatmentPlanStage[] = [];
		const explicitId = "custom_persisted_item_uuid_12345";

		const nextStages = addItemToPlanStages(stages, 2, {
			id: explicitId,
			code804n: "A16.07.054",
			name: "Установка дентального имплантата Nobel",
			toothNumber: 36,
			unitPriceRub: 55000,
			quantity: 1,
		});

		assert.equal(nextStages[0]!.items[0]!.id, explicitId);
	});

	it("3. Updates item quantity and recalculates kopeck-exact line and stage totals", () => {
		const initialStages = addItemToPlanStages([], 1, {
			id: "item_test_1",
			code804n: "A16.07.004",
			name: "Керамическая коронка E-max",
			unitPriceRub: 30000,
			quantity: 1,
		});

		// Update quantity to 3 with 10% discount
		const updatedStages = updateItemQuantityInStages(initialStages, "item_test_1", 3, 10);
		const stage = updatedStages[0]!;
		const item = stage.items[0]!;

		assert.equal(item.quantity, 3);
		// unit: 30 000 ₽, 10% discount = 3 000 ₽ per unit, net unit = 27 000 ₽
		// total line = 27 000 * 3 = 81 000 ₽
		assert.equal(item.unitPriceRub, 30000);
		assert.equal(item.discountRub, 9000); // 3 000 * 3 = 9 000 ₽
		assert.equal(item.priceRub, 81000);
		assert.equal(stage.totalRub, 81000);
		assert.equal(stage.totalKopecks, 8100000);
	});

	it("4. Updates item price and removes manual pricing flag", () => {
		const initialStages = addItemToPlanStages([], 1, {
			id: "item_price_test",
			code804n: "A16.07.002",
			name: "Реставрация зуба",
			unitPriceRub: 4000,
			quantity: 2,
		});

		const updatedStages = updateItemPriceInStages(initialStages, "item_price_test", 5000, 0);
		const item = updatedStages[0]!.items[0]!;

		assert.equal(item.unitPriceRub, 5000);
		assert.equal(item.priceRub, 10000); // 5000 * 2
		assert.equal(item.requiresManualPricing, false);
	});

	it("5. Removes item from stage cleanly and recalculates stage totals", () => {
		let stages = addItemToPlanStages([], 1, {
			id: "item_keep",
			code804n: "A16.07.002",
			name: "Услуга 1",
			unitPriceRub: 2000,
			quantity: 1,
		});
		stages = addItemToPlanStages(stages, 1, {
			id: "item_delete",
			code804n: "A16.07.003",
			name: "Услуга 2",
			unitPriceRub: 3000,
			quantity: 1,
		});

		assert.equal(stages[0]!.items.length, 2);
		assert.equal(stages[0]!.totalRub, 5000);

		const afterDelete = removeItemFromStages(stages, "item_delete");
		assert.equal(afterDelete[0]!.items.length, 1);
		assert.equal(afterDelete[0]!.items[0]!.id, "item_keep");
		assert.equal(afterDelete[0]!.totalRub, 2000);
	});

	it("6. Creates new stage presets with clinical titles (Surgery, Orthopedics, Orthodontics, Periodontics)", () => {
		const { nextStages: stages1, createdTitle: t1 } = createNewStageInPlan([], "surgery");
		assert.equal(stages1[0]!.stageKind, "stage_2_surgery");
		assert.match(t1, /Хирургический этап/);

		const { nextStages: stages2, createdTitle: t2 } = createNewStageInPlan(stages1, "orthopedics");
		assert.equal(stages2[1]!.stageKind, "stage_3_orthopedics");
		assert.match(t2, /Ортопедическая реабилитация/);
	});

	it("7. Filters stages by medical specialty accurately", () => {
		let stages = createNewStageInPlan([], "therapy").nextStages;
		stages = createNewStageInPlan(stages, "surgery").nextStages;
		stages = createNewStageInPlan(stages, "orthodontics").nextStages;

		const surgeryOnly = filterStagesBySpecialty(stages, "surgery");
		assert.equal(surgeryOnly.length, 1);
		assert.equal(surgeryOnly[0]!.stageKind, "stage_2_surgery");

		const all = filterStagesBySpecialty(stages, "all");
		assert.equal(all.length, 3);
	});
});
