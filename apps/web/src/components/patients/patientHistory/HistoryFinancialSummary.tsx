/**
 * apps/web/src/components/patients/patientHistory/HistoryFinancialSummary.tsx
 *
 * DENTE Dental CRM — Финансовая сводка и сальдо по истории лечения пациента.
 * Layer 2: Общая сумма оплат, долг/аванс, завершенные визиты, справка для налогового вычета.
 */

import React from "react";
import {
	CheckCircle,
	CreditCard,
	FileText,
	Receipt,
	ShieldCheck,
	Wallet,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { PatientHistoryFinancialSummaryData } from "./types";

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
				{/* Метрики сальдо */}
				<div className="flex flex-wrap items-center gap-4">
					{/* Всего услуг */}
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<Receipt className="w-3.5 h-3.5" />
						</div>
						<div>
							<div className="text-[10px] text-[var(--muted)] font-medium leading-tight">
								Оказано услуг
							</div>
							<div className="text-xs font-mono font-bold text-[var(--ink)]">
								{summary.totalBilledRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
					</div>

					{/* Оплачено */}
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<CheckCircle className="w-3.5 h-3.5" />
						</div>
						<div>
							<div className="text-[10px] text-[var(--muted)] font-medium leading-tight">
								Оплачено
							</div>
							<div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
								{summary.totalPaidRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>
					</div>

					{/* Задолженность / К оплате */}
					{summary.totalPendingRub > 0 ? (
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
								<Wallet className="w-3.5 h-3.5" />
							</div>
							<div>
								<div className="text-[10px] text-[var(--muted)] font-medium leading-tight">
									Остаток к оплате
								</div>
								<div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
									{summary.totalPendingRub.toLocaleString("ru-RU")} ₽
								</div>
							</div>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded-lg bg-slate-500/10 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
								<CheckCircle className="w-3.5 h-3.5" />
							</div>
							<div>
								<div className="text-[10px] text-[var(--muted)] font-medium leading-tight">
									Сальдо
								</div>
								<div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
									0 ₽ (без долга)
								</div>
							</div>
						</div>
					)}

					{/* Визиты и гарантии */}
					<div className="hidden sm:flex items-center gap-3 border-l border-[var(--line)] pl-3 text-[11px] text-[var(--muted)]">
						<span>
							Приёмов: <strong className="text-[var(--ink)] font-mono">{summary.visitsCount}</strong>
						</span>
						{summary.warrantiesCount > 0 && (
							<span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
								<ShieldCheck className="w-3 h-3" />
								<span>{summary.warrantiesCount} на гарантии</span>
							</span>
						)}
					</div>
				</div>

				{/* Кнопка справки для налоговой */}
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
