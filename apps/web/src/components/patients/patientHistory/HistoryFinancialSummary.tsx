import React from "react";
import { FileText } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { PatientHistoryFinancialSummaryData } from "./types";
import { HistoryFinancialMetrics } from "./HistoryFinancialMetrics";

export interface HistoryFinancialSummaryProps {
	summary: PatientHistoryFinancialSummaryData;
	patientName?: string | null | undefined;
	className?: string | undefined;
}

export const HistoryFinancialSummary: React.FC<HistoryFinancialSummaryProps> = React.memo(
	function HistoryFinancialSummary({
		summary,
		patientName = "Пациент",
		className = "",
	}) {
		if (summary.visitsCount === 0) {
			return null;
		}

		const handleTaxDeductionClick = () => {
			if (typeof window !== "undefined") {
				showToast(
					`Сформирована справка для налогового вычета по расходам на лечение: ${patientName} (${summary.totalPaidRub.toLocaleString("ru-RU")} ₽)`,
					"success",
				);
			}
		};

		return (
			<div
				className={`bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs ${className}`}
				data-testid="history-financial-summary"
			>
				<HistoryFinancialMetrics summary={summary} />

				<button
					type="button"
					onClick={handleTaxDeductionClick}
					className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[11px] font-medium text-[var(--ink)] transition-colors"
					data-testid="btn-tax-deduction-summary"
					title="Сформировать комплект документов для налогового вычета по лечению"
				>
					<FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Справка для налоговой</span>
				</button>
			</div>
		);
	},
);

HistoryFinancialSummary.displayName = "HistoryFinancialSummary";
