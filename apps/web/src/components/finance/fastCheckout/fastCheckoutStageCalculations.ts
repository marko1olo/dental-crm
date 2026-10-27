import {
	DEFAULT_TREATMENT_STAGES,
	calculateFastCheckoutDiscount,
	calculateStageAdvanceAmount,
} from "../../payments/checkout/fastCheckoutEngine";
import type {
	FastCheckoutDiscountPreset,
	FastCheckoutDiscountResult,
	StageAdvanceCalculation,
	StagePaymentMode,
	TreatmentPlanStageOption,
} from "./types";

/** Вычисляет исходную сумму чека в копейках с точностью до копейки */
export function resolveInitialTotalBillKop(
	amountKopecks?: number,
	propTotalBillKop?: number,
	propTotalBillRub?: number,
	amountRub?: number,
): number {
	if (typeof amountKopecks === "number" && !Number.isNaN(amountKopecks)) return Math.round(amountKopecks);
	if (typeof propTotalBillKop === "number" && !Number.isNaN(propTotalBillKop)) return Math.round(propTotalBillKop);
	if (typeof amountRub === "number" && !Number.isNaN(amountRub)) return Math.round(amountRub * 100);
	if (typeof propTotalBillRub === "number" && !Number.isNaN(propTotalBillRub)) return Math.round(propTotalBillRub * 100);
	return 0;
}

/** Определяет ФИО кассира или лечащего врача для фискального тега 1021 */
export function resolveEffectiveCashierFullName(
	propCashierFullName?: string,
	attendingDoctorName?: string
): string {
	return (propCashierFullName || "").trim() || (attendingDoctorName || "").trim() || "Кассир";
}

/** Формирует список этапов оплаты плана лечения или текущего визита */
export function resolveTreatmentStages(
	propStages: readonly TreatmentPlanStageOption[] | undefined,
	initialTotalBillKop: number,
	isDemoMode: boolean
): readonly TreatmentPlanStageOption[] {
	if (propStages && propStages.length > 0) return propStages;
	if (isDemoMode) return DEFAULT_TREATMENT_STAGES;
	return [{ id: "single_visit", titleRu: "Оплата текущего приёма", stageKind: "full", amountKop: initialTotalBillKop, itemsCount: 1 }];
}

/** Выбирает стартовый ID этапа при открытии модального окна кассы */
export function resolveInitialSelectedStageId(
	propStages: readonly TreatmentPlanStageOption[] | undefined,
	isDemoMode: boolean
): string {
	if (!propStages || propStages.length === 0) return !isDemoMode ? "single_visit" : "full_plan";
	if (propStages.length === 1) return propStages[0]!.id;
	return "full_plan";
}

/** Вычисляет базовую стоимость выбранного этапа в копейках до применения скидки */
export function calculateBaseStageAmountKop(
	selectedStageId: string,
	initialTotalBillKop: number,
	stages: readonly TreatmentPlanStageOption[]
): number {
	if (selectedStageId === "full_plan") return initialTotalBillKop;
	const stage = stages.find((s) => s.id === selectedStageId);
	return stage ? stage.amountKop : initialTotalBillKop;
}

/** Вычисляет скидку врача/акции для выбранного этапа */
export function computeStageDiscountCalc(
	baseStageAmountKop: number,
	discountPreset: FastCheckoutDiscountPreset,
	customDiscountPercent: number
): FastCheckoutDiscountResult {
	return calculateFastCheckoutDiscount({ grossKop: baseStageAmountKop, preset: discountPreset, customPercent: customDiscountPercent });
}

/** Вычисляет авансовый/этапный расчет по выбранному режиму оплаты */
export function computeStageAdvanceCalc(
	discountedStageAmountKop: number,
	stagePaymentMode: StagePaymentMode,
	advanceAlreadyPaidRub: number
): StageAdvanceCalculation {
	return calculateStageAdvanceAmount(discountedStageAmountKop, stagePaymentMode, Math.round(advanceAlreadyPaidRub * 100));
}

/** Вычисляет целевую сумму чека в копейках и рублях */
export function computeTargetBillAmounts(
	discountedStageAmountKop: number,
	stagePaymentMode: StagePaymentMode,
	stageCalc: StageAdvanceCalculation
): { readonly effectiveBillKop: number; readonly targetBillKop: number; readonly targetBillRub: number; readonly effectiveTotalRub: number } {
	const effectiveBillKop = stageCalc.requiredAmountKop;
	const targetBillKop = stagePaymentMode === "advance_offset_tag1215" ? discountedStageAmountKop : effectiveBillKop;
	const targetBillRub = targetBillKop / 100;
	return { effectiveBillKop, targetBillKop, targetBillRub, effectiveTotalRub: targetBillRub };
}
