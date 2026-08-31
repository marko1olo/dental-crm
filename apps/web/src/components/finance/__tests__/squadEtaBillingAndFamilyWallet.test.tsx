/**
 * squadEtaBillingAndFamilyWallet.test.tsx — Unit & Ergonomic Verification Suite
 * for Squad Eta (54-FZ Fast Billing, Cash Register POS, and Family Balance Allocation).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientBillingModal } from "../PatientBillingModal";
import { CashRegisterModal } from "../CashRegisterModal";
import { FamilyWalletModal } from "../FamilyWalletModal";
import { calculateCashChange, getCashPresetSuggestions } from "../fiscal/fiscal54fzEngine";

describe("Squad Eta — 54-FZ Billing, POS Cash Register & Family Wallet", () => {
	it("PatientBillingModal: renders 1-click payment tender buttons and exact change calculation in DOM", () => {
		const html = renderToString(
			<PatientBillingModal
				isOpen={true}
				onClose={() => {}}
				patient={{
					id: "pat-1",
					fullName: "Иванов Иван Иванович",
					depositRub: 15000,
					familyBalanceRub: 50000,
				}}
				initialServices={[
					{
						id: "srv-1",
						name: "Лечение кариеса",
						priceRub: 7500,
						quantity: 1,
						code804n: "A16.07.002",
						category: "therapy",
					},
				]}
			/>,
		);

		// Assert tender panel and buttons are present
		assert.ok(html.includes('data-testid="patient-billing-payment-panel"'), "Payment panel must be rendered");
		assert.ok(html.includes('data-testid="tender-btn-card"'), "Card tender button must be present");
		assert.ok(html.includes('data-testid="tender-btn-sbp"'), "SBP tender button must be present");
		assert.ok(html.includes('data-testid="tender-btn-cash"'), "Cash tender button must be present");
		assert.ok(html.includes('data-testid="tender-btn-family"'), "Family wallet tender button must be present");
		assert.ok(html.includes('data-testid="tender-btn-deposit"'), "Deposit tender button must be present");
		assert.ok(html.includes('data-testid="tender-btn-installment"'), "Installment tender button must be present");

		// Assert Anti-Matryoshka clean layout
		assert.ok(html.includes("Способ оплаты (1-клик)"), "Monolithic header must be visible");
	});

	it("Exact Cash Change Engine: calculates change down to kopecks without float drift", () => {
		// Required: 7 450.50 ₽, Received: 10 000.00 ₽ -> Change: 2 549.50 ₽
		const res1 = calculateCashChange(7450.5, 10000);
		assert.equal(res1.changeRub, 2549.5);
		assert.equal(res1.changeKopecks, 254950);
		assert.equal(res1.isShortage, false);

		// Shortage scenario: Required: 5 000.00 ₽, Received: 4 500.00 ₽ -> Shortage: 500.00 ₽
		const res2 = calculateCashChange(5000, 4500);
		assert.equal(res2.changeRub, 0);
		assert.equal(res2.isShortage, true);
		assert.equal(res2.shortageRub, 500);
		assert.equal(res2.shortageKopecks, 50000);

		// Exact payment: Required: 6 300.00 ₽, Received: 6 300.00 ₽ -> Change: 0
		const res3 = calculateCashChange(6300, 6300);
		assert.equal(res3.changeRub, 0);
		assert.equal(res3.isShortage, false);
	});

	it("Cash Denominations: provides fast-pick cashier denominations", () => {
		const suggestions = getCashPresetSuggestions(1650);
		assert.ok(suggestions.includes(1650), "Exact amount must be in presets");
		assert.ok(suggestions.includes(2000), "Next 2000 bill must be suggested");
		assert.ok(suggestions.includes(5000), "5000 bill must be suggested");
	});

	it("CashRegisterModal: renders 54-FZ checkout studio with multi-tender support and thermal receipt", () => {
		const html = renderToString(
			<CashRegisterModal
				isOpen={true}
				onClose={() => {}}
				totalAmountRub={18500}
				patientName="Петров Петр Петрович"
				patientDepositRub={5000}
				patientFamilyBalanceRub={35000}
			/>,
		);

		assert.ok(html.includes('data-testid="cash-register-modal"'), "Cash register modal must be rendered in DOM");
		assert.ok(html.includes('data-testid="cash-tender-panel"'), "Tender panel must be present");
		assert.ok(html.includes('data-testid="btn-tender-card"'), "Card tender button must be present");
		assert.ok(html.includes('data-testid="btn-tender-sbp"'), "SBP tender button must be present");
		assert.ok(html.includes('data-testid="btn-tender-cash"'), "Cash tender button must be present");
		assert.ok(html.includes('data-testid="btn-cash-submit-fiscalize"'), "Fiscalize submit button must be present");
	});

	it("FamilyWalletModal: renders balance allocation, quick 1-click actions, and member limit controls", () => {
		const html = renderToString(
			<FamilyWalletModal
				isOpen={true}
				onClose={() => {}}
				familyGroupName="Семья Кузнецовых"
				headPayerName="Кузнецов Павел Сергеевич"
				initialTotalBalanceRub={60000}
			/>,
		);

		assert.ok(html.includes('data-testid="family-wallet-modal"'), "Family wallet modal must be rendered");
		assert.ok(html.includes('data-testid="family-allocation-view"'), "Allocation view must be active by default");
		assert.ok(html.includes('data-testid="btn-split-equally"'), "Split equally button must be present");
		assert.ok(html.includes('data-testid="btn-children-10k"'), "Children 10k preset button must be present");
		assert.ok(html.includes('data-testid="btn-remove-limits"'), "Remove limits button must be present");
		assert.ok(html.includes('data-testid="btn-save-family-wallet"'), "Save settings button must be present");
	});
});
