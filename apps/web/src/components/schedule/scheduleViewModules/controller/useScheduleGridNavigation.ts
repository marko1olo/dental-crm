/**
 * useScheduleGridNavigation.ts
 *
 * Layer 2: Логика смены дат, шага сетки, режима отображения (день/неделя/кабинет)
 * и вычисления временных меток и масштаба без загромождения главного контроллера.
 */

import { useCallback, useMemo, useState } from "react";
import { motionSafeScrollIntoView } from "../../../../motionPreference";
import {
  type DayGroupingAppointment,
  groupAppointmentsByClinicDay,
  shiftDayKey,
} from "../../scheduleDayGrouping";
import { useScheduleDayQueue } from "../../view/useScheduleDayQueue";
import type {
  ScheduleGridNavigationOptions,
  ScheduleGridNavigationResult,
  ScheduleGridStep,
  ScheduleViewMode,
} from "./scheduleViewControllerTypes";

export function useScheduleGridNavigation({
  scheduleDateFilter,
  setScheduleDateFilter,
  clinicToday,
  todayScheduleDate,
  effectiveSortedAppointments,
  dashboard,
  toDateTimeLocalValue,
  scheduleDoctorFilterId,
  scheduleAssistantFilterId,
  scheduleChairFilterId,
  setScheduleDoctorFilterId,
  setScheduleAssistantFilterId,
  setScheduleChairFilterId,
  setScheduleStatusFilter,
}: ScheduleGridNavigationOptions): ScheduleGridNavigationResult {
  const [scheduleGridStep, setScheduleGridStep] = useState<ScheduleGridStep>(30);
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>("grid");

  const currentDateKey = scheduleDateFilter || clinicToday || todayScheduleDate();

  const scheduleDayGroups = useMemo(
    () =>
      groupAppointmentsByClinicDay(
        (effectiveSortedAppointments ?? []) as DayGroupingAppointment[],
        {
          toClinicLocal: (iso: string) =>
            toDateTimeLocalValue
              ? toDateTimeLocalValue(
                  iso,
                  dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow",
                )
              : iso,
          todayKey: clinicToday,
        },
      ),
    [
      effectiveSortedAppointments,
      dashboard?.clinicSettings?.profile?.timezone,
      clinicToday,
      toDateTimeLocalValue,
    ],
  );

  const {
    visibleDayGroups,
    scheduleOverlapCount,
    shiftQueueCounts,
  } = useScheduleDayQueue({
    scheduleDayGroups,
    scheduleDateFilter,
    clinicToday,
    scheduleDoctorFilterId,
    scheduleChairFilterId,
    dashboard,
  });

  const stepScheduleDay = useCallback(
    (deltaDays: number) => {
      const base = scheduleDateFilter.trim() || clinicToday;
      setScheduleDateFilter(shiftDayKey(base, deltaDays));
    },
    [scheduleDateFilter, clinicToday, setScheduleDateFilter],
  );

  const resetScheduleFilters = useCallback(() => {
    setScheduleDateFilter("");
    setScheduleDoctorFilterId(null);
    setScheduleAssistantFilterId(null);
    setScheduleChairFilterId(null);
    if (setScheduleStatusFilter) {
      setScheduleStatusFilter("all");
    }
  }, [
    setScheduleDateFilter,
    setScheduleDoctorFilterId,
    setScheduleAssistantFilterId,
    setScheduleChairFilterId,
    setScheduleStatusFilter,
  ]);

  const openScheduleSuggestion = useCallback((section: string) => {
    window.location.hash = section;
    const sectionId = section.replace(/^#/, "");
    window.requestAnimationFrame(() => {
      motionSafeScrollIntoView(document.getElementById(sectionId), {
        block: "start",
      });
    });
  }, []);

  return {
    scheduleGridStep,
    setScheduleGridStep,
    scheduleViewMode,
    setScheduleViewMode,
    currentDateKey,
    scheduleDayGroups,
    visibleDayGroups,
    scheduleOverlapCount,
    shiftQueueCounts,
    stepScheduleDay,
    resetScheduleFilters,
    openScheduleSuggestion,
  };
}
