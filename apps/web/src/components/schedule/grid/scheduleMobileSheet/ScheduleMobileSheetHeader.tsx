import type { Appointment } from "@dental/shared";
import { X } from "lucide-react";
import React from "react";
import {
	getNormalizedAppointmentStatusLabel,
	isAppointmentInChair,
} from "../../AppointmentGridCard";

export interface ScheduleMobileSheetHeaderProps {
	selectedMobileAppt: Appointment;
	mPatName: string;
	mStart: string;
	mEnd: string;
	appointmentLabels: Record<Appointment["status"], string>;
	onClose: () => void;
}

export const ScheduleMobileSheetHeader: React.FC<
	ScheduleMobileSheetHeaderProps
> = ({
	selectedMobileAppt,
	mPatName,
	mStart,
	mEnd,
	appointmentLabels,
	onClose,
}) => {
	const inChair = isAppointmentInChair(selectedMobileAppt.status);
	const statusLabel =
		selectedMobileAppt.status === "arrived"
			? "В холле"
			: getNormalizedAppointmentStatusLabel(
					selectedMobileAppt.status,
					appointmentLabels,
				);

	return (
		<>
			<div className="w-9 h-1.5 rounded-full bg-[var(--line)] mx-auto my-3 pointer-events-none shrink-0" aria-hidden="true" />
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
				<div className="min-w-0 flex-1">
					<div className="text-lg font-black text-[var(--ink)] truncate">
						{mPatName}
					</div>
					<div className="text-xs text-[var(--muted)] font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
						<span>
							{mStart} – {mEnd} · {selectedMobileAppt.reason || "Прием"}
						</span>
						<span
							className={`text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0 inline-flex items-center gap-1 ${
								inChair
									? "bg-[var(--primary)] text-white shadow-xs"
									: selectedMobileAppt.status === "arrived"
										? "bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)]"
										: selectedMobileAppt.status === "confirmed"
											? "bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)]"
											: selectedMobileAppt.status === "completed"
												? "bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)]"
												: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"
							}`}
						>
							{inChair && (
								<span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
							)}
							<span>{statusLabel}</span>
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
					aria-label="Закрыть"
				>
					<X size={18} />
				</button>
			</div>
		</>
	);
};
