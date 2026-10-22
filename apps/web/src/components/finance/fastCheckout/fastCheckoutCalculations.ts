import {
	generateDynamicSbpQrPayload,
	generateQrCodeSvg,
} from "@dental/shared/fiscal";
import {
	DEFAULT_TREATMENT_STAGES,
	applyQuickCheckoutPreset,
	calculateCashChangeKop,
	calculateFastCheckoutDiscount,
	calculateSplitRemainingKop,
	calculateStageAdvanceAmount,
	paymentsToSplitState,
	splitStateToCheckoutPayments,
	validateCheckoutSplit,
} from "../../payments/checkout/fastCheckoutEngine";
import type {
	CashChangeCalculation,
	CheckoutPaymentMethodType,
	CheckoutSplitItem,
	ClientLegalType,
	FastCheckoutDiscountPreset,
	FastCheckoutDiscountResult,
	FastCheckoutValidationResult,
	QuickCheckoutPresetType,
	SbpQrGeneratedData,
	StageAdvanceCalculation,
	StagePaymentMode,
	TreatmentPlanStageOption,
} from "./types";

export {
	DEFAULT_TREATMENT_STAGES,
	applyQuickCheckoutPreset,
	calculateCashChangeKop,
	calculateFastCheckoutDiscount,
	calculateSplitRemainingKop,
	calculateStageAdvanceAmount,
	paymentsToSplitState,
	splitStateToCheckoutPayments,
	validateCheckoutSplit,
};

/** Вычисляет исходную сумму чека в копейках с точностью до копейки */
export function resolveInitialTotalBillKop(
	amountKopecks?: number | undefined,
	propTotalBillKop?: number | undefined,
	propTotalBillRub?: number | undefined,
	amountRub?: number | undefined,
): number {
	if (typeof amountKopecks === "number" && !Number.isNaN(amountKopecks)) {
		return Math.round(amountKopecks);
	}
	if (typeof propTotalBillKop === "number" && !Number.isNaN(propTotalBillKop)) {
		return Math.round(propTotalBillKop);
	}
	if (typeof amountRub === "number" && !Number.isNaN(amountRub)) {
		return Math.round(amountRub * 100);
	}
	if (typeof propTotalBillRub === "number" && !Number.isNaN(propTotalBillRub)) {
		return Math.round(propTotalBillRub * 100);
	}
	return 0;
}

/** Определяет ФИО кассира или лечащего врача для фискального тега 1021 */
export function resolveEffectiveCashierFullName(
	propCashierFullName?: string | undefined,
	attendingDoctorName?: string | undefined
): string {
	return (
		(propCashierFullName || "").trim() ||
		(attendingDoctorName || "").trim() ||
		"Кассир"
	);
}

/** Формирует список этапов оплаты плана лечения или текущего визита */
export function resolveTreatmentStages(
	propStages: readonly TreatmentPlanStageOption[] | undefined,
	initialTotalBillKop: number,
	isDemoMode: boolean
): readonly TreatmentPlanStageOption[] {
	if (propStages && propStages.length > 0) {
		return propStages;
	}
	if (isDemoMode) {
		return DEFAULT_TREATMENT_STAGES;
	}
	return [
		{
			id: "single_visit",
			titleRu: "Оплата текущего приёма",
			stageKind: "full",
			amountKop: initialTotalBillKop,
			itemsCount: 1,
		},
	];
}

/** Выбирает стартовый ID этапа при открытии модального окна кассы */
export function resolveInitialSelectedStageId(
	propStages: readonly TreatmentPlanStageOption[] | undefined,
	isDemoMode: boolean
): string {
	if (!propStages || propStages.length === 0) {
		return !isDemoMode ? "single_visit" : "full_plan";
	}
	if (propStages.length === 1) {
		return propStages[0]!.id;
	}
	return "full_plan";
}

/** Вычисляет базовую стоимость выбранного этапа в копейках до применения скидки */
export function calculateBaseStageAmountKop(
	selectedStageId: string,
	initialTotalBillKop: number,
	stages: readonly TreatmentPlanStageOption[]
): number {
	if (selectedStageId === "full_plan") {
		return initialTotalBillKop;
	}
	const stage = stages.find((s) => s.id === selectedStageId);
	return stage ? stage.amountKop : initialTotalBillKop;
}

/** Вычисляет скидку врача/акции для выбранного этапа */
export function computeStageDiscountCalc(
	baseStageAmountKop: number,
	discountPreset: FastCheckoutDiscountPreset,
	customDiscountPercent: number
): FastCheckoutDiscountResult {
	return calculateFastCheckoutDiscount({
		grossKop: baseStageAmountKop,
		preset: discountPreset,
		customPercent: customDiscountPercent,
	});
}

/** Вычисляет авансовый/этапный расчет по выбранному режиму оплаты */
export function computeStageAdvanceCalc(
	discountedStageAmountKop: number,
	stagePaymentMode: StagePaymentMode,
	advanceAlreadyPaidRub: number
): StageAdvanceCalculation {
	return calculateStageAdvanceAmount(
		discountedStageAmountKop,
		stagePaymentMode,
		Math.round(advanceAlreadyPaidRub * 100)
	);
}

/** Вычисляет целевую сумму чека в копейках и рублях */
export function computeTargetBillAmounts(
	discountedStageAmountKop: number,
	stagePaymentMode: StagePaymentMode,
	stageCalc: StageAdvanceCalculation
): {
	readonly effectiveBillKop: number;
	readonly targetBillKop: number;
	readonly targetBillRub: number;
	readonly effectiveTotalRub: number;
} {
	const effectiveBillKop = stageCalc.requiredAmountKop;
	const targetBillKop =
		stagePaymentMode === "advance_offset_tag1215"
			? discountedStageAmountKop
			: effectiveBillKop;
	const targetBillRub = targetBillKop / 100;
	const effectiveTotalRub = targetBillRub;
	return {
		effectiveBillKop,
		targetBillKop,
		targetBillRub,
		effectiveTotalRub,
	};
}

/** Генерирует платежные реквизиты и SVG динамического QR-кода СБП */
export function buildFastCheckoutSbpQrData(
	effectiveSbpAmountRub: number,
	effectiveSbpKopecks: number,
	effectiveSbpOrderId: string
): SbpQrGeneratedData | null {
	if (effectiveSbpKopecks <= 0) return null;
	try {
		const payload = generateDynamicSbpQrPayload({
			sumRub: effectiveSbpAmountRub,
			orderId: effectiveSbpOrderId,
			purpose: `Оплата стоматологических услуг (заказ ${effectiveSbpOrderId})`,
			clinicName: "ООО ДЕНТЕ",
			ttlMinutes: 15,
		});
		const svg = generateQrCodeSvg(payload.nspkUrl, {
			size: 160,
			margin: 2,
			colorDark: "#0f172a",
			colorLight: "#ffffff",
			title: `QR-код СБП: ${payload.sumFormattedRu}`,
		});
		return { payload, svg };
	} catch {
		return null;
	}
}

/** Прибавляет остаток в копейках к текущей рублевой сумме с точностью до копейки */
export function addKopToRubAmount(prevRub: number, addKop: number): number {
	const prevKop = Math.round(prevRub * 100);
	const nextKop = prevKop + addKop;
	return +(nextKop / 100).toFixed(2);
}

/** Вычисляет доступную сумму списания с депозита/семейного счета в копейках */
export function computeDepositRemainderTakeKop(
	remainingKop: number,
	patientDepositRub: number,
	patientFamilyBalanceRub: number,
	currentDepositRub: number
): number {
	if (remainingKop <= 0) return 0;
	const totalAvailDepositKop = Math.round(
		((patientDepositRub || 0) + (patientFamilyBalanceRub || 0)) * 100
	);
	const currentDepositKop = Math.round(currentDepositRub * 100);
	const remainingAvailDepositKop = Math.max(
		0,
		totalAvailDepositKop - currentDepositKop
	);

	return totalAvailDepositKop > 0
		? Math.min(remainingKop, remainingAvailDepositKop)
		: remainingKop;
}

/** Вычисляет комбинированное распределение остатка: сначала депозит, остаток на карту */
export function computeDepositPlusCardRemainderSplitKop(
	remainingKop: number,
	patientDepositRub: number,
	patientFamilyBalanceRub: number,
	currentDepositRub: number
): { readonly depositTakeKop: number; readonly cardTakeKop: number } {
	if (remainingKop <= 0) {
		return { depositTakeKop: 0, cardTakeKop: 0 };
	}
	const totalAvailDepositKop = Math.round(
		((patientDepositRub || 0) + (patientFamilyBalanceRub || 0)) * 100
	);
	const currentDepositKop = Math.round(currentDepositRub * 100);
	const remainingAvailDepositKop = Math.max(
		0,
		totalAvailDepositKop - currentDepositKop
	);

	const depositTakeKop = Math.min(remainingKop, remainingAvailDepositKop);
	const cardTakeKop = remainingKop - depositTakeKop;
	return { depositTakeKop, cardTakeKop };
}

/** Делит остаток 50/50 между картой и наличными без потери копейки */
export function computeHalfSplitRemainderKop(remainingKop: number): {
	readonly halfCardKop: number;
	readonly halfCashKop: number;
} {
	const halfCardKop = Math.floor(remainingKop / 2);
	const halfCashKop = remainingKop - halfCardKop;
	return { halfCardKop, halfCashKop };
}

/** Вычисляет списание остатка с семейного баланса */
export function computeFamilyRemainderTakeKop(
	remainingKop: number,
	patientFamilyBalanceRub: number
): number {
	const availFamKop = Math.round(Math.max(0, patientFamilyBalanceRub) * 100);
	return availFamKop > 0 ? Math.min(remainingKop, availFamKop) : remainingKop;
}

/** Вычисляет сдачу наличными в копейках и рублях */
export function computeCashChange(
	cashTenderedRub: number,
	cashAmountRub: number
): CashChangeCalculation {
	return calculateCashChangeKop(
		Math.round(cashTenderedRub * 100),
		Math.round(cashAmountRub * 100)
	);
}

/** Валидирует сплит-оплату и реквизиты чека 54-ФЗ */
export function computeCheckoutValidation(params: {
	readonly orderId: string;
	readonly targetBillKop: number;
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedRub: number;
	readonly patientPhone: string;
	readonly patientEmail: string;
	readonly clientType: ClientLegalType;
	readonly buyerInn: string;
	readonly buyerName: string;
	readonly isElectronicReceiptOnly: boolean;
}): FastCheckoutValidationResult {
	return validateCheckoutSplit({
		orderId: params.orderId,
		totalBillKop: params.targetBillKop,
		payments: params.payments,
		cashTenderedKop: Math.round(params.cashTenderedRub * 100),
		patientPhone: params.patientPhone,
		patientEmail: params.patientEmail,
		clientType: params.clientType,
		buyerInn: params.buyerInn || undefined,
		buyerName: params.buyerName || undefined,
		isElectronicReceiptOnly: params.isElectronicReceiptOnly,
	});
}

/** Применяет быстрый пресет кассы к суммам сплита */
export function computeQuickPresetSplitResult(
	preset: QuickCheckoutPresetType,
	targetBillKop: number,
	patientDepositRub: number,
	patientFamilyBalanceRub: number
): {
	readonly activeMethod: CheckoutPaymentMethodType;
	readonly splitState: ReturnType<typeof paymentsToSplitState>;
	readonly cashTenderedRub: number;
} {
	const effectiveDepositRub =
		(patientDepositRub || 0) + (patientFamilyBalanceRub || 0);
	const result = applyQuickCheckoutPreset({
		totalBillKop: targetBillKop,
		preset,
		availableDepositKop: Math.round(effectiveDepositRub * 100),
	});
	const splitState = paymentsToSplitState(result.payments);
	return {
		activeMethod: result.activeMethod,
		splitState,
		cashTenderedRub: result.cashTenderedKop / 100,
	};
}
