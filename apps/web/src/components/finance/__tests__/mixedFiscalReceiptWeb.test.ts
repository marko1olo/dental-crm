/**
 * mixedFiscalReceiptWeb.test.ts — Unit tests for 54-FZ Mixed Fiscal Receipts in @dental/web:
 * Dental Medical Services (exempt under Art. 149 Tax Code RF, Tag 1199 = 6)
 * + Reception Desk Retail Goods (taxed at 20% VAT under Art. 164 Tax Code RF, Tag 1199 = 1)
 * + Clinic Gift Certificates (nominals 3000 / 5000 / 10000 ₽, Tag 1215 advance offset).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateSplitPaymentAllocation,
	calculateTaxDeductionBreakdown,
	generateFiscalReceipt54Fz,
	mapTreatmentItemsToFiscalReceipt,
} from "../order804nFiscalEngine.js";
import type { TreatmentPlanItem } from "../../treatment-plans/types.js";

describe("Web 54-FZ Mixed Fiscal Receipts & Gift Certificates Suite", () => {
	const medicalItem: TreatmentPlanItem = {
		id: "med-service-1",
		code804n: "A16.07.002",
		name: "Восстановление зуба пломбой (лечение кариеса)",
		category: "therapy",
		unitPriceRub: 5000,
		priceRub: 5000,
		quantity: 1,
		discountRub: 0,
		phase: 1,
		stageKind: "stage_1_therapy",
	};

	const retailCuraprox: TreatmentPlanItem = {
		id: "retail-curaprox-1",
		code804n: "RETAIL",
		name: "Зубная щетка Curaprox CS 5460 Ultra Soft",
		category: "brushes",
		unitPriceRub: 1200,
		priceRub: 1200,
		quantity: 1,
		discountRub: 0,
		phase: 1,
		stageKind: "stage_1_therapy",
		vatRate: "vat_20",
		paymentSubject: "commodity", // Tag 1212 = 1
		barcode: "7612412422550",
		sku: "CUR-5460",
		isRetail: true,
	};

	const retailMarvis: TreatmentPlanItem = {
		id: "retail-marvis-1",
		code804n: "RETAIL",
		name: "Зубная паста Marvis Classic Strong Mint 85 мл",
		category: "pastes",
		unitPriceRub: 1350,
		priceRub: 1350,
		quantity: 1,
		discountRub: 0,
		phase: 1,
		stageKind: "stage_1_therapy",
		vatRate: "vat_20",
		paymentSubject: "commodity",
		barcode: "8004395111701",
		sku: "MRV-85-CSM",
		isRetail: true,
	};

	const giftCertSale: TreatmentPlanItem = {
		id: "retail-cert-5000",
		code804n: "CERTIFICATE",
		name: "Подарочный сертификат клиники ДЕНТЕ 5 000 ₽",
		category: "certificates",
		unitPriceRub: 5000,
		priceRub: 5000,
		quantity: 1,
		discountRub: 0,
		phase: 1,
		stageKind: "stage_1_therapy",
		vatRate: "vat_none", // Advance is exempt / non-taxable at sale
		paymentSubject: "payment", // Tag 1212 = 10 (Платеж / Аванс)
		barcode: "2000000005000",
		sku: "CERT-5000",
		isRetail: true,
	};

	it("1. Pure medical receipt: All items are Без НДС (Art. 149 NK RF)", () => {
		const result = mapTreatmentItemsToFiscalReceipt([medicalItem]);
		assert.equal(result.totalRub, 5000);
		assert.equal(result.totalKopecks, 500000);
		assert.equal(result.hasMixedItems, false);
		assert.equal(result.vat20Kopecks, 0);
		assert.equal(result.vatNoneKopecks, 500000);
		assert.equal(result.taxRateKopecks, 0);

		const item = result.items[0];
		assert.equal(item.vatRate, "vat_none");
		assert.equal(item.taxRateKopecks, 0);
		assert.equal(item.paymentSubject, "service");
	});

	it("2. Pure retail receipt: 20% VAT correctly calculated on goods (Art. 164 NK RF)", () => {
		const result = mapTreatmentItemsToFiscalReceipt([retailCuraprox]);
		assert.equal(result.totalRub, 1200);
		assert.equal(result.totalKopecks, 120000);
		assert.equal(result.hasMixedItems, false);
		// 120 000 kop * 20 / 120 = 20 000 kop
		assert.equal(result.vat20Kopecks, 20000);
		assert.equal(result.vat20Rub, 200);
		assert.equal(result.vatNoneKopecks, 0);

		const item = result.items[0];
		assert.equal(item.vatRate, "vat_20");
		assert.equal(item.taxRateKopecks, 20000);
		assert.equal(item.paymentSubject, "commodity");
		assert.equal(item.isRetail, true);
	});

	it("3. Mixed receipt: Medical 5000 ₽ (Без НДС) + Curaprox 1200 ₽ (НДС 20%) = 6200 ₽", () => {
		const result = mapTreatmentItemsToFiscalReceipt([medicalItem, retailCuraprox]);

		assert.equal(result.totalRub, 6200);
		assert.equal(result.totalKopecks, 620000);
		assert.equal(result.hasMixedItems, true);

		// VAT breakdown
		assert.equal(result.vatNoneRub, 5000);
		assert.equal(result.vatNoneKopecks, 500000);
		assert.equal(result.vat20Rub, 200);
		assert.equal(result.vat20Kopecks, 20000);

		// Category totals
		assert.equal(result.medicalTotalKopecks, 500000);
		assert.equal(result.retailTotalKopecks, 120000);

		// Items check
		assert.equal(result.items.length, 2);
		assert.equal(result.items[0].paymentSubject, "service");
		assert.equal(result.items[0].vatRate, "vat_none");
		assert.equal(result.items[1].paymentSubject, "commodity");
		assert.equal(result.items[1].vatRate, "vat_20");
	});

	it("4. Medical tax deduction (Art. 219 NK RF): Strictly excludes retail commodities", () => {
		// When mixed receipt has Medical service 5000 ₽ + Curaprox 1200 ₽ + Marvis 1350 ₽:
		const items = [medicalItem, retailCuraprox, retailMarvis];
		const deduction = calculateTaxDeductionBreakdown(items);

		// Deduction must ONLY cover medical service 5000 ₽!
		assert.equal(deduction.totalRub, 5000);
		assert.equal(deduction.totalKopecks, 500000);
		assert.equal(deduction.code01ItemsCount, 1);
		assert.equal(deduction.code02ItemsCount, 0);

		// 13% refund estimation for patient: 5000 * 13% = 650 ₽ (not including 2550 ₽ retail!)
		assert.equal(deduction.refund13EstimateRub, 650);
	});

	it("5. Gift certificate sale: Tag 1212 = 10 (Платеж / Аванс) and Без НДС", () => {
		const result = mapTreatmentItemsToFiscalReceipt([giftCertSale]);
		assert.equal(result.totalRub, 5000);
		assert.equal(result.hasMixedItems, false);
		assert.equal(result.vat20Kopecks, 0);
		assert.equal(result.vatNoneKopecks, 500000);

		const item = result.items[0];
		assert.equal(item.paymentSubject, "payment"); // Tag 1212 = 10
		assert.equal(item.vatRate, "vat_none");
		assert.equal(item.code804n, "CERTIFICATE");
	});

	it("6. Split payment with Gift Certificate redemption: Mapped to Tag 1215 advance offset", () => {
		// Total: 6200 ₽ (620 000 kop)
		// Patient pays with Certificate 3000 ₽ + Cash 1200 ₽ + Card 2000 ₽
		const totalKopecks = 620000 as any;
		const allocation = calculateSplitPaymentAllocation(totalKopecks, {
			cashRub: 1200,
			cardRub: 2000,
			certificateRub: 3000,
		});

		assert.equal(allocation.cashRub, 1200);
		assert.equal(allocation.cardRub, 2000);
		assert.equal(allocation.certificateRub, 3000);
		// Tag 1215: Advance offset includes certificate redemption
		assert.equal(allocation.advanceOffsetRub, 3000);
		assert.equal(allocation.advanceOffsetKopecks, 300000);

		assert.equal(allocation.allocatedKopecks, 620000);
		assert.equal(allocation.remainingKopecks, 0);
		assert.equal(allocation.isFullyAllocated, true);
		assert.equal(allocation.isOverallocated, false);
	});

	it("7. Full 54-FZ fiscal receipt generation with mixed VAT and physical person (Mandate 8e)", () => {
		const receipt = generateFiscalReceipt54Fz({
			items: [medicalItem, retailCuraprox],
			splitPayment: {
				cardRub: 6200,
			},
			patientId: "pat-12345",
			patientName: "Иванов Иван Иванович",
			customerContact: "+7 999 123-45-67",
			payerType: "individual", // Physical person: NO INN required
		});

		assert.equal(receipt.totalRub, 6200);
		assert.equal(receipt.hasMixedItems, true);
		assert.equal(receipt.vat20Rub, 200);
		assert.equal(receipt.vatNoneRub, 5000);
		assert.equal(receipt.retailTotalKopecks, 120000);
		assert.equal(receipt.medicalTotalKopecks, 500000);

		// Zero friction: physical person does NOT have buyerInn
		assert.equal(receipt.buyerInn, undefined);
		assert.equal(receipt.payerType, "individual");

		// OFD url contains exact amount
		assert.ok(receipt.ofdUrl.includes("s=6200.00"));
	});
});
