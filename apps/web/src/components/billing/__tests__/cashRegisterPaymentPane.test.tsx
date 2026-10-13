/**
 * apps/web/src/components/billing/__tests__/cashRegisterPaymentPane.test.tsx
 *
 * Unit tests for CashRegisterPaymentPane — Cashier Instant Terminal Cockpit.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 friction, 100% warranty treatment)
 * - Mandate 8n: Solo Doctor & Small Clinic Scale Sovereignty (deposit offset, fast bills)
 * - Mandate 8d: Studio Clinical HIG (WCAG AAA contrast, zero emojis)
 */

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { CashRegisterPaymentPane } from "../CashRegisterPaymentPane.js";

describe("Studio Clinical HIG: CashRegisterPaymentPane Cashier Terminal (Mandates 8e, 8n)", () => {
	it("renders total due, all 5 tender switcher tabs, and quick split chips", () => {
		const html = renderToString(
			React.createElement(CashRegisterPaymentPane, {
				defaultAmountRub: 8500,
				cashierFullName: "Д-р Смирнов А. И.",
				clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			}),
		);

		assert.ok(html.includes('data-testid="cash-register-payment-pane"'));
		assert.ok(html.includes('data-testid="cashier-display-total-amount"'));
		assert.ok(html.includes((8500).toLocaleString("ru-RU")));

		// 5 Tender tabs
		assert.ok(html.includes('data-testid="btn-method-tab-sbp"'));
		assert.ok(html.includes('data-testid="btn-method-tab-card"'));
		assert.ok(html.includes('data-testid="btn-method-tab-cash"'));
		assert.ok(html.includes('data-testid="btn-method-tab-deposit"'));
		assert.ok(html.includes('data-testid="btn-method-tab-split"'));

		// Quick split chips
		assert.ok(html.includes('data-testid="chip-preset-50-50-sbp"'));
		assert.ok(html.includes('data-testid="chip-preset-all-sbp"'));
		assert.ok(html.includes('data-testid="chip-preset-round-hundreds"'));
	});

	it("renders 1-click doctor discount presets and 100% warranty discount chip (Mandate 8e)", () => {
		const html = renderToString(
			React.createElement(CashRegisterPaymentPane, {
				defaultAmountRub: 15000,
			}),
		);

		assert.ok(html.includes('data-testid="btn-discount-0"'));
		assert.ok(html.includes('data-testid="btn-discount-5"'));
		assert.ok(html.includes('data-testid="btn-discount-10"'));
		assert.ok(html.includes('data-testid="btn-discount-15"'));
		assert.ok(html.includes('data-testid="btn-discount-20"'));
		assert.ok(html.includes('data-testid="btn-discount-50"'));
		assert.ok(html.includes('data-testid="btn-warranty-100-chip"'));
		assert.ok(html.includes("Гарантия 100% (0 ₽)"));
	});

	it("renders cash tender pane with denomination bills and change HUD when cash is active", () => {
		const html = renderToString(
			React.createElement(CashRegisterPaymentPane, {
				defaultAmountRub: 5200,
				initialMethod: "cash",
			}),
		);

		assert.ok(html.includes('data-testid="pane-tender-cash"'));
		assert.ok(html.includes('data-testid="btn-cash-exact-match"'));
		assert.ok(html.includes('data-testid="input-cash-tendered-amount"'));
		assert.ok(html.includes('data-testid="btn-bill-500"'));
		assert.ok(html.includes('data-testid="btn-bill-1000"'));
		assert.ok(html.includes('data-testid="btn-bill-2000"'));
		assert.ok(html.includes('data-testid="btn-bill-5000"'));
		assert.ok(html.includes('data-testid="btn-bill-10000"'));
		assert.ok(html.includes('data-testid="display-cashier-change"'));
		assert.ok(html.includes('data-testid="btn-confirm-cash-tender"'));
	});

	it("renders POS card tender pane with confirmation button when card is active", () => {
		const html = renderToString(
			React.createElement(CashRegisterPaymentPane, {
				defaultAmountRub: 12000,
				initialMethod: "card",
			}),
		);

		assert.ok(html.includes('data-testid="pane-tender-card"'));
		assert.ok(html.includes('data-testid="btn-confirm-card-pos"'));
		assert.ok(html.includes("Эквайринг 54-ФЗ"));
	});

	it("renders deposit tender pane with family wallet balances and 1-click deduction (Mandate 8n)", () => {
		const html = renderToString(
			React.createElement(CashRegisterPaymentPane, {
				defaultAmountRub: 6000,
				initialMethod: "deposit",
				patientDepositRub: 4000,
				patientFamilyBalanceRub: 5000,
			}),
		);

		assert.ok(html.includes('data-testid="pane-tender-deposit"'));
		assert.ok(html.includes((4000).toLocaleString("ru-RU")));
		assert.ok(html.includes((5000).toLocaleString("ru-RU")));
		assert.ok(html.includes('data-testid="btn-confirm-deposit-tender"'));
		assert.ok(html.includes("Списать с депозита"));
	});

	it("renders split tender pane with multi-tender inputs when split is active", () => {
		const html = renderToString(
			React.createElement(CashRegisterPaymentPane, {
				defaultAmountRub: 10000,
				initialMethod: "split",
			}),
		);

		assert.ok(html.includes('data-testid="pane-tender-split"'));
		assert.ok(html.includes('data-testid="input-split-pane-sbp"'));
		assert.ok(html.includes('data-testid="input-split-pane-cash"'));
		assert.ok(html.includes('data-testid="input-split-pane-card"'));
		assert.ok(html.includes('data-testid="btn-confirm-split-pane"'));
	});

	it("renders linked invoice header when activeInvoice is passed", () => {
		const invoice = {
			id: "inv-001-uuid",
			number: "СЧ-0042",
			patientName: "Кузнецов Дмитрий Павлович",
			totalAmountRub: 18500,
			status: "issued",
		};
		const html = renderToString(
			React.createElement(CashRegisterPaymentPane, {
				activeInvoice: invoice,
			}),
		);

		assert.ok(html.includes("Счёт СЧ-0042"));
		assert.ok(html.includes("Кузнецов Дмитрий Павлович"));
		assert.ok(html.includes((18500).toLocaleString("ru-RU")));
	});

	it("contains zero cartoon emojis in rendered output (Mandate 8d pt 7)", () => {
		const html = renderToString(
			React.createElement(CashRegisterPaymentPane, {
				defaultAmountRub: 7500,
			}),
		);

		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(html), false, "Rendered HTML must not contain cartoon emojis");
	});
});
