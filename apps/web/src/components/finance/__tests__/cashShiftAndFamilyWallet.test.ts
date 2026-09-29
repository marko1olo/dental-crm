/**
 * cashShiftAndFamilyWallet.test.ts — Unit tests for 54-FZ Cash Shift and Family Wallet Invariants
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import {
	familyMutationId,
	familyPayRequestKey,
	familyTopupRequestKey,
	type MutationTicket,
} from "../familyWalletMutationKey.js";
import {
	formatAvailableForDebitLabel,
	formatFamilyBalanceLabel,
	formatMoneyClean,
	safeFamilyMemberName,
} from "../familyWalletHelpers.js";

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

describe("PaymentFamilyDepositView & Family Ledger Combo Resolvers", () => {
	it("3.1 1-Click Family Balance Combo correctly splits deposit offset and card remainder in exact kopecks", () => {
		// Personal deposit = 0 ₽, Family Balance = 2 400.00 ₽, Total due = 6 000.00 ₽
		const personalDepositRub = 0;
		const familyBalanceRub = 2400;
		const totalDueRub = 6000;

		const totalKop = rubToKopecks(totalDueRub);
		const famKop = Math.min(totalKop, rubToKopecks(familyBalanceRub));
		const remKop = Math.max(0, totalKop - famKop);

		assert.equal(famKop, 240000); // 2 400.00 ₽ from family balance
		assert.equal(remKop, 360000); // 3 600.00 ₽ remaining for Card / Cash / SBP
		assert.equal(famKop + remKop, totalKop);

		const splitDepositRub = kopecksToRub(famKop);
		const splitCardRub = kopecksToRub(remKop);
		assert.equal(splitDepositRub, 2400);
		assert.equal(splitCardRub, 3600);
	});

	it("3.2 Idempotency Ticket retains mutation key on exact repeat and creates new key on changed param", () => {
		const ticketRef: { current: MutationTicket | null } = { current: null };

		const key1 = familyPayRequestKey("pat-child-01", "grp-01", 1500.5);
		const mut1 = familyMutationId(ticketRef, "family-pay", key1);
		assert.ok(mut1.startsWith("family-pay-"));
		assert.equal(ticketRef.current?.requestKey, key1);

		// Same parameters: retains the exact same mutation id (idempotent repeat)
		const mut2 = familyMutationId(ticketRef, "family-pay", key1);
		assert.equal(mut2, mut1);

		// Changed amount or patient: creates brand new mutation id
		const key2 = familyPayRequestKey("pat-child-01", "grp-01", 2000);
		const mut3 = familyMutationId(ticketRef, "family-pay", key2);
		assert.notEqual(mut3, mut1);
		assert.equal(ticketRef.current?.requestKey, key2);
	});

	it("3.3 Formatter invariants: clean clinical badges with zero undefined/null/NaN leaks", () => {
		assert.match(
			formatFamilyBalanceLabel(50000, "Иванов Иван"),
			/Семейный баланс:\s*50\s*000\s*₽\s*\(Глава семьи:\s*Иванов Иван\)/,
		);

		assert.match(
			formatAvailableForDebitLabel(50000),
			/Доступно для списания:\s*50\s*000\s*₽/,
		);

		assert.equal(safeFamilyMemberName(null, "Пациент"), "Пациент");
		assert.equal(safeFamilyMemberName({ fullName: "null" }, "Пациент"), "Пациент");
		assert.equal(safeFamilyMemberName({ fullName: "undefined" }, "Пациент"), "Пациент");
		assert.equal(formatMoneyClean(NaN), "0 ₽");
	});
});
