/**
 * cashShiftAutonomyAndFiscal54Fz.test.tsx
 *
 * DENTE Dental CRM — Unit Tests for 54-FZ Cash Shift, Express Checkout & Refund Autonomy.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (No unjustified button disables, no INN demand for B2C).
 * - Mandate 8b: Exact integer kopecks math.
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Zero dead-ends).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { CashShiftWidget } from "../components/finance/CashShiftWidget";
import { FastCheckoutModal } from "../components/payments/checkout/FastCheckoutModal";
import FastCheckoutModalReexport from "../components/payments/FastCheckoutModal";
import { ExpressFiscalReceiptModal } from "../components/finance/ExpressFiscalReceiptModal";
import { RefundReceiptModal } from "../components/finance/RefundReceiptModal";
import CashRegisterModalReexport from "../components/cash/CashRegisterModal";
import { CashRegisterModal } from "../components/finance/CashRegisterModal";

describe("CashShiftWidget — Mandate 8e Autonomy & X-Report Verification", () => {
	it("renders X-report button enabled when shift is closed (isProcessing=false)", () => {
		const html = renderToString(
			React.createElement(CashShiftWidget, {
				initialIsOpen: false,
				shiftNumber: 4,
				cashierName: "Иванова А. С.",
				cashInDrawerRub: 0,
			})
		);

		// Button should be in DOM and NOT have disabled attribute
		assert.ok(html.includes('data-testid="btn-print-x-report"'));
		const buttonHtml = html.slice(html.indexOf('data-testid="btn-print-x-report"'));
		const buttonTag = buttonHtml.slice(0, buttonHtml.indexOf(">"));
		assert.equal(buttonTag.includes("disabled"), false, "X-report button must not be disabled when shift is closed");
		assert.ok(html.includes("Печать X-отчета (без гашения)"));
	});
});

describe("FastCheckoutModal — 1-Click Presets & Combined Payment Autonomy (Mandates 8e, 8b, 8n)", () => {
	it("renders 1-click 'Без сдачи' and 'Нал + Карта + Аванс' presets", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillKop: 1500000,
				patientName: "Кузнецов И. В.",
				patientDepositRub: 5000,
				patientFamilyBalanceRub: 10000,
				familyPayerName: "Кузнецов В. П.",
			})
		);

		// Verify presets exist
		assert.ok(html.includes('data-testid="btn-checkout-100-cash"'), "Must have cash preset button");
		assert.ok(html.includes("Без сдачи (Нал 100%)"), "Cash preset must be labeled 'Без сдачи'");
		assert.ok(html.includes('data-testid="btn-checkout-100-card"'), "Must have 100% card button");
		assert.ok(html.includes('data-testid="btn-checkout-split-three-way"'), "Must have 3-way combined payment button");
		assert.ok(html.includes("⚡ Нал + Карта + Аванс"), "Must have 3-way combined payment label");
		assert.ok(html.includes('data-testid="btn-checkout-warranty-100"'), "Must have 100% warranty preset button");
		assert.ok(html.includes("⚡ 100% Гарантия (0 ₽)"), "Must have 100% warranty preset label");

		// Verify dynamic family deposit display and additive total (5000 + 10000 = 15000)
		assert.ok(html.includes("Кузнецов В. П."), "Must display family payer name dynamically without hardcode");
		assert.ok(
			html.includes((15000).toLocaleString("ru-RU", { minimumFractionDigits: 2 })),
			"Must display combined additive balance (15 000,00 ₽) dynamically with ru-RU formatting"
		);

		// 54-FZ physical persons never blocked by INN
		assert.ok(html.includes("✓ 54-ФЗ: ИНН с физлиц НЕ требуется"));
	});

	it("renders 100% warranty button when total due is 0 ₽", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillKop: 0,
				patientName: "Кузнецов И. В.",
			})
		);

		assert.ok(html.includes("Закрыть визит: 100% Гарантия / Скидка (0 ₽)"));
	});

	it("verifies transparent re-export at apps/web/src/components/payments/FastCheckoutModal.tsx", () => {
		assert.equal(typeof FastCheckoutModalReexport, "function");
		const html = renderToString(
			React.createElement(FastCheckoutModalReexport, {
				isOpen: true,
				onClose: () => {},
				totalBillKop: 500000,
			})
		);
		assert.ok(html.includes('data-testid="btn-checkout-split-three-way"'));
	});
});

describe("CashRegisterModal — Multi-Tender & Doctor Autonomy Presets", () => {
	it("renders 1-click presets: Без сдачи, 100% карта, Аванс + Карта, Сем. счет + Карта, 100% Гарантия, Депозит + Карта + Нал", () => {
		const html = renderToString(
			React.createElement(CashRegisterModal, {
				isOpen: true,
				onClose: () => {},
				totalAmountRub: 20000,
				patientDepositRub: 5000,
				patientFamilyBalanceRub: 7000,
			})
		);

		assert.ok(html.includes('data-testid="preset-exact-cash"'));
		assert.ok(html.includes('data-testid="preset-full-card"'));
		assert.ok(html.includes('data-testid="preset-deposit-card"'));
		assert.ok(html.includes('data-testid="preset-family-card"'));
		assert.ok(html.includes('data-testid="preset-three-way"'));
		assert.ok(html.includes('data-testid="preset-warranty-100"'));
		assert.ok(html.includes('data-testid="btn-discount-warranty"'));
		assert.ok(html.includes("★ 100% Гарантия (Переделка)"));
	});

	it("verifies transparent re-export at apps/web/src/components/cash/CashRegisterModal.tsx", () => {
		assert.equal(typeof CashRegisterModalReexport, "function");
		const html = renderToString(
			React.createElement(CashRegisterModalReexport, {
				isOpen: true,
				onClose: () => {},
				totalAmountRub: 10000,
			})
		);
		assert.ok(html.includes('data-testid="preset-exact-cash"'));
	});
});

describe("ExpressFiscalReceiptModal & RefundReceiptModal (Mandates 8e, 8b, 8n)", () => {
	it("renders ExpressFiscalReceiptModal and synthesizes 804n clinical service when total is passed without line items", () => {
		const html = renderToString(
			React.createElement(ExpressFiscalReceiptModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 7500,
				patientName: "Алексеева О. М.",
				initialTab: "act",
			})
		);

		assert.ok(html.includes("Стоматологические медицинские услуги (клинический прием)"));
		assert.ok(
			html.includes((7500).toLocaleString("ru-RU", { minimumFractionDigits: 2 })),
			"Must display total 7 500,00 ₽ with ru-RU number format"
		);
		assert.ok(html.includes("Алексеева О. М."));
	});

	it("renders RefundReceiptModal in 54-FZ Income Return mode for advance refund (no line items)", () => {
		const html = renderToString(
			React.createElement(RefundReceiptModal, {
				isOpen: true,
				onClose: () => {},
				patientDepositRub: 4000,
				patientName: "Сидоров Н. К.",
			})
		);

		assert.ok(html.includes("Формирование чека возврата прихода"));
		assert.ok(html.includes("Тег 1054 = 2"));
		assert.ok(html.includes('data-testid="refund-advance-container"'));
	});

	it("renders RefundReceiptModal in 54-FZ Income Return mode for line items with 1-click select all", () => {
		const html = renderToString(
			React.createElement(RefundReceiptModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Сидоров Н. К.",
				items: [
					{
						id: "refund-srv-1",
						name: "Лечение кариеса эмали",
						priceRub: 4500,
						quantity: 1,
						code804n: "A16.07.002",
					},
				],
			})
		);

		assert.ok(html.includes("Формирование чека возврата прихода"));
		assert.ok(html.includes("Тег 1054 = 2"));
		assert.ok(html.includes('data-testid="btn-refund-select-all"'));
		assert.ok(html.includes('data-testid="btn-refund-deselect-all"'));
		assert.ok(html.includes("Лечение кариеса эмали"));
	});
});
