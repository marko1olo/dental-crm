/**
 * DENTE Dental CRM — Funnel Export CSV & Summary Actions Hook
 * Mandate 8b (<= 120 lines)
 */

import { showToast } from "../../GlobalToast";
import {
	buildFunnelCsvFilename,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
} from "./funnelAnalyticsUtils";
import type { FunnelAnalysisResult, FunnelTimePeriod } from "./types";

export function useFunnelExportActions(
	analysis: FunnelAnalysisResult,
	period: FunnelTimePeriod,
) {
	const handleExportCsv = () => {
		try {
			const csvData = exportFunnelReportCsv(analysis);
			const blob = new Blob([csvData], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", buildFunnelCsvFilename(period));
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			showToast("Отчет успешно экспортирован в CSV (Excel)", "success");
		} catch {
			showToast("Не удалось экспортировать отчет", "error");
		}
	};

	const handleCopySummary = async () => {
		try {
			const text = exportFunnelReportSummaryText(analysis);
			await navigator.clipboard.writeText(text);
			showToast("Дайджест воронки скопирован в буфер обмена", "success");
		} catch {
			showToast("Не удалось скопировать сводку", "error");
		}
	};

	return {
		handleExportCsv,
		handleCopySummary,
	};
}
