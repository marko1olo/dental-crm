/**
 * wave116PricelistAndStageBilling.test.ts
 *
 * Verification suite for Wave 116 (Clinical Pricelist & Phased Treatment Plan Stage Checkout):
 * 1. 21 Canonical pricelist categories & Zod schema validation (positive & negative cases)
 * 2. Phased Treatment Plan stage advance & FFD 1.2 offset calculations via calculateStageAdvanceAmount
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CLINICAL_PRICELIST_CATEGORIES,
	CLINICAL_PRICELIST_CATEGORY_ITEMS,
	STOMX_PRICELIST_CATEGORIES,
	STOMX_PRICELIST_CATEGORY_ITEMS,
	clinicalPricelistCategoryItemSchema,
	clinicalPricelistCategoryNameSchema,
} from "@dental/shared";
import {
	DEFAULT_TREATMENT_STAGES,
	calculateStageAdvanceAmount,
} from "../../cashbox/stageAdvanceCalculator";

describe("Wave 116: 21 Pricelist Categories & Treatment Plan Stage Billing", () => {
	it("0. CLINICAL_PRICELIST_CATEGORIES exposes 21 canonical DENTE categories", () => {
		assert.equal(CLINICAL_PRICELIST_CATEGORIES.length, 21);
		assert.equal(CLINICAL_PRICELIST_CATEGORY_ITEMS.length, 21);
		assert.deepEqual(CLINICAL_PRICELIST_CATEGORIES, STOMX_PRICELIST_CATEGORIES);
	});

	it("1. STOMX_PRICELIST_CATEGORIES validates canonical names and rejects invalid category strings", () => {
		const expectedCategories = [
			"Первичный/повторный прием",
			"Гигиена и профилактика",
			"Диагностика",
			"Рентгенология",
			"Анестезия",
			"Терапевтическая стоматология",
			"Пародонтология",
			"Хирургическая стоматология и имплантология",
			"Ортопедическая стоматология",
			"Ортодонтия",
			"Челюстно-лицевая хирургия",
			"Общие виды работ",
			"Виды работ на терапевтическом приеме",
			"Стоимость дополнительных материалов",
			"Ортопедический прием",
			"Профилактический прием",
			"Комплексное лечение заболеваний пародонта",
			"Терапевтический прием",
			"Хирургический прием",
			"Стоматологические услуги с использованием лазера",
			"Изготовление и ремонт зубных протезов",
		];

		for (const cat of expectedCategories) {
			assert.ok(
				STOMX_PRICELIST_CATEGORIES.includes(cat as (typeof STOMX_PRICELIST_CATEGORIES)[number]),
				`Missing expected category: ${cat}`,
			);
			const parsed = clinicalPricelistCategoryNameSchema.safeParse(cat);
			assert.equal(parsed.success, true, `Zod validation failed for category: ${cat}`);
		}

		assert.equal(
			clinicalPricelistCategoryNameSchema.safeParse("Несуществующая категория").success,
			false,
		);
	});

	it("2. STOMX_PRICELIST_CATEGORY_ITEMS passes Zod schema and rejects malformed items", () => {
		assert.equal(STOMX_PRICELIST_CATEGORY_ITEMS.length, 21);

		STOMX_PRICELIST_CATEGORY_ITEMS.forEach((item, idx) => {
			assert.equal(item.id, idx + 1);
			assert.ok(item.nameRu.length > 0);
			assert.equal(item.slug, `category_${idx + 1}`);

			const validation = clinicalPricelistCategoryItemSchema.safeParse(item);
			assert.equal(validation.success, true, `Item ${idx + 1} failed Zod validation`);
		});

		const invalidItem = clinicalPricelistCategoryItemSchema.safeParse({
			id: -1,
			nameRu: "Чужая категория",
			slug: "",
		});
		assert.equal(invalidItem.success, false);
	});

	it("3. DEFAULT_TREATMENT_STAGES provides coherent non-negative kopeck stages", () => {
		assert.ok(DEFAULT_TREATMENT_STAGES.length >= 3);
		for (const stage of DEFAULT_TREATMENT_STAGES) {
			assert.ok(stage.id.length > 0);
			assert.ok(stage.titleRu.length > 0);
			assert.ok(stage.amountKop > 0);
			assert.ok(stage.itemsCount >= 1);
		}
	});

	it("4. calculateStageAdvanceAmount handles full, 30%, 50%, FFD tag 1215 offset, and clamping", () => {
		const full = calculateStageAdvanceAmount(1000000, "full");
		assert.equal(full.requiredAmountKop, 1000000);
		assert.equal(full.advanceOffsetTag1215Kop, 0);
		assert.equal(full.remainingDueKop, 0);
		assert.equal(full.ffdTag1214, 4);
		assert.equal(full.isAdvanceReceipt, false);

		const adv30 = calculateStageAdvanceAmount(1000000, "advance_30");
		assert.equal(adv30.requiredAmountKop, 300000);
		assert.equal(adv30.remainingDueKop, 700000);
		assert.equal(adv30.ffdTag1214, 2);
		assert.equal(adv30.isAdvanceReceipt, true);

		const adv50 = calculateStageAdvanceAmount(1000000, "advance_50");
		assert.equal(adv50.requiredAmountKop, 500000);
		assert.equal(adv50.remainingDueKop, 500000);
		assert.equal(adv50.ffdTag1214, 2);
		assert.equal(adv50.isAdvanceReceipt, true);

		const offset = calculateStageAdvanceAmount(1000000, "advance_offset_tag1215", 400000);
		assert.equal(offset.advanceOffsetTag1215Kop, 400000);
		assert.equal(offset.requiredAmountKop, 600000);
		assert.equal(offset.remainingDueKop, 0);
		assert.equal(offset.isAdvanceOffsetReceipt, true);

		const overAdvance = calculateStageAdvanceAmount(500000, "advance_offset_tag1215", 900000);
		assert.equal(overAdvance.advanceOffsetTag1215Kop, 500000);
		assert.equal(overAdvance.requiredAmountKop, 0);

		const badInputs = calculateStageAdvanceAmount(Number.NaN, "full", -200);
		assert.equal(badInputs.totalStageAmountKop, 0);
		assert.equal(badInputs.requiredAmountKop, 0);
	});
});
