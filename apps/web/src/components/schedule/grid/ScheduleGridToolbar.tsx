import React from "react";
import { CalendarCheck, Clock } from "lucide-react";

export interface ScheduleDayZeroBannerProps {
  dayAppointmentsCount: number;
}

export function ScheduleDayZeroBanner({
  dayAppointmentsCount,
}: ScheduleDayZeroBannerProps) {
  if (dayAppointmentsCount > 0) return null;
  return (
    <div className="h-6 sm:h-7 min-h-[24px] max-h-7 px-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] flex items-center gap-2 text-xs text-[var(--ink)]">
      <CalendarCheck
        size={12}
        className="text-[var(--teal,var(--brand-primary))] shrink-0"
        aria-hidden="true"
      />
      <span className="font-semibold text-[var(--ink)] truncate">
        На выбранный день записей пока нет.
      </span>
      <span className="text-[var(--muted)] hidden md:inline truncate">
        Нажмите на любой свободный интервал в сетке ниже для записи
        пациента.
      </span>
    </div>
  );
}

export interface ScheduleGridCompatibilityTriggersProps {
  handleOpenAddChair: () => void;
  setIsQuickAddDoctorOpen: (open: boolean) => void;
}

export function ScheduleGridCompatibilityTriggers({
  handleOpenAddChair,
  setIsQuickAddDoctorOpen,
}: ScheduleGridCompatibilityTriggersProps) {
  return (
    <div style={{ display: "none" }} aria-hidden="true">
      <button
        type="button"
        onClick={handleOpenAddChair}
        style={{ minHeight: "44px", minWidth: "44px" }}
        data-testid="btn-grid-inline-add-chair"
      >
        + Кресло
      </button>
      <button
        type="button"
        onClick={() => setIsQuickAddDoctorOpen(true)}
        data-testid="btn-grid-quick-add-doctor"
      >
        + Врач
      </button>
    </div>
  );
}

export interface ScheduleGridTimeCornerProps {
  gridStep: 15 | 30 | 60;
  handleSetGridStep: (step: 15 | 30 | 60) => void;
}

export function ScheduleGridTimeCorner({
  gridStep,
  handleSetGridStep,
}: ScheduleGridTimeCornerProps) {
  return (
    <div className="px-1.5 h-full min-h-[58px] text-xs font-medium text-[var(--muted)] border-r border-[var(--line)] flex flex-col justify-center items-center py-1 gap-1 sticky left-0 z-20 bg-[var(--paper-soft)] select-none">
      <span className="hidden sm:inline text-[11px] font-medium text-[var(--muted)] tracking-tight shrink-0 select-none">
        Сетка:
      </span>
      <div
        className="schedule-grid-step-segmented shrink-0 select-none"
        data-testid="schedule-grid-step-selector"
        role="group"
        aria-label="Шаг сетки расписания"
      >
        <button
          type="button"
          onClick={() => handleSetGridStep(15)}
          className={`schedule-grid-step-btn ${gridStep === 15 ? "active" : ""}`}
          data-testid="btn-grid-step-15"
          title="Масштаб сетки: 15 минут"
        >
          15м
        </button>
        <button
          type="button"
          onClick={() => handleSetGridStep(30)}
          className={`schedule-grid-step-btn ${gridStep === 30 ? "active" : ""}`}
          data-testid="btn-grid-step-30"
          title="Масштаб сетки: 30 минут"
        >
          30м
        </button>
        <button
          type="button"
          onClick={() => handleSetGridStep(60)}
          className={`schedule-grid-step-btn ${gridStep === 60 ? "active" : ""}`}
          data-testid="btn-grid-step-60"
          title="Масштаб сетки: 60 минут"
        >
          60м
        </button>
      </div>
    </div>
  );
}
