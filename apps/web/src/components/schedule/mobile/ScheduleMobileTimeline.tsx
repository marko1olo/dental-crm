import React from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import type { TimelineItem } from "./scheduleMobileAgendaTypes";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { ScheduleMobileEmptyDay } from "./ScheduleMobileEmptyDay";
import { ScheduleMobileTimelineRow } from "./ScheduleMobileTimelineRow";

export interface ScheduleMobileTimelineProps {
  timelineItems: TimelineItem[];
  effectiveDateKey: string;
  selectedDoctorId: string | null;
  selectedChairId: string | null;
  dashboard: Dashboard;
  patientName: (patients: any[], id: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
  onSelectMobileAppt: (appt: Appointment) => void;
  onAddAppointment: () => void;
  onQuickStatusChange?: ((appointmentId: string, status: Appointment["status"]) => void) | undefined;
  onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
}

export const ScheduleMobileTimeline: React.FC<ScheduleMobileTimelineProps> = ({
  timelineItems,
  effectiveDateKey,
  selectedDoctorId,
  selectedChairId,
  dashboard,
  patientName,
  appointmentLabels,
  onSlotClick,
  onSelectMobileAppt,
  onAddAppointment,
  onQuickStatusChange,
  onOpenVisit,
}) => {
  return (
    <div className="schedule-mobile-timeline">
      {timelineItems.length === 0 ? (
        <ScheduleMobileEmptyDay onAddAppointment={onAddAppointment} />
      ) : (
        timelineItems.map((item, index) => (
          <ScheduleMobileTimelineRow
            key={item.type === "gap" ? `gap-${item.startsAt}-${index}` : item.appointment.id}
            item={item}
            effectiveDateKey={effectiveDateKey}
            selectedDoctorId={selectedDoctorId}
            selectedChairId={selectedChairId}
            dashboard={dashboard}
            patientName={patientName}
            appointmentLabels={appointmentLabels}
            onSlotClick={onSlotClick}
            onSelectMobileAppt={onSelectMobileAppt}
            onQuickStatusChange={onQuickStatusChange}
            onOpenVisit={onOpenVisit}
          />
        ))
      )}
    </div>
  );
};
