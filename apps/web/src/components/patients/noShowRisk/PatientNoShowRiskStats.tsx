import React from "react";
import { getRiskClass, getRiskIcon, getRiskLabel } from "./patientNoShowTypes";

export interface PatientNoShowRiskStatsProps {
	readonly riskData: any;
}

export function PatientNoShowRiskStats({ riskData }: PatientNoShowRiskStatsProps) {
	if (!riskData) return null;
	const { history, riskLevel, factors, recommendedAction } = riskData;

	return (
		<div>
			{history && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] uppercase font-bold text-[var(--muted)]">Неявки</div>
						<div
							className={`text-base font-black ${
								history.noShows > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
							}`}
						>
							{history.noShows}
						</div>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] uppercase font-bold text-[var(--muted)]">Отмены</div>
						<div className="text-base font-black text-[var(--ink)]">{history.cancellations}</div>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] uppercase font-bold text-[var(--muted)]">Приёмов состоялось</div>
						<div className="text-base font-black text-emerald-600 dark:text-emerald-400">{history.attended}</div>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] uppercase font-bold text-[var(--muted)]">Посещаемость</div>
						<div className="text-base font-black text-[var(--teal,var(--brand-primary))]">
							{history.consideredAppointments > 0
								? `${Math.round((history.attended / history.consideredAppointments) * 100)}%`
								: "100%"}
						</div>
					</div>
				</div>
			)}

			<div className="flex justify-between items-center mb-3 p-3 rounded-lg border bg-[var(--paper-soft)] border-[var(--line)]">
				<div className="flex items-center gap-2">
					{getRiskIcon(riskLevel ?? "", history?.noShows ?? 0)}
					<span className={`text-sm font-semibold ${getRiskClass(riskLevel ?? "")}`}>
						{getRiskLabel(riskLevel ?? "", history?.noShows ?? 0)}
					</span>
				</div>
				<div className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)]">
					{history?.noShows && history.noShows > 0
						? `Зафиксировано неявок: ${history.noShows}`
						: "Без зафиксированных неявок"}
				</div>
			</div>

			{(factors ?? []).length > 0 && (
				<div className="mt-3">
					<span className="text-xs font-bold text-[var(--ink)]">Факторы надёжности расписания:</span>
					<ul className="mt-1 space-y-1 text-xs text-[var(--muted)] pl-4 list-disc">
						{(factors ?? []).map((factor: string) => (
							<li key={factor}>{factor}</li>
						))}
					</ul>
				</div>
			)}

			{recommendedAction && (
				<div className="mt-3 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-200">
					<strong>Рекомендуемое действие администратора:</strong> {recommendedAction}
				</div>
			)}
		</div>
	);
}
