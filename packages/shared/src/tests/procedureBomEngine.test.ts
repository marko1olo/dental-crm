import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type CabinetStockItem,
	type CompletedProcedureInput,
	STANDARD_PROCEDURE_BOM_MAPS,
	calculateProcedureMaterialsCost,
	deductMaterialsFromCabinetStock,
	getStandardBOMForProcedure,
	procedureBomMapSchema,
	resolveProcedureMaterials,
} from "../inventory/procedureBomEngine.js";

describe("Clinical Procedure BOM & Material Deduction Engine (procedureBomEngine.ts)", () => {
	it("1. Standard Technological Maps (BOM) for core 804n clinical procedures", () => {
		// A16.07.002 — Кариес/Пломбирование
		const bomCaries = getStandardBOMForProcedure("A16.07.002");
		assert.ok(bomCaries);
		assert.equal(bomCaries.code804n, "A16.07.002");
		assert.equal(bomCaries.category, "therapy");
		const cariesSkus = bomCaries.materials.map((m) => m.sku);
		assert.ok(cariesSkus.includes("MAT-ANES-01")); // Anesthetic
		assert.ok(cariesSkus.includes("MAT-COMP-01")); // Composite
		assert.ok(cariesSkus.includes("MAT-MATR-01")); // Sectional Matrix
		assert.ok(cariesSkus.includes("MAT-BRUSH-01")); // Microbrush
		assert.ok(cariesSkus.includes("MAT-ROLL-01")); // Cotton roll
		assert.ok(cariesSkus.includes("MAT-SUCT-01")); // Suction tip

		// A16.07.030 — Эндодонтия 1-канальная
		const bomEndo = getStandardBOMForProcedure("A16.07.030");
		assert.ok(bomEndo);
		assert.equal(bomEndo.category, "endo");
		const endoSkus = bomEndo.materials.map((m) => m.sku);
		assert.ok(endoSkus.includes("MAT-COFF-01")); // Cofferdam
		assert.ok(endoSkus.includes("MAT-NITI-01")); // NiTi File
		assert.ok(endoSkus.includes("MAT-HYPO-01")); // Sodium Hypochlorite
		assert.ok(endoSkus.includes("MAT-SEAL-01")); // Epoxy Sealer
		assert.ok(endoSkus.includes("MAT-GUTT-01")); // Gutta-percha

		// A16.07.006 — Удаление зуба сложное
		const bomSurgery = getStandardBOMForProcedure("A16.07.006");
		assert.ok(bomSurgery);
		assert.equal(bomSurgery.category, "surgery");
		const surgSkus = bomSurgery.materials.map((m) => m.sku);
		assert.ok(surgSkus.includes("MAT-SCALP-01")); // Scalpel blade 15C
		assert.ok(surgSkus.includes("MAT-SUTR-01")); // Vicryl suture 4-0
		assert.ok(surgSkus.includes("MAT-HEMO-01")); // Hemostatic sponge

		// A16.07.054 — Имплантация
		const bomImplant = getStandardBOMForProcedure("A16.07.054");
		assert.ok(bomImplant);
		assert.equal(bomImplant.category, "implant");
		const impSkus = bomImplant.materials.map((m) => m.sku);
		assert.ok(impSkus.includes("MAT-IMPL-01")); // Implant fixture
		assert.ok(impSkus.includes("MAT-COVER-01")); // Cover screw
		assert.ok(impSkus.includes("MAT-SUTR-01")); // Suture

		// A16.07.051 — Профгигиена AirFlow/УЗ
		const bomHygiene = getStandardBOMForProcedure("A16.07.051");
		assert.ok(bomHygiene);
		assert.equal(bomHygiene.category, "hygiene");
		const hygSkus = bomHygiene.materials.map((m) => m.sku);
		assert.ok(hygSkus.includes("MAT-POWD-01")); // AirFlow powder
		assert.ok(hygSkus.includes("MAT-PAST-01")); // Prophy paste
		assert.ok(hygSkus.includes("MAT-CUP-01")); // Polishing cup
		assert.ok(hygSkus.includes("MAT-OPTR-01")); // OptraGate
	});

	it("2. Validates all pre-configured technological maps against Zod schema", () => {
		for (const [code, bom] of Object.entries(STANDARD_PROCEDURE_BOM_MAPS)) {
			const res = procedureBomMapSchema.safeParse(bom);
			assert.ok(res.success, `Schema validation failed for procedure ${code}: ${JSON.stringify(res)}`);
			assert.ok(bom.materials.length > 0);
			for (const m of bom.materials) {
				assert.ok(m.standardQuantity > 0);
				assert.ok(m.estimatedUnitCostKopecks >= 0);
			}
		}
	});

	it("3. resolveProcedureMaterials aggregates materials across multiple distinct procedures", () => {
		const procedures: CompletedProcedureInput[] = [
			{
				procedureCode804n: "A16.07.002",
				quantity: 2,
				toothNumber: 16,
			},
			{
				procedureCode804n: "A16.07.030",
				quantity: 1,
				toothNumber: 26,
			},
			{
				procedureCode804n: "A16.07.051",
				quantity: 1,
			},
		];

		const summary = resolveProcedureMaterials(procedures);
		assert.equal(summary.totalProceduresCount, 4);
		assert.equal(summary.recognizedProceduresCount, 4);
		assert.equal(summary.unrecognizedProceduresCount, 0);
		assert.ok(summary.totalEstimatedCostKopecks > 0);

		// Anesthetic should be aggregated: 2 carpules (from 2x A16.07.002) + 1 carpule (from 1x A16.07.030) = 3 carpules
		const anes = summary.materials.find((m) => m.sku === "MAT-ANES-01");
		assert.ok(anes);
		assert.equal(anes.totalQuantityRequired, 3);
		assert.equal(anes.unitOfMeasure, "carpule");
		assert.equal(anes.procedureBreakdown.length, 2);

		// Composite: 2 * 0.2g = 0.4g
		const comp = summary.materials.find((m) => m.sku === "MAT-COMP-01");
		assert.ok(comp);
		assert.equal(comp.totalQuantityRequired, 0.4);
		assert.equal(comp.unitOfMeasure, "gram");

		// OptraGate from Hygiene: 1 pcs
		const optr = summary.materials.find((m) => m.sku === "MAT-OPTR-01");
		assert.ok(optr);
		assert.equal(optr.totalQuantityRequired, 1);
	});

	it("4. resolveProcedureMaterials correctly flags unrecognized 804n codes", () => {
		const procedures: CompletedProcedureInput[] = [
			{ procedureCode804n: "A16.07.002", quantity: 1 },
			{ procedureCode804n: "UNKNOWN.CODE.999", quantity: 2 },
		];

		const summary = resolveProcedureMaterials(procedures);
		assert.equal(summary.totalProceduresCount, 3);
		assert.equal(summary.recognizedProceduresCount, 1);
		assert.equal(summary.unrecognizedProceduresCount, 1);
		assert.deepEqual(summary.unrecognizedProcedureCodes, ["UNKNOWN.CODE.999"]);
	});

	it("5. deductMaterialsFromCabinetStock decrements inventory and triggers low stock alerts", () => {
		const currentStock: CabinetStockItem[] = [
			{
				id: "STK-1",
				organizationId: "org-1",
				cabinetId: "CAB-3",
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый",
				currentQuantity: 8,
				minThresholdQuantity: 5,
				unitOfMeasure: "carpule",
				costKopecks: 14500,
			},
			{
				id: "STK-2",
				organizationId: "org-1",
				cabinetId: "CAB-3",
				sku: "MAT-COMP-01",
				nameRu: "Композит Filtek",
				currentQuantity: 0.5,
				minThresholdQuantity: 0.4,
				unitOfMeasure: "gram",
				costKopecks: 38000,
			},
			{
				id: "STK-3",
				organizationId: "org-1",
				cabinetId: "CAB-3",
				sku: "MAT-SCALP-01",
				nameRu: "Лезвие скальпеля 15C",
				currentQuantity: 1,
				minThresholdQuantity: 2,
				unitOfMeasure: "pcs",
				costKopecks: 6500,
			},
		];

		// Require 4 carpules anesthetic, 0.2g composite, 1 scalpel
		const requirements = [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый",
				category: "Анестезия",
				totalQuantityRequired: 4,
				unitOfMeasure: "carpule" as const,
				totalEstimatedCostKopecks: 58000,
				procedureBreakdown: [],
				isAvailableInStock: true,
				currentStockQuantity: 8,
				shortfallQuantity: 0,
			},
			{
				sku: "MAT-COMP-01",
				nameRu: "Композит Filtek",
				category: "Пломбировочные",
				totalQuantityRequired: 0.2,
				unitOfMeasure: "gram" as const,
				totalEstimatedCostKopecks: 38000,
				procedureBreakdown: [],
				isAvailableInStock: true,
				currentStockQuantity: 0.5,
				shortfallQuantity: 0,
			},
			{
				sku: "MAT-SCALP-01",
				nameRu: "Лезвие скальпеля 15C",
				category: "Хирургия",
				totalQuantityRequired: 1,
				unitOfMeasure: "pcs" as const,
				totalEstimatedCostKopecks: 6500,
				procedureBreakdown: [],
				isAvailableInStock: true,
				currentStockQuantity: 1,
				shortfallQuantity: 0,
			},
		];

		const result = deductMaterialsFromCabinetStock(currentStock, requirements);
		assert.equal(result.success, true);
		assert.equal(result.hasShortfall, false);
		assert.equal(result.deductedItems.length, 3);

		// Anesthetic: 8 - 4 = 4 carpules (<= minThreshold 5) -> triggers warning_low_stock
		const anesStock = result.updatedStock.find((s) => s.sku === "MAT-ANES-01");
		assert.ok(anesStock);
		assert.equal(anesStock.currentQuantity, 4);

		// Composite: 0.5 - 0.2 = 0.3g (<= minThreshold 0.4) -> triggers warning_low_stock
		const compStock = result.updatedStock.find((s) => s.sku === "MAT-COMP-01");
		assert.ok(compStock);
		assert.equal(compStock.currentQuantity, 0.3);

		// Scalpel: 1 - 1 = 0 pcs -> triggers critical_out_of_stock
		const scalpStock = result.updatedStock.find((s) => s.sku === "MAT-SCALP-01");
		assert.ok(scalpStock);
		assert.equal(scalpStock.currentQuantity, 0);

		// Verify alerts
		assert.equal(result.lowStockAlerts.length, 3);
		const criticalAlert = result.lowStockAlerts.find((a) => a.alertLevel === "critical_out_of_stock");
		assert.ok(criticalAlert);
		assert.equal(criticalAlert.sku, "MAT-SCALP-01");
		assert.equal(criticalAlert.remainingQuantity, 0);
	});

	it("6. deductMaterialsFromCabinetStock handles inventory shortfall accurately", () => {
		const lowStock: CabinetStockItem[] = [
			{
				id: "STK-1",
				organizationId: "org-1",
				cabinetId: "CAB-1",
				sku: "MAT-IMPL-01",
				nameRu: "Дентальный имплантат Straumann",
				currentQuantity: 1,
				minThresholdQuantity: 2,
				unitOfMeasure: "pcs",
				costKopecks: 1450000,
			},
		];

		// Require 2 implants but only 1 in stock
		const requirements = [
			{
				sku: "MAT-IMPL-01",
				nameRu: "Дентальный имплантат Straumann",
				category: "Имплантаты",
				totalQuantityRequired: 2,
				unitOfMeasure: "pcs" as const,
				totalEstimatedCostKopecks: 2900000,
				procedureBreakdown: [],
				isAvailableInStock: false,
				currentStockQuantity: 1,
				shortfallQuantity: 1,
			},
		];

		const result = deductMaterialsFromCabinetStock(lowStock, requirements);
		assert.equal(result.success, false);
		assert.equal(result.hasShortfall, true);
		const impStock = result.updatedStock.find((s) => s.sku === "MAT-IMPL-01");
		assert.ok(impStock);
		assert.equal(impStock.currentQuantity, 0);
	});

	it("7. calculateProcedureMaterialsCost accurately computes exact integer kopecks", () => {
		// Single Caries procedure
		const costSingle = calculateProcedureMaterialsCost("A16.07.002", 1);
		assert.ok(costSingle.totalCostKopecks > 0);
		assert.equal(costSingle.materials.length, 6);

		// Double Caries procedure
		const costDouble = calculateProcedureMaterialsCost("A16.07.002", 2);
		assert.equal(costDouble.totalCostKopecks, costSingle.totalCostKopecks * 2);

		// Unknown code returns zero
		const costUnknown = calculateProcedureMaterialsCost("UNKNOWN_CODE", 1);
		assert.equal(costUnknown.totalCostKopecks, 0);
		assert.equal(costUnknown.materials.length, 0);
	});
});
