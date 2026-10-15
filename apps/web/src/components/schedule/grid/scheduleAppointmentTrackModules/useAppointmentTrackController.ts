import type React from "react";
import { safeBuildSlotIso } from "../gridSlotMath";
import {
  checkAppointmentResourceCollision,
  isCitoAppointment,
} from "../../../../utils/scheduleCollisionUtils";
import { showToast, showRollbackToast } from "../../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { useScheduleDensity } from "../../useScheduleState";
import { dragGhostManager } from "../DecoupledDragGhost";
import { snapSlotHourTo15Min } from "../scheduleQuantumEngine";
import type {
  ScheduleAppointmentTrackProps,
  AppointmentTrackController,
} from "./types";
import { calcBaseSlotHeightPx, isMorningSlot } from "./appointmentTrackUtils";

export function useAppointmentTrackController(
  props: ScheduleAppointmentTrackProps,
): AppointmentTrackController {
  const {
    densityMode: propDensityMode,
    timeSlots,
    gridStep,
    effectiveChairs,
    dateKey,
    patientName,
    dashboard,
    timezone,
    toDateTimeLocalValue,
    appointments,
    getDoctorForChairAndHour,
    selectedDoctorId,
    effectiveChairAssignments,
    effectiveMaintenanceBlocks,
    onAppointmentMove,
    onSlotClick,
  } = props;

  const { densityMode: storedDensityMode } = useScheduleDensity();
  const effectiveDensityMode = propDensityMode ?? storedDensityMode;
  const baseSlotHeightPx = calcBaseSlotHeightPx(gridStep);

  // Slot drop helper for Drag-and-Drop & Waitlist items
  const handleSlotDrop = (e: React.DragEvent, chair: any, hour: string) => {
    try {
      dragGhostManager.endDrag();
      const rawData = e.dataTransfer.getData("application/json");
      if (!rawData) return;
      const data = JSON.parse(rawData);
      if (data?.type === "appointment" && data.appointmentId) {
        const sourceAppt = (appointments ?? []).find(
          (x) => x.id === data.appointmentId,
        );
        if (!sourceAppt) return;
        const targetChairId = chair.id !== "default-chair" ? chair.id : null;
        const quantizedHour = snapSlotHourTo15Min(hour);
        const assignedDocId = getDoctorForChairAndHour(chair.id, quantizedHour);
        const targetDoctorId =
          selectedDoctorId || assignedDocId || sourceAppt.doctorUserId;
        const targetDocName =
          dashboard?.clinicSettings?.staff?.find((m) => m.id === targetDoctorId)
            ?.fullName ||
          effectiveChairAssignments[chair.id]?.doctorName ||
          undefined;
        const slotDuration = data.durationMinutes || 30;
        const { startIso: targetStartIso, endIso: targetEndIso } =
          safeBuildSlotIso(dateKey, quantizedHour, slotDuration);
        const isSourceCito = isCitoAppointment(sourceAppt);

        const collisionCheck = checkAppointmentResourceCollision(
          {
            startsAt: targetStartIso,
            endsAt: targetEndIso,
            doctorUserId: targetDoctorId,
            chairId: targetChairId,
            patientId: sourceAppt.patientId,
            isCito: isSourceCito,
          },
          appointments,
          {
            excludeAppointmentId: sourceAppt.id,
            staff: dashboard?.clinicSettings?.staff,
            chairs: dashboard?.clinicSettings?.chairs,
            patients: dashboard?.patients,
            chairMaintenanceBlocks: effectiveMaintenanceBlocks,
            formatTimeFn: (iso) =>
              toDateTimeLocalValue(iso, timezone).slice(11, 16),
            isCito: isSourceCito,
            allowCitoOverbooking: isSourceCito,
          },
        );

        if (collisionCheck.isCitoOverbooking) {
          showToast(
            `Запись по острой боли (наложение слота допустимо): ${collisionCheck.message}`,
            "warning",
            4500,
          );
        } else if (collisionCheck.hasCollision) {
          showToast(
            `Внимание: ${collisionCheck.message}. Запись перенесена с совмещением слотов`,
            "warning",
            4500,
          );
        }

        const prevStartsAt = sourceAppt.startsAt;
        const prevEndsAt = sourceAppt.endsAt;
        const prevChairId = sourceAppt.chairId;
        const prevDoctorUserId = sourceAppt.doctorUserId;

        if (typeof onAppointmentMove === "function") {
          void Promise.resolve(
            onAppointmentMove(sourceAppt.id, {
              startsAt: targetStartIso,
              endsAt: targetEndIso,
              chairId: targetChairId,
              doctorUserId: targetDoctorId,
              allowOverbooking: true,
            }),
          ).then((result) => {
            if (result !== false) {
              const pName = patientName
                ? patientName(dashboard?.patients ?? [], sourceAppt.patientId)
                : "Пациент";
              showRollbackToast(
                `«${pName}» перенесен(а) на ${quantizedHour}`,
                () => {
                  void Promise.resolve(
                    onAppointmentMove(sourceAppt.id, {
                      startsAt: prevStartsAt,
                      endsAt: prevEndsAt,
                      chairId: prevChairId,
                      doctorUserId: prevDoctorUserId,
                      allowOverbooking: true,
                    }),
                  ).then(() => {
                    showToast("Перенос отменен, время восстановлено", "info", 3000);
                  });
                },
                5000,
                "Отменить",
              );
            }
          });
        } else {
          onSlotClick({
            dateKey,
            startTime: quantizedHour,
            chairId: targetChairId,
            doctorUserId: targetDoctorId,
            doctorName: targetDocName,
            durationMinutes: slotDuration,
            patientId: sourceAppt.patientId,
            reason: sourceAppt.reason || undefined,
          });
        }
      } else if (data?.type === "waitlist_item" && data.item) {
        const waitlistItem = data.item;
        const targetChairId = chair.id !== "default-chair" ? chair.id : null;
        const assignedDocId = getDoctorForChairAndHour(chair.id, hour);
        const targetDoctorId =
          selectedDoctorId ||
          assignedDocId ||
          waitlistItem.preferredDoctorId ||
          (dashboard?.clinicSettings?.staff?.find(
            (m) => m.active && m.role === "doctor",
          )?.id ??
            null);
        const targetWaitlistDocName =
          dashboard?.clinicSettings?.staff?.find((m) => m.id === targetDoctorId)
            ?.fullName ||
          effectiveChairAssignments[chair.id]?.doctorName ||
          undefined;
        const slotDuration = waitlistItem.durationMinutes || 30;
        const { startIso: targetStartIso, endIso: targetEndIso } =
          safeBuildSlotIso(dateKey, hour, slotDuration);

        const collisionCheck = checkAppointmentResourceCollision(
          {
            startsAt: targetStartIso,
            endsAt: targetEndIso,
            doctorUserId: targetDoctorId,
            chairId: targetChairId,
            patientId: waitlistItem.patientId,
          },
          appointments,
          {
            staff: dashboard?.clinicSettings?.staff,
            chairs: dashboard?.clinicSettings?.chairs,
            patients: dashboard?.patients,
            formatTimeFn: (iso) =>
              toDateTimeLocalValue(iso, timezone).slice(11, 16),
          },
        );

        if (collisionCheck.hasCollision) {
          showToast(
            `Внимание: запись создана с наложением времени (${collisionCheck.message})`,
            "warning",
            5000,
          );
        }

        onSlotClick({
          dateKey,
          startTime: hour,
          chairId: targetChairId,
          doctorUserId: targetDoctorId,
          doctorName: targetWaitlistDocName,
          durationMinutes: slotDuration,
          patientId: waitlistItem.patientId,
          patientName: waitlistItem.patientName || undefined,
          reason: waitlistItem.note || "Из листа ожидания",
        });

        if (waitlistItem.id) {
          void fetch(`/api/waitlist/${encodeURIComponent(waitlistItem.id)}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...denteAdminSecretRequestHeaders(),
            },
            body: JSON.stringify({ status: "fulfilled" }),
          }).catch((err) => {
            console.warn("Failed to fulfill waitlist item:", err);
          });
        }

        showToast(
          `Пациент «${waitlistItem.patientName || "из очереди"}» назначен в свободный слот`,
          "success",
          4000,
        );
      }
    } catch {
      // Ignore invalid JSON drop
    }
  };

  const isSingleChair = effectiveChairs.length === 1;
  const morningSlots = timeSlots.filter(isMorningSlot);
  const eveningSlots = timeSlots.filter((s) => !isMorningSlot(s));
  const canSplitShift =
    isSingleChair && morningSlots.length > 0 && eveningSlots.length > 0;

  return {
    effectiveDensityMode,
    baseSlotHeightPx,
    handleSlotDrop,
    canSplitShift,
    morningSlots,
    eveningSlots,
    isSingleChair,
  };
}
