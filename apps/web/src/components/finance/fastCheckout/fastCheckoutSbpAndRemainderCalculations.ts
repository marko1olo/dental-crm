import { generateDynamicSbpQrPayload, generateQrCodeSvg } from "@dental/shared/fiscal";
import { applyQuickCheckoutPreset, calculateCashChangeKop, paymentsToSplitState, validateCheckoutSplit } from "../../payments/checkout/fastCheckoutEngine";
import type { CashChangeCalculation, CheckoutPaymentMethodType, CheckoutSplitItem, ClientLegalType, FastCheckoutValidationResult, QuickCheckoutPresetType, SbpQrGeneratedData } from "./types";

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
		const svg = generateQrCodeSvg(payload.nspkUrl, { size: 160, margin: 2, colorDark: "#0f172a", colorLight: "#ffffff", title: `QR-код СБП: ${payload.sumFormattedRu}` });
		return { payload, svg };
	} catch {
		return null;
	}
}

/** Прибавляет остаток в копейках к текущей рублевой сумме с точностью до копейки */
export function addKopToRubAmount(prevRub: number, addKop: number): number {
	const prevKop = Math.round(prevRub * 100);
	return +((prevKop + addKop) / 100).toFixed(2);
}

/** Вычисляет доступную сумму списания с депозита/семейного счета в копейках */
export function computeDepositRemainderTakeKop(remainingKop: number, patientDepositRub: number, patientFamilyBalanceRub: number, currentDepositRub: number): number {
	if (remainingKop <= 0) return 0;
	const totalAvailDepositKop = Math.round(((patientDepositRub || 0) + (patientFamilyBalanceRub || 0)) * 100);
	const currentDepositKop = Math.round(currentDepositRub * 100);
	const remainingAvailDepositKop = Math.max(0, totalAvailDepositKop - currentDepositKop);
	return totalAvailDepositKop > 0 ? Math.min(remainingKop, remainingAvailDepositKop) : remainingKop;
}

/** Вычисляет комбинированное распределение остатка: сначала депозит, остаток на карту */
export function computeDepositPlusCardRemainderSplitKop(remainingKop: number, patientDepositRub: number, patientFamilyBalanceRub: number, currentDepositRub: number): { readonly depositTakeKop: number; readonly cardTakeKop: number } {
	if (remainingKop <= 0) return { depositTakeKop: 0, cardTakeKop: 0 };
	const totalAvailDepositKop = Math.round(((patientDepositRub || 0) + (patientFamilyBalanceRub || 0)) * 100);
	const currentDepositKop = Math.round(currentDepositRub * 100);
	const remainingAvailDepositKop = Math.max(0, totalAvailDepositKop - currentDepositKop);
	const depositTakeKop = Math.min(remainingKop, remainingAvailDepositKop);
	return { depositTakeKop, cardTakeKop: remainingKop - depositTakeKop };
}

/** Делит остаток 50/50 между картой и наличными без потери копейки */
export function computeHalfSplitRemainderKop(remainingKop: number): { readonly halfCardKop: number; readonly halfCashKop: number } {
	const halfCardKop = Math.floor(remainingKop / 2);
	return { halfCardKop, halfCashKop: remainingKop - halfCardKop };
}

/** Вычисляет списание остатка с семейного баланса */
export function computeFamilyRemainderTakeKop(remainingKop: number, patientFamilyBalanceRub: number): number {
	const availFamKop = Math.round(Math.max(0, patientFamilyBalanceRub) * 100);
	return availFamKop > 0 ? Math.min(remainingKop, availFamKop) : remainingKop;
}

/** Вычисляет сдачу наличными в копейках и рублях */
export function computeCashChange(cashTenderedRub: number, cashAmountRub: number): CashChangeCalculation {
	return calculateCashChangeKop(Math.round(cashTenderedRub * 100), Math.round(cashAmountRub * 100));
}

/** Валидирует сплит-оплату и реквизиты чека 54-ФЗ */
export function computeCheckoutValidation(params: {
	readonly orderId: string; readonly targetBillKop: number; readonly payments: readonly CheckoutSplitItem[]; readonly cashTenderedRub: number;
	readonly patientPhone: string; readonly patientEmail: string; readonly clientType: ClientLegalType; readonly buyerInn: string;
	readonly buyerName: string; readonly isElectronicReceiptOnly: boolean;
}): FastCheckoutValidationResult {
	return validateCheckoutSplit({
		orderId: params.orderId, totalBillKop: params.targetBillKop, payments: params.payments, cashTenderedKop: Math.round(params.cashTenderedRub * 100),
		patientPhone: params.patientPhone, patientEmail: params.patientEmail, clientType: params.clientType,
		buyerInn: params.buyerInn || undefined, buyerName: params.buyerName || undefined, isElectronicReceiptOnly: params.isElectronicReceiptOnly,
	});
}

/** Применяет быстрый пресет кассы к суммам сплита */
export function computeQuickPresetSplitResult(preset: QuickCheckoutPresetType, targetBillKop: number, patientDepositRub: number, patientFamilyBalanceRub: number): {
	readonly activeMethod: CheckoutPaymentMethodType; readonly splitState: ReturnType<typeof paymentsToSplitState>; readonly cashTenderedRub: number;
} {
	const effectiveDepositRub = (patientDepositRub || 0) + (patientFamilyBalanceRub || 0);
	const result = applyQuickCheckoutPreset({ totalBillKop: targetBillKop, preset, availableDepositKop: Math.round(effectiveDepositRub * 100) });
	return { activeMethod: result.activeMethod, splitState: paymentsToSplitState(result.payments), cashTenderedRub: result.cashTenderedKop / 100 };
}
