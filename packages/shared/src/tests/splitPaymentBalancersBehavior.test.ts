/**
 * splitPaymentBalancersBehavior.test.ts
 *
 * Expected values below were derived BY HAND from the documented contract of each
 * function (kopeck arithmetic on paper), never by running the implementation and
 * pasting its output. Each case exists because a mutation probe showed the
 * previous suite could not tell the correct code from a version with an inverted
 * condition or flipped sign in this exact spot.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	allocateSplitPaymentAcrossItems,
	autoAlignSplitRemainder,
	balanceSplitDepositPlusCard,
	balanceSplitTenderRemainder,
	type SplitPaymentPositionItem,
	type SplitPaymentTenderInput,
	type SplitTenderKind,
	validateAndBalanceSplitPayment,
} from "../billing/splitPayment.js";
import { rubToKopecks } from "../fiscal/kopecksArithmetic.js";

type KopeckKey =
	| "cashKopecks"
	| "cardKopecks"
	| "sbpKopecks"
	| "advanceDepositKopecks"
	| "familyDepositKopecks"
	| "creditKopecks"
	| "certificateOrBonusKopecks"
	| "dmsInsuranceKopecks";

const KEY_BY_KIND: Readonly<Record<SplitTenderKind, KopeckKey>> = {
	cash: "cashKopecks",
	card: "cardKopecks",
	sbp: "sbpKopecks",
	advance_deposit: "advanceDepositKopecks",
	family_deposit: "familyDepositKopecks",
	credit: "creditKopecks",
	certificate_or_bonus: "certificateOrBonusKopecks",
	dms_insurance: "dmsInsuranceKopecks",
};

/** Every tender holds a distinct amount so that counting the wrong one changes the sum. */
const DISTINCT: Readonly<Record<KopeckKey, number>> = {
	cashKopecks: 1000,
	cardKopecks: 2000,
	sbpKopecks: 3000,
	advanceDepositKopecks: 4000,
	familyDepositKopecks: 5000,
	creditKopecks: 6000,
	certificateOrBonusKopecks: 7000,
	dmsInsuranceKopecks: 8000,
};
const DISTINCT_TOTAL = 36000;

const KINDS = Object.keys(KEY_BY_KIND) as SplitTenderKind[];

function kopecksOf(result: SplitPaymentTenderInput, key: KopeckKey): number | undefined {
	return result[key];
}

describe("balanceSplitTenderRemainder: remainder = act total minus every OTHER tender", () => {
	for (const kind of KINDS) {
		it(`target ${kind}: gets act - sum(others); target's old value ignored; others untouched`, () => {
			const targetKey = KEY_BY_KIND[kind];
			const current: SplitPaymentTenderInput = { ...DISTINCT };
			const result = balanceSplitTenderRemainder({ actTotalKopecks: 100000, currentTenders: current, targetKind: kind });

			const othersSum = DISTINCT_TOTAL - DISTINCT[targetKey];
			assert.equal(kopecksOf(result, targetKey), 100000 - othersSum);
			for (const key of Object.keys(DISTINCT) as KopeckKey[]) {
				if (key !== targetKey) assert.equal(kopecksOf(result, key), DISTINCT[key], `${key} must stay as entered`);
			}
		});
	}

	it("others already cover (or exceed) the act: target becomes exactly 0, never negative", () => {
		const result = balanceSplitTenderRemainder({ actTotalKopecks: 10000, currentTenders: { ...DISTINCT }, targetKind: "cash" });
		assert.equal(result.cashKopecks, 0);
	});

	it("advance_deposit target is capped by the deposit actually available", () => {
		// others (without advance) = 36000 - 4000 = 32000; remainder = 68000; cap 15000
		const result = balanceSplitTenderRemainder({
			actTotalKopecks: 100000,
			currentTenders: { ...DISTINCT },
			targetKind: "advance_deposit",
			availableDepositKopecks: 15000,
		});
		assert.equal(result.advanceDepositKopecks, 15000);
	});

	it("family_deposit target is capped by the deposit actually available", () => {
		// others (without family) = 31000; remainder = 69000; cap 15000
		const result = balanceSplitTenderRemainder({
			actTotalKopecks: 100000,
			currentTenders: { ...DISTINCT },
			targetKind: "family_deposit",
			availableDepositKopecks: 15000,
		});
		assert.equal(result.familyDepositKopecks, 15000);
	});

	it("a deposit larger than the remainder does not inflate the target", () => {
		const result = balanceSplitTenderRemainder({
			actTotalKopecks: 100000,
			currentTenders: { ...DISTINCT },
			targetKind: "advance_deposit",
			availableDepositKopecks: 500000,
		});
		assert.equal(result.advanceDepositKopecks, 68000);
	});

	it("negative available deposit is treated as zero, not as a refund", () => {
		const result = balanceSplitTenderRemainder({
			actTotalKopecks: 100000,
			currentTenders: { ...DISTINCT },
			targetKind: "family_deposit",
			availableDepositKopecks: -700,
		});
		assert.equal(result.familyDepositKopecks, 0);
	});

	it("availableDepositKopecks never caps a non-deposit target", () => {
		// others (without cash) = 35000 -> cash = 65000 even though 'available deposit' is only 15000
		const result = balanceSplitTenderRemainder({
			actTotalKopecks: 100000,
			currentTenders: { ...DISTINCT },
			targetKind: "cash",
			availableDepositKopecks: 15000,
		});
		assert.equal(result.cashKopecks, 65000);
	});

	it("fractional act total is rounded to the nearest kopeck (100000.6 -> 100001)", () => {
		const result = balanceSplitTenderRemainder({ actTotalKopecks: 100000.6, currentTenders: { ...DISTINCT }, targetKind: "cash" });
		assert.equal(result.cashKopecks, 100001 - 35000);
	});
});

describe("balanceSplitDepositPlusCard: deposit first, tail on the secondary tender", () => {
	const base: SplitPaymentTenderInput = {
		cashKopecks: 5000,
		cardKopecks: 20000,
		sbpKopecks: 7000,
		creditKopecks: 10000,
		certificateOrBonusKopecks: 3000,
		dmsInsuranceKopecks: 2000,
		advanceDepositKopecks: 9999, // stale value, must be replaced
		familyDepositKopecks: 8888, // must be zeroed
	};

	it("secondary=cash: card and sbp stay counted, old cash is replaced", () => {
		// counted: card 20000 + sbp 7000 + credit 10000 + cert 3000 + dms 2000 = 42000 -> remainder 58000
		const r = balanceSplitDepositPlusCard({ actTotalKopecks: 100000, currentTenders: base, availableDepositKopecks: 30000, secondaryTender: "cash" });
		assert.equal(r.advanceDepositKopecks, 30000);
		assert.equal(r.cashKopecks, 28000);
		assert.equal(r.cardKopecks, 20000);
		assert.equal(r.sbpKopecks, 7000);
		assert.equal(r.familyDepositKopecks, 0);
		assert.equal(r.creditKopecks, 10000);
		assert.equal(r.certificateOrBonusKopecks, 3000);
		assert.equal(r.dmsInsuranceKopecks, 2000);
	});

	it("default secondary is card: cash and sbp stay counted, old card is replaced", () => {
		// counted: cash 5000 + sbp 7000 + credit 10000 + cert 3000 + dms 2000 = 27000 -> remainder 73000
		const r = balanceSplitDepositPlusCard({ actTotalKopecks: 100000, currentTenders: base, availableDepositKopecks: 20000 });
		assert.equal(r.advanceDepositKopecks, 20000);
		assert.equal(r.cardKopecks, 53000);
		assert.equal(r.cashKopecks, 5000);
		assert.equal(r.sbpKopecks, 7000);
	});

	it("deposit that covers the whole remainder leaves the secondary at exactly 0", () => {
		const r = balanceSplitDepositPlusCard({ actTotalKopecks: 100000, currentTenders: base, availableDepositKopecks: 80000 });
		assert.equal(r.advanceDepositKopecks, 73000);
		assert.equal(r.cardKopecks, 0);
	});

	it("secondary=sbp: cash and card stay counted, old sbp is replaced", () => {
		// counted: cash 5000 + card 20000 + credit 10000 + cert 3000 + dms 2000 = 40000 -> remainder 60000
		const r = balanceSplitDepositPlusCard({ actTotalKopecks: 100000, currentTenders: base, availableDepositKopecks: 10000, secondaryTender: "sbp" });
		assert.equal(r.advanceDepositKopecks, 10000);
		assert.equal(r.sbpKopecks, 50000);
		assert.equal(r.cashKopecks, 5000);
		assert.equal(r.cardKopecks, 20000);
	});
});

describe("autoAlignSplitRemainder: closes a rounding gap on the right tender, in the right direction", () => {
	const align = (o: { total: number; allocated: number; card: number; cash: number; deposit?: number; sbp?: number }) =>
		autoAlignSplitRemainder({
			totalDueRub: o.total,
			totalAllocatedRub: o.allocated,
			splitCardRub: o.card,
			splitCashRub: o.cash,
			splitDepositRub: o.deposit,
			splitSbpRub: o.sbp,
		});

	it("no gap: nothing changes", () => {
		const r = align({ total: 100, allocated: 100, card: 60, cash: 40 });
		assert.deepEqual(r, { nextCardRub: 60, nextCashRub: 40 });
	});

	it("1 kopeck short with card in use: the kopeck goes to card", () => {
		const r = align({ total: 1000, allocated: 999.99, card: 500, cash: 499.99 });
		assert.equal(rubToKopecks(r.nextCardRub), 50001);
		assert.equal(rubToKopecks(r.nextCashRub), 49999);
	});

	it("short, no card, cash is the only other tender: the gap is ADDED to cash", () => {
		const r = align({ total: 100, allocated: 50, card: 0, cash: 50 });
		assert.equal(r.nextCashRub, 100);
		assert.equal(r.nextCardRub, 0);
	});

	it("short, no card, cash and deposit in use: gap goes to cash", () => {
		const r = align({ total: 100, allocated: 90, card: 0, cash: 50, deposit: 40 });
		assert.equal(r.nextCashRub, 60);
		assert.equal(r.nextCardRub, 0);
	});

	it("short, nothing entered at all: the whole amount lands on card", () => {
		const r = align({ total: 100, allocated: 0, card: 0, cash: 0 });
		assert.equal(r.nextCardRub, 100);
		assert.equal(r.nextCashRub, 0);
	});

	it("short, only a deposit is entered: gap lands on card, cash is not invented", () => {
		const r = align({ total: 100, allocated: 50, card: 0, cash: 0, deposit: 50 });
		assert.equal(r.nextCardRub, 50);
		assert.equal(r.nextCashRub, 0);
	});

	it("over by 10, card can absorb it: card is REDUCED", () => {
		const r = align({ total: 100, allocated: 110, card: 60, cash: 50 });
		assert.equal(r.nextCardRub, 50);
		assert.equal(r.nextCashRub, 50);
	});

	it("over by 10, card too small but cash can absorb it: cash is REDUCED, card untouched", () => {
		const r = align({ total: 100, allocated: 110, card: 5, cash: 100 });
		assert.equal(r.nextCashRub, 90);
		assert.equal(r.nextCardRub, 5);
	});

	it("over by 10, no card: cash is reduced", () => {
		const r = align({ total: 100, allocated: 130, card: 0, cash: 100 });
		assert.equal(r.nextCashRub, 70);
		assert.equal(r.nextCardRub, 0);
	});

	it("over by more than card+cash together: both clamp at 0, never negative", () => {
		const r = align({ total: 100, allocated: 110, card: 5, cash: 3 });
		assert.equal(r.nextCardRub, 0);
		assert.equal(r.nextCashRub, 0);
	});
});

describe("allocateSplitPaymentAcrossItems: leftover kopecks go to the largest remainder", () => {
	const item = (id: string, kop: number): SplitPaymentPositionItem => ({ id, name: id, quantity: 1, priceKopecks: kop, priceRub: kop / 100 });
	const sum = (r: { cashKopecks: number; cardKopecks: number }) => r.cashKopecks + r.cardKopecks;

	it("card 200 over items 100 and 200: the extra kopeck goes to the item with the bigger fractional share", () => {
		// card 200 (priority before cash): A 100*200/300 = 66 r200 ; B 200*200/300 = 133 r100 ; deficit 1 -> A (r200 > r100)
		// then cash 100 equals what is left (A 33 + B 67)
		const validation = validateAndBalanceSplitPayment({ actTotalKopecks: 300, tenders: { cardKopecks: 200, cashKopecks: 100 } });
		const [a, b] = allocateSplitPaymentAcrossItems([item("A", 100), item("B", 200)], validation);
		assert.ok(a && b);
		assert.equal(a.cardKopecks, 67);
		assert.equal(b.cardKopecks, 133);
		assert.equal(a.cashKopecks, 33);
		assert.equal(b.cashKopecks, 67);
		assert.equal(sum(a), 100);
		assert.equal(sum(b), 200);
	});

	it("equal fractional share: the item with the larger remaining debt gets the extra kopeck", () => {
		// card 2 over A=100,B=300: A 200/400 -> 0 r200 ; B 600/400 -> 1 r200 ; tie on remainder -> bigger debt B takes the spare
		const validation = validateAndBalanceSplitPayment({ actTotalKopecks: 400, tenders: { cardKopecks: 2, cashKopecks: 398 } });
		const [a, b] = allocateSplitPaymentAcrossItems([item("A", 100), item("B", 300)], validation);
		assert.ok(a && b);
		assert.equal(a.cardKopecks, 0);
		assert.equal(b.cardKopecks, 2);
		assert.equal(a.cashKopecks, 100);
		assert.equal(b.cashKopecks, 298);
	});
});
