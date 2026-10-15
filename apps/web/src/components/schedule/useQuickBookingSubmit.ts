import { useState } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";
import { showToast } from "../GlobalToast";
import { safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import { DEFAULT_SOLO_CHAIR } from "./ScheduleGrid";
import type { UseQuickBookingSubmitParams } from "./QuickBookingDrawerTypes";
import { executeCopyConfirmationFlow } from "./quickBookingConfirmationText";
import { resolveOrAutoCreateSubmitPatient } from "./quickBookingInlinePatient";

export function useQuickBookingSubmit(params: UseQuickBookingSubmitParams) {
  const {
    patientSearch, appointmentType, doctorUserId, dutyDoctorId, doctors, dutyDoc, chairId,
    chairs, currentChair, assistantUserId, startsAtLocal, durationMinutes, reason, comment,
    status, isSoloClinic, collision, setSlotConflict, setSubmitError, initialSlot, isEditing,
    editingAppointmentId, dashboard, setDashboard, loadDashboard, onAppointmentCreated,
    onAppointmentUpdated, onClose, fromLocal,
  } = params;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitBooking = async (e?: React.FormEvent, opts?: { overbookOverride?: boolean }) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const activePatientId = await resolveOrAutoCreateSubmitPatient(patientSearch, appointmentType);
    if (!activePatientId && appointmentType !== "emergency") {
      const msg = "Укажите пациента из списка или создайте быстрого пациента (ФИО + телефон)";
      setSubmitError(msg); showToast(msg, "warning"); return;
    }

    const effDoctor = doctorUserId || dutyDoctorId || doctors[0]?.id || "doctor-default";
    const effChair = chairId || (chairs[0] ? chairs[0].id : DEFAULT_SOLO_CHAIR.id);
    const startsAtIso = startsAtLocal ? fromLocal(startsAtLocal) : new Date(Math.ceil(Date.now() / 900000) * 900000).toISOString();
    const endsAtIso = new Date(Date.parse(startsAtIso) + durationMinutes * 60_000).toISOString();
    const isEmergency = appointmentType === "emergency";
    const effectiveReason = reason.trim() || (isEmergency ? "Срочно! Острая боль" : "Приём врача");

    if (collision.hasCollision && !isEmergency && !opts?.overbookOverride) {
      const slotStr = collision.suggestedSlot ? collision.suggestedSlot.timeDisplay || collision.suggestedSlot.label : null;
      setSlotConflict({ message: collision.message, suggestedSlots: slotStr ? [slotStr] : [] });
      return;
    }

    setIsSubmitting(true); setSubmitError(null);
    try {
      const stageServices = initialSlot?.services || initialSlot?.items || initialSlot?.procedures || [];
      const planId = initialSlot?.treatmentPlanId || initialSlot?.planId || null;
      const stageId = initialSlot?.stageId || (initialSlot?.stageNumber ? String(initialSlot.stageNumber) : null);
      let effectiveComment = comment.trim();
      if (planId && !effectiveComment.includes("План лечения")) {
        const marker = `[План лечения: ${planId}${initialSlot?.stageTitle ? ` | ${initialSlot.stageTitle}` : ""}]${stageId ? ` [Этап: ${stageId}]` : ""}`;
        effectiveComment = effectiveComment ? `${marker}\n${effectiveComment}` : marker;
      }

      const allowOverbookingFlag = Boolean(isEmergency || opts?.overbookOverride);
      const payload: Record<string, any> = {
        patientId: activePatientId || null, doctorUserId: effDoctor, assistantUserId: isSoloClinic ? null : assistantUserId || null,
        chairId: effChair, startsAt: startsAtIso, endsAt: endsAtIso, status, reason: effectiveReason, comment: effectiveComment,
        isCito: isEmergency, cito: isEmergency, allowOverbooking: allowOverbookingFlag, allowEmergencyOverride: allowOverbookingFlag,
        treatmentPlanId: planId, stageId, invoice_items: stageServices, invoiceItems: stageServices, completedServices: stageServices,
      };

      const url = isEditing ? `/api/appointments/${encodeURIComponent(editingAppointmentId!)}` : "/api/appointments";
      const res = await fetchWithHandling(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        showToast(actionFailureToast(isEditing ? "Ошибка обновления записи на сервере" : "Ошибка создания записи на сервере", res.status), "warning");
        setSubmitError(`Ошибка при ${isEditing ? "обновлении" : "создании"} записи (${res.status})`);
        return;
      }

      const result = (await res.json()) as { appointment?: Appointment; appointments?: Appointment[]; dashboard?: Dashboard };
      const nextDashboard = result?.dashboard ?? (Array.isArray(result?.appointments) ? (result as unknown as Dashboard) : undefined);
      if (nextDashboard && typeof setDashboard === "function") setDashboard(nextDashboard);
      if (typeof loadDashboard === "function") await loadDashboard();

      const patientName = patientSearch.selectedPatient?.fullName || patientSearch.newPatientFullName.trim() || "Пациент";
      if (isEditing) {
        showToast(`Запись для «${patientName}» обновлена!`, "success", 4000);
        if (result?.appointment && typeof onAppointmentUpdated === "function") onAppointmentUpdated(result.appointment);
      } else {
        showToast(`Запись для «${patientName}» создана на ${startsAtLocal.slice(11, 16)}!`, "success", 5000);
        const createdAppt = nextDashboard?.appointments?.find((a) => (a.patientId === activePatientId || a.patientId === patientSearch.patientId) && a.startsAt === startsAtIso);
        if (createdAppt && typeof onAppointmentCreated === "function") onAppointmentCreated(createdAppt);
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
      setIsSubmitting(false);
    }
  };

  const handleCopyBookingConfirmation = () =>
    executeCopyConfirmationFlow({
      patientSearch, appointmentType, doctors, doctorUserId, dutyDoc,
      chairs, chairId, currentChair, startsAtLocal, durationMinutes, dashboard,
    });

  return { isSubmitting, handleSubmitBooking, handleCopyBookingConfirmation };
}
