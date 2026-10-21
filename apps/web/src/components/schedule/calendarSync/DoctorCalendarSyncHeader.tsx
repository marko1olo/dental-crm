import { Calendar, X } from "lucide-react";
import React from "react";

export interface DoctorCalendarSyncHeaderProps {
	onClose: () => void;
}

export function DoctorCalendarSyncHeader({
	onClose,
}: DoctorCalendarSyncHeaderProps) {
	return (
		<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
					<Calendar className="w-5 h-5" aria-hidden="true" />
				</div>
				<div>
					<h2
						id="calendar-sync-modal-title"
						className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] leading-tight"
					>
						Синхронизация расписания (iCal / CalDAV)
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
						Яндекс Календарь • Apple Calendar (iPhone/Mac) • Google Календарь
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-transparent hover:border-[var(--line,#e2e8f0)] transition-all cursor-pointer"
				aria-label="Закрыть окно"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	);
}
