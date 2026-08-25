/**
 * medicalTourismQuote.test.ts — Unit tests for Multi-Currency Medical Tourism Quotes and CBR conversions.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	convertRubToForeignCurrency,
	convertForeignCurrencyToRub,
	calculateMedicalTourismQuote,
	CBR_CURRENCIES,
	formatCurrencyAmount,
	type MedicalTourismQuoteItem,
} from "@dental/shared";

describe("Medical Tourism Multi-Currency Conversion & Quote Engine", () => {
	it("4.1 Accurately converts Rubles to USD, EUR, AED, and KZT with CBR rates and minor unit precision", () => {
		// 100,000.00 RUB (10,000,000 kop) at USD rate 91.50 with 0% spread
		const resUsd = convertRubToForeignCurrency({
			amountRubKopecks: 10000000,
			targetCurrency: "USD",
			bankSpreadPercent: 0,
		});

		// 100,000 / 91.50 = 1092.896... -> 1092.90 USD (109290 cents)
		assert.equal(resUsd.targetCurrency, "USD");
		assert.equal(resUsd.targetAmountMinor, 109290);
		assert.equal(resUsd.targetAmountDecimal, 1092.9);
		assert.equal(resUsd.targetFormatted, "$1,092.90");

		// KZT with nominal 100 (100 KZT = 19.50 RUB -> 1 KZT = 0.195 RUB)
		// 100,000 / 0.195 = 512,820.51 KZT
		const resKzt = convertRubToForeignCurrency({
			amountRubKopecks: 10000000,
			targetCurrency: "KZT",
			bankSpreadPercent: 0,
		});
		assert.equal(resKzt.targetCurrency, "KZT");
		assert.equal(resKzt.targetAmountMinor, 51282051);
		assert.equal(resKzt.targetAmountDecimal, 512820.51);
	});

	it("4.2 Incorporates acquisition bank spread into effective currency rate", () => {
		// 100,000 RUB to USD with 2% spread on base 91.50 -> Effective rate = 93.33 RUB/USD
		const resSpread = convertRubToForeignCurrency({
			amountRubKopecks: 10000000,
			targetCurrency: "USD",
			bankSpreadPercent: 2.0,
		});

		assert.equal(resSpread.officialCbrRateRub, 91.5);
		assert.equal(resSpread.effectiveRateRub, 93.33);
		assert.equal(resSpread.bankSpreadPercent, 2.0);
		// 100,000 / 93.33 = 1071.467... -> 1071.47 USD
		assert.equal(resSpread.targetAmountMinor, 107147);
	});

	it("4.3 Compiles dual-language medical tourism treatment quote with discounts and payment channels", () => {
		const items: MedicalTourismQuoteItem[] = [
			{
				serviceNameRu: "Дентальная имплантация Nobel Biocare",
				serviceNameEn: "Dental Implantation Nobel Biocare",
				quantity: 2,
				priceRub: 60000,
			},
			{
				serviceNameRu: "Циркониевая коронка CAD/CAM",
				serviceNameEn: "Zirconia Crown CAD/CAM",
				quantity: 2,
				priceRub: 35000,
			},
		];

		const quote = calculateMedicalTourismQuote({
			patientFullName: "Dr. Alexander Vance",
			countryRu: "Германия",
			countryEn: "Germany",
			targetCurrency: "EUR",
			items,
			discountRub: 10000,
			bankSpreadPercent: 1.5,
		});

		// Gross = 2*60000 + 2*35000 = 190,000 RUB
		// Net = 190,000 - 10,000 = 180,000 RUB
		assert.equal(quote.totalGrossRub, 190000);
		assert.equal(quote.discountRub, 10000);
		assert.equal(quote.totalNetRub, 180000);
		assert.equal(quote.targetCurrency, "EUR");
		assert.ok(quote.items.length === 2);
		assert.ok(quote.recommendedPaymentChannelsEn.length > 0);
		assert.ok(quote.quoteNumber.startsWith("MED-TOUR-"));
	});
});
