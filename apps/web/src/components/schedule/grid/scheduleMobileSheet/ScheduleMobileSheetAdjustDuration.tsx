import type { Appointment } from "@dental/shared";
import { Clock, FastForward, UserMinus } from "lucide-react";
import React from "react";

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
			<div className="font-semibold text-[var(--ink-muted)] text-xs">
				Длительность приёма
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
					className="min-h-[44px] px-2 rounded-xl text-xs font-semibold bg-[var(--warning-soft)] border border-[var(--warning-line)] text-[var(--warning-ink)] flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity"
					title="Сдвинуть на +15 мин при опоздании"
				>
					<FastForward
						size={14}
						className="text-[var(--warning-ink)] shrink-0"
					/>
					<span>Сдвиг +15 мин</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-free-slot-waitlist-${selectedMobileAppt.id}`}
					onClick={() => handleFreeSlotToWaitlist(selectedMobileAppt)}
					className="min-h-[44px] px-2 rounded-xl text-xs font-semibold bg-[var(--danger-soft)] border border-[var(--danger-line)] text-[var(--danger-ink)] flex items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity"
					title="Освободить слот -> в лист ожидания"
				>
					<UserMinus
						size={14}
						className="text-[var(--danger-ink)] shrink-0"
					/>
					<span>В лист ожидания</span>
				</button>
			</div>
		</div>
	);
};
