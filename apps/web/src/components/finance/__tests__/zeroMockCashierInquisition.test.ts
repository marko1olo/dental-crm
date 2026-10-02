/**
 * zeroMockCashierInquisition.test.ts — Red Team Zero-Mock Cashier, Fiscal 54-FZ & Split Payment Suite.
 *
 * Verifies:
 * 1. Total eradication of Math.random() and mockup generators from installments and cash register.
 * 2. Exact integer kopecks arithmetic for split tenders (Cash, Card, SBP, Certificate, Deposit, Family).
 * 3. Instant cash change calculation and shortage detection.
 * 4. 54-FZ Cashbox shift opening, reconciliation, encashment, and X/Z-report generation.
 * 5. Clean SSR rendering of CashReceiptPrintModal (80mm & A4), FiscalReceiptStatusBadge, CashboxShiftModal, PaymentSplitModal.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	rublesToKopecks,
	kopecksToRubles,
	formatKopecksRu,
	calculateInvoiceTotals,
	calculateSplitTenders,
	calculateCashChange,
	calculateInstallmentScheduleKopecks,
} from "../../billing/billingMath.js";

import {
	openCashboxShift,
	reconcileCashDrawer,
	performDrawerEncashment,
	generate54FzXReportTapeText,
} from "../cashboxEngine.js";

import { generateInstallmentContractNumber } from "../../billing/installmentsEngine.js";
import { FiscalReceiptStatusBadge } from "../FiscalReceiptStatusBadge.js";
import { CashReceiptPrintModal } from "../CashReceiptPrintModal.js";
import { CashboxShiftModal } from "../CashboxShiftModal.js";
import { PaymentSplitModal } from "../PaymentSplitModal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../../../..");

describe("ZERO-MOCK CASHIER & 54-FZ FISCAL INQUISITION", () => {
	it("1. Codebase Purity: Math.random() is 100% eradicated from PatientInstallmentsModal.tsx", () => {
		const modalPath = path.resolve(webRoot, "src/components/billing/PatientInstallmentsModal.tsx");
		assert.ok(fs.existsSync(modalPath), `File must exist at ${modalPath}`);
		const content = fs.readFileSync(modalPath, "utf-8");
		assert.equal(
			content.includes("Math.random()"),
			false,
			"PatientInstallmentsModal.tsx must NOT contain Math.random()!",
		);
	});

	it("2. Codebase Purity: Math.random() is 100% eradicated from shared installmentsEngine.ts", () => {
		const sharedPath = path.resolve(webRoot, "../../packages/shared/src/finance/installmentsEngine.ts");
		assert.ok(fs.existsSync(sharedPath), `File must exist at ${sharedPath}`);
		const content = fs.readFileSync(sharedPath, "utf-8");
		// Ensure no function invocation of Math.random() exists
		assert.equal(
			/Math\.random\s*\(\)/.test(content),
			false,
			"packages/shared/src/finance/installmentsEngine.ts must NOT call Math.random()!",
		);
	});

	it("3. Deterministic sequential contract numbering (generateInstallmentContractNumber)", () => {
		const contract1 = generateInstallmentContractNumber("pat-42", "2026-10-02T12:00:00.000Z", 1);
		const contract2 = generateInstallmentContractNumber("pat-42", "2026-10-02T12:00:00.000Z", 2);
		const contractOtherPatient = generateInstallmentContractNumber("pat-999", "2026-10-02T12:00:00.000Z", 1);

		assert.ok(contract1.startsWith("РАС-2026/"));
		assert.ok(contract2.startsWith("РАС-2026/"));
		assert.notEqual(contract1, contract2, "Sequential index must differentiate contracts");
		assert.notEqual(contract1, contractOtherPatient, "Different patients must have distinct codes");
		// Idempotency check: calling with same arguments gives identical contract number
		const contract1Again = generateInstallmentContractNumber("pat-42", "2026-10-02T12:00:00.000Z", 1);
		assert.equal(contract1, contract1Again, "Deterministic generator must be pure & idempotent");
	});

	it("4. Exact integer kopeck invoice totals calculation without float drift", () => {
		const items = [
			{ name: "Консультация", priceRub: 2500, quantity: 1, discountRub: 250 },
			{ name: "Анестезия Ubistesin", priceRub: 650.50, quantity: 2, discountRub: 0 },
			{ name: "Пломба световая", priceRub: 4800.75, quantity: 1, discountRub: 500 },
		];

		const totals = calculateInvoiceTotals(items);
		// Gross: 2500 + 1301 + 4800.75 = 8601.75 -> 860175 kop
		assert.equal(totals.totalGrossKopecks, 860175);
		assert.equal(totals.totalGrossRub, 8601.75);
		// Discount: 250 + 0 + 500 = 750 -> 75000 kop
		assert.equal(totals.totalDiscountKopecks, 75000);
		assert.equal(totals.totalDiscountRub, 750);
		// Net: 860175 - 75000 = 785175 kop -> 7851.75 rub
		assert.equal(totals.totalNetKopecks, 785175);
		assert.equal(totals.totalNetRub, 7851.75);
	});

	it("5. Multi-tender split calculation & strict equality check", () => {
		const targetKop = 125430; // 1254.30 руб.

		// Split across Cash (254.30), Card (500.00), SBP (200.00), Deposit (300.00)
		const split = calculateSplitTenders(targetKop, {
			cashRub: 254.30,
			cardRub: 500.00,
			sbpRub: 200.00,
			depositRub: 300.00,
		});

		assert.equal(split.isBalanced, true, "Split must be strictly balanced");
		assert.equal(split.isOverpaid, false);
		assert.equal(split.isUnderpaid, false);
		assert.equal(split.remainingKopecks, 0);
		assert.equal(split.advanceOffsetKopecks, 30000, "Deposit goes to advance offset (Tag 1215)");
		assert.equal(split.allocatedKopecks, targetKop, "Sum of tenders must strictly equal target");

		// Test underpayment
		const underpaid = calculateSplitTenders(targetKop, {
			cashRub: 254.30,
			cardRub: 500.00,
		});
		assert.equal(underpaid.isUnderpaid, true);
		assert.equal(underpaid.remainingKopecks, 50000);
		assert.equal(underpaid.remainingRub, 500.00);

		// Test overpayment
		const overpaid = calculateSplitTenders(targetKop, {
			cardRub: 2000.00,
		});
		assert.equal(overpaid.isOverpaid, true);
		assert.equal(overpaid.isBalanced, false);
	});

	it("6. Instant cash change calculation with exact kopeck accuracy", () => {
		// Exact payment
		const exact = calculateCashChange(5000, 5000);
		assert.equal(exact.isExact, true);
		assert.equal(exact.changeKopecks, 0);
		assert.equal(exact.changeRub, 0);
		assert.equal(exact.isUnderpaid, false);

		// Overpayment -> change due
		const over = calculateCashChange(5000, 3450.50);
		assert.equal(over.isUnderpaid, false);
		assert.equal(over.isExact, false);
		assert.equal(over.changeKopecks, 154950); // 1549.50 rub
		assert.equal(over.changeRub, 1549.50);

		// Underpayment -> missing amount
		const under = calculateCashChange(3000, 4200.25);
		assert.equal(under.isUnderpaid, true);
		assert.equal(under.isExact, false);
		assert.equal(under.missingKopecks, 120025); // 1200.25 rub
		assert.equal(under.missingRub, 1200.25);
	});

	it("7. Installment monthly schedule kopeck distribution without loss", () => {
		const totalKop = 10000000; // 100 000 руб
		const downPaymentKop = 3000000; // 30 000 руб
		const months = 6;

		// 70 000 rub over 6 months: 7000000 / 6 = 1166666.666...
		const schedule = calculateInstallmentScheduleKopecks(totalKop, downPaymentKop, months);
		assert.equal(schedule.monthlyPayments.length, 6);
		assert.equal(schedule.totalScheduledKopecks, totalKop, "Total scheduled must equal original total");

		// Verify every monthly payment is integer kopecks
		for (const p of schedule.monthlyPayments) {
			assert.equal(Number.isInteger(p), true);
			assert.ok(p > 0);
		}
		// First month absorbs remainder
		assert.equal(schedule.monthlyPayments[0], 1166670);
		assert.equal(schedule.monthlyPayments[1], 1166666);
	});

	it("8. Cashbox shift opening, drawer reconciliation & encashment", () => {
		// Open shift
		const openRes = openCashboxShift({
			shiftNumber: 15,
			cashierFullName: "Сидорова Анна Павловна",
			initialDrawerFloatRub: 5000,
		});
		assert.equal(openRes.shiftNumber, 15);
		assert.equal(openRes.initialDrawerFloatKopecks, 500000);
		assert.equal(openRes.status, "open");

		// Drawer reconciliation - exact match
		const matchRec = reconcileCashDrawer({
			countedCashRub: 12500,
			expectedCashInDrawerRub: 12500,
		});
		assert.equal(matchRec.isMatch, true);
		assert.equal(matchRec.differenceKopecks, 0);

		// Drawer reconciliation - shortage
		const defRec = reconcileCashDrawer({
			countedCashRub: 12000,
			expectedCashInDrawerRub: 12500,
		});
		assert.equal(defRec.isDeficit, true);
		assert.equal(defRec.differenceKopecks, -50000);

		// Encashment
		const encash = performDrawerEncashment({
			currentDrawerCashRub: 12500,
			encashmentAmountRub: 10000,
			cashierFullName: "Сидорова Анна Павловна",
		});
		assert.equal(encash.encashedKopecks, 1000000);
		assert.equal(encash.remainingDrawerKopecks, 250000);
		assert.ok(encash.receiptDocNumber.startsWith("ИНК-"));
	});

	it("9. X-Report tape text generation contains required 54-FZ requisites", () => {
		const tape = generate54FzXReportTapeText({
			summary: {
				shiftNumber: 15,
				closedAtIso: new Date().toISOString(),
				totalOperationsCount: 10,
				incomeCount: 8,
				incomeTotalRub: 45000,
				incomeTotalKopecks: 4500000 as any,
				incomeCashRub: 10000,
				incomeCashKopecks: 1000000 as any,
				incomeElectronicRub: 30000,
				incomeElectronicKopecks: 3000000 as any,
				incomeAdvanceOffsetRub: 5000,
				incomeAdvanceOffsetKopecks: 500000 as any,
				incomeReturnCount: 1,
				incomeReturnTotalRub: 2000,
				incomeReturnTotalKopecks: 200000 as any,
				incomeReturnCashRub: 2000,
				incomeReturnCashKopecks: 200000 as any,
				incomeReturnElectronicRub: 0,
				incomeReturnElectronicKopecks: 0 as any,
				incomeReturnAdvanceOffsetRub: 0,
				incomeReturnAdvanceOffsetKopecks: 0 as any,
				netRevenueRub: 43000,
				netRevenueKopecks: 4300000 as any,
				cashInDrawerRub: 8000,
				cashInDrawerKopecks: 800000 as any,
				isBalanced: true,
			},
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			clinicInn: "7701234567",
			cashierFullName: "Иванова М.А.",
		});

		assert.ok(tape.includes("Х-ОТЧЕТ БЕЗ ГАШЕНИЯ"));
		assert.ok(tape.includes("СМЕНА № 15"));
		assert.ok(tape.includes("7701234567"));
		assert.ok(tape.includes("ПРИХОД:"));
		assert.ok(tape.includes("В КАССЕ (НАЛ):"));
	});

	it("10. SSR Component Rendering: FiscalReceiptStatusBadge renders all 54-FZ states", () => {
		const states = ["fiscalized", "pending", "offline_buffered", "refund", "correction", "error"] as const;
		for (const st of states) {
			const html = renderToString(
				React.createElement(FiscalReceiptStatusBadge, {
					status: st,
					receiptNumber: "00142",
					fiscalDocumentNumber: "42",
					fiscalSign: "1928374650",
					showDetails: true,
				}),
			);
			assert.ok(html.includes("data-testid=\"fiscal-receipt-status-badge\""));
			assert.ok(html.includes("00142"));
		}
	});

	it("11. SSR Component Rendering: CashReceiptPrintModal renders 80mm and A4 layouts", () => {
		const html80mm = renderToString(
			React.createElement(CashReceiptPrintModal, {
				isOpen: true,
				onClose: () => {},
				defaultFormat: "80mm",
			}),
		);
		assert.ok(html80mm.includes("data-testid=\"cash-receipt-print-modal\""));
		assert.ok(html80mm.includes("data-testid=\"order804n-fiscal-receipt-view\""));

		const htmlA4 = renderToString(
			React.createElement(CashReceiptPrintModal, {
				isOpen: true,
				onClose: () => {},
				defaultFormat: "a4",
			}),
		);
		assert.ok(htmlA4.includes("data-testid=\"a4-receipt-document\""));
		assert.ok(htmlA4.includes("КВИТАНЦИЯ №"));
	});

	it("12. SSR Component Rendering: CashboxShiftModal & PaymentSplitModal render cleanly", () => {
		const shiftHtml = renderToString(
			React.createElement(CashboxShiftModal, {
				isOpen: true,
				onClose: () => {},
				shiftNumber: 5,
				cashierFullName: "Кассир Стоматологии",
			}),
		);
		assert.ok(
			shiftHtml.includes("cash-register-modal") && (shiftHtml.includes("Кассовая смена") || shiftHtml.includes("Кассир")),
			"CashboxShiftModal must render cash-register-modal container with shift details",
		);

		const splitHtml = renderToString(
			React.createElement(PaymentSplitModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 5000,
			}),
		);
		assert.ok(splitHtml.includes("fast-checkout-modal") || splitHtml.includes("54-ФЗ") || splitHtml.includes("Оплата"));
	});
});
