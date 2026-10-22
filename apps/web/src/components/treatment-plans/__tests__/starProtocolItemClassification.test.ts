/**
 * starProtocolItemClassification.test.ts — классификация экстракций и ортопедии естественных зубов.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	isToothExtractionItem,
	isToothPreservationOrProstheticItem,
} from "../validation/starProtocolValidationEngine";
import type { TreatmentPlanItem } from "../types";

describe("starProtocolValidationEngine — Классификация манипуляций", () => {
	test("isToothExtractionItem точно определяет удаление зуба и исключает гигиену/снятие коронок", () => {
		const extItem1: TreatmentPlanItem = {
			id: "ext-1",
			toothNumber: 18,
			code804n: "A16.07.001.002",
			name: "Удаление зуба сложное с разъединением корней",
			category: "Хирургия",
			unitPriceRub: 5500,
			priceRub: 5500,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_2_surgery",
		};
		const extItem2: TreatmentPlanItem = {
			id: "ext-2",
			toothNumber: 48,
			code804n: "A16.07.001",
			name: "Операция удаления ретинированного зуба",
			category: "Хирургия",
			unitPriceRub: 8000,
			priceRub: 8000,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_2_surgery",
		};
		const hygieneItem: TreatmentPlanItem = {
			id: "hyg-1",
			code804n: "A16.07.051",
			name: "Ультразвуковое удаление зубного камня наддесневого",
			category: "Гигиена",
			unitPriceRub: 3500,
			priceRub: 3500,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_1_therapy",
		};
		const crownRemovalItem: TreatmentPlanItem = {
			id: "cr-rem-1",
			toothNumber: 16,
			code804n: "A16.07.053",
			name: "Снятие (удаление) штампованной металлической коронки",
			category: "Ортопедия",
			unitPriceRub: 1200,
			priceRub: 1200,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_1_therapy",
		};

		assert.equal(isToothExtractionItem(extItem1), true);
		assert.equal(isToothExtractionItem(extItem2), true);
		assert.equal(isToothExtractionItem(hygieneItem), false);
		assert.equal(isToothExtractionItem(crownRemovalItem), false);
	});

	test("isToothPreservationOrProstheticItem определяет сохранение зуба и исключает имплантаты", () => {
		const cariesItem: TreatmentPlanItem = {
			id: "c-1",
			toothNumber: 16,
			code804n: "A16.07.002.001",
			name: "Восстановление зуба пломбой (лечение кариеса)",
			category: "Терапия",
			unitPriceRub: 4500,
			priceRub: 4500,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_1_therapy",
		};
		const crownItem: TreatmentPlanItem = {
			id: "cr-1",
			toothNumber: 16,
			code804n: "A16.07.004.001",
			name: "Восстановление зуба коронкой из диоксида циркония",
			category: "Ортопедия",
			unitPriceRub: 25000,
			priceRub: 25000,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_3_orthopedics",
		};
		const implantCrownItem: TreatmentPlanItem = {
			id: "imp-cr-1",
			toothNumber: 36,
			code804n: "A16.07.006.002",
			name: "Протезирование зуба с использованием имплантата коронкой из диоксида циркония",
			category: "Ортопедия",
			unitPriceRub: 35000,
			priceRub: 35000,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_3_orthopedics",
		};

		assert.equal(isToothPreservationOrProstheticItem(cariesItem), true);
		assert.equal(isToothPreservationOrProstheticItem(crownItem), true);
		assert.equal(isToothPreservationOrProstheticItem(implantCrownItem), false);
	});
});
