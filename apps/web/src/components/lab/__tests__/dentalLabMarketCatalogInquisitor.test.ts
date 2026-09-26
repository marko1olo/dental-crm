/**
 * dentalLabMarketCatalogInquisitor.test.ts
 *
 * RIGOROUS INQUISITION FOR DENTAL LAB & ORTHOPEDIC WORK ORDERS:
 * 1. 90%+ CIS/RU market popularity catalog descending order verification (Katana ZrO2 -> e.max -> CoCr -> PMMA -> Clasp -> Ti-Base -> Acrylic).
 * 2. Mandate 8b: Strictly <= 800 lines per file across all lab & orthopedics modules.
 * 3. Mandate 8d: Zero cartoon emojis in clinical code.
 * 4. Mandate 8e: Doctor autonomy & zero blocking gates.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
	ORTHOPEDIC_WORK_TYPES,
	ORDERED_MARKET_ORTHOPEDIC_TYPES,
	createDentalLabOrder,
	advanceLabOrderStage,
	sendOrderToWarrantyRework,
	type OrthopedicWorkTypeId,
} from "../dentalLabWorkflowEngine";
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	STUMP_NATURAL_DIE_SHADES,
	calculateLabFinancialSplit,
} from "../labMath";

describe("Dental Lab Market Catalog & Mandate Invariants Inquisitor", () => {
	it("1. Verifies 90%+ CIS/RU market catalog in exact descending order of clinical popularity", () => {
		const expectedOrder: OrthopedicWorkTypeId[] = [
			"crown_zirconia",    // #1 Katana STML/UTML ZrO2
			"crown_emax",        // #2 IPS e.max CAD/Press
			"metal_ceramic",     // #3 Metal-ceramic CoCr/NiCr
			"temporary_pmma",    // #4 PMMA temporary (milled/3D printed)
			"clasp_prosthesis",  // #5 Clasp dentures (Bredent/MK-1)
			"custom_abutment",   // #6 Custom Ti-Base abutments
			"removable_acrylic", // #7 Full acrylic dentures (Acry-Free/Ivocap/Vertex)
			"aligners",          // #8 Aligners / Splints
		];

		assert.deepEqual(
			[...ORDERED_MARKET_ORTHOPEDIC_TYPES],
			expectedOrder,
			"ORDERED_MARKET_ORTHOPEDIC_TYPES must match the exact descending popularity list",
		);

		for (const typeId of expectedOrder) {
			const item = ORTHOPEDIC_WORK_TYPES[typeId];
			assert.ok(item, `Work type ${typeId} must exist in ORTHOPEDIC_WORK_TYPES`);
			assert.equal(item.id, typeId);
			assert.ok(item.nameRu.length > 5, `nameRu for ${typeId} must be comprehensive`);
			assert.ok(item.defaultMaterialRu.length > 3, `defaultMaterialRu for ${typeId} must be defined`);
			assert.ok(item.standardTurnaroundWorkingDays > 0, `Turnaround for ${typeId} must be positive`);
			assert.ok(Number.isInteger(item.defaultPriceKopecks) && item.defaultPriceKopecks > 0);
			assert.ok(Number.isInteger(item.defaultCostKopecks) && item.defaultCostKopecks > 0);
			assert.ok(item.defaultPriceKopecks > item.defaultCostKopecks, "Price must exceed lab cost");
		}
	});

	it("2. Verifies temporary_pmma first-class citizen properties", () => {
		const pmma = ORTHOPEDIC_WORK_TYPES.temporary_pmma;
		assert.ok(pmma, "temporary_pmma must be a first-class citizen in ORTHOPEDIC_WORK_TYPES");
		assert.ok(pmma.nameRu.includes("PMMA"), "PMMA nameRu must mention PMMA");
		assert.ok(pmma.standardTurnaroundWorkingDays <= 3, "Temporary restorations must have turnaround <= 3 days");
		assert.equal(pmma.requiresStumpShade, false);
		assert.equal(pmma.requiresImplantSystem, false);

		// Factory test with temporary_pmma
		const order = createDentalLabOrder({
			patientId: "pat-pmma",
			patientName: "Сидорова Анна",
			doctorId: "doc-01",
			doctorName: "Д-р Смирнов",
			workTypeId: "temporary_pmma",
			selectedTeeth: [21],
		});
		assert.equal(order.workTypeId, "temporary_pmma");
		assert.equal(order.selectedTeeth[0], 21);
		assert.ok(order.financials.patientPriceTotalKopecks > 0);
		assert.ok(order.financials.isBalanced);
	});

	it("3. Mandate 8b: All lab and orthopedics files strictly <= 800 lines of code", () => {
		const directories = [
			path.resolve(process.cwd(), "apps/web/src/components/lab"),
			path.resolve(process.cwd(), "apps/web/src/components/orthopedics"),
		];

		const oversizedFiles: Array<{ file: string; lines: number }> = [];

		function scanDir(dir: string) {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory() && entry.name !== "__tests__" && entry.name !== "node_modules") {
					scanDir(fullPath);
				} else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
					const content = fs.readFileSync(fullPath, "utf8");
					const lines = content.split(/\r?\n/).length;
					if (lines > 800) {
						oversizedFiles.push({ file: path.relative(process.cwd(), fullPath), lines });
					}
				}
			}
		}

		for (const d of directories) {
			if (fs.existsSync(d)) scanDir(d);
		}

		assert.equal(
			oversizedFiles.length,
			0,
			`Found oversized files (>800 lines): ${JSON.stringify(oversizedFiles, null, 2)}`,
		);
	});

	it("4. Mandate 8d: Zero cartoon emojis across all lab and orthopedics components", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const directories = [
			path.resolve(process.cwd(), "apps/web/src/components/lab"),
			path.resolve(process.cwd(), "apps/web/src/components/orthopedics"),
		];

		const emojiViolations: Array<{ file: string; line: number; match: string }> = [];

		function scanDir(dir: string) {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory() && entry.name !== "__tests__" && entry.name !== "node_modules") {
					scanDir(fullPath);
				} else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
					const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
					lines.forEach((line, idx) => {
						const match = line.match(emojiRegex);
						if (match) {
							emojiViolations.push({
								file: path.relative(process.cwd(), fullPath),
								line: idx + 1,
								match: match[0],
							});
						}
					});
				}
			}
		}

		for (const d of directories) {
			if (fs.existsSync(d)) scanDir(d);
		}

		assert.equal(
			emojiViolations.length,
			0,
			`Found cartoon emoji violations (Mandate 8d): ${JSON.stringify(emojiViolations, null, 2)}`,
		);
	});

	it("5. Financial kopeck-exact integrity and warranty rework (0 ₽ for patient)", () => {
		const split = calculateLabFinancialSplit(35000, 25);
		assert.equal(split.totalKopecks, 3500000);
		assert.equal(split.doctorKopecks, 875000);
		assert.equal(split.clinicKopecks, 2625000);
		assert.equal(split.isBalanced, true);

		const order = createDentalLabOrder({
			patientId: "pat-warr",
			patientName: "Ковалев В. В.",
			doctorId: "doc-02",
			doctorName: "Д-р Белов",
			workTypeId: "crown_emax",
			selectedTeeth: [11],
			initialStatus: "installed_completed",
		});

		const rework = sendOrderToWarrantyRework(order, "Скол керамики", "Д-р Белов");
		assert.equal(rework.currentStage, "warranty_rework");
		assert.equal(rework.isWarrantyRework, true);
		assert.equal(rework.financials.patientPriceTotalKopecks, 0);
		assert.equal(rework.financials.patientPriceTotalRub, 0);
		assert.equal(rework.financials.isBalanced, true);
		assert.equal(rework.originalOrderNumber, order.orderNumber);
	});
});
