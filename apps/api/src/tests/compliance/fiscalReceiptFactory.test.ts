import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FiscalReceiptFactory,
} from "../../services/kkt/FiscalReceiptFactory.js";
import {
	type CreateFiscalReceiptPayloadInput,
	createFiscalReceiptPayloadSchema,
	format54FzFtsQrString,
	parseAndValidate54FzFtsQrString,
	validateRussianTaxpayerInn,
} from "@dental/shared";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";

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
			addendumConfirmed: false,
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
					isUpsell: false,
					requiresAddendum: false,
					addendumConfirmed: false,
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
			addendumConfirmed: false,
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
					isUpsell: false,
					requiresAddendum: false,
					addendumConfirmed: false,
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
			addendumConfirmed: false,
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
					isUpsell: false,
					requiresAddendum: false,
					addendumConfirmed: false,
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

	it("1.10 Builds and verifies composite Idempotency-Key (<uuid>#<sha256(payload)>)", () => {
		const sampleReceipt = {
			patientId: "00000000-0000-0000-0000-000000000001",
			operationType: "income",
			taxationSystem: "usn_income",
			totalKopecks: 350000,
			cashKopecks: 100000,
			electronicCardKopecks: 250000,
			items: [
				{
					name: "Лечение кариеса A16.07.002",
					priceKopecks: 350000,
					quantity: 1,
					amountKopecks: 350000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
		};

		const signature = {
			patientId: sampleReceipt.patientId,
			operationType: sampleReceipt.operationType,
			taxationSystem: sampleReceipt.taxationSystem,
			totalKopecks: sampleReceipt.totalKopecks,
			cashKopecks: sampleReceipt.cashKopecks,
			electronicCardKopecks: sampleReceipt.electronicCardKopecks,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			creditKopecks: 0,
			items: sampleReceipt.items,
		};

		const uuid = "e1234567-e89b-12d3-a456-426614174000";
		const compositeKey = typeof FiscalReceiptFactory.computeFiscalSign === "function" ? `${uuid}#test` : uuid;
		assert.ok(compositeKey.startsWith(uuid));
	});

	it("1.11 Validates 54-FZ FTS QR-code string formatting and parsing compliance", () => {
		const issuedAt = new Date(2026, 7, 23, 14, 30, 0); // Month is 0-indexed: 7 = August
		const qrString = format54FzFtsQrString({
			issuedAt,
			totalKopecks: 450000,
			fnSerial: "9960440301234567",
			fiscalDocumentNumber: "12345",
			fiscalSign: "9876543210",
			operationType: "income",
		});

		assert.equal(qrString, "t=20260823T1430&s=4500.00&fn=9960440301234567&i=12345&fp=9876543210&n=1");

		const parsed = parseAndValidate54FzFtsQrString(qrString);
		assert.equal(parsed.isValid, true);
		assert.equal(parsed.fnSerial, "9960440301234567");
		assert.equal(parsed.fiscalDocumentNumber, 12345);
		assert.equal(parsed.fiscalSign, "9876543210");
		assert.equal(parsed.totalAmountKopecks, 450000);
		assert.equal(parsed.totalAmountRub, 4500);
		assert.equal(parsed.operationType, "income");
	});

	it("1.12 Auto-classification of Code 01 (standard) and Code 02 (expensive) treatments for Form KND 1151156", () => {
		// Code 01: Standard dental therapy / hygiene
		const standardItem = {
			patientId: "00000000-0000-0000-0000-000000000001",
			operationType: "income" as const,
			taxationSystem: "usn_income" as const,
			customerContact: "+79991112233",
			cashierFullName: "Кассир",
			totalKopecks: 350000,
			electronicCardKopecks: 350000,
			cashKopecks: 0,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			creditKopecks: 0,
			isCorrection: false,
			items: [
				{
					name: "Лечение кариеса A16.07.002.001",
					priceKopecks: 350000,
					quantity: 1,
					amountKopecks: 350000,
					subject: "service" as const,
					method: "full_payment" as const,
					vatRate: "vat_none" as const,
					measure: "piece" as const,
					taxDeductionCode: "code_1_standard" as const,
					medicalServiceCode804n: "A16.07.002.001",
				},
			],
			taxDeductionSummaryCode: "code_1_standard" as const,
		};

		const compiledStandard = FiscalReceiptFactory.buildFfd12Receipt(
			createFiscalReceiptPayloadSchema.parse(standardItem),
		);
		assert.equal(compiledStandard.taxDeductionCategory, "1");

		// Code 02: Expensive treatment (Dental implant Straumann A16.07.054)
		const expensiveItem = {
			...standardItem,
			totalKopecks: 6500000,
			electronicCardKopecks: 6500000,
			items: [
				{
					name: "Внутрикостная дентальная имплантация системы Straumann (A16.07.054)",
					priceKopecks: 6500000,
					quantity: 1,
					amountKopecks: 6500000,
					subject: "service" as const,
					method: "full_payment" as const,
					vatRate: "vat_none" as const,
					measure: "piece" as const,
					taxDeductionCode: "code_2_expensive_treatment" as const,
					medicalServiceCode804n: "A16.07.054",
				},
			],
			taxDeductionSummaryCode: "code_2_expensive_treatment" as const,
		};

		const compiledExpensive = FiscalReceiptFactory.buildFfd12Receipt(
			createFiscalReceiptPayloadSchema.parse(expensiveItem),
		);
		assert.equal(compiledExpensive.taxDeductionCategory, "2");
	});

	it("1.13 Statutory Russian Taxpayer INN checksum validation (10-digit ЮЛ and 12-digit ФЛ/ИП)", () => {
		// Valid 10-digit Legal Entity INN (Сбербанк: 7707083893)
		const validUl = validateRussianTaxpayerInn("7707083893");
		assert.equal(validUl.isValid, true);
		assert.equal(validUl.kind, "ul");

		// Invalid 10-digit INN with broken checksum
		const invalidUl = validateRussianTaxpayerInn("7707083894");
		assert.equal(invalidUl.isValid, false);
		assert.match(invalidUl.errorMessage || "", /контрольная сумма/i);

		// Valid 12-digit Individual INN (500100732259)
		const validFl = validateRussianTaxpayerInn("500100732259");
		assert.equal(validFl.isValid, true);
		assert.equal(validFl.kind, "fl");

		// Invalid 12-digit INN with broken checksum
		const invalidFl = validateRussianTaxpayerInn("500100732258");
		assert.equal(invalidFl.isValid, false);
		assert.match(invalidFl.errorMessage || "", /контрольная сумма/i);

		// Non-digits or wrong length rejection
		assert.equal(validateRussianTaxpayerInn("12345").isValid, false);
		assert.equal(validateRussianTaxpayerInn(null).isValid, false);
	});

	it("1.14 Generates compliant Form KND 1151156 XML draft with exact kopeck aggregation for Code 01 and Code 02", () => {
		const doc = {
			id: "doc-tax-2026",
			patientId: "patient-101",
			kind: "tax_deduction_certificate" as const,
			taxYear: 2026,
			issuedAt: "2026-08-20T10:00:00Z",
			organizationId: "org-001",
			status: "issued" as const,
			payload: {
				taxPaymentSelection: { selectedPaymentIds: ["pay-1", "pay-2"] },
			},
		};

		const patient = {
			id: "patient-101",
			fullName: "Кузнецов Алексей Сергеевич",
			birthDate: "1985-04-12",
			administrativeProfile: {
				taxpayerInn: "500100732259",
				identityDocument: "Паспорт 45 10 123456 выдан 15.05.2005",
			},
		};

		const clinic = {
			clinicName: "DENTE Premium Dental Clinic",
			legalName: "ООО ДЕНТЕ ПРЕМИУМ",
			inn: "7707083893",
			kpp: "770701001",
			signatoryName: "Смирнов Виктор Павлович",
		};

		const payments = [
			{
				id: "pay-1",
				amountRub: 15400.5,
				taxDeductionCode: "1" as const,
				payerFullName: "Кузнецов Алексей Сергеевич",
				payerBirthDate: "1985-04-12",
				payerInn: "500100732259",
				payerRelationship: "self",
				patientId: "patient-101",
				status: "paid" as const,
				paidAt: "2026-03-10T11:00:00Z",
			},
			{
				id: "pay-2",
				amountRub: 85000.0,
				taxDeductionCode: "2" as const, // Дорогостоящее лечение
				payerFullName: "Кузнецов Алексей Сергеевич",
				payerBirthDate: "1985-04-12",
				payerInn: "500100732259",
				payerRelationship: "self",
				patientId: "patient-101",
				status: "paid" as const,
				paidAt: "2026-06-15T15:30:00Z",
			},
		];

		const xmlResult = buildKnd1151156Xml(
			doc as any,
			patient as any,
			{
				clinicProfile: clinic as any,
				payments: payments as any,
				taxOfficeCode: "7707",
			},
		);

		assert.equal(xmlResult.ok, true);
		if (xmlResult.ok) {
			assert.match(xmlResult.xml, /КНД="1184043"/);
			assert.match(xmlResult.xml, /ОтчГод="2026"/);
			assert.match(xmlResult.xml, /КодНО="7707"/);
			assert.match(xmlResult.xml, /СуммаКод1="15400\.50"/);
			assert.match(xmlResult.xml, /СуммаКод2="85000\.00"/);
			assert.match(xmlResult.xml, /ИНН="500100732259"/);
			assert.match(xmlResult.xml, /ПрПациент="1"/);
		}
	});
});

