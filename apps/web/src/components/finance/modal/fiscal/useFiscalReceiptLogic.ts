/**
 * useFiscalReceiptLogic.ts — Canonical Hook for FiscalReceiptModal.
 * Orchestrates items, tender allocation, refund, recovery and submission.
 * Decomposed per Mandate 8b (<= 110 lines).
 */

import { useState } from "react";
import type { FiscalModalTab, FiscalReceipt54FzModalProps } from "./fiscalModalTypes.js";
import { useFiscalItemsAndDiscounts } from "./useFiscalItemsAndDiscounts.js";
import { useFiscalTenderAllocation } from "./useFiscalTenderAllocation.js";
import { useFiscalRefundAndAuxTabs } from "./useFiscalRefundAndAuxTabs.js";
import { useFiscalAcquiringRecovery } from "./useFiscalAcquiringRecovery.js";
import { useFiscalReceiptSubmit } from "./useFiscalReceiptSubmit.js";

export function useFiscalReceiptLogic(props: FiscalReceipt54FzModalProps) {
	const {
		items: propItems,
		patientId = "00000000-0000-0000-0000-000000000001",
		patientName = "Пациент",
		patientPhone = "+7 (___) ___-__-__",
		patientDepositRub: rawDeposit = 0,
		patientFamilyBalanceRub = 0,
		cashierFullName = "Кассир-администратор",
		clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		initialTab,
		initialOperationType,
		onReceiptFiscalized,
		totalDueRub: propTotalDueRub,
		amountRub: propAmountRub,
		totalBillRub,
		totalBillKop,
		defaultMethod,
	} = props;

	const patientDepositRub = (rawDeposit || 0) + (patientFamilyBalanceRub || 0);
	const fallbackAmount = Math.max(
		0,
		(propTotalDueRub ?? propAmountRub ?? totalBillRub ?? (totalBillKop ? totalBillKop / 100 : undefined)) ?? 0,
	);

	const itemsHook = useFiscalItemsAndDiscounts({ propItems, fallbackAmount });
	const effectiveInitialTotal = itemsHook.totalSumRub > 0 ? itemsHook.totalSumRub : fallbackAmount;

	const tenderHook = useFiscalTenderAllocation({
		defaultMethod,
		effectiveInitialTotal,
		totalSumRub: itemsHook.totalSumRub,
		totalKopecks: itemsHook.totalKopecks,
		patientDepositRub,
		patientPhone,
	});

	const effectiveInitialTab: FiscalModalTab =
		initialTab || (initialOperationType === "income_return" ? "refund" : "payment");
	const [activeTab, setActiveTab] = useState<FiscalModalTab>(effectiveInitialTab);

	const auxHook = useFiscalRefundAndAuxTabs({
		items: itemsHook.items,
		activeItems: itemsHook.activeItems,
		activeTab,
		totalSumRub: itemsHook.totalSumRub,
		splitInput: tenderHook.splitInput,
		patientId,
		patientName,
		patientPhone,
		patientDepositRub,
		cashierFullName,
		clinicName,
		customerContact: tenderHook.customerContact,
		payerType: tenderHook.payerType,
		buyerLegalName: tenderHook.buyerLegalName,
		buyerInn: tenderHook.buyerInn,
	});

	const recovery = useFiscalAcquiringRecovery({
		patientId,
		patientName,
		patientPhone,
		clinicName,
		cashierFullName,
		activeTab,
		setActiveTab,
		onReceiptFiscalized,
		itemsHook,
		tenderHook,
		auxHook,
	});

	const submit = useFiscalReceiptSubmit({
		patientId,
		patientName,
		patientPhone,
		clinicName,
		cashierFullName,
		activeTab,
		setActiveTab,
		onReceiptFiscalized,
		itemsHook,
		tenderHook,
		auxHook,
		setInterruptedFiscalState: recovery.setInterruptedFiscalState,
	});

	return {
		patientDepositRub,
		fallbackAmount,
		activeTab,
		setActiveTab,
		isFiscalizing: submit.isFiscalizing,
		interruptedFiscalState: recovery.interruptedFiscalState,
		setInterruptedFiscalState: recovery.setInterruptedFiscalState,
		isSubmittingManualCard: recovery.isSubmittingManualCard,
		itemsHook,
		tenderHook,
		auxHook,
		handleExecuteFiscalization: submit.handleExecuteFiscalization,
		handleRetryFiscalizationWithoutBalanceImpact: () =>
			recovery.handleRetryFiscalizationWithoutBalanceImpact(submit.setIsFiscalizing),
		handleManualCardTerminalConfirm: recovery.handleManualCardTerminalConfirm,
	};
}
