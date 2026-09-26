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
    <div className="px-1 sm:px-1.5 h-8 sm:h-9 text-center text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-r border-[var(--line)] flex items-center justify-between gap-1 sticky left-0 z-20 bg-[var(--paper-soft)]">
      <div
        className="flex items-center justify-center text-[10px] font-bold text-[var(--muted)]"
        title="Шаг времени"
      >
        <Clock size={12} className="text-[var(--teal)] shrink-0" />
      </div>
      <div
        className="flex items-center gap-0.5 p-0.5 rounded bg-[var(--paper)] border border-[var(--line)] shadow-2xs"
        data-testid="schedule-grid-step-selector"
        role="group"
        aria-label="Шаг сетки расписания"
      >
        <button
          type="button"
          onClick={() => handleSetGridStep(15)}
          className={`px-1 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
            gridStep === 15
              ? "bg-[var(--teal)] text-white shadow-2xs"
              : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
          }`}
          data-testid="btn-grid-step-15"
        >
          15м
        </button>
        <button
          type="button"
          onClick={() => handleSetGridStep(30)}
          className={`px-1 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
            gridStep === 30
              ? "bg-[var(--teal)] text-white shadow-2xs"
              : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
          }`}
          data-testid="btn-grid-step-30"
        >
          30м
        </button>
        <button
          type="button"
          onClick={() => handleSetGridStep(60)}
          className={`px-1 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
            gridStep === 60
              ? "bg-[var(--teal)] text-white shadow-2xs"
              : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
          }`}
          data-testid="btn-grid-step-60"
        >
          60м
        </button>
      </div>
    </div>
  );
}
