import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAdvanceDepositOffset,
	calculateMultiTenderAllocation,
	calculateVatKopecks,
	createFiscalReceiptPayloadSchema,
	distributeDiscountProportionally,
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1173_CORRECTION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
	fiscalReceiptItemSchema,
	fiscalRefundPayloadSchema,
	isValidGs1Checksum,
	kopecksToNumericString,
	kopecksToRub,
	parseChestnyZnakDataMatrix,
	rubToKopecks,
} from "../index.js";

describe("Shared Fiscal 54-FZ & FFD 1.2 Suite", () => {
	it("1.1 Verifies all statutory FFD 1.2 tag codes (Приказ ФНС ЕД-7-20/662@)", () => {
		// Tag 1054: Operation Types
		assert.equal(FFD12_TAG_1054_OPERATION_CODES.income, 1);
		assert.equal(FFD12_TAG_1054_OPERATION_CODES.income_return, 2);
		assert.equal(FFD12_TAG_1054_OPERATION_CODES.expense, 3);
		assert.equal(FFD12_TAG_1054_OPERATION_CODES.expense_return, 4);

		// Tag 1214: Payment Methods
		assert.equal(FFD12_TAG_1214_METHOD_CODES.full_prepayment, 1);
		assert.equal(FFD12_TAG_1214_METHOD_CODES.prepayment, 2);
		assert.equal(FFD12_TAG_1214_METHOD_CODES.advance, 3);
		assert.equal(FFD12_TAG_1214_METHOD_CODES.full_payment, 4);
		assert.equal(FFD12_TAG_1214_METHOD_CODES.partial_payment_and_credit, 5);
		assert.equal(FFD12_TAG_1214_METHOD_CODES.credit_handover, 6);
		assert.equal(FFD12_TAG_1214_METHOD_CODES.credit_payment, 7);

		// Tag 1212: Payment Subjects
		assert.equal(FFD12_TAG_1212_SUBJECT_CODES.commodity, 1);
		assert.equal(FFD12_TAG_1212_SUBJECT_CODES.job, 3);
		assert.equal(FFD12_TAG_1212_SUBJECT_CODES.service, 4);
		assert.equal(FFD12_TAG_1212_SUBJECT_CODES.payment, 10);
		assert.equal(FFD12_TAG_1212_SUBJECT_CODES.goods_with_marking, 32);

		// Tag 1055: Taxation Systems
		assert.equal(FFD12_TAG_1055_TAXATION_CODES.osn, 1);
		assert.equal(FFD12_TAG_1055_TAXATION_CODES.usn_income, 2);
		assert.equal(FFD12_TAG_1055_TAXATION_CODES.usn_income_expense, 4);
		assert.equal(FFD12_TAG_1055_TAXATION_CODES.esxn, 8);
		assert.equal(FFD12_TAG_1055_TAXATION_CODES.psn, 16);

		// Tag 1199: VAT Rates
		assert.equal(FFD12_TAG_1199_VAT_CODES.vat_20, 1);
		assert.equal(FFD12_TAG_1199_VAT_CODES.vat_10, 2);
		assert.equal(FFD12_TAG_1199_VAT_CODES.vat_20_120, 3);
		assert.equal(FFD12_TAG_1199_VAT_CODES.vat_10_110, 4);
		assert.equal(FFD12_TAG_1199_VAT_CODES.vat_0, 5);
		assert.equal(FFD12_TAG_1199_VAT_CODES.vat_none, 6); // Без НДС ст. 149 НК РФ

		// Tag 2108: Quantity Measures
		assert.equal(FFD12_TAG_2108_MEASURE_CODES.piece, 0);
		assert.equal(FFD12_TAG_2108_MEASURE_CODES.gram, 10);
		assert.equal(FFD12_TAG_2108_MEASURE_CODES.kilogram, 11);
		assert.equal(FFD12_TAG_2108_MEASURE_CODES.other, 255);

		// Tag 1173: Correction Types
		assert.equal(FFD12_TAG_1173_CORRECTION_CODES.self_initiated, 0);
		assert.equal(FFD12_TAG_1173_CORRECTION_CODES.by_instruction, 1);
	});

	it("1.2 Kopeck exact arithmetic and string format conversions", () => {
		assert.equal(rubToKopecks(1500.5), 150050);
		assert.equal(rubToKopecks(0.01), 1);
		assert.equal(rubToKopecks(4500), 450000);

		assert.equal(kopecksToRub(150050), 1500.5);
		assert.equal(kopecksToRub(1), 0.01);
		assert.equal(kopecksToNumericString(150050), "1500.50");
		assert.equal(kopecksToNumericString(450000), "4500.00");
	});

	it("1.3 Multi-tender split allocation (Cash + Card + SBP + Advance Offset + Certificate)", () => {
		const totalKopecks = 1000000; // 10,000.00 руб
		const allocation = calculateMultiTenderAllocation(totalKopecks, {
			cashRub: 2000,
			cardRub: 3000,
			sbpRub: 1500,
			advanceOffsetRub: 2500,
			certificateRub: 1000,
		});

		assert.equal(allocation.cashKopecks, 200000);
		assert.equal(allocation.cardKopecks, 300000);
		assert.equal(allocation.sbpKopecks, 150000);
		assert.equal(allocation.totalElectronicKopecks, 450000); // 3000 card + 1500 sbp
		assert.equal(allocation.advanceOffsetKopecks, 350000); // 2500 advance + 1000 cert
		assert.equal(allocation.totalPaymentsKopecks, 1000000);
		assert.equal(allocation.remainingKopecks, 0);
		assert.equal(allocation.isFullyAllocated, true);
		assert.equal(allocation.isOverallocated, false);
	});

	it("1.4 Advance deposit offset calculation against invoice", () => {
		// Invoice = 15,000 руб, Available deposit = 10,000 руб
		const offset1 = calculateAdvanceDepositOffset({
			invoiceTotalKopecks: 1500000,
			availableDepositKopecks: 1000000,
		});
		assert.equal(offset1.advanceOffsetKopecks, 1000000);
		assert.equal(offset1.remainingDueKopecks, 500000);
		assert.equal(offset1.isFullyCoveredByDeposit, false);

		// Invoice = 7,000 руб, Available deposit = 10,000 руб
		const offset2 = calculateAdvanceDepositOffset({
			invoiceTotalKopecks: 700000,
			availableDepositKopecks: 1000000,
		});
		assert.equal(offset2.advanceOffsetKopecks, 700000);
		assert.equal(offset2.remainingDueKopecks, 0);
		assert.equal(offset2.isFullyCoveredByDeposit, true);
	});

	it("1.5 Proportional discount allocation using Hamilton/Largest Remainder Method (Zero Kopeck Loss)", () => {
		const items = [
			{ priceKopecks: 33333, quantity: 1 }, // 333.33 руб
			{ priceKopecks: 33333, quantity: 1 }, // 333.33 руб
			{ priceKopecks: 33334, quantity: 1 }, // 333.34 руб
		];
		// Total gross = 100,000 коп (1,000 руб). Distribute discount of 1000 коп (10.00 руб)
		const discounts = distributeDiscountProportionally(items, 1000);
		const sumDiscounts = discounts.reduce((sum, d) => sum + d, 0);
		assert.equal(sumDiscounts, 1000);
		assert.equal(discounts.length, 3);
	});

	it("1.6 Calculates statutory VAT amounts correctly", () => {
		assert.equal(calculateVatKopecks(12000, "vat_20"), 2000); // 120 руб total -> 20 руб VAT (20/120)
		assert.equal(calculateVatKopecks(11000, "vat_10"), 1000); // 110 руб total -> 10 руб VAT (10/110)
		assert.equal(calculateVatKopecks(10000, "vat_none"), 0); // Medical exemption Art. 149
	});

	it("1.7 GS1 Modulo 10 Checksum and DataMatrix parser for Честный ЗНАК / МДЛП", () => {
		// Valid GTIN-14 checksum
		assert.equal(isValidGs1Checksum("03664798000016"), true);
		assert.equal(isValidGs1Checksum("03664798000015"), false); // Wrong check digit

		// Standard bracketed GS1 DataMatrix for Ultracain
		const rawBracketed = "(01)03664798000016(21)1A2B3C4D5E6F7(91)ABCD(92)44_CHARS_CRYPTO_TAIL_GOST_SIGNATURE_HERE____";
		const parsed1 = parseChestnyZnakDataMatrix(rawBracketed);
		assert.equal(parsed1.isValid, true);
		assert.equal(parsed1.gtin, "03664798000016");
		assert.equal(parsed1.serialNumber, "1A2B3C4D5E6F7");
		assert.equal(parsed1.cryptoKey, "ABCD");
		assert.ok(parsed1.matchedTradeName?.includes("Ультракаин"));

		// Plain ASCII DataMatrix
		const rawAscii = "0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92XYZ123456789";
		const parsed2 = parseChestnyZnakDataMatrix(rawAscii);
		assert.equal(parsed2.isValid, true);
		assert.equal(parsed2.gtin, "03664798000016");
		assert.equal(parsed2.serialNumber, "1A2B3C4D5E6F7");
	});

	it("1.8 Validates item with DataMatrix marking code schema", () => {
		const validItem = {
			name: "Анестетик Ультракаин Д-С форте 1.7 мл",
			priceKopecks: 65000,
			quantity: 1,
			amountKopecks: 65000,
			subject: "goods_with_marking",
			method: "full_payment",
			vatRate: "vat_none",
			measure: "piece",
			taxDeductionCode: "code_1_standard",
			markingCode: "(01)03664798000016(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ",
		};

		const parsed = fiscalReceiptItemSchema.safeParse(validItem);
		assert.equal(parsed.success, true);
	});

	it("1.9 Rejects receipt when line item arithmetic does not balance", () => {
		const invalidItem = {
			name: "Пломба светоотверждаемая",
			priceKopecks: 450000,
			quantity: 2,
			amountKopecks: 800000, // 4500 * 2 = 9000 != 8000
		};

		const parsed = fiscalReceiptItemSchema.safeParse(invalidItem);
		assert.equal(parsed.success, false);
	});

	it("1.10 Validates 54-FZ Refund payload schema", () => {
		const refundInput = {
			originalPaymentId: "00000000-0000-0000-0000-000000000001",
			originalReceiptNumber: "CHK-2026-4821",
			originalFiscalSign: "3920194821",
			patientId: "00000000-0000-0000-0000-000000000001",
			refundCashKopecks: 0,
			refundElectronicKopecks: 500000,
			refundPrepaidKopecks: 0,
			totalRefundKopecks: 500000,
			reason: "Отказ пациента от продолжения ортодонтического лечения",
			cashierFullName: "Кассир Петрова А.В.",
			items: [
				{
					name: "Ортодонтическая коррекция (возврат)",
					priceKopecks: 500000,
					quantity: 1,
					amountKopecks: 500000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
		};

		const parsed = fiscalRefundPayloadSchema.safeParse(refundInput);
		assert.equal(parsed.success, true);
	});
});
