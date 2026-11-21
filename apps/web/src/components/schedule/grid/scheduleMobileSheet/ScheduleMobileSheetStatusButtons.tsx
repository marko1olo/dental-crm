import type { Appointment } from "@dental/shared";
import {
	CalendarCheck,
	CheckCircle2,
	Clock,
	PhoneCall,
	UserCheck,
} from "lucide-react";
import React, { type FC, useRef } from "react";
import { isAppointmentInChair } from "../../AppointmentGridCard";

export interface ScheduleMobileSheetStatusButtonsProps {
	selectedMobileAppt: Appointment;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
	onClose: () => void;
}

export const ScheduleMobileSheetStatusButtons: FC<
	ScheduleMobileSheetStatusButtonsProps
> = ({ selectedMobileAppt, onQuickStatusChange, onClose }) => {
	const inFlightRef = useRef(false);
	if (!onQuickStatusChange) return null;

	const handleStatusClick = (status: Appointment["status"]) => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			onQuickStatusChange(selectedMobileAppt.id, status);
			onClose();
		} finally {
			inFlightRef.current = false;
		}
	};

	return (
		<div className="space-y-2">
			<div className="font-medium text-[var(--ink-muted)] text-xs">
				Сменить статус визита:
			</div>
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					data-testid={`mobile-status-planned-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("planned")}
					className="min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
				>
					<Clock size={14} className="text-[var(--ink-muted)] shrink-0" />
					<span>Запланирован</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-status-confirmed-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("confirmed")}
					className="min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--primary-soft,var(--paper-soft))] border border-[var(--primary,var(--line))]/30 text-[var(--primary)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
				>
					<PhoneCall size={14} className="shrink-0" />
					<span>Подтвержден</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-status-arrived-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("arrived")}
					className="min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--warning-soft)] border border-[var(--warning-line,var(--line))] text-[var(--warning-ink)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
				>
					<UserCheck size={14} className="shrink-0" />
					<span>В клинике</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-status-in-treatment-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("in_treatment")}
					className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all ${
						isAppointmentInChair(selectedMobileAppt.status)
							? "bg-[var(--primary)] text-white border border-[var(--primary)] shadow-xs"
							: "bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-hover)]"
					}`}
				>
					<CalendarCheck size={14} className="shrink-0" />
					<span>В кресле</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-status-completed-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("completed")}
					className="col-span-2 min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--success-soft)] border border-[var(--success-line,var(--line))] text-[var(--success-ink)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
				>
					<CheckCircle2 size={14} className="shrink-0" />
					<span>Завершен</span>
				</button>
			</div>
		</div>
	);
};
