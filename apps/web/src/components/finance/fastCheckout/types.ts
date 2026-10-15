import type React from "react";
import type {
	CashChangeCalculation,
	CheckoutPaymentMethodType,
	CheckoutSplitItem,
	ClientLegalType,
	FastCheckoutDiscountPreset,
	FastCheckoutDiscountResult,
	FastCheckoutValidationResult,
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
	Ffd12FiscalPayload,
	QuickCheckoutPresetType,
	StageAdvanceCalculation,
	StagePaymentMode,
	TreatmentPlanStageOption,
};

/** Налоговые ставки НДС для фискализации чеков 54-ФЗ (ФФД 1.2) */
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

/** Входные параметры хука быстрой кассы useFastCheckoutLogic */
export interface UseFastCheckoutLogicProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly initialPaymentMethod?: CheckoutPaymentMethodType | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly orderId?: string | undefined;
	readonly stages?: readonly TreatmentPlanStageOption[] | undefined;
	readonly cashierFullName?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly initialSimpleCashierMode?: boolean | undefined;
	readonly onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
}

/** Состояние распределения сумм по способам оплаты (в рублях) */
export interface FastCheckoutSplitAmountsState {
	readonly cardAmountRub: number;
	readonly cashAmountRub: number;
	readonly sbpAmountRub: number;
	readonly depositAmountRub: number;
	readonly loyaltyAmountRub: number;
	readonly dmsAmountRub: number;
	readonly cashTenderedRub: number;
}

/** Сеттеры управления суммами сплит-оплаты */
export interface FastCheckoutSplitAmountsSetters {
	readonly setCardAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setCashAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setSbpAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setDepositAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setLoyaltyAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setDmsAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
}
