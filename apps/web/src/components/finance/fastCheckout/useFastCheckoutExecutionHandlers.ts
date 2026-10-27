import { useRef } from "react";
import { showToast } from "../../GlobalToast";
import {
	executeCheckSbpStatus, executeConfirmSbpManual, executeFiscalPayment,
	executeFlushOfflineFiscalQueue, executeManualCardTerminalConfirm,
	executeRetryFiscalizationDirect,
} from "./fastCheckoutFiscalSync";
import type {
	CheckoutPaymentMethodType, ClientLegalType, FastCheckoutValidationResult,
	InterruptedPaymentState, SbpPaymentCheckStatus, SbpQrGeneratedData, StageAdvanceCalculation,
} from "./types";

interface UseFastCheckoutExecutionParams {
	readonly targetBillKop: number; readonly targetBillRub: number; readonly effectiveTotalRub: number;
	readonly cardAmountRub: number; readonly cashAmountRub: number; readonly sbpAmountRub: number;
	readonly depositAmountRub: number; readonly loyaltyAmountRub: number; readonly dmsAmountRub: number;
	readonly cashTenderedRub: number; readonly remainingRub: number; readonly activeMethod: CheckoutPaymentMethodType;
	readonly validation: FastCheckoutValidationResult; readonly clientType: ClientLegalType;
	readonly buyerInn: string; readonly buyerName: string; readonly isElectronicReceiptOnly: boolean;
	readonly patientId?: string; readonly visitId?: string; readonly patientPhone: string; readonly patientEmail: string;
	readonly orderId: string; readonly effectiveCashierFullName: string; readonly stageCalc: StageAdvanceCalculation;
	readonly onPaymentComplete?: (payload: any) => void; readonly onSuccess?: (payload: any) => void;
	readonly onClose: () => void; readonly isPrinting: boolean; readonly setIsPrinting: (val: boolean) => void;
	readonly setIsOfflineBuffered: (val: boolean) => void; readonly setInterruptedPaymentState: (val: InterruptedPaymentState | null) => void;
	readonly setCardAmountRub: (val: any) => void; readonly setCashAmountRub: (val: any) => void;
	readonly setCashTenderedRub: (val: any) => void; readonly setSbpAmountRub: (val: any) => void;
	readonly setDepositAmountRub: (val: any) => void; readonly setLoyaltyAmountRub: (val: any) => void;
	readonly setDmsAmountRub: (val: any) => void; readonly isCheckingSbp: boolean; readonly sbpStatus: SbpPaymentCheckStatus;
	readonly effectiveSbpKopecks: number; readonly effectiveSbpOrderId: string; readonly sbpQrData: SbpQrGeneratedData | null;
	readonly setIsCheckingSbp: (val: boolean) => void; readonly setSbpStatus: (val: SbpPaymentCheckStatus) => void;
	readonly setSbpCheckMessage: (val: string | null) => void; readonly setIsFlushingQueue: (val: boolean) => void;
	readonly setIsSubmittingManualCard: (val: boolean) => void;
}

export function useFastCheckoutExecutionHandlers(p: UseFastCheckoutExecutionParams) {
	const inFlightRef = useRef(false);
	const lastClickTimeRef = useRef(0);

	const handleExecutePayment = async (forceOfflineBuffer = false) => {
		await executeFiscalPayment(
			{
				targetBillKop: p.targetBillKop, targetBillRub: p.targetBillRub, effectiveTotalRub: p.effectiveTotalRub,
				cardAmountRub: p.cardAmountRub, cashAmountRub: p.cashAmountRub, sbpAmountRub: p.sbpAmountRub,
				depositAmountRub: p.depositAmountRub, loyaltyAmountRub: p.loyaltyAmountRub, dmsAmountRub: p.dmsAmountRub,
				cashTenderedRub: p.cashTenderedRub, remainingRub: p.remainingRub, activeMethod: p.activeMethod,
				validation: p.validation, clientType: p.clientType, buyerInn: p.buyerInn, buyerName: p.buyerName,
				isElectronicReceiptOnly: p.isElectronicReceiptOnly, patientId: p.patientId, visitId: p.visitId,
				patientPhone: p.patientPhone, patientEmail: p.patientEmail, orderId: p.orderId,
				effectiveCashierFullName: p.effectiveCashierFullName, stageCalc: p.stageCalc,
				onPaymentComplete: p.onPaymentComplete, onSuccess: p.onSuccess, onClose: p.onClose,
				inFlightRef, lastClickTimeRef, isPrinting: p.isPrinting, setIsPrinting: p.setIsPrinting,
				setIsOfflineBuffered: p.setIsOfflineBuffered, setInterruptedPaymentState: p.setInterruptedPaymentState,
				setCardAmountRub: p.setCardAmountRub, setCashAmountRub: p.setCashAmountRub, setCashTenderedRub: p.setCashTenderedRub,
				setSbpAmountRub: p.setSbpAmountRub, setDepositAmountRub: p.setDepositAmountRub, setLoyaltyAmountRub: p.setLoyaltyAmountRub,
				setDmsAmountRub: p.setDmsAmountRub,
			},
			forceOfflineBuffer,
		);
	};

	const handleCheckSbpStatus = async (manual = false) => {
		await executeCheckSbpStatus({
			isCheckingSbp: p.isCheckingSbp, sbpStatus: p.sbpStatus, effectiveSbpKopecks: p.effectiveSbpKopecks,
			effectiveSbpOrderId: p.effectiveSbpOrderId, sbpQrData: p.sbpQrData, manual,
			setIsCheckingSbp: p.setIsCheckingSbp, setSbpStatus: p.setSbpStatus, setSbpCheckMessage: p.setSbpCheckMessage,
			onPaidConfirmed: () => handleExecutePayment(false),
		});
	};

	const handleConfirmSbpManual = async () => {
		await executeConfirmSbpManual({
			effectiveSbpOrderId: p.effectiveSbpOrderId, sbpQrData: p.sbpQrData, effectiveSbpKopecks: p.effectiveSbpKopecks,
			setIsCheckingSbp: p.setIsCheckingSbp, setSbpStatus: p.setSbpStatus, setSbpCheckMessage: p.setSbpCheckMessage,
			onPaidConfirmed: () => handleExecutePayment(false),
		});
	};

	const handleManualCardTerminalConfirm = async (overrideAmountRub?: number) => {
		await executeManualCardTerminalConfirm({
			targetBillRub: p.targetBillRub, overrideAmountRub, patientId: p.patientId, visitId: p.visitId,
			patientPhone: p.patientPhone, patientEmail: p.patientEmail, effectiveCashierFullName: p.effectiveCashierFullName,
			orderId: p.orderId, clientType: p.clientType, buyerInn: p.buyerInn, buyerName: p.buyerName,
			isElectronicReceiptOnly: p.isElectronicReceiptOnly, stageCalc: p.stageCalc, onPaymentComplete: p.onPaymentComplete,
			onSuccess: p.onSuccess, onClose: p.onClose, setIsSubmittingManualCard: p.setIsSubmittingManualCard,
			setIsOfflineBuffered: p.setIsOfflineBuffered, setInterruptedPaymentState: p.setInterruptedPaymentState,
		});
	};

	const handleAcceptPaymentOfflineFallback = async () => {
		showToast("Принимаем оплату через автономный терминал... Чек поставлен в очередь отложенной печати!", "info", 3000);
		await handleExecutePayment(true);
	};

	const handleRetryFiscalizationDirect = async () => {
		await executeRetryFiscalizationDirect({
			patientPhone: p.patientPhone, patientEmail: p.patientEmail, effectiveCashierFullName: p.effectiveCashierFullName,
			targetBillRub: p.targetBillRub, cashAmountRub: p.cashAmountRub, cardAmountRub: p.cardAmountRub,
			sbpAmountRub: p.sbpAmountRub, depositAmountRub: p.depositAmountRub, loyaltyAmountRub: p.loyaltyAmountRub,
			setIsFlushingQueue: p.setIsFlushingQueue, setInterruptedPaymentState: p.setInterruptedPaymentState,
		});
	};

	const handleFlushQueue = async () => {
		await executeFlushOfflineFiscalQueue(p.setIsFlushingQueue);
	};

	return {
		inFlightRef, handleExecutePayment, handleCheckSbpStatus, handleConfirmSbpManual,
		handleManualCardTerminalConfirm, handleAcceptPaymentOfflineFallback,
		handleRetryFiscalizationDirect, handleFlushQueue,
	};
}
