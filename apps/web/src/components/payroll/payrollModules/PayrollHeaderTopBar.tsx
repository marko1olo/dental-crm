import React from "react";
import { Calculator, X } from "lucide-react";

export interface PayrollHeaderTopBarProps {
	readonly clinicName: string;
	readonly taxRegime: "employee" | "self_employed";
	readonly isProgressiveTaxApplied?: boolean | undefined;
	readonly onClose: () => void;
}

export const PayrollHeaderTopBar: React.FC<PayrollHeaderTopBarProps> = ({
	clinicName,
	taxRegime,
	isProgressiveTaxApplied,
	onClose,
}) => {
	const taxBadgeText =
		taxRegime === "self_employed"
			? "ИП / Самозанятый (НДФЛ 0%)"
			: isProgressiveTaxApplied
				? "Расчет зарплаты / Прогрессивный НДФЛ 13-15%"
				: "Расчет зарплаты / НДФЛ 13%";

	return (
		<div className="p-3.5 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-start sm:items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
			<div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
				<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/30 shrink-0 mt-0.5 sm:mt-0">
					<Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
						<h2 className="text-sm sm:text-lg font-bold text-[var(--ink,#0f172a)] m-0 leading-snug">
							Сдельная зарплата и расчетный листок
						</h2>
						<span className="text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20 whitespace-nowrap">
							{taxBadgeText}
						</span>
					</div>
					<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] m-0 mt-0.5 truncate">
						{clinicName ? `${clinicName} • ` : ""}Автоматический вычет материалов и зуботехнической лаборатории
					</p>
				</div>
			</div>

			<div className="flex items-center shrink-0">
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть окно"
					className="w-8 h-8 rounded-lg border border-[var(--line,#e2e8f0)] bg-transparent hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-[var(--line)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
