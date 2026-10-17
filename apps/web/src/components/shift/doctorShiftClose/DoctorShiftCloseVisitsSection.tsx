import React from "react";
import { AlertTriangle, Users } from "lucide-react";
import type { DoctorShiftStats } from "../controlBarModules/shiftControlBarTypes";

export interface DoctorShiftCloseVisitsSectionProps {
	readonly shiftStats: DoctorShiftStats;
	readonly emrSigned: number;
	readonly emrPending: number;
}

export const DoctorShiftCloseVisitsSection: React.FC<DoctorShiftCloseVisitsSectionProps> = ({
	shiftStats,
	emrSigned,
	emrPending,
}) => {
	const hasUnsignedEmr = emrPending > 0;

	return (
		<div className="space-y-3">
			{/* Unsigned cards alert if any */}
			{hasUnsignedEmr && (
				<div className="p-3 sm:p-3.5 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
					<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div>
						<span className="font-bold">Внимание:</span> Не подписано электронных
						карт 043/у: {emrPending}. Рекомендуется заверить карты ПЭП (63-ФЗ) до
						сдачи смены.
					</div>
				</div>
			)}

			{/* Metric: Patients reconciliation */}
			<div className="border border-[var(--line,#e2e8f0)] rounded-xl p-3 sm:p-3.5 bg-[var(--paper-soft,#f8fafc)]">
				<div className="flex items-center justify-between mb-2.5">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
						<Users className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" /> Прием пациентов
					</span>
					<span className="text-xs font-medium text-[var(--muted,#64748b)]">
						По плану: {shiftStats.totalAppointments}
					</span>
				</div>
				<div className="grid grid-cols-3 gap-2">
					<div className="p-2 sm:p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-center">
						<div className="text-base sm:text-lg font-bold text-[var(--teal,#0d9488)]">
							{shiftStats.completedCount}
						</div>
						<div className="text-[11px] text-[var(--muted,#64748b)]">Завершено</div>
					</div>
					<div className="p-2 sm:p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-center">
						<div className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">
							{shiftStats.inProgressCount}
						</div>
						<div className="text-[11px] text-[var(--muted,#64748b)]">В кресле</div>
					</div>
					<div className="p-2 sm:p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-center">
						<div className="text-base sm:text-lg font-bold text-[var(--ok-fg,#059669)]">
							{emrSigned}
						</div>
						<div className="text-[11px] text-[var(--muted,#64748b)]">Карт ПЭП</div>
					</div>
				</div>
			</div>
		</div>
	);
};
