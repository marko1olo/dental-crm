import { useEffect, useRef, useState } from "react";
import type { ClinicFiscalRequisites, OfflineQueueFiscalItem } from "@dental/shared";
import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager";
import type { QueuedFiscalReceiptItem } from "../../../services/hardware/hardwareTypes";
import { showToast } from "../../GlobalToast";
import { exportShift1cCsv, printAccountingStatement } from "../cashShiftReports";
import { useCashShiftCalculations } from "./useCashShiftCalculations";
import { executeCloseShiftDbTransaction, executeOpenShiftDbTransaction } from "./cashShiftService";

interface UseCashShiftStateProps {
	readonly initialIsOpen?: boolean | undefined;
	readonly initialCashFlowModalOpen?: boolean | undefined;
	readonly initialCashFlowMode?: "cash_in" | "cash_out" | undefined;
	readonly externalQueuedReceipts?: readonly OfflineQueueFiscalItem[] | undefined;
	readonly shiftNumber: number;
	readonly cashierName: string;
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly advanceOffsetRub: number;
	readonly clinicRequisites: Partial<ClinicFiscalRequisites>;
	readonly onOpenShift?: (() => void | Promise<void>) | undefined;
	readonly onCloseShift?: (() => void | Promise<void>) | undefined;
	readonly onPrintXReport?: (() => void | Promise<void>) | undefined;
	readonly formatMoneyRu: (v: number) => string;
}

export function useCashShiftState(props: UseCashShiftStateProps) {
	const {
		initialIsOpen = false, initialCashFlowModalOpen = false, initialCashFlowMode = "cash_in",
		externalQueuedReceipts, shiftNumber, cashierName, cashInDrawerRub, cardSumRub, sbpSumRub,
		advanceOffsetRub, clinicRequisites, onOpenShift, onCloseShift, onPrintXReport, formatMoneyRu,
	} = props;

	const [isShiftOpen, setIsShiftOpen] = useState(initialIsOpen);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);
	const [isOfflineBatchModalOpen, setIsOfflineBatchModalOpen] = useState(false);
	const [queuedItems, setQueuedItems] = useState<QueuedFiscalReceiptItem[]>([]);
	const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false);
	const [isBottomActionsMenuOpen, setIsBottomActionsMenuOpen] = useState(false);
	const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState(false);
	const [isCashFlowModalOpen, setIsCashFlowModalOpen] = useState(initialCashFlowModalOpen);
	const [cashFlowMode, setCashFlowMode] = useState<"cash_in" | "cash_out">(initialCashFlowMode);
	const inFlightRef = useRef(false);
	const lastClickTimeRef = useRef(0);

	useEffect(() => {
		const unsub = FiscalReceiptQueueManager.subscribe((items) => setQueuedItems(items));
		return () => unsub();
	}, []);

	const calc = useCashShiftCalculations(externalQueuedReceipts, queuedItems, cashInDrawerRub, cardSumRub, sbpSumRub, advanceOffsetRub);

	const handleToggleShift = async () => {
		const now = Date.now();
		if (inFlightRef.current || isProcessing || now - lastClickTimeRef.current < 600) return;
		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		setIsProcessing(true);
		try {
			if (isShiftOpen) {
				await executeCloseShiftDbTransaction({
					shiftNumber,
					cashierName,
					cashInDrawerRub,
					netRevenueRub: calc.totalTurnoverRub,
				});
				if (onCloseShift) await onCloseShift();
				setIsShiftOpen(false);
				showToast(`Смена №${shiftNumber} закрыта (Z-отчет снят). Выручка: ${formatMoneyRu(calc.totalTurnoverRub)}`, "success", 4000);
			} else {
				await executeOpenShiftDbTransaction({ cashierName });
				if (onOpenShift) await onOpenShift();
				setIsShiftOpen(true);
				showToast(`Смена №${shiftNumber + 1} открыта в кассе`, "success", 3000);
			}
		} catch {
			showToast("Ошибка связи с фискальным регистратором", "error");
		} finally {
			setIsProcessing(false);
			inFlightRef.current = false;
		}
	};

	const handleXReport = async () => {
		const now = Date.now();
		if (inFlightRef.current || isProcessing || now - lastClickTimeRef.current < 600) return;
		if (!isShiftOpen) { showToast("Смена закрыта. Для отчета откройте смену", "info", 4000); return; }
		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		setIsProcessing(true);
		try {
			if (onPrintXReport) await onPrintXReport();
			showToast(`X-отчет напечатан: ${formatMoneyRu(calc.totalTurnoverRub)}`, "info", 3000);
		} catch {
			showToast("Не удалось распечатать X-отчет", "error");
		} finally {
			setIsProcessing(false);
			inFlightRef.current = false;
		}
	};

	const reportArgs = { shiftNumber, cashierName, cashInDrawerRub, cardSumRub, sbpSumRub, advanceOffsetRub, totalTurnoverRub: calc.totalTurnoverRub, acquiringFeeRub: calc.acquiringFeeRub, clinicRequisites };

	return {
		isShiftOpen, setIsShiftOpen, isProcessing, isZReportModalOpen, setIsZReportModalOpen,
		isOfflineBatchModalOpen, setIsOfflineBatchModalOpen, isReportsMenuOpen, setIsReportsMenuOpen,
		isBottomActionsMenuOpen, setIsBottomActionsMenuOpen, isCashRegisterModalOpen, setIsCashRegisterModalOpen,
		isCashFlowModalOpen, setIsCashFlowModalOpen, cashFlowMode, setCashFlowMode,
		pendingOfflineCount: calc.pendingOfflineCount, pendingOfflineAmountRub: calc.pendingOfflineAmountRub,
		totalTurnoverRub: calc.totalTurnoverRub, netBankDepositRub: calc.netBankDepositRub,
		handleToggleShift, handleXReport,
		handlePrintAccounting: () => printAccountingStatement(reportArgs),
		handleExport1c: () => exportShift1cCsv(reportArgs),
	};
}
