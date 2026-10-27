import type {
	CashChangeCalculation,
	CheckoutPaymentMethodType,
	CheckoutSplitItem,
	ClientLegalType,
	FastCheckoutDiscountPreset,
	FastCheckoutDiscountResult,
	FastCheckoutValidationResult,
	FiscalReceiptPayload,
	Ffd12FiscalPayload,
	QuickCheckoutPresetType,
	StageAdvanceCalculation,
	StagePaymentMode,
	TreatmentPlanStageOption,
} from "../../payments/checkout/fastCheckoutEngine";
import type { SbpDynamicQrResult } from "@dental/shared/fiscal";

export type {
	CashChangeCalculation,
	CheckoutPaymentMethodType,
	CheckoutSplitItem,
	ClientLegalType,
	FastCheckoutDiscountPreset,
	FastCheckoutDiscountResult,
	FastCheckoutValidationResult,
	FiscalReceiptPayload,
	Ffd12FiscalPayload,
	QuickCheckoutPresetType,
	StageAdvanceCalculation,
	StagePaymentMode,
	TreatmentPlanStageOption,
};

/** Налоговые ставки НДС для фискализации кассовых чеков 54-ФЗ */
export type FastCheckoutVatRateType =
	| "vat_none"
	| "vat_0"
	| "vat_10"
	| "vat_20"
	| "vat_110"
	| "vat_120";

/** Статус проверки оплаты по динамическому QR-коду СБП */
export type SbpPaymentCheckStatus = "awaiting" | "paid" | "failed";

/** Состояние прерванной оплаты для аварийного восстановления без повторного списания */
export interface InterruptedPaymentState {
	readonly isInterrupted: boolean;
	readonly reason: string;
	readonly amountRub: number;
	readonly method: string;
}

/** Состояние аппаратной готовности ККТ (АТОЛ / Штрих-М) */
export interface KktHardwareStatusState {
	readonly online: boolean;
	readonly paperOk: boolean;
	readonly error?: string | undefined;
	readonly isChecking: boolean;
}

/** Сгенерированные данные динамического QR-кода СБП НСПК */
export interface SbpQrGeneratedData {
	readonly payload: SbpDynamicQrResult;
	readonly svg: string;
}

export type * from "./fastCheckoutPropsTypes";
