/**
 * useAppointmentDurationAndShift.ts — Hook managing appointment duration adjustments (+15, +30 min) and lateness shifts.
 */

import { useCallback } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import {
  checkAppointmentResourceCollision,
  isCitoAppointment,
  type ChairMaintenanceBlock,
} from "../../../../utils/scheduleCollisionUtils";

export function useAppointmentDurationAndShift(
  appointments: Appointment[],
  dashboard: Dashboard,
  effectiveMaintenanceBlocks: ChairMaintenanceBlock[],
  patientName: (patients: Dashboard["patients"], patientId: string | null) => string,
  formatTime: (iso: string) => string,
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string,
  timezone: string,
  // biome-ignore lint/suspicious/noExplicitAny: move payload
  onAppointmentMove?: ((appointmentId: string, updates: any) => Promise<any> | void) | undefined,
  setSelectedMobileAppt?: React.Dispatch<React.SetStateAction<Appointment | null>> | undefined,
) {
  const handleAdjustAppointmentDuration = useCallback(
    (appt: Appointment, deltaMinutes: number) => {
      const startMs = Date.parse(appt.startsAt);
      const currentEndMs = Date.parse(appt.endsAt);
      const newEndMs = currentEndMs + deltaMinutes * 60000;
      const minDurationMs = 15 * 60000;

      if (newEndMs - startMs < minDurationMs) {
        showToast("Минимальная длительность приема — 15 минут", "warning", 3000);
        return;
      }

      const newEndIso = new Date(newEndMs).toISOString();
      const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : "Пациент";
      const isCito = isCitoAppointment(appt);

      const collisionCheck = checkAppointmentResourceCollision(
        {
          startsAt: appt.startsAt,
          endsAt: newEndIso,
          doctorUserId: appt.doctorUserId,
          chairId: appt.chairId,
          patientId: appt.patientId,
          isCito,
        },
        appointments,
        {
          excludeAppointmentId: appt.id,
          staff: dashboard?.clinicSettings?.staff,
          chairs: dashboard?.clinicSettings?.chairs,
          patients: dashboard?.patients,
          chairMaintenanceBlocks: effectiveMaintenanceBlocks,
          formatTimeFn: (iso) => (formatTime ? formatTime(iso) : toDateTimeLocalValue(iso, timezone).slice(11, 16)),
          isCito,
          allowCitoOverbooking: isCito,
        },
      );

      if (collisionCheck.isCitoOverbooking) {
        showToast(`Запись по острой боли (наложение слота допустимо): ${collisionCheck.message}`, "warning", 4500);
      } else if (collisionCheck.hasCollision) {
        showToast(`Внимание: ${collisionCheck.message}. Время изменено с совмещением слотов`, "warning", 4500);
      }

      const newDuration = Math.round((newEndMs - startMs) / 60000);
      const newStart = formatTime ? formatTime(appt.startsAt) : toDateTimeLocalValue(appt.startsAt, timezone).slice(11, 16);
      const newEnd = formatTime ? formatTime(newEndIso) : toDateTimeLocalValue(newEndIso, timezone).slice(11, 16);

      if (typeof onAppointmentMove === "function") {
        void Promise.resolve(onAppointmentMove(appt.id, { endsAt: newEndIso, allowOverbooking: true })).then((result) => {
          if (result !== false) {
            showToast(`Длительность приема ${pName} изменена: ${newDuration} мин (${newStart}–${newEnd})`, "success", 3000);
          }
        });
      } else {
        showToast(`Длительность приема ${pName} изменена: ${newDuration} мин (${newStart}–${newEnd})`, "success", 3000);
      }

      setSelectedMobileAppt?.((prev) => (prev && prev.id === appt.id ? { ...prev, endsAt: newEndIso } : prev));
    },
    [appointments, dashboard, effectiveMaintenanceBlocks, formatTime, onAppointmentMove, patientName, toDateTimeLocalValue, timezone, setSelectedMobileAppt],
  );

  const handleShiftAppointmentLateness = useCallback(
    (appt: Appointment, shiftMinutes: number) => {
      const shiftMs = shiftMinutes * 60000;
      const newStartMs = Date.parse(appt.startsAt) + shiftMs;
      const newEndMs = Date.parse(appt.endsAt) + shiftMs;
      const newStartIso = new Date(newStartMs).toISOString();
      const newEndIso = new Date(newEndMs).toISOString();

      const pName = patientName ? patientName(dashboard?.patients ?? [], appt.patientId) : "Пациент";
      const formattedNewStart = formatTime ? formatTime(newStartIso) : toDateTimeLocalValue(newStartIso, timezone).slice(11, 16);
      const isCito = isCitoAppointment(appt);

      const collisionCheck = checkAppointmentResourceCollision(
        {
          startsAt: newStartIso,
          endsAt: newEndIso,
          doctorUserId: appt.doctorUserId,
          chairId: appt.chairId,
          patientId: appt.patientId,
          isCito,
        },
        appointments,
        {
          excludeAppointmentId: appt.id,
          staff: dashboard?.clinicSettings?.staff,
          chairs: dashboard?.clinicSettings?.chairs,
          patients: dashboard?.patients,
          chairMaintenanceBlocks: effectiveMaintenanceBlocks,
          formatTimeFn: (iso) => (formatTime ? formatTime(iso) : toDateTimeLocalValue(iso, timezone).slice(11, 16)),
          isCito,
          allowCitoOverbooking: isCito,
        },
      );

      if (collisionCheck.isCitoOverbooking) {
        showToast(`Запись по острой боли (наложение слота допустимо): ${collisionCheck.message}`, "warning", 4500);
      } else if (collisionCheck.hasCollision) {
        showToast(`Внимание: ${collisionCheck.message}. Прием сдвинут с совмещением слотов`, "warning", 4500);
      }

      const messageText = `Здравствуйте, ${pName}! Ваш прием в клинике перенесен на ${formattedNewStart}. Ждем Вас!`;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(messageText).catch(() => {});
      }

      if (typeof onAppointmentMove === "function") {
        void Promise.resolve(onAppointmentMove(appt.id, { startsAt: newStartIso, endsAt: newEndIso, allowOverbooking: true })).then((result) => {
          if (result !== false) {
            showToast(`Прием ${pName} сдвинут на +${shiftMinutes} мин (начало в ${formattedNewStart})`, "success", 3000);
          }
        });
      } else {
        showToast(`Прием ${pName} сдвинут на +${shiftMinutes} мин (начало в ${formattedNewStart})`, "success", 3000);
      }

      setSelectedMobileAppt?.((prev) => (prev && prev.id === appt.id ? { ...prev, startsAt: newStartIso, endsAt: newEndIso } : prev));
    },
    [appointments, dashboard, effectiveMaintenanceBlocks, formatTime, onAppointmentMove, patientName, toDateTimeLocalValue, timezone, setSelectedMobileAppt],
  );

  return {
    handleAdjustAppointmentDuration,
    handleShiftAppointmentLateness,
  };
}
