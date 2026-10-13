import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CANONICAL_PROCEDURE_RECIPES,
	calculateProcedureDeductionSummary,
	convertInventoryUnit,
	formatInventoryQuantityWithUnitRu,
	generateSanpinClassBWasteRecords,
	getCanonicalProcedureRecipe,
	normalizeInventoryUnit,
	resolveProcedureDeductionItems,
} from "../inventory/index.js";

describe("Inventory Materials SSOT & Auto-Deduction Engine (materialsAutoDeductionSsot.ts)", () => {
	it("1. Canonical procedure recipes cover all core dental procedures with 804n codes", () => {
		const codes = CANONICAL_PROCEDURE_RECIPES.map((r) => r.code804n);
		assert.ok(codes.includes("A11.07.012"), "Local anesthesia must be present");
		assert.ok(codes.includes("A16.07.002.011"), "Composite restoration must be present");
		assert.ok(codes.includes("A16.07.030"), "Endodontics ProTaper must be present");
		assert.ok(codes.includes("A16.07.001"), "Surgical extraction must be present");
		assert.ok(codes.includes("A16.07.054"), "Implant placement must be present");
		assert.ok(codes.includes("A16.07.051"), "Oral hygiene must be present");
	});

	it("2. Resolves recipes by 804n codes and aliases case-insensitively", () => {
		// Exact code
		const recipe1 = getCanonicalProcedureRecipe("A11.07.012");
		assert.ok(recipe1);
		assert.equal(recipe1.category, "anesthetic");

		// Alias
		const recipeAlias = getCanonicalProcedureRecipe("anes_local");
		assert.ok(recipeAlias);
		assert.equal(recipeAlias.code804n, "A11.07.012");

		// Case-insensitive lookup for composite caries
		const recipeCaries = getCanonicalProcedureRecipe("a16.07.002");
		assert.ok(recipeCaries);
		assert.equal(recipeCaries.category, "composite");

		// Complex extraction alias
		const recipeSurg = getCanonicalProcedureRecipe("EXTRACTION_COMPLEX");
		assert.ok(recipeSurg);
		assert.equal(recipeSurg.code804n, "A16.07.001");
	});

	it("3. Resolves endodontic procedure items with multi-canal scaling", () => {
		// Single canal
		const items1Canal = resolveProcedureDeductionItems("A16.07.030", { canalsCount: 1 });
		const nitiItem1 = items1Canal.find((i) => i.inventoryItemId === "mat-niti-protaper");
		assert.ok(nitiItem1);
		assert.equal(nitiItem1.standardQuantity, 1);
		assert.equal(nitiItem1.estimatedUnitCostKopecks, 65000);

		// 3 canals (Molar endo)
		const items3Canals = resolveProcedureDeductionItems("A16.07.030", { canalsCount: 3 });
		const nitiItem3 = items3Canals.find((i) => i.inventoryItemId === "mat-niti-protaper");
		assert.ok(nitiItem3);
		assert.equal(nitiItem3.standardQuantity, 3);
		assert.equal(nitiItem3.estimatedUnitCostKopecks, 195000); // 650.00 * 3 = 1950.00 ₽

		const naoclItem3 = items3Canals.find((i) => i.inventoryItemId === "mat-naocl-3pct");
		assert.ok(naoclItem3);
		assert.equal(naoclItem3.standardQuantity, 15); // 5ml * 3 = 15ml
	});

	it("4. Resolves composite restoration scaling with multi-surface volume", () => {
		// 1 surface
		const items1Surf = resolveProcedureDeductionItems("A16.07.002.011", { surfaceCount: 1 });
		const comp1 = items1Surf.find((i) => i.inventoryItemId === "mat-composite-filtek");
		assert.ok(comp1);
		assert.equal(comp1.standardQuantity, 0.2);

		// 3 surfaces (MOD cavity)
		const items3Surf = resolveProcedureDeductionItems("A16.07.002.011", { surfaceCount: 3 });
		const comp3 = items3Surf.find((i) => i.inventoryItemId === "mat-composite-filtek");
		assert.ok(comp3);
		assert.equal(comp3.standardQuantity, 0.6); // 0.2g * 3
	});

	it("5. Calculates deterministic summary with soft overdraft detection (Mandate 8e)", () => {
		const testItems = [
			{
				inventoryItemId: "mat-anes-art-100k",
				nameRu: "Артикаин 4% 1:100 000 (1.7 мл)",
				unit: "карпула",
				standardQuantity: 1,
				deductedQuantity: 2,
				unitCostKopecks: 14500, // 145.00 ₽
				currentStock: 0, // In deficit!
			},
			{
				inventoryItemId: "mat-anes-needle-30g",
				nameRu: "Игла карпульная 30G",
				unit: "шт",
				standardQuantity: 1,
				deductedQuantity: 2,
				unitCostKopecks: 2500, // 25.00 ₽
				currentStock: 10, // Stock is sufficient
			},
		];

		const summary = calculateProcedureDeductionSummary(testItems);
		assert.equal(summary.totalCostKopecks, 34000); // (2 * 14500) + (2 * 2500) = 29000 + 5000 = 34000 (340.00 ₽)
		assert.equal(summary.totalCostRub, 340);
		assert.equal(summary.hasOverdraft, true);
		assert.equal(summary.overdraftItemCount, 1);
		assert.equal(summary.overdraftLines[0]!.inventoryItemId, "mat-anes-art-100k");
		assert.equal(summary.overdraftLines[0]!.overdraftDeficitQuantity, 2);
		assert.ok(summary.softWarningMessageRu);
		assert.ok(summary.softWarningMessageRu.includes("мягкий овердрафт"));
	});

	it("6. Generates SanPiN Class B hazardous medical waste records", () => {
		const testItems = [
			{
				inventoryItemId: "mat-anes-needle-30g",
				nameRu: "Игла карпульная 30G",
				deductedQuantity: 2,
				unit: "шт",
				isClassBWaste: true,
				classBWasteType: "sharp" as const,
			},
			{
				inventoryItemId: "mat-anes-art-100k",
				nameRu: "Артикаин 4% 1.7 мл",
				deductedQuantity: 2,
				unit: "карпула",
				isClassBWaste: true,
				classBWasteType: "pharmaceutical" as const,
			},
			{
				inventoryItemId: "mat-composite-filtek",
				nameRu: "Композит Filtek",
				deductedQuantity: 0.2,
				unit: "шприц_гр",
				isClassBWaste: false,
			},
		];

		const records = generateSanpinClassBWasteRecords(testItems, {
			procedureCode804n: "A16.07.002",
			procedureTitleRu: "Пломбирование зуба",
			doctorName: "Кузнецов А.В.",
			patientName: "Смирнова Е.А.",
			visitId: "visit-123",
		});

		assert.equal(records.length, 2);
		assert.equal(records[0]!.materialName, "Игла карпульная 30G");
		assert.equal(records[0]!.wasteCategory, "sharp");
		assert.ok(records[0]!.containerTypeRu.includes("непрокалываемый контейнер"));

		assert.equal(records[1]!.materialName, "Артикаин 4% 1.7 мл");
		assert.equal(records[1]!.wasteCategory, "pharmaceutical");
		assert.ok(records[1]!.containerTypeRu.includes("карпул"));
	});

	it("7. Integrates unit conversions and human-readable formatting", () => {
		// Converting pack of 50 carpules to individual carpules
		const carpulesFromPack = convertInventoryUnit(1, "pack", "carpule", {
			carpulesPerPack: 50,
		});
		assert.equal(carpulesFromPack, 50);

		// Converting 4g syringe of composite to individual grams
		const gramsFromSyringe = convertInventoryUnit(1, "syringe_g", "gram", {
			gramsPerSyringe: 4,
		});
		assert.equal(gramsFromSyringe, 4);

		// Russian formatting of quantities
		const formattedCarpules = formatInventoryQuantityWithUnitRu(2, "carpule");
		assert.equal(formattedCarpules, "2 карп.");

		const formattedGrams = formatInventoryQuantityWithUnitRu(0.2, "syringe_g");
		assert.equal(formattedGrams, "0,2 шприц (г)");
	});
});
