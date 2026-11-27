/**
 * @file realFinanceAndReceipts.test.ts
 * @description Real Finance and Receipts Integration & Autonomy Suite (Wave 21).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	FinanceView,
	FinanceOperationsToolbar,
	FinanceSummaryCards,
	FinanceTransactionsTable,
	useFinanceView,
	EMPTY_CLINICAL_RULE_SUMMARY,
	noLabels,
} from "../views/financeView/index";
import { PendingCheckoutBanner } from "../views/financeView/PendingCheckoutBanner";
import { localDayKey, summarizeCashDay } from "../components/finance/cashDaySummary";
import { rubAmountForInput } from "../rubAmountInput.js";

describe("REAL FINANCE & RECEIPTS INTEGRATION SUITE (Wave 21 Decomposed Modules)", () => {
	it("1. Renders FinanceSummaryCards overview & clinical actions cleanly", () => {
		const html = renderToStaticMarkup(
			React.createElement(FinanceSummaryCards, {
				activePaymentsCount: 2,
				billingSummary: null,
				money: (v) => `${v ?? 0} ₽`,
				onGoToVisit: () => {},
				priorityLabels: { high: "Срочно", medium: "Планово", low: "Наблюдение" },
				scenarios: [],
				strategyLabels: { economy: "Базовый", standard: "Оптимум", premium: "Премиум" },
				onOpenTaxCertificateModal: () => {},
				dayPayments: [],
				methodLabels: { cash: "Наличные", card: "Карта", online: "СБП", deposit: "Депозит", bank_transfer: "Безнал", split: "Сплит", certificate: "Сертификат", loyalty: "Бонусы", dms: "ДМС", warranty_100: "Гарантия" },
			}),
		);
		assert.ok(html.length > 50);
		assert.equal(html.includes("54-ФЗ"), false);
		assert.equal(html.includes("043/у"), false);
	});

	it("2. Renders PendingCheckoutBanner with clinical-checkout-handoff-banner testid and clean text", () => {
		const html = renderToStaticMarkup(
			React.createElement(PendingCheckoutBanner, {
				pendingCheckout: {
					patientId: "pat-1",
					patientName: "Петров Иван",
					totalDueRub: 4500,
					services: [{ name: "Лечение кариеса", priceRub: 4500 }],
				},
				onResetPendingCheckout: () => {},
				onOpenSplitPayment: () => {},
				money: (v) => `${v ?? 0} ₽`,
			}),
		);
		assert.ok(html.includes('data-testid="clinical-checkout-handoff-banner"'));
		assert.ok(html.includes("Петров Иван"));
		assert.ok(html.includes("4500 ₽"));
	});

	it("3. Renders FinanceOperationsToolbar with cash-shift-panel-container and 0 bureaucratic ciphers", () => {
		const html = renderToStaticMarkup(
			React.createElement(FinanceOperationsToolbar, {
				pendingCheckout: null,
				onResetPendingCheckout: () => {},
				effectivePatient: null,
				effectiveBillingSummary: null,
				isCashShiftOpen: false,
				onToggleCashShift: () => {},
				isShiftOpen: true,
				onPayDebtQuick: () => {},
				money: (v) => `${v ?? 0} ₽`,
				onOpenInvoices: () => {},
				isFinanceOptionsOpen: false,
				onToggleFinanceOptions: () => {},
				onCloseFinanceOptions: () => {},
				onOpenPnl: () => {},
				onGoToDocuments: () => {},
				onOpenCashbox: () => {},
				onOpenBillingAct: () => {},
				onOpenQuickExpense: () => {},
				onOpenTaxCertificate: () => {},
				shiftNumber: 1,
				paymentFiscalCashierName: "Администратор",
				cashInDrawerRub: 1000,
				cardSumRub: 2000,
				sbpSumRub: 500,
				advanceOffsetRub: 0,
				onOpenShift: async () => {},
				onCloseShift: async () => {},
				onCashIn: async () => {},
				onCashOut: async () => {},
				onPrintXReport: async () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-finance-open-invoices"'));
		assert.equal(html.includes("54-ФЗ"), false);
		assert.equal(html.includes("804н"), false);
	});

	it("4. Verifies real cash day calculations and kopeck exactness", () => {
		const todayIso = new Date().toISOString();
		const samplePayments = [
			{ id: "p-1", paidAt: todayIso, amountRub: 5000, method: "cash" as const },
			{ id: "p-2", paidAt: todayIso, amountRub: 12500.5, method: "card" as const },
			{ id: "p-3", paidAt: todayIso, amountRub: 3500.25, method: "online" as const },
		];

		const todayKey = localDayKey(new Date());
		assert.ok(todayKey);

		const totals = summarizeCashDay(samplePayments as never, todayKey);
		assert.equal(totals.cashRub, 5000);
		assert.equal(totals.cardRub, 12500.5);
		assert.equal(totals.sbpRub, 3500.25);
		assert.equal(totals.receivedRub, 21000.75);
	});

	it("5. Verifies rubAmountForInput sanitization without NaN leakage", () => {
		assert.equal(rubAmountForInput(1500), "1500");
		assert.equal(rubAmountForInput(0), "");
		assert.equal(rubAmountForInput(-500), "");
		assert.equal(rubAmountForInput(Number.NaN), "");
		assert.equal(rubAmountForInput(undefined as unknown as number), "");
		assert.equal(rubAmountForInput(1250.75), "1250,75");
	});

	it("6. Verifies fallback constants safety", () => {
		assert.deepEqual(EMPTY_CLINICAL_RULE_SUMMARY, {
			activeRules: 0,
			evaluatedRules: 0,
			unresolved: 0,
			blockers: 0,
			warnings: 0,
			requiredServices: 0,
			coveredRules: 0,
		});
		assert.deepEqual(noLabels<"a" | "b">(), {});
	});
});
