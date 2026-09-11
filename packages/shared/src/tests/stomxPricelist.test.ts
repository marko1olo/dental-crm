/**
 * packages/shared/src/tests/stomxPricelist.test.ts
 *
 * Unit test suite for StomX Dental Pricelist & Order 804n Harmonized Catalog.
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
	createEstimateItemFromStomxProcedure,
	createTreatmentPlanItemFromStomxProcedure,
	findStomxProcedureByCode,
	getProceduresByCategory,
	getStomxCategoryTitle,
	isStomxPricelistCategory,
	mapProcedureTo804nCode,
	searchStomxProcedures,
	STOMX_CORE_PROCEDURES,
	STOMX_ORTHOPEDICS_PROCEDURES,
	STOMX_SPECIALTY_CATEGORIES,
	STOMX_SURGERY_PROCEDURES,
	STOMX_THERAPY_PROCEDURES,
	type StomxPricelistCategory,
} from "../clinical/stomxPricelistCatalog.js";

describe("StomX Pricelist & 804n Harmonizer Catalog", () => {
	describe("1. Category Structure & Specialty Parity", () => {
		test("contains exactly 10 canonical dental specialties", () => {
			assert.equal(STOMX_SPECIALTY_CATEGORIES.length, 10);
			const expectedCategories: StomxPricelistCategory[] = [
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
				const found = STOMX_SPECIALTY_CATEGORIES.find((c) => c.id === cat);
				assert.ok(found, `Категория ${cat} обязана присутствовать в каталоге`);
				assert.ok(found.titleRu.length > 0, `Название категории ${cat} не может быть пустым`);
				assert.ok(found.descriptionRu.length > 0, `Описание категории ${cat} не может быть пустым`);
				assert.ok(found.defaultDurationMinutes >= 0, `Длительность категории ${cat} >= 0`);
			}
		});

		test("type guards and title resolvers work correctly", () => {
			assert.equal(isStomxPricelistCategory("therapy"), true);
			assert.equal(isStomxPricelistCategory("ztl"), true);
			assert.equal(isStomxPricelistCategory("invalid_category"), false);

			assert.equal(getStomxCategoryTitle("therapy"), "Терапия");
			assert.equal(getStomxCategoryTitle("surgery"), "Хирургия");
			assert.equal(getStomxCategoryTitle("ztl"), "ЗТЛ");
			assert.equal(getStomxCategoryTitle("orthodontics"), "Ортодонтия");
		});
	});

	describe("2. Procedure Dataset Integrity & Completeness", () => {
		test("contains all 176 harmonized procedures across modules", () => {
			assert.equal(STOMX_CORE_PROCEDURES.length, 176);
			assert.equal(
				STOMX_CORE_PROCEDURES.length,
				STOMX_THERAPY_PROCEDURES.length +
					STOMX_SURGERY_PROCEDURES.length +
					STOMX_ORTHOPEDICS_PROCEDURES.length,
			);
		});

		test("all procedures have non-empty name, code, valid price and 804n code", () => {
			for (const p of STOMX_CORE_PROCEDURES) {
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

		test("every category has active procedures", () => {
			const categories: StomxPricelistCategory[] = [
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

			for (const cat of categories) {
				const procs = getProceduresByCategory(cat);
				assert.ok(procs.length > 0, `Категория ${cat} не должна быть пустой`);
			}
		});
	});

	describe("3. Order 804n Nomenclature Harmonization", () => {
		test("Order 804n codes strictly follow Minzdrav notation", () => {
			const regex804n = /^[AB]\d{2}\.\d{2,3}\.\d{3}(\.\d{3})?(\.\d+)?$/;

			for (const p of STOMX_CORE_PROCEDURES) {
				assert.match(
					p.code804n,
					regex804n,
					`Процедура [${p.id}] ${p.name} имеет невалидный 804н код: "${p.code804n}"`,
				);
			}
		});

		test("mapProcedureTo804nCode maps therapy, surgery and diagnostics correctly", () => {
			// Therapy restoration
			const codeTherapy = mapProcedureTo804nCode("Восстановление зуба пломбой I, V, VI класс");
			assert.ok(
				codeTherapy?.startsWith("A16.07.002"),
				`Ожидался код группы A16.07.002, получен: ${codeTherapy}`,
			);

			// Endodontics instrumentation
			const codeEndo = mapProcedureTo804nCode("Инструментальная и медикаментозная обработка хорошо проходимого");
			assert.equal(codeEndo, "A16.07.030.001");

			// Surgery extraction
			const codeExtraction = mapProcedureTo804nCode("Удаление постоянного зуба");
			assert.equal(codeExtraction, "A16.07.001.002");

			// Implantology
			const codeImplant = mapProcedureTo804nCode("Установка дентального импланта 1 этап");
			assert.equal(codeImplant, "A16.07.054");

			// Radiology
			const codeRvg = mapProcedureTo804nCode("Дентальный снимок ( на визиографе )");
			assert.equal(codeRvg, "A06.07.012");

			// Anesthesiology
			const codeAnesthesia = mapProcedureTo804nCode("Инфнльтрационная анестезия");
			assert.equal(codeAnesthesia, "B01.003.004.004");

			// Consultations
			const codeConsult = mapProcedureTo804nCode("Приём (осмотр, консультация) врача-стоматолога первичный");
			assert.equal(codeConsult, "B01.065.007");

			// Orthodontics
			const codeOrtho = mapProcedureTo804nCode("Фиксация металлической брекет-системы на один зубной ряд");
			assert.equal(codeOrtho, "A16.07.046.001");
		});
	});

	describe("4. Search & Lookup Functions", () => {
		test("findStomxProcedureByCode finds by internal code, numeric id, and 804n code", () => {
			// By numeric ID
			const byId = findStomxProcedureByCode(506);
			assert.ok(byId);
			assert.equal(byId.id, 506);
			assert.equal(byId.category, "therapy");

			// By string numeric ID
			const byStrId = findStomxProcedureByCode("461");
			assert.ok(byStrId);
			assert.equal(byStrId.id, 461);

			// By internal code
			const byInternalCode = findStomxProcedureByCode("А16.07.002.001.1");
			assert.ok(byInternalCode);
			assert.equal(byInternalCode.id, 506);

			// By 804n code
			const by804n = findStomxProcedureByCode("A16.07.054");
			assert.ok(by804n);
			assert.equal(by804n.category, "implantology");

			// Non-existent returns undefined
			assert.equal(findStomxProcedureByCode("NON_EXISTENT_9999"), undefined);
		});

		test("searchStomxProcedures supports query text, categories and price bounds", () => {
			// Free text search
			const fillingMatches = searchStomxProcedures("пломб");
			assert.ok(fillingMatches.length > 0);
			assert.ok(fillingMatches.every((p) => p.name.toLowerCase().includes("пломб")));

			// Category filter
			const surgeryMatches = searchStomxProcedures("", { category: "surgery" });
			assert.ok(surgeryMatches.length >= 30);
			assert.ok(surgeryMatches.every((p) => p.category === "surgery"));

			// requireTooth filter
			const toothProcs = searchStomxProcedures("", { requireTooth: true });
			assert.ok(toothProcs.every((p) => p.requireTooth === true));

			const nonToothProcs = searchStomxProcedures("", { requireTooth: false });
			assert.ok(nonToothProcs.every((p) => p.requireTooth === false));

			// Price filter
			const expensiveProcs = searchStomxProcedures("", { minPriceRub: 20000 });
			assert.ok(expensiveProcs.every((p) => p.price >= 20000));

			// Limit
			const limited = searchStomxProcedures("", { limit: 5 });
			assert.equal(limited.length, 5);
		});
	});

	describe("5. 1-Click Estimate & Treatment Plan Application (Mandate 8e)", () => {
		test("createEstimateItemFromStomxProcedure calculates exact kopecks and doctor discounts", () => {
			const procedure = findStomxProcedureByCode(506); // Восстановление пломбой, 4000 руб.
			assert.ok(procedure);

			// Default: 1-click, 0% discount
			const estDefault = createEstimateItemFromStomxProcedure(procedure, {
				toothNumber: 36,
				surfaces: ["MOD"],
			});
			assert.equal(estDefault.procedureId, 506);
			assert.equal(estDefault.priceRub, 4000);
			assert.equal(estDefault.priceKopecks, 400000);
			assert.equal(estDefault.quantity, 1);
			assert.equal(estDefault.discountPercent, 0);
			assert.equal(estDefault.totalRub, 4000);
			assert.equal(estDefault.totalKopecks, 400000);
			assert.equal(estDefault.toothNumber, 36);
			assert.deepEqual(estDefault.surfaces, ["MOD"]);
			assert.equal(estDefault.warrantyMonths, 12);
			assert.equal(estDefault.lifetimeMonths, 36);

			// Mandate 8e: Free doctor discount 15%
			const estDiscount = createEstimateItemFromStomxProcedure(procedure, {
				quantity: 2,
				discountPercent: 15,
			});
			// 4000 * 2 = 8000. 15% off = 1200. Total = 6800.
			assert.equal(estDiscount.quantity, 2);
			assert.equal(estDiscount.totalRub, 6800);
			assert.equal(estDiscount.totalKopecks, 680000);

			// Mandate 8e item 7: 100% discount on staff/warranty rework without blockers
			const estWarranty = createEstimateItemFromStomxProcedure(procedure, {
				discountPercent: 100,
				notes: "Гарантийная переделка 100%",
			});
			assert.equal(estWarranty.totalRub, 0);
			assert.equal(estWarranty.totalKopecks, 0);
			assert.equal(estWarranty.notes, "Гарантийная переделка 100%");
		});

		test("createTreatmentPlanItemFromStomxProcedure builds phased treatment plan", () => {
			const implantProc = findStomxProcedureByCode(476); // Установка имплантата Dentium, 35000 руб.
			assert.ok(implantProc);

			const planItem = createTreatmentPlanItemFromStomxProcedure(implantProc, {
				toothNumber: 46,
				phaseNumber: 2,
				status: "planned",
				notes: "Хирургический этап имплантации",
			});

			assert.equal(planItem.procedureId, 476);
			assert.equal(planItem.toothNumber, 46);
			assert.equal(planItem.phaseNumber, 2);
			assert.equal(planItem.status, "planned");
			assert.equal(planItem.priceRub, 35000);
			assert.equal(planItem.totalKopecks, 3500000);
			assert.equal(planItem.code804n, "A16.07.054");
			assert.equal(planItem.durationMinutes, 60);
			assert.equal(planItem.warrantyMonths, 24);
			assert.equal(planItem.lifetimeMonths, 120);
		});
	});
});
