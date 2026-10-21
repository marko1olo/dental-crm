import { useCallback } from "react";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService.js";
import { showToast } from "../../GlobalToast.js";

export function useCashRegisterOpenShift(
	shiftNumber: number,
	cashierFullName: string,
	cashInDrawerKopecks: number,
	isProcessing: boolean,
	setIsProcessing: (v: boolean) => void,
	setLocalIsShiftOpen: (v: boolean) => void,
	onOpenShift?: () => Promise<void> | void,
) {
	const handleOpenShiftAction = useCallback(async () => {
		if (isProcessing) return;
		setIsProcessing(true);
		try {
			if (onOpenShift) await onOpenShift();
			else
				await fetch("/api/fiscal/shift/open", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ cashierFullName }),
				}).catch(() => null);
			setLocalIsShiftOpen(true);
			StaffActionAuditService.logShiftOpen({
				cashRegisterId: "kkt_main",
				shiftNumber,
				openingCashKopecks: cashInDrawerKopecks,
			});
			showToast(
				`Кассовая смена №${shiftNumber} открыта на кассовом аппарате!`,
				"success",
				4000,
			);
		} catch (err) {
			showToast(
				`Не удалось открыть смену: ${err instanceof Error ? err.message : "Ошибка"}`,
				"error",
			);
		} finally {
			setIsProcessing(false);
		}
	}, [
		isProcessing,
		onOpenShift,
		cashierFullName,
		shiftNumber,
		cashInDrawerKopecks,
		setLocalIsShiftOpen,
		setIsProcessing,
	]);

	return { handleOpenShiftAction };
}
