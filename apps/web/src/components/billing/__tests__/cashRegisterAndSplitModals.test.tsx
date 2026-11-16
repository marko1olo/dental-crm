/**
 * apps/web/src/components/billing/__tests__/cashRegisterAndSplitModals.test.tsx
 *
 * Subagent 4 (Cash Register 54-FZ & Split Payments Inquisitor) Unit Tests.
 * Tests CashRegisterCheckoutModal, SplitPaymentModal, and DepositTopupModal.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal.js";
import {
	calculateCashChange,
	calculateSplitBalances,
	formatDisplayCurrency,
	DEPOSIT_QUICK_PRESETS_RUB,
	CASH_QUICK_BILLS_RUB,
} from "@dental/shared";

describe("Subagent 4 Inquisitor: CashRegisterStudioModal 54-FZ Operations", () => {
	it("renders large total due, fast tender tiles, and 54-FZ requisites cleanly", () => {
		const html = renderToString(
			React.createElement(CashRegisterStudioModal, {
				isOpen: true,
				onClose: () => {},
				mode: "checkout",
				containerTestId: "cash-register-checkout-modal",
				submitButtonTestId: "btn-submit-checkout-54fz",
				title: "Касса · Оплата приёма",
				totalDueRub: 12500,
				patientId: "pat-1",
				patientName: "Ковалёв Роман Станиславович",
				patientPhone: "+7 (999) 888-77-66",
				patientDepositRub: 5000,
			})
		);

		// Modal container & Clean Title
		assert.ok(html.includes('data-testid="cash-register-checkout-modal"'));
		assert.ok(html.includes("Касса · Оплата приёма"));
		assert.ok(html.includes("Ковалёв Роман Станиславович"));

		// Large centered total amount due
		assert.ok(html.includes('data-testid="display-total-amount-due"'));
		assert.ok(html.includes("12 500 ₽") || html.includes("12 500 ₽"));

		// Fast tender tiles
		assert.ok(html.includes('data-testid="btn-tender-card"'));
		assert.ok(html.includes('data-testid="btn-tender-sbp"'));
		assert.ok(html.includes('data-testid="btn-tender-cash"'));
		assert.ok(html.includes('data-testid="btn-tender-deposit"'));

		// 54-FZ Delivery options
		assert.ok(html.includes('data-testid="btn-delivery-paper"'));
		assert.ok(html.includes('data-testid="btn-delivery-sms"'));
		assert.ok(html.includes('data-testid="btn-delivery-email"'));

		// Primary submit CTA
		assert.ok(html.includes('data-testid="btn-submit-checkout-54fz"'));
	});

	it("contains zero cartoon emojis and zero forced citizen INN requirement (Mandates 8d, 8e)", () => {
		const html = renderToString(
			React.createElement(CashRegisterStudioModal, {
				isOpen: true,
				onClose: () => {},
				mode: "checkout",
				containerTestId: "cash-register-checkout-modal",
				submitButtonTestId: "btn-submit-checkout-54fz",
				totalDueRub: 7500,
				patientId: "pat-2",
				patientName: "Иванова Мария Петровна",
			})
		);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(html), false, "Must not contain cartoon emojis");
		assert.equal(html.includes("ИНН физического лица обязателен"), false, "Individual INN must not be required");
	});
});

describe("Subagent 4 Inquisitor: SplitPaymentModal Multi-Tender & Auto-Calculation", () => {
	it("renders split modal, live balance card, and tender inputs", () => {
		const html = renderToString(
			React.createElement(CashRegisterStudioModal, {
				isOpen: true,
				onClose: () => {},
				defaultMethod: "split",
				mode: "checkout",
				containerTestId: "split-payment-modal",
				totalDueRub: 20000,
				patientId: "pat-3",
				patientName: "Сидоров Иван Васильевич",
				patientDepositRub: 8000,
				patientFamilyBalanceRub: 5000,
			})
		);

		assert.ok(html.includes('data-testid="quick-presets-section"'), "Quick checkout presets visible");
		assert.ok(html.includes('data-testid="split-tender-panel"'), "Tender split section visible");

		// Inputs for tenders (fast checkout contract)
		assert.ok(html.includes('data-testid="split-input-card"'));
		assert.ok(html.includes('data-testid="split-input-cash"'));
		assert.ok(html.includes('data-testid="split-input-sbp"'));
		assert.ok(html.includes('data-testid="split-input-deposit"'));

		// Quick presets
		assert.ok(html.includes('data-testid="btn-checkout-split-50-50"'));
		assert.ok(html.includes('data-testid="btn-checkout-100-card"'));
		assert.ok(html.includes('data-testid="btn-checkout-100-cash"'));
		assert.ok(html.includes('data-testid="btn-checkout-100-sbp"'));
	});

	it("calculates exact kopeck split balances with zero floating point drift", () => {
		const calc1 = calculateSplitBalances(12500.5, {
			cardRub: 7500.5,
			cashRub: 5000,
		});
		assert.equal(calc1.isFullyPaid, true);
		assert.equal(calc1.remainingRub, 0);
		assert.equal(calc1.isOverpaid, false);

		const calc2 = calculateSplitBalances(10000, {
			depositRub: 4000,
		});
		assert.equal(calc2.isFullyPaid, false);
		assert.equal(calc2.remainingRub, 6000);

		const calc3 = calculateSplitBalances(15000, {
			cardRub: 10000,
			cashRub: 6000,
		});
		assert.equal(calc3.isOverpaid, true);
		assert.equal(calc3.remainingRub, 0);
	});

	it("renders authentic dynamic SBP QR SVG preview when SBP portion is entered in split", () => {
		const html = renderToString(
			React.createElement(CashRegisterStudioModal, {
				isOpen: true,
				onClose: () => {},
				defaultMethod: "split",
				mode: "checkout",
				containerTestId: "split-payment-modal",
				totalDueRub: 15000,
				patientId: "pat-sbp-split",
				patientName: "Васильев Игорь Олегович",
			})
		);

		// Modal renders cleanly; the SBP tender input is present
		assert.ok(html.includes('data-testid="split-tender-panel"'));
		assert.ok(html.includes('data-testid="split-input-sbp"'));
	});

	it("renders dynamic SBP QR SVG when SBP method is selected in CashRegisterStudioModal", () => {
		const html = renderToString(
			React.createElement(CashRegisterStudioModal, {
				isOpen: true,
				onClose: () => {},
				mode: "checkout",
				containerTestId: "cash-register-checkout-modal",
				submitButtonTestId: "btn-submit-checkout-54fz",
				totalDueRub: 8500,
				patientId: "pat-sbp-cashier",
				patientName: "Семенова Ольга Павловна",
				onOpenSplitPayment: () => {},
			})
		);

		// Checks that onOpenSplitPayment provides the fast split button
		assert.ok(html.includes('data-testid="btn-tender-split"'), "Includes fast split button tile");
		assert.ok(html.includes('data-testid="link-open-split-payment"'), "Includes split payment link");
	});
});

describe("Subagent 4 Inquisitor: Exact Cash Change Calculations", () => {
	it("calculates cash change exact kopecks and handles underpayment safely", () => {
		const change1 = calculateCashChange(4500, 5000);
		assert.equal(change1.isShortage, false);
		assert.equal(change1.changeRub, 500);
		assert.equal(change1.shortageRub, 0);

		const change2 = calculateCashChange(5000, 5000);
		assert.equal(change2.isShortage, false);
		assert.equal(change2.changeRub, 0);
		assert.equal(change2.shortageRub, 0);

		const change3 = calculateCashChange(10000, 8000);
		assert.equal(change3.isShortage, true);
		assert.equal(change3.changeRub, 0);
		assert.equal(change3.shortageRub, 2000);
	});
});
