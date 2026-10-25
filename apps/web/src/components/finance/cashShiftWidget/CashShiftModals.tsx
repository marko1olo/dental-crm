import React from "react";
import type { ClinicFiscalRequisites } from "@dental/shared";
import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager";
import { showToast } from "../../GlobalToast";
import { CashFlowModal } from "../CashFlowModal";
import { CashRegisterModal } from "../CashRegisterModal";
import { OfflineFiscalBatchModal } from "../fiscal/OfflineFiscalBatchModal";
import { ShiftCloseZReportModal } from "../fiscal/ShiftCloseZReportModal";
import { executeCloseShiftDbTransaction, executeOpenShiftDbTransaction } from "./cashShiftService";

export interface CashShiftModalState {
	readonly isZReportModalOpen: boolean;
	readonly setIsZReportModalOpen: (v: boolean) => void;
	readonly isOfflineBatchModalOpen: boolean;
	readonly setIsOfflineBatchModalOpen: (v: boolean) => void;
	readonly isCashFlowModalOpen: boolean;
	readonly setIsCashFlowModalOpen: (v: boolean) => void;
	readonly isCashRegisterModalOpen: boolean;
	readonly setIsCashRegisterModalOpen: (v: boolean) => void;
}

export interface CashShiftModalClinicProps {
	readonly shiftNumber: number;
	readonly cashierName: string;
	readonly cashierInn: string;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicRequisites: Partial<ClinicFiscalRequisites>;
	readonly cashFlowMode: "cash_in" | "cash_out";
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly advanceOffsetRub: number;
}

export interface CashShiftModalsProps {
	readonly modalState: CashShiftModalState;
	readonly clinicProps: CashShiftModalClinicProps;
	readonly isShiftOpen: boolean;
	readonly setIsShiftOpen: (v: boolean) => void;
	readonly onCloseShift?: (() => void | Promise<void>) | undefined;
	readonly onOpenShift?: (() => void | Promise<void>) | undefined;
	readonly onPrintXReport?: (() => void | Promise<void>) | undefined;
	readonly onCashIn?: ((amount: number, basis: string, alias?: string) => void | Promise<void>) | undefined;
	readonly onCashOut?: ((amount: number, basis: string, fio?: string, alias?: string) => void | Promise<void>) | undefined;
}

export function CashShiftModals({
	modalState, clinicProps, isShiftOpen, setIsShiftOpen,
	onCloseShift, onOpenShift, onPrintXReport, onCashIn, onCashOut,
}: CashShiftModalsProps) {
	const { shiftNumber, cashierName, cashierInn, clinicName, clinicInn, clinicRequisites } = clinicProps;
	const handleClose = async () => {
		await executeCloseShiftDbTransaction({ shiftNumber, cashierName, cashierInn, cashInDrawerRub: clinicProps.cashInDrawerRub, clinicInn });
		if (onCloseShift) await onCloseShift();
		setIsShiftOpen(false);
		modalState.setIsZReportModalOpen(false);
		showToast(`Смена №${shiftNumber} закрыта в кассе и отчет отправлен оператору`, "success");
	};

	return (
		<>
			<ShiftCloseZReportModal
				isOpen={modalState.isZReportModalOpen} onClose={() => modalState.setIsZReportModalOpen(false)}
				shiftNumber={shiftNumber} cashierFullName={cashierName} cashierInn={cashierInn}
				clinicLegalName={clinicName} clinicInn={clinicInn} clinicAddress={clinicRequisites.address}
				kktRegNumber={clinicRequisites.kktRegNumber} kktSerialNumber={clinicRequisites.kktSerialNumber}
				fnSerial={clinicRequisites.fnSerialNumber} ofdName={clinicRequisites.ofdName}
				onConfirmCloseShift={handleClose}
			/>
			<OfflineFiscalBatchModal
				isOpen={modalState.isOfflineBatchModalOpen} onClose={() => modalState.setIsOfflineBatchModalOpen(false)}
				clinicName={clinicName} cashierFullName={cashierName} shiftNumber={shiftNumber} clinicRequisites={clinicRequisites}
				onBatchProcessed={() => {
					FiscalReceiptQueueManager.flushAllPending();
					showToast("Офлайн-очередь успешно обработана и фискализирована!", "success");
				}}
			/>
			<CashFlowModal
				isOpen={modalState.isCashFlowModalOpen} onClose={() => modalState.setIsCashFlowModalOpen(false)}
				initialMode={clinicProps.cashFlowMode} cashInDrawerRub={clinicProps.cashInDrawerRub}
				onCashIn={onCashIn} onCashOut={onCashOut}
			/>
			<CashRegisterModal
				isOpen={modalState.isCashRegisterModalOpen} onClose={() => modalState.setIsCashRegisterModalOpen(false)}
				isShiftOpen={isShiftOpen} shiftNumber={shiftNumber} cashierFullName={cashierName}
				cashierInn={cashierInn} clinicLegalName={clinicName} clinicInn={clinicInn}
				clinicAddress={clinicRequisites.address} kktRegNumber={clinicRequisites.kktRegNumber}
				kktSerialNumber={clinicRequisites.kktSerialNumber} fnSerial={clinicRequisites.fnSerialNumber}
				ofdName={clinicRequisites.ofdName} cashInDrawerRub={clinicProps.cashInDrawerRub}
				cardSumRub={clinicProps.cardSumRub} sbpSumRub={clinicProps.sbpSumRub}
				advanceOffsetRub={clinicProps.advanceOffsetRub}
				onOpenShift={async () => {
					await executeOpenShiftDbTransaction({ cashierName });
					if (onOpenShift) await onOpenShift();
					setIsShiftOpen(true);
				}}
				onCloseShift={handleClose}
				onPrintXReport={onPrintXReport}
			/>
		</>
	);
}
