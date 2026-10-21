import { FlaskConical } from "lucide-react";
import React from "react";

export interface AppointmentModalLabEmptyProps {
	onNavigateToLab: () => void;
}

export function AppointmentModalLabEmpty({
	onNavigateToLab,
}: AppointmentModalLabEmptyProps) {
	return (
		<div
			className="sm:col-span-2 py-2 px-3 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--paper-soft)]/40 flex items-center justify-between gap-2 text-xs text-[var(--muted)] shadow-2xs"
			data-testid="appointment-modal-lab-empty"
		>
			<div className="flex items-center gap-2 min-w-0">
				<FlaskConical size={13} className="text-[var(--muted)] shrink-0" />
				<span className="truncate">Лаборатория (ЗТЛ): наряд не прикреплен</span>
			</div>
			<button
				type="button"
				onClick={onNavigateToLab}
				className="h-7 min-h-[28px] px-2.5 rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] text-xs font-bold text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white inline-flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
				data-testid="appointment-modal-create-lab-order-btn"
				title="Перейти в реестр лаборатории для оформления наряда"
			>
				<FlaskConical size={12} />
				<span>+ Оформить наряд в ЗТЛ</span>
			</button>
		</div>
	);
}
