/**
 * paymentModalStudioHig.test.tsx
 *
 * Unit tests for Studio Clinical HIG PaymentModal, ReceiptPreview, and CashRegisterDrawer.
 *
 * Governed by:
 * - 54-ФЗ (ФФД 1.2): mandatory requisites, full settlement sign, VAT exemption (ст. 149 НК РФ), FNS verification QR code.
 * - Mandate 8e: Doctor & Cashier autonomy (0 friction, 1-click fast checkout, citizen INN never required).
 * - Mandate 8d: Studio Clinical HIG (WCAG AAA contrast, zero emojis, compact desktop density).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { PaymentModal } from "../PaymentModal.js";
import { ReceiptPreview } from "../ReceiptPreview.js";
import { CashRegisterDrawer } from "../CashRegisterDrawer.js";

describe("Studio Clinical HIG: PaymentModal 1-Click Operations (Mandates 8e, 8n)", () => {
	it("renders large total due, 1-click tenders, and quick denomination bills", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-studio-1",
				patientName: "Васильев Петр Сергеевич",
				amountRub: 12500,
				defaultMethod: "cash",
			})
		);

		// Must render studio modal root
		assert.ok(html.includes('data-testid="payment-modal-studio"'));

		// Must render prominent total due
		assert.ok(html.includes((12500).toLocaleString("ru-RU")));

		// 1-Click tender tabs
		assert.ok(html.includes('data-testid="tab-method-card"'));
		assert.ok(html.includes('data-testid="tab-method-sbp"'));
		assert.ok(html.includes('data-testid="tab-method-cash"'));
		assert.ok(html.includes('data-testid="tab-method-split"'));

		// Cash tender controls: exact match & quick bills
		assert.ok(html.includes('data-testid="btn-cash-exact"'), "Must render 1-click exact match button");
		assert.ok(html.includes('data-testid="btn-cash-1000"'), "Must render 1 000 ₽ bill chip");
		assert.ok(html.includes('data-testid="btn-cash-2000"'), "Must render 2 000 ₽ bill chip");
		assert.ok(html.includes('data-testid="btn-cash-5000"'), "Must render 5 000 ₽ bill chip");
		assert.ok(html.includes('data-testid="btn-cash-10000"'), "Must render 10 000 ₽ bill chip");

		// Cash input
		assert.ok(html.includes('data-testid="input-cash-received"'));

		// Fixed footer with submit button
		assert.ok(html.includes('data-testid="payment-modal-fixed-footer"'));
		assert.ok(html.includes('data-testid="btn-cash-submit-footer"'));
	});

	it("renders dynamic vector SVG QR code in SBP payment mode", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-studio-2",
				patientName: "Морозова Елена Павловна",
				amountRub: 8000,
				defaultMethod: "sbp_qr",
			})
		);

		assert.ok(html.includes('data-testid="sbp-qr-embedded-container"'));
		assert.ok(html.includes('data-testid="sbp-dynamic-qr-svg"'));
		assert.ok(html.includes('data-testid="btn-check-sbp-status"'));
		assert.ok(html.includes('data-testid="btn-manual-confirm-sbp"'));
		assert.ok(html.includes('data-testid="btn-sbp-submit-footer"'));
	});

	it("renders compact single-row doctor discounts without accordion clutter", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-studio-3",
				patientName: "Смирнова Ольга Игоревна",
				amountRub: 15000,
				initialDiscountPercent: 10,
				initialDiscountReason: "Постоянный пациент",
			})
		);

		assert.ok(html.includes('data-testid="payment-modal-presets-bar"'));
		assert.ok(html.includes('data-testid="preset-discount-0"'));
		assert.ok(html.includes('data-testid="preset-discount-5"'));
		assert.ok(html.includes('data-testid="preset-discount-10"'));
		assert.ok(html.includes('data-testid="preset-discount-15"'));
		assert.ok(html.includes('data-testid="preset-discount-20"'));
		assert.ok(html.includes('data-testid="preset-discount-50"'));
		assert.ok(html.includes('data-testid="preset-warranty-100"'));
		assert.ok(html.includes('data-testid="input-discount-custom-percent"'));
		assert.ok(html.includes('data-testid="badge-discount-active"'));
	});

	it("renders 54-FZ citizen INN badge confirming it is strictly optional", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				amountRub: 5000,
			})
		);

		assert.ok(html.includes('data-testid="inn-physical-not-required-badge"'));
		assert.ok(html.includes("По 54-ФЗ для физлиц не требуется"));
		assert.ok(html.includes('data-testid="input-buyer-inn-physical"'));
	});

	it("contains zero cartoon emojis in rendered output (Mandate 8d pt 7)", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				amountRub: 10000,
			})
		);

		// Regex testing for emoji ranges
		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(html), false, "Rendered PaymentModal HTML must not contain cartoon emojis");
	});
});

describe("Studio Clinical HIG: ReceiptPreview 54-FZ Fiscal Requisites (Mandate 8d pt 5)", () => {
	it("renders authentic 80mm thermal tape with full settlement sign, VAT exemption, and FNS QR", () => {
		const html = renderToString(
			React.createElement(ReceiptPreview, {
				receiptNumber: "0104",
				shiftNumber: 14,
				clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				totalDueRub: 12500,
				patientName: "Смирнов Алексей Игоревич",
				payments: { cardRub: 12500 },
			})
		);

		assert.ok(html.includes('data-testid="receipt-54fz-preview-container"'));
		assert.ok(html.includes("receipt-tape-paper"), "Must have thermal paper tape class");
		assert.ok(html.includes("КАССОВЫЙ ЧЕК / ПРИХОД"));
		assert.ok(html.includes("ПОЛНЫЙ РАСЧЕТ (Тег 1214)"));
		assert.ok(html.includes("БЕЗ НДС (пп. 2 п. 2 ст. 149 НК РФ)"));
		assert.ok(html.includes("ВЫЧЕТ: КОД 01"));
		assert.ok(html.includes("БЕЗНАЛИЧНЫМИ / КАРТА (Тег 1081)"));
		assert.ok(html.includes('data-testid="fns-receipt-verification-qr"'), "Must render FNS QR code container");
		assert.ok(html.includes('data-testid="btn-format-80mm"'));
		assert.ok(html.includes('data-testid="btn-format-a4"'));
		assert.ok(html.includes('data-testid="btn-print-receipt-tape"'));
		assert.ok(html.includes('data-testid="btn-copy-receipt-text"'));
	});

	it("switches cleanly between 80mm tape and A4 document formats", () => {
		const htmlA4 = renderToString(
			React.createElement(ReceiptPreview, {
				totalDueRub: 9000,
				defaultFormat: "a4",
			})
		);

		assert.ok(htmlA4.includes("ТОВАРНЫЙ ЧЕК / СПРАВКА ОБ ОПЛАТЕ МЕДУСЛУГ"));
		assert.ok(htmlA4.includes("Код услуги"));
	});
});

describe("Studio Clinical HIG: CashRegisterDrawer Shift Telemetry & Operations (Mandates 8e, 8n)", () => {
	it("renders shift status, cash in drawer, quick 1-click operations, and recent receipts", () => {
		const html = renderToString(
			React.createElement(CashRegisterDrawer, {
				isOpen: true,
				onClose: () => {},
				cashierFullName: "Д-р Смирнов А. И.",
			})
		);

		assert.ok(html.includes('data-testid="cash-register-drawer"'));
		assert.ok(html.includes("Смена № 14 открыта"));
		assert.ok(html.includes('data-testid="shift-grand-total"'));
		assert.ok(html.includes('data-testid="cash-in-drawer-amount"'));
		assert.ok(html.includes('data-testid="btn-x-report"'), "Must render X-report button");
		assert.ok(html.includes('data-testid="btn-z-report"'), "Must render Z-report button");
		assert.ok(html.includes('data-testid="shift-receipt-item-0104"'), "Must render recent receipt in list");
		assert.ok(html.includes('data-testid="btn-drawer-new-payment"'), "Must render 1-click new payment button");
	});
});
