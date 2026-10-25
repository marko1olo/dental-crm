import type React from "react";
import type {
	CheckoutPaymentMethodType,
	ClientLegalType,
	FastCheckoutValidationResult,
	FiscalReceiptPayload,
	Ffd12FiscalPayload,
	StageAdvanceCalculation,
} from "../../payments/checkout/fastCheckoutEngine.js";

export interface FiscalExecutionParams {
	targetBillKop: number;
	targetBillRub: number;
	effectiveTotalRub: number;
	cardAmountRub: number;
	cashAmountRub: number;
	sbpAmountRub: number;
	depositAmountRub: number;
	loyaltyAmountRub: number;
	dmsAmountRub: number;
	cashTenderedRub: number;
	remainingRub: number;
	activeMethod: CheckoutPaymentMethodType;
	validation: FastCheckoutValidationResult;
	clientType: ClientLegalType;
	buyerInn: string;
	buyerName: string;
	isElectronicReceiptOnly: boolean;
	patientId?: string | undefined;
	visitId?: string | undefined;
	patientPhone?: string | undefined;
	patientEmail?: string | undefined;
	orderId: string;
	effectiveCashierFullName: string;
	stageCalc: StageAdvanceCalculation;
	onPaymentComplete?: ((payload: FiscalReceiptPayload) => void) | undefined;
	onSuccess?: ((payload: any) => void) | undefined;
	onClose: () => void;
	inFlightRef: React.MutableRefObject<boolean>;
	lastClickTimeRef: React.MutableRefObject<number>;
	isPrinting: boolean;
	setIsPrinting: (val: boolean) => void;
	setIsOfflineBuffered: (val: boolean) => void;
	setInterruptedPaymentState: (val: {
		readonly isInterrupted: boolean;
		readonly reason: string;
		readonly amountRub: number;
		readonly method: string;
	} | null) => void;
	setCardAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setCashAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
	setSbpAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setDepositAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setLoyaltyAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setDmsAmountRub: React.Dispatch<React.SetStateAction<number>>;
}

export interface ManualCardTerminalParams {
	targetBillRub: number;
	overrideAmountRub?: number | undefined;
	patientId?: string | undefined;
	visitId?: string | undefined;
	patientPhone?: string | undefined;
	patientEmail?: string | undefined;
	effectiveCashierFullName: string;
	orderId: string;
	clientType: ClientLegalType;
	buyerInn: string;
	buyerName: string;
	isElectronicReceiptOnly: boolean;
	stageCalc: StageAdvanceCalculation;
	onPaymentComplete?: ((payload: FiscalReceiptPayload) => void) | undefined;
	onSuccess?: ((payload: any) => void) | undefined;
	onClose: () => void;
	setIsSubmittingManualCard: (val: boolean) => void;
	setIsOfflineBuffered: (val: boolean) => void;
	setInterruptedPaymentState: (val: null) => void;
}
