/**
 * treatmentPlanPg18PrecisionKopecks.test.ts — целочисленная точность копеек при персистенции в PG18.
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildStagesFromPlanItems } from "../treatmentPlanStagesEngine";

describe("Universal Multi-Specialist — Точность копеек в PG18", () => {
	it("maintains integer kopeck precision across multiple items without floating point drift", () => {
		const rawItems = [
			{ id: "i1", name: "Услуга 1", quantity: 3, price: 333.33, discount: 10.15, phase: 1 },
			{ id: "i2", name: "Услуга 2", quantity: 2, price: 666.67, discount: 20.3, phase: 1 },
		];

		const stages = buildStagesFromPlanItems(rawItems);
		assert.equal(stages.length, 1);
		const st = stages[0]!;
		assert.equal(st.totalKopecks, 230288);
		assert.equal(st.totalRub, 2302.88);
	});
});
