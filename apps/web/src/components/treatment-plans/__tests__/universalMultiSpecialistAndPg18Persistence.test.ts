import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	buildStagesFromPlanItems,
	ORDER_804N_DICTIONARY,
	type CatalogServiceLookupItem,
} from "../treatmentPlanStagesEngine";
import { romanizeStageNumber, type TreatmentPlanItem } from "../types";

describe("Universal Multi-Specialist Stages & PostgreSQL 18 Persistence Engine", () => {
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
			{
				id: "pg_item_1",
				toothNumber: 16,
				priceId: "A16.07.002.001",
				name: "Лечение кариеса",
				quantity: 1,
				price: 5000,
				discount: 500,
				phase: 1,
				isAuto: false,
			},
			{
				id: "pg_item_2",
				toothNumber: 36,
				priceId: "A16.07.054.001",
				name: "Установка имплантата Dentium SuperLine",
				quantity: 1,
				price: 38000,
				discount: 0,
				phase: 2,
				isAuto: false,
			},
			{
				id: "pg_item_3",
				toothNumber: 36,
				priceId: "A16.07.004.001",
				name: "Коронка из диоксида циркония на имплантате",
				quantity: 1,
				price: 28000,
				discount: 2800,
				phase: 3,
				isAuto: false,
			},
			{
				id: "pg_item_4",
				toothNumber: 11,
				priceId: "A16.07.047",
				name: "Фиксация брекет-системы Damon Q (1 челюсть)",
				quantity: 1,
				price: 65000,
				discount: 0,
				phase: 4,
				isAuto: false,
			},
			{
				id: "pg_item_5",
				toothNumber: undefined,
				priceId: "A16.07.051",
				name: "Скейлинг и Вектор-терапия пародонта",
				quantity: 1,
				price: 12000,
				discount: 1200,
				phase: 5,
				isAuto: false,
			},
		];

		const catalog: CatalogServiceLookupItem[] = [
			{
				id: "A16.07.002.001",
				title: "Лечение кариеса нанокомпозитом",
				category: "Терапия",
				basePriceRub: 5000,
			},
			{
				id: "A16.07.054.001",
				title: "Дентальная имплантация",
				category: "Хирургия",
				basePriceRub: 38000,
			},
			{
				id: "A16.07.004.001",
				title: "Коронка из диоксида циркония",
				category: "Ортопедия",
				basePriceRub: 28000,
			},
			{
				id: "A16.07.047",
				title: "Ортодонтическое перемещение",
				category: "Ортодонтия",
				basePriceRub: 65000,
			},
			{
				id: "A16.07.051",
				title: "Пародонтологическое лечение",
				category: "Пародонтология",
				basePriceRub: 12000,
			},
		];

		const stages = buildStagesFromPlanItems(rawPgItems, catalog);

		assert.equal(stages.length, 5, "Must reconstruct exactly 5 clinical stages");

		// Stage 1: Therapy
		const st1 = stages.find((s) => s.stageNumber === 1);
		assert.ok(st1);
		assert.equal(st1.stageKind, "stage_1_therapy");
		assert.equal(st1.items.length, 1);
		assert.equal(st1.items[0]?.priceRub, 4500); // 5000 - 500
		assert.equal(st1.totalKopecks, 450000);
		assert.equal(st1.totalRub, 4500);

		// Stage 2: Surgery
		const st2 = stages.find((s) => s.stageNumber === 2);
		assert.ok(st2);
		assert.equal(st2.stageKind, "stage_2_surgery");
		assert.equal(st2.totalRub, 38000);
		assert.equal(st2.totalKopecks, 3800000);

		// Stage 3: Orthopedics
		const st3 = stages.find((s) => s.stageNumber === 3);
		assert.ok(st3);
		assert.equal(st3.stageKind, "stage_3_orthopedics");
		assert.equal(st3.items[0]?.priceRub, 25200); // 28000 - 2800
		assert.equal(st3.totalKopecks, 2520000);

		// Stage 4: Orthodontics
		const st4 = stages.find((s) => s.stageNumber === 4);
		assert.ok(st4);
		assert.equal(st4.stageKind, "stage_4_orthodontics");
		assert.equal(st4.totalRub, 65000);

		// Stage 5: Periodontics
		const st5 = stages.find((s) => s.stageNumber === 5);
		assert.ok(st5);
		assert.equal(st5.stageKind, "stage_5_periodontics");
		assert.equal(st5.items[0]?.priceRub, 10800); // 12000 - 1200
		assert.equal(st5.totalRub, 10800);
	});

	it("maintains integer kopeck precision across multiple items without floating point drift", () => {
		const rawItems = [
			{
				id: "i1",
				name: "Услуга 1",
				quantity: 3,
				price: 333.33,
				discount: 10.15,
				phase: 1,
			},
			{
				id: "i2",
				name: "Услуга 2",
				quantity: 2,
				price: 666.67,
				discount: 20.3,
				phase: 1,
			},
		];

		const stages = buildStagesFromPlanItems(rawItems);
		assert.equal(stages.length, 1);
		const st = stages[0]!;
		// Item 1 gross: 333.33 * 3 = 999.99 rub -> 99999 kopecks, disc: 10.15 rub -> 1015 kopecks. Net: 98984 kopecks (989.84 rub)
		// Item 2 gross: 666.67 * 2 = 1333.34 rub -> 133334 kopecks, disc: 20.30 rub -> 2030 kopecks. Net: 131304 kopecks (1313.04 rub)
		// Total kopecks: 98984 + 131304 = 230288 kopecks = 2302.88 rub.
		assert.equal(st.totalKopecks, 230288);
		assert.equal(st.totalRub, 2302.88);
	});
});
