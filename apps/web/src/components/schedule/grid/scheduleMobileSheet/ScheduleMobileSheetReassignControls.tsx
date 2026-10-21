import type { Appointment } from "@dental/shared";
import type React from "react";
import { formatDoctorShortName } from "../../GridAppointmentCard";

export interface MobileChairItem {
	id: string;
	name: string;
	color?: string | null | undefined;
}

export interface MobileDoctorItem {
	id: string;
	fullName: string;
}

export interface ScheduleMobileSheetReassignControlsProps {
	selectedMobileAppt: Appointment;
	effectiveChairs: Array<MobileChairItem>;
	doctors: Array<MobileDoctorItem>;
	handleReassignAppointmentChair: (
		appt: Appointment,
		chairId: string | null,
	) => void;
	handleReassignAppointmentDoctor: (
		appt: Appointment,
		doctorUserId: string,
	) => void;
}

export const ScheduleMobileSheetReassignControls: React.FC<
	ScheduleMobileSheetReassignControlsProps
> = ({
	selectedMobileAppt,
	effectiveChairs,
	doctors,
	handleReassignAppointmentChair,
	handleReassignAppointmentDoctor,
}) => {
	return (
		<>
			{effectiveChairs.length > 1 && (
				<div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
					<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
						Сменить кресло:
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						{effectiveChairs.map((ch) => (
							<button
								key={ch.id}
								type="button"
								data-testid={`mobile-reassign-chair-${selectedMobileAppt.id}-${ch.id}`}
								onClick={() =>
									handleReassignAppointmentChair(selectedMobileAppt, ch.id)
								}
								className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${selectedMobileAppt.chairId === ch.id ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs" : "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}
							>
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{
										backgroundColor: ch.color || "var(--teal, #0d9488)",
									}}
								/>
								<span>{ch.name}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{doctors.length > 1 && (
				<div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
					<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
						Сменить врача:
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						{doctors.map((doc) => (
							<button
								key={doc.id}
								type="button"
								data-testid={`mobile-reassign-doctor-${selectedMobileAppt.id}-${doc.id}`}
								onClick={() =>
									handleReassignAppointmentDoctor(selectedMobileAppt, doc.id)
								}
								className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${selectedMobileAppt.doctorUserId === doc.id ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs" : "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"}`}
							>
								<span>{formatDoctorShortName(doc.fullName)}</span>
							</button>
						))}
					</div>
				</div>
			)}
		</>
	);
};
