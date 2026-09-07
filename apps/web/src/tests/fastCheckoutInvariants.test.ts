import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyQuickCheckoutPreset,
	calculateCashChangeKop,
	calculateFastCheckoutDiscount,
	calculateSplitRemainingKop,
	calculateStageAdvanceAmount,
	generate54FzFiscalPayload,
	paymentsToSplitState,
	splitStateToCheckoutPayments,
	validateBuyerInn,
	validateCheckoutSplit,
} from "../components/payments/checkout/fastCheckoutEngine";

describe("54-FZ Fast Checkout Invariants (Mandates 8e, 8b, 8n)", () => {
	it("1. Physical persons NEVER blocked by INN (54-FZ Tag 1228 optional for citizens)", () => {
		// Empty INN for physical person
		const resEmpty = validateBuyerInn({
			clientType: "physical_person",
			buyerInn: "",
		});
		assert.equal(resEmpty.isValid, true);
		assert.equal(resEmpty.isRequired, false);

		// Non-digit or arbitrary input for physical person does not block checkout
		const resMalformed = validateBuyerInn({
			clientType: "physical_person",
			buyerInn: "ABC-123",
		});
		assert.equal(resMalformed.isValid, true);

		// Legal entity requires 10 digits
		const resLegalValid = validateBuyerInn({
			clientType: "legal_entity",
			buyerInn: "7701234567",
		});
		assert.equal(resLegalValid.isValid, true);
		assert.equal(resLegalValid.isRequired, true);

		const resLegalInvalid = validateBuyerInn({
			clientType: "legal_entity",
			buyerInn: "123",
		});
		assert.equal(resLegalInvalid.isValid, false);
		assert.match(resLegalInvalid.errorRu || "", /10 цифр/);

		// Individual entrepreneur requires 12 digits
		const resIpValid = validateBuyerInn({
			clientType: "individual_entrepreneur",
			buyerInn: "500123456789",
		});
		assert.equal(resIpValid.isValid, true);
		assert.equal(resIpValid.isRequired, true);

		const resIpInvalid = validateBuyerInn({
			clientType: "individual_entrepreneur",
			buyerInn: "7701234567",
		});
		assert.equal(resIpInvalid.isValid, false);
		assert.match(resIpInvalid.errorRu || "", /12 цифр/);
	});

	it("2. Additive personal and family deposits in 1-click presets", () => {
		const totalBillKop = 1000000; // 10 000.00 ₽
		const personalDepositRub = 3000;
		const familyDepositRub = 5000;
		const combinedDepositKop = Math.round((personalDepositRub + familyDepositRub) * 100); // 8 000.00 ₽ (800000 kop)

		// Preset "use_deposit" (Аванс + Карта)
		const presetDepositCard = applyQuickCheckoutPreset({
			totalBillKop,
			preset: "use_deposit",
			availableDepositKop: combinedDepositKop,
		});

		assert.equal(presetDepositCard.payments.length, 2);
		const depPayment = presetDepositCard.payments.find((p) => p.method === "patient_deposit");
		const cardPayment = presetDepositCard.payments.find((p) => p.method === "bank_card");
		assert.equal(depPayment?.amountKop, 800000); // 8 000.00 ₽ used
		assert.equal(cardPayment?.amountKop, 200000); // 2 000.00 ₽ card surcharge
		assert.equal(presetDepositCard.activeMethod, "patient_deposit");

		// Preset "deposit_cash" (Аванс + Нал)
		const presetDepositCash = applyQuickCheckoutPreset({
			totalBillKop,
			preset: "deposit_cash",
			availableDepositKop: combinedDepositKop,
		});
		assert.equal(presetDepositCash.payments.length, 2);
		const cashPayment = presetDepositCash.payments.find((p) => p.method === "cash");
		assert.equal(cashPayment?.amountKop, 200000); // 2 000.00 ₽ cash surcharge
		assert.equal(presetDepositCash.cashTenderedKop, 200000); // Cash tendered matched exactly

		// Preset "split_three_way" (Нал + Карта + Аванс родственника)
		const presetThreeWay = applyQuickCheckoutPreset({
			totalBillKop,
			preset: "split_three_way",
			availableDepositKop: combinedDepositKop,
		});
		assert.equal(presetThreeWay.payments.length, 3);
		const twDep = presetThreeWay.payments.find((p) => p.method === "patient_deposit");
		const twCard = presetThreeWay.payments.find((p) => p.method === "bank_card");
		const twCash = presetThreeWay.payments.find((p) => p.method === "cash");
		assert.equal(twDep?.amountKop, 800000);
		assert.equal(twCard?.amountKop, 100000); // 1 000.00 ₽
		assert.equal(twCash?.amountKop, 100000); // 1 000.00 ₽
		assert.equal(twDep.amountKop + twCard.amountKop + twCash.amountKop, totalBillKop);

		// Preset "warranty_100" (100% Гарантия / 0 ₽)
		const presetWarranty = applyQuickCheckoutPreset({
			totalBillKop,
			preset: "warranty_100",
			availableDepositKop: combinedDepositKop,
		});
		assert.equal(presetWarranty.payments.length, 0);
		assert.equal(presetWarranty.cashTenderedKop, 0);
	});

	it("3. Doctor discount autonomy up to 100% (warranty and colleague rework) with zero kopeck drift", () => {
		const grossKop = 4500000; // 45 000.00 ₽

		// 100% Warranty rework
		const warranty = calculateFastCheckoutDiscount({
			grossKop,
			preset: "warranty_100",
		});
		assert.equal(warranty.netKop, 0);
		assert.equal(warranty.netRub, 0);
		assert.equal(warranty.discountKop, 4500000);
		assert.equal(warranty.effectivePercent, 100);

		// 100% Colleague / staff treatment
		const staff = calculateFastCheckoutDiscount({
			grossKop,
			preset: "colleague_100",
		});
		assert.equal(staff.netKop, 0);
		assert.equal(staff.netRub, 0);
		assert.equal(staff.discountKop, 4500000);
		assert.equal(staff.effectivePercent, 100);

		// Round to hundreds (45 678.90 ₽ -> 45 600.00 ₽)
		const oddGrossKop = 4567890;
		const roundHundreds = calculateFastCheckoutDiscount({
			grossKop: oddGrossKop,
			preset: "round_hundreds",
		});
		assert.equal(roundHundreds.netKop, 4560000);
		assert.equal(roundHundreds.discountKop, 7890); // 78.90 ₽ discount in favor of patient
		assert.equal(roundHundreds.netRub, 45600);
	});

	it("4. Zero-due warranty checkout validation (targetBillKop === 0) cleanly passes without error", () => {
		const validation = validateCheckoutSplit({
			orderId: "ORD-WARRANTY-1",
			totalBillKop: 0,
			payments: [],
			clientType: "physical_person",
		});
		assert.equal(validation.isValid, true);
		assert.equal(validation.totalPaidKop, 0);
		assert.equal(validation.totalBillKop, 0);
		assert.equal(validation.remainingDueKop, 0);
		assert.equal(validation.errorMessageRu, undefined);
	});

	it("5. Exact cash change calculation down to kopecks", () => {
		// Required 3 450.50 ₽ (345050 kop), Tendered 5 000.00 ₽ (500000 kop)
		const change = calculateCashChangeKop(500000, 345050);
		assert.equal(change.isUnderpaid, false);
		assert.equal(change.changeDueKop, 154950); // 1 549.50 ₽
		assert.equal(change.missingKop, 0);

		// Underpaid: Required 5 000.00 ₽, Tendered 4 000.00 ₽
		const underpaid = calculateCashChangeKop(400000, 500000);
		assert.equal(underpaid.isUnderpaid, true);
		assert.equal(underpaid.missingKop, 100000);
		assert.equal(underpaid.changeDueKop, 0);

		// Exact: Required 5 000.00 ₽, Tendered 5 000.00 ₽ ("Без сдачи")
		const exact = calculateCashChangeKop(500000, 500000);
		assert.equal(exact.isUnderpaid, false);
		assert.equal(exact.changeDueKop, 0);
		assert.equal(exact.missingKop, 0);
	});

	it("6. Split 50/50 preserves exact odd kopeck parity", () => {
		const oddBillKop = 1000001; // 10 000.01 ₽
		const preset5050 = applyQuickCheckoutPreset({
			totalBillKop: oddBillKop,
			preset: "split_50_50",
			availableDepositKop: 0,
		});
		const card = preset5050.payments.find((p) => p.method === "bank_card");
		const cash = preset5050.payments.find((p) => p.method === "cash");
		assert.equal((card?.amountKop || 0) + (cash?.amountKop || 0), oddBillKop);
		// Card = 500000 kop, Cash = 500001 kop
		assert.equal(card?.amountKop, 500000);
		assert.equal(cash?.amountKop, 500001);
		assert.equal(preset5050.cashTenderedKop, 500001);
	});

	it("7. FFD 1.2 Tag 1215 advance offset calculation", () => {
		const totalStageAmountKop = 2000000; // 20 000.00 ₽
		const advanceAlreadyPaidKop = 1500000; // 15 000.00 ₽

		const stageCalc = calculateStageAdvanceAmount(
			totalStageAmountKop,
			"advance_offset_tag1215",
			advanceAlreadyPaidKop,
		);

		assert.equal(stageCalc.mode, "advance_offset_tag1215");
		assert.equal(stageCalc.advanceOffsetTag1215Kop, 1500000);
		assert.equal(stageCalc.requiredAmountKop, 500000); // 5 000.00 ₽ surcharge
		assert.equal(stageCalc.ffdTag1214, 4); // Full settlement with advance offset
		assert.equal(stageCalc.isAdvanceOffsetReceipt, true);
	});

	it("8. 54-FZ Fiscal Payload distribution generator", () => {
		const payload = generate54FzFiscalPayload(
			{
				orderId: "CHK-999",
				totalBillKop: 1000000,
				payments: [
					{ method: "patient_deposit", amountKop: 600000 },
					{ method: "bank_card", amountKop: 400000 },
				],
				patientPhone: "+79991112233",
				clientType: "physical_person",
				isElectronicReceiptOnly: true,
			},
			{
				paymentMethodTag1214: 4,
				paymentSubjectTag1212: 4,
			},
		);

		assert.equal(payload.totalSumKop, 1000000);
		assert.equal(payload.paymentsDistribution.advancePrepaymentKop, 600000);
		assert.equal(payload.paymentsDistribution.electronicKop, 400000);
		assert.equal(payload.paymentsDistribution.cashKop, 0);
		assert.equal(payload.paymentMethodTag1214, 4);
		assert.equal(payload.isElectronicReceiptOnly, true);
		assert.equal(payload.clientContact, "+79991112233");
	});
});
