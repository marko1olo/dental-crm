/**
 * packages/shared/src/tests/clinicalPricelist.test.ts
 *
 * Unit test suite for Canonical DENTE Clinical Pricelist & Order 804n Harmonized Catalog.
 *
 * Verifies:
 * - Parity of all 10 canonical dental specialties (categories)
 * - Exact kopeck calculation and math (Mandate 8b / ACID)
 * - Order 804n Nomenclature mapping and normalization
 * - Doctor autonomy (Mandate 8e): free discounts 0..100%, 1-click plan & estimate generation
 * - Fast lookup and multi-criteria search
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	createEstimateItemFromClinicalProcedure,
	createTreatmentPlanItemFromClinicalProcedure,
	findClinicalProcedureByCode,
	getProceduresByCategory,
	getClinicalCategoryTitle,
	isClinicalPricelistCategory,
	mapProcedureTo804nCode,
	searchClinicalProcedures,
	CLINICAL_CORE_PROCEDURES,
	CLINICAL_ORTHOPEDICS_PROCEDURES,
	CLINICAL_SPECIALTY_CATEGORIES,
	CLINICAL_SURGERY_PROCEDURES,
	CLINICAL_THERAPY_PROCEDURES,
	type ClinicalPricelistCategory,
} from "../clinical/clinicalPricelistCatalog.js";

describe("Canonical DENTE Pricelist & 804n Harmonizer Catalog", () => {
	describe("1. Category Structure & Specialty Parity", () => {
		test("contains exactly 10 canonical dental specialties", () => {
			assert.equal(CLINICAL_SPECIALTY_CATEGORIES.length, 10);
			const expectedCategories: ClinicalPricelistCategory[] = [
				"therapy",
				"orthopedics",
				"surgery",
				"implantology",
				"orthodontics",
				"periodontics",
				"hygiene",
				"radiology",
				"anesthesiology",
				"ztl",
			];

			for (const cat of expectedCategories) {
				const found = CLINICAL_SPECIALTY_CATEGORIES.find((c) => c.id === cat);
				assert.ok(found, `Категория ${cat} обязана присутствовать в каталоге`);
				assert.ok(found.titleRu.length > 0, `Название категории ${cat} не может быть пустым`);
				assert.ok(found.descriptionRu.length > 0, `Описание категории ${cat} не может быть пустым`);
				assert.ok(found.defaultDurationMinutes >= 0, `Длительность категории ${cat} >= 0`);
			}
		});

		test("type guards and title resolvers work correctly", () => {
			assert.equal(isClinicalPricelistCategory("therapy"), true);
			assert.equal(isClinicalPricelistCategory("ztl"), true);
			assert.equal(isClinicalPricelistCategory("invalid_category"), false);

			assert.equal(getClinicalCategoryTitle("therapy"), "Терапия");
			assert.equal(getClinicalCategoryTitle("surgery"), "Хирургия");
			assert.equal(getClinicalCategoryTitle("ztl"), "ЗТЛ");
			assert.equal(getClinicalCategoryTitle("orthodontics"), "Ортодонтия");
		});
	});

	describe("2. Procedure Dataset Integrity & Completeness", () => {
		test("contains all 176 harmonized procedures across modules", () => {
			assert.equal(CLINICAL_CORE_PROCEDURES.length, 176);
			assert.equal(
				CLINICAL_CORE_PROCEDURES.length,
				CLINICAL_THERAPY_PROCEDURES.length +
					CLINICAL_SURGERY_PROCEDURES.length +
					CLINICAL_ORTHOPEDICS_PROCEDURES.length,
			);
		});

		test("all procedures have non-empty name, code, valid price and 804n code", () => {
			for (const p of CLINICAL_CORE_PROCEDURES) {
				assert.ok(p.id !== undefined && p.id !== null, "ID процедуры должен быть задан");
				assert.ok(p.name.trim().length > 0, `Процедура ${p.id} имеет пустое название`);
				assert.ok(p.code.trim().length > 0, `Процедура ${p.id} (${p.name}) имеет пустой код`);
				assert.ok(p.price >= 0, `Процедура ${p.id} имеет отрицательную цену: ${p.price}`);
				assert.equal(
					p.priceKopecks,
					Math.round(p.price * 100),
					`Процедура ${p.id} имеет несовпадение копеек: ${p.priceKopecks} vs ${p.price}`,
				);
				assert.ok(Number.isInteger(p.priceKopecks), `Копейки для ${p.id} должны быть целым числом`);
				assert.ok(p.durationMinutes >= 0, `Длительность ${p.id} должна быть >= 0`);
				assert.equal(typeof p.requireTooth, "boolean", `requireTooth для ${p.id} должен быть boolean`);
				assert.ok(p.warrantyMonths >= 0, `Гарантия ${p.id} >= 0`);
				assert.ok(p.lifetimeMonths >= 0, `Срок службы ${p.id} >= 0`);
				assert.ok(p.code804n.trim().length > 0, `804н код для ${p.id} (${p.name}) не должен быть пустым`);
				assert.equal(p.canDiscount, true, "Mandate 8e: врач имеет свободу скидок на все процедуры");
			}
		});
	});

	describe("3. Lookup & Search Engine", () => {
		test("finds procedures by internal code and 804n code", () => {
			const p1 = findClinicalProcedureByCode(506);
			assert.ok(p1);
			assert.equal(p1.category, "therapy");

			const p804n = findClinicalProcedureByCode("A16.07.054");
			assert.ok(p804n);
			assert.equal(p804n.category, "implantology");
		});

		test("searches procedures by free-text with filter support", () => {
			const cariesList = searchClinicalProcedures("кариес");
			assert.ok(cariesList.length > 0);
			for (const item of cariesList) {
				const match =
					item.name.toLowerCase().includes("кариес") ||
					item.code.toLowerCase().includes("кариес") ||
					item.code804n.toLowerCase().includes("кариес");
				assert.ok(match);
			}

			const surgeryOnly = searchClinicalProcedures("удаление", { category: "surgery" });
			assert.ok(surgeryOnly.length > 0);
			for (const item of surgeryOnly) {
				assert.equal(item.category, "surgery");
			}
		});
	});

	describe("4. Doctor Autonomy, Estimates & Treatment Plans (Mandate 8e, 8b)", () => {
		test("creates estimate item with strict kopeck calculation", () => {
			const proc = CLINICAL_CORE_PROCEDURES[0]!;
			const estimate = createEstimateItemFromClinicalProcedure(proc, {
				quantity: 2,
				discountPercent: 15,
				toothNumber: 16,
			});

			assert.equal(estimate.procedureId, proc.id);
			assert.equal(estimate.quantity, 2);
			assert.equal(estimate.discountPercent, 15);
			assert.equal(estimate.toothNumber, 16);

			const expectedRawKopecks = proc.priceKopecks * 2;
			const expectedDiscountKopecks = Math.round(expectedRawKopecks * 0.15);
			const expectedTotalKopecks = expectedRawKopecks - expectedDiscountKopecks;

			assert.equal(estimate.totalKopecks, expectedTotalKopecks);
			assert.equal(estimate.totalRub, expectedTotalKopecks / 100);
		});

		test("creates treatment plan item without false blockers", () => {
			const proc = CLINICAL_CORE_PROCEDURES[1]!;
			const planItem = createTreatmentPlanItemFromClinicalProcedure(proc, {
				phaseNumber: 2,
				status: "planned",
				toothNumber: 26,
			});

			assert.equal(planItem.procedureId, proc.id);
			assert.equal(planItem.phaseNumber, 2);
			assert.equal(planItem.status, "planned");
			assert.equal(planItem.toothNumber, 26);
		});
	});
});
