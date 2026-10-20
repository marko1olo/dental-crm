/**
 * toothGrammarSsot.test.ts — Верификационные тесты для SSOT парсера номеров зубов FDI и поверхностей
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_VALID_FDI_TEETH,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
	isValidFdiToothNumber,
	parseRussianSpokenToothNumber,
	extractFdiTeethNumbers,
	extractToothSurfaces,
} from "./toothGrammarSsot.js";

describe("toothGrammarSsot — SSOT зубной грамматики и поверхностей", () => {
	describe("1. FDI Tooth Classification & Validity", () => {
		it("contains exactly 32 permanent and 20 primary teeth (52 total)", () => {
			assert.equal(VALID_FDI_PERMANENT_TEETH.length, 32);
			assert.equal(VALID_FDI_PRIMARY_TEETH.length, 20);
			assert.equal(ALL_VALID_FDI_TEETH.length, 52);
		});

		it("validates FDI tooth numbers correctly", () => {
			assert.equal(isValidFdiToothNumber(11), true);
			assert.equal(isValidFdiToothNumber(16), true);
			assert.equal(isValidFdiToothNumber(28), true);
			assert.equal(isValidFdiToothNumber(37), true);
			assert.equal(isValidFdiToothNumber(48), true);
			assert.equal(isValidFdiToothNumber(55), true);
			assert.equal(isValidFdiToothNumber(85), true);
			assert.equal(isValidFdiToothNumber("46"), true);

			assert.equal(isValidFdiToothNumber(19), false);
			assert.equal(isValidFdiToothNumber(56), false);
			assert.equal(isValidFdiToothNumber(99), false);
			assert.equal(isValidFdiToothNumber(0), false);
			assert.equal(isValidFdiToothNumber(null), false);
			assert.equal(isValidFdiToothNumber(undefined), false);
			assert.equal(isValidFdiToothNumber("abc"), false);
		});
	});

	describe("2. Spoken Russian Tooth Number Parsing", () => {
		it("parses compound numbers ('сорок шесть' -> 46, 'двадцать один' -> 21)", () => {
			assert.equal(parseRussianSpokenToothNumber("зуб сорок шесть"), 46);
			assert.equal(parseRussianSpokenToothNumber("двадцать один"), 21);
			assert.equal(parseRussianSpokenToothNumber("сорок восемь"), 48);
			assert.equal(parseRussianSpokenToothNumber("тридцать пять"), 35);
		});

		it("parses teen numbers ('шестнадцать' -> 16, 'шестнадцатый зуб' -> 16)", () => {
			assert.equal(parseRussianSpokenToothNumber("шестнадцать"), 16);
			assert.equal(parseRussianSpokenToothNumber("шестнадцатый зуб"), 16);
			assert.equal(parseRussianSpokenToothNumber("одиннадцатый"), 11);
			assert.equal(parseRussianSpokenToothNumber("двенадцать"), 12);
		});

		it("parses anatomical descriptions ('нижний левый первый моляр' -> 36)", () => {
			assert.equal(parseRussianSpokenToothNumber("нижний левый первый моляр"), 36);
			assert.equal(parseRussianSpokenToothNumber("верхний правый клык"), 13);
			assert.equal(parseRussianSpokenToothNumber("верхняя челюсть справа шестерка"), 16);
			assert.equal(parseRussianSpokenToothNumber("нижняя челюсть слева единица"), 31);
			assert.equal(parseRussianSpokenToothNumber("нижний правый зуб мудрости"), 48);
		});

		it("parses primary teeth ('пятьдесят пять' -> 55, 'восемьдесят пять' -> 85)", () => {
			assert.equal(parseRussianSpokenToothNumber("пятьдесят пять"), 55);
			assert.equal(parseRussianSpokenToothNumber("восемьдесят пять"), 85);
		});

		it("parses digit-by-digit spoken numbers ('четыре семь' -> 47, 'три шесть' -> 36)", () => {
			assert.equal(parseRussianSpokenToothNumber("четыре семь"), 47);
			assert.equal(parseRussianSpokenToothNumber("три шесть"), 36);
		});

		it("parses direct digit markers ('зуб 46', '#21', 'd36', '№14')", () => {
			assert.equal(parseRussianSpokenToothNumber("зуб 46"), 46);
			assert.equal(parseRussianSpokenToothNumber("#21"), 21);
			assert.equal(parseRussianSpokenToothNumber("d36"), 36);
			assert.equal(parseRussianSpokenToothNumber("№14"), 14);
		});

		it("returns null for non-teeth numbers or invalid text", () => {
			assert.equal(parseRussianSpokenToothNumber("зуб 99"), null);
			assert.equal(parseRussianSpokenToothNumber("сорок девять"), null);
			assert.equal(parseRussianSpokenToothNumber(""), null);
		});
	});

	describe("3. Multi-Teeth Extraction (extractFdiTeethNumbers)", () => {
		it("extracts multiple teeth mentioned in a sentence preserving order", () => {
			const teeth = extractFdiTeethNumbers("сорок шесть и сорок семь кариес");
			assert.deepEqual(teeth, [46, 47]);
		});

		it("extracts teeth from combined formats", () => {
			const teeth = extractFdiTeethNumbers("зуб 46, также шестнадцать и #21");
			assert.ok(teeth.includes(46));
			assert.ok(teeth.includes(16));
			assert.ok(teeth.includes(21));
		});
	});

	describe("4. Tooth Surface Recognition (extractToothSurfaces)", () => {
		it("extracts MOD, MO, OD combos", () => {
			assert.deepEqual(extractToothSurfaces("полость mod"), ["M", "O", "D"]);
			assert.deepEqual(extractToothSurfaces("медиально-окклюзионная mo"), ["M", "O"]);
			assert.deepEqual(extractToothSurfaces("окклюзионно-дистальная od"), ["O", "D"]);
		});

		it("extracts individual surfaces", () => {
			const s = extractToothSurfaces("окклюзионная и вестибулярная поверхность, пришеечный кариес");
			assert.ok(s.includes("O"));
			assert.ok(s.includes("V"));

			const s2 = extractToothSurfaces("небная поверхность");
			assert.ok(s2.includes("P"));
		});
	});
});
