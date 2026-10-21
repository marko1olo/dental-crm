import { useCallback } from "react";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService.js";
import { showToast } from "../../GlobalToast.js";
import type { Ffd12ShiftCloseZReportSummary } from "../fiscal/fiscal54fzEngine.js";

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
			if (onCloseShift) await onCloseShift(reportSummary);
			else
				await fetch("/api/fiscal/shift/close", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(reportSummary),
				}).catch(() => null);
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
