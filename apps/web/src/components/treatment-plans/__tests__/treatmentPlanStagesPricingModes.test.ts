/**
 * treatmentPlanStagesPricingModes.test.ts — Тестирование отвязки от хардкода цен:
 * PROD-режим без цен (requiresManualPricing), подтягивание цен из каталога клиники и DEMO-режим.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { ToothData } from "../../odontogram/ToothChart";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";
import { MOCK_CLINIC_CATALOG } from "./helpers/stagesEngineTestHelpers";

describe("treatmentPlanStagesEngine: Price Decoupling (PROD vs DEMO)", () => {
	test("В PROD-режиме без каталога позиции генерируются с priceRub: 0, isDraft: true, requiresManualPricing: true", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Caries" }];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: false });
		const [stage1] = stages;

		assert.ok(stage1!.items.length > 0);
		const cariesItem = stage1!.items.find((i) => i.toothNumber === 16);
		assert.ok(cariesItem);
		assert.equal(cariesItem.priceRub, 0);
		assert.equal(cariesItem.unitPriceRub, 0);
		assert.equal(cariesItem.isDraft, true);
		assert.equal(cariesItem.requiresManualPricing, true);
		assert.equal(cariesItem.fromCatalog, false);
	});

	test("При наличии каталога клиники позиции берут реальную цену из каталога", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Caries" }];

		const stages = generateTreatmentPlanStages(teeth, MOCK_CLINIC_CATALOG, 0, { isDemoMode: false });
		const [stage1] = stages;

		const cariesItem = stage1!.items.find((i) => i.toothNumber === 16);
		assert.ok(cariesItem);
		assert.equal(cariesItem.priceRub, 4800);
		assert.equal(cariesItem.unitPriceRub, 4800);
		assert.equal(cariesItem.isDraft, false);
		assert.equal(cariesItem.requiresManualPricing, false);
		assert.equal(cariesItem.fromCatalog, true);
		assert.equal(cariesItem.priceId, "cat-caries");
	});

	test("В DEMO-режиме ненайденные услуги берут демонстрационные справочные цены", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Caries" }];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [stage1] = stages;

		const cariesItem = stage1!.items.find((i) => i.toothNumber === 16);
		assert.ok(cariesItem);
		assert.equal(cariesItem.priceRub, 4800);
		assert.equal(cariesItem.isDraft, false);
		assert.equal(cariesItem.requiresManualPricing, false);
	});
});
