/**
 * packages/shared/src/tests/order804nRegistryDecomposition.test.ts
 * Rigorous test suite for decomposed Minzdrav Order 804n Registry.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z, 8ag.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	ORDER_804N_STATUTORY_REGISTRY,
	type StatutoryNomenclatureEntry,
	type Order804nServiceItem,
	normalize804nCode,
	isOrder804nCode,
	validate804nCode,
	find804nEntryByCode,
	get804nEntriesByCategory,
	get804nEntriesBySpecialty,
	search804nRegistry,
	get804nCategorySummaries,
	stemCyrillicWord,
	tokenizeAndStem,
	THERAPEUTIC_AND_DIAGNOSTIC_804N_CATALOG,
	THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG,
	PEDIATRIC_804N_CATALOG,
	SURGICAL_804N_CATALOG,
	ORTHO_AND_PROSTHETIC_804N_CATALOG,
	SURGICAL_AND_ORTHO_804N_CATALOG,
} from "../pricelist/order804n/index.js";

import {
	ORDER_804N_STATUTORY_REGISTRY as FACADE_REGISTRY,
	type StatutoryNomenclatureEntry as FacadeEntry,
} from "../pricelist/order804nRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Minzdrav Order 804n Statutory Registry Decomposition Suite", () => {
	it("1. Behavioral Conservation: exact count and identity between facade and registry", () => {
		assert.equal(ORDER_804N_STATUTORY_REGISTRY.length, 58, "Registry must contain exactly 58 statutory services");
		assert.equal(FACADE_REGISTRY.length, 58, "Facade must export exactly 58 statutory services");
		assert.deepEqual(FACADE_REGISTRY, ORDER_804N_STATUTORY_REGISTRY, "Facade and decomposed registry must be 100% identical");
	});

	it("2. Layer 1 Catalog Partitioning: exact subcatalog sizes and completeness", () => {
		assert.equal(THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG.length, 30, "Base therapeutic catalog has 30 items");
		assert.equal(PEDIATRIC_804N_CATALOG.length, 5, "Pediatric catalog has 5 items");
		assert.equal(THERAPEUTIC_AND_DIAGNOSTIC_804N_CATALOG.length, 35, "Combined therapeutic catalog has 35 items");

		assert.equal(SURGICAL_804N_CATALOG.length, 11, "Surgical catalog has 11 items (surgery + implants)");
		assert.equal(ORTHO_AND_PROSTHETIC_804N_CATALOG.length, 12, "Ortho/prosthetics catalog has 12 items");
		assert.equal(SURGICAL_AND_ORTHO_804N_CATALOG.length, 23, "Combined surgical & ortho catalog has 23 items");

		assert.equal(
			THERAPEUTIC_AND_DIAGNOSTIC_804N_CATALOG.length + SURGICAL_AND_ORTHO_804N_CATALOG.length,
			58,
			"Sum of modular catalogs must equal 58",
		);
	});

	it("3. Statutory Code Syntax & Cyrillic Normalization", () => {
		assert.equal(normalize804nCode("а16.07.002"), "A16.07.002");
		assert.equal(normalize804nCode("в01.065.001"), "B01.065.001");
		assert.equal(normalize804nCode("  A16.07.054  "), "A16.07.054");

		assert.equal(isOrder804nCode("A16.07.002"), true);
		assert.equal(isOrder804nCode("B01.065.001.002"), true);
		assert.equal(isOrder804nCode("А16.07.002"), true, "Cyrillic А must normalize and pass");
		assert.equal(isOrder804nCode("INVALID_CODE"), false);
		assert.equal(isOrder804nCode("A16.07"), false);
	});

	it("4. Validation & Lookup by Code", () => {
		const val1 = validate804nCode("A16.07.002");
		assert.equal(val1.isValid, true);
		assert.equal(val1.entry?.title, "Восстановление зуба пломбой (лечение кариеса)");

		const valInvalid = validate804nCode("not-a-code");
		assert.equal(valInvalid.isValid, false);
		assert.ok(valInvalid.error?.includes("Недопустимый формат кода"));

		const found = find804nEntryByCode("A16.07.054");
		assert.ok(found);
		assert.equal(found?.title, "Внутрикостная дентальная имплантация");
		assert.equal(found?.category, "surgery");
		assert.equal(found?.defaultPriceRub, 35000);
	});

	it("5. Search Engine & Lexical Ranking", () => {
		// Exact code search
		const searchByCode = search804nRegistry("A16.07.002");
		assert.ok(searchByCode.length > 0);
		assert.equal(searchByCode[0].entry.code, "A16.07.002");
		assert.equal(searchByCode[0].matchType, "exact_code");

		// Keyword search for therapy
		const searchTherapy = search804nRegistry("Лечение кариеса пломбой световой");
		assert.ok(searchTherapy.length > 0);
		assert.equal(searchTherapy[0].entry.code, "A16.07.002");

		// Keyword search for CT 3D
		const searchCT = search804nRegistry("КЛКТ 3D снимок двух челюстей");
		assert.ok(searchCT.length > 0);
		assert.equal(searchCT[0].entry.code, "A06.07.013");

		// Keyword search with category filter
		const searchFiltered = search804nRegistry("осмотр", { categoryFilter: "consultation" });
		assert.ok(searchFiltered.length > 0);
		assert.ok(searchFiltered.every((r) => r.entry.category === "consultation"));
	});

	it("6. Lemmatization & Tokenization Helpers", () => {
		assert.equal(stemCyrillicWord("стоматологический"), "стоматолог");
		assert.equal(stemCyrillicWord("пломбирование"), "пломбир");
		const tokens = tokenizeAndStem("Лечение кариеса зуба 36 светоотверждаемым композитом");
		assert.ok(tokens.length >= 4);
		assert.ok(tokens.includes("леч"));
		assert.ok(tokens.includes("кариес"));
	});

	it("7. Category Summaries & Filtering", () => {
		const surgeries = get804nEntriesByCategory("surgery");
		assert.ok(surgeries.length >= 10);
		assert.ok(surgeries.every((s) => s.category === "surgery"));

		const summaries = get804nCategorySummaries();
		assert.ok(summaries.length > 0);
		const therapySum = summaries.find((s) => s.category === "therapy");
		assert.ok(therapySum);
		assert.ok(therapySum!.count >= 10);
		assert.ok(therapySum!.totalAveragePriceRub > 0);
	});

	it("8. Line Count Budget Gate: all modules < 800 lines and facade <= 50 lines", () => {
		const order804nDir = path.resolve(__dirname, "../pricelist/order804n");
		const facadePath = path.resolve(__dirname, "../pricelist/order804nRegistry.ts");

		const facadeContent = fs.readFileSync(facadePath, "utf8");
		const facadeLines = facadeContent.split("\n").length;
		assert.ok(facadeLines <= 50, `Facade lines (${facadeLines}) must be <= 50`);

		const files = fs.readdirSync(order804nDir);
		for (const file of files) {
			if (file.endsWith(".ts")) {
				const fullPath = path.join(order804nDir, file);
				const content = fs.readFileSync(fullPath, "utf8");
				const lines = content.split("\n").length;
				assert.ok(lines < 800, `File ${file} has ${lines} lines, which must be < 800 lines`);
			}
		}
	});
});
