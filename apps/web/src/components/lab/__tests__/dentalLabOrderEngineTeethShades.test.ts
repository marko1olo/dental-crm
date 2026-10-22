import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	STUMP_NATURAL_DIE_SHADES,
	ENAMEL_TRANSLUCENCY_OPTIONS,
	VALID_FDI_TEETH,
	isValidFdiTooth,
	parseFdiTeethString,
	formatFdiTeethDisplay,
} from "../dentalLabOrderEngine";

describe("dentalLabOrderEngine — FDI Teeth & VITA Shades", () => {
	it("проверяет корректность номеров зубов взрослого прикуса", () => {
		assert.ok(isValidFdiTooth(11));
		assert.ok(isValidFdiTooth(16));
		assert.ok(isValidFdiTooth(24));
		assert.ok(isValidFdiTooth(36));
		assert.ok(isValidFdiTooth(48));

		assert.ok(!isValidFdiTooth(10));
		assert.ok(!isValidFdiTooth(19));
		assert.ok(!isValidFdiTooth(29));
		assert.ok(!isValidFdiTooth(99));
		assert.equal(VALID_FDI_TEETH.size, 32);
	});

	it("parseFdiTeethString парсит одиночные зубы, списки и диапазоны", () => {
		assert.deepEqual(parseFdiTeethString("16"), [16]);
		assert.deepEqual(parseFdiTeethString("1.6"), [16]);
		assert.deepEqual(parseFdiTeethString("1.6, 2.1"), [16, 21]);
		assert.deepEqual(parseFdiTeethString("11, 21, 22"), [11, 21, 22]);
		assert.deepEqual(parseFdiTeethString("46; 47 48"), [46, 47, 48]);
		assert.deepEqual(parseFdiTeethString("11, 11, 21"), [11, 21]);
		assert.deepEqual(parseFdiTeethString("не_зуб, 99"), []);
	});

	it("formatFdiTeethDisplay форматирует зубы для вывода в карточке", () => {
		assert.equal(formatFdiTeethDisplay([16]), "16");
		assert.equal(formatFdiTeethDisplay([11, 21]), "11, 21");
		assert.equal(formatFdiTeethDisplay([]), "—");
		assert.equal(formatFdiTeethDisplay("14, 15"), "14, 15");
	});

	it("содержит все 16 классических оттенков VITA A1–D4", () => {
		assert.equal(VITA_CLASSICAL_SHADES.length, 16);
		assert.ok(VITA_CLASSICAL_SHADES.includes("A1"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("A2"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("A3"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("A3.5"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("B1"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("C2"));
		assert.ok(VITA_CLASSICAL_SHADES.includes("D3"));
	});

	it("содержит ультрасветлые оттенки Bleach, прозрачность и культю ND1–ND9", () => {
		assert.ok(VITA_BLEACH_SHADES.includes("BL1"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL2"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL3"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL4"));
		assert.ok(VITA_BLEACH_SHADES.includes("0M1"));

		assert.equal(ENAMEL_TRANSLUCENCY_OPTIONS.length, 5);
		assert.ok(ENAMEL_TRANSLUCENCY_OPTIONS.some((t) => t.id === "HT"));
		assert.ok(ENAMEL_TRANSLUCENCY_OPTIONS.some((t) => t.id === "LT"));

		assert.equal(STUMP_NATURAL_DIE_SHADES.length, 9);
		assert.equal(STUMP_NATURAL_DIE_SHADES[0]?.id, "ND1");
		assert.equal(STUMP_NATURAL_DIE_SHADES[8]?.id, "ND9");
	});
});
