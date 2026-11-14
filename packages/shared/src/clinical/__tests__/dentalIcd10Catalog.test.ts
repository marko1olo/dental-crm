import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DENTAL_ICD10_FULL_CATALOG,
	DENTAL_ICD10_RUBRICS_MAP,
	findDentalIcd10,
	isDentalIcd10Code,
	normalizeDentalIcd10Code,
	searchDentalIcd10Catalog,
} from "../dentalIcd10Catalog.js";

describe("Dental ICD-10 Full Catalog & Rare Codes Retention [PHR-04]", () => {
	it("contains all critical dental rubrics K00 through K14", () => {
		const rubricKeys = Object.keys(DENTAL_ICD10_RUBRICS_MAP);
		for (let i = 0; i <= 14; i++) {
			const expectedRubric = `K${String(i).padStart(2, "0")}`;
			assert.ok(rubricKeys.includes(expectedRubric), `Missing dental rubric ${expectedRubric}`);
		}
	});

	it("preserves rare dental codes without substitution (PHR-04)", () => {
		const rareCodes = [
			"K04.02", // Хронический пульпит
			"K05.21", // Острый периодонтит
			"K08.1",  // Потеря зубов вследствие несчастного случая
			"K10.2",  // Воспалительные заболевания челюстей / Альвеолит
			"K00.0",  // Адентия
			"K01.1",  // Ретенированные зубы
			"K09.0",  // Одонтогенные кисты
		];

		for (const code of rareCodes) {
			assert.ok(isDentalIcd10Code(code), `Code ${code} must be recognized as valid dental ICD-10`);
			const entry = findDentalIcd10(code);
			assert.ok(entry, `Entry for ${code} must exist in the catalog`);
			assert.strictEqual(entry?.code, code, `Entry code must strictly match ${code}`);
		}
	});

	it("normalizes Cyrillic letters to Latin in ICD codes", () => {
		// Russian 'К' (Cyrillic \u041A) to Latin 'K'
		const cyrillicCode = "К04.02";
		const normalized = normalizeDentalIcd10Code(cyrillicCode);
		assert.strictEqual(normalized, "K04.02");
		assert.strictEqual(normalized.charCodeAt(0), 0x4b); // Latin K
	});

	it("searches catalog accurately by code and Russian keywords", () => {
		const resultsByCode = searchDentalIcd10Catalog("K04.02");
		assert.ok(resultsByCode.length > 0);
		assert.strictEqual(resultsByCode[0]?.code, "K04.02");

		const resultsByText = searchDentalIcd10Catalog("альвеолит");
		assert.ok(resultsByText.some((r) => r.code === "K10.3"));

		const resultsByOsteomyelitis = searchDentalIcd10Catalog("остеомиелит");
		assert.ok(resultsByOsteomyelitis.some((r) => r.code === "K10.2"));

		const resultsByRare = searchDentalIcd10Catalog("несчастного случая");
		assert.ok(resultsByRare.some((r) => r.code === "K08.1"));
	});
});
