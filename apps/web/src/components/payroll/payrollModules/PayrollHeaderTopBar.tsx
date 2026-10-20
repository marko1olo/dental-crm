import React from "react";
import { Calculator, X } from "lucide-react";

export interface PayrollHeaderTopBarProps {
	readonly clinicName: string;
	readonly taxRegime: "employee" | "self_employed";
	readonly isProgressiveTaxApplied?: boolean | undefined;
	readonly activeWorkspaceTab?: "payroll" | "timesheet" | undefined;
	readonly onSelectWorkspaceTab?: ((tab: "payroll" | "timesheet") => void) | undefined;
	readonly onClose: () => void;
}

export const PayrollHeaderTopBar: React.FC<PayrollHeaderTopBarProps> = ({
	clinicName,
	taxRegime,
	isProgressiveTaxApplied,
	activeWorkspaceTab = "payroll",
	onSelectWorkspaceTab,
	onClose,
}) => {
	const taxBadgeText =
		taxRegime === "self_employed"
			? "ИП / Самозанятый (НДФЛ 0%)"
			: isProgressiveTaxApplied
				? "Расчет зарплаты / Прогрессивный НДФЛ 13-15%"
				: "Расчет зарплаты / НДФЛ 13%";

	return (
		<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/30">
					<Calculator className="w-5 h-5" />
				</div>
				<div>
					<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
						Сдельная зарплата и расчетный листок
						<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
							{taxBadgeText}
						</span>
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)]">
						{clinicName} • Автоматический вычет материалов и зуботехнической лаборатории
					</p>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть окно"
					className="w-8 h-8 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
