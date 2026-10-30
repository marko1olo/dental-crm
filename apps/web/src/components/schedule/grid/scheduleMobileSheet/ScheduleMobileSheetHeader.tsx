import type { Appointment } from "@dental/shared";
import { X } from "lucide-react";
import React from "react";
import {
	getNormalizedAppointmentStatusLabel,
	isAppointmentInChair,
} from "../../GridAppointmentCard";

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
			<div className="w-[36px] h-[5px] bg-[var(--line-strong,var(--line))] rounded-full mx-auto mb-2 shrink-0" aria-hidden="true" />
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
							className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1 ${
								inChair
									? "bg-[var(--teal,var(--brand-primary))] text-white"
									: selectedMobileAppt.status === "arrived"
										? "bg-amber-500 text-white"
										: selectedMobileAppt.status === "confirmed"
											? "bg-emerald-600 text-white"
											: selectedMobileAppt.status === "completed"
												? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
												: "bg-[var(--paper-soft)] text-[var(--ink)]"
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
