import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	calculateLabFinancialSplit,
} from "../labMath";

describe("DentalLabOrderModal — VITA Shade Spectrum & 3-Zone Stratification", () => {
	test("VITA Classical содержит все 16 стандартных оттенков шкалы A1–D4", () => {
		assert.equal(VITA_CLASSICAL_SHADES.length, 16);
		const expected = [
			"A1", "A2", "A3", "A3.5", "A4",
			"B1", "B2", "B3", "B4",
			"C1", "C2", "C3", "C4",
			"D2", "D3", "D4",
		];
		assert.deepEqual([...VITA_CLASSICAL_SHADES], expected);
	});

	test("VITA Bleach содержит ультра-светлые оттенки BL1–BL4 и 0M1–0M3", () => {
		assert.ok(VITA_BLEACH_SHADES.includes("BL1"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL2"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL3"));
		assert.ok(VITA_BLEACH_SHADES.includes("BL4"));
		assert.ok(VITA_BLEACH_SHADES.includes("0M1"));
		assert.ok(VITA_BLEACH_SHADES.includes("0M2"));
		assert.ok(VITA_BLEACH_SHADES.includes("0M3"));
	});

	test("VITA 3D-Master содержит оттенки по группам светлоты 1..5 и хроматичности L/M/R", () => {
		assert.ok(VITA_3D_MASTER_SHADES.length >= 26);
		assert.ok(VITA_3D_MASTER_SHADES.includes("1M1"));
		assert.ok(VITA_3D_MASTER_SHADES.includes("2M2"));
		assert.ok(VITA_3D_MASTER_SHADES.includes("3L1.5"));
		assert.ok(VITA_3D_MASTER_SHADES.includes("4R2.5"));
		assert.ok(VITA_3D_MASTER_SHADES.includes("5M3"));
	});

	test("SHADE_SWATCH_MAP содержит цветовые образцы и границы для всех оттенков", () => {
		for (const shade of VITA_CLASSICAL_SHADES) {
			const swatch = SHADE_SWATCH_MAP[shade];
			assert.ok(swatch, `Образец цвета для ${shade} должен существовать`);
			assert.ok(swatch.bg.startsWith("#"), `Фон для ${shade} должен быть HEX цветом`);
			assert.ok(swatch.border.startsWith("#"), `Граница для ${shade} должна быть HEX цветом`);
		}
	});

	test("Шкала культи IPS Natural Die Material содержит градации ND1–ND9 с описаниями", () => {
		assert.equal(STUMP_NATURAL_DIE_SHADES.length, 9);
		const ids = STUMP_NATURAL_DIE_SHADES.map((s) => s.id);
		assert.deepEqual(ids, ["ND1", "ND2", "ND3", "ND4", "ND5", "ND6", "ND7", "ND8", "ND9"]);

		const nd1 = STUMP_NATURAL_DIE_SHADES.find((s) => s.id === "ND1");
		const nd9 = STUMP_NATURAL_DIE_SHADES.find((s) => s.id === "ND9");
		assert.ok(nd1?.name.includes("Отбеленная") || nd1?.name.includes("Ультра-светлая"));
		assert.ok(nd9?.name.includes("Металлическая") || nd9?.name.includes("титановый"));
	});
});

describe("DentalLabOrderModal — Financial Split & Penny-Drift Invariant", () => {
	test("calculateLabFinancialSplit 50/50 дает строго сбалансированную сумму копеек", () => {
		const totalRub = 15450.55;
		const split = calculateLabFinancialSplit(totalRub, 50);

		assert.equal(split.isBalanced, true);
		assert.equal(split.totalKopecks, 1545055);
		assert.equal(split.doctorKopecks, 772528);
		assert.equal(split.clinicKopecks, 772527);
		assert.equal(split.doctorAmountRub, 7725.28);
		assert.equal(split.clinicAmountRub, 7725.27);
	});

	test("calculateLabFinancialSplit 70/30 на суммах с нечетными копейками сохраняет инвариант баланса", () => {
		const totalRub = 23799.33;
		const split = calculateLabFinancialSplit(totalRub, 30);

		assert.equal(split.isBalanced, true);
		assert.equal(split.doctorKopecks, 713980);
		assert.equal(split.clinicKopecks, 1665953);
		assert.equal(split.doctorAmountRub, 7139.80);
		assert.equal(split.clinicAmountRub, 16659.53);
	});

	test("calculateLabFinancialSplit 100% на клинику и 0% на врача не удерживает денег из зарплаты", () => {
		const totalRub = 50000;
		const split = calculateLabFinancialSplit(totalRub, 0);

		assert.equal(split.isBalanced, true);
		assert.equal(split.doctorKopecks, 0);
		assert.equal(split.clinicKopecks, 5000000);
		assert.equal(split.doctorAmountRub, 0);
		assert.equal(split.clinicAmountRub, 50000);
	});
});
