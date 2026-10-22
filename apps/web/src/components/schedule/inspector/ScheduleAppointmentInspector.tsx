import React from "react";
import type { Appointment, Dashboard, Patient, StaffMember } from "@dental/shared";
import { ScheduleMiniMonthCalendar } from "./ScheduleMiniMonthCalendar";
import { ScheduleInspectorAppointmentDetails } from "./ScheduleInspectorAppointmentDetails";
import { ScheduleInspectorEmptyState } from "./ScheduleInspectorEmptyState";

export interface ScheduleAppointmentInspectorProps {
  selectedAppointment: Appointment | null;
  onDeselect: () => void;
  dashboard?: Dashboard | null;
  appointments?: Appointment[];
  dateKey: string;
  onDateChange: (newDateKey: string) => void;
  patientLookupMap: Map<string, Patient>;
  staffLookupMap: Map<string, StaffMember>;
  toDateTimeLocalValue: (iso: string, tz?: string | null) => string;
  timezone?: string;
  appointmentLabels?: Record<string, string>;
  onQuickStatusChange?: (id: string, status: Appointment["status"]) => Promise<void> | void;
  onOpenVisit?: (appointment: Appointment) => void;
  onEditAppointment?: (appointment: Appointment) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

/**
 * ScheduleAppointmentInspector — StomX Parity Right Inspector Panel.
 * Provides instant 0-click right sidebar inspection of appointments:
 * - Mini month calendar with date jumps and busy-day dots.
 * - When appointment selected: Patient FIO, age, phone with call/WhatsApp, balance, doctor, time, 1-click status change, open visit.
 * - When no appointment selected: Today's queue board & clinic statistics.
 * ZERO modal barriers, 100% reactive.
 */
export const ScheduleAppointmentInspector: React.FC<ScheduleAppointmentInspectorProps> = ({
  selectedAppointment,
  onDeselect,
  dashboard,
  appointments = [],
  dateKey,
  onDateChange,
  patientLookupMap,
  staffLookupMap,
  toDateTimeLocalValue,
  timezone = "Europe/Moscow",
  appointmentLabels,
  onQuickStatusChange,
  onOpenVisit,
  onEditAppointment,
  onSelectAppointment,
  isOpen = true,
  onToggleOpen,
}) => {
  if (!isOpen) return null;

  return (
    <aside
      className="schedule-right-inspector w-[310px] min-w-[280px] max-w-[340px] shrink-0 border-l border-[var(--line)] bg-[var(--paper)] p-3 flex flex-col gap-3 overflow-y-auto select-none rounded-r-2xl shadow-xs transition-all"
      style={{ maxHeight: "calc(100vh - 156px)" }}
      data-testid="schedule-right-inspector"
      aria-label="Инспектор выбранной записи"
    >
      {/* 1. Mini Month Calendar for instant date navigation */}
      <ScheduleMiniMonthCalendar
        selectedDate={dateKey}
        appointments={appointments}
        onSelectDate={onDateChange}
      />

      {/* 2. Main Content: Details or Empty State */}
      {selectedAppointment ? (
        <ScheduleInspectorAppointmentDetails
          appointment={selectedAppointment}
          onDeselect={onDeselect}
          dashboard={dashboard}
          patientLookupMap={patientLookupMap}
          staffLookupMap={staffLookupMap}
          toDateTimeLocalValue={toDateTimeLocalValue}
          timezone={timezone}
          appointmentLabels={appointmentLabels}
          onQuickStatusChange={onQuickStatusChange}
          onOpenVisit={onOpenVisit}
          onEditAppointment={onEditAppointment}
        />
      ) : (
        <ScheduleInspectorEmptyState
          appointments={appointments}
          dateKey={dateKey}
          patientLookupMap={patientLookupMap}
          staffLookupMap={staffLookupMap}
          toDateTimeLocalValue={toDateTimeLocalValue}
          timezone={timezone}
          appointmentLabels={appointmentLabels}
          onSelectAppointment={onSelectAppointment}
        />
      )}
    </aside>
  );
};

export default ScheduleAppointmentInspector;
