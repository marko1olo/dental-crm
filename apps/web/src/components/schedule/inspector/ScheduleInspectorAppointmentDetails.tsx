import React from "react";
import type { Appointment, Dashboard, Patient, StaffMember } from "@dental/shared";
import {
  isAppointmentCito,
  resolvePatientBalance,
  getPatientAllergyAlert,
  extractTeethList,
  getNormalizedAppointmentStatusLabel,
  sanitizeScheduleCardText,
} from "../appointmentCardHelpers";
import { ScheduleInspectorHeaderAndChair } from "./ScheduleInspectorHeaderAndChair";
import { ScheduleInspectorPatientCard } from "./ScheduleInspectorPatientCard";
import { ScheduleInspectorProcedureCard } from "./ScheduleInspectorProcedureCard";
import { ScheduleInspectorActionsAndFooter } from "./ScheduleInspectorActionsAndFooter";
import { useScheduleInspectorState } from "./useScheduleInspectorState";

export interface ScheduleInspectorAppointmentDetailsProps {
  appointment: Appointment;
  onDeselect: () => void;
  dashboard?: Dashboard | null;
  patientLookupMap: Map<string, Patient>;
  staffLookupMap: Map<string, StaffMember>;
  toDateTimeLocalValue: (iso: string, tz?: string | null) => string;
  timezone?: string;
  appointmentLabels?: Record<string, string>;
  onQuickStatusChange?: (id: string, status: Appointment["status"]) => Promise<void> | void;
  onOpenVisit?: (appointment: Appointment) => void;
  onEditAppointment?: (appointment: Appointment) => void;
}

export const ScheduleInspectorAppointmentDetails: React.FC<ScheduleInspectorAppointmentDetailsProps> = ({
  appointment: a,
  onDeselect,
  dashboard,
  patientLookupMap,
  staffLookupMap,
  toDateTimeLocalValue,
  timezone = "Europe/Moscow",
  appointmentLabels,
  onQuickStatusChange,
  onOpenVisit,
  onEditAppointment,
}) => {
  const {
    patObj,
    pName,
    pPhone,
    aStart,
    aEnd,
    durationMin,
    docTheme,
    docName,
    chairName,
    patientAgeLabel,
    isCopiedPhone,
    handleOpenVisitClick,
    handleOpenPatientCard,
    handleCopyPhone,
    handleWhatsApp,
  } = useScheduleInspectorState(a, patientLookupMap, staffLookupMap, dashboard, timezone, toDateTimeLocalValue, onOpenVisit);

  const procedureLabel = sanitizeScheduleCardText(a.reason || (a as any).serviceTitle || "Приём") || "Консультация и осмотр";
  const cleanComment = sanitizeScheduleCardText(a.comment);

  return (
    <div className="schedule-inspector-appointment flex flex-col gap-3 text-xs select-none" data-testid="schedule-inspector-appointment" data-appointment-id={a.id}>
      <ScheduleInspectorHeaderAndChair aStart={aStart} aEnd={aEnd} durationMin={durationMin} isCito={isAppointmentCito(a)} chairName={chairName} docName={docName} docTheme={docTheme} onDeselect={onDeselect} />
      <ScheduleInspectorPatientCard
        pName={pName}
        patientAgeLabel={patientAgeLabel}
        patObj={patObj}
        pPhone={pPhone}
        isCopiedPhone={isCopiedPhone}
        pBalance={resolvePatientBalance(patObj)}
        pAllergyAlert={getPatientAllergyAlert(patObj, a?.reason)}
        onOpenPatientCard={handleOpenPatientCard}
        onCopyPhone={handleCopyPhone}
        onWhatsApp={handleWhatsApp}
      />
      <ScheduleInspectorProcedureCard procedureLabel={procedureLabel} cleanComment={cleanComment} teethList={extractTeethList(a)} />
      <ScheduleInspectorActionsAndFooter
        appointmentId={a.id}
        status={a.status}
        createdAt={a.createdAt}
        normalizedStatus={getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}
        onQuickStatusChange={onQuickStatusChange}
        onOpenVisitClick={handleOpenVisitClick}
        onEditAppointment={onEditAppointment ? () => onEditAppointment(a) : undefined}
      />
    </div>
  );
};
