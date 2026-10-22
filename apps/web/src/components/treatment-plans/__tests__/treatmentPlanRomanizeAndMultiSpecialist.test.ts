/**
 * treatmentPlanRomanizeAndMultiSpecialist.test.ts — римские цифры и реконструкция мультиспециалистов из PG18.
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildStagesFromPlanItems } from "../treatmentPlanStagesEngine";
import { romanizeStageNumber } from "../types";
import { samplePgCatalog } from "./helpers/pg18TestHelpers";

describe("Universal Multi-Specialist — Романизация и реконструкция этапов", () => {
	it("romanizes stage numbers dynamically for any clinical stage (I..X+)", () => {
		assert.equal(romanizeStageNumber(1), "I");
		assert.equal(romanizeStageNumber(2), "II");
		assert.equal(romanizeStageNumber(3), "III");
		assert.equal(romanizeStageNumber(4), "IV");
		assert.equal(romanizeStageNumber(5), "V");
		assert.equal(romanizeStageNumber(6), "VI");
		assert.equal(romanizeStageNumber(7), "VII");
		assert.equal(romanizeStageNumber(8), "VIII");
		assert.equal(romanizeStageNumber(9), "IX");
		assert.equal(romanizeStageNumber(10), "X");
		assert.equal(romanizeStageNumber(15), "15");
	});

	it("reconstructs clinical stages from raw PostgreSQL 18 treatment_plan_items_new rows", () => {
		const rawPgItems = [
			{ id: "pg_item_1", toothNumber: 16, priceId: "A16.07.002.001", name: "Лечение кариеса", quantity: 1, price: 5000, discount: 500, phase: 1 },
			{ id: "pg_item_2", toothNumber: 36, priceId: "A16.07.054.001", name: "Установка имплантата", quantity: 1, price: 38000, discount: 0, phase: 2 },
			{ id: "pg_item_3", toothNumber: 36, priceId: "A16.07.004.001", name: "Коронка ZrO2", quantity: 1, price: 28000, discount: 2800, phase: 3 },
			{ id: "pg_item_4", toothNumber: 11, priceId: "A16.07.047", name: "Брекеты Damon", quantity: 1, price: 65000, discount: 0, phase: 4 },
			{ id: "pg_item_5", toothNumber: undefined, priceId: "A16.07.051", name: "Вектор-терапия", quantity: 1, price: 12000, discount: 1200, phase: 5 },
		];

		const stages = buildStagesFromPlanItems(rawPgItems, samplePgCatalog);
		assert.equal(stages.length, 5);

		const st1 = stages.find((s) => s.stageNumber === 1);
		assert.equal(st1?.stageKind, "stage_1_therapy");
		assert.equal(st1?.totalRub, 4500);

		const st2 = stages.find((s) => s.stageNumber === 2);
		assert.equal(st2?.stageKind, "stage_2_surgery");
		assert.equal(st2?.totalRub, 38000);

		const st3 = stages.find((s) => s.stageNumber === 3);
		assert.equal(st3?.stageKind, "stage_3_orthopedics");
		assert.equal(st3?.totalRub, 25200);

		const st4 = stages.find((s) => s.stageNumber === 4);
		assert.equal(st4?.stageKind, "stage_4_orthodontics");
		assert.equal(st4?.totalRub, 65000);

		const st5 = stages.find((s) => s.stageNumber === 5);
		assert.equal(st5?.stageKind, "stage_5_periodontics");
		assert.equal(st5?.totalRub, 10800);
	});
});
