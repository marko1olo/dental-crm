/**
 * apps/web/src/components/schedule/useWaitlistBookingAction.ts
 * Hook for booking waitlist patients into appointments and deleting entries.
 */

import { useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";
import type { WaitlistPatientEntry } from "./waitlistMatchScoring";

interface UseWaitlistBookingActionParams {
  activeTargetSlot: TargetSlotInfo | null;
  targetSlot?: TargetSlotInfo | null | undefined;
  dashboard?: any;
  onBookSlot?: ((slot: TargetSlotInfo, patient: WaitlistPatientEntry) => Promise<void> | void) | undefined;
  onAppointmentCreated?: (() => void) | undefined;
  onClose: () => void;
  fetchWaitlist: () => void;
  updateNewAppointmentDraft?: ((field: string, val: any) => void) | undefined;
  focusNewAppointmentEditor?: (() => void) | undefined;
  waitlistWriteHeaders: () => Record<string, string>;
}

export function useWaitlistBookingAction({
  activeTargetSlot,
  targetSlot,
  dashboard,
  onBookSlot,
  onAppointmentCreated,
  onClose,
  fetchWaitlist,
  updateNewAppointmentDraft,
  focusNewAppointmentEditor,
  waitlistWriteHeaders,
}: UseWaitlistBookingActionParams) {
  const [bookingPatientId, setBookingPatientId] = useState<string | null>(null);

  const handleBookPatient = async (patient: WaitlistPatientEntry) => {
    setBookingPatientId(patient.id);
    try {
      const currentSlot = activeTargetSlot || targetSlot;
      if (onBookSlot && currentSlot) {
        await onBookSlot(currentSlot, patient);
      } else if (currentSlot) {
        const activeDocs = (dashboard?.clinicSettings?.staff ?? []).filter((m: any) => m.active && (m.role === "doctor" || m.role === "owner"));
        // Без явного выбора уходит null: сервер резолвит реального врача и
        // кресло этой клиники из БД (prepareCreateAppointmentRawBody).
        // Выдуманные «doctor-default» на клиенте — ложь, источник правды БД.
        const doctorUserId = currentSlot.doctorUserId || patient.preferredDoctorId || activeDocs[0]?.id || null;
        const activeChairs = (dashboard?.clinicSettings?.chairs ?? []).filter((c: any) => c.active);
        const chairId = currentSlot.chairId || activeChairs[0]?.id || null;
        const startsAt = currentSlot.startsAt;
        const endsAt = currentSlot.endsAt || new Date(Date.parse(startsAt) + 30 * 60_000).toISOString();

        if (currentSlot.appointmentId) {
          const patchRes = await fetch(`/api/appointments/${encodeURIComponent(currentSlot.appointmentId)}`, {
            method: "PATCH",
            headers: waitlistWriteHeaders(),
            body: JSON.stringify({
              patientId: patient.patientId,
              status: "planned",
              expectedCurrentStatus: ["cancelled", "no_show"],
              reason: patient.treatmentCategory || "Записать пациента из листа ожидания",
              comment: `Запись из листа ожидания${patient.notes ? `: ${patient.notes}` : ""}`,
              assistantUserId: "",
            }),
          });
          if (!patchRes.ok) {
            const err = await patchRes.json().catch(() => null);
            showToast(err?.message || "Не удалось занять окно расписания", "error");
            return;
          }
        } else {
          const res = await fetch("/api/appointments", {
            method: "POST",
            headers: waitlistWriteHeaders(),
            body: JSON.stringify({
              patientId: patient.patientId,
              doctorUserId,
              chairId,
              startsAt,
              endsAt,
              status: "planned",
              reason: patient.treatmentCategory || "Записать пациента из листа ожидания",
              comment: `Запись из листа ожидания${patient.notes ? `: ${patient.notes}` : ""}`,
              assistantUserId: "",
              clientMutationId: `waitlist-quickfill-${Date.now()}`,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            showToast(err?.message || "Не удалось создать запись на приём", "error");
            return;
          }
        }

        if (updateNewAppointmentDraft) {
          updateNewAppointmentDraft("patientId", patient.patientId);
          updateNewAppointmentDraft("doctorUserId", doctorUserId);
          updateNewAppointmentDraft("chairId", chairId);
          updateNewAppointmentDraft("startsAt", startsAt);
          updateNewAppointmentDraft("endsAt", endsAt);
          updateNewAppointmentDraft("assistantUserId", "");
        }
      } else {
        if (updateNewAppointmentDraft) {
          updateNewAppointmentDraft("patientId", patient.patientId);
          focusNewAppointmentEditor?.();
        }
        showToast("Слот не выбран. Открыта форма создания записи.", "info");
        onClose();
        return;
      }

      await fetch(`/api/waitlist/${patient.id}`, {
        method: "PUT",
        headers: waitlistWriteHeaders(),
        body: JSON.stringify({ status: "fulfilled" }),
      }).catch((err) => logger.warn("Failed to mark waitlist fulfilled", err));

      showToast(`Пациент «${patient.patientName || "Пациент"}» записан на освободившееся окно!`, "success", 5000);
      onAppointmentCreated?.();
      onClose();
      fetchWaitlist();
    } catch (err) {
      logger.error("Failed to book slot for patient", err);
      showToast(actionFailureToast("Ошибка при записи пациента", null), "error");
    } finally {
      setBookingPatientId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: "DELETE", headers: waitlistWriteHeaders() });
      if (res.ok) {
        showToast("Запись удалена из листа ожидания", "success");
        fetchWaitlist();
      }
    } catch {
      showToast("Не удалось удалить запись", "error");
    }
  };

  return {
    bookingPatientId,
    handleBookPatient,
    handleDelete,
  };
}
