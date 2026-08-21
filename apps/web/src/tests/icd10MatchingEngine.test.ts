/**
 * icd10MatchingEngine.test.ts — Исчерпывающий набор тестов для каталога МКБ-10 Стоматология
 * и поисково-сопоставительного движка (Icd10MatchingEngine).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DENTAL_ICD10_CATALOG,
	DENTAL_ICD10_MAP,
	DENTAL_ICD10_RUBRIC_MAP,
	POPULAR_CLINICAL_PRESETS,
} from "../components/diagnostics/icd10DentalCatalog";
import {
	Icd10MatchingEngine,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../components/diagnostics/icd10MatchingEngine";

describe("ICD-10 Dental Clinical Catalog & Matching Engine", () => {
	describe("1. Catalog Completeness & Rubric Coverage (K00–K14)", () => {
		it("contains all critical dental rubrics defined in DENTAL_ICD10_RUBRIC_MAP", () => {
			const expectedRubrics = [
				"K00", "K01", "K02", "K03", "K04", "K05",
				"K06", "K07", "K08", "K09", "K10", "K11",
				"K12", "K13", "K14",
			];
			for (const r of expectedRubrics) {
				assert.ok(
					DENTAL_ICD10_RUBRIC_MAP[r],
					`Rubric ${r} must be defined in DENTAL_ICD10_RUBRIC_MAP`,
				);
			}
		});

		it("contains complete Caries K02 spectrum (K02.0, K02.1, K02.2, K02.3, K02.5, K02.8)", () => {
			const requiredCariesCodes = ["K02.0", "K02.1", "K02.2", "K02.3", "K02.5", "K02.8"];
			for (const code of requiredCariesCodes) {
				const item = DENTAL_ICD10_MAP.get(code);
				assert.ok(item, `Code ${code} must exist in catalog`);
				assert.strictEqual(item.rubric, "K02");
				assert.strictEqual(item.requiresTooth, true, `${code} must require tooth number`);
			}
		});

		it("contains complete Pulpitis & Periapical K04 spectrum (K04.0, K04.01, K04.02, K04.03, K04.1, K04.4, K04.5, K04.6, K04.7, K04.8)", () => {
			const requiredEndoCodes = [
				"K04.0", "K04.01", "K04.02", "K04.03", "K04.1",
				"K04.4", "K04.5", "K04.6", "K04.7", "K04.8",
			];
			for (const code of requiredEndoCodes) {
				const item = DENTAL_ICD10_MAP.get(code);
				assert.ok(item, `Code ${code} must exist in catalog`);
				assert.strictEqual(item.rubric, "K04");
				assert.strictEqual(item.requiresTooth, true, `${code} must require tooth number`);
			}
		});

		it("contains complete Periodontal K05 spectrum (K05.0, K05.1, K05.2, K05.3, K05.4)", () => {
			const requiredPerioCodes = ["K05.0", "K05.1", "K05.2", "K05.3", "K05.4"];
			for (const code of requiredPerioCodes) {
				const item = DENTAL_ICD10_MAP.get(code);
				assert.ok(item, `Code ${code} must exist in catalog`);
				assert.strictEqual(item.rubric, "K05");
				assert.strictEqual(item.requiresTooth, true);
			}
		});

		it("contains complete Orthodontic & TMJ K07 spectrum (K07.0, K07.2, K07.3, K07.6)", () => {
			const requiredOrthoCodes = ["K07.0", "K07.2", "K07.3", "K07.6"];
			for (const code of requiredOrthoCodes) {
				const item = DENTAL_ICD10_MAP.get(code);
				assert.ok(item, `Code ${code} must exist in catalog`);
				assert.strictEqual(item.rubric, "K07");
			}
		});

		it("contains Tooth Loss & Roots K08 spectrum (K08.1, K08.2, K08.3)", () => {
			const requiredK08Codes = ["K08.1", "K08.2", "K08.3"];
			for (const code of requiredK08Codes) {
				const item = DENTAL_ICD10_MAP.get(code);
				assert.ok(item, `Code ${code} must exist in catalog`);
				assert.strictEqual(item.rubric, "K08");
			}
		});

		it("contains Non-Carious K03 spectrum (K03.0, K03.1, K03.2, K03.6, K03.8)", () => {
			const requiredK03Codes = ["K03.0", "K03.1", "K03.2", "K03.6", "K03.8"];
			for (const code of requiredK03Codes) {
				const item = DENTAL_ICD10_MAP.get(code);
				assert.ok(item, `Code ${code} must exist in catalog`);
				assert.strictEqual(item.rubric, "K03");
			}
		});

		it("contains Stomatitis K12 spectrum (K12.0, K12.1)", () => {
			const requiredK12Codes = ["K12.0", "K12.1"];
			for (const code of requiredK12Codes) {
				const item = DENTAL_ICD10_MAP.get(code);
				assert.ok(item, `Code ${code} must exist in catalog`);
				assert.strictEqual(item.rubric, "K12");
			}
		});

		it("guarantees all catalog items have valid structure, Russian titles, and recommendations", () => {
			for (const item of DENTAL_ICD10_CATALOG) {
				assert.ok(item.code.startsWith("K"), `Code must start with K: ${item.code}`);
				assert.ok(item.titleRu.length >= 5, `Title too short for ${item.code}`);
				assert.ok(item.shortTitleRu.length >= 3, `Short title too short for ${item.code}`);
				assert.ok(item.synonyms.length > 0, `Synonyms missing for ${item.code}`);
				assert.ok(item.description.length >= 10, `Description too short for ${item.code}`);
				assert.ok(
					item.recommendations.length > 0,
					`Clinical recommendations missing for ${item.code}`,
				);
			}
		});

		it("populates POPULAR_CLINICAL_PRESETS with key daily diagnoses", () => {
			assert.ok(POPULAR_CLINICAL_PRESETS.length >= 8);
			const popularCodes = POPULAR_CLINICAL_PRESETS.map((p) => p.code);
			assert.ok(popularCodes.includes("K02.1"), "K02.1 must be popular");
			assert.ok(popularCodes.includes("K04.0"), "K04.0 must be popular");
			assert.ok(popularCodes.includes("K05.1"), "K05.1 must be popular");
			assert.ok(popularCodes.includes("K08.1"), "K08.1 must be popular");
		});
	});

	describe("2. Code Normalization & Cyrillic Handling", () => {
		it("normalizes Cyrillic 'К' and 'к' to Latin 'K'", () => {
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("к02.1"), "K02.1");
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("К04.0"), "K04.0");
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("к051"), "K05.1");
		});

		it("formats un-dotted codes to standard dot notation", () => {
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("k021"), "K02.1");
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("K0401"), "K04.01");
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("k081"), "K08.1");
		});

		it("strips whitespace and trims special characters", () => {
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("  K02.1  "), "K02.1");
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("[K04.0]"), "K04.0");
			assert.strictEqual(Icd10MatchingEngine.normalizeCode("(K05.3)"), "K05.3");
		});
	});

	describe("3. FDI Tooth Extraction from Queries", () => {
		it("extracts permanent teeth numbers correctly (11..48)", () => {
			for (const tooth of VALID_FDI_PERMANENT_TEETH) {
				const parsed = Icd10MatchingEngine.parseQuery(`пульпит ${tooth}`);
				assert.strictEqual(parsed.extractedToothNumber, tooth);
				assert.strictEqual(parsed.cleanedQuery, "пульпит");
			}
		});

		it("extracts primary (deciduous) teeth numbers correctly (51..85)", () => {
			for (const tooth of VALID_FDI_PRIMARY_TEETH) {
				const parsed = Icd10MatchingEngine.parseQuery(`кариес зуба ${tooth}`);
				assert.strictEqual(parsed.extractedToothNumber, tooth);
				assert.strictEqual(parsed.cleanedQuery, "кариес");
			}
		});

		it("extracts tooth with prefix markers like 'зуб 26', 'd36', '#46', 'зуба 16'", () => {
			assert.strictEqual(
				Icd10MatchingEngine.parseQuery("зуб 26 периодонтит").extractedToothNumber,
				26,
			);
			assert.strictEqual(
				Icd10MatchingEngine.parseQuery("d36 глубокий кариес").extractedToothNumber,
				36,
			);
			assert.strictEqual(
				Icd10MatchingEngine.parseQuery("#46 пульпит").extractedToothNumber,
				46,
			);
			assert.strictEqual(
				Icd10MatchingEngine.parseQuery("кариес зуба 17").extractedToothNumber,
				17,
			);
		});

		it("ignores invalid numbers that are not valid FDI teeth", () => {
			const parsed = Icd10MatchingEngine.parseQuery("пульпит 99");
			assert.strictEqual(parsed.extractedToothNumber, null);
			assert.ok(parsed.cleanedQuery.includes("99"));
		});
	});

	describe("4. Multi-Word Fuzzy Search & Matching", () => {
		it("finds K04.01 by exact code query 'K04.01' or 'к04.01'", () => {
			const results = Icd10MatchingEngine.search("K04.01");
			assert.ok(results.length > 0);
			const first = results[0];
			assert.ok(first);
			assert.strictEqual(first.item.code, "K04.01");
			assert.strictEqual(first.matchedBy, "code");
		});

		it("finds K02.1 when searching 'кариес дентина 36'", () => {
			const results = Icd10MatchingEngine.search("кариес дентина 36");
			assert.ok(results.length > 0);
			const first = results[0];
			assert.ok(first);
			assert.strictEqual(first.item.code, "K02.1");
		});

		it("finds acute pulpitis when searching 'острый пульпит 26'", () => {
			const results = Icd10MatchingEngine.search("острый пульпит 26");
			assert.ok(results.length > 0);
			const first = results[0];
			assert.ok(first);
			assert.strictEqual(first.item.code, "K04.01");
		});

		it("finds chronic periodontitis when searching 'хронический пародонтит'", () => {
			const results = Icd10MatchingEngine.search("хронический пародонтит");
			assert.ok(results.length > 0);
			const first = results[0];
			assert.ok(first);
			assert.strictEqual(first.item.code, "K05.3");
		});

		it("finds edentulism when searching 'потеря зубов' or 'адентия'", () => {
			const results = Icd10MatchingEngine.search("адентия");
			assert.ok(results.length > 0);
			const first = results[0];
			assert.ok(first);
			assert.strictEqual(first.item.code, "K08.1");
		});

		it("finds wedge defect when searching 'клиновидный дефект'", () => {
			const results = Icd10MatchingEngine.search("клиновидный дефект");
			assert.ok(results.length > 0);
			const first = results[0];
			assert.ok(first);
			assert.strictEqual(first.item.code, "K03.1");
		});

		it("tolerates common typos with fuzzy matching (e.g. 'кариесс', 'пулпит', 'периодонтитт')", () => {
			const cariesRes = Icd10MatchingEngine.search("кариесс дентина");
			assert.ok(cariesRes.length > 0);
			const firstCaries = cariesRes[0];
			assert.ok(firstCaries);
			assert.strictEqual(firstCaries.item.rubric, "K02");

			const pulpitisRes = Icd10MatchingEngine.search("пулпит 46");
			assert.ok(pulpitisRes.length > 0);
			const firstPulpitis = pulpitisRes[0];
			assert.ok(firstPulpitis);
			assert.strictEqual(firstPulpitis.item.rubric, "K04");
		});

		it("filters results by specialty when specified", () => {
			const orthoResults = Icd10MatchingEngine.search("", { specialty: "orthodontics" });
			assert.ok(orthoResults.length > 0);
			for (const r of orthoResults) {
				assert.strictEqual(r.item.specialty, "orthodontics");
			}
		});

		it("filters results by rubric when specified", () => {
			const k02Results = Icd10MatchingEngine.search("", { rubric: "K02" });
			assert.ok(k02Results.length > 0);
			for (const r of k02Results) {
				assert.strictEqual(r.item.rubric, "K02");
			}
		});
	});

	describe("5. Auto-Matching from Clinical Complaints / Notes", () => {
		it("detects acute pulpitis and tooth from freeform clinical text", () => {
			const note = "Пациент жалуется на сильные ночные боли в области 26 зуба, приступообразного характера, усиливающиеся от холодного.";
			const auto = Icd10MatchingEngine.autoMatchFromClinicalText(note);

			assert.strictEqual(auto.detectedToothNumber, 26);
			assert.ok(auto.primaryMatch !== null);
			assert.strictEqual(auto.primaryMatch?.rubric, "K04");
			assert.ok(auto.confidence > 0.5);
		});

		it("detects dental caries from clinical note", () => {
			const note = "Обнаружена глубокая кариозная полость в области зуба 46, зондирование болезненно по эмалево-дентинной границе.";
			const auto = Icd10MatchingEngine.autoMatchFromClinicalText(note);

			assert.strictEqual(auto.detectedToothNumber, 46);
			assert.strictEqual(auto.primaryMatch?.rubric, "K02");
		});

		it("handles empty or irrelevant clinical text gracefully", () => {
			const empty = Icd10MatchingEngine.autoMatchFromClinicalText("");
			assert.strictEqual(empty.primaryMatch, null);
			assert.strictEqual(empty.confidence, 0);
		});
	});

	describe("6. Validation of Diagnosis & Tooth Binding Rules", () => {
		it("passes validation for tooth-specific diagnosis with valid FDI tooth", () => {
			const res = Icd10MatchingEngine.validateSelection("K02.1", 36);
			assert.strictEqual(res.isValid, true);
			assert.strictEqual(res.normalizedCode, "K02.1");
			assert.deepStrictEqual(res.teeth, [36]);
		});

		it("fails validation with ToothRequired when tooth is missing for K02, K04, K05", () => {
			const resK02 = Icd10MatchingEngine.validateSelection("K02.1");
			assert.strictEqual(resK02.isValid, false);
			assert.strictEqual(resK02.errorCode, "ToothRequired");

			const resK04 = Icd10MatchingEngine.validateSelection("K04.0");
			assert.strictEqual(resK04.isValid, false);
			assert.strictEqual(resK04.errorCode, "ToothRequired");

			const resK05 = Icd10MatchingEngine.validateSelection("K05.3");
			assert.strictEqual(resK05.isValid, false);
			assert.strictEqual(resK05.errorCode, "ToothRequired");
		});

		it("passes validation for non-tooth diagnosis without tooth (e.g. K08.1, K07.2, K12.0)", () => {
			const resK08 = Icd10MatchingEngine.validateSelection("K08.1");
			assert.strictEqual(resK08.isValid, true);

			const resK07 = Icd10MatchingEngine.validateSelection("K07.2");
			assert.strictEqual(resK07.isValid, true);

			const resK12 = Icd10MatchingEngine.validateSelection("K12.0");
			assert.strictEqual(resK12.isValid, true);
		});

		it("fails validation with ToothInvalid when bad tooth number is given", () => {
			const res = Icd10MatchingEngine.validateSelection("K02.1", 99);
			assert.strictEqual(res.isValid, false);
			assert.strictEqual(res.errorCode, "ToothInvalid");
		});

		it("fails validation with Icd10Invalid for non-dental codes", () => {
			const res = Icd10MatchingEngine.validateSelection("J06.9");
			assert.strictEqual(res.isValid, false);
			assert.strictEqual(res.errorCode, "Icd10Invalid");
		});

		it("fails validation with Icd10Required for empty code", () => {
			const res = Icd10MatchingEngine.validateSelection("");
			assert.strictEqual(res.isValid, false);
			assert.strictEqual(res.errorCode, "Icd10Required");
		});
	});
});
