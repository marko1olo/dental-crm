import { useCallback } from "react";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService.js";
import { showToast } from "../../GlobalToast.js";
import type { Ffd12ShiftCloseZReportSummary } from "../fiscal/fiscal54fzEngine.js";
import { executeCloseShiftDbTransaction } from "../cashShiftWidget/cashShiftService.js";

export function useCashRegisterCloseShift(
	shiftNumber: number,
	netRevenueKopecks: number,
	cashInDrawerKopecks: number,
	reportSummary: Ffd12ShiftCloseZReportSummary,
	isProcessing: boolean,
	setIsProcessing: (v: boolean) => void,
	setLocalIsShiftOpen: (v: boolean) => void,
	onCloseModal: () => void,
	onCloseShift?: (
		summary: Ffd12ShiftCloseZReportSummary,
	) => Promise<void> | void,
) {
	const handleCloseShiftAction = useCallback(async () => {
		if (isProcessing) return;
		setIsProcessing(true);
		try {
			await executeCloseShiftDbTransaction({
				shiftNumber,
				cashierName: (reportSummary as any)?.cashierFullName ?? (reportSummary as any)?.cashierName,
				cashierInn: (reportSummary as any)?.cashierInn,
				cashInDrawerRub: reportSummary.cashInDrawerRub,
				countedCashRub: reportSummary.cashInDrawerRub,
				netRevenueRub: reportSummary.netRevenueRub,
			});
			if (onCloseShift) await onCloseShift(reportSummary);
			setLocalIsShiftOpen(false);
			StaffActionAuditService.logShiftClose({
				cashRegisterId: "kkt_main",
				shiftNumber,
				totalRevenueKopecks: netRevenueKopecks,
				closingCashKopecks: cashInDrawerKopecks,
			});
			showToast(
				`Кассовая смена №${shiftNumber} закрыта! Z-отчёт распечатан на ККТ.`,
				"success",
				5000,
			);
			onCloseModal();
		} catch (err) {
			showToast(
				`Ошибка закрытия смены: ${err instanceof Error ? err.message : "Ошибка"}`,
				"error",
			);
		} finally {
			setIsProcessing(false);
		}
	}, [
		isProcessing,
		onCloseShift,
		reportSummary,
		shiftNumber,
		netRevenueKopecks,
		cashInDrawerKopecks,
		onCloseModal,
		setLocalIsShiftOpen,
		setIsProcessing,
	]);

	return { handleCloseShiftAction };
}
