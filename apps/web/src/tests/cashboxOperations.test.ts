/**
 * cashboxOperations.test.ts
 *
 * Unit test suite for 54-FZ non-blocking buyer INN validation,
 * 100% discount warranty zero-barrier checkout,
 * and 1-tap multi-tender remainder allocation.
 *
 * Mandate 8e, Items 7 & 9 compliant.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	validateBuyerInn54Fz,
	process100PercentDiscountCheckout,
	allocateRemainderToTender,
	getFastCombinedTenderPresets,
} from "../components/finance/cashboxOperations";

describe("Cashbox Operations — Mandate 8e & 54-FZ Invariants", () => {
	describe("1. validateBuyerInn54Fz (Mandate 8e Item 9: 54-FZ without obstacles)", () => {
		it("Physical person without INN is 100% valid and never required", () => {
			const resEmpty = validateBuyerInn54Fz({
				payerType: "physical_person",
				buyerInn: "",
			});
			assert.equal(resEmpty.isValid, true);
			assert.equal(resEmpty.isRequired, false);
			assert.equal(resEmpty.errorRu, undefined);

			const resUndefined = validateBuyerInn54Fz({
				payerType: "physical_person",
				buyerInn: undefined,
			});
			assert.equal(resUndefined.isValid, true);
			assert.equal(resUndefined.isRequired, false);
		});

		it("Default payerType is physical_person and does not require INN", () => {
			const res = validateBuyerInn54Fz({});
			assert.equal(res.isValid, true);
			assert.equal(res.isRequired, false);
		});

		it("Physical person voluntary valid INN (12 or 10 digits) is accepted with cleanInn", () => {
			const res12 = validateBuyerInn54Fz({
				payerType: "physical_person",
				buyerInn: " 7701 2345 6789 ",
			});
			assert.equal(res12.isValid, true);
			assert.equal(res12.isRequired, false);
			assert.equal(res12.cleanInn, "770123456789");
			assert.equal(res12.errorRu, undefined);

			const res10 = validateBuyerInn54Fz({
				payerType: "physical_person",
				buyerInn: "7701234567",
			});
			assert.equal(res10.isValid, true);
			assert.equal(res10.isRequired, false);
			assert.equal(res10.cleanInn, "7701234567");
		});

		it("Physical person voluntary irregular INN warns but NEVER blocks receipt (isValid: true)", () => {
			const res = validateBuyerInn54Fz({
				payerType: "physical_person",
				buyerInn: "12345",
			});
			// Mandate 8e: Even with unusual length, isValid MUST remain true for physical persons!
			assert.equal(res.isValid, true);
			assert.equal(res.isRequired, false);
			assert.ok(res.errorRu?.includes("для 54-ФЗ поле опционально"));
		});

		it("Legal entity (B2B) strictly requires 10-digit INN per 54-FZ", () => {
			const resEmpty = validateBuyerInn54Fz({
				payerType: "legal_entity",
				buyerInn: "",
			});
			assert.equal(resEmpty.isValid, false);
			assert.equal(resEmpty.isRequired, true);
			assert.ok(resEmpty.errorRu?.includes("обязателен ИНН (10 цифр)"));

			const resBadLength = validateBuyerInn54Fz({
				payerType: "legal_entity",
				buyerInn: "770123456", // 9 digits
			});
			assert.equal(resBadLength.isValid, false);
			assert.equal(resBadLength.isRequired, true);

			const resValid = validateBuyerInn54Fz({
				payerType: "legal_entity",
				buyerInn: "7701234567", // 10 digits
			});
			assert.equal(resValid.isValid, true);
			assert.equal(resValid.isRequired, true);
			assert.equal(resValid.cleanInn, "7701234567");
		});

		it("Individual Entrepreneur (ИП) strictly requires 12-digit INN per 54-FZ", () => {
			const res10 = validateBuyerInn54Fz({
				payerType: "individual_entrepreneur",
				buyerInn: "7701234567", // 10 digits instead of 12
			});
			assert.equal(res10.isValid, false);
			assert.equal(res10.isRequired, true);

			const res12 = validateBuyerInn54Fz({
				payerType: "individual_entrepreneur",
				buyerInn: "770123456789", // 12 digits
			});
			assert.equal(res12.isValid, true);
			assert.equal(res12.isRequired, true);
			assert.equal(res12.cleanInn, "770123456789");
		});
	});

	describe("2. process100PercentDiscountCheckout (Mandate 8e Item 7: Warranty Rework & 0 ₽ checkout)", () => {
		it("100% discount closes visit with 0 ₽ and sets status to 'Оплачено (скидка 100%)'", () => {
			const res = process100PercentDiscountCheckout({
				totalGrossRub: 15400,
				discountPercent: 100,
			});

			assert.equal(res.isZeroDue, true);
			assert.equal(res.totalGrossRub, 15400);
			assert.equal(res.totalDiscountRub, 15400);
			assert.equal(res.totalNetRub, 0);
			assert.equal(res.totalNetKop, 0);
			assert.equal(res.status, "completed");
			assert.equal(res.paymentStatus, "Оплачено (скидка 100%)");
			assert.equal(res.bypassKktZeroReceipt, true);
			assert.equal(res.fiscalSign, "WARRANTY-100-GUARANTEE");
			assert.ok(res.statusBannerText.includes("Оплачено (скидка 100%)"));
		});

		it("Warranty rework flag forces 100% discount and bypasses KKT 0 sum failure", () => {
			const res = process100PercentDiscountCheckout({
				totalGrossRub: 8500,
				isWarrantyRework: true,
			});

			assert.equal(res.isZeroDue, true);
			assert.equal(res.totalNetRub, 0);
			assert.equal(res.status, "completed");
			assert.equal(res.bypassKktZeroReceipt, true);
			assert.ok(res.statusBannerText.includes("Гарантийный прием"));
		});

		it("Staff colleague flag sets 100% discount with staff banner and bypasses KKT", () => {
			const res = process100PercentDiscountCheckout({
				totalGrossRub: 12000,
				isStaffColleague: true,
			});

			assert.equal(res.isZeroDue, true);
			assert.equal(res.totalNetRub, 0);
			assert.equal(res.bypassKktZeroReceipt, true);
			assert.ok(res.statusBannerText.includes("Лечение персонала"));
		});

		it("Partial discount (e.g. 15%) calculates exact net and does NOT bypass KKT", () => {
			const res = process100PercentDiscountCheckout({
				totalGrossRub: 10000,
				discountPercent: 15,
			});

			assert.equal(res.isZeroDue, false);
			assert.equal(res.totalDiscountRub, 1500);
			assert.equal(res.totalNetRub, 8500);
			assert.equal(res.totalNetKop, 850000);
			assert.equal(res.status, "ready_for_payment");
			assert.equal(res.paymentStatus, "Ожидает оплаты");
			assert.equal(res.bypassKktZeroReceipt, false);
		});

		it("Preserves kopeck-exact precision without float drift", () => {
			const res = process100PercentDiscountCheckout({
				totalGrossRub: 1234.56,
				customDiscountRub: 1234.56,
			});

			assert.equal(res.isZeroDue, true);
			assert.equal(res.totalNetRub, 0);
			assert.equal(res.totalNetKop, 0);
			assert.equal(res.bypassKktZeroReceipt, true);
		});
	});

	describe("3. allocateRemainderToTender (Mandate 8e Item 9: 1-tap remainder buttons)", () => {
		it("Allocates full remainder to card in 1 tap", () => {
			const current = {
				cardRub: 0,
				cashRub: 2000,
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
			};
			const res = allocateRemainderToTender({
				totalDueRub: 10000,
				currentTenders: current,
				targetTender: "card",
			});

			assert.equal(res.cardRub, 8000);
			assert.equal(res.cashRub, 2000);
			assert.equal(res.sbpRub, 0);
			assert.equal(res.depositRub, 0);
		});

		it("Allocates full remainder to cash in 1 tap", () => {
			const current = {
				cardRub: 4500,
				cashRub: 0,
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
			};
			const res = allocateRemainderToTender({
				totalDueRub: 10000,
				currentTenders: current,
				targetTender: "cash",
			});

			assert.equal(res.cashRub, 5500);
			assert.equal(res.cardRub, 4500);
		});

		it("Allocates remainder to SBP QR in 1 tap", () => {
			const current = {
				cardRub: 1000,
				cashRub: 2000,
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
			};
			const res = allocateRemainderToTender({
				totalDueRub: 6000,
				currentTenders: current,
				targetTender: "sbp",
			});

			assert.equal(res.sbpRub, 3000);
			assert.equal(res.cardRub, 1000);
			assert.equal(res.cashRub, 2000);
		});

		it("Deposit allocation caps strictly at available patient deposit", () => {
			const current = {
				cardRub: 2000,
				cashRub: 0,
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
			};
			// Remaining needed: 8000, but patient only has 3500 on deposit
			const res = allocateRemainderToTender({
				totalDueRub: 10000,
				currentTenders: current,
				targetTender: "deposit",
				patientDepositRub: 3500,
			});

			assert.equal(res.depositRub, 3500);
			assert.equal(res.cardRub, 2000);
		});

		it("Family balance allocation caps strictly at available family balance", () => {
			const current = {
				cardRub: 1000,
				cashRub: 0,
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
			};
			// Remaining needed: 9000, but family balance is 4000
			const res = allocateRemainderToTender({
				totalDueRub: 10000,
				currentTenders: current,
				targetTender: "family",
				patientFamilyBalanceRub: 4000,
			});

			assert.equal(res.familyRub, 4000);
			assert.equal(res.cardRub, 1000);
		});

		it("Calculates exact kopecks for odd division remainders", () => {
			const current = {
				cardRub: 333.33,
				cashRub: 0,
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
			};
			const res = allocateRemainderToTender({
				totalDueRub: 1000,
				currentTenders: current,
				targetTender: "cash",
			});

			assert.equal(res.cashRub, 666.67);
			assert.equal(res.cardRub, 333.33);
		});
	});

	describe("4. getFastCombinedTenderPresets", () => {
		it("Generates standard 100% card, cash, and sbp presets", () => {
			const presets = getFastCombinedTenderPresets({ totalDueRub: 5000 });
			const ids = presets.map((p) => p.id);
			assert.ok(ids.includes("all_card"));
			assert.ok(ids.includes("all_cash"));
			assert.ok(ids.includes("all_sbp"));
			assert.ok(ids.includes("half_card_half_cash"));
		});

		it("Generates deposit combo presets when deposit balance > 0", () => {
			const presets = getFastCombinedTenderPresets({
				totalDueRub: 8000,
				patientDepositRub: 3000,
			});
			const ids = presets.map((p) => p.id);
			assert.ok(ids.includes("deposit_plus_card"));
			assert.ok(ids.includes("deposit_plus_cash"));

			const depCard = presets.find((p) => p.id === "deposit_plus_card");
			assert.equal(depCard?.tenders.depositRub, 3000);
			assert.equal(depCard?.tenders.cardRub, 5000);
		});

		it("Generates family combo preset when family balance > 0", () => {
			const presets = getFastCombinedTenderPresets({
				totalDueRub: 10000,
				patientFamilyBalanceRub: 6000,
			});
			const famCard = presets.find((p) => p.id === "family_plus_card");
			assert.ok(famCard);
			assert.equal(famCard?.tenders.familyRub, 6000);
			assert.equal(famCard?.tenders.cardRub, 4000);
		});
	});
});
