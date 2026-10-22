import React from "react";
import { showToast } from "../GlobalToast";
import { type ClinicFiscalRequisites, type OfflineQueueFiscalItem, DEFAULT_CLINIC_FISCAL_REQUISITES } from "@dental/shared";
import { CashShiftCompactBar } from "./CashShiftCompactBar";
import { CashShiftModals } from "./cashShiftWidget/CashShiftModals";
import { CashShiftHeader } from "./cashShiftWidget/CashShiftHeader";
import { CashShiftOfflineBanner } from "./cashShiftWidget/CashShiftOfflineBanner";
import { CashShiftMetricsGrid } from "./cashShiftWidget/CashShiftMetricsGrid";
import { CashShiftActionsBar } from "./cashShiftWidget/CashShiftActionsBar";
import { useCashShiftState } from "./cashShiftWidget/useCashShiftState";
import "./CashShiftWidget.css";

export { CashFlowModal } from "./CashFlowModal";
export { CashShiftCompactBar } from "./CashShiftCompactBar";
export { printAccountingStatement, exportShift1cCsv } from "./cashShiftReports";

export interface CashShiftWidgetProps {
	readonly initialIsOpen?: boolean | undefined;
	readonly shiftNumber?: number | undefined;
	readonly cashierName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly cashInDrawerRub?: number | undefined;
	readonly cardSumRub?: number | undefined;
	readonly sbpSumRub?: number | undefined;
	readonly advanceOffsetRub?: number | undefined;
	readonly openedAt?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicRequisites?: Partial<ClinicFiscalRequisites> | undefined;
	readonly queuedReceipts?: readonly OfflineQueueFiscalItem[] | undefined;
	readonly onOpenShift?: (() => void | Promise<void>) | undefined;
	readonly onCloseShift?: (() => void | Promise<void>) | undefined;
	readonly onPrintXReport?: (() => void | Promise<void>) | undefined;
	readonly onPrintZReport?: (() => void | Promise<void>) | undefined;
	readonly onCashIn?: ((amountRub: number, basis: string, typeAlias?: string) => void | Promise<void>) | undefined;
	readonly onCashOut?: ((amountRub: number, basis: string, recipientFio?: string, typeAlias?: string) => void | Promise<void>) | undefined;
	readonly initialCashFlowModalOpen?: boolean | undefined;
	readonly initialCashFlowMode?: "cash_in" | "cash_out" | undefined;
	readonly compact?: boolean | undefined;
}

function formatMoneyRu(val: number): string {
	return val.toLocaleString("ru-RU", { minimumFractionDigits: val % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 }) + " ₽";
}

export const CashShiftWidget: React.FC<CashShiftWidgetProps> = ({
	initialIsOpen = false,
	shiftNumber = 1,
	cashierName = "Дежурный администратор",
	cashierInn = "",
	cashInDrawerRub = 0,
	cardSumRub = 0,
	sbpSumRub = 0,
	advanceOffsetRub = 0,
	openedAt = "08:00",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "",
	clinicRequisites = DEFAULT_CLINIC_FISCAL_REQUISITES,
	queuedReceipts: externalQueuedReceipts,
	onOpenShift,
	onCloseShift,
	onPrintXReport,
	onCashIn,
	onCashOut,
	initialCashFlowModalOpen = false,
	initialCashFlowMode = "cash_in",
	compact = false,
}) => {
	const s = useCashShiftState({
		initialIsOpen, initialCashFlowModalOpen, initialCashFlowMode, externalQueuedReceipts,
		shiftNumber, cashierName, cashInDrawerRub, cardSumRub, sbpSumRub, advanceOffsetRub,
		clinicRequisites, onOpenShift, onCloseShift, onPrintXReport, formatMoneyRu,
	});

	const modalState = {
		isZReportModalOpen: s.isZReportModalOpen, setIsZReportModalOpen: s.setIsZReportModalOpen,
		isOfflineBatchModalOpen: s.isOfflineBatchModalOpen, setIsOfflineBatchModalOpen: s.setIsOfflineBatchModalOpen,
		isCashFlowModalOpen: s.isCashFlowModalOpen, setIsCashFlowModalOpen: s.setIsCashFlowModalOpen,
		isCashRegisterModalOpen: s.isCashRegisterModalOpen, setIsCashRegisterModalOpen: s.setIsCashRegisterModalOpen,
	};
	const clinicProps = {
		shiftNumber, cashierName, cashierInn, clinicName, clinicInn, clinicRequisites,
		cashFlowMode: s.cashFlowMode, cashInDrawerRub, cardSumRub, sbpSumRub, advanceOffsetRub,
	};
	const openCashIn = () => { s.setCashFlowMode("cash_in"); s.setIsCashFlowModalOpen(true); };
	const openCashOut = () => { s.setCashFlowMode("cash_out"); s.setIsCashFlowModalOpen(true); };
	const openZReport = () => { if (!s.isShiftOpen) { showToast("Смена уже закрыта", "warning"); return; } s.setIsZReportModalOpen(true); };

	if (compact) {
		return (
			<>
				<CashShiftCompactBar
					isShiftOpen={s.isShiftOpen} shiftNumber={shiftNumber} cashierName={cashierName}
					totalTurnoverRub={s.totalTurnoverRub} pendingOfflineCount={s.pendingOfflineCount} isProcessing={s.isProcessing}
					isReportsMenuOpen={s.isReportsMenuOpen} setIsReportsMenuOpen={s.setIsReportsMenuOpen}
					onOpenCashInModal={openCashIn} onOpenCashOutModal={openCashOut}
					onToggleShift={s.isShiftOpen ? openZReport : s.handleToggleShift}
					onOpenOfflineBatchModal={() => s.setIsOfflineBatchModalOpen(true)} onPrintXReport={s.handleXReport}
					onPrintAccountingStatement={s.handlePrintAccounting} onExport1cCsv={s.handleExport1c}
					onOpenCashRegisterModal={() => s.setIsCashRegisterModalOpen(true)} formatMoneyRu={formatMoneyRu}
				/>
				<CashShiftModals modalState={modalState} clinicProps={clinicProps} isShiftOpen={s.isShiftOpen} setIsShiftOpen={s.setIsShiftOpen} onCloseShift={onCloseShift} onOpenShift={onOpenShift} onPrintXReport={s.handleXReport} onCashIn={onCashIn} onCashOut={onCashOut} />
			</>
		);
	}

	return (
		<div className="cash-shift-container" data-testid="cash-shift-widget">
			<CashShiftHeader isShiftOpen={s.isShiftOpen} shiftNumber={shiftNumber} cashierName={cashierName} openedAt={openedAt} pendingOfflineCount={s.pendingOfflineCount} totalTurnoverRub={s.totalTurnoverRub} isProcessing={s.isProcessing} onToggleShift={s.isShiftOpen ? openZReport : s.handleToggleShift} />
			<CashShiftOfflineBanner pendingOfflineCount={s.pendingOfflineCount} pendingOfflineAmountRub={s.pendingOfflineAmountRub} formatMoneyRu={formatMoneyRu} onOpenOfflineBatchModal={() => s.setIsOfflineBatchModalOpen(true)} />
			<CashShiftMetricsGrid cashInDrawerRub={cashInDrawerRub} cardSumRub={cardSumRub} sbpSumRub={sbpSumRub} totalTurnoverRub={s.totalTurnoverRub} netBankDepositRub={s.netBankDepositRub} formatMoneyRu={formatMoneyRu} />
			<CashShiftActionsBar pendingOfflineCount={s.pendingOfflineCount} isProcessing={s.isProcessing} isBottomActionsMenuOpen={s.isBottomActionsMenuOpen} setIsBottomActionsMenuOpen={s.setIsBottomActionsMenuOpen} onOpenCashInModal={openCashIn} onOpenCashOutModal={openCashOut} onPrintXReport={s.handleXReport} onPrintAccountingStatement={s.handlePrintAccounting} onExport1cCsv={s.handleExport1c} onOpenOfflineBatchModal={() => s.setIsOfflineBatchModalOpen(true)} onOpenCashRegisterModal={() => s.setIsCashRegisterModalOpen(true)} />
			<CashShiftModals modalState={modalState} clinicProps={clinicProps} isShiftOpen={s.isShiftOpen} setIsShiftOpen={s.setIsShiftOpen} onCloseShift={onCloseShift} onOpenShift={onOpenShift} onPrintXReport={s.handleXReport} onCashIn={onCashIn} onCashOut={onCashOut} />
		</div>
	);
};
