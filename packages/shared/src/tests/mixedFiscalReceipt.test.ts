/**
 * mixedFiscalReceipt.test.ts — Unit tests for statutory 54-FZ Mixed Fiscal Receipts
 * (Medical services exempt under Art. 149 Tax Code RF + Retail products with 20% VAT under Art. 164 Tax Code RF)
 * and Clinic Gift Certificates (Nominals 3000 / 5000 / 10000 ₽, Tag 1215 Advance Offset).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateGiftCertificateRedemption,
	calculateMixedFiscalReceipt,
	calculateVatKopecks,
	CLINIC_GIFT_CERTIFICATE_NOMINALS,
	isRetailCommodityItem,
	kopecksToRub,
	RECEPTION_RETAIL_CATALOG,
	rubToKopecks,
} from "../index.js";

describe("54-FZ Mixed Fiscal Receipts & Retail Showcase Suite", () => {
	it("1. Validates reception retail showcase catalog (Curaprox, Marvis, Biorepair, Waterpik, Gift Certs)", () => {
		assert.ok(RECEPTION_RETAIL_CATALOG.length >= 10, "Catalog should have at least 10 items");

		// Check canonical Curaprox CS 5460
		const curaprox5460 = RECEPTION_RETAIL_CATALOG.find((p) => p.id === "curaprox-cs-5460");
		assert.ok(curaprox5460, "Curaprox CS 5460 must be in catalog");
		assert.equal(curaprox5460.priceRub, 1200);
		assert.equal(curaprox5460.priceKopecks, 120000);
		assert.equal(curaprox5460.vatRate, "vat_20");
		assert.equal(curaprox5460.paymentSubject, "commodity"); // Tag 1212 = 1
		assert.equal(curaprox5460.barcode, "7612412422550");

		// Check Marvis Classic Strong Mint
		const marvis = RECEPTION_RETAIL_CATALOG.find((p) => p.id === "marvis-classic-mint");
		assert.ok(marvis, "Marvis Mint must be in catalog");
		assert.equal(marvis.priceRub, 1350);
		assert.equal(marvis.vatRate, "vat_20");
		assert.equal(marvis.paymentSubject, "commodity");

		// Check Biorepair Total Protection
		const biorepair = RECEPTION_RETAIL_CATALOG.find((p) => p.id === "biorepair-total-protection");
		assert.ok(biorepair, "Biorepair must be in catalog");
		assert.equal(biorepair.priceRub, 950);
		assert.equal(biorepair.vatRate, "vat_20");

		// Check Waterpik WP-660
		const waterpik = RECEPTION_RETAIL_CATALOG.find((p) => p.id === "waterpik-wp-660");
		assert.ok(waterpik, "Waterpik WP-660 must be in catalog");
		assert.equal(waterpik.priceRub, 11900);
		assert.equal(waterpik.vatRate, "vat_20");

		// Check Gift Certificates
		for (const nominal of CLINIC_GIFT_CERTIFICATE_NOMINALS) {
			const cert = RECEPTION_RETAIL_CATALOG.find((p) => p.id === `gift-cert-${nominal}`);
			assert.ok(cert, `Gift cert ${nominal} must exist`);
			assert.equal(cert.priceRub, nominal);
			assert.equal(cert.vatRate, "vat_none"); // Sale of gift cert is advance prepayment
			assert.equal(cert.paymentSubject, "payment"); // Tag 1212 = 10
		}
	});

	it("2. Verifies retail commodity detection helper", () => {
		// Retail items
		assert.equal(isRetailCommodityItem({ name: "Зубная щетка Curaprox 5460", isRetail: true }), true);
		assert.equal(isRetailCommodityItem({ name: "Паста Marvis", paymentSubject: "commodity" }), true);
		assert.equal(isRetailCommodityItem({ name: "Ирригатор", category: "irrigators" }), true);
		assert.equal(isRetailCommodityItem({ name: "Подарочный сертификат 5000", category: "certificates" }), true);

		// Medical services
		assert.equal(isRetailCommodityItem({ name: "Прием врача-стоматолога терапевта", category: "therapy" }), false);
		assert.equal(isRetailCommodityItem({ name: "Установка дентального имплантата", category: "surgery" }), false);
	});

	it("3. Calculates exact kopeck 20% VAT on retail goods (zero float drift)", () => {
		// 1200 ₽ Curaprox brush: gross = 120 000 kop.
		// Formula: Math.round(120000 * 20 / 120) = 20 000 kop = 200.00 ₽.
		const vat1200 = calculateVatKopecks(120000, "vat_20");
		assert.equal(vat1200, 20000);
		assert.equal(kopecksToRub(vat1200), 200);

		// 1150 ₽ Marvis paste: gross = 115 000 kop.
		// Formula: Math.round(115000 * 20 / 120) = 19 167 kop = 191.67 ₽.
		const vat1150 = calculateVatKopecks(115000, "vat_20");
		assert.equal(vat1150, 19167);

		// Medical service 5000 ₽: VAT none = 0 kop.
		const vatMed = calculateVatKopecks(500000, "vat_none");
		assert.equal(vatMed, 0);
	});

	it("4. Calculates mixed fiscal receipt: Medical (Без НДС) + Retail goods (НДС 20%)", () => {
		const result = calculateMixedFiscalReceipt({
			items: [
				{
					id: "med-1",
					name: "Лечение кариеса глубокого",
					code804n: "A16.07.002",
					priceRub: 5000,
					quantity: 1,
					category: "therapy",
				},
				{
					id: "ret-1",
					name: "Зубная щетка Curaprox CS 5460 Ultra Soft",
					sku: "CUR-5460",
					barcode: "7612412422550",
					priceRub: 1200,
					quantity: 1,
					category: "brushes",
					vatRate: "vat_20",
					paymentSubject: "commodity",
					isRetail: true,
				},
			],
			tenders: {
				cardRub: 6200,
			},
		});

		// Totals
		assert.equal(result.totals.totalRub, 6200);
		assert.equal(result.totals.totalKopecks, 620000);
		assert.equal(result.totals.medicalServicesRub, 5000);
		assert.equal(result.totals.medicalServicesKopecks, 500000);
		assert.equal(result.totals.retailGoodsRub, 1200);
		assert.equal(result.totals.retailGoodsKopecks, 120000);
		assert.equal(result.totals.hasMixedItems, true);
		assert.equal(result.totals.hasMedicalServices, true);
		assert.equal(result.totals.hasRetailGoods, true);

		// Exact VAT separation
		assert.equal(result.totals.vatNoneRub, 5000);
		assert.equal(result.totals.vatNoneKopecks, 500000);
		assert.equal(result.totals.vat20Rub, 200);
		assert.equal(result.totals.vat20Kopecks, 20000);

		// Items verification
		assert.equal(result.items.length, 2);

		const medItem = result.items[0];
		assert.equal(medItem.tag1212_paymentSubject, 4); // Service
		assert.equal(medItem.tag1199_vatRate, 6); // Без НДС
		assert.equal(medItem.vatKopecks, 0);

		const retItem = result.items[1];
		assert.equal(retItem.tag1212_paymentSubject, 1); // Commodity
		assert.equal(retItem.tag1199_vatRate, 1); // 20% VAT
		assert.equal(retItem.vatKopecks, 20000);

		// Tenders
		assert.equal(result.tenders.cardRub, 6200);
		assert.equal(result.tenders.totalElectronicRub, 6200);
		assert.equal(result.tenders.isFullyAllocated, true);
	});

	it("5. Calculates gift certificate redemption as advance offset (Tag 1215)", () => {
		// Scenario A: Certificate covers part of the bill
		// Bill total: 8000 ₽, Certificate nominal: 5000 ₽
		const resA = calculateGiftCertificateRedemption({
			certificateNumber: "CERT-5000-001",
			nominalRub: 5000,
			billTotalKopecks: 800000,
		});
		assert.equal(resA.appliedRub, 5000);
		assert.equal(resA.appliedKopecks, 500000);
		assert.equal(resA.remainingBalanceRub, 0);
		assert.equal(resA.remainingDueRub, 3000);
		assert.equal(resA.tag1215AdvanceKopecks, 500000);

		// Scenario B: Certificate nominal exceeds the bill
		// Bill total: 3500 ₽, Certificate nominal: 5000 ₽
		const resB = calculateGiftCertificateRedemption({
			certificateNumber: "CERT-5000-002",
			nominalRub: 5000,
			billTotalKopecks: 350000,
		});
		assert.equal(resB.appliedRub, 3500);
		assert.equal(resB.appliedKopecks, 350000);
		assert.equal(resB.remainingBalanceRub, 1500);
		assert.equal(resB.remainingDueRub, 0);
		assert.equal(resB.tag1215AdvanceKopecks, 350000);
	});

	it("6. Multi-tender split: Cash (1031) + Card (1081) + Gift Certificate Advance (1215)", () => {
		const result = calculateMixedFiscalReceipt({
			items: [
				{
					id: "med-1",
					name: "Профессиональная гигиена полости рта",
					code804n: "A16.07.051",
					priceRub: 7500,
					quantity: 1,
					category: "hygiene",
				},
				{
					id: "ret-1",
					name: "Ополаскиватель Curaprox PerioPlus+",
					priceRub: 1800,
					quantity: 1,
					category: "floss_and_rinses",
					vatRate: "vat_20",
					paymentSubject: "commodity",
					isRetail: true,
				},
			],
			tenders: {
				// Total: 7500 + 1800 = 9300 ₽
				certificateRub: 5000, // Tag 1215: 5000 ₽
				cashRub: 2000, // Tag 1031: 2000 ₽
				cardRub: 2300, // Tag 1081: 2300 ₽
			},
		});

		assert.equal(result.totals.totalRub, 9300);
		assert.equal(result.tenders.certificateRub, 5000);
		assert.equal(result.tenders.tag1215AdvanceOffsetRub, 5000);
		assert.equal(result.tenders.tag1215AdvanceOffsetKopecks, 500000);
		assert.equal(result.tenders.cashRub, 2000);
		assert.equal(result.tenders.cardRub, 2300);
		assert.equal(result.tenders.totalAllocatedRub, 9300);
		assert.equal(result.tenders.isFullyAllocated, true);
		assert.equal(result.tenders.remainingRub, 0);

		// OFD payload check
		assert.equal(result.ofdVerificationPayload.tag1031_cashRub, "2000.00");
		assert.equal(result.ofdVerificationPayload.tag1081_electronicRub, "2300.00");
		assert.equal(result.ofdVerificationPayload.tag1215_prepaidAdvanceOffsetRub, "5000.00");
	});

	it("7. Mathematical invariant: Exact sum balance without fractional lost kopecks", () => {
		// Complex prices with uneven split
		const items = [
			{ id: "1", name: "Услуга 1", priceRub: 3333.33, quantity: 1 },
			{ id: "2", name: "Товар 1", priceRub: 1234.56, quantity: 1, isRetail: true, vatRate: "vat_20" as const },
			{ id: "3", name: "Товар 2", priceRub: 987.65, quantity: 1, isRetail: true, vatRate: "vat_20" as const },
		];

		const totalExpectedKop =
			rubToKopecks(3333.33) + rubToKopecks(1234.56) + rubToKopecks(987.65);

		const result = calculateMixedFiscalReceipt({ items });
		assert.equal(result.totals.totalKopecks, totalExpectedKop);
		assert.equal(
			result.totals.medicalServicesKopecks + result.totals.retailGoodsKopecks,
			result.totals.totalKopecks,
		);
	});
});
