import { useCallback, useMemo, useState } from "react";
import type { QuickBookingAppointmentType } from "./patientReliabilityScore";
import type { QuickBookingDrawerProps } from "./QuickBookingDrawerTypes";
import { useQuickBookingPatientSearch } from "./useQuickBookingPatientSearch";
import { useQuickBookingSlotSync } from "./useQuickBookingSlotSync";
import { useQuickBookingCollision } from "./useQuickBookingCollision";
import { useQuickBookingDraft } from "./useQuickBookingDraft";
import { useQuickBookingSubmit } from "./useQuickBookingSubmit";
import { useQuickBookingStaff } from "./useQuickBookingStaff";
import { useQuickBookingDateTime } from "./useQuickBookingDateTime";

export function useQuickBookingDrawerState(props: QuickBookingDrawerProps) {
  const {
    isOpen, onClose, initialSlot, editingAppointment: propEditingAppt, dashboard,
    onAppointmentCreated, onAppointmentUpdated, loadDashboard, setDashboard,
    toDateTimeLocalValue, fromDateTimeLocalValue, chairDoctorAssignments,
  } = props;

  const editingAppt = propEditingAppt || initialSlot?.editingAppointment || null;
  const editingAppointmentId = editingAppt?.id || initialSlot?.appointmentId || null;
  const isEditing = Boolean(editingAppointmentId);
  const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

  const { toLocal, fromLocal } = useQuickBookingDateTime(timezone, toDateTimeLocalValue, fromDateTimeLocalValue);
  const { staff, doctors, assistants, chairs, isSoloClinic } = useQuickBookingStaff(dashboard);

  const [appointmentType, setAppointmentType] = useState<QuickBookingAppointmentType>(() => {
    if (initialSlot?.isCitoEmergency || initialSlot?.reason?.includes("CITO") || initialSlot?.reason?.includes("Острая боль")) return "emergency";
    if (initialSlot?.reason?.includes("Первичн") || initialSlot?.reason?.includes("Консультация")) return "primary";
    return initialSlot?.reason ? "secondary" : "primary";
  });

  const initialMatchedPatient = useMemo(() => {
    const targetPatientId = editingAppt?.patientId || initialSlot?.patientId;
    if (targetPatientId && dashboard?.patients) return dashboard.patients.find((p) => p.id === targetPatientId) || null;
    if (initialSlot?.patientName && dashboard?.patients) {
      const candidate = initialSlot.patientName.trim().toLowerCase();
      return dashboard.patients.find((p) => p.status === "active" && p.fullName.toLowerCase() === candidate) || null;
    }
    return null;
  }, [editingAppt?.patientId, initialSlot?.patientId, initialSlot?.patientName, dashboard?.patients]);

  const patientSearch = useQuickBookingPatientSearch({ dashboard, initialSlot, initialMatchedPatient, setDashboard, isOpen });
  const slotSync = useQuickBookingSlotSync({ isOpen, initialSlot, editingAppt, doctors, chairs, chairDoctorAssignments, isSoloClinic, toLocal });

  const collision = useQuickBookingCollision({
    startsAtLocal: slotSync.startsAtLocal, durationMinutes: slotSync.durationMinutes, doctorUserId: slotSync.doctorUserId,
    chairId: slotSync.chairId, assistantUserId: slotSync.assistantUserId, patientId: patientSearch.patientId,
    appointmentType, reason: slotSync.reason, editingAppointmentId, dashboard, fromLocal, toLocal,
  });

  const draft = useQuickBookingDraft({
    comment: slotSync.comment, reason: slotSync.reason, initialSlot, patientSearch, appointmentType,
    doctorUserId: slotSync.doctorUserId, assistantUserId: slotSync.assistantUserId, chairId: slotSync.chairId,
    startsAtLocal: slotSync.startsAtLocal, durationMinutes: slotSync.durationMinutes, onClose,
  });

  const submit = useQuickBookingSubmit({
    patientSearch, appointmentType, doctorUserId: slotSync.doctorUserId, dutyDoctorId: slotSync.dutyDoctorId,
    doctors, dutyDoc: slotSync.dutyDoc, chairId: slotSync.chairId, chairs, currentChair: slotSync.currentChair,
    assistantUserId: slotSync.assistantUserId, startsAtLocal: slotSync.startsAtLocal, durationMinutes: slotSync.durationMinutes,
    reason: slotSync.reason, comment: slotSync.comment, status: slotSync.status, isSoloClinic, collision,
    setSlotConflict: slotSync.setSlotConflict, setSubmitError: slotSync.setSubmitError, initialSlot, isEditing,
    editingAppointmentId, dashboard, setDashboard, loadDashboard, onAppointmentCreated, onAppointmentUpdated, onClose, fromLocal,
  });

  const handleSelectAppointmentType = useCallback((type: QuickBookingAppointmentType) => {
    setAppointmentType(type);
    if (type === "emergency") {
      slotSync.setDurationMinutes(30); slotSync.setStatus("confirmed");
      if (!slotSync.reason.includes("Срочно")) slotSync.setReason((p) => (p ? `Срочно! ${p}` : "Срочно! Острая боль"));
    } else if (type === "primary") {
      slotSync.setDurationMinutes(30);
      if (!slotSync.reason) slotSync.setReason("Первичный осмотр");
    } else if (type === "secondary") {
      slotSync.setDurationMinutes(60);
    }
  }, [slotSync]);

  return {
    timezone, toLocal, fromLocal, appointmentType, setAppointmentType, handleSelectAppointmentType,
    ...patientSearch, staff, doctors, assistants, chairs, isSoloClinic, ...slotSync,
    handleSelectDuration: slotSync.setDurationMinutes, collision, ...draft, isEditing,
    editingAppointment: editingAppt, ...submit,
  };
}

export type QuickBookingDrawerState = ReturnType<typeof useQuickBookingDrawerState>;
