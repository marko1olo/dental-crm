import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAdvanceDepositOffset,
	calculateMultiTenderAllocation,
	calculateProportionalMultiTenderRefund,
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
	format54FzFtsQrString,
	isValidGs1Checksum,
	kopecksToNumericString,
	kopecksToRub,
	parseAndValidate54FzFtsQrString,
	parseChestnyZnakDataMatrix,
	rubToKopecks,
	generateFiscalPeriodStatementHtml,
	exportFiscalPeriodStatementToCsv,
	calculateFiscalPeriodStatementTotals,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
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

	it("1.11 format54FzFtsQrString generates compliant FNS QR string (Приказ ЕД-7-20/662@)", () => {
		const qrString = format54FzFtsQrString({
			issuedAt: "2026-08-22T14:35:00.000Z",
			totalKopecks: 1250050, // 12,500.50 ₽
			fnSerial: "9960440301234567",
			fiscalDocumentNumber: 4821,
			fiscalSign: "3920194821",
			operationType: "income",
		});

		assert.ok(qrString.startsWith("t="));
		assert.ok(qrString.includes("&s=12500.50"));
		assert.ok(qrString.includes("&fn=9960440301234567"));
		assert.ok(qrString.includes("&i=4821"));
		assert.ok(qrString.includes("&fp=3920194821"));
		assert.ok(qrString.endsWith("&n=1"));
	});

	it("1.12 parseAndValidate54FzFtsQrString strictly parses valid FNS QR code", () => {
		const validQr = "t=20260822T1745&s=25000.00&fn=9960440302145896&i=8491&fp=2910485910&n=1";
		const parsed = parseAndValidate54FzFtsQrString(validQr);

		assert.equal(parsed.isValid, true);
		assert.equal(parsed.totalAmountRub, 25000);
		assert.equal(parsed.totalAmountKopecks, 2500000);
		assert.equal(parsed.fnSerial, "9960440302145896");
		assert.equal(parsed.fiscalDocumentNumber, 8491);
		assert.equal(parsed.fiscalSign, "2910485910");
		assert.equal(parsed.operationType, "income");
		assert.ok(parsed.issuedAtIso?.startsWith("2026-08-22"));
	});

	it("1.13 parseAndValidate54FzFtsQrString rejects malformed or incomplete QR strings", () => {
		// Missing 'fp'
		const missingFp = "t=20260822T1745&s=25000.00&fn=9960440302145896&i=8491&n=1";
		const res1 = parseAndValidate54FzFtsQrString(missingFp);
		assert.equal(res1.isValid, false);
		assert.ok(res1.errorMessage?.includes("обязательный реквизит 'fp'"));

		// Invalid FN length (15 digits instead of 16)
		const invalidFn = "t=20260822T1745&s=25000.00&fn=996044030214589&i=8491&fp=2910485910&n=1";
		const res2 = parseAndValidate54FzFtsQrString(invalidFn);
		assert.equal(res2.isValid, false);
		assert.ok(res2.errorMessage?.includes("16 цифр"));

		// Invalid operation type
		const invalidN = "t=20260822T1745&s=25000.00&fn=9960440302145896&i=8491&fp=2910485910&n=9";
		const res3 = parseAndValidate54FzFtsQrString(invalidN);
		assert.equal(res3.isValid, false);
		assert.ok(res3.errorMessage?.includes("Недопустимый признак расчета"));
	});

	it("1.14 calculateProportionalMultiTenderRefund — Zero-loss proportional multi-tender partial refund", () => {
		// Original payment: 2,000 Cash + 3,000 SBP QR = 5,000 RUB (500,000 kopecks)
		const originalTenders = {
			cashKopecks: 200000,
			cardKopecks: 0,
			sbpKopecks: 300000,
			advanceOffsetKopecks: 0,
			totalPaidKopecks: 500000,
		};

		// 1. Partial refund of 1,500 RUB (150,000 kopecks):
		// Cash share = 2000/5000 = 40% -> 600 RUB (60,000 коп)
		// SBP share = 3000/5000 = 60% -> 900 RUB (90,000 коп)
		const partialRefund = calculateProportionalMultiTenderRefund(originalTenders, 150000);
		assert.equal(partialRefund.refundCashKopecks, 60000);
		assert.equal(partialRefund.refundSbpKopecks, 90000);
		assert.equal(partialRefund.refundElectronicKopecks, 90000);
		assert.equal(partialRefund.totalRefundKopecks, 150000);
		assert.equal(partialRefund.refundCashRub, 600);
		assert.equal(partialRefund.refundSbpRub, 900);
		assert.equal(partialRefund.isPartialRefund, true);
		assert.equal(partialRefund.isFullRefund, false);

		// 2. Full refund of 5,000 RUB (500,000 kopecks)
		const fullRefund = calculateProportionalMultiTenderRefund(originalTenders, 500000);
		assert.equal(fullRefund.refundCashKopecks, 200000);
		assert.equal(fullRefund.refundSbpKopecks, 300000);
		assert.equal(fullRefund.totalRefundKopecks, 500000);
		assert.equal(fullRefund.isFullRefund, true);

		// 3. Three-way split with fractional penny distribution:
		// 1000 Cash (33.33%) + 1000 Card (33.33%) + 1000 Advance (33.33%) = 3000 RUB
		// Requested refund = 1000 kopecks (10.00 RUB) -> floor = 333 + 333 + 333 = 999 -> 1 remainder goes to highest fraction
		const threeWay = {
			cashKopecks: 100000,
			cardKopecks: 100000,
			sbpKopecks: 0,
			advanceOffsetKopecks: 100000,
			totalPaidKopecks: 300000,
		};
		const splitRefund = calculateProportionalMultiTenderRefund(threeWay, 1000);
		assert.equal(splitRefund.totalRefundKopecks, 1000);
		const sumBuckets =
			splitRefund.refundCashKopecks +
			splitRefund.refundCardKopecks +
			splitRefund.refundAdvanceOffsetKopecks;
		assert.equal(sumBuckets, 1000);
	});

	it("1.15 54-FZ Correction Receipt schema validation (Теги 1173, 1178, 1179)", () => {
		// Valid self-initiated correction receipt
		const validCorrection = {
			patientId: "00000000-0000-0000-0000-000000000001",
			operationType: "income",
			customerContact: "+79991234567",
			cashierFullName: "Старший Кассир",
			totalKopecks: 450000,
			electronicCardKopecks: 450000,
			isCorrection: true,
			correctionType: "self_initiated",
			correctionDocDate: "2026-08-22",
			correctionDocNumber: "АКТ-ИНВ-2026/08",
			items: [
				{
					name: "Лечение кариеса (чек коррекции)",
					priceKopecks: 450000,
					quantity: 1,
					amountKopecks: 450000,
				},
			],
		};

		const parsed = createFiscalReceiptPayloadSchema.safeParse(validCorrection);
		assert.equal(parsed.success, true);
		if (parsed.success) {
			assert.equal(parsed.data.isCorrection, true);
			assert.equal(parsed.data.correctionType, "self_initiated");
			assert.equal(parsed.data.correctionDocDate, "2026-08-22");
			assert.equal(parsed.data.correctionDocNumber, "АКТ-ИНВ-2026/08");
		}

		// Invalid correction missing document date & number
		const invalidCorrection = {
			...validCorrection,
			correctionDocDate: null,
			correctionDocNumber: null,
		};
		const parsedInvalid = createFiscalReceiptPayloadSchema.safeParse(invalidCorrection);
		assert.equal(parsedInvalid.success, false);
	});

	it("1.16 calculateFiscalPeriodStatementTotals — kopeck-exact shift aggregation and bank reconciliation", () => {
		const sampleShifts = [
			{
				shiftNumber: 101,
				date: "2026-08-20",
				cashierFullName: "Сидорова А. П.",
				receiptsCount: 4,
				cashIncomeRub: 12000,
				cashIncomeKopecks: 1200000,
				cardIncomeRub: 35000,
				cardIncomeKopecks: 3500000,
				sbpIncomeRub: 15000,
				sbpIncomeKopecks: 1500000,
				advanceOffsetIncomeRub: 8000,
				advanceOffsetIncomeKopecks: 800000,
				returnsTotalRub: 2000,
				returnsTotalKopecks: 200000,
				shiftRevenueTotalRub: 68000,
				shiftRevenueTotalKopecks: 6800000,
			},
			{
				shiftNumber: 102,
				date: "2026-08-21",
				cashierFullName: "Сидорова А. П.",
				receiptsCount: 6,
				cashIncomeRub: 5000,
				cashIncomeKopecks: 500000,
				cardIncomeRub: 40000,
				cardIncomeKopecks: 4000000,
				sbpIncomeRub: 20000,
				sbpIncomeKopecks: 2000000,
				advanceOffsetIncomeRub: 5000,
				advanceOffsetIncomeKopecks: 500000,
				returnsTotalRub: 0,
				returnsTotalKopecks: 0,
				shiftRevenueTotalRub: 70000,
				shiftRevenueTotalKopecks: 7000000,
			},
		];

		const { totals, bankReconciliation } = calculateFiscalPeriodStatementTotals(sampleShifts, 110000, 1650);

		assert.equal(totals.shiftsCount, 2);
		assert.equal(totals.totalReceiptsCount, 10);
		assert.equal(totals.totalCashIncomeRub, 17000);
		assert.equal(totals.totalCashIncomeKopecks, 1700000);
		assert.equal(totals.totalCardIncomeRub, 75000);
		assert.equal(totals.totalCardIncomeKopecks, 7500000);
		assert.equal(totals.totalSbpIncomeRub, 35000);
		assert.equal(totals.totalSbpIncomeKopecks, 3500000);
		assert.equal(totals.totalElectronicRub, 110000);
		assert.equal(totals.totalElectronicKopecks, 11000000);
		assert.equal(totals.totalAdvanceOffsetRub, 13000);
		assert.equal(totals.totalAdvanceOffsetKopecks, 1300000);
		assert.equal(totals.totalReturnsRub, 2000);
		assert.equal(totals.totalReturnsKopecks, 200000);
		assert.equal(totals.totalRevenueRub, 138000);
		assert.equal(totals.totalRevenueKopecks, 13800000);

		// Bank reconciliation
		assert.equal(bankReconciliation.totalCardAndSbpKktRub, 110000);
		assert.equal(bankReconciliation.totalBankStatementRub, 110000);
		assert.equal(bankReconciliation.bankAcquiringFeeRub, 1650);
		assert.equal(bankReconciliation.netBankDepositRub, 108350);
		assert.equal(bankReconciliation.discrepancyRub, 0);
		assert.equal(bankReconciliation.status, "reconciled");
	});

	it("1.17 generateFiscalPeriodStatementHtml — generates official A4 landscape blank with license, KKT, FN & stamps", () => {
		const html = generateFiscalPeriodStatementHtml({
			clinicRequisites: {
				name: "ООО «Стоматологическая клиника ДЕНТЕ»",
				inn: "7701234567",
				ogrn: "1027700123456",
				address: "г. Москва, ул. Клиническая, д. 10",
				licenseNumber: "№ ЛО41-01137-77/00368421",
				kktRegNumber: "0004829104058291",
				kktSerialNumber: "019482019482",
				fnSerialNumber: "9960440302145896",
				ofdName: "АО «ПЕРВЫЙ ОФД»",
				chiefExecutiveFullName: "Смирнов А. В.",
				chiefAccountantFullName: "Кузнецова Е. И.",
				defaultCashierFullName: "Сидорова А. П.",
			},
			statementNumber: "ВЕД-2026/08-01",
			periodStart: "2026-08-01",
			periodEnd: "2026-08-25",
			periodLabelRu: "за период с 01.08.2026 по 25.08.2026",
			shifts: [
				{
					shiftNumber: 1,
					date: "2026-08-01",
					cashierFullName: "Сидорова А. П.",
					receiptsCount: 5,
					cashIncomeRub: 10000,
					cashIncomeKopecks: 1000000,
					cardIncomeRub: 20000,
					cardIncomeKopecks: 2000000,
					sbpIncomeRub: 10000,
					sbpIncomeKopecks: 1000000,
					advanceOffsetIncomeRub: 5000,
					advanceOffsetIncomeKopecks: 500000,
					returnsTotalRub: 0,
					returnsTotalKopecks: 0,
					shiftRevenueTotalRub: 45000,
					shiftRevenueTotalKopecks: 4500000,
				},
			],
		});

		// Check clinic header and statutory tags
		assert.ok(html.includes("№ ЛО41-01137-77/00368421"), "Must include medical license number");
		assert.ok(html.includes("0004829104058291"), "Must include KKT registration number");
		assert.ok(html.includes("9960440302145896"), "Must include FN serial number");
		assert.ok(html.includes("АО «ПЕРВЫЙ ОФД»"), "Must include OFD name");
		assert.ok(html.includes("Сводная ведомость фискальных операций и выручки за период"));
		assert.ok(html.includes("Тег 1031"));
		assert.ok(html.includes("Тег 1081"));
		assert.ok(html.includes("Тег 1215"));
		assert.ok(html.includes("Тег 1054=2"));
		assert.ok(html.includes("Сверка безналичной выручки (Эквайринг + СБП) с банковской выпиской"));
		assert.ok(html.includes("Смирнов А. В."));
		assert.ok(html.includes("Кузнецова Е. И."));
		assert.ok(html.includes("Сидорова А. П."));
		assert.ok(html.includes("[ М. П. ]"));
	});

	it("1.18 exportFiscalPeriodStatementToCsv — exports RFC 4180 CSV with UTF-8 BOM for 1C", () => {
		const csv = exportFiscalPeriodStatementToCsv({
			clinicRequisites: {
				name: "ООО «Стоматологическая клиника ДЕНТЕ»",
				inn: "7701234567",
				ogrn: "1027700123456",
				address: "г. Москва, ул. Клиническая, д. 10",
				licenseNumber: "№ ЛО41-01137-77/00368421",
				kktRegNumber: "0004829104058291",
				kktSerialNumber: "019482019482",
				fnSerialNumber: "9960440302145896",
			},
			statementNumber: "ВЕД-89",
			periodStart: "2026-08-01",
			periodEnd: "2026-08-25",
			shifts: [
				{
					shiftNumber: 1,
					date: "2026-08-01",
					cashierFullName: "Сидорова А. П.",
					receiptsCount: 3,
					cashIncomeRub: 5000,
					cashIncomeKopecks: 500000,
					cardIncomeRub: 15000,
					cardIncomeKopecks: 1500000,
					sbpIncomeRub: 5000,
					sbpIncomeKopecks: 500000,
					advanceOffsetIncomeRub: 0,
					advanceOffsetIncomeKopecks: 0,
					returnsTotalRub: 0,
					returnsTotalKopecks: 0,
					shiftRevenueTotalRub: 25000,
					shiftRevenueTotalKopecks: 2500000,
				},
			],
		});

		assert.ok(csv.startsWith("\uFEFF"), "Must start with UTF-8 BOM for native 1C / Excel compatibility");
		assert.ok(csv.includes("№ ЛО41-01137-77/00368421"));
		assert.ok(csv.includes("0004829104058291"));
		assert.ok(csv.includes("9960440302145896"));
		assert.ok(csv.includes("СВОДНАЯ ВЕДОМОСТЬ ФИСКАЛЬНЫХ ОПЕРАЦИЙ И ВЫРУЧКИ ЗА ПЕРИОД"));
		assert.ok(csv.includes("=== РАСШИФРОВКА СВЕРКИ С БАНКОВСКОЙ ВЫПИСКОЙ (ЭКВАЙРИНГ И СБП) ==="));
		assert.ok(csv.includes("ИТОГО ЗА ПЕРИОД"));
	});
});

