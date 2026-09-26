import { useCallback, useEffect, useRef, useState } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
  checkAppointmentResourceCollision,
  isCitoAppointment,
  type ChairMaintenanceBlock,
} from "../../../utils/scheduleCollisionUtils";
import { formatDoctorShortName } from ".././GridAppointmentCard";
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { DEFAULT_SOLO_CHAIR } from "./gridConstants";
import { safeBuildSlotIso } from "./gridSlotMath";
import type { TargetSlotInfo } from "../WaitlistDrawer";

export interface UseScheduleAppointmentInteractionsProps {
  dateKey: string;
  gridStepMinutes?: 15 | 30 | 60 | undefined;
  onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
  chairMaintenanceBlocks?: ChairMaintenanceBlock[] | undefined;
  onAddChairMaintenance?: ((block: ChairMaintenanceBlock) => void) | undefined;
  onRemoveChairMaintenance?: ((blockId: string) => void) | undefined;
  appointments: Appointment[];
  dashboard: Dashboard;
  patientName: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  formatTime: (iso: string) => string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  timezone: string;
  onAppointmentMove?:
    ((appointmentId: string, updates: any) => Promise<any> | void) | undefined;
  onQuickStatusChange?:
    | ((appointmentId: string, status: Appointment["status"]) => void)
    | undefined;
  onOpenWaitlistForSlot?: ((slot: TargetSlotInfo) => void) | undefined;
}

export function useScheduleAppointmentInteractions({
  dateKey,
  gridStepMinutes,
  onGridStepChange,
  chairMaintenanceBlocks,
  onAddChairMaintenance,
  onRemoveChairMaintenance,
  appointments,
  dashboard,
  patientName,
  formatTime,
  toDateTimeLocalValue,
  timezone,
  onAppointmentMove,
  onQuickStatusChange,
  onOpenWaitlistForSlot,
}: UseScheduleAppointmentInteractionsProps) {
  const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);
  const [activeMenuApptId, setActiveMenuApptId] = useState<string | null>(null);
  const [activeStatusPickerApptId, setActiveStatusPickerApptId] = useState<
    string | null
  >(null);
  const [selectedMobileAppt, setSelectedMobileAppt] =
    useState<Appointment | null>(null);
  const [chairDoctorDropdownId, setChairDoctorDropdownId] = useState<
    string | null
  >(null);
  const [waitlistDrawerSlot, setWaitlistDrawerSlot] =
    useState<TargetSlotInfo | null>(null);

  const [internalGridStep, setInternalGridStep] = useState<15 | 30 | 60>(
    () => gridStepMinutes ?? 30,
  );
  const gridStep = gridStepMinutes ?? internalGridStep;

  const [internalMaintenanceBlocks, setInternalMaintenanceBlocks] = useState<
    ChairMaintenanceBlock[]
  >(() => {
    try {
      const raw = safeLocalStorageGetItem(
        "dente_schedule_chair_maintenance_blocks",
      );
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const effectiveMaintenanceBlocks =
    chairMaintenanceBlocks ?? internalMaintenanceBlocks;

  const [showRevenue, setShowRevenue] = useState<boolean>(() => {
    return safeLocalStorageGetItem("dente_schedule_show_revenue") === "true";
  });

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (activeMenuApptId) setActiveMenuApptId(null);
      if (activeStatusPickerApptId) setActiveStatusPickerApptId(null);
      if (chairDoctorDropdownId) setChairDoctorDropdownId(null);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [activeMenuApptId, activeStatusPickerApptId, chairDoctorDropdownId]);

  const handleToggleShowRevenue = useCallback(() => {
    setShowRevenue((prev) => {
      const next = !prev;
      safeLocalStorageSetItem("dente_schedule_show_revenue", String(next));
      showToast(
        next ? "Выручка отображается" : "Выручка скрыта (Режим приватности)",
        "info",
        2000,
      );
      return next;
    });
  }, []);

  const handleSetGridStep = useCallback(
    (step: 15 | 30 | 60) => {
      setInternalGridStep(step);
      onGridStepChange?.(step);
    },
    [onGridStepChange],
  );

  const handleAddMaintenance = useCallback(
    (
      chairId: string,
      reason: "sanitation" | "tech_break" | "maintenance" | string,
      durationMinutes: number,
      startTimeStr = "13:00",
    ) => {
      const { startIso, endIso } = safeBuildSlotIso(
        dateKey,
        startTimeStr,
        durationMinutes,
      );
      const newBlock: ChairMaintenanceBlock = {
        id: `maint-${chairId}-${dateKey}-${startTimeStr.replace(":", "")}-${Date.now()}`,
        chairId,
        startsAt: startIso,
        endsAt: endIso,
        reason,
        note:
          reason === "sanitation"
            ? "Санитарная обработка"
            : "Технический перерыв",
      };

      if (onAddChairMaintenance) {
        onAddChairMaintenance(newBlock);
      } else {
        setInternalMaintenanceBlocks((prev) => {
          const next = [...prev, newBlock];
          try {
            safeLocalStorageSetItem(
              "dente_schedule_chair_maintenance_blocks",
              JSON.stringify(next),
            );
          } catch {}
          return next;
        });
      }
      const label =
        reason === "sanitation"
          ? "Санитарная обработка"
          : "Технический перерыв";
      showToast(
        `${label} (${durationMinutes} мин) запланирована на ${startTimeStr}`,
        "success",
        3000,
      );
    },
    [dateKey, onAddChairMaintenance],
  );

  const handleRemoveMaintenance = useCallback(
    (blockId: string) => {
      if (onRemoveChairMaintenance) {
        onRemoveChairMaintenance(blockId);
      } else {
        setInternalMaintenanceBlocks((prev) => {
          const next = prev.filter((b) => b.id !== blockId);
          try {
            safeLocalStorageSetItem(
              "dente_schedule_chair_maintenance_blocks",
              JSON.stringify(next),
            );
          } catch {}
          return next;
        });
      }
      showToast("Техобслуживание завершено, кресло доступно", "success", 2500);
    },
    [onRemoveChairMaintenance],
  );

  const handleAppointmentMouseEnter = useCallback((apptId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredApptId(apptId);
  }, []);

  const handleAppointmentMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredApptId(null);
    }, 150);
  }, []);

  const handleKeepHovered = useCallback((apptId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredApptId(apptId);
  }, []);

  const handleToggleStatusPicker = useCallback((apptId: string) => {
    setActiveStatusPickerApptId((prev) => (prev === apptId ? null : apptId));
    setActiveMenuApptId(null);
  }, []);

  const handleToggleMenu = useCallback((apptId: string) => {
    setActiveMenuApptId((prev) => (prev === apptId ? null : apptId));
    setActiveStatusPickerApptId(null);
  }, []);

  const handleCloseStatusPicker = useCallback(() => {
    setActiveStatusPickerApptId(null);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setActiveMenuApptId(null);
  }, []);

  const handleSelectMobileAppt = useCallback((appt: Appointment) => {
    setSelectedMobileAppt(appt);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (activeStatusPickerApptId) setActiveStatusPickerApptId(null);
      if (activeMenuApptId) setActiveMenuApptId(null);
      if (chairDoctorDropdownId) setChairDoctorDropdownId(null);
    };

    if (
      activeStatusPickerApptId ||
      activeMenuApptId ||
      chairDoctorDropdownId
    ) {
      const timer = setTimeout(() => {
        document.addEventListener("click", handleGlobalClick);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("click", handleGlobalClick);
      };
    }
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [
    activeStatusPickerApptId,
    activeMenuApptId,
    chairDoctorDropdownId,
  ]);

  const handleAdjustAppointmentDuration = useCallback(
    (appt: Appointment, deltaMinutes: number) => {
      const startMs = Date.parse(appt.startsAt);
      const currentEndMs = Date.parse(appt.endsAt);
      const newEndMs = currentEndMs + deltaMinutes * 60000;
      const minDurationMs = 15 * 60000;

      if (newEndMs - startMs < minDurationMs) {
        showToast(
          "Минимальная длительность приема — 15 минут",
          "warning",
          3000,
        );
        return;
      }

      const newEndIso = new Date(newEndMs).toISOString();
      const pName = patientName
        ? patientName(dashboard?.patients ?? [], appt.patientId)
        : "Пациент";
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
          formatTimeFn: (iso) =>
            formatTime
              ? formatTime(iso)
              : toDateTimeLocalValue(iso, timezone).slice(11, 16),
          isCito,
          allowCitoOverbooking: isCito,
        },
      );

      if (collisionCheck.isCitoOverbooking) {
        showToast(
          `CITO-овербукинг разрешён (острая боль): ${collisionCheck.message}`,
          "warning",
          4500,
        );
      } else if (collisionCheck.hasCollision) {
        showToast(
          `Внимание: ${collisionCheck.message}. Время изменено с овербукингом`,
          "warning",
          4500,
        );
      }

      const newDuration = Math.round((newEndMs - startMs) / 60000);
      const newStart = formatTime
        ? formatTime(appt.startsAt)
        : toDateTimeLocalValue(appt.startsAt, timezone).slice(11, 16);
      const newEnd = formatTime
        ? formatTime(newEndIso)
        : toDateTimeLocalValue(newEndIso, timezone).slice(11, 16);

      if (typeof onAppointmentMove === "function") {
        void Promise.resolve(
          onAppointmentMove(appt.id, {
            endsAt: newEndIso,
            allowOverbooking: true,
          }),
        ).then((result) => {
          if (result !== false) {
            showToast(
              `Длительность приема ${pName} изменена: ${newDuration} мин (${newStart}–${newEnd})`,
              "success",
              3000,
            );
          }
        });
      } else {
        showToast(
          `Длительность приема ${pName} изменена: ${newDuration} мин (${newStart}–${newEnd})`,
          "success",
          3000,
        );
      }

      setSelectedMobileAppt((prev) =>
        prev && prev.id === appt.id ? { ...prev, endsAt: newEndIso } : prev,
      );
    },
    [
      appointments,
      dashboard,
      effectiveMaintenanceBlocks,
      formatTime,
      onAppointmentMove,
      patientName,
      toDateTimeLocalValue,
      timezone,
    ],
  );

  const handleShiftAppointmentLateness = useCallback(
    (appt: Appointment, shiftMinutes: number) => {
      const shiftMs = shiftMinutes * 60000;
      const newStartMs = Date.parse(appt.startsAt) + shiftMs;
      const newEndMs = Date.parse(appt.endsAt) + shiftMs;
      const newStartIso = new Date(newStartMs).toISOString();
      const newEndIso = new Date(newEndMs).toISOString();

      const pName = patientName
        ? patientName(dashboard?.patients ?? [], appt.patientId)
        : "Пациент";
      const formattedNewStart = formatTime
        ? formatTime(newStartIso)
        : toDateTimeLocalValue(newStartIso, timezone).slice(11, 16);
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
          formatTimeFn: (iso) =>
            formatTime
              ? formatTime(iso)
              : toDateTimeLocalValue(iso, timezone).slice(11, 16),
          isCito,
          allowCitoOverbooking: isCito,
        },
      );

      if (collisionCheck.isCitoOverbooking) {
        showToast(
          `CITO-овербукинг разрешён (острая боль): ${collisionCheck.message}`,
          "warning",
          4500,
        );
      } else if (collisionCheck.hasCollision) {
        showToast(
          `Внимание: ${collisionCheck.message}. Прием сдвинут с овербукингом`,
          "warning",
          4500,
        );
      }

      const messageText = `Здравствуйте, ${pName}! Ваш прием в клинике перенесен на ${formattedNewStart}. Ждем Вас!`;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(messageText).catch(() => {});
      }

      if (typeof onAppointmentMove === "function") {
        void Promise.resolve(
          onAppointmentMove(appt.id, {
            startsAt: newStartIso,
            endsAt: newEndIso,
            allowOverbooking: true,
          }),
        ).then((result) => {
          if (result !== false) {
            showToast(
              `Прием ${pName} сдвинут на +${shiftMinutes} мин (начало в ${formattedNewStart})`,
              "success",
              3000,
            );
          }
        });
      } else {
        showToast(
          `Прием ${pName} сдвинут на +${shiftMinutes} мин (начало в ${formattedNewStart})`,
          "success",
          3000,
        );
      }

      setSelectedMobileAppt((prev) =>
        prev && prev.id === appt.id
          ? { ...prev, startsAt: newStartIso, endsAt: newEndIso }
          : prev,
      );
    },
    [
      appointments,
      dashboard,
      effectiveMaintenanceBlocks,
      formatTime,
      onAppointmentMove,
      patientName,
      toDateTimeLocalValue,
      timezone,
    ],
  );

  const handleFreeSlotToWaitlist = useCallback(
    (appt: Appointment) => {
      if (typeof onQuickStatusChange === "function") {
        onQuickStatusChange(appt.id, "cancelled");
      } else if (typeof onAppointmentMove === "function") {
        void onAppointmentMove(appt.id, { status: "cancelled" });
      }

      const doc = dashboard?.clinicSettings?.staff?.find(
        (s) => s.id === appt.doctorUserId,
      );
      const chair = dashboard?.clinicSettings?.chairs?.find(
        (c) => c.id === appt.chairId,
      );
      const pName = patientName
        ? patientName(dashboard?.patients ?? [], appt.patientId)
        : null;

      const slotInfo: TargetSlotInfo = {
        appointmentId: appt.id,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        doctorUserId: appt.doctorUserId,
        doctorName: doc?.fullName || (doc as any)?.name || null,
        chairId: appt.chairId,
        chairName: chair?.name || null,
        patientId: appt.patientId,
        patientName: pName,
        freedBecause: "Освобождено для листа ожидания",
        reason: appt.reason,
      };

      showToast(
        "Слот освобожден. Открываю подбор кандидатов из листа ожидания…",
        "info",
        3000,
      );
      setActiveMenuApptId(null);
      setSelectedMobileAppt(null);

      if (onOpenWaitlistForSlot) {
        onOpenWaitlistForSlot(slotInfo);
      } else {
        setWaitlistDrawerSlot(slotInfo);
      }
    },
    [dashboard, onAppointmentMove, onQuickStatusChange, patientName, onOpenWaitlistForSlot],
  );

  const handleReassignAppointmentChair = useCallback(
    (appt: Appointment, targetChairId: string | null) => {
      const pName = patientName
        ? patientName(dashboard?.patients ?? [], appt.patientId)
        : "Пациент";
      const chairName = targetChairId
        ? dashboard?.clinicSettings?.chairs?.find((c) => c.id === targetChairId)
            ?.name ||
          (targetChairId === DEFAULT_SOLO_CHAIR.id
            ? DEFAULT_SOLO_CHAIR.name
            : "Кресло")
        : "Без кресла";

      if (typeof onAppointmentMove === "function") {
        void Promise.resolve(
          onAppointmentMove(appt.id, {
            chairId: targetChairId,
            allowOverbooking: true,
          }),
        ).then((result) => {
          if (result !== false) {
            showToast(
              `Прием ${pName} перенесен на ${chairName}`,
              "success",
              3000,
            );
          }
        });
      } else {
        showToast(`Прием ${pName} перенесен на ${chairName}`, "success", 3000);
      }

      setSelectedMobileAppt((prev) =>
        prev && prev.id === appt.id
          ? { ...prev, chairId: targetChairId }
          : prev,
      );
      setActiveMenuApptId(null);
    },
    [dashboard, onAppointmentMove, patientName],
  );

  const handleReassignAppointmentDoctor = useCallback(
    (appt: Appointment, targetDoctorUserId: string) => {
      const pName = patientName
        ? patientName(dashboard?.patients ?? [], appt.patientId)
        : "Пациент";
      const docName =
        dashboard?.clinicSettings?.staff?.find(
          (s) => s.id === targetDoctorUserId,
        )?.fullName || "Врач";

      if (typeof onAppointmentMove === "function") {
        void Promise.resolve(
          onAppointmentMove(appt.id, {
            doctorUserId: targetDoctorUserId,
            allowOverbooking: true,
          }),
        ).then((result) => {
          if (result !== false) {
            showToast(
              `Врач приема ${pName} изменен на ${formatDoctorShortName(docName)}`,
              "success",
              3000,
            );
          }
        });
      } else {
        showToast(
          `Врач приема ${pName} изменен на ${formatDoctorShortName(docName)}`,
          "success",
          3000,
        );
      }

      setSelectedMobileAppt((prev) =>
        prev && prev.id === appt.id
          ? { ...prev, doctorUserId: targetDoctorUserId }
          : prev,
      );
      setActiveMenuApptId(null);
    },
    [dashboard, onAppointmentMove, patientName],
  );

  return {
    gridStep,
    handleSetGridStep,
    effectiveMaintenanceBlocks,
    handleAddMaintenance,
    handleRemoveMaintenance,
    showRevenue,
    handleToggleShowRevenue,
    hoveredApptId,
    setHoveredApptId,
    activeMenuApptId,
    setActiveMenuApptId,
    activeStatusPickerApptId,
    setActiveStatusPickerApptId,
    selectedMobileAppt,
    setSelectedMobileAppt,
    chairDoctorDropdownId,
    setChairDoctorDropdownId,
    waitlistDrawerSlot,
    setWaitlistDrawerSlot,
    hoverTimeoutRef,
    gridContainerRef,
    handleAppointmentMouseEnter,
    handleAppointmentMouseLeave,
    handleKeepHovered,
    handleToggleStatusPicker,
    handleToggleMenu,
    handleCloseStatusPicker,
    handleCloseMenu,
    handleSelectMobileAppt,
    handleAdjustAppointmentDuration,
    handleShiftAppointmentLateness,
    handleFreeSlotToWaitlist,
    handleReassignAppointmentChair,
    handleReassignAppointmentDoctor,
  };
}
