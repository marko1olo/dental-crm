import type { Appointment } from "@dental/shared";
import {
	CalendarCheck,
	CheckCircle2,
	PhoneCall,
	UserCheck,
} from "lucide-react";
import { type FC, useRef } from "react";
import { isAppointmentInChair } from "../../GridAppointmentCard";

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
			<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
				Сменить статус визита:
			</div>
			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					data-testid={`mobile-status-confirmed-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("confirmed")}
					className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-violet-500/15 border border-violet-500/40 text-violet-800 dark:text-violet-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
				>
					<PhoneCall size={14} />
					<span>Подтвержден</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-status-arrived-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("arrived")}
					className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
				>
					<UserCheck size={14} />
					<span>В холле</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-status-in-treatment-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("in_treatment")}
					className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all ${
						isAppointmentInChair(selectedMobileAppt.status)
							? "bg-[var(--teal,var(--brand-primary))] text-white border border-[var(--teal)] font-bold shadow-xs"
							: "bg-[var(--teal-soft)] border border-[var(--teal)]/40 text-[var(--teal-dark)]"
					}`}
				>
					<CalendarCheck size={14} />
					<span>В кресле</span>
				</button>
				<button
					type="button"
					data-testid={`mobile-status-completed-${selectedMobileAppt.id}`}
					onClick={() => handleStatusClick("completed")}
					className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-slate-500/15 border border-slate-500/40 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
				>
					<CheckCircle2 size={14} />
					<span>Завершен</span>
				</button>
			</div>
		</div>
	);
};
