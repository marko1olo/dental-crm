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
import { CashShiftWidget } from "../CashShiftWidget";
import { FastCheckoutModal } from "../FastCheckoutModal";
import { FiscalReceipt54FzModal } from "../FiscalReceipt54FzModal";
import { CashRegisterModal } from "../CashRegisterModal";

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

	it("renders compact 1-line mode (36px, data-testid=cash-shift-widget) with X-report and shift toggle buttons", () => {
		const html = renderToString(
			React.createElement(CashShiftWidget, {
				compact: true,
				initialIsOpen: true,
				shiftNumber: 2,
				cashierName: "Иванова А. С.",
				cashInDrawerRub: 15000,
			})
		);

		assert.ok(html.includes('data-testid="cash-shift-widget"'));
		assert.ok(html.includes("cash-shift-compact"));
		assert.ok(html.includes('data-testid="btn-print-x-report"'));
		assert.ok(html.includes('data-testid="cash-shift-toggle-btn"'));
		assert.ok(html.includes("Печать X-отчета (без гашения)"));
		assert.ok(html.includes("Смена №2:"));
		assert.ok(html.includes("Иванова А. С."));
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
		assert.ok(html.includes("Нал + Карта + Аванс"), "Must have 3-way combined payment label");
		assert.ok(html.includes('data-testid="btn-checkout-warranty-100"'), "Must have 100% warranty preset button");
		assert.ok(html.includes("100% Гарантия (0 ₽)"), "Must have 100% warranty preset label");

		// Verify dynamic family deposit display and additive total (5000 + 10000 = 15000)
		assert.ok(html.includes("Кузнецов В. П."), "Must display family payer name dynamically without hardcode");
		assert.ok(
			html.includes((15000).toLocaleString("ru-RU", { minimumFractionDigits: 2 })),
			"Must display combined additive balance (15 000,00 ₽) dynamically with ru-RU formatting"
		);

		// 54-FZ physical persons never blocked by INN
		assert.ok(html.includes("54-ФЗ: ИНН с физлиц НЕ требуется"));
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

	it("verifies FastCheckoutModal rendering from canonical finance path", () => {
		assert.equal(typeof FastCheckoutModal, "function");
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillKop: 500000,
			})
		);
		assert.ok(html.includes("data-testid=\"btn-checkout-split-three-way\""));
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
		assert.ok(html.includes("100% Гарантия (Переделка)"));
	});
});

describe("FiscalReceipt54FzModal Refund Mode (Mandates 8e, 8b, 8n)", () => {
	it("renders FiscalReceipt54FzModal and synthesizes 804n clinical service when total is passed without line items", () => {
		const html = renderToString(
			React.createElement(FiscalReceipt54FzModal, {
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

	it("renders FiscalReceipt54FzModal in 54-FZ Income Return mode for advance refund (no line items)", () => {
		const html = renderToString(
			React.createElement(FiscalReceipt54FzModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-refund-test-1",
				patientDepositRub: 4000,
				patientName: "Сидоров Н. К.",
				initialTab: "refund",
			})
		);

		assert.ok(html.includes("Формирование чека возврата прихода"));
		assert.ok(html.includes("Тег 1054 = 2"));
		assert.ok(html.includes('data-testid="refund-advance-container"'));
	});

	it("renders FiscalReceipt54FzModal in 54-FZ Income Return mode for line items with 1-click select all", () => {
		const html = renderToString(
			React.createElement(FiscalReceipt54FzModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-refund-test-2",
				patientName: "Сидоров Н. К.",
				initialTab: "refund",
				items: [
					{
						id: "refund-srv-1",
						name: "Лечение кариеса эмали",
						priceRub: 4500,
						unitPriceRub: 4500,
						quantity: 1,
						code804n: "A16.07.002",
						discountRub: 0,
						category: "therapy",
						phase: 1,
						stageKind: "stage_1_therapy",
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

describe("CashShiftWidget — Wave 118 StomX Cash-In / Cash-Out Presets & 54-FZ Tag 1054", () => {
	it("renders compact mode with 1-click cash-in and cash-out buttons", () => {
		const html = renderToString(
			React.createElement(CashShiftWidget, {
				compact: true,
				initialIsOpen: true,
				shiftNumber: 5,
				cashierName: "Петров В. С.",
				cashInDrawerRub: 35000,
			})
		);

		assert.ok(html.includes('data-testid="btn-compact-cash-in"'), "Compact mode must include cash-in button");
		assert.ok(html.includes('data-testid="btn-compact-cash-out"'), "Compact mode must include cash-out button");
		assert.ok(html.includes("Внесение"));
		assert.ok(html.includes("Изъятие"));
	});

	it("renders standard mode with 1-click cash-in and cash-out action buttons", () => {
		const html = renderToString(
			React.createElement(CashShiftWidget, {
				compact: false,
				initialIsOpen: true,
				shiftNumber: 5,
				cashierName: "Петров В. С.",
				cashInDrawerRub: 35000,
			})
		);

		assert.ok(html.includes('data-testid="btn-open-cash-in-modal"'), "Standard mode must include cash-in button");
		assert.ok(html.includes('data-testid="btn-open-cash-out-modal"'), "Standard mode must include cash-out button");
		assert.ok(html.includes("Внесение ДС"));
		assert.ok(html.includes("Изъятие / Инкассация"));
	});

	it("renders cash flow modal in cash_in mode with all 9 StomX receipt presets & 54-FZ Tag 1054 labels", () => {
		const html = renderToString(
			React.createElement(CashShiftWidget, {
				compact: false,
				initialIsOpen: true,
				initialCashFlowModalOpen: true,
				initialCashFlowMode: "cash_in",
				shiftNumber: 5,
			})
		);

		assert.ok(html.includes('data-testid="cash-flow-modal"'));
		assert.ok(html.includes('data-testid="tab-cash-in-mode"'));
		assert.ok(html.includes('data-testid="tab-cash-out-mode"'));
		assert.ok(html.includes("Кассовое внесение наличных (Приход)"));

		// Verify 9 receipt presets
		const receiptAliases = [
			"installment_payment",
			"appointment_payment",
			"sale_product",
			"xray_payment",
			"dms_pay",
			"advance_payment",
			"cash_deposit",
			"income_employee",
			"income_contractor",
		];
		for (const alias of receiptAliases) {
			assert.ok(html.includes(`data-testid="preset-receipt-${alias}"`), `Must render preset-receipt-${alias}`);
		}

		// Verify 54-FZ Tag 1054 indicator
		assert.ok(html.includes("54-ФЗ: Тег 1054 = 1 (приход)"));
		assert.ok(html.includes("Нефискально"));

		// Verify inputs and confirm button
		assert.ok(html.includes('data-testid="input-cash-flow-amount"'));
		assert.ok(html.includes('data-testid="input-cash-flow-basis"'));
		assert.ok(html.includes('data-testid="input-cash-flow-person"'));
		assert.ok(html.includes('data-testid="btn-confirm-cash-operation"'));
		assert.ok(html.includes('data-testid="btn-cancel-cash-operation"'));
	});

	it("renders cash flow modal in cash_out mode with all 14 StomX expense presets & 54-FZ Tag 1054 labels", () => {
		const html = renderToString(
			React.createElement(CashShiftWidget, {
				compact: false,
				initialIsOpen: true,
				initialCashFlowModalOpen: true,
				initialCashFlowMode: "cash_out",
				cashInDrawerRub: 45000,
				shiftNumber: 5,
			})
		);

		assert.ok(html.includes('data-testid="cash-flow-modal"'));
		assert.ok(html.includes("Кассовое изъятие наличных (Расход)"));

		// Verify 14 expense presets
		const expenseAliases = [
			"family_transfer",
			"collection",
			"return_appointment",
			"return_advance",
			"payment_employee",
			"payment_contractor",
			"return_product",
			"service_charge",
			"cash_to_balance",
			"payment_lab",
			"block",
			"remainder",
			"dms_return",
			"xray_return",
		];
		for (const alias of expenseAliases) {
			assert.ok(html.includes(`data-testid="preset-expense-${alias}"`), `Must render preset-expense-${alias}`);
		}

		// Verify 54-FZ Tag 1054 return_income (2) and expense (3) indicators
		assert.ok(html.includes("54-ФЗ: Тег 1054 = 2 (возврат_прихода)"));
		assert.ok(html.includes("54-ФЗ: Тег 1054 = 3 (расход)"));

		// Quick chip for all drawer cash
		assert.ok(html.includes("Вся наличность"));
		assert.ok(html.includes((45000).toLocaleString("ru-RU")));
	});
});
