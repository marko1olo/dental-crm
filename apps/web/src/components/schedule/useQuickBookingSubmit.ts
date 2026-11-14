import { useState, useRef } from "react";
import { generateUuidV7, type Appointment, type Dashboard } from "@dental/shared";
import { isTechnicalBreakAppointment } from "./scheduleCatalogData";
import { useScheduleStore } from "../../store/scheduleStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";
import { showToast } from "../GlobalToast";
import { safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import type { UseQuickBookingSubmitParams } from "./QuickBookingDrawerTypes";
import { executeCopyConfirmationFlow } from "./quickBookingConfirmationText";
import { resolveOrAutoCreateSubmitPatient } from "./quickBookingInlinePatient";
import { buildQuickBookingPayload, handleBookingError } from "./quickBookingSubmitPayload";

export function useQuickBookingSubmit(params: UseQuickBookingSubmitParams) {
  const {
    patientSearch, appointmentType, startsAtLocal, durationMinutes, collision,
    setSlotConflict, setSubmitError, isEditing, editingAppointmentId, dashboard,
    setDashboard, loadDashboard, onAppointmentCreated, onAppointmentUpdated,
    onClose, fromLocal,
  } = params;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRef = useRef(false);

  const handleSubmitBooking = async (e?: React.FormEvent, opts?: { overbookOverride?: boolean }) => {
    if (e) e.preventDefault();
    if (inFlightRef.current || isSubmitting) return;
    inFlightRef.current = true;

    try {
      const isTechBreak = isTechnicalBreakAppointment({ reason: params.reason, comment: params.comment });
      const activePatientId = isTechBreak ? null : await resolveOrAutoCreateSubmitPatient(patientSearch, appointmentType);
      const effectivePatientId = activePatientId;
      if (!effectivePatientId && !isTechBreak) {
        if (appointmentType !== "emergency") {
          const msg = "Укажите пациента из списка или начните вводить фамилию/телефон для быстрой записи";
          setSubmitError(msg);
          showToast(msg, "warning");
          if (patientSearch.showInlineNewPatient && patientSearch.newPatientFullNameInputRef?.current) {
            patientSearch.newPatientFullNameInputRef.current.focus();
          } else if (patientSearch.searchInputRef?.current) {
            patientSearch.searchInputRef.current.focus();
          }
          return;
        }
      }

      const startsAtIso = startsAtLocal ? fromLocal(startsAtLocal) : new Date(Math.ceil(Date.now() / 900000) * 900000).toISOString();
      const endsAtIso = new Date(Date.parse(startsAtIso) + durationMinutes * 60_000).toISOString();
      const isEmergency = appointmentType === "emergency";

      if (collision.hasCollision && !isEmergency && !opts?.overbookOverride) {
        const slotStr = collision.suggestedSlot ? collision.suggestedSlot.timeDisplay || collision.suggestedSlot.label : null;
        setSlotConflict({ message: collision.message, suggestedSlots: slotStr ? [slotStr] : [] });
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      const payload = buildQuickBookingPayload({
        params, activePatientId, startsAtIso, endsAtIso, isEmergency,
        overbookOverride: opts?.overbookOverride,
      });

      const url = isEditing ? `/api/appointments/${encodeURIComponent(editingAppointmentId!)}` : "/api/appointments";
      const mutationKey = (payload as { idempotencyKey?: string }).idempotencyKey || generateUuidV7();
      const res = await fetchWithHandling(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: denteAdminSecretRequestHeaders({
          "Content-Type": "application/json",
          "Idempotency-Key": mutationKey,
        }),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await handleBookingError(res, Boolean(isEditing), setSlotConflict, setSubmitError);
        return;
      }

      const result = (await res.json()) as { success?: boolean; appointment?: Appointment; dashboard?: Dashboard };
      const scheduleStore = useScheduleStore.getState();
      if (result?.appointment) {
        scheduleStore.upsertAppointment(result.appointment);
      }
      if (result?.dashboard) {
        scheduleStore.setDashboard(result.dashboard);
        if (typeof setDashboard === "function") setDashboard(result.dashboard);
      } else if (typeof loadDashboard === "function") {
        await loadDashboard();
      }

      const patientName = patientSearch.selectedPatient?.fullName || patientSearch.newPatientFullName.trim() || (isTechBreak ? "Технический перерыв" : "Пациент");
      if (isEditing) {
        showToast(`Запись для «${patientName}» обновлена!`, "success", 4000);
        const updatedAppt =
          result?.appointment ||
          ({
            id: editingAppointmentId!,
            organizationId: dashboard?.clinicSettings?.profile?.organizationId || "",
            patientId: payload.patientId,
            doctorUserId: payload.doctorUserId,
            chairId: payload.chairId,
            startsAt: startsAtIso,
            endsAt: endsAtIso,
            status: payload.status,
            reason: payload.reason,
            comment: payload.comment,
          } as Appointment);
        if (typeof onAppointmentUpdated === "function") onAppointmentUpdated(updatedAppt);
      } else {
        showToast(`Запись для «${patientName}» создана на ${startsAtLocal.slice(11, 16)}!`, "success", 5000);
        const createdAppt =
          result?.appointment ||
          result?.dashboard?.appointments?.find((a) => (a.patientId === activePatientId || a.patientId === patientSearch.patientId) && a.startsAt === startsAtIso) ||
          ({
            id: `appt-${Date.now()}`,
            organizationId: dashboard?.clinicSettings?.profile?.organizationId || "",
            patientId: payload.patientId,
            doctorUserId: payload.doctorUserId,
            chairId: payload.chairId,
            startsAt: startsAtIso,
            endsAt: endsAtIso,
            status: payload.status,
            reason: payload.reason,
            comment: payload.comment,
          } as Appointment);
        if (typeof onAppointmentCreated === "function") onAppointmentCreated(createdAppt);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dente-stage-appointment-booked", { detail: { appointmentId: result?.appointment?.id || createdAppt?.id || null, startsAt: startsAtIso } }));
        }
      }

      safeLocalStorageRemoveItem("dente_quick_booking_draft");
      onClose();
    } catch (err) {
      logger.error("Quick booking submission failed", err);
      setSubmitError("Не удалось связаться с сервером клиники. Повторите попытку.");
      showToast("Не удалось связаться с сервером клиники. Повторите попытку.", "error");
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCopyBookingConfirmation = () =>
    executeCopyConfirmationFlow({
      patientSearch, appointmentType, doctors: params.doctors, doctorUserId: params.doctorUserId,
      dutyDoc: params.dutyDoc, chairs: params.chairs, chairId: params.chairId,
      currentChair: params.currentChair, startsAtLocal, durationMinutes, dashboard, initialSlot: params.initialSlot,
    });

  return { isSubmitting, handleSubmitBooking, handleCopyBookingConfirmation };
}
