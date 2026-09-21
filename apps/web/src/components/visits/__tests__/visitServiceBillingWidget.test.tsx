/**
 * apps/web/src/components/visits/__tests__/visitServiceBillingWidget.test.tsx
 *
 * DENTE Dental CRM — Unit & Integration Tests for VisitServiceBillingWidget & 54-FZ Cashier.
 *
 * Governed by:
 * - Mandate 8e, Item 7: Doctor Autonomy (freedom of discounts up to 100% on warranty reworks without admin password).
 * - Mandate 8e, Item 9: Cash register 54-FZ without obstacles (INN optional for citizens, 1-click split payment).
 * - Mandate 8b: Integer kopeck math without IEEE-754 float drift.
 * - Mandate 8d: HIG & 7 Deadly Sins (zero emojis, compact desktop density).
 * - Mandate 8t: Verification via node --test without running tsc.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	VisitServiceBillingWidget,
	DEFAULT_CHAIRSIDE_SERVICES,
	type VisitBillingServiceItem,
} from "../VisitServiceBillingWidget.js";
import {
	validateBuyerInn54Fz,
	validate54FzBuyerInn,
	calculateCashChange,
	createExactCashTenders,
	createFullCardTenders,
	createDepositAndCardComboTenders,
	allocateRemainderToTender,
	process100PercentDiscountCheckout,
} from "../../finance/cashboxOperations.js";
import {
	calculatePaymentDiscount,
	PaymentModal,
} from "../../finance/PaymentModal.js";
import {
	applyQuickCheckoutPreset,
	paymentsToSplitState,
} from "../../payments/checkout/fastCheckoutEngine.js";

describe("VisitServiceBillingWidget — Chairside Billing & Inline Price Editing", () => {
	it("renders services list with initial prices and codes", () => {
		const html = renderToStaticMarkup(
			createElement(VisitServiceBillingWidget, {
				doctorName: "Д-р Иванов А.С.",
				patientName: "Смирнова Е.В.",
			})
		);

		assert.ok(html.includes("Услуги и биллинг у кресла"), "Must render header");
		assert.ok(html.includes("Д-р Иванов А.С."), "Must render doctor name");
		assert.ok(html.includes("Препарирование и медикаментозная обработка"), "Must render first service");
		assert.ok(html.includes("Восстановление зуба пломбой"), "Must render second service");
		assert.ok(html.includes("A25.07.001"), "Must render 804n code");
		assert.ok(html.includes("зуб 36"), "Must render tooth code");
	});

	it("renders inline step buttons (+500 ₽ and -500 ₽) for each service", () => {
		const html = renderToStaticMarkup(
			createElement(VisitServiceBillingWidget, {
				initialServices: [
					{
						id: "serv-test-1",
						code804n: "A16.07.002",
						title: "Лечение кариеса",
						quantity: 1,
						unitPriceRub: 3500,
					},
				],
			})
		);

		assert.ok(html.includes("+500 ₽"), "Must render +500 ₽ step button");
		assert.ok(html.includes("-500 ₽"), "Must render -500 ₽ step button");
		assert.ok(html.includes('data-testid="btn-step-plus-500-serv-test-1"'), "Must have testid for +500 button");
		assert.ok(html.includes('data-testid="btn-step-minus-500-serv-test-1"'), "Must have testid for -500 button");
		assert.ok(html.includes('data-testid="input-unit-price-serv-test-1"'), "Must have price input");
	});

	it("renders doctor autonomy discount bar with 1-click presets", () => {
		const html = renderToStaticMarkup(
			createElement(VisitServiceBillingWidget, {
				doctorName: "Д-р Петров В.И.",
			})
		);

		assert.ok(html.includes("Свобода скидок врача"), "Must render doctor discount bar");
		assert.ok(html.includes("100% Гарантия / Переделка"), "Must have 100% warranty preset");
		assert.ok(html.includes("50% Персонал"), "Must have 50% staff preset");
		assert.ok(html.includes("20% Партнёр"), "Must have 20% partner preset");
		assert.ok(html.includes("10% Постоянный"), "Must have 10% regular patient preset");
		assert.ok(html.includes("5% Пенс/Утро"), "Must have 5% morning/pensioner preset");
		assert.ok(html.includes("0% Без скидки"), "Must have 0% reset preset");
	});

	it("renders per-service warranty toggle button", () => {
		const html = renderToStaticMarkup(
			createElement(VisitServiceBillingWidget, {
				initialServices: [
					{
						id: "serv-warranty-test",
						code804n: "A16.07.002",
						title: "Пломбирование",
						quantity: 1,
						unitPriceRub: 4000,
						isWarranty: true,
					},
				],
			})
		);

		assert.ok(html.includes("Гарантия 100% (0 ₽)"), "Must indicate active warranty on row");
		assert.ok(html.includes("btn-warranty-toggle-serv-warranty-test"), "Must have toggle button testid");
	});

	it("has zero unjustified disabled buttons (Mandate 8e)", () => {
		const html = renderToStaticMarkup(
			createElement(VisitServiceBillingWidget, {
				doctorName: "Д-р Сидоров С.С.",
			})
		);

		// Action buttons should not be disabled
		assert.ok(html.includes('data-testid="btn-save-visit-billing"'), "Must render save button");
		assert.ok(!html.includes('data-testid="btn-save-visit-billing" disabled'), "Save button must NOT be disabled");
		assert.ok(html.includes('data-testid="btn-open-payment-modal"'), "Must render payment button");
		assert.ok(!html.includes('data-testid="btn-open-payment-modal" disabled'), "Payment button must NOT be disabled");
		assert.ok(html.includes('data-testid="btn-add-service-chairside"'), "Must render add service button");
		assert.ok(!html.includes('data-testid="btn-add-service-chairside" disabled'), "Add button must NOT be disabled");
	});

	it("strictly contains zero cartoon emojis (Mandate 8d)", () => {
		const html = renderToStaticMarkup(
			createElement(VisitServiceBillingWidget, {
				doctorName: "Д-р Ковалев М.А.",
			})
		);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(html), false, "Rendered HTML must contain zero cartoon emojis");
	});
});

describe("54-FZ Cashier & Buyer INN Autonomy (Mandate 8e Item 9)", () => {
	it("Physical person without INN is 100% valid and never blocks checkout", () => {
		const emptyCheck = validate54FzBuyerInn("", "physical");
		assert.equal(emptyCheck.isValid, true);
		assert.equal(emptyCheck.isRequired, false);
		assert.equal(emptyCheck.errorMessage, undefined);

		const undefCheck = validate54FzBuyerInn(undefined, "physical");
		assert.equal(undefCheck.isValid, true);
		assert.equal(undefCheck.isRequired, false);
	});

	it("Physical person entering voluntary 12-digit INN for NDFL is valid without error", () => {
		const validInn = validate54FzBuyerInn("770123456789", "physical");
		assert.equal(validInn.isValid, true);
		assert.equal(validInn.isRequired, false);
		assert.equal(validInn.cleanInn, "770123456789");
	});

	it("Physical person entering non-standard INN produces non-blocking hint, never disables checkout", () => {
		const shortInn = validate54FzBuyerInn("12345", "physical");
		assert.equal(shortInn.isValid, true, "Must remain valid so payment is never blocked");
		assert.equal(shortInn.isRequired, false);
		assert.ok(shortInn.errorMessage, "Soft hint only");
		assert.match(shortInn.errorMessage ?? "", /не блокирует/);
	});

	it("B2B Legal Entity (10 digits) or IP (12 digits) is required and validated", () => {
		// Empty B2B is invalid
		const emptyB2B = validate54FzBuyerInn("", "legal_entity");
		assert.equal(emptyB2B.isValid, false);
		assert.equal(emptyB2B.isRequired, true);

		// Valid 10-digit organization
		const valid10 = validate54FzBuyerInn("7705123456", "legal_entity");
		assert.equal(valid10.isValid, true);
		assert.equal(valid10.cleanInn, "7705123456");

		// Valid 12-digit individual entrepreneur (ИП)
		const valid12 = validate54FzBuyerInn("770123456789", "legal_entity");
		assert.equal(valid12.isValid, true);
		assert.equal(valid12.cleanInn, "770123456789");

		// Malformed B2B (e.g. 7 digits)
		const invalidB2B = validate54FzBuyerInn("1234567", "legal_entity");
		assert.equal(invalidB2B.isValid, false);
	});
});

describe("1-Click Split Payment & Cash Change Kopeck Precision", () => {
	it("calculateCashChange computes exact cash, surplus change and shortage to the kopeck", () => {
		// Exact amount (Без сдачи)
		const exact = calculateCashChange(4500, 4500);
		assert.equal(exact.changeRub, 0);
		assert.equal(exact.changeKopecks, 0);
		assert.equal(exact.isExact, true);
		assert.equal(exact.isShortage, false);

		// Surplus (Сдача клиенту)
		const change = calculateCashChange(3850.5, 5000);
		assert.equal(change.changeRub, 1149.5);
		assert.equal(change.changeKopecks, 114950);
		assert.equal(change.isExact, false);

		// Shortage (Недостает)
		const shortage = calculateCashChange(5000, 3200);
		assert.equal(shortage.changeRub, 0);
		assert.equal(shortage.shortageRub, 1800);
		assert.equal(shortage.isShortage, true);
	});

	it("1-click 3-way split (Advance + Cash + Card) balances with integer kopeck precision", () => {
		const totalBillKop = 1750033; // 17 500.33 ₽
		const availDepositKop = 500000; // 5 000.00 ₽

		const result = applyQuickCheckoutPreset({
			totalBillKop,
			preset: "split_three_way",
			availableDepositKop: availDepositKop,
		});

		const splitState = paymentsToSplitState(result.payments);
		const sumKop =
			Math.round(splitState.depositRub * 100) +
			Math.round(splitState.cashRub * 100) +
			Math.round(splitState.cardRub * 100);

		assert.equal(sumKop, totalBillKop, "Sum of split tenders must equal total bill down to the kopeck");
		assert.equal(splitState.depositRub, 5000);
		assert.ok(splitState.cashRub > 0);
		assert.ok(splitState.cardRub > 0);
	});

	it("1-click 50/50 Cash and Card split balances without float drift", () => {
		const totalBillKop = 999999; // 9 999.99 ₽ (odd amount)
		const result = applyQuickCheckoutPreset({
			totalBillKop,
			preset: "split_50_50",
		});

		const splitState = paymentsToSplitState(result.payments);
		const sumKop = Math.round(splitState.cashRub * 100) + Math.round(splitState.cardRub * 100);
		assert.equal(sumKop, totalBillKop, "50/50 split must maintain exact kopeck balance on odd sums");
	});

	it("allocateRemainderToTender distributes remainder in 1 click", () => {
		const updated = allocateRemainderToTender({
			totalDueRub: 8200,
			currentTenders: {
				cardRub: 0,
				cashRub: 3000,
				sbpRub: 0,
				depositRub: 2000,
				familyRub: 0,
			},
			targetTender: "card",
		});

		assert.equal(updated.cardRub, 3200); // 8200 - 3000 - 2000 = 3200
		assert.equal(updated.cashRub, 3000);
		assert.equal(updated.depositRub, 2000);
	});
});

describe("Doctor Autonomy on Warranty & Staff Discounts (Mandate 8e Item 7)", () => {
	it("100% warranty closes visit in 1 click (0 ₽) and bypasses physical KKT error", () => {
		const res = process100PercentDiscountCheckout({
			totalGrossRub: 12500,
			isWarrantyRework: true,
		});

		assert.equal(res.isZeroDue, true);
		assert.equal(res.totalNetRub, 0);
		assert.equal(res.totalNetKop, 0);
		assert.equal(res.status, "completed");
		assert.equal(res.paymentStatus, "Оплачено (скидка 100%)");
		assert.equal(res.bypassKktZeroReceipt, true);
	});

	it("Doctor can apply up to 100% discount without admin pin or permission block", () => {
		const calc = calculatePaymentDiscount(15000, {
			isWarranty100: true,
		});

		assert.equal(calc.isWarranty100, true);
		assert.equal(calc.totalDueRub, 0);
		assert.equal(calc.discountRub, 15000);
		assert.equal(calc.effectiveDiscountPercent, 100);
	});
});
