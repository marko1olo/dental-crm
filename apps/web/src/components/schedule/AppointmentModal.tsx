import React from "react";
import { QuickBookingDrawer } from "./QuickBookingDrawer";
import type { Appointment, Dashboard } from "@dental/shared";
export {
  QUICK_APPOINTMENT_REASONS,
  TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
} from "./scheduleCatalogData";

export function resolveChairDutyDoctor(
  chairId: string | null | undefined,
  chairDoctorAssignments: Record<string, string> | undefined,
  defaultDoctorId: string | null | undefined,
): string | null {
  if (chairId && chairDoctorAssignments?.[chairId]) {
    return chairDoctorAssignments[chairId]!;
  }
  return defaultDoctorId ?? null;
}

export interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  dashboard?: Dashboard | null;
  patientName?: (patients: any[], id: string | null) => string;
  formatTime?: (iso: string) => string;
  toDateTimeLocalValue?: (iso: string) => string;
  fromDateTimeLocalValue?: (val: string) => string;
  appointmentLabels?: Record<string, string>;
  activeVisitLockedAppointmentStatuses?: Set<Appointment["status"]>;
  onSave?: (id: string, updates: any) => Promise<boolean | void>;
  onDelete?: (id: string) => Promise<boolean | void>;
  onCancel?: (id: string, reason?: string) => Promise<boolean | void>;
  onOpenVisit?: (appointment: Appointment) => void;
  [key: string]: any;
}

/**
 * AppointmentModal — Facade delegating strictly to the Canonical SSOT: QuickBookingDrawer.
 * Mandate 8e, 8k, 8n (0 blocking modals, 1-click booking, doctor autonomy).
 */
export function AppointmentModal(props: AppointmentModalProps) {
  const { isOpen, onClose, appointment, dashboard } = props;
  if (!isOpen) return null;

  return (
    <div data-testid="appointment-modal" className="contents">
      <QuickBookingDrawer
        isOpen={isOpen}
        onClose={onClose}
        editingAppointment={appointment ?? null}
        dashboard={dashboard as any}
        toDateTimeLocalValue={props.toDateTimeLocalValue}
        fromDateTimeLocalValue={props.fromDateTimeLocalValue}
        chairDoctorAssignments={props.chairDoctorAssignments}
      />
    </div>
  );
}

export default AppointmentModal;
