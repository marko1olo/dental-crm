import { AlertTriangle, Calendar } from "lucide-react";
import React from "react";

export interface AppointmentModalLabCollisionAlertProps {
	dueDayMonthRu: string;
	setStartsAtLocal?: ((val: string) => void) | undefined;
	setEndsAtLocal?: ((val: string) => void) | undefined;
	onSyncDate: () => void;
}

export function AppointmentModalLabCollisionAlert({
	dueDayMonthRu,
	setStartsAtLocal,
	setEndsAtLocal,
	onSyncDate,
}: AppointmentModalLabCollisionAlertProps) {
	return (
		<div
			className="w-full p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 text-xs flex-wrap"
			data-testid="appointment-modal-lab-collision-alert"
		>
			<div className="flex items-center gap-2 min-w-0">
				<AlertTriangle
					size={14}
					className="text-amber-600 dark:text-amber-400 shrink-0"
				/>
				<span
					className="font-semibold"
					data-testid="appointment-lab-collision-warning-text"
				>
					{`Внимание: плановая готовность работы ЗТЛ ${dueDayMonthRu}, выбранная дата раньше`}
				</span>
			</div>
			{setStartsAtLocal && setEndsAtLocal && (
				<button
					type="button"
					onClick={onSyncDate}
					className="secondary-button h-6 sm:h-6 pointer-coarse:min-h-[44px] px-2 rounded-md bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line-strong)] text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs transition-all active:scale-95"
					data-testid="appointment-modal-sync-lab-date-banner-btn"
					title="Синхронизировать дату приёма с готовностью ЗТЛ в 1 клик"
				>
					<Calendar size={11} className="text-[var(--teal)] shrink-0" />
					<span>Синхронизировать дату</span>
				</button>
			)}
		</div>
	);
}
