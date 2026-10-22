import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	addItemToPlanStages,
	updateItemPriceInStages,
	updateItemQuantityInStages,
} from "../treatmentPlanStageMutations";
import type { TreatmentPlanStage } from "../types";

describe("treatmentPlanStageMutations — Items & Prices", () => {
	it("1. Generates deterministic stage item ID with stageIndex and serviceCode without Math.random", () => {
		const stages: TreatmentPlanStage[] = [];

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
			`ID must be deterministic: got ${item1.id}`,
		);
		assert.equal(item1.toothNumber, 16);
		assert.equal(item1.priceRub, 4500);

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

		const updatedStages = updateItemQuantityInStages(initialStages, "item_test_1", 3, 10);
		const stage = updatedStages[0]!;
		const item = stage.items[0]!;

		assert.equal(item.quantity, 3);
		assert.equal(item.unitPriceRub, 30000);
		assert.equal(item.discountRub, 9000);
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
		assert.equal(item.priceRub, 10000);
		assert.equal(item.requiresManualPricing, false);
	});
});
