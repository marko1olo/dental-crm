/**
 * ShiftCloseModalView.tsx — Cohesive Dialog Shell for Shift Close & Z-Report.
 * Mandate 8d pt 6: Modal depth strictly 1.
 */

import React, { useState } from "react";
import type { ShiftCloseActiveTab, ShiftCloseZReportModalProps } from "./types";
import { useShiftCloseReport } from "./useShiftCloseReport";
import { ShiftCloseHeader } from "./ShiftCloseHeader";
import { ShiftCloseReconciliationTab } from "./ShiftCloseReconciliationTab";
import { ShiftCloseFooter } from "./ShiftCloseFooter";
import {
	CashDrawerReconciliationPanel,
	FiscalReceiptTapeViewer,
} from "../CashShiftReconciliationComponents";

export interface ShiftCloseModalViewProps {
	readonly props: ShiftCloseZReportModalProps;
	readonly onOpenBatchModal: () => void;
}

export const ShiftCloseModalView: React.FC<ShiftCloseModalViewProps> = ({
	props,
	onOpenBatchModal,
}) => {
	const [activeTab, setActiveTab] = useState<ShiftCloseActiveTab>(props.initialTab || "reconciliation");
	const report = useShiftCloseReport(props);

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/50 shift-close-modal-backdrop payment-modal-backdrop animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shift-close-zreport-modal-title"
			data-testid="shift-close-zreport-modal"
		>
			<div className="bg-[var(--paper)] w-full max-w-5xl rounded-3xl shadow-2xl border border-[var(--line)] flex flex-col max-h-[90vh] overflow-hidden text-[var(--ink)] my-auto">
				{/* Modal Header */}
				<ShiftCloseHeader
					shiftNumber={report.reportSummary.shiftNumber}
					cashierFullName={props.cashierFullName || "Сидорова Анна Павловна"}
					kktRegNumber={props.kktRegNumber || "0004829104058291"}
					activeTab={activeTab}
					onTabChange={setActiveTab}
					onOpenBatchModal={onOpenBatchModal}
					onClose={props.onClose}
				/>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{activeTab === "reconciliation" && (
						<ShiftCloseReconciliationTab
							reportSummary={report.reportSummary}
							cardSumRub={report.cardSumRub}
							calculatedSbpRub={report.calculatedSbpRub}
						/>
					)}

					{activeTab === "drawer" && (
						<CashDrawerReconciliationPanel
							shiftNumber={report.reportSummary.shiftNumber}
							expectedCashRub={report.reportSummary.cashInDrawerRub}
							countedCashInput={report.countedCashInput}
							onCountedCashChange={report.setCountedCashInput}
							differenceRub={report.differenceRub}
							onMatchClick={() => report.setCountedCashInput(report.reportSummary.cashInDrawerRub.toString())}
							variant="zreport"
						/>
					)}

					{activeTab === "tape" && (
						<FiscalReceiptTapeViewer
							receiptTapeText={report.receiptTapeText}
							tapeWidth={report.tapeWidth}
							onTapeWidthChange={report.setTapeWidth}
							onCopy={report.handleCopyTapeText}
							onPrint={report.handlePrintZReport}
							isCopied={report.isCopied}
						/>
					)}
				</div>

				{/* Modal Footer */}
				<ShiftCloseFooter
					reportSummary={report.reportSummary}
					isSubmitting={report.isSubmitting}
					onClose={props.onClose}
					onConfirmClose={report.handleConfirmClose}
				/>
			</div>
		</div>
	);
};
