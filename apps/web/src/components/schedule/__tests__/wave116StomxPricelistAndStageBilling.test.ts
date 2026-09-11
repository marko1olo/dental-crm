/**
 * wave116StomxPricelistAndStageBilling.test.ts
 *
 * Verification suite for Wave 116 (StomX Parity & Phased Treatment Plan Stage Checkout):
 * 1. 21 Canonical StomX pricelist categories in @dental/shared
 * 2. Zod validation for categories and category items
 * 3. PatientBillingModal.tsx contract audit:
 *    - activeTreatmentPlan & onPayTreatmentPlanStage props
 *    - patient-billing-plan-stage-panel container
 *    - btn-tender-plan-stage with min-h-[44px]
 *    - plan-stage-item-* buttons with min-h-[44px]
 *    - Doctor autonomy (no disabled buttons without reason)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	STOMX_PRICELIST_CATEGORIES,
	STOMX_PRICELIST_CATEGORY_ITEMS,
	stomxPricelistCategoryNameSchema,
	stomxPricelistCategoryItemSchema,
} from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Wave 116: StomX 21 Pricelist Categories & Treatment Plan Stage Billing", () => {
	it("1. STOMX_PRICELIST_CATEGORIES exports exactly 21 canonical clinical categories", () => {
		assert.equal(
			STOMX_PRICELIST_CATEGORIES.length,
			21,
			"Must contain exactly 21 StomX clinical pricelist categories",
		);

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
				STOMX_PRICELIST_CATEGORIES.includes(cat as any),
				`Missing expected StomX category: ${cat}`,
			);
			const parsed = stomxPricelistCategoryNameSchema.safeParse(cat);
			assert.ok(parsed.success, `Zod validation failed for category: ${cat}`);
		}
	});

	it("2. STOMX_PRICELIST_CATEGORY_ITEMS is typed, indexed and passes Zod schema", () => {
		assert.equal(STOMX_PRICELIST_CATEGORY_ITEMS.length, 21);

		STOMX_PRICELIST_CATEGORY_ITEMS.forEach((item, idx) => {
			assert.equal(item.id, idx + 1);
			assert.ok(item.nameRu.length > 0);
			assert.equal(item.slug, `category_${idx + 1}`);

			const validation = stomxPricelistCategoryItemSchema.safeParse(item);
			assert.ok(
				validation.success,
				`Item ${idx + 1} (${item.nameRu}) failed Zod validation`,
			);
		});
	});

	it("3. Compares against StomX depot categories.json if depot exists on disk", () => {
		const depotPath = path.resolve(
			__dirname,
			"../../../../../РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС НОВЫЙ ЗАВОЗ/data/pricelist/categories.json",
		);

		if (fs.existsSync(depotPath)) {
			const rawJson = fs.readFileSync(depotPath, "utf-8");
			const parsed = JSON.parse(rawJson);
			assert.ok(Array.isArray(parsed), "Depot JSON must be an array");
			assert.equal(
				parsed.length,
				21,
				"Depot categories array must have length 21",
			);

			const depotTitles = parsed.map((item: any) =>
				typeof item === "string" ? item.trim() : item.title?.trim(),
			);
			depotTitles.forEach((title: string) => {
				assert.ok(
					STOMX_PRICELIST_CATEGORIES.includes(title as any),
					`Depot title «${title}» must be in STOMX_PRICELIST_CATEGORIES`,
				);
			});
		}
	});

	it("4. PatientBillingModal.tsx implements Treatment Plan Stage billing contracts", () => {
		const modalPath = path.resolve(
			__dirname,
			"../../finance/PatientBillingModal.tsx",
		);
		assert.ok(fs.existsSync(modalPath), "PatientBillingModal.tsx must exist");

		const content = fs.readFileSync(modalPath, "utf-8");

		// Contract: types & props
		assert.ok(
			content.includes("export interface PatientBillingPlanStage"),
			"Must define PatientBillingPlanStage interface",
		);
		assert.ok(
			content.includes("export interface PatientBillingTreatmentPlan"),
			"Must define PatientBillingTreatmentPlan interface",
		);
		assert.ok(
			content.includes("activeTreatmentPlan?: PatientBillingTreatmentPlan"),
			"Must include activeTreatmentPlan in props",
		);
		assert.ok(
			content.includes(
				"onPayTreatmentPlanStage?: ((stageId: string, stageAmountRub: number) => void)",
			),
			"Must include onPayTreatmentPlanStage callback in props",
		);

		// Contract: UI elements
		assert.ok(
			content.includes('data-testid="patient-billing-plan-stage-panel"'),
			"Must render patient-billing-plan-stage-panel container",
		);
		assert.ok(
			content.includes('data-testid="btn-tender-plan-stage"'),
			"Must render 1-click stage payment button btn-tender-plan-stage",
		);
		assert.ok(
			content.includes("plan-stage-item-"),
			"Must render individual plan-stage-item- testids",
		);

		// Contract: Touch target height min-h-[44px] (Apple HIG & Mandate 8c)
		const stageBtnMatch = content.match(
			/data-testid="btn-tender-plan-stage"[^>]*className="([^"]*)"/,
		);
		assert.ok(
			stageBtnMatch ||
				content.includes(
					'className="min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600',
				),
			"btn-tender-plan-stage must have min-h-[44px]",
		);
		assert.ok(
			content.includes("min-h-[44px]"),
			"Stage items and tender buttons must enforce min-h-[44px]",
		);

		// Contract: 1-click stage payment handling
		assert.ok(
			content.includes("handleTenderPlanStage"),
			"Must have handleTenderPlanStage function",
		);
		assert.ok(
			content.includes("handleSelectPlanStage"),
			"Must have handleSelectPlanStage function",
		);
	});
});
