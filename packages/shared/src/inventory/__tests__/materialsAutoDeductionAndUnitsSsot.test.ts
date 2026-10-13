/**
 * materialsAutoDeductionAndUnitsSsot.test.ts
 * Rigorous Red Team Verification of Inventory Units SSOT & Materials Auto-Deduction SSOT.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	convertInventoryUnit,
	formatInventoryQuantityWithUnitRu,
	formatInventoryUnitRu,
	getOkeiCodeForUnit,
	isFractionalQuantityAllowed,
	normalizeInventoryUnit,
} from "../inventoryUnitsSsot.js";
import {
	CANONICAL_PROCEDURE_RECIPES,
	calculateProcedureDeductionSummary,
	generateSanpinClassBWasteRecords,
	getCanonicalProcedureRecipe,
	resolveProcedureDeductionItems,
} from "../materialsAutoDeductionSsot.js";

describe("Inventory Units SSOT (ОКЕИ & Medical Nomenclature)", () => {
	it("нормализует гетерогенные строки к каноническим ключам", () => {
		assert.equal(normalizeInventoryUnit("карпула"), "carpule");
		assert.equal(normalizeInventoryUnit("карп."), "carpule");
		assert.equal(normalizeInventoryUnit("шприц_гр"), "syringe_g");
		assert.equal(normalizeInventoryUnit("шприц (г)"), "syringe_g");
		assert.equal(normalizeInventoryUnit("упак"), "pack");
		assert.equal(normalizeInventoryUnit("уп."), "pack");
		assert.equal(normalizeInventoryUnit("шт."), "pcs");
		assert.equal(normalizeInventoryUnit("мл"), "ml");
		assert.equal(normalizeInventoryUnit("г"), "gram");
		assert.equal(normalizeInventoryUnit("фл."), "bottle");
		assert.equal(normalizeInventoryUnit("пары"), "pair");
		assert.equal(normalizeInventoryUnit(null), "pcs");
		assert.equal(normalizeInventoryUnit("неизвестная_штуковина"), "pcs");
	});

	it("возвращает верные коды ОКЕИ", () => {
		assert.equal(getOkeiCodeForUnit("шт"), "796");
		assert.equal(getOkeiCodeForUnit("упак"), "778");
		assert.equal(getOkeiCodeForUnit("г"), "163");
		assert.equal(getOkeiCodeForUnit("мл"), "111");
		assert.equal(getOkeiCodeForUnit("пар"), "715");
		assert.equal(getOkeiCodeForUnit("см"), "011");
	});

	it("корректно определяет допустимость дробных остатков", () => {
		assert.equal(isFractionalQuantityAllowed("pcs"), false);
		assert.equal(isFractionalQuantityAllowed("gram"), true);
		assert.equal(isFractionalQuantityAllowed("ml"), true);
		assert.equal(isFractionalQuantityAllowed("syringe_g"), true);
		assert.equal(isFractionalQuantityAllowed("pair"), false);
	});

	it("детерминированно конвертирует складские упаковки в клинические дозы", () => {
		// 1 упаковка карпул = 100 карпул
		assert.equal(convertInventoryUnit(1, "pack", "carpule"), 100);
		assert.equal(convertInventoryUnit(100, "carpule", "pack"), 1);

		// 2 карпулы в упаковках
		assert.equal(convertInventoryUnit(2, "carpule", "pack"), 0.02);

		// Шприц композита (4г) в граммы
		assert.equal(convertInventoryUnit(1, "syringe_g", "gram"), 4.0);
		assert.equal(convertInventoryUnit(0.35, "gram", "syringe_g"), 0.0875);

		// Флакон адгезива (5 мл) в миллилитры и капли (20 капель/мл)
		assert.equal(convertInventoryUnit(1, "bottle", "ml"), 5.0);
		assert.equal(convertInventoryUnit(1, "bottle", "drop"), 100);

		// Сантиметры и метры шовного материала
		assert.equal(convertInventoryUnit(1, "meter", "cm"), 100);
		assert.equal(convertInventoryUnit(50, "cm", "meter"), 0.5);
	});

	it("форматирует количество и единицу на чистом русском языке", () => {
		assert.equal(formatInventoryQuantityWithUnitRu(2, "carpule"), "2 карп.");
		assert.equal(formatInventoryQuantityWithUnitRu(0.35, "gram"), "0,35 г");
		assert.equal(formatInventoryQuantityWithUnitRu(1, "pack"), "1 упак.");
		assert.equal(formatInventoryUnitRu("carpule", { full: true }), "Карпула (1.7–1.8 мл)");
	});
});

describe("Materials Auto-Deduction SSOT (Order 804n & SanPiN 2.1.3684-21)", () => {
	it("содержит исчерпывающие рецепты ключевых стоматологических процедур", () => {
		assert.ok(CANONICAL_PROCEDURE_RECIPES.length >= 6);

		const anes = getCanonicalProcedureRecipe("A11.07.012");
		assert.ok(anes, "Должен быть рецепт анестезии A11.07.012");
		assert.equal(anes.category, "anesthetic");
		assert.ok(anes.items.some((i) => i.inventoryItemId === "mat-anes-art-100k"));
		assert.ok(anes.items.some((i) => i.inventoryItemId === "mat-anes-needle-30g"));

		const caries = getCanonicalProcedureRecipe("A16.07.002.011");
		assert.ok(caries, "Должен быть рецепт пломбирования A16.07.002.011");
		assert.ok(caries.items.some((i) => i.inventoryItemId === "mat-composite-filtek"));

		const endo = getCanonicalProcedureRecipe("A16.07.030");
		assert.ok(endo, "Должен быть рецепт эндодонтии A16.07.030");
		assert.ok(endo.items.some((i) => i.inventoryItemId === "mat-naocl-3pct"));

		const extraction = getCanonicalProcedureRecipe("A16.07.001");
		assert.ok(extraction, "Должен быть рецепт удаления A16.07.001");
		assert.ok(extraction.items.some((i) => i.inventoryItemId === "mat-hemo-alvostaz"));

		const implant = getCanonicalProcedureRecipe("A16.07.054");
		assert.ok(implant, "Должен быть рецепт имплантации A16.07.054");
		assert.ok(implant.items.some((i) => i.inventoryItemId === "mat-implant-fixture-ti"));
	});

	it("динамически рассчитывает расход по числу каналов и поверхностей", () => {
		// 3-канальный зуб в эндодонтии
		const endoItems = resolveProcedureDeductionItems("A16.07.030", { canalsCount: 3 });
		const naocl = endoItems.find((i) => i.inventoryItemId === "mat-naocl-3pct");
		assert.ok(naocl);
		assert.equal(naocl.standardQuantity, 15); // 5 мл * 3 канала = 15 мл

		const gutta = endoItems.find((i) => i.inventoryItemId === "mat-gutta-percha");
		assert.ok(gutta);
		assert.equal(gutta.standardQuantity, 3); // 1 штифт * 3 канала = 3 шт

		// 2 поверхности при кариесе
		const cariesItems = resolveProcedureDeductionItems("A16.07.002.011", { surfaceCount: 2 });
		const composite = cariesItems.find((i) => i.inventoryItemId === "mat-composite-filtek");
		assert.ok(composite);
		assert.equal(composite.standardQuantity, 0.4); // 0.2г * 2 поверхности = 0.4г
	});

	it("корректно фиксирует мягкий овердрафт склада без блокировок", () => {
		const summary = calculateProcedureDeductionSummary([
			{
				inventoryItemId: "mat-anes-art-100k",
				nameRu: "Артикаин 4%",
				standardQuantity: 1,
				deductedQuantity: 1,
				currentStock: 0, // Дефицит!
				unitCostKopecks: 14500,
				unit: "carpule",
				isClassBWaste: true,
			},
			{
				inventoryItemId: "mat-nitrile-gloves",
				nameRu: "Перчатки нитриловые",
				standardQuantity: 1,
				deductedQuantity: 1,
				currentStock: 10, // Хватает
				unitCostKopecks: 3500,
				unit: "pair",
				isClassBWaste: true,
			},
		]);

		assert.equal(summary.hasOverdraft, true);
		assert.equal(summary.overdraftItemCount, 1);
		assert.equal(summary.overdraftLines[0]?.inventoryItemId, "mat-anes-art-100k");
		assert.equal(summary.overdraftLines[0]?.overdraftDeficitQuantity, 1);
		assert.ok(summary.softWarningMessageRu?.includes("мягкий овердрафт"));
		assert.equal(summary.totalCostKopecks, 18000);
		assert.equal(summary.totalCostRub, 180);
	});

	it("генерирует журнал отходов Класса Б по СанПиН 2.1.3684-21", () => {
		const records = generateSanpinClassBWasteRecords(
			[
				{
					inventoryItemId: "mat-anes-art-100k",
					nameRu: "Артикаин 4% (пустая карпула)",
					deductedQuantity: 1,
					unit: "carpule",
					isClassBWaste: true,
					classBWasteType: "pharmaceutical",
				},
				{
					inventoryItemId: "mat-anes-needle-30g",
					nameRu: "Игла карпульная 30G",
					deductedQuantity: 1,
					unit: "pcs",
					isClassBWaste: true,
					classBWasteType: "sharp",
				},
			],
			{
				procedureCode804n: "A11.07.012",
				procedureTitleRu: "Анестезия инфильтрационная",
				doctorName: "Д-р Иванов А.С.",
				patientName: "Сидоров В.П.",
				visitId: "VIS-101",
			},
		);

		assert.equal(records.length, 2);
		const needleRecord = records.find((r) => r.wasteCategory === "sharp");
		assert.ok(needleRecord);
		assert.ok(needleRecord.containerTypeRu.includes("непрокалываемый"));

		const carpuleRecord = records.find((r) => r.wasteCategory === "pharmaceutical");
		assert.ok(carpuleRecord);
		assert.ok(carpuleRecord.containerTypeRu.includes("карпул"));
	});
});
