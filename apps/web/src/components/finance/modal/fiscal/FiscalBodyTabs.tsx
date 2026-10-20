import type React from "react";
import { FiscalAuxTabs } from "./FiscalAuxTabs.js";
import { FiscalPaymentTab } from "./FiscalPaymentTab.js";
import { FiscalRefundTab } from "./FiscalRefundTab.js";
import type { FiscalReceiptModalProps } from "./fiscalModalTypes.js";
import type { useFiscalReceipt54FzLogic } from "./useFiscalReceipt54FzLogic.js";

export interface FiscalBodyTabsProps {
	readonly logic: ReturnType<typeof useFiscalReceipt54FzLogic>;
	readonly props: FiscalReceiptModalProps;
	readonly patientName: string;
}

/**
 * Main body renderer for FiscalReceiptModal tabs.
 * Mandate 8b: <= 120 lines.
 */
export const FiscalBodyTabs: React.FC<FiscalBodyTabsProps> = ({
	logic,
	props,
	patientName,
}) => {
	const { itemsHook, tenderHook, auxHook } = logic;

	return (
		<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
			{logic.activeTab === "payment" && (
				<FiscalPaymentTab
					itemsHook={itemsHook}
					tenderHook={tenderHook}
					handlePrintSalesSlip={auxHook.handlePrintSalesSlip}
					handleManualCardTerminalConfirm={
						logic.handleManualCardTerminalConfirm
					}
					isSubmittingManualCard={logic.isSubmittingManualCard}
					handleRetryFiscalizationWithoutBalanceImpact={
						logic.handleRetryFiscalizationWithoutBalanceImpact
					}
					isFiscalizing={logic.isFiscalizing}
					handleCopyActData={auxHook.handleCopyActData}
					handleCopyCertData={auxHook.handleCopyCertData}
					patientDepositRub={logic.patientDepositRub}
				/>
			)}

			{logic.activeTab === "refund" && (
				<FiscalRefundTab
					activeItems={itemsHook.activeItems}
					patientDepositRub={logic.patientDepositRub}
					refundMode={auxHook.refundMode}
					setRefundMode={auxHook.setRefundMode}
					selectedCashBoxType={tenderHook.selectedCashBoxType}
					setSelectedCashBoxType={tenderHook.setSelectedCashBoxType}
					selectedExpenseAlias={auxHook.selectedExpenseAlias}
					setSelectedExpenseAlias={auxHook.setSelectedExpenseAlias}
					isAdvanceRefund={auxHook.isAdvanceRefund}
					refundAdvanceAmountRub={auxHook.refundAdvanceAmountRub}
					setRefundAdvanceAmountRub={auxHook.setRefundAdvanceAmountRub}
					refundAdvancePurpose={auxHook.refundAdvancePurpose}
					setRefundAdvancePurpose={auxHook.setRefundAdvancePurpose}
					handleSelectAllRefundItems={auxHook.handleSelectAllRefundItems}
					handleDeselectAllRefundItems={auxHook.handleDeselectAllRefundItems}
					refundItemSelection={auxHook.refundItemSelection}
					setRefundItemSelection={auxHook.setRefundItemSelection}
					originalReceiptNumberForRefund={
						auxHook.originalReceiptNumberForRefund
					}
					setOriginalReceiptNumberForRefund={
						auxHook.setOriginalReceiptNumberForRefund
					}
					refundReason={auxHook.refundReason}
					setRefundReason={auxHook.setRefundReason}
					handleExecuteFiscalization={logic.handleExecuteFiscalization}
					isFiscalizing={logic.isFiscalizing}
					refundFiscalData={auxHook.refundFiscalData}
				/>
			)}

			{logic.activeTab !== "payment" && logic.activeTab !== "refund" && (
				<FiscalAuxTabs logic={logic} props={props} patientName={patientName} />
			)}
		</div>
	);
};
