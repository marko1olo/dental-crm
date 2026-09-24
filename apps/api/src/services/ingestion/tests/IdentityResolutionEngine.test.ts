import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	IdentityResolutionEngine,
	patientIdentityRecordSchema,
} from "../IdentityResolutionEngine.js";

describe("IdentityResolutionEngine - levenshteinDistance", () => {
	it("should return 0 for identical strings", () => {
		assert.equal(
			IdentityResolutionEngine.levenshteinDistance("hello", "hello"),
			0,
		);
		assert.equal(
			IdentityResolutionEngine.levenshteinDistance(
				"Иванов Иван",
				"Иванов Иван",
			),
			0,
		);
	});

	it("should return 0 for two empty strings", () => {
		assert.equal(IdentityResolutionEngine.levenshteinDistance("", ""), 0);
	});

	it("should return length of the other string if one is empty", () => {
		assert.equal(IdentityResolutionEngine.levenshteinDistance("", "hello"), 5);
		assert.equal(IdentityResolutionEngine.levenshteinDistance("hello", ""), 5);
		assert.equal(IdentityResolutionEngine.levenshteinDistance("", "Иванов"), 6);
		assert.equal(IdentityResolutionEngine.levenshteinDistance("Иванов", ""), 6);
	});

	it("should calculate correct distance for substitutions", () => {
		assert.equal(
			IdentityResolutionEngine.levenshteinDistance("hello", "hallo"),
			1,
		);
		assert.equal(
			IdentityResolutionEngine.levenshteinDistance("Иванов", "Иванова"),
			1,
		);
		assert.equal(
			IdentityResolutionEngine.levenshteinDistance("kitten", "sitten"),
			1,
		);
		assert.equal(
			IdentityResolutionEngine.levenshteinDistance("kitten", "sittin"),
			2,
		);
	});
});

describe("IdentityResolutionEngine - Phone and Date Normalization", () => {
	it("normalizes phone numbers to Russian E.164 (+7...)", () => {
		assert.equal(
			IdentityResolutionEngine.normalizePhone("8 (999) 123-45-67"),
			"+79991234567",
		);
		assert.equal(
			IdentityResolutionEngine.normalizePhone("+7 999 123 45 67"),
			"+79991234567",
		);
		assert.equal(
			IdentityResolutionEngine.normalizePhone("9991234567"),
			"+79991234567",
		);
	});

	it("rejects invalid, short, empty, or non-digit phones without producing fake '+'", () => {
		assert.equal(IdentityResolutionEngine.normalizePhone(""), null);
		assert.equal(IdentityResolutionEngine.normalizePhone("   "), null);
		assert.equal(IdentityResolutionEngine.normalizePhone("invalid"), null);
		assert.equal(IdentityResolutionEngine.normalizePhone("N/A"), null);
		assert.equal(IdentityResolutionEngine.normalizePhone("123"), null);
	});

	it("normalizes birth dates across Russian formats to ISO YYYY-MM-DD", () => {
		assert.equal(
			IdentityResolutionEngine.normalizeBirthDate("15.05.1985"),
			"1985-05-15",
		);
		assert.equal(
			IdentityResolutionEngine.normalizeBirthDate("15/05/1985"),
			"1985-05-15",
		);
		assert.equal(
			IdentityResolutionEngine.normalizeBirthDate("1985-05-15"),
			"1985-05-15",
		);
		assert.equal(IdentityResolutionEngine.normalizeBirthDate(""), null);
		assert.equal(IdentityResolutionEngine.normalizeBirthDate("not-a-date"), null);
	});
});

describe("IdentityResolutionEngine - Confidence Scoring and Resolution", () => {
	it("matches identical patients with high confidence and AUTO_MERGE", () => {
		const incoming = {
			fullName: "Иванов Иван Иванович",
			phone: "+7 (999) 111-22-33",
			birthDate: "15.05.1985",
		};
		const existing = {
			fullName: "иванов иван иванович",
			phone: "89991112233",
			birthDate: "1985-05-15",
		};

		const result = IdentityResolutionEngine.evaluateMatch(incoming, existing);
		assert.ok(result.confidence >= 0.85);
		assert.equal(result.action, "AUTO_MERGE");
		assert.equal(result.breakdown.phoneMatch, true);
		assert.equal(result.breakdown.birthDateMatch, true);
	});

	it("does not match two records that only have invalid/empty phones", () => {
		const incoming = {
			fullName: "Смирнов Алексей",
			phone: "invalid",
			birthDate: "10.10.1990",
		};
		const existing = {
			fullName: "Кузнецов Петр",
			phone: "none",
			birthDate: "12.12.1980",
		};

		const result = IdentityResolutionEngine.evaluateMatch(incoming, existing);
		assert.equal(result.breakdown.phoneMatch, null);
		assert.equal(result.action, "CREATE_NEW");
		assert.ok(result.confidence < 0.3);
	});

	it("statutory federal SNILS exact match immediately triggers AUTO_MERGE", () => {
		const incoming = {
			fullName: "Сидорова Анна",
			snils: "123-456-789 01",
		};
		const existing = {
			fullName: "Сидорова А. В.",
			snils: "12345678901",
		};

		const result = IdentityResolutionEngine.evaluateMatch(incoming, existing);
		assert.equal(result.confidence, 0.99);
		assert.equal(result.action, "AUTO_MERGE");
		assert.equal(result.breakdown.snilsMatch, true);
	});

	it("statutory Passport series+number exact match triggers AUTO_MERGE", () => {
		const incoming = {
			fullName: "Петров Василий",
			passport: "45 10 123456",
		};
		const existing = {
			fullName: "Петров В. М.",
			passport: "4510123456",
		};

		const result = IdentityResolutionEngine.evaluateMatch(incoming, existing);
		assert.equal(result.confidence, 0.98);
		assert.equal(result.action, "AUTO_MERGE");
		assert.equal(result.breakdown.passportMatch, true);
	});

	it("validates input patient identity record schema with Zod", () => {
		const valid = patientIdentityRecordSchema.safeParse({
			fullName: "Соколов Дмитрий",
			phone: "+79998887766",
			birthDate: "1992-04-12",
			snils: "12345678901",
		});
		assert.equal(valid.success, true);

		const invalid = patientIdentityRecordSchema.safeParse({
			fullName: "   ",
		});
		assert.equal(invalid.success, false);
	});
});
