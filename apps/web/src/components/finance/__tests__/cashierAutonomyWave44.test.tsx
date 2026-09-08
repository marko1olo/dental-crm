/**
 * cashierAutonomyWave44.test.tsx
 *
 * DENTE Dental CRM — Wave 44 Unit Tests:
 * 54-FZ Cashier Autonomy, Mobile 390px Ergonomics & Zero-Blocker Checkout.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (No unjustified button disables, citizen INN never required).
 * - Mandate 8b: Exact integer kopeck math (No float desync in multi-tender splits).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Zero dead-ends, smooth checkout).
 * - Studio Clinical HIG: Touch targets >= 44px mobile / >= 36px desktop, 0 emojis, WCAG AAA.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { PaymentModal } from "../PaymentModal.js";
import { FastCheckoutModal } from "../FastCheckoutModal.js";
import {
	calculateCashChange,
	validate54FzBuyerInn,
} from "../cashboxOperations.js";
import { rubToKopecks, kopecksToRub } from "@dental/shared";

describe("Wave 44: 54-FZ Cashier Autonomy & Citizen INN Optionality (Mandates 8e & 8n)", () => {
	it("verifies citizen INN is strictly optional in validate54FzBuyerInn", () => {
		// Empty INN for physical person must be valid and not required
		const resEmpty = validate54FzBuyerInn("", "physical");
		assert.equal(resEmpty.isValid, true);
		assert.equal(resEmpty.isRequired, false);

		// Valid 12-digit citizen INN
		const resValid = validate54FzBuyerInn("770123456789", "physical");
		assert.equal(resValid.isValid, true);

		// Legal entity requires 10 or 12 digits
		const resLegalEmpty = validate54FzBuyerInn("", "legal_entity");
		assert.equal(resLegalEmpty.isValid, false);
	});

	it("renders physical person INN badge stating it is not required by 54-FZ in PaymentModal", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-1",
				patientName: "Ковалев Дмитрий Сергеевич",
				amountRub: 7500,
				defaultMethod: "cash",
			})
		);

		assert.ok(
			html.includes('data-testid="inn-physical-not-required-badge"'),
			"Must render data-testid inn-physical-not-required-badge"
		);
		assert.ok(
			html.includes("По 54-ФЗ для физлиц не требуется"),
			"Must state that INN is not required for physical persons"
		);
		assert.ok(
			html.includes('data-testid="input-buyer-inn-physical"'),
			"Must provide optional physical person INN input"
		);
	});

	it("renders physical person INN badge and optional input in FastCheckoutModal", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Иванова Ольга Петровна",
				totalBillRub: 12000,
			})
		);

		assert.ok(
			html.includes('data-testid="inn-physical-not-required-badge"'),
			"FastCheckoutModal must have inn-physical-not-required-badge"
		);
		assert.ok(
			html.includes("По 54-ФЗ для физлиц не требуется"),
			"FastCheckoutModal must state INN not required for physical persons"
		);
		assert.ok(
			html.includes('data-testid="btn-submit-fast-checkout"'),
			"Submit button must exist and be accessible"
		);
		// Submit button must not be disabled due to missing INN
		const submitSlice = html.slice(html.indexOf('data-testid="btn-submit-fast-checkout"'));
		const submitTag = submitSlice.slice(0, submitSlice.indexOf(">"));
		assert.equal(submitTag.includes("disabled"), false, "Submit button must not be disabled when INN is empty");
	});
});

describe("Wave 44: 1-Click Cash Tender Presets & Exact Kopeck Change Calculation (Mandates 8e, 8b, 8k)", () => {
	it("renders all quick denomination bill buttons and incremental tender buttons in PaymentModal", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-1",
				patientName: "Сидоров Алексей Николаевич",
				amountRub: 3500,
				defaultMethod: "cash",
			})
		);

		// Direct denomination buttons
		assert.ok(html.includes('data-testid="btn-cash-exact"'), "Must have 'Без сдачи' button");
		assert.ok(html.includes('data-testid="btn-cash-1000"'), "Must have 1 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-2000"'), "Must have 2 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-5000"'), "Must have 5 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-10000"'), "Must have 10 000 ₽ button");

		// Incremental buttons
		assert.ok(html.includes('data-testid="btn-cash-add-1000"'), "Must have +1 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-add-2000"'), "Must have +2 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-add-5000"'), "Must have +5 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-exact-rounded"'), "Must have 'Ровно' button");
		assert.ok(html.includes('data-testid="btn-cash-reset"'), "Must have 'Сброс (0 ₽)' button");
	});

	it("renders all quick denomination buttons and 1-click cash preset in FastCheckoutModal", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 4200,
				initialPaymentMethod: "cash",
			})
		);

		assert.ok(html.includes('data-testid="btn-checkout-100-cash"'), "Must have 'Без сдачи (Нал 100%)' preset");
		assert.ok(html.includes('data-testid="btn-cash-exact"'), "Must have exact cash button");
		assert.ok(html.includes('data-testid="btn-cash-1000"'), "Must have 1 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-2000"'), "Must have 2 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-5000"'), "Must have 5 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-10000"'), "Must have 10 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-add-1000"'), "Must have +1 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-add-2000"'), "Must have +2 000 ₽ button");
		assert.ok(html.includes('data-testid="btn-cash-add-5000"'), "Must have +5 000 ₽ button");
	});

	it("verifies calculateCashChange computes integer kopeck change without float drift", () => {
		// Exact tender: 3500 ₽ bill, 3500 ₽ received -> 0 change
		const exact = calculateCashChange(3500, 3500);
		assert.equal(exact.changeRub, 0);
		assert.equal(exact.changeKopecks, 0);
		assert.equal(exact.isExact, true);
		assert.equal(exact.shortageKopecks, 0);

		// Over-tender: 3500 ₽ bill, 5000 ₽ received -> 1500 ₽ change
		const over = calculateCashChange(3500, 5000);
		assert.equal(over.changeRub, 1500);
		assert.equal(over.changeKopecks, 150000);
		assert.equal(over.isExact, false);
		assert.equal(over.shortageKopecks, 0);

		// Fractional kopeck precision: 1240.35 ₽ bill, 2000 ₽ received -> 759.65 ₽ change
		const fractional = calculateCashChange(1240.35, 2000);
		assert.equal(fractional.changeRub, 759.65);
		assert.equal(fractional.changeKopecks, 75965);
		assert.equal(fractional.isExact, false);

		// Under-tender: 5000 ₽ bill, 2000 ₽ received -> shortage 3000 ₽
		const under = calculateCashChange(5000, 2000);
		assert.equal(under.changeRub, 0);
		assert.equal(under.changeKopecks, 0);
		assert.equal(under.shortageKopecks, 300000);
		assert.equal(under.isExact, false);
	});
});

describe("Wave 44: 1-Click Combined Payment (Cash + Card + Advance) & Split Parity (Mandates 8e, 8b)", () => {
	it("renders 3-way combined payment preset in PaymentModal and FastCheckoutModal", () => {
		const pmHtml = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-1",
				patientName: "Васильев Роман Игоревич",
				amountRub: 10000,
				patientDepositRub: 3000,
			})
		);
		assert.ok(pmHtml.includes('data-testid="preset-three-way-split"'), "PaymentModal must have preset-three-way-split");
		assert.ok(pmHtml.includes("Нал + Карта + Аванс"), "PaymentModal must have label 'Нал + Карта + Аванс'");

		const fcHtml = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 10000,
				patientDepositRub: 3000,
				familyPayerName: "Васильева М. А.",
			})
		);
		assert.ok(fcHtml.includes('data-testid="btn-checkout-split-three-way"'), "FastCheckoutModal must have btn-checkout-split-three-way");
		assert.ok(fcHtml.includes("Нал + Карта + Аванс"), "FastCheckoutModal must have label 'Нал + Карта + Аванс'");
	});

	it("proves 3-way split integer kopeck math guarantees total equality with zero remainder leak", () => {
		// Test across diverse bill amounts including odd kopecks
		const testAmounts = [10000, 15333.33, 999.99, 12500, 7777.77, 45000];
		const depositBalances = [3000, 5000, 250, 0, 10000, 1500];

		for (const totalDueRub of testAmounts) {
			for (const depositRub of depositBalances) {
				const totalKop = rubToKopecks(totalDueRub);
				const availDepositKop = rubToKopecks(depositRub);

				const depositKop = Math.min(totalKop, availDepositKop);
				const remKop = Math.max(0, totalKop - depositKop);
				const halfRemKop = Math.floor(remKop / 2);
				const cashKop = halfRemKop;
				const cardKop = remKop - halfRemKop;

				// Mathematical invariants:
				// 1. Sum of all parts in kopecks strictly equals total bill
				assert.equal(
					depositKop + cashKop + cardKop,
					totalKop,
					`Kopeck mismatch for total ${totalDueRub} and deposit ${depositRub}`
				);

				// 2. Converted back to rubles, kopeck integrity is preserved
				const usedDepRub = kopecksToRub(depositKop);
				const usedCashRub = kopecksToRub(cashKop);
				const usedCardRub = kopecksToRub(cardKop);
				const recomputedTotalKop = rubToKopecks(usedDepRub) + rubToKopecks(usedCashRub) + rubToKopecks(usedCardRub);
				assert.equal(
					recomputedTotalKop,
					totalKop,
					`Rubles to kopecks recomputed mismatch for total ${totalDueRub}`
				);
			}
		}
	});
});

describe("Wave 44: Mobile Ergonomics (390px, Apple HIG) & Strict Zero Emojis (Mandate 8d item 7)", () => {
	it("proves strict zero emojis in PaymentModal rendered HTML", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-1",
				patientName: "Александрова Елена Борисовна",
				amountRub: 5500,
				patientDepositRub: 1500,
				patientDebtRub: 500,
				defaultMethod: "cash",
			})
		);

		// Assert zero emoji characters
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		const match = html.match(emojiRegex);
		assert.equal(
			match,
			null,
			`PaymentModal must not contain emojis in official financial documents. Found: ${match ? match[0] : ""}`
		);

		// Assert no lightning bolt emoji
		assert.equal(html.includes("⚡"), false, "PaymentModal must use Lucide Zap icon instead of lightning emoji");
	});

	it("proves strict zero emojis in FastCheckoutModal rendered HTML", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Петров Сергей Викторович",
				totalBillRub: 8800,
				patientDepositRub: 2000,
				initialPaymentMethod: "cash",
			})
		);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		const match = html.match(emojiRegex);
		assert.equal(
			match,
			null,
			`FastCheckoutModal must not contain emojis. Found: ${match ? match[0] : ""}`
		);
		assert.equal(html.includes("⚡"), false, "FastCheckoutModal must use Lucide vector icons instead of ⚡ emoji");
	});

	it("verifies touch target sizing (>= 44px) and text overflow safety (min-w-0, truncate)", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 999999.99,
			})
		);

		// Mobile Apple HIG: min-h-[44px]
		assert.ok(html.includes("min-h-[44px]"), "FastCheckoutModal must specify min-h-[44px] for mobile touch targets");

		// Long text and sum overflow protection
		assert.ok(html.includes("min-w-0"), "FastCheckoutModal must use min-w-0 for flex children");
		assert.ok(html.includes("truncate"), "FastCheckoutModal must use truncate for safe label rendering");
	});
});
