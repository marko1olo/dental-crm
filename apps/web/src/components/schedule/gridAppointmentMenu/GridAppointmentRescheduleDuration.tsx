import React from "react";
import { Clock, FastForward } from "lucide-react";
import type { Appointment } from "@dental/shared";
import { showRollbackToast } from "../../GlobalToast";

interface Props {
	appointment: Appointment;
	onCloseMenu: () => void;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
}

export const GridAppointmentRescheduleDuration: React.FC<Props> = ({
	appointment: a,
	onCloseMenu,
	onAdjustDuration,
	onShiftLateness,
}) => {
	const handleAdjust = (delta: number) => {
		onAdjustDuration(a, delta);
		onCloseMenu();
		showRollbackToast(`Длительность изменена на ${delta > 0 ? "+" : ""}${delta} мин`, () => {
			onAdjustDuration(a, -delta);
		}, 5000, "Вернуть");
	};

	const handleLateness = (delta: number) => {
		onShiftLateness(a, delta);
		onCloseMenu();
		showRollbackToast(`Время визита сдвинуто на +${delta} мин (опоздание)`, () => {
			onShiftLateness(a, -delta);
		}, 5000, "Вернуть");
	};

	return (
		<>
			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
					Длительность
				</div>
				<div className="grid grid-cols-3 gap-1 px-1">
					{[
						{ delta: 15, label: "+15 мин", testId: `menu-duration-plus-15-${a.id}` },
						{ delta: 30, label: "+30 мин", testId: `menu-duration-plus-30-${a.id}` },
						{ delta: -15, label: "-15 мин", testId: `menu-duration-minus-15-${a.id}` },
					].map((item) => (
						<button
							key={item.label}
							type="button"
							data-testid={item.testId}
							onClick={() => handleAdjust(item.delta)}
							className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
							title={item.label}
						>
							<Clock size={12} className="text-[var(--teal)] shrink-0" />
							<span>{item.label}</span>
						</button>
					))}
				</div>
			</div>
			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
					Опоздание
				</div>
				<button
					type="button"
					data-testid={`menu-shift-late-15-${a.id}`}
					onClick={() => handleLateness(15)}
					className="w-full text-left min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 font-bold transition-colors cursor-pointer"
					title="Сдвинуть на +15 мин (опоздание)"
				>
					<FastForward size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Сдвинуть на +15 мин (опоздание)</span>
				</button>
			</div>
		</>
	);
};
