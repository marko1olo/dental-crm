import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	areSurnamesMatching,
	canonicalizeHomoglyphs,
	nameKey,
	pairKey,
	phoneKey,
	surnameOf,
} from "./duplicateDetection.js";
import {
	convertQwertyMistype,
	transliterateLatinToCyrillic,
	damerauLevenshteinDistance,
	stringLevenshteinSimilarity,
	nameFuzzySimilarity,
} from "./duplicateFuzzyMetrics.js";

describe("nameKey", () => {
	test("should convert to lowercase", () => {
		assert.equal(nameKey("ИВАНОВ"), "иванов");
	});
	test("should replace 'ё' with 'е' and sort tokens alphabetically", () => {
		assert.equal(nameKey("Семёнов Семён"), "семен семенов");
	});
	test("should strip non-letters and tokenize words", () => {
		assert.equal(nameKey("Иванов, Иван! (Сергеевич)"), "иван иванов сергеевич");
	});
	test("should collapse multiple spaces", () => {
		assert.equal(nameKey("Иванов   Иван    Иванович"), "иван иванов иванович");
	});
	test("should trim leading and trailing spaces and maintain token sort", () => {
		assert.equal(nameKey("  Иванов Иван  "), "иван иванов");
	});
	test("should tokenize hyphens for compound names into sorted tokens", () => {
		assert.equal(nameKey("Салтыков-Щедрин Михаил"), "михаил салтыков щедрин");
	});
	test("should be order-invariant (token-sort symmetry)", () => {
		assert.equal(nameKey("Иван Иванов"), nameKey("Иванов Иван"));
		assert.equal(
			nameKey("Салтыков-Щедрин Михаил"),
			nameKey("Михаил Щедрин-Салтыков"),
		);
	});
});

describe("canonicalizeHomoglyphs", () => {
	test("should convert Latin visual lookalikes to Cyrillic", () => {
		// Latin 'C', 'e', 'p', 'o', 'a' in Latin vs Cyrillic
		const latinSpoofed = "Cepгeй"; // C, e, p, e are Latin
		const canonical = canonicalizeHomoglyphs(latinSpoofed);
		assert.equal(canonical, "сергей");
	});
});

describe("phoneKey", () => {
	test("should return null for null input", () => {
		assert.equal(phoneKey(null), null);
	});
	test("should extract digits and return last 10", () => {
		assert.equal(phoneKey("+7 (916) 123-45-67"), "9161234567");
		assert.equal(phoneKey("89161234567"), "9161234567");
	});
	test("should handle non-digit characters", () => {
		assert.equal(phoneKey("916-123-45-67!"), "9161234567");
	});
	test("should return null if less than 10 digits", () => {
		assert.equal(phoneKey("1234567"), null);
	});
	test("should handle empty string", () => {
		assert.equal(phoneKey(""), null);
	});
	test("should strip extension numbers", () => {
		assert.equal(phoneKey("+7 (916) 123-45-67 доб. 105"), "9161234567");
	});
});

describe("surnameOf", () => {
	test("should extract the first word of the normalized name", () => {
		assert.equal(surnameOf("Иванов Иван Иванович"), "иванов");
	});
	test("should handle double spaces and extra characters", () => {
		assert.equal(surnameOf("  Иванов   Иван  "), "иванов");
	});
	test("should handle hyphens in surname", () => {
		assert.equal(surnameOf("Петрова-Водкина Анна"), "петрова-водкина");
	});
	test("should return empty string for empty input", () => {
		assert.equal(surnameOf(""), "");
	});
});

describe("areSurnamesMatching", () => {
	test("should recognize exact surname match", () => {
		assert.equal(areSurnamesMatching("Иванов", "Иванов"), true);
	});
	test("should match gendered Russian surname endings (-ов / -ова)", () => {
		assert.equal(areSurnamesMatching("Иванов", "Иванова"), true);
		assert.equal(areSurnamesMatching("Кузнецов", "Кузнецова"), true);
	});
	test("should match gendered Russian surname endings (-ин / -ина)", () => {
		assert.equal(areSurnamesMatching("Пушкин", "Пушкина"), true);
	});
	test("should match gendered Russian surname endings (-ский / -ская)", () => {
		assert.equal(areSurnamesMatching("Заславский", "Заславская"), true);
	});
	test("should match gendered adjective surnames (-ый / -ая, -ой / -ая)", () => {
		assert.equal(areSurnamesMatching("Белый", "Белая"), true);
		assert.equal(areSurnamesMatching("Толстой", "Толстая"), true);
	});
	test("should match compound hyphenated surnames across genders", () => {
		assert.equal(areSurnamesMatching("Петров-Водкин", "Петрова-Водкина"), true);
		assert.equal(areSurnamesMatching("Салтыков-Щедрин", "Салтыкова-Щедрина"), true);
		assert.equal(areSurnamesMatching("Мамин-Сибиряк", "Мамина-Сибиряк"), true);
	});
	test("should return false for different surnames", () => {
		assert.equal(areSurnamesMatching("Иванов", "Петров"), false);
		assert.equal(areSurnamesMatching("Сидоров", "Иванова"), false);
	});
});

describe("pairKey", () => {
	test("should create a stable key regardless of order", () => {
		assert.equal(pairKey("a", "b"), "a|b");
		assert.equal(pairKey("b", "a"), "a|b");
	});
	test("should handle UUIDs correctly", () => {
		const id1 = "123e4567-e89b-12d3-a456-426614174000";
		const id2 = "987e6543-e21b-34d3-a456-426614174000";
		assert.equal(pairKey(id1, id2), `${id1}|${id2}`);
		assert.equal(pairKey(id2, id1), `${id1}|${id2}`);
	});
});

describe("Fuzzy Metrics & Mistype Resilience", () => {
	test("convertQwertyMistype converts accidental English keyboard layout", () => {
		assert.equal(convertQwertyMistype("Bdfyjd"), "Иванов");
		assert.equal(convertQwertyMistype("Gtnhjd"), "Петров");
		assert.equal(convertQwertyMistype("Cbljhjd"), "Сидоров");
	});

	test("transliterateLatinToCyrillic handles passport transliteration", () => {
		assert.equal(transliterateLatinToCyrillic("Ivanov"), "Иванов");
		assert.equal(transliterateLatinToCyrillic("Shcherbakov"), "Щербаков");
		assert.equal(transliterateLatinToCyrillic("Chaikovskii"), "Чайковский");
	});

	test("damerauLevenshteinDistance correctly handles insertions, deletions, substitutions, and transpositions", () => {
		assert.equal(damerauLevenshteinDistance("иванов", "иванов"), 0);
		// Single typo
		assert.equal(damerauLevenshteinDistance("иванов", "ивонов"), 1);
		// Adjacent transposition
		assert.equal(damerauLevenshteinDistance("иванов", "иавнов"), 1);
		// Deletion
		assert.equal(damerauLevenshteinDistance("иванов", "ивано"), 1);
		// Insertion
		assert.equal(damerauLevenshteinDistance("иванов", "иваново"), 1);
	});

	test("stringLevenshteinSimilarity and nameFuzzySimilarity calculate normalized similarity ratio", () => {
		assert.equal(stringLevenshteinSimilarity("иванов", "иванов"), 1.0);
		const scoreTypo = stringLevenshteinSimilarity("иванов", "ивонов");
		assert.ok(scoreTypo > 0.8 && scoreTypo < 1.0);
		assert.equal(nameFuzzySimilarity("Иванов Иван", "Иван Иванов"), 1.0);
	});
});
