import assert from "node:assert/strict";
import test from "node:test";
import {
	detectPlanItemCollisions,
	estimatorTotals,
	type PlanItem,
	resolvePlanItemCollision,
} from "../../treatmentEstimatorPricing";

test("коллизия между альтернативными планами (сохранение vs удаление) обнаруживается", () => {
	const conflictingItems: PlanItem[] = [
		{ id: "opt-1", toothNumber: 46, name: "Керамическая вкладка", priceId: "s-1", price: 22000, quantity: 1, discount: 0, phase: 3, suggestion: "crown" },
		{ id: "eco-1", toothNumber: 46, name: "Хирургическое удаление", priceId: "s-2", price: 3500, quantity: 1, discount: 0, phase: 2 },
	];
	const collisions = detectPlanItemCollisions(conflictingItems);
	assert.equal(collisions.length, 1);
	assert.equal(collisions[0]?.toothNumber, 46);
	assert.equal(collisions[0]?.type, "preservation_vs_replacement");
	assert.match(collisions[0]?.messageRu ?? "", /сохранение vs удаление/);
});

test("разрешение коллизии оставляет только выбранный сценарий без задвоения сумм", () => {
	const conflictingItems: PlanItem[] = [
		{ id: "opt-1", toothNumber: 46, name: "Керамическая вкладка", priceId: "s-1", price: 22000, quantity: 1, discount: 0, phase: 3 },
		{ id: "eco-1", toothNumber: 46, name: "Удаление зуба", priceId: "s-2", price: 3500, quantity: 1, discount: 0, phase: 2 },
	];
	const resolved = resolvePlanItemCollision(conflictingItems, 46, "opt-1");
	assert.equal(resolved.length, 1);
	assert.equal(resolved[0]?.id, "opt-1");
	assert.equal(resolved[0]?.price, 22000);
	const totals = estimatorTotals(resolved, null);
	assert.equal(totals.payableKopecks, 2_200_000);
});
