/**
 * CashRegisterModal.tsx — 1-Click Receptionist / Admin Cash Register & Shift Autopilot.
 *
 * Mandates 8b, 8c, 8d, 8e, 8n:
 * - 1-Click "Открыть кассовую смену" without bureaucratic obstacle course.
 * - 1-Click "Закрыть смену / Z-отчёт" with strict kopeck-exact money reconciliation.
 * - Instant 1-Click "Совпадает с кассой" button to eliminate typing and calculation errors.
 * - 0 disabled buttons (Mandate 8e): double-click protection via aria-busy & internal guards.
 * - Modal depth <= 1 (Mandate 8d pt 6): completely flat, self-contained surface.
 * - Decomposed into ./cashRegisterModalModules/ in strict compliance with Mandate 8b (<=120 lines).
 */

import React from "react";
import { createPortal } from "react-dom";
import {
	type CashRegisterModalProps,
	useCashRegisterModalLogic,
	CashRegisterModalHeader,
	CashRegisterClosedBody,
	CashRegisterOpenBody,
	CashRegisterModalFooter,
} from "./cashRegisterModalModules/index.js";

export type { CashRegisterModalProps };

export const CashRegisterModal: React.FC<CashRegisterModalProps> = (props) => {
	const {
		isOpen, onClose, shiftNumber = 1, cashierFullName = "Дежурный администратор",
		kktRegNumber = "0004829104058291", ofdName = "АО «ПЕРВЫЙ ОФД»", onOpenSplitPayment,
	} = props;

	const ctrl = useCashRegisterModalLogic(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end sm:items-center sm:justify-center bg-black/60 p-0 sm:p-3 animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cash-register-modal-title"
			data-testid="cash-register-modal"
		>
			<div className="w-full max-w-full sm:max-w-4xl lg:max-w-5xl rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border-t sm:border border-[var(--line)] text-[var(--ink)] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[94vh] min-h-0">
				<CashRegisterModalHeader
					isShiftActive={ctrl.isShiftActive} shiftNumber={shiftNumber}
					cashierFullName={cashierFullName} kktRegNumber={kktRegNumber} ofdName={ofdName}
					activeTab={ctrl.activeTab} setActiveTab={ctrl.setActiveTab} onClose={onClose}
				/>

				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
					{!ctrl.isShiftActive ? (
						<CashRegisterClosedBody
							isProcessing={ctrl.isProcessing} onOpenShift={ctrl.handleOpenShiftAction}
						/>
					) : (
						<CashRegisterOpenBody
							activeTab={ctrl.activeTab} netRevenueRub={ctrl.netRevenueRub}
							cashInDrawerRub={ctrl.cashInDrawerRub} cardSumRub={ctrl.cardSumRub}
							sbpSumRub={ctrl.sbpSumRub} advanceOffsetRub={ctrl.advanceOffsetRub}
							acquiringFeeRub={ctrl.acquiringFeeRub} netBankDepositRub={ctrl.netBankDepositRub}
							shiftNumber={shiftNumber} countedCashInput={ctrl.countedCashInput}
							setCountedCashInput={ctrl.setCountedCashInput} differenceRub={ctrl.differenceRub}
							receiptTapeText={ctrl.receiptTapeText} tapeWidth={ctrl.tapeWidth}
							setTapeWidth={ctrl.setTapeWidth} isCopied={ctrl.isCopied}
							onCopyTape={ctrl.handleCopyTape} onPrintTape={ctrl.handlePrintTape}
						/>
					)}
				</div>

				<CashRegisterModalFooter
					isShiftActive={ctrl.isShiftActive} netRevenueRub={ctrl.netRevenueRub}
					cashInDrawerRub={ctrl.cashInDrawerRub} isProcessing={ctrl.isProcessing}
					onPrintXReport={ctrl.handlePrintXReportAction} onOpenSplitPayment={onOpenSplitPayment}
					onClose={onClose} onCloseShift={ctrl.handleCloseShiftAction}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default CashRegisterModal;
