import type { ComprehensivePlanVariant } from "../planPresentationPresets.js";
import type {
	InstallmentScheduleOption,
	NdflTaxDeductionInfo,
	PaymentSchedulesSummary,
	StagedPaymentSchedule,
} from "./comparatorTypes.js";

const NDFL_STANDARD_LIMIT_RUB = 150000;
const NDFL_TAX_RATE = 0.13;

export function calculateNdflTaxRefund(
	totalCostRub: number,
	isCode02HighCost: boolean,
): NdflTaxDeductionInfo {
	if (isCode02HighCost) {
		const refundAmountRub = Math.round(totalCostRub * NDFL_TAX_RATE);
		return {
			code: "02",
			codeNameRu: "Дорогостоящее лечение (Код 02 — без лимита вычета)",
			maxEligibleBaseRub: totalCostRub,
			refundAmountRub,
			effectiveNetCostRub: totalCostRub - refundAmountRub,
		};
	}
	const eligibleBaseRub = Math.min(totalCostRub, NDFL_STANDARD_LIMIT_RUB);
	const refundAmountRub = Math.round(eligibleBaseRub * NDFL_TAX_RATE);
	return {
		code: "01",
		codeNameRu: "Обычное лечение (Код 01 — лимит базы 150 000 ₽)",
		maxEligibleBaseRub: eligibleBaseRub,
		refundAmountRub,
		effectiveNetCostRub: totalCostRub - refundAmountRub,
	};
}

export function generatePaymentSchedules(
	totalOrPlan: number | ComprehensivePlanVariant,
	isCode02Param = true,
): PaymentSchedulesSummary {
	const total = typeof totalOrPlan === "object" ? totalOrPlan.totalCostRub : totalOrPlan;
	const isCode02 = typeof totalOrPlan === "object" ? totalOrPlan.isCode02HighCostSurgery : isCode02Param;

	const singleDiscountRub = Math.round(total * 0.05);
	const singleFinalRub = total - singleDiscountRub;

	const stage1Rub = Math.round(total * 0.3);
	const stage2Rub = Math.round(total * 0.4);
	const stage3Rub = total - stage1Rub - stage2Rub;

	const stagedPayment: StagedPaymentSchedule = {
		stage1DiagnosticRub: stage1Rub,
		stage2SurgeryRub: stage2Rub,
		stage3OrthopedicsRub: stage3Rub,
		isBalanced: stage1Rub + stage2Rub + stage3Rub === total,
	};

	const installments: InstallmentScheduleOption[] = [
		{
			months: 6,
			monthlyPaymentRub: Math.round(total / 6),
			totalPayableRub: total,
			isZeroOverpayment: true,
			provider: "clinic_internal",
		},
		{
			months: 12,
			monthlyPaymentRub: Math.round(total / 12),
			totalPayableRub: total,
			isZeroOverpayment: true,
			provider: "clinic_internal",
		},
		{
			months: 24,
			monthlyPaymentRub: Math.round(total / 24),
			totalPayableRub: total,
			isZeroOverpayment: true,
			provider: "partner_bank",
		},
	];

	const ndflRefund = calculateNdflTaxRefund(total, isCode02);

	return {
		grossTotalRub: total,
		singlePaymentWith5PctDiscount: {
			discountRub: singleDiscountRub,
			finalPayableRub: singleFinalRub,
			discountPct: 5,
		},
		stagedPayment,
		installments,
		ndflRefund,
	};
}
