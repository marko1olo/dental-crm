import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import type { QuickBookingAppointmentType } from "./patientReliabilityScore";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";

export interface UseQuickBookingCollisionParams {
  startsAtLocal: string;
  durationMinutes: number;
  doctorUserId: string;
  chairId: string;
  assistantUserId: string | null;
  patientId: string | null;
  appointmentType: QuickBookingAppointmentType;
  reason: string;
  editingAppointmentId: string | null;
  dashboard?: Dashboard | null | undefined;
  fromLocal: (local: string) => string;
  toLocal: (iso: string) => string;
}

export function useQuickBookingCollision({
  startsAtLocal,
  durationMinutes,
  doctorUserId,
  chairId,
  assistantUserId,
  patientId,
  appointmentType,
  reason,
  editingAppointmentId,
  dashboard,
  fromLocal,
  toLocal,
}: UseQuickBookingCollisionParams) {
  const collision = useMemo(() => {
    if (!startsAtLocal) {
      return {
        hasCollision: false,
        conflictType: null,
        conflictingAppointment: null,
        message: null,
        suggestedSlot: null,
      };
    }
    const startsAtIso = fromLocal(startsAtLocal);
    const startMs = Date.parse(startsAtIso);
    const endsAtIso = new Date(startMs + durationMinutes * 60_000).toISOString();

    return checkAppointmentResourceCollision(
      {
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        doctorUserId: doctorUserId || null,
        chairId: chairId || null,
        assistantUserId: assistantUserId || null,
        patientId: patientId || null,
        isCito: appointmentType === "emergency",
        reason,
      },
      dashboard?.appointments,
      {
        excludeAppointmentId: editingAppointmentId,
        staff: dashboard?.clinicSettings?.staff,
        chairs: dashboard?.clinicSettings?.chairs,
        patients: dashboard?.patients,
        formatTimeFn: (iso) => toLocal(iso).slice(11, 16),
        isCito: appointmentType === "emergency",
        allowCitoOverbooking: appointmentType === "emergency",
      },
    );
  }, [
    startsAtLocal,
    durationMinutes,
    doctorUserId,
    chairId,
    assistantUserId,
    patientId,
    appointmentType,
    editingAppointmentId,
    reason,
    fromLocal,
    toLocal,
    dashboard?.appointments,
    dashboard?.clinicSettings?.staff,
    dashboard?.clinicSettings?.chairs,
    dashboard?.patients,
  ]);

  return collision;
}
