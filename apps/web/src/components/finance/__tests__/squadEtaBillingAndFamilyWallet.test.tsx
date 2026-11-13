/**
 * squadEtaBillingAndFamilyWallet.test.tsx — Unit & Ergonomic Verification Suite
 * for Squad Eta (54-FZ Fast Billing, Cash Register POS, and Family Balance Allocation).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientBillingModal } from "../PatientBillingModal";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal";
import { FamilyWalletPanel } from "../FamilyWalletPanel";
import { calculateCashChange, getCashPresetSuggestions } from "../fiscal/fiscal54fzEngine";

describe("Squad Eta — 54-FZ Billing, POS Cash Register & Family Wallet", () => {
	it("PatientBillingModal: delegates payment execution to CashRegisterStudioModal without nested tender button sprawl", () => {
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

		// Assert payment delegation panel is present with single clear CTA to cashbox
		assert.ok(html.includes('data-testid="patient-billing-payment-panel"'), "Payment delegation panel must be rendered");
		assert.ok(html.includes('data-testid="btn-open-cashbox-from-act"'), "Open cashbox CTA must be present");
		assert.ok(html.includes('data-testid="btn-fiscalize-54fz"'), "Footer 54-FZ fiscalize button must be present");

		// Mandate 8bf: Anti-Matryoshka — nested tender buttons sprawl is amputated from act view
		assert.ok(!html.includes('data-testid="tender-btn-card"'), "Nested card button must NOT be sprawled inside act form");
		assert.ok(!html.includes('data-testid="tender-btn-installment"'), "Nested installment button must NOT be sprawled inside act form");
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

	it("CashRegisterStudioModal: renders 54-FZ checkout studio with multi-tender support and doctor discounts", () => {
		const html = renderToString(
			<CashRegisterStudioModal
				isOpen={true}
				onClose={() => {}}
				totalDueRub={18500}
				patientName="Петров Петр Петрович"
				patientDepositRub={5000}
				patientFamilyBalanceRub={35000}
				defaultMethod="cash"
				mode="checkout"
			/>,
		);

		assert.ok(html.includes('data-testid="cash-register-studio-modal"'), "Cash register studio modal must be rendered in DOM");
		assert.ok(html.includes('data-testid="payment-modal-presets-bar"'), "Doctor discount & warranty panel must be present");
		assert.ok(html.includes('data-testid="preset-warranty-100"'), "100% warranty discount button must be present");
		assert.ok(html.includes('data-testid="cash-tender-panel"'), "Tender panel must be present");
		assert.ok(html.includes('data-testid="btn-tender-card"'), "Card tender button must be present");
		assert.ok(html.includes('data-testid="btn-tender-sbp"'), "SBP tender button must be present");
		assert.ok(html.includes('data-testid="btn-tender-cash"'), "Cash tender button must be present");
		assert.ok(html.includes('data-testid="btn-submit-checkout-54fz"'), "Fiscalize submit button must be present");
	});

	it("FamilyWalletPanel: renders balance allocation and family wallet controls", () => {
		const html = renderToString(
			<FamilyWalletPanel
				patientId="pat-1"
				remainingDebtRub={60000}
			/>,
		);

		assert.ok(html.includes("family-wallet"), "Family wallet panel must be rendered");
	});
});
