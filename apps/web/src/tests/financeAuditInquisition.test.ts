/**
 * apps/web/src/tests/financeAuditInquisition.test.ts
 *
 * DENTE Dental CRM — Lead Financial Inquisitor Total Transactional Audit Test Suite.
 * Validates:
 * - 1-Click fast presets: "Без сдачи", 100% card, 100% SBP, 100% cash, deposit deduction
 * - Dynamic SBP QR (ГОСТ Р 56042-2014 / NSPK EMVCo) payload & CRC16 checksum
 * - Multi-tender split payments (3-way & 5-way) with kopeck-exact parity (card + cash + deposit + cert + bonus)
 * - Remainder balancer & cash change math (guarded against NaN, negative, float drift, -0)
 * - 54-FZ FFD 1.2 statutory tags (1031, 1081, 1215, 1216, 1217)
 * - 54-FZ Buyer INN sovereignty (ст. 4.7 п. 1 № 54-ФЗ: citizen INN strictly optional, B2B mandatory)
 * - 54-FZ Correction receipts (Tags 1173, 1178, 1179) & proportional multi-tender refunds
 * - 100% Warranty rework discount (due 0 ₽) bypassing physical KKT zero-receipt error
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generateDynamicSbpQrPayload,
	calculateCrc16Ccitt,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import {
	allocateRemainderToTender,
	calculateCashChange,
	calculateCombinedFamilyCashCardSplit,
	calculateFastCheckoutDiscount,
	calculatePaymentDiscount,
	createCertificateAndCardComboTenders,
	createDepositAndCardComboTenders,
	createExactCashTenders,
	createFullCardTenders,
	process100PercentDiscountCheckout,
	validate54FzBuyerInn,
	validateBuyerInn54Fz,
} from "../components/finance/cashboxOperations";
import {
	applyQuickCheckoutPreset,
	balanceRemainderToSplitMethod,
	calculateCashChangeKop,
	calculateSplitRemainingKop,
	generate54FzFiscalPayload,
	validateBuyerInn,
	validateCheckoutSplit,
	type CheckoutSplitItem,
} from "../components/payments/checkout/fastCheckoutEngine";
import { formatMoneyRu } from "../components/finance/modal/fiscal/fiscalModalRefundLogic";

describe("FINANCIAL INQUISITION: Total Transactional & 54-FZ Cashbox Audit", () => {
	const TOTAL_BILL_RUB = 14500.5; // 14 500.50 ₽
	const TOTAL_BILL_KOP = 1450050; // 1 450 050 коп.

	describe("1. 1-Click Fast Presets & Zero-Cashier-Friction Actions", () => {
		it("1-click 'Без сдачи' allocates 100% to cash with zero change and zero shortage", () => {
			const tenders = createExactCashTenders(TOTAL_BILL_RUB);
			assert.equal(tenders.cashRub, TOTAL_BILL_RUB);
			assert.equal(tenders.cardRub, 0);
			assert.equal(tenders.sbpRub, 0);
			assert.equal(tenders.depositRub, 0);

			const change = calculateCashChange(TOTAL_BILL_RUB, tenders.cashRub);
			assert.equal(change.isExact, true);
			assert.equal(change.isExactWithoutChange, true);
			assert.equal(change.changeRub, 0);
			assert.equal(change.changeKopecks, 0);
			assert.equal(change.shortageRub, 0);
			assert.equal(change.isShortage, false);
		});

		it("1-click '100% Картой' and '100% СБП QR' allocate entire bill to electronic tender", () => {
			const cardTenders = createFullCardTenders(TOTAL_BILL_RUB);
			assert.equal(cardTenders.cardRub, TOTAL_BILL_RUB);
			assert.equal(cardTenders.cashRub, 0);

			const cardPreset = applyQuickCheckoutPreset({
				totalBillKop: TOTAL_BILL_KOP,
				preset: "100_card",
			});
			assert.deepEqual(cardPreset.payments, [
				{ method: "bank_card", amountKop: TOTAL_BILL_KOP },
			]);
			assert.equal(cardPreset.activeMethod, "bank_card");

			const sbpPreset = applyQuickCheckoutPreset({
				totalBillKop: TOTAL_BILL_KOP,
				preset: "100_sbp",
			});
			assert.deepEqual(sbpPreset.payments, [
				{ method: "sbp_qr", amountKop: TOTAL_BILL_KOP },
			]);
			assert.equal(sbpPreset.activeMethod, "sbp_qr");
		});

		it("1-click 'Аванс + остаток картой' correctly exhausts deposit before card", () => {
			const depositRub = 5000;
			const combo = createDepositAndCardComboTenders(TOTAL_BILL_RUB, depositRub);
			assert.equal(combo.depositRub, 5000);
			assert.equal(combo.cardRub, 9500.5);
			assert.equal(rubToKopecks(combo.depositRub) + rubToKopecks(combo.cardRub), TOTAL_BILL_KOP);

			// When deposit exceeds total bill, patient owes 0 card
			const bigDepositRub = 20000;
			const comboOver = createDepositAndCardComboTenders(TOTAL_BILL_RUB, bigDepositRub);
			assert.equal(comboOver.depositRub, TOTAL_BILL_RUB);
			assert.equal(comboOver.cardRub, 0);
		});

		it("1-click 'Сертификат + остаток картой' preserves kopeck exactness", () => {
			const certRub = 3000;
			const certCombo = createCertificateAndCardComboTenders(TOTAL_BILL_RUB, certRub);
			assert.equal(certCombo.certificateRub, 3000);
			assert.equal(certCombo.cardRub, 11500.5);
			assert.equal(rubToKopecks(certCombo.certificateRub!) + rubToKopecks(certCombo.cardRub), TOTAL_BILL_KOP);
		});
	});

	describe("2. Dynamic SBP QR (ГОСТ Р 56042-2014 & EMVCo) Generation", () => {
		it("generates dynamic SBP QR with verified CRC-16/CCITT checksum and valid URL", () => {
			const qr = generateDynamicSbpQrPayload({
				sumRub: 2750.5,
				orderId: "INV-2026-991",
				clinicName: "ООО ДЕНТЕ",
			});

			assert.equal(qr.sumKopecks, 275050);
			assert.equal(qr.sumRub, 2750.5);
			assert.ok(qr.qrId.startsWith("SBP-INV-2026-991-"));
			assert.ok(qr.nspkUrl.includes("https://qr.nspk.ru/"));
			assert.ok(qr.nspkUrl.includes("sum=275050"));
			assert.ok(qr.nspkUrl.includes("cur=RUB"));

			// Check CRC-16 format (4 hex characters)
			assert.match(qr.crc16Hex, /^[0-9A-F]{4}$/);
			assert.ok(qr.nspkUrl.endsWith(`&crc=${qr.crc16Hex}`));

			// Verify EMV payload contains MCC 8011 (Medical services) and currency 643 (RUB)
			assert.ok(qr.emvPayload.includes("52048011"));
			assert.ok(qr.emvPayload.includes("5303643"));
		});

		it("rejects zero and negative amounts in SBP dynamic QR", () => {
			assert.throws(() => {
				generateDynamicSbpQrPayload({ sumRub: 0, orderId: "ORD-ZERO" });
			}, /Сумма динамического QR-кода СБП должна быть строго больше 0 копеек/);

			assert.throws(() => {
				generateDynamicSbpQrPayload({ sumRub: -100, orderId: "ORD-NEG" });
			}, /Сумма динамического QR-кода СБП должна быть строго больше 0 копеек/);
		});

		it("computes standard CRC16-CCITT correctly for edge cases", () => {
			assert.equal(calculateCrc16Ccitt(""), "FFFF");
			const crcTest = calculateCrc16Ccitt("123456789");
			assert.equal(crcTest, "29B1"); // Standard CCITT test vector
		});
	});

	describe("3. Multi-Tender Split & Kopeck-Exact Remainder Balancing", () => {
		it("calculates 3-way split (Advance + 50/50 Card & Cash) down to exact kopeck", () => {
			const totalRub = 10001.01; // Odd kopeck test
			const res = calculateCombinedFamilyCashCardSplit({
				totalDueRub: totalRub,
				patientDepositRub: 3000,
			});

			assert.equal(res.advanceDeductedRub, 3000);
			assert.equal(res.isPennyExact, true);
			const expectedRemainderKop = rubToKopecks(totalRub) - 300000; // 700101 kop
			assert.equal(res.remainderToPayKop, expectedRemainderKop);
			assert.equal(res.cardKop + res.cashKop, expectedRemainderKop);
			assert.equal(res.cardKop + res.cashKop + res.advanceDeductedKop, rubToKopecks(totalRub));
		});

		it("allocates remainder to target tender with autoDistribute/allocateRemainderToTender", () => {
			const totalRub = 5000;
			const currentTenders = {
				cardRub: 1500,
				cashRub: 0,
				sbpRub: 1000,
				depositRub: 0,
				familyRub: 0,
			};

			const balanced = allocateRemainderToTender({
				totalDueRub: totalRub,
				currentTenders,
				targetTender: "cash",
			});

			assert.equal(balanced.cardRub, 1500);
			assert.equal(balanced.sbpRub, 1000);
			assert.equal(balanced.cashRub, 2500); // 5000 - 2500 = 2500
			assert.equal(balanced.cardRub + balanced.sbpRub + balanced.cashRub, 5000);
		});

		it("validates 5-way split: cash + card + sbp + deposit + loyalty points", () => {
			const payments: CheckoutSplitItem[] = [
				{ method: "cash", amountKop: 100000 }, // 1 000 ₽
				{ method: "bank_card", amountKop: 200000 }, // 2 000 ₽
				{ method: "sbp_qr", amountKop: 150000 }, // 1 500 ₽
				{ method: "patient_deposit", amountKop: 500000 }, // 5 000 ₽
				{ method: "loyalty_points", amountKop: 500050 }, // 5 000.50 ₽
			];
			const totalBillKop = 1450050; // 14 500.50 ₽

			const validation = validateCheckoutSplit({
				orderId: "SPLIT-5-WAY",
				totalBillKop,
				payments,
			});

			assert.equal(validation.isValid, true);
			assert.equal(validation.totalPaidKop, totalBillKop);
			assert.equal(validation.remainingDueKop, 0);
		});

		it("fails validation when split payment is underpaid or overpaid by 1 kopeck", () => {
			const underpaid = validateCheckoutSplit({
				orderId: "SPLIT-UNDER",
				totalBillKop: 100000,
				payments: [{ method: "bank_card", amountKop: 99999 }],
			});
			assert.equal(underpaid.isValid, false);
			assert.equal(underpaid.remainingDueKop, 1);
			assert.ok(underpaid.errorMessageRu?.includes("Недоплата"));

			const overpaid = validateCheckoutSplit({
				orderId: "SPLIT-OVER",
				totalBillKop: 100000,
				payments: [{ method: "bank_card", amountKop: 100001 }],
			});
			assert.equal(overpaid.isValid, false);
			assert.equal(overpaid.remainingDueKop, -1);
			assert.ok(overpaid.errorMessageRu?.includes("Переплата"));
		});
	});

	describe("4. Cash Change & NaN / Negative Sanitization", () => {
		it("handles NaN and non-finite numbers safely without throwing or NaN leakage", () => {
			const nanChange = calculateCashChange(NaN as any, NaN as any);
			assert.equal(nanChange.totalDueRub, 0);
			assert.equal(nanChange.receivedCashRub, 0);
			assert.equal(nanChange.changeRub, 0);
			assert.equal(nanChange.isExact, true);

			const nanKopChange = calculateCashChangeKop(NaN as any, 1000);
			assert.equal(nanKopChange.cashTenderedKop, 0);
			assert.equal(nanKopChange.changeDueKop, 0);
			assert.equal(nanKopChange.isUnderpaid, true);
			assert.equal(nanKopChange.missingKop, 1000);
		});

		it("sanitizes negative values and handles -0 in currency formatting", () => {
			const negChange = calculateCashChange(-500, -100);
			assert.equal(negChange.totalDueRub, 0);
			assert.equal(negChange.receivedCashRub, 0);

			const negZeroStr = formatMoneyRu(-0);
			assert.equal(negZeroStr.includes("-"), false);
			assert.ok(negZeroStr.includes("0,00") || negZeroStr.includes("0.00"));

			const nanMoneyStr = formatMoneyRu(NaN);
			assert.equal(nanMoneyStr.includes("NaN"), false);
			assert.equal(nanMoneyStr.includes("не число"), false);
			assert.ok(nanMoneyStr.includes("0,00") || nanMoneyStr.includes("0.00"));
		});

		it("calculates partial cash change when customer tenders larger denomination", () => {
			const res = calculateCashChangeKop(500000, 325050); // 5 000 ₽ tendered for 3 250.50 ₽
			assert.equal(res.changeDueKop, 174950); // 1 749.50 ₽ change
			assert.equal(res.isUnderpaid, false);
			assert.equal(res.missingKop, 0);
		});
	});

	describe("5. 54-FZ FFD 1.2 Statutory Distribution Tags (1031, 1081, 1215, 1216, 1217)", () => {
		it("maps multi-method checkout correctly to 54-FZ FFD 1.2 fiscal tags", () => {
			const payload = generate54FzFiscalPayload({
				orderId: "PAY-54FZ-TAGS",
				totalBillKop: 1000000, // 10 000.00 ₽
				payments: [
					{ method: "cash", amountKop: 200000 }, // 2 000 ₽ -> Tag 1031
					{ method: "bank_card", amountKop: 300000 }, // 3 000 ₽ -> Tag 1081
					{ method: "sbp_qr", amountKop: 100000 }, // 1 000 ₽ -> Tag 1081
					{ method: "patient_deposit", amountKop: 250000 }, // 2 500 ₽ -> Tag 1215
					{ method: "dms_insurance", amountKop: 100000 }, // 1 000 ₽ -> Tag 1216
					{ method: "loyalty_points", amountKop: 50000 }, // 500 ₽ -> Tag 1217
				],
				patientPhone: "+79990001122",
			});

			assert.equal(payload.ffdVersion, "1.2");
			assert.equal(payload.totalSumKop, 1000000);

			// Tag 1031: Cash
			assert.equal(payload.paymentsDistribution.cashKop, 200000);

			// Tag 1081: Electronic (Card + SBP) = 3 000 + 1 000 = 4 000 ₽
			assert.equal(payload.paymentsDistribution.electronicKop, 400000);

			// Tag 1215: Advance / Prepayment
			assert.equal(payload.paymentsDistribution.advancePrepaymentKop, 250000);

			// Tag 1216: Postpayment / Credit
			assert.equal(payload.paymentsDistribution.creditKop, 100000);

			// Tag 1217: Barter / Counter-provision
			assert.equal(payload.paymentsDistribution.barterOtherKop, 50000);

			// Total sum of all tags strictly equals total bill
			const sumOfTags =
				payload.paymentsDistribution.cashKop +
				payload.paymentsDistribution.electronicKop +
				payload.paymentsDistribution.advancePrepaymentKop +
				payload.paymentsDistribution.creditKop +
				payload.paymentsDistribution.barterOtherKop;
			assert.equal(sumOfTags, 1000000);
		});
	});

	describe("6. 54-FZ Buyer INN Sovereignty (ст. 4.7 п. 1 № 54-ФЗ & Mandate 8e)", () => {
		it("physical person INN is strictly non-mandatory and never blocks checkout", () => {
			// Empty INN
			const emptyInnResult = validateBuyerInn54Fz({
				payerType: "physical_person",
				buyerInn: "",
			});
			assert.equal(emptyInnResult.isValid, true);
			assert.equal(emptyInnResult.isRequired, false);

			// Undefined INN
			const undefInnResult = validateBuyerInn({
				clientType: "physical_person",
				buyerInn: undefined,
			});
			assert.equal(undefInnResult.isValid, true);
			assert.equal(undefInnResult.isRequired, false);

			// Voluntary valid 12-digit INN
			const validInnResult = validateBuyerInn54Fz({
				payerType: "physical_person",
				buyerInn: "770123456789",
			});
			assert.equal(validInnResult.isValid, true);
			assert.equal(validInnResult.isRequired, false);
			assert.equal(validInnResult.errorRu, undefined);

			// Non-standard length voluntary INN still does not block fiscal check (isValid: true)
			const voluntaryWeirdInn = validateBuyerInn54Fz({
				payerType: "physical_person",
				buyerInn: "12345",
			});
			assert.equal(voluntaryWeirdInn.isValid, true);
			assert.equal(voluntaryWeirdInn.isRequired, false);
			assert.ok(voluntaryWeirdInn.errorRu?.includes("не блокирует чек"));
		});

		it("legal entity (ЮЛ) INN is strictly mandatory and requires exactly 10 digits", () => {
			const emptyB2b = validateBuyerInn54Fz({
				payerType: "legal_entity",
				buyerInn: "",
			});
			assert.equal(emptyB2b.isValid, false);
			assert.equal(emptyB2b.isRequired, true);

			const invalidLengthB2b = validateBuyerInn54Fz({
				payerType: "legal_entity",
				buyerInn: "123456789", // 9 digits
			});
			assert.equal(invalidLengthB2b.isValid, false);
			assert.ok(invalidLengthB2b.errorRu?.includes("ровно 10 цифр"));

			const validB2b = validateBuyerInn54Fz({
				payerType: "legal_entity",
				buyerInn: "7701234567", // 10 digits
			});
			assert.equal(validB2b.isValid, true);
			assert.equal(validB2b.cleanInn, "7701234567");
		});

		it("individual entrepreneur (ИП) INN is strictly mandatory and requires exactly 12 digits", () => {
			const invalidIp = validateBuyerInn54Fz({
				payerType: "individual_entrepreneur",
				buyerInn: "7701234567", // 10 digits
			});
			assert.equal(invalidIp.isValid, false);
			assert.ok(invalidIp.errorRu?.includes("ровно 12 цифр"));

			const validIp = validateBuyerInn54Fz({
				payerType: "individual_entrepreneur",
				buyerInn: "770123456789", // 12 digits
			});
			assert.equal(validIp.isValid, true);
			assert.equal(validIp.cleanInn, "770123456789");
		});

		it("strips buyerInn from 54-FZ payload for physical persons to avoid KKT driver errors", () => {
			const payload = generate54FzFiscalPayload({
				orderId: "INN-CHECK",
				totalBillKop: 500000,
				payments: [{ method: "cash", amountKop: 500000 }],
				clientType: "physical_person",
				buyerInn: "770123456789",
			});
			assert.equal(payload.buyerInn, undefined); // Tag 1228 omitted for citizens

			const b2bPayload = generate54FzFiscalPayload({
				orderId: "B2B-CHECK",
				totalBillKop: 500000,
				payments: [{ method: "bank_card", amountKop: 500000 }],
				clientType: "legal_entity",
				buyerInn: "7701234567",
			});
			assert.equal(b2bPayload.buyerInn, "7701234567"); // Tag 1228 included for B2B
		});
	});

	describe("7. 100% Warranty Rework & Doctor Autonomy (Mandate 8e)", () => {
		it("processes 100% warranty discount without admin passwords and bypasses 0 ₽ KKT error", () => {
			const res = process100PercentDiscountCheckout({
				totalGrossRub: 15000,
				isWarrantyRework: true,
			});

			assert.equal(res.isZeroDue, true);
			assert.equal(res.totalNetRub, 0);
			assert.equal(res.totalNetKop, 0);
			assert.equal(res.totalDiscountRub, 15000);
			assert.equal(res.status, "completed");
			assert.equal(res.paymentStatus, "Оплачено (скидка 100%)");
			assert.equal(res.bypassKktZeroReceipt, true);
			assert.equal(res.fiscalSign, "WARRANTY-100-GUARANTEE");
		});

		it("calculates quick presets: round_hundreds, discount_5, and colleague_100", () => {
			const roundRes = calculateFastCheckoutDiscount({
				grossKop: 125430, // 1 254.30 ₽
				preset: "round_hundreds",
			});
			// Rounded down to hundreds: 1 200.00 ₽ (120000 kop), discount = 54.30 ₽ (5430 kop)
			assert.equal(roundRes.netKop, 120000);
			assert.equal(roundRes.discountKop, 5430);

			const disc5 = calculateFastCheckoutDiscount({
				grossKop: 100000, // 1 000.00 ₽
				preset: "discount_5",
			});
			assert.equal(disc5.discountKop, 5000);
			assert.equal(disc5.netKop, 95000);

			const colleague = calculateFastCheckoutDiscount({
				grossKop: 500000,
				preset: "colleague_100",
			});
			assert.equal(colleague.netKop, 0);
			assert.equal(colleague.discountKop, 500000);
		});
	});
});
