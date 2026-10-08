/**
 * zeroMockCashierInquisition.test.ts
 *
 * Inquisitorial verification of Cashier, Fiscal 54-FZ, Split Payments,
 * Warranty 100% Zero-KKT Acts (Mandate 8e), and eradication of hardcoded mocks.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	generateFiscalReceipt54Fz,
	calculateSplitPaymentAllocation,
	type FiscalReceipt54FzResult,
} from "../order804nFiscalEngine.js";
import { CashReceiptPrintModal } from "../CashReceiptPrintModal.js";
import { InvoiceCardItem } from "../../billing/InvoiceCardItem.js";
import { PatientInstallmentsModal } from "../../billing/PatientInstallmentsModal.js";
import type { BillingInvoice } from "../../billing/invoiceTypes.js";
import { rubToKopecks, type Kopecks } from "@dental/shared";

describe("Cashier & 54-FZ Fiscal Inquisition: Zero-Mocks & Mandate 8e Compliance", () => {
	it("1. Mandate 8e: 0 ₽ Warranty invoice generates internal warranty act without physical KKT receipt", () => {
		const warrantyReceipt = generateFiscalReceipt54Fz({
			items: [
				{
					id: "w-1",
					name: "Гарантийная замена реставрации зуба 16",
					code804n: "A16.07.002",
					quantity: 1,
					unitPriceRub: 0,
					unitPriceKopecks: 0 as Kopecks,
					discountRub: 0,
					discountKopecks: 0 as Kopecks,
					grossRub: 0,
					grossKopecks: 0 as Kopecks,
					amountRub: 0,
					amountKopecks: 0 as Kopecks,
					vatRate: "vat_none",
					taxRateKopecks: 0 as Kopecks,
					paymentSubject: "service",
					paymentMethod: "full_payment",
					quantityMeasure: "piece",
					taxDeductionCategory: "1",
				},
			],
			splitPayment: {},
			patientId: "pat-warranty-01",
			patientName: "Петров Петр Петрович",
			customerContact: "+7 (900) 111-22-33",
		});

		assert.equal(warrantyReceipt.isWarrantyZeroAct, true, "Must flag isWarrantyZeroAct = true");
		assert.equal(warrantyReceipt.totalRub, 0, "Total must be 0 ₽");
		assert.equal(warrantyReceipt.totalKopecks, 0, "Total must be 0 kopecks");
		assert.ok(
			warrantyReceipt.receiptNumber.startsWith("АКТ-ГАР"),
			`Expected receipt number to start with АКТ-ГАР, got ${warrantyReceipt.receiptNumber}`,
		);
		assert.equal(warrantyReceipt.fnSerial, "0000000000000000", "Bypassed FN serial");
		assert.equal(warrantyReceipt.fiscalDocumentNumber, "0", "Bypassed FD number");
		assert.equal(warrantyReceipt.fiscalSign, "0000000000", "Bypassed FPD");
		assert.equal(warrantyReceipt.ofdUrl, "", "OFD URL must be empty for 0 ₽ internal acts");
	});

	it("2. Mandate 8e: Physical individual buyer does NOT require mandatory INN (Tag 1228 optional)", () => {
		const individualReceipt = generateFiscalReceipt54Fz({
			items: [
				{
					id: "s-1",
					name: "Прием (осмотр) врача-стоматолога",
					code804n: "B01.065.001",
					quantity: 1,
					unitPriceRub: 1500,
					unitPriceKopecks: 150000 as Kopecks,
					discountRub: 0,
					discountKopecks: 0 as Kopecks,
					grossRub: 1500,
					grossKopecks: 150000 as Kopecks,
					amountRub: 1500,
					amountKopecks: 150000 as Kopecks,
					vatRate: "vat_none",
					taxRateKopecks: 0 as Kopecks,
					paymentSubject: "service",
					paymentMethod: "full_payment",
					quantityMeasure: "piece",
					taxDeductionCategory: "1",
				},
			],
			splitPayment: { cardRub: 1500 },
			patientId: "pat-indiv-1",
			patientName: "Анна Смирнова",
			customerContact: "+7 (999) 777-88-99",
			payerType: "individual",
		});

		assert.equal(individualReceipt.payerType, "individual");
		assert.equal(individualReceipt.buyerInn, undefined, "Individual must NOT have mandatory INN");
		assert.equal(individualReceipt.totalRub, 1500);
		assert.equal(individualReceipt.payments.cardRub, 1500);
		assert.equal(individualReceipt.payments.isFullyAllocated, true);
	});

	it("3. Split payment allocation calculates exact integer kopecks across cash, card, and advance deposit", () => {
		const totalKopecks = rubToKopecks(10000); // 10 000 ₽ = 1 000 000 kopecks
		const allocation = calculateSplitPaymentAllocation(totalKopecks, {
			cashRub: 2000,
			receivedCashRub: 2500,
			cardRub: 5000,
			depositRub: 3000,
		});

		assert.equal(allocation.cashRub, 2000);
		assert.equal(allocation.cashKopecks, 200000);
		assert.equal(allocation.receivedCashRub, 2500);
		assert.equal(allocation.changeRub, 500);
		assert.equal(allocation.cardRub, 5000);
		assert.equal(allocation.depositRub, 3000);
		assert.equal(allocation.advanceOffsetRub, 3000);
		assert.equal(allocation.allocatedKopecks, 1000000);
		assert.equal(allocation.isFullyAllocated, true);
		assert.equal(allocation.isOverallocated, false);
		assert.equal(allocation.isCashShortage, false);
	});

	it("4. CashReceiptPrintModal: Purges hardcoded mocks '7701234567' and '00142' and renders live invoice dynamically", () => {
		const testInvoice: BillingInvoice = {
			id: "inv-test-real-1",
			number: "СЧ-2026-999",
			date: "2026-10-03",
			createdAt: "2026-10-03T10:00:00Z",
			patientId: "pat-real-1",
			patientName: "Васильев Олег Игоревич",
			patientPhone: "+7 (916) 123-45-67",
			doctorName: "Д-р Иванов",
			totalAmountRub: 8500,
			paidAmountRub: 8500,
			status: "paid",
			paymentMethod: "card_terminal",
			items: [
				{
					id: "li-1",
					name: "Лечение глубокого кариеса",
					code804n: "A16.07.002",
					title: "Лечение глубокого кариеса",
					priceRub: 8500,
					quantity: 1,
					totalRub: 8500,
					toothNumber: 26,
				},
			],
		};

		const html = renderToString(
			createElement(CashReceiptPrintModal, {
				isOpen: true,
				onClose: () => {},
				invoice: testInvoice,
				clinicName: "Клиника Стоматологии «ДЕНТЕ»",
				attendingDoctorName: "Д-р Иванов",
			}),
		);

		// Assert zero fake mocks
		assert.ok(!html.includes("7701234567"), "Must not contain hardcoded fake INN 7701234567");
		assert.ok(!html.includes("00142"), "Must not contain hardcoded fake receipt 00142");

		// Assert real invoice data
		assert.ok(html.includes("СЧ-2026-999"), "Must render invoice number");
		assert.ok(html.includes("Васильев Олег Игоревич"), "Must render patient name");
		assert.ok(html.includes("Лечение глубокого кариеса"), "Must render line item title");
		assert.ok(
			html.includes("8500") || html.includes("8 500") || html.includes("8\u00A0500"),
			"Must render total amount",
		);
	});

	it("5. CashReceiptPrintModal: Renders warranty 100% act with clear guarantee badges", () => {
		const warrantyInvoice: BillingInvoice = {
			id: "inv-w-1",
			number: "ГАР-2026-001",
			date: "2026-10-03",
			createdAt: "2026-10-03T10:00:00Z",
			patientId: "pat-w-1",
			patientName: "Соколова Анна",
			doctorName: "Д-р Смирнова",
			totalAmountRub: 0,
			paidAmountRub: 0,
			status: "warranty_100",
			items: [
				{
					id: "w-item-1",
					name: "Коррекция окклюзии по гарантии",
					code804n: "A16.07.002",
					title: "Коррекция окклюзии по гарантии",
					priceRub: 0,
					quantity: 1,
					totalRub: 0,
				},
			],
		};

		const html = renderToString(
			createElement(CashReceiptPrintModal, {
				isOpen: true,
				onClose: () => {},
				invoice: warrantyInvoice,
				defaultFormat: "a4",
			}),
		);

		assert.ok(html.includes("АКТ ГАРАНТИИ"), "Must render A4 warranty header");
		assert.ok(
			html.includes("Внутренний гарантийный акт клиники") || html.includes("Гарантийный акт"),
			"Must render internal warranty notice",
		);
		assert.ok(html.includes("0.00") || html.includes("0 ₽"), "Must render 0 ₽ amount");
	});

	it("6. InvoiceCardItem: Renders context menu actions for 54-FZ receipt, split pay, and refund", () => {
		const paidInvoice: BillingInvoice = {
			id: "inv-paid-1",
			number: "СЧ-PAID-01",
			date: "2026-10-03",
			patientId: "p1",
			patientName: "Ковалев Андрей",
			doctorName: "Д-р Петров",
			totalAmountRub: 5000,
			paidAmountRub: 5000,
			createdAt: "2026-10-03",
			status: "paid",
			items: [],
		};

		let printed = false;
		let refunded = false;

		const html = renderToString(
			createElement(InvoiceCardItem, {
				invoice: paidInvoice,
				isMenuOpen: true,
				onToggleMenu: () => {},
				onPay: () => {},
				onPrintInvoice: () => {},
				onPrintAct: () => {},
				onApplyWarranty: () => {},
				onPrepareFnsTaxDeduction: () => {},
				onPrintReceipt: () => { printed = true; },
				onRefund: () => { refunded = true; },
			}),
		);

		assert.ok(
			html.includes("Кассовый чек / Квитанция") || html.includes("Чек 54-ФЗ / Квитанция"),
			"Must render receipt action",
		);
		assert.ok(
			html.includes("Оформить возврат") || html.includes("Оформить возврат (54-ФЗ)"),
			"Must render refund action for paid invoice",
		);
	});

	it("7. PatientInstallmentsModal: Action bar renders Bank Installment QR navigation button", () => {
		let bankOpened = false;

		const html = renderToString(
			createElement(PatientInstallmentsModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-123",
				patientName: "Смирнова Елена",
				onOpenBankInstallment: () => { bankOpened = true; },
			}),
		);

		assert.ok(html.includes("Банковская рассрочка (QR)"), "Must render Bank Installment QR button");
	});
});
