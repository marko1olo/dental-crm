import { useState, useEffect, useCallback } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import { motionSafeScrollIntoView } from "../../../motionPreference";
import { actionFailureToast } from "../../../lib/panelStateText";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";

export interface UseScheduleShortcutsParams {
  dashboard: Dashboard | null | undefined;
  scheduleDoctorFilterId: string | null;
  scheduleChairFilterId: string | null;
  scheduleDateFilter: string;
  clinicToday: string;
  todayScheduleDate: () => string;
  auth: any;
  setQuickBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
  setQuickBookingOpen: (open: boolean) => void;
  showToast: (
    msg: string,
    type?: "success" | "error" | "info" | "warning",
    duration?: number,
  ) => void;
  isPatientSearchOpen: boolean;
  setIsPatientSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  quickBookingOpen: boolean;
  modalAppointment: Appointment | null;
  setModalAppointment: (app: Appointment | null) => void;
  waitlistOpen: boolean;
  setWaitlistOpen: (open: boolean) => void;
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
  updateNewAppointmentDraft: (key: string, val: any) => void;
  focusNewAppointmentEditor: () => void;
  patientName?: (patients: any[], id: string | null | undefined) => string;
  setUseManualSelects: (use: boolean) => void;
  setShowClipboardPanel: (show: boolean) => void;
  setShowFreedSlotsPanel: (show: boolean) => void;
  setShowConfirmationsPanel: (show: boolean) => void;
  setClipboardReloadToken: React.Dispatch<React.SetStateAction<number>>;
}

export function useScheduleShortcuts({
  dashboard,
  scheduleDoctorFilterId,
  scheduleChairFilterId,
  scheduleDateFilter,
  clinicToday,
  todayScheduleDate,
  auth,
  setQuickBookingSlot,
  setQuickBookingOpen,
  showToast,
  isPatientSearchOpen,
  setIsPatientSearchOpen,
  quickBookingOpen,
  modalAppointment,
  setModalAppointment,
  waitlistOpen,
  setWaitlistOpen,
  showCreateForm,
  setShowCreateForm,
  updateNewAppointmentDraft,
  focusNewAppointmentEditor,
  patientName,
  setUseManualSelects,
  setShowClipboardPanel,
  setShowFreedSlotsPanel,
  setShowConfirmationsPanel,
  setClipboardReloadToken,
}: UseScheduleShortcutsParams) {
  const handleEmergencyCitoBooking = useCallback(() => {
    const staff = dashboard?.clinicSettings?.staff ?? [];
    const activeDoctors = staff.filter(
      (m) => m.active && (m.role === "doctor" || m.role === "owner"),
    );
    const dutyDoctor =
      (scheduleDoctorFilterId
        ? activeDoctors.find((d) => d.id === scheduleDoctorFilterId)
        : null) ||
      activeDoctors.find(
        (d) =>
          d.specialties?.includes("therapist") ||
          d.specialties?.includes("surgeon") ||
          d.specialties?.includes("universal"),
      ) ||
      activeDoctors[0] ||
      null;

    const chairs = (dashboard?.clinicSettings?.chairs ?? []).filter(
      (c) => c.active,
    );
    const chair =
      (scheduleChairFilterId
        ? chairs.find((c) => c.id === scheduleChairFilterId)
        : null) ||
      chairs[0] ||
      null;

    const now = new Date();
    const mins = now.getMinutes();
    const roundedMins = Math.ceil(mins / 5) * 5;
    now.setMinutes(roundedMins, 0, 0);
    const hoursStr = String(now.getHours()).padStart(2, "0");
    const minsStr = String(now.getMinutes()).padStart(2, "0");
    const urgentTimeStr = `${hoursStr}:${minsStr}`;

    const targetDate = scheduleDateFilter || clinicToday || todayScheduleDate();

    setQuickBookingSlot({
      dateKey: targetDate,
      startTime: urgentTimeStr,
      startsAt: `${targetDate}T${urgentTimeStr}:00.000Z`,
      doctorUserId: dutyDoctor?.id || null,
      chairId: chair?.id || null,
      durationMinutes: 20,
      reason: "CITO! Острая боль",
      isCitoEmergency: true,
    });
    setQuickBookingOpen(true);
    showToast(
      "Экстренный прием CITO: выбран дежурный врач и срочный слот",
      "info",
      3500,
    );
  }, [
    dashboard?.clinicSettings?.staff,
    dashboard?.clinicSettings?.chairs,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    setQuickBookingSlot,
    setQuickBookingOpen,
    showToast,
  ]);

  const [waitlistCount, setWaitlistCount] = useState(0);

  useEffect(() => {
    if (waitlistOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/waitlist", {
          headers: auth?.denteClinicalReadHeaders
            ? auth.denteClinicalReadHeaders()
            : {},
        });
        if (!response.ok) return;
        const rows = await response.json();
        if (!cancelled)
          setWaitlistCount(Array.isArray(rows) ? rows?.length : 0);
      } catch {
        /* Сеть отвалилась: кнопка остаётся без числа, но открывается. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [waitlistOpen, auth]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPatientSearchOpen((prev) => !prev);
        return;
      }

      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("contenteditable") === "true");

      if (e.key === "Escape") {
        if (isPatientSearchOpen) {
          setIsPatientSearchOpen(false);
          return;
        }
        if (quickBookingOpen) {
          setQuickBookingOpen(false);
          return;
        }
        if (modalAppointment) {
          setModalAppointment(null);
          return;
        }
        if (waitlistOpen) {
          setWaitlistOpen(false);
          return;
        }
        if (showCreateForm) {
          setShowCreateForm(false);
          return;
        }
      }

      if (isInputFocused) return;

      if (
        (e.key === "n" || e.key === "N" || e.key === "т" || e.key === "Т") &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        setQuickBookingSlot({
          dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
          doctorUserId: scheduleDoctorFilterId || null,
          chairId: scheduleChairFilterId || null,
          durationMinutes: 30,
        });
        setQuickBookingOpen(true);
        return;
      }

      if (
        (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С") &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        handleEmergencyCitoBooking();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "j") {
        const focusableNodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-timeline-focusable='true'], [data-appointment-id]",
          ),
        );
        if (focusableNodes.length === 0) return;
        e.preventDefault();
        const currentIndex = focusableNodes.findIndex(
          (n) =>
            n === document.activeElement || n.contains(document.activeElement),
        );
        const nextIndex =
          currentIndex < 0 ? 0 : (currentIndex + 1) % focusableNodes.length;
        const target = focusableNodes[nextIndex];
        target?.focus();
        if (target) motionSafeScrollIntoView(target, { block: "nearest" });
      } else if (e.key === "ArrowUp" || e.key === "k") {
        const focusableNodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-timeline-focusable='true'], [data-appointment-id]",
          ),
        );
        if (focusableNodes.length === 0) return;
        e.preventDefault();
        const currentIndex = focusableNodes.findIndex(
          (n) =>
            n === document.activeElement || n.contains(document.activeElement),
        );
        const prevIndex =
          currentIndex <= 0 ? focusableNodes.length - 1 : currentIndex - 1;
        const target = focusableNodes[prevIndex];
        target?.focus();
        if (target) motionSafeScrollIntoView(target, { block: "nearest" });
      }
    };

    const handleOpenQuickBookingEvent = () => {
      setQuickBookingSlot({
        dateKey: scheduleDateFilter || clinicToday || todayScheduleDate(),
        doctorUserId: scheduleDoctorFilterId || null,
        chairId: scheduleChairFilterId || null,
        durationMinutes: 30,
      });
      setQuickBookingOpen(true);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener(
      "dente-open-quick-booking",
      handleOpenQuickBookingEvent,
    );
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener(
        "dente-open-quick-booking",
        handleOpenQuickBookingEvent,
      );
    };
  }, [
    isPatientSearchOpen,
    quickBookingOpen,
    modalAppointment,
    waitlistOpen,
    showCreateForm,
    scheduleDateFilter,
    clinicToday,
    todayScheduleDate,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    handleEmergencyCitoBooking,
    setIsPatientSearchOpen,
    setQuickBookingSlot,
    setQuickBookingOpen,
    setModalAppointment,
    setWaitlistOpen,
    setShowCreateForm,
  ]);

  const repeatAppointment = (appointment: Appointment) => {
    const startsAtMs = Date.parse(appointment.startsAt);
    const endsAtMs = Date.parse(appointment.endsAt);
    const durationMs =
      Number.isFinite(startsAtMs) &&
      Number.isFinite(endsAtMs) &&
      endsAtMs > startsAtMs
        ? endsAtMs - startsAtMs
        : (dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? 30) *
          60_000;
    const weekMs = 7 * 24 * 60 * 60_000;
    const nextSameWeekdayMs = () => {
      if (!Number.isFinite(startsAtMs)) return Date.now() + weekMs;
      let candidate = startsAtMs + weekMs;
      const now = Date.now();
      while (candidate <= now) candidate += weekMs;
      return candidate;
    };
    const weekAhead = new Date(nextSameWeekdayMs());

    const fallbackAssistant = (dashboard?.clinicSettings?.staff ?? []).find(
      (member) => member.active && member.role === "assistant",
    );
    const repeatAssistantId =
      appointment.assistantUserId ??
      (dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
        ? null
        : (fallbackAssistant?.id ?? null));

    updateNewAppointmentDraft("patientId", appointment.patientId);
    updateNewAppointmentDraft("doctorUserId", appointment.doctorUserId);
    updateNewAppointmentDraft("assistantUserId", repeatAssistantId ?? "");
    updateNewAppointmentDraft("chairId", appointment.chairId);
    updateNewAppointmentDraft("status", "planned");
    updateNewAppointmentDraft("startsAt", weekAhead.toISOString());
    updateNewAppointmentDraft(
      "endsAt",
      new Date(weekAhead.getTime() + durationMs).toISOString(),
    );
    updateNewAppointmentDraft("reason", appointment.reason ?? "");
    updateNewAppointmentDraft("comment", "");
    setUseManualSelects(true);
    focusNewAppointmentEditor();
    showToast(
      "Форма заполнена как в прошлой записи: тот же день недели и время, ближайший такой день впереди. Проверьте дату и время и нажмите «Создать запись».",
      "info",
      7000,
    );
  };

  const copyAppointmentToBuffer = async (appointment: Appointment) => {
    const patientLabel = patientName
      ? patientName(dashboard?.patients ?? [], appointment.patientId ?? "")
      : "Пациент";
    try {
      let response: Response;
      try {
        response = await fetch("/api/schedule/clipboard-items", {
          method: "POST",
          headers: denteAdminSecretRequestHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ appointmentId: appointment.id }),
        });
      } catch {
        showToast(
          "Сервер клиники не ответил. Запись в буфер не скопирована.",
          "error",
        );
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch((err) => {
          showToast(
            actionFailureToast(
              "Не удалось прочитать ответ сервера",
              (err as { status?: number })?.status ?? null,
            ),
            "error",
          );
          return null;
        });
        const serverMessage =
          body && typeof body.message === "string" ? body.message.trim() : "";
        if (serverMessage && /[а-яё]/i.test(serverMessage)) {
          showToast(serverMessage, "error");
        } else if (response.status === 401 || response.status === 403) {
          showToast(
            "Не удалось скопировать в буфер: нет прав. Введите секрет администратора расписания и повторите.",
            "error",
          );
        } else {
          showToast(
            "Не удалось скопировать запись в буфер. Повторите, а если повторится — сообщите администратору.",
            "error",
          );
        }
        return;
      }
      showToast(
        `«${patientLabel}» скопирован в буфер. Укажите новое время и нажмите «Вставить».`,
        "success",
        5000,
      );
      setShowClipboardPanel(true);
      setShowFreedSlotsPanel(false);
      setShowConfirmationsPanel(false);
      setClipboardReloadToken((token) => token + 1);
    } catch {
      showToast(
        "Не удалось скопировать запись в буфер. Повторите, а если повторится — сообщите администратору.",
        "error",
      );
    }
  };

  return {
    handleEmergencyCitoBooking,
    waitlistCount,
    repeatAppointment,
    copyAppointmentToBuffer,
  };
}
