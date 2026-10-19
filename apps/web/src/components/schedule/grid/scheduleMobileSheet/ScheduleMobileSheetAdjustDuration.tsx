import type { Appointment } from "@dental/shared";
import { Clock, FastForward, UserMinus } from "lucide-react";
import type React from "react";

export interface ScheduleMobileSheetAdjustDurationProps {
	selectedMobileAppt: Appointment;
	handleAdjustAppointmentDuration: (appt: Appointment, delta: number) => void;
	handleShiftAppointmentLateness: (appt: Appointment, shift: number) => void;
	handleFreeSlotToWaitlist: (appt: Appointment) => void;
}

export const ScheduleMobileSheetAdjustDuration: React.FC<
	ScheduleMobileSheetAdjustDurationProps
> = ({
	selectedMobileAppt,
	handleAdjustAppointmentDuration,
	handleShiftAppointmentLateness,
	handleFreeSlotToWaitlist,
}) => {
	return (
		<div className="space-y-2 pt-2 border-t border-[var(--line)]">
			<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
				Длительность приема:
			</div>
			<div className="grid grid-cols-3 gap-2">
				<button
					type="button"
					data-testid={`mobile-duration-plus-15-${selectedMobileAppt.id}`}
					onClick={() =>
						handleAdjustAppointmentDuration(selectedMobileAppt, 15)
					}
					className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
					title="+15 минут"
				>
					<Clock size={13} className="text-[var(--teal)] shrink-0" />
					<span>+15 мин</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-duration-plus-30-${selectedMobileAppt.id}`}
					onClick={() =>
						handleAdjustAppointmentDuration(selectedMobileAppt, 30)
					}
					className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
					title="+30 минут"
				>
					<Clock size={13} className="text-[var(--teal)] shrink-0" />
					<span>+30 мин</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-duration-minus-15-${selectedMobileAppt.id}`}
					onClick={() =>
						handleAdjustAppointmentDuration(selectedMobileAppt, -15)
					}
					className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--paper)] transition-colors"
					title="-15 минут"
				>
					<Clock size={13} className="text-[var(--teal)] shrink-0" />
					<span>-15 мин</span>
				</button>
			</div>
			<div className="grid grid-cols-2 gap-2 pt-1">
				<button
					type="button"
					data-testid={`mobile-shift-late-15-${selectedMobileAppt.id}`}
					onClick={() => handleShiftAppointmentLateness(selectedMobileAppt, 15)}
					className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-500/25 transition-colors"
					title="Сдвинуть на +15 мин при опоздании"
				>
					<FastForward
						size={14}
						className="text-amber-600 dark:text-amber-400 shrink-0"
					/>
					<span>Сдвиг +15 мин</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-free-slot-waitlist-${selectedMobileAppt.id}`}
					onClick={() => handleFreeSlotToWaitlist(selectedMobileAppt)}
					className="min-h-[44px] px-2 rounded-xl text-xs font-bold bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 flex items-center justify-center gap-1 cursor-pointer hover:bg-rose-500/25 transition-colors"
					title="Освободить слот -> в лист ожидания"
				>
					<UserMinus
						size={14}
						className="text-rose-600 dark:text-rose-400 shrink-0"
					/>
					<span>В лист ожидания</span>
				</button>
			</div>
		</div>
	);
};
