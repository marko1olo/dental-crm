/**
 * packages/shared/src/tests/order804nRegistryDecomposition.test.ts
 * Rigorous test suite for decomposed Order 804n Registry (6G Live SUT).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	ORDER_804N_STATUTORY_REGISTRY,
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
} from "../pricelist/order804nRegistry.js";

describe("Minzdrav Order 804n Statutory Registry Decomposition Suite (6G Live SUT)", () => {
	it("1. Behavioral Conservation: exact count and identity between facade and registry", () => {
		assert.equal(ORDER_804N_STATUTORY_REGISTRY.length, 75, "Registry must contain statutory services");
		assert.equal(FACADE_REGISTRY.length, 75, "Facade must export statutory services");
		assert.deepEqual(FACADE_REGISTRY, ORDER_804N_STATUTORY_REGISTRY, "Facade and decomposed registry must be 100% identical");
		assert.ok(ORDER_804N_STATUTORY_REGISTRY.some((s) => s.code === "A16.07.039"), "Must include A16.07.039 closed curettage");
	});

	it("2. Layer 1 Catalog Partitioning: exact subcatalog sizes and completeness", () => {
		assert.equal(THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG.length, 34, "Base therapeutic catalog has 34 items");
		assert.equal(PEDIATRIC_804N_CATALOG.length, 10, "Pediatric catalog has 10 items");
		assert.equal(THERAPEUTIC_AND_DIAGNOSTIC_804N_CATALOG.length, 44, "Combined therapeutic catalog has 44 items");

		assert.equal(SURGICAL_AND_ORTHO_804N_CATALOG.length, 31, "Combined surgical & ortho catalog has 31 items");
		assert.equal(
			SURGICAL_804N_CATALOG.length + ORTHO_AND_PROSTHETIC_804N_CATALOG.length,
			SURGICAL_AND_ORTHO_804N_CATALOG.length,
		);

		assert.equal(
			THERAPEUTIC_AND_DIAGNOSTIC_804N_CATALOG.length + SURGICAL_AND_ORTHO_804N_CATALOG.length,
			75,
			"Sum of modular catalogs must equal 75",
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
		const searchByCode = search804nRegistry("A16.07.002");
		assert.ok(searchByCode.length > 0);
		assert.equal(searchByCode[0]?.entry.code, "A16.07.002");
		assert.equal(searchByCode[0]?.matchType, "exact_code");

		const searchTherapy = search804nRegistry("Лечение кариеса пломбой световой");
		assert.ok(searchTherapy.length > 0);
		assert.equal(searchTherapy[0]?.entry.code, "A16.07.002");

		const searchCT = search804nRegistry("КЛКТ 3D снимок двух челюстей");
		assert.ok(searchCT.length > 0);
		assert.equal(searchCT[0]?.entry.code, "A06.07.013");

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
		assert.ok((therapySum?.count ?? 0) >= 10);
		assert.ok((therapySum?.totalAveragePriceRub ?? 0) > 0);
	});

	it("8. Specialty Filtering & Empty/Invalid Input Guards", () => {
		const orthoEntries = get804nEntriesBySpecialty("orthodontics");
		assert.ok(orthoEntries.length > 0);
		assert.ok(orthoEntries.every((entry) => entry.specialty === "orthodontics"));

		assert.equal(normalize804nCode("   "), "");
		assert.equal(validate804nCode("").isValid, false);
		assert.equal(find804nEntryByCode("A99.99.999"), undefined);
		assert.deepEqual(search804nRegistry(""), []);
		assert.deepEqual(search804nRegistry("zzz_nonexistent_dental_xyz_12345"), []);
	});
});
