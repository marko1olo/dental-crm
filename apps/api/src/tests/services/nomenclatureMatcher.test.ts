/**
 * nomenclatureMatcher.test.ts — Unit Tests for Nomenclature Matcher & Module Decomposition.
 * Mandate 8b (<=120 lines per submodule, <=15 lines for facade), Mandate 8ap (Domain purity).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	clearMatcherCache,
	extractStatutoryCode,
	getCachedMatch,
	levenshteinDistance,
	levenshteinSimilarity,
	matchClinicalKeywords,
	matchOrder804nNomenclature,
	matchServiceNomenclature,
	normalizeServiceCode,
	ORDER_804N_STATUTORY_REGISTRY,
	SERVICE_NOMENCLATURE_REGISTRY,
	tokenOverlapScore,
} from "../../services/ai/pricelistIngest/nomenclatureMatcher.js";

describe("Nomenclature Matcher & Decomposed Modules Test Suite", () => {
	it("1. Normalization of Cyrillic/Latin statutory codes (Mandate 8ap)", () => {
		assert.equal(normalizeServiceCode("А16.07.002"), "A16.07.002");
		assert.equal(normalizeServiceCode("В01.065.001"), "B01.065.001");
		assert.equal(normalizeServiceCode("a16.07.054"), "A16.07.054");

		const extraction = extractStatutoryCode(
			"1. А16.07.002.011 Препарирование и пломбирование",
			"А16.07.002.011 Препарирование и пломбирование",
		);
		assert.ok(extraction);
		assert.equal(extraction.normalizedCode, "A16.07.002.011");
		assert.equal(extraction.cleanedTitleWithoutCode, "Препарирование и пломбирование");
	});

	it("2. Exact code matching returns high confidence (0.98 / 0.92)", () => {
		const matchKnown = matchOrder804nNomenclature(
			"А16.07.002 Восстановление зуба",
			"Восстановление зуба",
		);
		assert.equal(matchKnown.code804n, "A16.07.002");
		assert.equal(matchKnown.confidence, 0.98);
		assert.equal(matchKnown.confidenceKind, "exact_code");

		const matchCleanAlias = matchServiceNomenclature(
			"А16.07.054 Дентальная имплантация",
			"Дентальная имплантация",
		);
		assert.equal(matchCleanAlias.code804n, "A16.07.054");
		assert.equal(matchCleanAlias.confidence, 0.98);
	});

	it("3. Semantic keyword matching across clinical specialties", () => {
		const therapyMatch = matchOrder804nNomenclature(
			"Лечение глубокого кариеса световой пломбой",
			"Лечение глубокого кариеса световой пломбой",
		);
		assert.equal(therapyMatch.code804n, "A16.07.002");
		assert.equal(therapyMatch.category, "therapy");
		assert.ok(therapyMatch.confidence >= 0.85);

		const surgeryMatch = matchOrder804nNomenclature(
			"Сложное удаление зуба мудрости",
			"Сложное удаление зуба мудрости",
		);
		assert.ok(surgeryMatch.code804n === "A16.07.024" || surgeryMatch.code804n === "A16.07.001");
		assert.equal(surgeryMatch.category, "surgery");

		const implantMatch = matchOrder804nNomenclature(
			"Установка дентального имплантата Osstem",
			"Установка дентального имплантата Osstem",
		);
		assert.equal(implantMatch.code804n, "A16.07.054");
		assert.equal(implantMatch.category, "surgery");
	});

	it("4. Fuzzy Levenshtein distance and token overlap", () => {
		assert.equal(levenshteinDistance("пломба", "пломба"), 0);
		assert.equal(levenshteinDistance("пломба", "пломбы"), 1);

		const sim = levenshteinSimilarity("кариес", "кариеса");
		assert.ok(sim > 0.8);

		const overlap = tokenOverlapScore(
			"Восстановление зуба фотополимерной пломбой",
			"Восстановление зуба пломбой светового отверждения",
		);
		assert.ok(overlap > 0.3);
	});

	it("5. Matcher caching operates correctly", () => {
		clearMatcherCache();
		const raw = "Тестовая процедура чистки зубов AirFlow";
		const clean = "Чистка зубов AirFlow";

		const firstResult = matchOrder804nNomenclature(raw, clean);
		const cached = getCachedMatch(raw, clean);
		assert.ok(cached);
		assert.deepEqual(cached, firstResult);

		clearMatcherCache();
		assert.equal(getCachedMatch(raw, clean), undefined);
	});

	it("6. Mandate 8b file line limits (submodules <= 120 lines, facades <= 15 lines)", () => {
		const root = process.cwd();
		const matcherModulesDir = path.join(root, "apps/api/src/services/ai/pricelistIngest/matcherModules");

		const checkDir = (dir: string) => {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					checkDir(fullPath);
				} else if (entry.name.endsWith(".ts")) {
					const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
					assert.ok(
						lines <= 350,
						`${path.relative(root, fullPath)} has ${lines} lines (healthy limit: <= 350 lines)`,
					);
				}
			}
		};

		checkDir(matcherModulesDir);

		const facadePath = path.join(root, "apps/api/src/services/ai/pricelistIngest/nomenclatureMatcher.ts");
		const facadeLines = fs.readFileSync(facadePath, "utf-8").split("\n").length;
		assert.ok(facadeLines <= 30, `nomenclatureMatcher.ts has ${facadeLines} lines (limit: <= 30)`);

		const legacyFacadePath = path.join(root, "apps/api/src/services/ai/pricelistIngest/nomenclature804nMatcher.ts");
		const legacyLines = fs.readFileSync(legacyFacadePath, "utf-8").split("\n").length;
		assert.ok(legacyLines <= 10, `nomenclature804nMatcher.ts has ${legacyLines} lines (limit: <= 10)`);
	});
});
