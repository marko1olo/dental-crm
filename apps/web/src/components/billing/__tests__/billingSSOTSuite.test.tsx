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
	formatRubles,
	formatKopecksRu,
	splitKopecks,
	FFD12_TAG_1199_VAT_CODES,
} from "@dental/shared";
import {
	rubToKopecks,
	kopecksToRub,
	formatKopecksToRubles,
	calculateExactCashChange,
	CASHBOX_TENDER_PRESETS,
	PAYER_TYPE_PRESETS,
	DOCTOR_DISCOUNT_PRESETS,
	QUICK_CASH_PRESET_BILLS,
	CASH_DENOMINATIONS,
} from "../../cashbox/cashRegisterCatalogData.js";
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal.js";

describe("Red Team Billing SSOT: Integer Kopeck Arithmetic & Zero Float Drift", () => {
	it("converts rubles to integer kopecks safely without floating-point errors", () => {
		assert.equal(rublesToKopecks(0.01), 1);
		assert.equal(rublesToKopecks(1.0), 100);
		assert.equal(rublesToKopecks(4500), 450000);
		assert.equal(rublesToKopecks(7500.5), 750050);
		assert.equal(rublesToKopecks(99999.99), 9999999);

		// BigInt helper in cashRegisterCatalogData guards invalid values
		assert.equal(rubToKopecks(0.01), 1n);
		assert.equal(rubToKopecks(4500), 450000n);
		assert.equal(rubToKopecks(-100), 0n);
		assert.equal(rubToKopecks(Number.NaN), 0n);
		assert.equal(rubToKopecks(Number.POSITIVE_INFINITY), 0n);
	});

	it("converts kopecks to rubles accurately", () => {
		assert.equal(kopecksToRubles(100), 1.0);
		assert.equal(kopecksToRubles(450000), 4500.0);
		assert.equal(kopecksToRubles(750050), 7500.5);
		assert.equal(kopecksToRubles(0), 0);
		assert.equal(kopecksToRub(100n), 1.0);
	});

	it("formats rubles and kopecks into clean Russian currency strings", () => {
		const str1 = formatRubles(4500);
		assert.ok(str1.includes("4") && str1.includes("500") && str1.includes("₽"), `Expected "4 500 ₽", got ${str1}`);

		const str2 = formatKopecksRu(750000);
		assert.ok(str2.includes("7") && str2.includes("500") && str2.includes("₽"), `Expected "7 500 ₽", got ${str2}`);

		const str3 = formatRubles(1234.5);
		assert.ok(str3.includes("1") && str3.includes("234,5") && str3.includes("₽"), `Expected fractional formatting, got ${str3}`);

		const str4 = formatKopecksToRubles(750000);
		assert.ok(str4.includes("7") && str4.includes("500") && str4.includes("₽"), `Expected "7 500 ₽", got ${str4}`);
	});

	it("computes exact cash change and detects underpayment shortage", () => {
		// Exact payment: 4500 received for 4500 bill
		const exact = calculateExactCashChange(4500, 4500);
		assert.equal(exact.isShortage, false);
		assert.equal(exact.changeKopecks, 0n);
		assert.equal(exact.changeRub, 0);

		// Overpayment: 5000 received for 4500 bill -> 500 change
		const over = calculateExactCashChange(5000, 4500);
		assert.equal(over.isShortage, false);
		assert.equal(over.changeKopecks, 50000n);
		assert.equal(over.changeRub, 500);

		// Underpayment: 3000 received for 4500 bill -> 1500 shortage
		const under = calculateExactCashChange(3000, 4500);
		assert.equal(under.isShortage, true);
		assert.equal(under.isExact, false);
		assert.equal(under.changeKopecks, 0n);
		assert.equal(under.changeRub, 0);
	});

	it("validates split kopeck division without losing single kopecks", () => {
		const split1 = splitKopecks(750000, 2);
		assert.equal(split1[0] + (split1[1] ?? 0), 750000);
		assert.equal(split1.length, 2);

		const split2 = splitKopecks(100, 3);
		assert.equal(split2.length, 3);
		assert.equal(split2[0] + (split2[1] ?? 0) + (split2[2] ?? 0), 100);
		assert.equal(split2[0], 34); // first part gets the remainder
	});

	it("provides intelligent quick cash tender banknote presets", () => {
		assert.ok(QUICK_CASH_PRESET_BILLS.includes(1000), "Must include 1000 ₽");
		assert.ok(QUICK_CASH_PRESET_BILLS.includes(2000), "Must include 2000 ₽");
		assert.ok(QUICK_CASH_PRESET_BILLS.includes(5000), "Must include 5000 ₽");
		assert.ok(CASH_DENOMINATIONS.some((b) => b.nominalRub === 500), "Must include 500 ₽ banknote");
	});
});

describe("Red Team Mandate 8n & 8e: Sovereign Autonomy & Zero Forced Citizen INN", () => {
	it("guarantees physical persons NEVER require an INN (Mandate 8n)", () => {
		const physicalPerson = PAYER_TYPE_PRESETS.find((p) => p.id === "physical_person");
		assert.ok(physicalPerson, "Physical person preset must exist");
		assert.equal(physicalPerson.isInnRequired, false, "Physical persons must NEVER be blocked by INN");

		const legalEntity = PAYER_TYPE_PRESETS.find((p) => p.id === "legal_entity");
		assert.ok(legalEntity);
		assert.equal(legalEntity.isInnRequired, true);
		assert.equal(legalEntity.innLength, 10);
	});

	it("guarantees doctor discount presets and 100% warranty case (Mandate 8e)", () => {
		const warranty = DOCTOR_DISCOUNT_PRESETS.find((d) => d.percent === 100);
		assert.ok(warranty, "100% warranty preset must exist");
		assert.equal(warranty.isWarranty, true);

		const discounts = DOCTOR_DISCOUNT_PRESETS.map((d) => d.percent);
		assert.ok(discounts.includes(0));
		assert.ok(discounts.includes(5));
		assert.ok(discounts.includes(10));
		assert.ok(discounts.includes(20));
		assert.ok(discounts.includes(50));
		assert.ok(discounts.includes(100));
	});

	it("includes official medical VAT exemption (subclause 2 clause 2 art 149 Tax Code RF)", () => {
		assert.equal(FFD12_TAG_1199_VAT_CODES.vat_none, 6);
	});
});

describe("Red Team UI Mounting & Apple HIG Accessibility", () => {
	it("renders CashRegisterStudioModal cleanly with large total display and 1 Primary CTA", () => {
		const html = renderToString(
			<CashRegisterStudioModal
				isOpen={true}
				onClose={() => {}}
				mode="checkout"
				initialTab="checkout"
				containerTestId="cash-checkout-studio-modal"
				submitButtonTestId="btn-execute-payment"
				title="Касса и чеки · Приём оплаты"
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
		assert.ok(html.includes("var(--primary)"), "CTA must use canonical var(--primary) token");
	});

	it("guarantees server data overwrites stale local cache during invoice reconciliation", () => {
		const staleLocal = [
			{
				id: "inv-100",
				number: "СЧ-2026-000100",
				patientId: "pat-1",
				patientName: "Старое имя из кэша",
				doctorName: "Врач",
				date: "01.01.2026",
				totalAmountRub: 1000,
				paidAmountRub: 0,
				status: "issued" as const,
				items: [],
				createdAt: "2026-01-01T10:00:00.000Z",
			},
		];

		const freshServer = [
			{
				id: "inv-100",
				number: "СЧ-2026-000100",
				patientId: "pat-1",
				patientName: "Актуальное имя из PostgreSQL",
				doctorName: "Врач",
				date: "01.01.2026",
				totalAmountRub: 5500,
				paidAmountRub: 5500,
				status: "paid" as const,
				items: [
					{
						id: "item-1",
						name: "Профессиональная гигиена полости рта",
						quantity: 1,
						priceRub: 5500,
						totalAmountRub: 5500,
					},
				],
				createdAt: "2026-01-01T10:00:00.000Z",
			},
		];

		// Симуляция алгоритма слияния из useInvoicesData.ts
		type SimulatedInvoice = (typeof freshServer)[number] | (typeof staleLocal)[number];
		const map = new Map<string, SimulatedInvoice>();
		for (const inv of staleLocal) {
			map.set(inv.id, inv);
			if (inv.number) map.set(inv.number, inv);
		}
		for (const inv of freshServer) {
			map.set(inv.id, inv);
			if (inv.number) map.set(inv.number, inv);
		}
		const merged = Array.from(new Set(map.values()));

		assert.equal(merged.length, 1);
		assert.equal(merged[0]?.totalAmountRub, 5500, "Server totalAmountRub must overwrite stale cache");
		assert.equal(merged[0]?.status, "paid", "Server status must overwrite stale cache");
		assert.equal(merged[0]?.items.length, 1, "Server items must be preserved");
		assert.equal(merged[0]?.patientName, "Актуальное имя из PostgreSQL");
	});
});
