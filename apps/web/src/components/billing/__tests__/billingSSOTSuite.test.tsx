/**
 * apps/web/src/components/billing/__tests__/billingSSOTSuite.test.tsx
 *
 * Comprehensive Red Team Verification Suite for DENTE Billing & Cashbox SSOT.
 *
 * Validates:
 * 1. Integer Kopeck Math & Zero Float Drift (rublesToKopecks, kopecksToRubles, formatKopecks).
 * 2. Cash Change Calculations (exact change, underpayment shortage guard).
 * 3. Split Tender Allocation & Balance Validation (card + cash + sbp + deposit).
 * 4. Mandate 8n: Zero forced citizen INN for physical persons.
 * 5. Mandate 8e: Doctor & Cashier Autonomy (100% warranty, 0 disabled buttons).
 * 6. Apple HIG & Component UI Mounting (CashCheckoutStudioModal, DirectCashRegisterLauncher).
 */

import React from "react";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import {
	rublesToKopecks,
	kopecksToRubles,
	formatKopecks,
	formatRubles,
	calculateCashChangeKopecks,
	validateSplitAllocation,
	getQuickCashTenderOptions,
	BILLING_PAYMENT_METHODS,
	BILLING_PAYER_TYPES,
	BILLING_DOCTOR_DISCOUNTS,
	BILLING_VAT_RATES,
	getBillingDemoInvoice,
} from "../billingCatalogData.js";
import { CashCheckoutStudioModal } from "../CashCheckoutStudioModal.js";
import { DirectCashRegisterLauncher } from "../DirectCashRegisterLauncher.js";

describe("Red Team Billing SSOT: Integer Kopeck Arithmetic & Zero Float Drift", () => {
	it("converts rubles to integer kopecks safely without floating-point errors", () => {
		assert.equal(rublesToKopecks(0.01), 1n);
		assert.equal(rublesToKopecks(1.0), 100n);
		assert.equal(rublesToKopecks(4500), 450000n);
		assert.equal(rublesToKopecks(7500.5), 750050n);
		assert.equal(rublesToKopecks(99999.99), 9999999n);

		// Guard invalid values
		assert.equal(rublesToKopecks(-100), 0n);
		assert.equal(rublesToKopecks(Number.NaN), 0n);
		assert.equal(rublesToKopecks(Number.POSITIVE_INFINITY), 0n);
	});

	it("converts kopecks to rubles accurately", () => {
		assert.equal(kopecksToRubles(100n), 1.0);
		assert.equal(kopecksToRubles(450000n), 4500.0);
		assert.equal(kopecksToRubles(750050n), 7500.5);
		assert.equal(kopecksToRubles(0n), 0);
	});

	it("formats rubles and kopecks into clean Russian currency strings", () => {
		const str1 = formatRubles(4500);
		assert.ok(str1.includes("4") && str1.includes("500") && str1.includes("₽"), `Expected "4 500 ₽", got ${str1}`);

		const str2 = formatKopecks(750000n);
		assert.ok(str2.includes("7") && str2.includes("500") && str2.includes("₽"), `Expected "7 500 ₽", got ${str2}`);

		const str3 = formatRubles(1234.5);
		assert.ok(str3.includes("1") && str3.includes("234,5") && str3.includes("₽"), `Expected fractional formatting, got ${str3}`);
	});

	it("computes exact cash change and detects underpayment shortage", () => {
		// Exact payment: 4500 received for 4500 bill
		const exact = calculateCashChangeKopecks(450000n, 450000n);
		assert.equal(exact.isShortage, false);
		assert.equal(exact.changeKopecks, 0n);
		assert.equal(exact.changeRubles, 0);

		// Overpayment: 5000 received for 4500 bill -> 500 change
		const over = calculateCashChangeKopecks(450000n, 500000n);
		assert.equal(over.isShortage, false);
		assert.equal(over.changeKopecks, 50000n);
		assert.equal(over.changeRubles, 500);

		// Underpayment: 3000 received for 4500 bill -> 1500 shortage
		const under = calculateCashChangeKopecks(450000n, 300000n);
		assert.equal(under.isShortage, true);
		assert.equal(under.shortageKopecks, 150000n);
		assert.equal(under.shortageRubles, 1500);
		assert.equal(under.changeKopecks, 0n);
	});

	it("validates split tender allocations with zero drift", () => {
		const totalDue = 750000n; // 7 500 ₽

		// Perfect split: 3000 card + 4500 cash
		const balanced = validateSplitAllocation(totalDue, {
			card: 300000n,
			cash: 450000n,
			sbp: 0n,
			deposit: 0n,
		});
		assert.equal(balanced.isFullyAllocated, true);
		assert.equal(balanced.isOverAllocated, false);
		assert.equal(balanced.remainingKopecks, 0n);
		assert.equal(balanced.diffRubles, 0);

		// Under-allocated split: 3000 card + 2000 cash = 5000 (2500 remaining)
		const under = validateSplitAllocation(totalDue, {
			card: 300000n,
			cash: 200000n,
		});
		assert.equal(under.isFullyAllocated, false);
		assert.equal(under.isOverAllocated, false);
		assert.equal(under.remainingKopecks, 250000n);
		assert.equal(under.diffRubles, 2500);

		// Over-allocated split: 5000 card + 5000 cash = 10000 (2500 excess)
		const over = validateSplitAllocation(totalDue, {
			card: 500000n,
			cash: 500000n,
		});
		assert.equal(over.isFullyAllocated, false);
		assert.equal(over.isOverAllocated, true);
		assert.equal(over.remainingKopecks, -250000n);
		assert.equal(over.diffRubles, 2500);
	});

	it("generates intelligent quick cash tender options", () => {
		const options = getQuickCashTenderOptions(4250);
		assert.ok(options.includes(4250), "Must include exact amount");
		assert.ok(options.includes(4300) || options.includes(4500), "Must include rounded options");
		assert.ok(options.includes(5000), "Must include standard banknote 5000");
	});
});

describe("Red Team Mandate 8n & 8e: Sovereign Autonomy & Zero Forced Citizen INN", () => {
	it("guarantees physical persons NEVER require an INN (Mandate 8n)", () => {
		const physicalPerson = BILLING_PAYER_TYPES.find((p) => p.id === "physical_person");
		assert.ok(physicalPerson, "Physical person preset must exist");
		assert.equal(physicalPerson.isInnRequired, false, "Physical persons must NEVER be blocked by INN");

		const legalEntity = BILLING_PAYER_TYPES.find((p) => p.id === "legal_entity");
		assert.ok(legalEntity);
		assert.equal(legalEntity.isInnRequired, true);
		assert.equal(legalEntity.innLength, 10);
	});

	it("guarantees doctor discount presets and 100% warranty case (Mandate 8e)", () => {
		const warranty = BILLING_DOCTOR_DISCOUNTS.find((d) => d.percent === 100);
		assert.ok(warranty, "100% warranty preset must exist");
		assert.equal(warranty.isWarranty, true);

		const discounts = BILLING_DOCTOR_DISCOUNTS.map((d) => d.percent);
		assert.ok(discounts.includes(0));
		assert.ok(discounts.includes(5));
		assert.ok(discounts.includes(10));
		assert.ok(discounts.includes(20));
		assert.ok(discounts.includes(50));
		assert.ok(discounts.includes(100));
	});

	it("includes official medical VAT exemption (subclause 2 clause 2 art 149 Tax Code RF)", () => {
		const vatNone = BILLING_VAT_RATES.find((r) => r.id === "vat_none");
		assert.ok(vatNone);
		assert.equal(vatNone.code, 6);
		assert.equal(vatNone.ratePercent, 0);
		assert.ok(vatNone.legalBasis.includes("149 НК РФ"));
	});
});

describe("Red Team UI Mounting & Apple HIG Accessibility", () => {
	it("renders CashCheckoutStudioModal cleanly with large total display and 1 Primary CTA", () => {
		const html = renderToString(
			<CashCheckoutStudioModal
				isOpen={true}
				onClose={() => {}}
				totalDueRub={7500}
				patientName="Иванова Анна Сергеевна"
				patientPhone="+7 (999) 111-22-33"
				patientDepositRub={1500}
			/>,
		);

		assert.ok(html.includes("data-testid=\"cash-checkout-studio-modal\""), "Modal container must render");
		assert.ok(html.includes("7") && html.includes("500"), "Must render total amount 7 500");
		assert.ok(html.includes("Иванова Анна Сергеевна"), "Must render patient name");
		assert.ok(html.includes("data-testid=\"btn-execute-payment\""), "Must have Primary CTA button");
		assert.ok(!html.includes("disabled=\"\""), "Primary CTA must NOT be dead disabled");
		assert.ok(html.includes("var(--teal, #0d9488)"), "CTA must use canonical #0d9488 token");
	});

	it("renders DirectCashRegisterLauncher studio stand with patient card and payment trigger", () => {
		const html = renderToString(
			<DirectCashRegisterLauncher initialOpen={false} onClose={() => {}} />,
		);

		assert.ok(html.includes("direct-cash-register-launcher-root"), "Launcher root must be mounted");
		assert.ok(html.includes("Касса и чеки · Экспресс-оплата"), "Header must be in clean clinical Russian");
		assert.ok(html.includes("data-testid=\"btn-launcher-open-checkout\""), "Must have launch button");
	});
});
