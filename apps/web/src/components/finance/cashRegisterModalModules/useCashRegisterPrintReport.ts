import { useCallback } from "react";
import { showToast } from "../../GlobalToast.js";

export function useCashRegisterPrintReport(
	isProcessing: boolean,
	setIsProcessing: (val: boolean) => void,
	onPrintXReport?: () => Promise<void> | void,
) {
	const handlePrintXReportAction = useCallback(async () => {
		if (isProcessing) return;
		setIsProcessing(true);
		try {
			if (onPrintXReport) await onPrintXReport();
			else
				await fetch("/api/fiscal/report/x", { method: "POST" }).catch(
					() => null,
				);
			showToast(
				"Промежуточный X-отчет распечатан на кассовом аппарате",
				"info",
				3500,
			);
		} catch (err) {
			showToast(
				`Ошибка печати X-отчета: ${err instanceof Error ? err.message : "Ошибка"}`,
				"error",
			);
		} finally {
			setIsProcessing(false);
		}
	}, [isProcessing, onPrintXReport, setIsProcessing]);

	return { handlePrintXReportAction };
}
