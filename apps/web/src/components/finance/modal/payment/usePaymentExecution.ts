/**
 * apps/web/src/components/finance/modal/payment/usePaymentExecution.ts
 *
 * DENTE Dental CRM — Cashier Payment Execution Facade Hook.
 * Complies with 54-FZ (FFD 1.2), Mandate 8e (Doctor Autonomy), Mandate 8i (Kopeck Precision).
 * Architecturally decomposed into ./executionModules/ with strict file line boundaries (facade <= 250 LOC).
 */

import { useRef, useState } from "react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { broadcastPatientBalanceChange } from "../../../../services/storage";
import { showToast } from "../../../GlobalToast";
import { usePaymentSbpAndTerminalExecution } from "./usePaymentSbpAndTerminalExecution.js";
import {
	executeCashSubmit,
	executeDepositSubmit,
	executeSplitSubmit,
	type InterruptedPaymentState,
	type PaymentExecutionHookResult,
	type PaymentExecutorContext,
	type UsePaymentExecutionParams,
} from "./executionModules/index.js";


export type { UsePaymentExecutionParams, PaymentExecutionHookResult } from "./executionModules/index.js";

export function usePaymentExecution(params: UsePaymentExecutionParams): PaymentExecutionHookResult {
	const {
		patientId, patientName, patientPhone, visitId, documentId, invoiceId,
		clinicLegalName, effectiveCashier, totalDueRub, rawTotalDueRub, isWarranty100,
		discountCalc, discountReason, discountRub, effectiveDiscountPercent, activeMethod,
		selectedCashBoxType, selectedReceiptAlias, buyerInn,
		splitDepositRub, setSplitDepositRub, setSplitCardRub, setSplitCashRub,
		splitSbpRub, setSplitSbpRub, patientDepositRub, patientFamilyBalanceRub,
		effectiveSbpOrderId, effectiveSbpKopecks, sbpStatus, setSbpStatus,
		isCheckingSbp, setIsCheckingSbp, setSbpCheckMessage, sbpQrData,
		items, toothNumber, isOpen, onClose, onSuccess,
	} = params;


	const inFlightRef = useRef<boolean>(false);
	const isSubmittingCashRef = useRef<boolean>(false);
	const isSubmittingSplitRef = useRef<boolean>(false);
	const isSubmittingDepositRef = useRef<boolean>(false);
	const [isSubmittingCash, setIsSubmittingCash] = useState<boolean>(false);
	const [isSubmittingSplit, setIsSubmittingSplit] = useState<boolean>(false);
	const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

	const handleBroadcastSuccess: typeof onSuccess = (result) => {
		try {
			broadcastPatientBalanceChange({
				patientId,
				patientName,
				deltaRub: totalDueRub,
				updatedAt: new Date().toISOString(),
			});
		} catch {
			// Non-blocking cross-tab broadcast
		}
		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("dente:patient-balance-changed", {
						detail: { patientId, patientName, deltaRub: totalDueRub, result },
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente:payment-completed", {
						detail: { patientId, visitId, documentId, invoiceId, amountRub: totalDueRub, result },
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente:refresh-billing", {
						detail: { patientId, visitId },
					}),
				);
			} catch {
				// Non-blocking window event dispatch
			}
		}
		onSuccess(result);
	};

	const sbpAndTerminal = usePaymentSbpAndTerminalExecution({
		patientId,
		patientName,
		patientPhone,
		visitId,
		documentId,
		invoiceId,
		clinicLegalName,
		effectiveCashier,
		totalDueRub,
		rawTotalDueRub,
		isWarranty100,
		discountCalc,
		discountReason,
		discountRub,
		effectiveDiscountPercent,
		activeMethod,
		selectedCashBoxType,
		selectedReceiptAlias,
		buyerInn,
		splitSbpRub,
		effectiveSbpOrderId,
		effectiveSbpKopecks,
		sbpStatus,
		setSbpStatus,
		isCheckingSbp,
		setIsCheckingSbp,
		setSbpCheckMessage,
		sbpQrData,
		items,
		toothNumber,
		isOpen,
		onClose,
		onSuccess: handleBroadcastSuccess,
	});

	const setInterruptedState: (s: InterruptedPaymentState) => void = (s) => {
		if (s) {
			sbpAndTerminal.setInterruptedPaymentState({
				isInterrupted: s.isInterrupted,
				reason: s.reason,
				method: s.method,
				amountRub: s.amountRub,
				...(s.lastMutationId !== undefined ? { lastMutationId: s.lastMutationId } : {}),
			});
		} else {
			sbpAndTerminal.setInterruptedPaymentState(null);
		}
	};

	const executorContext: PaymentExecutorContext = {
		handleBroadcastSuccess,
		setInterruptedPaymentState: setInterruptedState,
	};


	const handleCashSubmit = async () => {
		if (inFlightRef.current || isSubmittingCashRef.current || isSubmittingCash) return;
		inFlightRef.current = true;
		isSubmittingCashRef.current = true;
		setIsSubmittingCash(true);
		try {
			await executeCashSubmit(params, executorContext);
		} finally {
			inFlightRef.current = false;
			isSubmittingCashRef.current = false;
			setIsSubmittingCash(false);
		}
	};

	const handleSplitSubmit = async () => {
		if (inFlightRef.current || isSubmittingSplitRef.current || isSubmittingSplit) return;
		inFlightRef.current = true;
		isSubmittingSplitRef.current = true;
		setIsSubmittingSplit(true);
		try {
			await executeSplitSubmit(params, executorContext);
		} finally {
			inFlightRef.current = false;
			isSubmittingSplitRef.current = false;
			setIsSubmittingSplit(false);
		}
	};

	const handleDepositSubmit = async (source: "deposit" | "family") => {
		if (inFlightRef.current || isSubmittingDepositRef.current || isSubmittingDeposit) return;
		inFlightRef.current = true;
		isSubmittingDepositRef.current = true;
		setIsSubmittingDeposit(true);
		try {
			await executeDepositSubmit(params, source, executorContext);
		} finally {
			inFlightRef.current = false;
			isSubmittingDepositRef.current = false;
			setIsSubmittingDeposit(false);
		}
	};


	const handleDepositOrPartialCombo = (source: "deposit" | "family") => {
		const availableBalance = source === "deposit" ? patientDepositRub : patientFamilyBalanceRub;
		if (availableBalance <= 0) {
			showToast(
				source === "deposit"
					? "На личном депозите пациента нет средств (0 ₽). Пополните аванс или выберите другой способ оплаты."
					: "Семейный баланс пуст (0 ₽). Пополните семейный кошелек или выберите другой способ оплаты.",
				"warning",
				4000,
			);
			return;
		}
		if (availableBalance >= totalDueRub) {
			handleDepositSubmit(source);
		} else if (availableBalance > 0) {
			const totalKop = rubToKopecks(totalDueRub);
			const balKop = Math.min(totalKop, rubToKopecks(availableBalance));
			const remKop = Math.max(0, totalKop - balKop);
			setSplitDepositRub(kopecksToRub(balKop));
			setSplitCardRub(kopecksToRub(remKop));
			setSplitCashRub(0);
			setSplitSbpRub(0);
			params.setActiveMethod("split");
			showToast(
				`Зачтено ${kopecksToRub(balKop)} ₽ ${source === "family" ? "из семьи" : "с аванса"}. Остаток ${kopecksToRub(remKop)} ₽ перенесён на карту.`,
				"info",
				3500,
			);
		}
	};

	return {
		isSubmittingCash,
		isSubmittingSplit,
		isSubmittingDeposit,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		interruptedPaymentState: sbpAndTerminal.interruptedPaymentState,
		setInterruptedPaymentState: setInterruptedState,
		isSubmittingManualCard: sbpAndTerminal.isSubmittingManualCard,

		fiscalizationRetryPending: sbpAndTerminal.fiscalizationRetryPending,
		setFiscalizationRetryPending: sbpAndTerminal.setFiscalizationRetryPending,
		isRetryingFiscalization: sbpAndTerminal.isRetryingFiscalization,
		handleCashSubmit,
		handleSplitSubmit,
		handleDepositSubmit,
		handleDepositOrPartialCombo,
		handleManualCardTerminalConfirm: sbpAndTerminal.handleManualCardTerminalConfirm,
		handleRetryFiscalization: sbpAndTerminal.handleRetryFiscalization,
		handleSbpExecutePayment: sbpAndTerminal.handleSbpExecutePayment,
		handleCheckSbpStatus: sbpAndTerminal.handleCheckSbpStatus,
		handleConfirmSbpManual: sbpAndTerminal.handleConfirmSbpManual,
		handleSberSuccess: sbpAndTerminal.handleSberSuccess,
	};
}
