/**
 * Icd10ClinicalValidator.test.ts — Модульные тесты клинической валидации МКБ-10 и формулы зубов FDI.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_VALID_FDI_TEETH,
	DENTAL_ICD10_RUBRICS,
	DETAILED_DENTAL_ICD10_TITLES,
	Icd10ClinicalValidator,
	TOOTH_SPECIFIC_RUBRICS,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "./Icd10ClinicalValidator.js";

describe("Icd10ClinicalValidator — Clinical Protocol & EMR Integrity", () => {
	describe("1. Code Normalization & Sanitization", () => {
		it("normalizes standard Latin ICD-10 codes", () => {
			assert.equal(Icd10ClinicalValidator.normalizeCode("k02.1"), "K02.1");
			assert.equal(Icd10ClinicalValidator.normalizeCode("  K04.0  "), "K04.0");
			assert.equal(Icd10ClinicalValidator.normalizeCode("K05.3"), "K05.3");
			assert.equal(Icd10ClinicalValidator.normalizeCode("k08.1"), "K08.1");
		});

		it("normalizes Cyrillic 'К' and 'к' to Latin 'K'", () => {
			// Русская заглавная К (U+041A) и строчная к (U+043A)
			assert.equal(Icd10ClinicalValidator.normalizeCode("К02.1"), "K02.1");
			assert.equal(Icd10ClinicalValidator.normalizeCode("к04.0"), "K04.0");
			assert.equal(Icd10ClinicalValidator.normalizeCode("К05.0"), "K05.0");
			assert.equal(Icd10ClinicalValidator.normalizeCode("к08.1"), "K08.1");
		});

		it("inserts dot for compact 4-character codes", () => {
			assert.equal(Icd10ClinicalValidator.normalizeCode("K021"), "K02.1");
			assert.equal(Icd10ClinicalValidator.normalizeCode("k040"), "K04.0");
			assert.equal(Icd10ClinicalValidator.normalizeCode("К051"), "K05.1");
			assert.equal(Icd10ClinicalValidator.normalizeCode("K0402"), "K04.02");
		});

		it("handles empty or non-string values gracefully", () => {
			assert.equal(Icd10ClinicalValidator.normalizeCode(""), "");
			assert.equal(Icd10ClinicalValidator.normalizeCode("   "), "");
			assert.equal(Icd10ClinicalValidator.normalizeCode(null), "");
			assert.equal(Icd10ClinicalValidator.normalizeCode(undefined), "");
		});
	});

	describe("2. Dental ICD-10 Section Verification (K00–K14)", () => {
		it("accepts all valid dental rubrics from K00 to K14", () => {
			const validCodes = [
				"K00.0", // Адентия
				"K01.1", // Ретенированный зуб
				"K02.0", // Кариес эмали
				"K02.1", // Кариес дентина
				"K02.2", // Кариес цемента
				"K03.0", // Патологическая стираемость
				"K03.1", // Клиновидный дефект
				"K04.0", // Пульпит
				"K04.02", // Гнойный пульпит
				"K04.4", // Острый апикальный периодонтит
				"K04.5", // Хронический апикальный периодонтит
				"K04.6", // Периапикальный абсцесс со свищом
				"K04.7", // Периапикальный абсцесс без свища
				"K05.0", // Острый гингивит
				"K05.1", // Хронический гингивит
				"K05.2", // Пародонтит острый
				"K05.3", // Пародонтит хронический
				"K05.4", // Пародонтоз
				"K06.0", // Рецессия десны
				"K07.2", // Аномалии прикуса
				"K07.6", // Синдром ВНЧС
				"K08.1", // Потеря зубов (адентия)
				"K09.0", // Одонтогенная киста
				"K10.2", // Периостит челюсти
				"K10.3", // Альвеолит
				"K11.5", // Слюннокаменная болезнь
				"K12.0", // Афтозный стоматит
				"K13.0", // Хейлит
				"K14.0", // Глоссит
			];

			for (const code of validCodes) {
				assert.equal(
					Icd10ClinicalValidator.isDentalIcd10(code),
					true,
					`Код ${code} должен быть признан стоматологическим`,
				);
			}
		});

		it("rejects non-dental and invalid ICD-10 codes", () => {
			const nonDentalCodes = [
				"J00", // ОРВИ
				"I10", // Гипертония
				"M54.5", // Люмбаго
				"Z01.2", // Стоматологический осмотр (Z-класс)
				"A00", // Холера
				"K25.0", // Язва желудка (не K00-K14)
				"K99",
				"INVALID",
				"12345",
				"K",
			];

			for (const code of nonDentalCodes) {
				assert.equal(
					Icd10ClinicalValidator.isDentalIcd10(code),
					false,
					`Код ${code} НЕ должен быть признан стоматологическим`,
				);
			}
		});
	});

	describe("3. Tooth-Specific Diagnosis Recognition (K02, K04, K05)", () => {
		it("identifies K02, K04, K05 as tooth-specific", () => {
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K02.0"), true);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K02.1"), true);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K04.0"), true);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K04.5"), true);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K04.7"), true);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K05.1"), true);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K05.3"), true);
		});

		it("identifies non-tooth-specific diagnoses correctly", () => {
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K08.1"), false);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K00.0"), false);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K07.2"), false);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K10.3"), false);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K12.0"), false);
			assert.equal(Icd10ClinicalValidator.isToothSpecificDiagnosis("K14.0"), false);
		});
	});

	describe("4. FDI Tooth Number Validation (11-48, 51-85)", () => {
		it("validates all 32 permanent teeth (11-18, 21-28, 31-38, 41-48)", () => {
			assert.equal(VALID_FDI_PERMANENT_TEETH.size, 32);
			for (const t of VALID_FDI_PERMANENT_TEETH) {
				assert.equal(Icd10ClinicalValidator.isValidFdiTooth(t), true);
			}
		});

		it("validates all 20 primary/deciduous teeth (51-55, 61-65, 71-75, 81-85)", () => {
			assert.equal(VALID_FDI_PRIMARY_TEETH.size, 20);
			for (const t of VALID_FDI_PRIMARY_TEETH) {
				assert.equal(Icd10ClinicalValidator.isValidFdiTooth(t), true);
			}
		});

		it("rejects non-existent FDI numbers", () => {
			const invalidTeeth = [
				0, 10, 19, 20, 29, 30, 39, 40, 49, 50, 56, 60, 66, 70, 76, 80, 86, 90, 99, 100, -1,
			];
			for (const t of invalidTeeth) {
				assert.equal(
					Icd10ClinicalValidator.isValidFdiTooth(t),
					false,
					`Зуб ${t} должен быть невалидным по FDI`,
				);
			}
		});

		it("parses diverse tooth notations correctly", () => {
			// Одиночный зуб
			const res1 = Icd10ClinicalValidator.parseAndValidateTeeth("36");
			assert.equal(res1.isValid, true);
			assert.deepEqual(res1.teeth, [36]);

			// Числовой ввод
			const res2 = Icd10ClinicalValidator.parseAndValidateTeeth(16);
			assert.equal(res2.isValid, true);
			assert.deepEqual(res2.teeth, [16]);

			// Молочный зуб
			const res3 = Icd10ClinicalValidator.parseAndValidateTeeth("55");
			assert.equal(res3.isValid, true);
			assert.deepEqual(res3.teeth, [55]);

			// Список через запятую
			const res4 = Icd10ClinicalValidator.parseAndValidateTeeth("16, 17, 26");
			assert.equal(res4.isValid, true);
			assert.deepEqual(res4.teeth, [16, 17, 26]);

			// Диапазон в квадранте
			const res5 = Icd10ClinicalValidator.parseAndValidateTeeth("11-13");
			assert.equal(res5.isValid, true);
			assert.deepEqual(res5.teeth, [11, 12, 13]);

			// Префикс "зуб", "зубы"
			const res6 = Icd10ClinicalValidator.parseAndValidateTeeth("зуб 46");
			assert.equal(res6.isValid, true);
			assert.deepEqual(res6.teeth, [46]);

			// Формат с точкой "1.6"
			const res7 = Icd10ClinicalValidator.parseAndValidateTeeth("1.6");
			assert.equal(res7.isValid, true);
			assert.deepEqual(res7.teeth, [16]);
		});

		it("detects invalid tooth tokens", () => {
			const res = Icd10ClinicalValidator.parseAndValidateTeeth("16, 99, abc");
			assert.equal(res.isValid, false);
			assert.ok(res.invalidTokens.includes("99"));
			assert.ok(res.invalidTokens.includes("abc"));
		});
	});

	describe("5. Comprehensive Clinical Validation Ceremony", () => {
		it("fails with Icd10Required when diagnosis code is missing", () => {
			const res1 = Icd10ClinicalValidator.validate("");
			assert.equal(res1.isValid, false);
			if (!res1.isValid) {
				assert.equal(res1.errorCode, "Icd10Required");
				assert.match(res1.errorMessage, /укажите код диагноза по МКБ-10/i);
			}

			const res2 = Icd10ClinicalValidator.validate(null);
			assert.equal(res2.isValid, false);
			if (!res2.isValid) {
				assert.equal(res2.errorCode, "Icd10Required");
			}
		});

		it("fails with Icd10Invalid when code is outside K00-K14", () => {
			const res = Icd10ClinicalValidator.validate("J06.9", "16");
			assert.equal(res.isValid, false);
			if (!res.isValid) {
				assert.equal(res.errorCode, "Icd10Invalid");
				assert.match(res.errorMessage, /стоматологический раздел МКБ-10/i);
			}
		});

		it("fails with ToothRequired when tooth is missing for K02 (Caries)", () => {
			const res = Icd10ClinicalValidator.validate("K02.1", "");
			assert.equal(res.isValid, false);
			if (!res.isValid) {
				assert.equal(res.errorCode, "ToothRequired");
				assert.match(res.errorMessage, /обязательно укажите номер зуба/i);
			}
		});

		it("fails with ToothRequired when tooth is missing for K04 (Pulpitis / Periodontitis)", () => {
			const res = Icd10ClinicalValidator.validate("K04.0", null);
			assert.equal(res.isValid, false);
			if (!res.isValid) {
				assert.equal(res.errorCode, "ToothRequired");
				assert.match(res.errorMessage, /FDI/i);
			}
		});

		it("fails with ToothRequired when tooth is missing for K05 (Gingivitis / Periodontitis)", () => {
			const res = Icd10ClinicalValidator.validate("K05.1", undefined);
			assert.equal(res.isValid, false);
			if (!res.isValid) {
				assert.equal(res.errorCode, "ToothRequired");
			}
		});

		it("fails with ToothInvalid when tooth number is invalid for tooth-specific diagnosis", () => {
			const res = Icd10ClinicalValidator.validate("K02.1", "99");
			assert.equal(res.isValid, false);
			if (!res.isValid) {
				assert.equal(res.errorCode, "ToothInvalid");
				assert.match(res.errorMessage, /недопустимый номер зуба/i);
			}
		});

		it("succeeds for tooth-specific diagnosis with valid FDI tooth", () => {
			const res1 = Icd10ClinicalValidator.validate("K02.1", "36");
			assert.equal(res1.isValid, true);
			if (res1.isValid) {
				assert.equal(res1.normalizedCode, "K02.1");
				assert.equal(res1.baseRubric, "K02");
				assert.equal(res1.isToothSpecific, true);
				assert.deepEqual(res1.parsedTeeth, [36]);
			}

			const res2 = Icd10ClinicalValidator.validate("К04.0", "16");
			assert.equal(res2.isValid, true);
			if (res2.isValid) {
				assert.equal(res2.normalizedCode, "K04.0");
				assert.deepEqual(res2.parsedTeeth, [16]);
			}

			const res3 = Icd10ClinicalValidator.validate("K05.3", "41, 42, 43");
			assert.equal(res3.isValid, true);
			if (res3.isValid) {
				assert.equal(res3.normalizedCode, "K05.3");
				assert.deepEqual(res3.parsedTeeth, [41, 42, 43]);
			}
		});

		it("succeeds for non-tooth-specific diagnosis without tooth (e.g. K08.1, K07.2, K12.0)", () => {
			const res1 = Icd10ClinicalValidator.validate("K08.1");
			assert.equal(res1.isValid, true);
			if (res1.isValid) {
				assert.equal(res1.normalizedCode, "K08.1");
				assert.equal(res1.isToothSpecific, false);
				assert.deepEqual(res1.parsedTeeth, []);
			}

			const res2 = Icd10ClinicalValidator.validate("K12.0", "");
			assert.equal(res2.isValid, true);
			if (res2.isValid) {
				assert.equal(res2.normalizedCode, "K12.0");
				assert.equal(res2.isToothSpecific, false);
			}
		});

		it("validates tooth number if provided even for non-tooth-specific diagnosis", () => {
			// Валидный зуб при адентии K08.1 — проходит
			const resOk = Icd10ClinicalValidator.validate("K08.1", "36");
			assert.equal(resOk.isValid, true);
			if (resOk.isValid) {
				assert.deepEqual(resOk.parsedTeeth, [36]);
			}

			// Невалидный зуб при K08.1 — отклоняется
			const resBad = Icd10ClinicalValidator.validate("K08.1", "19");
			assert.equal(resBad.isValid, false);
			if (!resBad.isValid) {
				assert.equal(resBad.errorCode, "ToothInvalid");
			}
		});
	});
});
