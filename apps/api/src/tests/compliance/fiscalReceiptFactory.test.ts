import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FiscalReceiptFactory,
} from "../../services/kkt/FiscalReceiptFactory.js";
import {
	type CreateFiscalReceiptPayloadInput,
	createFiscalReceiptPayloadSchema,
} from "@dental/shared";

describe("54-FZ Fiscal Receipt Factory & FFD 1.2 Suite", () => {
	it("1.1 Resolves FFD 1.2 Tag 1054 operation types correctly", () => {
		assert.equal(FiscalReceiptFactory.resolveTag1054("income"), 1);
		assert.equal(FiscalReceiptFactory.resolveTag1054("income_return"), 2);
		assert.equal(FiscalReceiptFactory.resolveTag1054("expense"), 3);
		assert.equal(FiscalReceiptFactory.resolveTag1054("expense_return"), 4);
	});

	it("1.2 Resolves FFD 1.2 Tag 1214 payment method codes accurately", () => {
		assert.equal(FiscalReceiptFactory.resolveTag1214("full_prepayment"), 1);
		assert.equal(FiscalReceiptFactory.resolveTag1214("prepayment"), 2);
		assert.equal(FiscalReceiptFactory.resolveTag1214("advance"), 3);
		assert.equal(FiscalReceiptFactory.resolveTag1214("full_payment"), 4);
		assert.equal(FiscalReceiptFactory.resolveTag1214("partial_payment_and_credit"), 5);
		assert.equal(FiscalReceiptFactory.resolveTag1214("credit_handover"), 6);
		assert.equal(FiscalReceiptFactory.resolveTag1214("credit_payment"), 7);
	});

	it("1.3 Resolves FFD 1.2 Tag 1212 payment subject codes accurately", () => {
		assert.equal(FiscalReceiptFactory.resolveTag1212("commodity"), 1);
		assert.equal(FiscalReceiptFactory.resolveTag1212("job"), 3);
		assert.equal(FiscalReceiptFactory.resolveTag1212("service"), 4);
		assert.equal(FiscalReceiptFactory.resolveTag1212("payment"), 10);
	});

	it("1.4 Resolves FFD 1.2 Tag 1199 VAT rate codes (medical services are exempt under Art. 149 Tax Code RF)", () => {
		assert.equal(FiscalReceiptFactory.resolveTag1199("vat_none"), 6);
		assert.equal(FiscalReceiptFactory.resolveTag1199("vat_20"), 1);
		assert.equal(FiscalReceiptFactory.resolveTag1199("vat_10"), 2);
		assert.equal(FiscalReceiptFactory.resolveTag1199("vat_0"), 5);
	});

	it("1.5 Builds Advance / Prepayment receipt (Признак способа расчета = 1/3)", () => {
		const advanceInput: CreateFiscalReceiptPayloadInput = {
			patientId: "00000000-0000-0000-0000-000000000001",
			operationType: "income",
			taxationSystem: "usn_income",
			customerContact: "+79991112233",
			cashierFullName: "Кассир Петрова А.В.",
			totalKopecks: 500000,
			electronicCardKopecks: 500000,
			cashKopecks: 0,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			creditKopecks: 0,
			isCorrection: false,
			items: [
				{
					name: "Аванс за ортодонтическое лечение (элайнеры)",
					priceKopecks: 500000,
					quantity: 1,
					amountKopecks: 500000,
					subject: "payment",
					method: "advance",
					vatRate: "vat_none",
					measure: "piece",
					taxDeductionCode: "code_1_standard",
					medicalServiceCode804n: null,
				},
			],
			taxDeductionSummaryCode: "code_1_standard",
		};

		const ffd12 = FiscalReceiptFactory.buildFfd12Receipt(advanceInput);

		assert.equal(ffd12.tag1054_operationType, 1);
		assert.equal(ffd12.tag1055_taxationSystem, 2); // USN Income
		assert.equal(ffd12.totalKopecks, 500000);
		assert.equal(ffd12.tag1020_totalRub, "5000.00");
		assert.equal(ffd12.payments.tag1081_electronicRub, "5000.00");
		assert.equal(ffd12.items[0]?.tag1214_paymentMethod, 3); // Advance = 3
		assert.equal(ffd12.items[0]?.tag1212_paymentSubject, 10); // Payment = 10
		assert.equal(ffd12.items[0]?.tag1199_vatRate, 6); // Без НДС
	});

	it("1.6 Builds Advance Offset / Final Settlement receipt (Признак 4, Зачет аванса)", () => {
		const finalSettlementInput: CreateFiscalReceiptPayloadInput = {
			patientId: "00000000-0000-0000-0000-000000000001",
			operationType: "income",
			taxationSystem: "usn_income",
			customerContact: "ivanov@example.com",
			cashierFullName: "Кассир Петрова А.В.",
			totalKopecks: 1200000,
			cashKopecks: 200000,
			electronicCardKopecks: 0,
			sbpKopecks: 0,
			prepaidKopecks: 1000000, // 10,000 руб. зачет аванса
			creditKopecks: 0,
			isCorrection: false,
			items: [
				{
					name: "Установка дентального имплантата Straumann",
					priceKopecks: 1200000,
					quantity: 1,
					amountKopecks: 1200000,
					subject: "service",
					method: "full_payment", // 4 = Полный расчет с зачетом аванса
					vatRate: "vat_none",
					measure: "piece",
					taxDeductionCode: "code_2_expensive_treatment",
					medicalServiceCode804n: "A16.07.054",
				},
			],
			taxDeductionSummaryCode: "code_2_expensive_treatment",
		};

		const ffd12 = FiscalReceiptFactory.buildFfd12Receipt(finalSettlementInput);

		assert.equal(ffd12.tag1054_operationType, 1);
		assert.equal(ffd12.totalKopecks, 1200000);
		assert.equal(ffd12.tag1020_totalRub, "12000.00");
		assert.equal(ffd12.payments.tag1031_cashRub, "2000.00");
		assert.equal(ffd12.payments.tag1215_prepaidAdvanceOffsetRub, "10000.00");
		assert.equal(ffd12.items[0]?.tag1214_paymentMethod, 4); // Full payment = 4
		assert.equal(ffd12.items[0]?.tag1212_paymentSubject, 4); // Service = 4
		assert.equal(ffd12.taxDeductionCategory, "2"); // Code 2 expensive treatment
	});

	it("1.7 Validates Split Payment (Cash + Electronic Card + SBP + Advance Offset) with exact integer arithmetic", () => {
		const splitInput: CreateFiscalReceiptPayloadInput = {
			patientId: "00000000-0000-0000-0000-000000000001",
			operationType: "income",
			taxationSystem: "usn_income",
			customerContact: "+79991112233",
			cashierFullName: "Кассир",
			totalKopecks: 1000000,
			cashKopecks: 200000,
			electronicCardKopecks: 300000,
			sbpKopecks: 100000,
			prepaidKopecks: 400000, // 2000 + 3000 + 1000 + 4000 = 10000 руб
			creditKopecks: 0,
			isCorrection: false,
			items: [
				{
					name: "Комплексное терапевтическое лечение",
					priceKopecks: 1000000,
					quantity: 1,
					amountKopecks: 1000000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
					taxDeductionCode: "code_1_standard",
					medicalServiceCode804n: "A16.07.002",
				},
			],
			taxDeductionSummaryCode: "code_1_standard",
		};

		const parsed = createFiscalReceiptPayloadSchema.safeParse(splitInput);
		assert.equal(parsed.success, true);

		const ffd12 = FiscalReceiptFactory.buildFfd12Receipt(splitInput);
		assert.equal(ffd12.payments.tag1031_cashRub, "2000.00");
		assert.equal(ffd12.payments.tag1081_electronicRub, "4000.00"); // 3000 card + 1000 sbp
		assert.equal(ffd12.payments.tag1215_prepaidAdvanceOffsetRub, "4000.00");
		assert.equal(ffd12.tag1020_totalRub, "10000.00");
	});

	it("1.8 Rejects split payment mismatch when parts do not equal total", () => {
		const invalidSplit = {
			patientId: "00000000-0000-0000-0000-000000000001",
			operationType: "income",
			taxationSystem: "usn_income",
			customerContact: "+79991112233",
			totalKopecks: 100000,
			cashKopecks: 40000,
			electronicCardKopecks: 50000, // 400 + 500 = 900 != 1000
			items: [
				{
					name: "Осмотр",
					priceKopecks: 100000,
					quantity: 1,
					amountKopecks: 100000,
				},
			],
		};

		const parsed = createFiscalReceiptPayloadSchema.safeParse(invalidSplit);
		assert.equal(parsed.success, false);
		assert.match(parsed.error?.issues[0]?.message || "", /не совпадает/i);
	});

	it("1.9 Generates OFD verification URL and deterministic FPD fiscal signature", () => {
		const fpd = FiscalReceiptFactory.computeFiscalSign(
			"9960440302145896",
			"FD-123456",
			new Date("2026-08-19"),
			500000,
		);
		assert.ok(fpd.length >= 8);

		const ofdUrl = FiscalReceiptFactory.buildOfdUrl({
			fn: "9960440302145896",
			fd: "123456",
			fpd,
			amountKopecks: 500000,
			operationType: "income",
		});

		assert.ok(ofdUrl.startsWith("https://ofd.ru/check"));
		assert.ok(ofdUrl.includes("fn=9960440302145896"));
		assert.ok(ofdUrl.includes("s=5000.00"));
		assert.ok(ofdUrl.includes("n=1"));
	});
});
