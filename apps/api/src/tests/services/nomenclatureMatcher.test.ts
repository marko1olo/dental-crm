/**
 * nomenclatureMatcher.test.ts — Unit Tests for Nomenclature Matcher (6G Live SUT).
 */

import assert from "node:assert/strict";
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

describe("Nomenclature Matcher & Decomposed Modules Test Suite (6G Live SUT)", () => {
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
			"Установка дентального имплантата",
			"Установка дентального имплантата",
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

	it("6. Registry alias parity, clinical keyword matcher & empty/unmatched fallback", () => {
		assert.deepEqual(SERVICE_NOMENCLATURE_REGISTRY, ORDER_804N_STATUTORY_REGISTRY);
		assert.ok(SERVICE_NOMENCLATURE_REGISTRY.length >= 70);

		const keywordMatch = matchClinicalKeywords("Удаление зуба под местной анестезией");
		assert.ok(keywordMatch);
		assert.equal(keywordMatch?.category, "surgery");

		const emptyResult = matchOrder804nNomenclature("", "");
		assert.equal(emptyResult.code804n, null);
		assert.equal(emptyResult.confidence, 0);

		const unknownResult = matchOrder804nNomenclature("zzzzz_unmatched_phrase_999", "zzzzz_unmatched_phrase_999");
		assert.ok(unknownResult.confidence < 0.7);
	});
});
