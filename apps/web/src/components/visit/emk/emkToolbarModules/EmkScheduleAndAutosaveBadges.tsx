import React from "react";
import { Calendar, Check, Clock } from "lucide-react";

export interface EmkScheduleAndAutosaveBadgesProps {
	specialtyFocusNode?: React.ReactNode;
	handleSchedule: () => void;
	hasUnsavedChanges?: boolean;
}

export function EmkScheduleAndAutosaveBadges({
	specialtyFocusNode,
	handleSchedule,
	hasUnsavedChanges = false,
}: EmkScheduleAndAutosaveBadgesProps) {
	return (
		<div className="flex items-center gap-1.5 shrink-0 ml-auto">
			{specialtyFocusNode && (
				<div className="flex items-center shrink-0" data-testid="emk-specialty-focus-chip">
					{specialtyFocusNode}
				</div>
			)}
			<button
				type="button"
				onClick={handleSchedule}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
				data-testid="btn-schedule-next-stage"
				title="Записать пациента на следующий этап через 5 дней"
			>
				<Calendar size={13} className="shrink-0 text-blue-500" />
				<span className="hidden sm:inline">След. визит</span>
				<span className="sm:hidden">+5д</span>
			</button>
			<span
				data-testid="emk-autosave-status-badge"
				className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--muted)] font-medium"
				title={hasUnsavedChanges ? "В черновике есть изменения (автосохранение активно)" : "Все изменения сохранены"}
			>
				{hasUnsavedChanges ? (
					<>
						<Clock size={12} className="text-[var(--muted)] shrink-0 opacity-70" />
						<span>Автосохранение</span>
					</>
				) : (
					<>
						<Check size={13} className="text-emerald-500 shrink-0" />
						<span>Сохранено</span>
					</>
				)}
			</span>
		</div>
	);
}
