/**
 * moneyArithmeticAndFormattingBehavior.test.ts
 *
 * Hand-derived behavioral and boundary tests for packages/shared/src/money.ts.
 * Every expected value was calculated on paper from the contract before running the
 * suite. Targets the real holes uncovered by mutation probing (baseline score 31%):
 *  - kopecksAdd / kopecksSub / kopecksMul / kopecksDiv sign, rounding, zero/NaN guards
 *  - assertIntegerKopecks bigint MAX_SAFE_INTEGER / MIN_SAFE_INTEGER bounds
 *  - moneyRubSchema / positiveMoneyRubSchema / nonNegativeMoneyRubSchema 0 and 0.005 edges
 *  - rublesToKopecks IEEE-754 half-cent cases (19.99 * 100 = 1998.9999999999998)
 *  - formatKopecksToRubles / kopecksToRubles rounding & bigint support
 *  - multiplyKopecksFractional(unit, 0), percentageOfKopecks(amt, 0), calculatePercentDiscountKopecks
 *  - formatDiscountPercent rounding half-bp, calculateKopecksSharePercent(0, 100) & decimals=4
 *  - splitKopecks(total, 0) rejection, negative splits
 *  - formatKopecksRu / formatKopecksToRub / formatCurrency(0) without spurious minus sign
 *  - allocateGlobalDiscountCents: empty, cap at 100%, proportional math, Hamilton-Hare tie-breakers
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	addKopecks,
	allocateGlobalDiscountCents,
	assertIntegerKopecks,
	basisPointsFromPercent,
	calculateKopecksSharePercent,
	calculatePercentDiscountKopecks,
	formatCurrency,
	formatDiscountPercent,
	formatKopecksRu,
	formatKopecksToRub,
	formatKopecksToRubles,
	kopecksAdd,
	kopecksDiv,
	kopecksMul,
	kopecksSub,
	kopecksToNumericString,
	kopecksToRubles,
	kopecksToWholeRubles,
	moneyRubSchema,
	multiplyKopecks,
	multiplyKopecksFractional,
	nonNegativeMoneyRubSchema,
	parseKopecks,
	percentageOfKopecks,
	positiveMoneyRubSchema,
	RU_MONEY_MINUS,
	RU_MONEY_NBSP,
	rublesToKopecks,
	splitKopecks,
	sumKopecks,
	toExactKopecks,
} from "../money.js";

describe("money.ts Zod schemas: exact kopeck precision and zero boundaries", () => {
	it("moneyRubSchema accepts 19.99 (where 19.99 * 100 = 1998.9999999999998) and rejects 3 decimals", () => {
		// 19.99 * 100 = 1998.9999999999998 -> Math.round gives 1999 (diff < 1e-6), Math.floor gives 1998 (diff ~1!)
		assert.equal(moneyRubSchema.safeParse(19.99).success, true);
		assert.equal(moneyRubSchema.safeParse(0.29).success, true);
		assert.equal(moneyRubSchema.safeParse(1500.5).success, true);
		assert.equal(moneyRubSchema.safeParse(-10.05).success, true);
		assert.equal(moneyRubSchema.safeParse(10.001).success, false);
		assert.equal(moneyRubSchema.safeParse(10.005).success, false);
		assert.equal(moneyRubSchema.safeParse(Number.NaN).success, false);
		assert.equal(moneyRubSchema.safeParse(Number.POSITIVE_INFINITY).success, false);
	});

	it("nonNegativeMoneyRubSchema accepts exactly 0 and rejects -0.01; positiveMoneyRubSchema rejects 0", () => {
		assert.equal(nonNegativeMoneyRubSchema.safeParse(0).success, true);
		assert.equal(nonNegativeMoneyRubSchema.safeParse(0.01).success, true);
		assert.equal(nonNegativeMoneyRubSchema.safeParse(-0.01).success, false);

		assert.equal(positiveMoneyRubSchema.safeParse(0).success, false);
		assert.equal(positiveMoneyRubSchema.safeParse(-1).success, false);
		assert.equal(positiveMoneyRubSchema.safeParse(0.01).success, true);
	});
});

describe("money.ts integer kopecks arithmetic and safe-integer bounds", () => {
	it("assertIntegerKopecks rejects bigint beyond MAX_SAFE_INTEGER or below MIN_SAFE_INTEGER", () => {
		const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
		const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
		assert.doesNotThrow(() => assertIntegerKopecks(maxSafe));
		assert.doesNotThrow(() => assertIntegerKopecks(minSafe));
		assert.throws(() => assertIntegerKopecks(maxSafe + 1n), /безопасного диапазона/);
		assert.throws(() => assertIntegerKopecks(minSafe - 1n), /безопасного диапазона/);
		assert.throws(() => assertIntegerKopecks(12.5), /целым числом/);
		assert.throws(() => assertIntegerKopecks(Number.POSITIVE_INFINITY), /целым числом/);
	});

	it("kopecksAdd / addKopecks / kopecksSub perform exact signed addition and subtraction", () => {
		assert.equal(kopecksAdd(toExactKopecks(1500), toExactKopecks(250)), 1750);
		assert.equal(addKopecks(toExactKopecks(1500), toExactKopecks(-250)), 1250);
		assert.equal(kopecksSub(toExactKopecks(1500), toExactKopecks(250)), 1250);
		assert.equal(kopecksSub(toExactKopecks(100), toExactKopecks(400)), -300);
		assert.equal(sumKopecks([toExactKopecks(100), toExactKopecks(250), toExactKopecks(-50)]), 300);
	});

	it("kopecksMul multiplies and rounds; kopecksDiv divides, rounds, and rejects 0 / NaN / Infinity", () => {
		assert.equal(kopecksMul(toExactKopecks(1000), 1.5), 1500);
		assert.equal(kopecksMul(toExactKopecks(100), 0.155), 16);
		assert.throws(() => kopecksMul(toExactKopecks(100), Number.NaN));
		assert.throws(() => kopecksMul(toExactKopecks(100), Number.POSITIVE_INFINITY));

		assert.equal(kopecksDiv(toExactKopecks(1000), 4), 250);
		assert.equal(kopecksDiv(toExactKopecks(100), 3), 33);
		assert.equal(kopecksDiv(toExactKopecks(200), 3), 67);
		assert.throws(() => kopecksDiv(toExactKopecks(100), 0));
		assert.throws(() => kopecksDiv(toExactKopecks(100), Number.NaN));
		assert.throws(() => kopecksDiv(toExactKopecks(100), Number.POSITIVE_INFINITY));
	});

	it("rublesToKopecks and kopecksToRubles preserve exact cents without floor-truncation loss", () => {
		// 19.99 * 100 = 1998.9999999999998 -> must round to 1999, NOT floor to 1998!
		assert.equal(rublesToKopecks(19.99), 1999);
		assert.equal(rublesToKopecks(0.29), 29);
		assert.equal(rublesToKopecks(1234.56), 123456);
		assert.throws(() => rublesToKopecks(Number.NaN));

		assert.equal(kopecksToRubles(1999), 19.99);
		assert.equal(kopecksToRubles(1999n), 19.99);
		assert.equal(kopecksToRubles(1999.6), 20);
		assert.equal(kopecksToRubles(Number.NaN), 0);

		assert.equal(formatKopecksToRubles(1999.6), "20.00");
		assert.equal(formatKopecksToRubles(15050n), "150.50");
		assert.equal(formatKopecksToRubles(Number.NaN), "0.00");

		assert.equal(kopecksToNumericString(toExactKopecks(-1505)), "-15.05");
		assert.equal(kopecksToWholeRubles(toExactKopecks(5000)), 50);
		assert.throws(() => kopecksToWholeRubles(toExactKopecks(5001)));
		assert.equal(parseKopecks("19.99"), 1999);
		assert.equal(parseKopecks("-0.5"), -50);
	});
});

describe("money.ts quantities, percentages, margins, and splits", () => {
	it("multiplyKopecks and multiplyKopecksFractional allow quantity=0 and reject negative", () => {
		assert.equal(multiplyKopecks(toExactKopecks(500), 0), 0);
		assert.equal(multiplyKopecks(toExactKopecks(500), 3), 1500);
		assert.throws(() => multiplyKopecks(toExactKopecks(500), -1));

		assert.equal(multiplyKopecksFractional(toExactKopecks(500), 0), 0);
		assert.equal(multiplyKopecksFractional(toExactKopecks(333), 1.5), 500);
		assert.throws(() => multiplyKopecksFractional(toExactKopecks(500), -0.1));
		assert.throws(() => multiplyKopecksFractional(toExactKopecks(500), Number.POSITIVE_INFINITY));
	});

	it("percentageOfKopecks, basisPointsFromPercent, calculatePercentDiscountKopecks, formatDiscountPercent", () => {
		assert.equal(percentageOfKopecks(toExactKopecks(10000), 0), 0);
		assert.equal(percentageOfKopecks(toExactKopecks(10000), 1500), 1500);
		assert.throws(() => percentageOfKopecks(toExactKopecks(10000), -1));
		assert.throws(() => percentageOfKopecks(toExactKopecks(10000), 12.5));

		assert.equal(basisPointsFromPercent(15.5), 1550);
		assert.equal(basisPointsFromPercent(-5), 0);

		assert.equal(calculatePercentDiscountKopecks(0, 15), 0);
		assert.equal(calculatePercentDiscountKopecks(-100, 15), 0);
		assert.equal(calculatePercentDiscountKopecks(10000, 0), 0);
		assert.equal(calculatePercentDiscountKopecks(10000n, 15), 1500);
		assert.equal(calculatePercentDiscountKopecks(10000, 150), 10000); // clamped at 100%

		// 1/3 = 33.333...% -> 3333 bp; 2/3 = 66.666...% -> Math.round = 6667 bp ("66.67"), Math.floor would give "66.66"
		assert.equal(formatDiscountPercent(300, 200), "66.67");
		assert.equal(formatDiscountPercent(300n, 100n), "33.33");
		assert.equal(formatDiscountPercent(0, 100), "0.00");
	});

	it("calculateKopecksSharePercent handles decimals=4, zero numerator (no -0), and negative margin", () => {
		// 1/3 with 4 decimals: 33.3333% (if decimals < 4 guard failed, would fallback to decimals=1 -> 33.3)
		assert.equal(calculateKopecksSharePercent(1, 3, 4), 33.3333);
		assert.equal(calculateKopecksSharePercent(1, 3, 5), 33.3); // >4 falls back to 1
		assert.equal(Object.is(calculateKopecksSharePercent(0, 100), 0), true);
		assert.equal(calculateKopecksSharePercent(-250, 1000, 1), -25);
		assert.equal(calculateKopecksSharePercent(50, 0), 0);
	});

	it("splitKopecks rejects parts <= 0 and preserves exact total for positive and negative amounts", () => {
		assert.throws(() => splitKopecks(toExactKopecks(1000), 0), /положительным/);
		assert.throws(() => splitKopecks(toExactKopecks(1000), -2), /положительным/);
		assert.deepEqual(splitKopecks(toExactKopecks(10000), 3), [3334, 3333, 3333]);
		assert.deepEqual(splitKopecks(toExactKopecks(-100), 3), [-34, -33, -33]);
	});
});

describe("money.ts Russian formatting: bigint support and zero/negative sign correctness", () => {
	it("formatKopecksRu and formatKopecksToRub work identically on number and bigint", () => {
		assert.equal(formatKopecksRu(toExactKopecks(150050)), `1${RU_MONEY_NBSP}500,50${RU_MONEY_NBSP}₽`);
		assert.equal(formatKopecksRu(150050n), `1${RU_MONEY_NBSP}500,50${RU_MONEY_NBSP}₽`);
		assert.equal(formatKopecksRu(toExactKopecks(0)), `0,00${RU_MONEY_NBSP}₽`);
		assert.equal(formatKopecksRu(toExactKopecks(-500)), `${RU_MONEY_MINUS}5,00${RU_MONEY_NBSP}₽`);

		assert.equal(formatKopecksToRub(150050n), `1${RU_MONEY_NBSP}500,50${RU_MONEY_NBSP}₽`);
		assert.equal(formatKopecksToRub(150050), `1${RU_MONEY_NBSP}500,50${RU_MONEY_NBSP}₽`);
		assert.equal(formatKopecksToRub(null), "0 ₽");
	});

	it("formatCurrency formats positive, negative, and zero whole rubles without putting minus on positive or zero", () => {
		assert.equal(formatCurrency(0), `0${RU_MONEY_NBSP}₽`);
		assert.equal(formatCurrency(1500), `1${RU_MONEY_NBSP}500${RU_MONEY_NBSP}₽`);
		assert.equal(formatCurrency(-1500), `${RU_MONEY_MINUS}1${RU_MONEY_NBSP}500${RU_MONEY_NBSP}₽`);
		assert.equal(formatCurrency(1500.5), `1${RU_MONEY_NBSP}500,50${RU_MONEY_NBSP}₽`);
		assert.equal(formatCurrency(null, "—"), "—");
	});
});

describe("allocateGlobalDiscountCents: Hamilton-Hare conservation, caps, and tie-breakers", () => {
	it("returns empty map for empty items and zero discounts for <= 0 discount", () => {
		assert.equal(allocateGlobalDiscountCents([], 500n).size, 0);
		const zeroRes = allocateGlobalDiscountCents([{ id: "a", amountCents: 1000n }], 0n);
		assert.equal(zeroRes.get("a"), 0n);
	});

	it("caps discount at 100% of total items (never produces negative item price)", () => {
		const items = [
			{ id: "a", amountCents: 300n },
			{ id: "b", amountCents: 700n },
		];
		// Exact 100% discount
		const exact = allocateGlobalDiscountCents(items, 1000n);
		assert.equal(exact.get("a"), 300n);
		assert.equal(exact.get("b"), 700n);

		// Over-100% discount must clamp to item totals
		const over = allocateGlobalDiscountCents(items, 2500n);
		assert.equal(over.get("a"), 300n);
		assert.equal(over.get("b"), 700n);
	});

	it("allocates proportional shares and distributes remainder kopecks by largest remainder then largest amount", () => {
		// Total = 300n, discount = 100n:
		// a (100n): 100*100/300 = 33 rem 100
		// b (200n): 100*200/300 = 66 rem 200 -> gets +1 => 67
		const res1 = allocateGlobalDiscountCents(
			[
				{ id: "a", amountCents: 100n },
				{ id: "b", amountCents: 200n },
			],
			100n,
		);
		assert.equal(res1.get("a"), 33n);
		assert.equal(res1.get("b"), 67n);

		// Tie on remainder: total = 400n, discount = 2n:
		// a (100n): 200/400 = 0 rem 200
		// b (300n): 600/400 = 1 rem 200 -> same remainder 200, larger amountCents (300 > 100) wins +1 => 2
		const res2 = allocateGlobalDiscountCents(
			[
				{ id: "a", amountCents: 100n },
				{ id: "b", amountCents: 300n },
			],
			2n,
		);
		assert.equal(res2.get("a"), 0n);
		assert.equal(res2.get("b"), 2n);

		// Exact division (remainder = 0n): must NOT add extra kopecks!
		const exactDiv = allocateGlobalDiscountCents(
			[
				{ id: "a", amountCents: 200n },
				{ id: "b", amountCents: 200n },
			],
			100n,
		);
		assert.equal(exactDiv.get("a"), 50n);
		assert.equal(exactDiv.get("b"), 50n);
	});
});
