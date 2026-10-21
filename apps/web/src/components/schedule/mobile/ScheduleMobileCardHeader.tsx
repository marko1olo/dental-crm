import React from "react";
import { ChevronRight as ChevronRightIcon } from "lucide-react";
import type { Appointment, Dashboard } from "@dental/shared";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import type { StatusTheme, TimelineItem } from "./scheduleMobileAgendaTypes";

export interface ScheduleMobileTimelineRowProps {
	item: TimelineItem;
	effectiveDateKey: string;
	selectedDoctorId: string | null;
	selectedChairId: string | null;
	dashboard: Dashboard;
	patientName: (patients: any[], id: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
	onSelectMobileAppt: (appt: Appointment) => void;
	onQuickStatusChange?: ((appointmentId: string, status: Appointment["status"]) => void) | undefined;
	onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
}

interface ScheduleMobileCardHeaderProps {
	pName: string;
	fullPatientName: string;
	toothBadge: string | null;
	statusTheme: StatusTheme;
}

export const ScheduleMobileCardHeader: React.FC<ScheduleMobileCardHeaderProps> = ({
	pName,
	fullPatientName,
	toothBadge,
	statusTheme,
}) => {
	return (
		<div className="schedule-mobile-card-header">
			<div className="schedule-mobile-patient-group">
				<span className="schedule-mobile-patient-name" title={fullPatientName}>
					{pName}
				</span>
				{toothBadge && (
					<span className="schedule-mobile-tooth-badge">
						{toothBadge}
					</span>
				)}
			</div>
			<div className="schedule-mobile-header-end">
				<span className={`schedule-mobile-status-badge ${statusTheme.badgeBg}`}>
					{statusTheme.label}
				</span>
				<ChevronRightIcon size={18} className="text-[var(--muted,#64748b)] shrink-0" />
			</div>
		</div>
	);
};
