import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	addItemToPlanStages,
	createNewStageInPlan,
	filterStagesBySpecialty,
	removeItemFromStages,
} from "../treatmentPlanStageMutations";

describe("treatmentPlanStageMutations — Lifecycle & Specialties", () => {
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
