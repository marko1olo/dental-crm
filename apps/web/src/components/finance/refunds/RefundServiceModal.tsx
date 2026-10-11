/**
 * RefundServiceModal.tsx — 1-Click Partial Service Refund & Doctor Commission Clawback Modal.
 * Decomposed canonical UI facade (Mandate 8b <= 120 lines, DAG Layer 5).
 */

import React from "react";
import { createPortal } from "react-dom";
import type { RefundServiceModalProps } from "./refundServiceModalModules/types";
import {
	RefundItemsSelectionTable,
	RefundModalFooter,
	RefundModalHeader,
	RefundPaymentMethodSelector,
	RefundReceiptVerificationView,
	RefundSummaryCalculationPanel,
	useRefundServiceModalController,
} from "./refundServiceModalModules";

export type { RefundServiceModalProps };

export const RefundServiceModal: React.FC<RefundServiceModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		invoiceNumber,
		patientName,
		doctorName = "Лечащий врач",
		doctorCommissionPct = 30,
	} = props;
	const controller = useRefundServiceModalController(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
			data-testid="refund-service-modal"
		>
			<div className="relative w-full max-w-2xl rounded-2xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				<RefundModalHeader
					invoiceNumber={invoiceNumber}
					patientName={patientName}
					onClose={onClose}
				/>

				<div className="flex-1 overflow-y-auto p-5 space-y-5">
					{controller.activeTab === "form" ? (
						<>
							<RefundItemsSelectionTable
								rawServices={controller.rawServices}
								selectedItemIds={controller.selectedItemIds}
								toggleSelectItem={controller.toggleSelectItem}
								doctorCommissionPct={doctorCommissionPct}
								doctorName={doctorName}
							/>

							<RefundPaymentMethodSelector
								reasonCategory={controller.reasonCategory}
								setReasonCategory={controller.setReasonCategory}
								paymentMethod={controller.paymentMethod}
								setPaymentMethod={controller.setPaymentMethod}
							/>

							<RefundSummaryCalculationPanel
								calculation={controller.calculation}
								doctorCommissionPct={doctorCommissionPct}
								doctorName={doctorName}
							/>
						</>
					) : (
						controller.completedResult && (
							<RefundReceiptVerificationView
								completedResult={controller.completedResult}
								clinicInfo={controller.clinicInfo}
								receiptQrPayload={controller.receiptQrPayload}
								fiscalInfo={controller.fiscalInfo}
							/>
						)
					)}
				</div>

				<RefundModalFooter
					activeTab={controller.activeTab}
					setActiveTab={controller.setActiveTab}
					onClose={onClose}
					handleExecuteRefund={controller.handleExecuteRefund}
					isProcessing={controller.isProcessing}
					hasSelection={controller.selectedItemIds.size > 0 && controller.rawServices.length > 0}
					calculation={controller.calculation}
				/>
			</div>
		</div>
	);

	if (typeof document === "undefined") {
		return modalContent;
	}
	return createPortal(modalContent, document.body);
};

export default RefundServiceModal;
