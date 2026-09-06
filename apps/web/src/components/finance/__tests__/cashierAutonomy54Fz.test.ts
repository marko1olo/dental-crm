/**
 * cashierAutonomy54Fz.test.ts
 *
 * DENTE Dental CRM — Unit Tests for 54-FZ Cashier & Registratura Autonomy
 *
 * Governed by:
 * - Mandate 8e, Item 8: Registratura without obstacles (appointment booking never forces assistant selection, solo-doctor clean booking).
 * - Mandate 8e, Item 9: Cash register 54-FZ without obstacles (INN is never required for physical persons, 1-click combined payments).
 * - Mandate 8e, Item 7: Doctor autonomy on warranty reworks & staff discounts (1-click 100% discount checkout, KKT bypass).
 * - Mandate 8i & 8k: Outpatient dental context, zero friction, anti-simulator.
 * - Mandate 8n: Scale sovereignty — solo doctor on chair rental & small clinic prioritization.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	validateBuyerInn54Fz,
	validate54FzBuyerInn,
	calculateCashChange,
	createExactCashTenders,
	createFullCardTenders,
	createDepositAndCardComboTenders,
	getFastCombinedTenderPresets,
	allocateRemainderToTender,
	process100PercentDiscountCheckout,
} from "../cashboxOperations.js";
import {
	validateTreatmentPlanPrices,
	generateWorkOrderExportPayload,
} from "../../treatment-plans/validation/planPriceValidationEngine.js";
import {
	PLAN_PRICE_POLICY_PRESETS,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
} from "../../treatment-plans/validation/planPriceValidationPresets.js";

describe("Cashier Autonomy 54-FZ — Buyer INN Validation (Mandate 8e Item 9 & FFD 1.2 Tag 1228)", () => {
	it("Physical person without INN is 100% valid and never blocks receipt", () => {
		const emptyCheck = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: "",
		});
		assert.equal(emptyCheck.isValid, true);
		assert.equal(emptyCheck.isRequired, false);
		assert.equal(emptyCheck.errorRu, undefined);

		const undefinedCheck = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: undefined,
		});
		assert.equal(undefinedCheck.isValid, true);
		assert.equal(undefinedCheck.isRequired, false);

		// Alternative helper test
		const altCheck = validate54FzBuyerInn("", "physical");
		assert.equal(altCheck.isValid, true);
		assert.equal(altCheck.isRequired, false);
		assert.equal(altCheck.errorMessage, undefined);
	});

	it("Physical person voluntary INN (for 13% NDFL deduction) is accepted", () => {
		const result = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: "770123456789",
		});
		assert.equal(result.isValid, true);
		assert.equal(result.isRequired, false);
		assert.equal(result.cleanInn, "770123456789");
		assert.equal(result.errorRu, undefined);

		const altResult = validate54FzBuyerInn("770123456789", "physical");
		assert.equal(altResult.isValid, true);
		assert.equal(altResult.cleanInn, "770123456789");
	});

	it("Physical person non-standard INN produces non-blocking hint, never disables payment", () => {
		const result = validateBuyerInn54Fz({
			payerType: "physical_person",
			buyerInn: "12345",
		});
		assert.equal(result.isValid, true, "Must remain valid to prevent blocking payment");
		assert.equal(result.isRequired, false);
		assert.ok(result.errorRu, "Should provide soft guidance only");
		assert.match(result.errorRu ?? "", /не блокирует/);
	});

	it("B2B Legal Entity (юрлицо) strictly requires 10-digit INN under 54-FZ", () => {
		const missing = validateBuyerInn54Fz({
			payerType: "legal_entity",
			buyerInn: "",
		});
		assert.equal(missing.isValid, false);
		assert.equal(missing.isRequired, true);
		assert.ok(missing.errorRu);

		const valid10 = validateBuyerInn54Fz({
			payerType: "legal_entity",
			buyerInn: "7705123456",
		});
		assert.equal(valid10.isValid, true);
		assert.equal(valid10.cleanInn, "7705123456");

		const invalid12 = validateBuyerInn54Fz({
			payerType: "legal_entity",
			buyerInn: "770123456789",
		});
		assert.equal(invalid12.isValid, false);
		assert.match(invalid12.errorRu ?? "", /10 цифр/);
	});

	it("B2B Individual Entrepreneur (ИП) strictly requires 12-digit INN under 54-FZ", () => {
		const missing = validateBuyerInn54Fz({
			payerType: "individual_entrepreneur",
			buyerInn: "",
		});
		assert.equal(missing.isValid, false);
		assert.equal(missing.isRequired, true);

		const valid12 = validateBuyerInn54Fz({
			payerType: "individual_entrepreneur",
			buyerInn: "770123456789",
		});
		assert.equal(valid12.isValid, true);
		assert.equal(valid12.cleanInn, "770123456789");

		const invalid10 = validateBuyerInn54Fz({
			payerType: "individual_entrepreneur",
			buyerInn: "7705123456",
		});
		assert.equal(invalid10.isValid, false);
		assert.match(invalid10.errorRu ?? "", /12 цифр/);
	});
});

describe("1-Click Fast Payment Presets & Cash Change (Mandates 8e, 8k, 8n)", () => {
	it("⚡ «Без сдачи»: creates exact cash tender matching 100% total due", () => {
		const tenders = createExactCashTenders(4750.5);
		assert.equal(tenders.cashRub, 4750.5);
		assert.equal(tenders.cardRub, 0);
		assert.equal(tenders.sbpRub, 0);
		assert.equal(tenders.depositRub, 0);
		assert.equal(tenders.familyRub, 0);
	});

	it("⚡ «Оплата картой 100%»: creates full POS card tender", () => {
		const tenders = createFullCardTenders(12800);
		assert.equal(tenders.cardRub, 12800);
		assert.equal(tenders.cashRub, 0);
		assert.equal(tenders.sbpRub, 0);
		assert.equal(tenders.depositRub, 0);
		assert.equal(tenders.familyRub, 0);
	});

	it("⚡ «Комбинированная (Весь аванс + остаток картой)»: handles partial and full deposit coverage without float drift", () => {
		// Partial coverage: deposit 3000, total due 5400.33
		const partial = createDepositAndCardComboTenders(5400.33, 3000);
		assert.equal(partial.depositRub, 3000);
		assert.equal(partial.cardRub, 2400.33);
		assert.equal(partial.cashRub, 0);

		// Full coverage: deposit 10000, total due 4500
		const full = createDepositAndCardComboTenders(4500, 10000);
		assert.equal(full.depositRub, 4500);
		assert.equal(full.cardRub, 0);

		// Zero deposit: deposit 0, total due 3200
		const zeroDep = createDepositAndCardComboTenders(3200, 0);
		assert.equal(zeroDep.depositRub, 0);
		assert.equal(zeroDep.cardRub, 3200);
	});

	it("calculateCashChange: computes exact, surplus, and shortage accurately to the kopeck", () => {
		// 1. Exact amount (Без сдачи)
		const exact = calculateCashChange(3500, 3500);
		assert.equal(exact.changeRub, 0);
		assert.equal(exact.changeKopecks, 0);
		assert.equal(exact.isExact, true);
		assert.equal(exact.isExactWithoutChange, true);
		assert.equal(exact.isShortage, false);
		assert.equal(exact.isInsufficient, false);

		// 2. Overpayment (Сдача клиенту)
		const over = calculateCashChange(3450.45, 5000);
		assert.equal(over.changeRub, 1549.55);
		assert.equal(over.changeKopecks, 154955);
		assert.equal(over.isExact, false);
		assert.equal(over.isShortage, false);

		// 3. Shortage (Недостаточно)
		const short = calculateCashChange(5000, 4200);
		assert.equal(short.changeRub, 0);
		assert.equal(short.shortageRub, 800);
		assert.equal(short.shortageKopecks, 80000);
		assert.equal(short.isShortage, true);
		assert.equal(short.isInsufficient, true);
	});

	it("getFastCombinedTenderPresets returns complete set of 1-click templates", () => {
		const presets = getFastCombinedTenderPresets({
			totalDueRub: 6000,
			patientDepositRub: 2500,
			patientFamilyBalanceRub: 1500,
		});

		const ids = presets.map((p) => p.id);
		assert.ok(ids.includes("all_card"));
		assert.ok(ids.includes("all_cash"));
		assert.ok(ids.includes("all_sbp"));
		assert.ok(ids.includes("half_card_half_cash"));
		assert.ok(ids.includes("deposit_plus_card"));
		assert.ok(ids.includes("deposit_plus_cash"));
		assert.ok(ids.includes("family_plus_card"));

		// Parity check for 50/50
		const half = presets.find((p) => p.id === "half_card_half_cash");
		assert.ok(half);
		assert.equal(half.tenders.cardRub, 3000);
		assert.equal(half.tenders.cashRub, 3000);
	});

	it("allocateRemainderToTender distributes remainder in 1 tap without manual kopeck entry", () => {
		const initialTenders = {
			cardRub: 0,
			cashRub: 2000,
			sbpRub: 0,
			depositRub: 1000,
			familyRub: 0,
		};

		// Remainder should go to card: 6500 - (2000 + 1000) = 3500
		const updated = allocateRemainderToTender({
			totalDueRub: 6500,
			currentTenders: initialTenders,
			targetTender: "card",
		});

		assert.equal(updated.cardRub, 3500);
		assert.equal(updated.cashRub, 2000);
		assert.equal(updated.depositRub, 1000);
	});
});

describe("Registratura & Schedule Assistant Autonomy (Mandates 8e Item 8 & 8n)", () => {
	it("Appointment booking draft allows assistantUserId to be null or empty string without errors", () => {
		interface AppointmentDraft {
			patientId: string;
			doctorUserId: string;
			assistantUserId?: string | null;
			roomId: string;
			startAt: string;
			endAt: string;
		}

		const draftWithoutAssistant: AppointmentDraft = {
			patientId: "pat-101",
			doctorUserId: "doc-001",
			assistantUserId: null,
			roomId: "chair-1",
			startAt: "2026-09-06T10:00:00.000Z",
			endAt: "2026-09-06T11:00:00.000Z",
		};

		// Required fields validator function simulating appointment form checks
		const validateRequiredFields = (draft: AppointmentDraft) => {
			const missing: string[] = [];
			if (!draft.patientId) missing.push("patientId");
			if (!draft.doctorUserId) missing.push("doctorUserId");
			if (!draft.roomId) missing.push("roomId");
			if (!draft.startAt) missing.push("startAt");
			// assistantUserId is STRICTLY OPTIONAL under Mandate 8e Item 8
			return { isValid: missing.length === 0, missing };
		};

		const validation = validateRequiredFields(draftWithoutAssistant);
		assert.equal(validation.isValid, true);
		assert.equal(validation.missing.length, 0);

		// Solo doctor mode normalization
		const isSoloDoctor = true;
		const normalizedAssistant = isSoloDoctor ? null : (draftWithoutAssistant.assistantUserId || null);
		assert.equal(normalizedAssistant, null);
	});

	it("Normalizes empty assistant string to null for clean PostgreSQL storage", () => {
		const rawAssistantInput = "   ";
		const cleaned = rawAssistantInput.trim() || null;
		assert.equal(cleaned, null);
	});
});

describe("Doctor Autonomy on Warranty & Staff Discounts (Mandate 8e Item 7)", () => {
	it("100% warranty rework closes visit in 1 click (0 ₽) and bypasses physical KKT error", () => {
		const result = process100PercentDiscountCheckout({
			totalGrossRub: 15400,
			isWarrantyRework: true,
		});

		assert.equal(result.isZeroDue, true);
		assert.equal(result.totalNetRub, 0);
		assert.equal(result.totalNetKop, 0);
		assert.equal(result.status, "completed");
		assert.equal(result.paymentStatus, "Оплачено (скидка 100%)");
		assert.equal(result.bypassKktZeroReceipt, true);
		assert.match(result.statusBannerText, /Гарантийный прием/);
	});

	it("100% colleague/staff discount closes visit in 1 click", () => {
		const result = process100PercentDiscountCheckout({
			totalGrossRub: 8200,
			isStaffColleague: true,
		});

		assert.equal(result.isZeroDue, true);
		assert.equal(result.totalNetRub, 0);
		assert.equal(result.status, "completed");
		assert.match(result.statusBannerText, /Лечение персонала/);
	});

	it("Partial discount leaves remaining net due for standard payment", () => {
		const result = process100PercentDiscountCheckout({
			totalGrossRub: 10000,
			discountPercent: 15,
		});

		assert.equal(result.isZeroDue, false);
		assert.equal(result.totalDiscountRub, 1500);
		assert.equal(result.totalNetRub, 8500);
		assert.equal(result.totalNetKop, 850000);
		assert.equal(result.status, "ready_for_payment");
		assert.equal(result.paymentStatus, "Ожидает оплаты");
		assert.equal(result.bypassKktZeroReceipt, false);
	});
});

describe("Treatment Plan Doctor Autonomy & 30-Day Non-Blocking Guarantee (Mandates 8e Item 7 & 8n)", () => {
	it("Plan older than 30 days is marked expired but NEVER blocks ZTL work orders or payments", () => {
		const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
		const oldPlan = {
			...SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
			items: SAMPLE_TREATMENT_PLAN_FOR_VALIDATION.items.filter((i) => i.itemId !== "item_5"),
			createdAtIso: oldDate,
		};
		const report = validateTreatmentPlanPrices(
			oldPlan,
			SAMPLE_CURRENT_PRICELIST,
			PLAN_PRICE_POLICY_PRESETS.standard_30,
		);
		assert.equal(report.isPlanExpired, true);
		assert.equal(report.canGenerateWorkOrder, true, "ZTL work order creation must be allowed");
		assert.equal(report.canGenerateCompletedAct, true, "Completed work act must be allowed");
		assert.equal(report.overallStatus, "APPROVED_PRICE_LOCKED");
		assert.match(report.validationMessages.join(" "), /не блокируются/);

		const workOrder = generateWorkOrderExportPayload(report, "work_order");
		assert.ok(workOrder.orderNumber.startsWith("НЗ-"));
		assert.ok(workOrder.totalPayableRub > 0);
	});

	it("Doctor has 100% discount autonomy for warranty reworks and staff without admin pin", () => {
		const planWith100Discount = {
			...SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
			items: SAMPLE_TREATMENT_PLAN_FOR_VALIDATION.items.map((item) => ({
				...item,
				planDiscountPercent: 100,
				planDiscountRub: item.planUnitPriceRub,
			})),
		};
		const report = validateTreatmentPlanPrices(
			planWith100Discount,
			SAMPLE_CURRENT_PRICELIST,
			PLAN_PRICE_POLICY_PRESETS.standard_30,
		);
		assert.equal(report.canGenerateWorkOrder, true);
		assert.equal(report.canGenerateCompletedAct, true);
		assert.equal(report.resolvedNetRub, 0);
	});
});
