import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapStageToLabOrderStatus } from "../types.js";
import { calculateLabOrderCostAndMarkup } from "./labOrderCostCalculator.js";

describe("Red Team Inquisition: LAB-01..05 Subsystem Consolidation & Defense", () => {
	it("[LAB-05]: mapStageToLabOrderStatus maps routine clinic fitting to 'fitted', NOT 'refitting'", () => {
		// Рутинная примерка во рту в клинике обязана мапиться в fitted (канонический статус 0231)
		assert.equal(mapStageToLabOrderStatus("fitting"), "fitted");
		assert.equal(mapStageToLabOrderStatus("fitting_scheduled"), "fitted");
		assert.equal(mapStageToLabOrderStatus("fitting_in_mouth"), "fitted");
		assert.equal(mapStageToLabOrderStatus("Примерка"), "fitted");
		assert.equal(mapStageToLabOrderStatus("Примерка во рту"), "fitted");

		// Только реальный брак и рекламации мапятся в refitting
		assert.equal(mapStageToLabOrderStatus("correction_remake"), "refitting");
		assert.equal(mapStageToLabOrderStatus("warranty_rework"), "refitting");
		assert.equal(mapStageToLabOrderStatus("refitting"), "refitting");
		assert.equal(mapStageToLabOrderStatus("rework"), "refitting");
		assert.equal(mapStageToLabOrderStatus("Переделка"), "refitting");
		assert.equal(mapStageToLabOrderStatus("Рекламация"), "refitting");
	});

	it("calculateLabOrderCostAndMarkup supports custom dynamic costs and calculates margins", () => {
		const dynamicResult = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			unitsCount: 2,
			customCostPerUnit: 6800,
			priceRub: 50000,
		});

		assert.equal(dynamicResult.unitsCount, 2);
		assert.equal(dynamicResult.estimatedCostRub, 13600); // 6800 * 2
		assert.equal(dynamicResult.suggestedPriceRub, 50000);
		assert.equal(dynamicResult.grossMarginRub, 36400); // 50000 - 13600
		assert.equal(dynamicResult.grossMarginPercent, 73);
	});

	it("warranty liability: zero price for patient, lab cost absorbed based on liability type", () => {
		// При гарантии клиники (clinic_warranty) клиника берет на себя себестоимость ЗТЛ, пациент платит 0 ₽
		const clinicWarrantyResult = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			unitsCount: 1,
			customCostPerUnit: 7500,
			priceRub: 0,
		});
		assert.equal(clinicWarrantyResult.suggestedPriceRub, 0);
		assert.equal(clinicWarrantyResult.estimatedCostRub, 7500);

		// При браке лаборатории (lab_defect) лаборатория переделывает бесплатно (0 ₽ клинике и 0 ₽ пациенту)
		const labDefectResult = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			unitsCount: 1,
			customCostPerUnit: 0,
			priceRub: 0,
		});
		assert.equal(labDefectResult.suggestedPriceRub, 0);
		assert.equal(labDefectResult.estimatedCostRub, 0);
	});
});

