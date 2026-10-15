import type { Appointment, Dashboard } from "@dental/shared";
import React, { useMemo } from "react";
import { formatDayTitle } from "../scheduleDayGrouping";

export type ScheduleFilterSummaryProps = {
  scheduleDateFilter: string;
  clinicToday: string;
  scheduleStatusFilter: Appointment["status"] | "all";
  scheduleDoctorFilterId: string | null;
  scheduleAssistantFilterId: string | null;
  scheduleChairFilterId: string | null;
  appointmentLabels?: Record<Appointment["status"], string>;
  dashboard?: Dashboard;
  visibleDayGroups?: any;
  scheduleOverlapCount: number;
  shiftWarnings?: Dashboard["shiftIntelligence"]["scheduleWarnings"];
  resetScheduleFilters: () => void;
  setScheduleDateFilter: (date: string) => void;
  openScheduleWarning: (warning: Dashboard["shiftIntelligence"]["scheduleWarnings"][number]) => void;
};

export function useScheduleFilterSummary(props: ScheduleFilterSummaryProps) {
  const {
    scheduleDateFilter,
    clinicToday,
    scheduleStatusFilter,
    scheduleDoctorFilterId,
    scheduleAssistantFilterId,
    scheduleChairFilterId,
    appointmentLabels,
    dashboard,
    visibleDayGroups,
    scheduleOverlapCount,
    shiftWarnings,
    resetScheduleFilters,
    setScheduleDateFilter,
    openScheduleWarning,
  } = props;

  const isNonTodayDateFilter = Boolean(
    scheduleDateFilter?.trim() && scheduleDateFilter.trim() !== clinicToday,
  );

  const activeScheduleFilterCount = [
    isNonTodayDateFilter ? scheduleDateFilter.trim() : null,
    scheduleStatusFilter !== "all" ? scheduleStatusFilter : null,
    scheduleDoctorFilterId,
    scheduleAssistantFilterId,
    scheduleChairFilterId,
  ].filter((value): value is string => Boolean(value)).length;

  const staffFullNameById = (staffId: string | null) =>
    (dashboard?.clinicSettings?.staff ?? []).find(
      (member: { id: string }) => member?.id === staffId,
    )?.fullName ?? "неизвестный сотрудник";

  const activeScheduleFilterLabels = [
    isNonTodayDateFilter
      ? `день: ${formatDayTitle(scheduleDateFilter.trim())}`
      : null,
    scheduleDoctorFilterId
      ? `врач: ${staffFullNameById(scheduleDoctorFilterId)}`
      : null,
    scheduleAssistantFilterId
      ? `ассистент: ${staffFullNameById(scheduleAssistantFilterId)}`
      : null,
    scheduleChairFilterId
      ? `кресло: ${(dashboard?.clinicSettings?.chairs ?? []).find((chair: { id: string }) => chair?.id === scheduleChairFilterId)?.name ?? "неизвестное"}`
      : null,
    scheduleStatusFilter !== "all"
      ? `только «${appointmentLabels?.[scheduleStatusFilter as Appointment["status"]] ?? scheduleStatusFilter}»`
      : null,
  ].filter((value): value is string => Boolean(value));

  const hasSummaryContent =
    activeScheduleFilterLabels.length > 0 ||
    (activeScheduleFilterLabels.length === 0 &&
      (visibleDayGroups?.length ?? 0) > 1) ||
    scheduleOverlapCount > 0 ||
    (shiftWarnings?.length ?? 0) > 0;

  const scheduleFilterSummaryNode = useMemo(() => {
    if (!hasSummaryContent) return null;

    return (
      <div
        className="schedule-shift-summary-inline inline-flex items-center gap-1.5 flex-nowrap shrink-0"
        data-testid="schedule-shift-summary"
        aria-label="Короткая сводка смены"
        aria-live="polite"
      >
        {activeScheduleFilterLabels.length > 0 ? (
          <>
            <span
              className="status-pill status-arrived max-w-[200px] truncate shrink-0"
              title={`Что сейчас отобрано на экране: ${activeScheduleFilterLabels.join(", ")}`}
            >
              Отбор: {activeScheduleFilterLabels.join(", ")}
            </span>
            <button
              className="text-button shrink-0 h-7 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,var(--brand-primary))] text-xs font-medium inline-flex items-center cursor-pointer transition-all"
              type="button"
              onClick={resetScheduleFilters}
            >
              Снять отбор
            </button>
          </>
        ) : null}
        {activeScheduleFilterLabels.length === 0 &&
        (visibleDayGroups?.length ?? 0) > 1 ? (
          <>
            <span className="status-pill status-planned shrink-0">
              Показаны все дни: {visibleDayGroups?.length}
            </span>
            <button
              className="text-button shrink-0 h-7 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal,var(--brand-primary))] text-xs font-medium inline-flex items-center cursor-pointer transition-all"
              type="button"
              onClick={() => setScheduleDateFilter("")}
            >
              Только сегодня
            </button>
          </>
        ) : null}
        {scheduleOverlapCount > 0 ? (
          <span className="status-pill status-cancelled shrink-0" role="alert">
            Наложений: {scheduleOverlapCount}
          </span>
        ) : null}
        {(shiftWarnings || []).map((warning) => (
          <button
            key={warning.id}
            type="button"
            className={`status-pill schedule-warning-chip max-w-[220px] text-left h-7 px-2 inline-flex items-center cursor-pointer shrink-0 ${warning.severity === "critical" ? "status-cancelled" : "status-overdue"}`}
            onClick={() => openScheduleWarning(warning)}
            title={`${warning.title}: ${warning.detail}`}
          >
            <span className="truncate">
              {warning.title} — {warning.actionLabel.toLowerCase()}
            </span>
          </button>
        ))}
      </div>
    );
  }, [
    hasSummaryContent,
    activeScheduleFilterLabels,
    visibleDayGroups?.length,
    scheduleOverlapCount,
    shiftWarnings,
    resetScheduleFilters,
    setScheduleDateFilter,
    openScheduleWarning,
  ]);

  return {
    isNonTodayDateFilter,
    activeScheduleFilterCount,
    activeScheduleFilterLabels,
    hasSummaryContent,
    scheduleFilterSummaryNode,
  };
}
