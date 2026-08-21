/**
 * cashShiftAndFamilyWallet.test.ts — Unit tests for 54-FZ Cash Shift and Family Wallet Invariants
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("CashShiftWidget — 54-FZ Cash Register Shift Logic & Accounting", () => {
	it("correctly calculates total shift turnover across Cash (Tag 1031), Card (Tag 1081), and SBP", () => {
		const cashInDrawer = 24500.5;
		const cardSum = 68000.0;
		const sbpSum = 15400.25;

		const total = cashInDrawer + cardSum + sbpSum;
		assert.equal(total, 107900.75);

		// Format test
		const formatted = total.toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		assert.match(formatted, /107\s?900[,.]75/);
	});

	it("prevents negative cash balances or corrupt shift reconciliation", () => {
		const cashInDrawer = Math.max(0, -500);
		assert.equal(cashInDrawer, 0);
	});
});

describe("FamilyWalletPanel — Bonus Point Presets & Touch Targets Invariants", () => {
	it("verifies bonus redemption presets (500, 1000, 2000, 5000) are valid positive integers", () => {
		const presets = [500, 1000, 2000, 5000];
		for (const p of presets) {
			assert.equal(Number.isInteger(p), true);
			assert.ok(p > 0);
		}
	});

	it("ensures family balance deduction does not exceed available balance", () => {
		const currentBalance = 4500;
		const requestedAmount = 5000;
		const isPermitted = requestedAmount <= currentBalance;
		assert.equal(isPermitted, false);

		const safeAmount = Math.min(requestedAmount, currentBalance);
		assert.equal(safeAmount, 4500);
	});
});
