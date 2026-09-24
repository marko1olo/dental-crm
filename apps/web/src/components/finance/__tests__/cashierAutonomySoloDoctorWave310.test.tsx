/**
 * apps/web/src/components/finance/__tests__/cashierAutonomySoloDoctorWave310.test.tsx
 *
 * DENTE Dental CRM — Cashier 54-FZ & Fiscal Autonomy for Solo Doctor & Small Clinic (Wave 310).
 *
 * Governed by:
 * - Mandate 8e, Item 9: Cash register 54-FZ without obstacles (INN is never required for physical persons, 1-click combined payments).
 * - Mandate 8e, Item 7: Doctor autonomy on discounts & warranty reworks (0 ₽ without master passwords).
 * - Mandate 8b: Integer kopecks math precision without IEEE-754 float drift.
 * - Mandate 8n: Scale sovereignty — Solo Doctor on chair rental & Small Clinic primary focus (Zero dead-ends).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	validateBuyerInn54Fz,
	validate54FzBuyerInn,
	isCashierActionBlockedByInn,
	calculateCombinedFamilyCashCardSplit,
	createThreeWaySplitTenders,
	autoDistributeSplitRemainder,
	allocateRemainderToTender,
	getFastCombinedTenderPresets,
	calculateCashChange,
	process100PercentDiscountCheckout,
} from "../cashboxOperations";
import { FastCheckoutModal } from "../FastCheckoutModal";
import { PaymentModal } from "../PaymentModal";

describe("Wave 310: 54-FZ Cashier Autonomy — Zero INN for Physical Persons (Mandate 8e Item 9 & 8n)", () => {
	it("1.1 Physical person without INN is 100% valid and NEVER blocks checkout (ст. 4.7 № 54-ФЗ)", () => {
		const emptyCheck = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: "",
		});
		assert.equal(emptyCheck.isValid, true, "Empty INN must be valid for physical person");
		assert.equal(emptyCheck.isRequired, false, "INN must be strictly optional for physical person");
		assert.equal(emptyCheck.errorRu, undefined, "No error message for empty INN");

		const undefinedCheck = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: undefined,
		});
		assert.equal(undefinedCheck.isValid, true);
		assert.equal(undefinedCheck.isRequired, false);

		const whitespaceCheck = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: "   ",
		});
		assert.equal(whitespaceCheck.isValid, true);
		assert.equal(whitespaceCheck.isRequired, false);
	});

	it("1.2 isCashierActionBlockedByInn returns false for physical persons regardless of INN field content", () => {
		assert.equal(isCashierActionBlockedByInn({ payerType: "physical_person", buyerInn: "" }), false);
		assert.equal(isCashierActionBlockedByInn({ payerType: "physical_person", buyerInn: undefined }), false);
		assert.equal(isCashierActionBlockedByInn({ payerType: "physical", buyerInn: "" }), false);
		assert.equal(isCashierActionBlockedByInn({ payerType: "physical", buyerInn: "123" }), false);
		assert.equal(isCashierActionBlockedByInn({ payerType: "physical_person", buyerInn: "770123456789" }), false);
	});

	it("1.3 Voluntary 12-digit INN for physical person (NDFL 13% certificate) is accepted cleanly", () => {
		const result = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: "770123456789",
		});
		assert.equal(result.isValid, true);
		assert.equal(result.isRequired, false);
		assert.equal(result.cleanInn, "770123456789");
		assert.equal(result.errorRu, undefined);

		const altResult = validate54FzBuyerInn("770123456789", "physical");
		assert.equal(altResult.isValid, true);
		assert.equal(altResult.cleanInn, "770123456789");
	});

	it("1.4 Non-standard length INN for physical person gives informative hint but NEVER invalidates or blocks checkout", () => {
		const result = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: "12345",
		});
		assert.equal(result.isValid, true, "Must stay valid to guarantee zero cashier blockage");
		assert.equal(result.isRequired, false);
		assert.ok(result.errorRu, "Provides soft hint only");
		assert.match(result.errorRu ?? "", /не блокирует/);
	});

	it("1.5 B2B Legal Entity (юрлицо) and IP strictly require valid INN per 54-FZ", () => {
		const missingLegal = validateBuyerInn54Fz({
			payerType: "legal_entity",
			buyerInn: "",
		});
		assert.equal(missingLegal.isValid, false);
		assert.equal(missingLegal.isRequired, true);
		assert.equal(isCashierActionBlockedByInn({ payerType: "legal_entity", buyerInn: "" }), true);

		const validLegal = validateBuyerInn54Fz({
			payerType: "legal_entity",
			buyerInn: "7705123456",
		});
		assert.equal(validLegal.isValid, true);
		assert.equal(isCashierActionBlockedByInn({ payerType: "legal_entity", buyerInn: "7705123456" }), false);

		const missingIp = validateBuyerInn54Fz({
			payerType: "individual_entrepreneur",
			buyerInn: "",
		});
		assert.equal(missingIp.isValid, false);
		assert.equal(missingIp.isRequired, true);
		assert.equal(isCashierActionBlockedByInn({ payerType: "individual_entrepreneur", buyerInn: "" }), true);

		const validIp = validateBuyerInn54Fz({
			payerType: "individual_entrepreneur",
			buyerInn: "770123456789",
		});
		assert.equal(validIp.isValid, true);
		assert.equal(isCashierActionBlockedByInn({ payerType: "individual_entrepreneur", buyerInn: "770123456789" }), false);
	});
});

describe("Wave 310: 1-Click Split Payment & Integer Kopecks Math (Mandate 8b & 8e Item 9)", () => {
	it("2.1 calculateCombinedFamilyCashCardSplit performs penny-exact distribution with odd-kopeck remainder", () => {
		// Total: 5000.77 ₽, Family Balance: 2000.00 ₽
		// Remainder: 3000.77 ₽ -> Card: 1500.38 ₽, Cash: 1500.39 ₽
		const result = calculateCombinedFamilyCashCardSplit({
			totalDueRub: 5000.77,
			patientFamilyBalanceRub: 2000.00,
			preferFamilyAccount: true,
		});

		assert.equal(result.isPennyExact, true, "Must have 100% kopeck parity");
		assert.equal(result.totalDueRub, 5000.77);
		assert.equal(result.totalDueKop, 500077);
		assert.equal(result.advanceDeductedRub, 2000.00);
		assert.equal(result.advanceDeductedKop, 200000);
		assert.equal(result.advanceSource, "family");
		assert.equal(result.remainderToPayRub, 3000.77);
		assert.equal(result.remainderToPayKop, 300077);
		assert.equal(result.cardRub, 1500.38);
		assert.equal(result.cardKop, 150038);
		assert.equal(result.cashRub, 1500.39);
		assert.equal(result.cashKop, 150039);
		assert.equal(result.cardKop + result.cashKop + result.advanceDeductedKop, result.totalDueKop);
		assert.equal(result.tenders.cardRub, 1500.38);
		assert.equal(result.tenders.cashRub, 1500.39);
		assert.equal(result.tenders.familyRub, 2000.00);
	});

	it("2.2 calculateCombinedFamilyCashCardSplit handles patient deposit with 1 kopeck odd remainder", () => {
		// Total: 1000.01 ₽, Deposit: 300.00 ₽
		// Remainder: 700.01 ₽ -> Card: 350.00 ₽, Cash: 350.01 ₽
		const result = calculateCombinedFamilyCashCardSplit({
			totalDueRub: 1000.01,
			patientDepositRub: 300.00,
		});

		assert.equal(result.isPennyExact, true);
		assert.equal(result.advanceDeductedRub, 300.00);
		assert.equal(result.advanceSource, "deposit");
		assert.equal(result.cardRub, 350.00);
		assert.equal(result.cashRub, 350.01);
		assert.equal(result.cardKop + result.cashKop + result.advanceDeductedKop, 100001);
	});

	it("2.3 createThreeWaySplitTenders returns balanced tender state", () => {
		const tenders = createThreeWaySplitTenders({
			totalDueRub: 4500.50,
			patientDepositRub: 1500.00,
		});
		assert.equal(tenders.depositRub, 1500.00);
		assert.equal(tenders.cardRub, 1500.25);
		assert.equal(tenders.cashRub, 1500.25);
		assert.equal(tenders.depositRub + tenders.cardRub + tenders.cashRub, 4500.50);
	});

	it("2.4 allocateRemainderToTender with 'card_and_cash_5050' divides remaining unpaid balance without float drift", () => {
		const currentTenders = {
			cardRub: 0,
			cashRub: 0,
			sbpRub: 0,
			depositRub: 1000.00,
			familyRub: 0,
			certificateRub: 0,
			bonusRub: 0,
		};
		// Total: 3500.33 ₽, Paid: 1000 ₽, Remaining: 2500.33 ₽ -> 1250.16 + 1250.17
		const distributed = allocateRemainderToTender({
			totalDueRub: 3500.33,
			currentTenders,
			targetTender: "card_and_cash_5050",
		});
		assert.equal(distributed.cardRub, 1250.16);
		assert.equal(distributed.cashRub, 1250.17);
		assert.equal(distributed.depositRub, 1000.00);
		assert.equal(Math.round((distributed.cardRub + distributed.cashRub + distributed.depositRub) * 100), 350033);
	});

	it("2.5 autoDistributeSplitRemainder defaults to card_and_cash_5050 and ensures penny precision", () => {
		const currentTenders = {
			cardRub: 0,
			cashRub: 0,
			sbpRub: 0,
			depositRub: 0,
			familyRub: 500.00,
		};
		const auto = autoDistributeSplitRemainder({
			totalDueRub: 2500.00,
			currentTenders,
		});
		assert.equal(auto.familyRub, 500.00);
		assert.equal(auto.cardRub, 1000.00);
		assert.equal(auto.cashRub, 1000.00);
	});

	it("2.6 getFastCombinedTenderPresets includes 3-way preset 'family_cash_card_three_way'", () => {
		const presets = getFastCombinedTenderPresets({
			totalDueRub: 6000,
			patientFamilyBalanceRub: 2000,
		});
		const threeWay = presets.find((p) => p.id === "family_cash_card_three_way");
		assert.ok(threeWay, "Three way split preset must be available");
		assert.equal(threeWay.tenders.familyRub, 2000);
		assert.equal(threeWay.tenders.cardRub, 2000);
		assert.equal(threeWay.tenders.cashRub, 2000);
	});
});

describe("Wave 310: UI Rendering & Button State Autonomy (Mandates 8e, 8n)", () => {
	it("3.1 FastCheckoutModal renders with empty INN for physical person and action buttons are NOT disabled", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 3500,
				patientName: "Смирнов П. В.",
				cashierFullName: "Доктор Иванов",
			})
		);

		// Badge confirming INN is not required for physical persons
		assert.ok(html.includes('data-testid="inn-physical-not-required-badge"'), "Must render non-required badge");
		assert.ok(html.includes("По 54-ФЗ для физлиц не требуется"));

		// Physical INN input is rendered with placeholder stating it is not required
		assert.ok(html.includes('data-testid="input-buyer-inn-physical"'));
		assert.ok(html.includes("Не требуется (пациент-физлицо)"));

		// Checkout action button is NOT disabled for physical person with empty INN
		assert.ok(html.includes('data-testid="execute-fast-checkout-btn"'));
		const btnIndex = html.indexOf('data-testid="execute-fast-checkout-btn"');
		const btnTag = html.slice(btnIndex, html.indexOf(">", btnIndex));
		const tagWithoutClass = btnTag.replace(/class="[^"]*"/, "");
		assert.equal(/disabled(?=[>\s=])/.test(tagWithoutClass), false, "Submit button must NOT be disabled for empty INN");

		// 1-Click presets exist
		assert.ok(html.includes('data-testid="btn-checkout-split-three-way"'));
		assert.ok(html.includes('data-testid="btn-checkout-split-50-50"'));
	});

	it("3.2 FastCheckoutModal renders seamlessly with doctor autonomy and zero INN required", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 4200,
				patientName: "Кузнецова Е. А.",
			})
		);
		assert.ok(html.includes('data-testid="execute-fast-checkout-btn"'));
		assert.ok(html.includes('data-testid="inn-physical-not-required-badge"'));
	});

	it("3.3 FastCheckoutModal renders family remainder button when family balance is available in split mode", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 5000,
				patientFamilyBalanceRub: 1500,
				initialSimpleCashierMode: false,
				familyPayerName: "Супруг (Смирнов А. А.)",
			})
		);
		assert.ok(html.includes('data-testid="split-fill-family-btn"'), "Must render family remainder button");
		assert.ok(html.includes('data-testid="split-fill-5050-btn"'), "Must render 50/50 remainder button");
	});

	it("3.4 PaymentModal renders with empty INN for physical person and footer submit buttons are NOT disabled", () => {
		const cashHtml = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				amountRub: 2800,
				defaultMethod: "cash",
				patientName: "Алексеев Д. И.",
				patientFamilyBalanceRub: 1000,
			})
		);

		// Badge confirming INN is not required for physical persons
		assert.ok(cashHtml.includes('data-testid="inn-physical-not-required-badge"'));
		assert.ok(cashHtml.includes('data-testid="input-buyer-inn-physical"'));

		// Cash submit button in footer is NOT disabled
		assert.ok(cashHtml.includes('data-testid="btn-cash-submit-footer"'));
		const cashBtnIndex = cashHtml.indexOf('data-testid="btn-cash-submit-footer"');
		const cashBtnTag = cashHtml.slice(cashBtnIndex, cashHtml.indexOf(">", cashBtnIndex));
		const cashTagWithoutClass = cashBtnTag.replace(/class="[^"]*"/, "");
		assert.equal(/disabled(?=[>\s=])/.test(cashTagWithoutClass), false, "Cash submit button must NOT be disabled");

		// Split 3-way preset button is always visible on top preset bar
		assert.ok(cashHtml.includes('data-testid="preset-three-way-split"'));

		// Split Mode render
		const splitHtml = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				amountRub: 2800,
				defaultMethod: "split",
				patientName: "Алексеев Д. И.",
				patientFamilyBalanceRub: 1000,
			})
		);

		// Split submit button in footer is NOT disabled
		assert.ok(splitHtml.includes('data-testid="btn-split-submit-footer"'));
		const splitBtnIndex = splitHtml.indexOf('data-testid="btn-split-submit-footer"');
		const splitBtnTag = splitHtml.slice(splitBtnIndex, splitHtml.indexOf(">", splitBtnIndex));
		const splitTagWithoutClass = splitBtnTag.replace(/class="[^"]*"/, "");
		assert.equal(/disabled(?=[>\s=])/.test(splitTagWithoutClass), false, "Split submit button must NOT be disabled");

		// Remainder buttons in split mode
		assert.ok(splitHtml.includes('data-testid="btn-payment-remainder-5050"'));
		assert.ok(splitHtml.includes('data-testid="btn-payment-remainder-family"'));
	});

	it("3.5 100% Warranty / rework checkout operates at 0 ₽ without fiscalization blockage (Mandate 8e Item 7)", () => {
		const zeroResult = process100PercentDiscountCheckout({
			totalGrossRub: 7500,
			isWarrantyRework: true,
		});
		assert.equal(zeroResult.isZeroDue, true);
		assert.equal(zeroResult.totalNetRub, 0);
		assert.equal(zeroResult.status, "completed");
		assert.equal(zeroResult.bypassKktZeroReceipt, true, "Must bypass physical KKT for 0 ₽");
		assert.equal(zeroResult.paymentStatus, "Оплачено (скидка 100%)");
	});
});
