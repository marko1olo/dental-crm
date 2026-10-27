/**
 * CashReceiptPrintModal.tsx — 54-FZ Cash Receipt & Sales Slip Print Modal (80mm Tape & A4).
 * Decomposed into ./cashReceiptPrintModules/ per Mandate 8b (<= 80 lines).
 */

import React from "react";
import { FiscalReceiptPrintView } from "./FiscalReceiptPrintView.js";
import {
	type CashReceiptPrintModalProps,
	CashReceiptModalHeader,
	CashReceiptA4Document,
	CashReceiptModalFooter,
	useCashReceiptPrintState,
} from "./cashReceiptPrintModules/index.js";

export type { CashReceiptPrintModalProps };

export const CashReceiptPrintModal: React.FC<CashReceiptPrintModalProps> = (props) => {
	const { isOpen, onClose } = props;
	const {
		format,
		setFormat,
		isCopied,
		effectiveReceipt,
		attendingDoctorName,
		handlePrint,
		handleCopyText,
	} = useCashReceiptPrintState(props);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cash-receipt-modal-title"
			data-testid="cash-receipt-print-modal"
		>
			<div className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
				<CashReceiptModalHeader
					effectiveReceipt={effectiveReceipt}
					format={format}
					onSetFormat={setFormat}
					onClose={onClose}
				/>

				<div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--paper-soft)] flex justify-center">
					{format === "80mm" ? (
						<div className="w-full max-w-sm">
							<FiscalReceiptPrintView receipt={effectiveReceipt} />
						</div>
					) : (
						<CashReceiptA4Document
							effectiveReceipt={effectiveReceipt}
							attendingDoctorName={attendingDoctorName}
						/>
					)}
				</div>

				<CashReceiptModalFooter
					effectiveReceipt={effectiveReceipt}
					isCopied={isCopied}
					onPrint={handlePrint}
					onCopyText={handleCopyText}
					onClose={onClose}
				/>
			</div>
		</div>
	);
};

export default CashReceiptPrintModal;
