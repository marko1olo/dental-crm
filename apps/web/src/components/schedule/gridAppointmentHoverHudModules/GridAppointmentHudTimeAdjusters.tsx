import type { Appointment } from "@dental/shared";
import { Clock, FastForward } from "lucide-react";

interface GridAppointmentHudTimeAdjustersProps {
	appointment: Appointment;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
}

export function GridAppointmentHudTimeAdjusters({
	appointment: a,
	onAdjustDuration,
	onShiftLateness,
}: GridAppointmentHudTimeAdjustersProps) {
	return (
		<div className="space-y-1.5 pt-1 border-t border-[var(--line)]">
			<span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
				Корректировка времени
			</span>
			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					data-testid={`hover-duration-plus-15-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onAdjustDuration(a, 15);
					}}
					className="flex-1 min-h-[30px] px-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer transition-all"
					title="Продлить приём на 15 минут"
				>
					<Clock className="w-3 h-3 text-[var(--teal,#0d9488)]" />
					<span>+15</span>
				</button>
				<button
					type="button"
					data-testid={`hover-duration-plus-30-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onAdjustDuration(a, 30);
					}}
					className="flex-1 min-h-[30px] px-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer transition-all"
					title="Продлить приём на 30 минут"
				>
					<Clock className="w-3 h-3 text-[var(--teal,#0d9488)]" />
					<span>+30</span>
				</button>
				<button
					type="button"
					data-testid={`hover-duration-minus-15-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onAdjustDuration(a, -15);
					}}
					className="flex-1 min-h-[30px] px-2 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer transition-all"
					title="Сократить приём на 15 минут"
				>
					<Clock className="w-3 h-3 text-[var(--muted)]" />
					<span>-15</span>
				</button>
				<button
					type="button"
					data-testid={`hover-shift-late-15-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onShiftLateness(a, 15);
					}}
					className="flex-1 min-h-[30px] px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-1 cursor-pointer transition-all"
					title="Пациент опаздывает: сдвинуть начало на 15 минут вперед"
				>
					<FastForward className="w-3 h-3 text-amber-600" />
					<span>Опаздывает</span>
				</button>
			</div>
		</div>
	);
}
