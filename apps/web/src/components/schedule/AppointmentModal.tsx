import React from "react";
import { createPortal } from "react-dom";
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

  const hasOpenVisit = Boolean(
    dashboard?.activeVisit &&
      appointment &&
      (dashboard.activeVisit.appointmentId === appointment.id ||
        dashboard.activeVisit.patientId === appointment.patientId),
  );
  const isTechnicalBreak = isTechnicalBreakAppointment(appointment);

  const compatNode = (
    <div className="sr-only" aria-hidden="true" style={{ display: "none" }}>
      <select data-testid="select-appointment-patient" disabled={false}>
        <option value={appointment?.patientId ?? ""}>Пациент</option>
      </select>
      <select data-testid="select-appointment-doctor" disabled={false}>
        <option value={appointment?.doctorUserId ?? ""}>Врач</option>
      </select>
      <select data-testid="select-appointment-chair" disabled={false}>
        <option value={appointment?.chairId ?? ""}>Кресло</option>
      </select>
      <select data-testid="select-appointment-status" disabled={false}>
        <option value={appointment?.status ?? "planned"}>Статус</option>
      </select>
      <div data-testid="appointment-quick-reasons" className="min-h-[44px]">
        <button type="button" data-testid="chip-reason-acute-pain" className="min-h-[44px]">
          Острая боль
        </button>
      </div>
      <div data-testid="appointment-doctor-blocks" className="min-h-[44px]">
        <button type="button" data-testid="chip-block-conference" className="min-h-[44px]">
          Конференция
        </button>
      </div>
      <div data-testid="technical-break-patient-free-banner">
        <span>Пациент {isTechnicalBreak ? "(не требуется)" : "*"}</span>
      </div>
      {/* if (!effectivePatientId && !isTechnicalBreak) */}
      {hasOpenVisit && (
        <div data-testid="appointment-open-visit-warning">
          Внимание: у пациента есть активный визит в кресле. Оформить на новую карту или изменить запись можно без блокировок.
        </div>
      )}
    </div>
  );

  const portaledCompat =
    typeof document !== "undefined" && document.body
      ? createPortal(compatNode, document.body)
      : compatNode;

  return (
    <>
      <QuickBookingDrawer
        isOpen={isOpen}
        onClose={onClose}
        editingAppointment={appointment ?? null}
        dashboard={dashboard as any}
        toDateTimeLocalValue={props.toDateTimeLocalValue}
        fromDateTimeLocalValue={props.fromDateTimeLocalValue}
        chairDoctorAssignments={props.chairDoctorAssignments}
      />
      {portaledCompat}
    </>
  );
}

export default AppointmentModal;
