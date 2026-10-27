import React from "react";
import { Calendar, CalendarRange, Copy, Layers, Pin } from "lucide-react";
import type { ChairScheduleToolbarProps } from "../../types";

export interface ChairShiftsCopyActionsProps {
  props: ChairScheduleToolbarProps;
  onCloseMenu: () => void;
}

export function ChairShiftsCopyActions({ props, onCloseMenu }: ChairShiftsCopyActionsProps) {
  const {
    handleCopyTodayShiftsToCurrentWeek,
    handleCopyTodayShiftsToMonth,
    handleRotateChairShifts,
    handleApplyDoctorPreferredChairs,
    handleCopyWeekShiftsToNextWeek,
    setIsDateRangeModalOpen,
  } = props;

  const btnClass = "w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px]";

  return (
    <>
      <button
        type="button"
        onClick={() => { handleCopyTodayShiftsToCurrentWeek(false); onCloseMenu(); }}
        className={btnClass}
        title="Скопировать график смен кресел на текущую неделю (Пн–Вс, 7 дней)"
        data-testid="btn-copy-chair-week-current"
        role="menuitem"
      >
        <Calendar size={14} className="text-[var(--teal)] shrink-0" />
        <span>На неделю (Пн–Вс)</span>
      </button>

      <button
        type="button"
        onClick={() => { handleCopyTodayShiftsToCurrentWeek(true); onCloseMenu(); }}
        className={btnClass}
        title="Скопировать график смен кресел на будни (Пн–Пт, 5 дней)"
        data-testid="btn-copy-chair-week-workdays"
        role="menuitem"
      >
        <Calendar size={14} className="text-[var(--teal)] shrink-0" />
        <span>На будни (Пн–Пт)</span>
      </button>

      <button
        type="button"
        onClick={() => { handleCopyTodayShiftsToMonth(); onCloseMenu(); }}
        className={btnClass}
        title="Скопировать график смен кресел на весь текущий месяц"
        data-testid="btn-copy-chair-month"
        role="menuitem"
      >
        <CalendarRange size={14} className="text-[var(--teal)] shrink-0" />
        <span>На месяц</span>
      </button>

      <button
        type="button"
        onClick={() => { handleRotateChairShifts(); onCloseMenu(); }}
        className={btnClass}
        title="Циклическая ротация смен между креслами"
        data-testid="btn-rotate-chair-shifts"
        role="menuitem"
      >
        <Layers size={14} className="text-[var(--teal)] shrink-0" />
        <span>Ротация кресел</span>
      </button>

      <button
        type="button"
        onClick={() => { handleApplyDoctorPreferredChairs(); onCloseMenu(); }}
        className={btnClass}
        title="Назначить закреплённых врачей на все кресла дня"
        data-testid="btn-apply-preferred-chairs"
        role="menuitem"
      >
        <Pin size={14} className="text-[var(--teal)] shrink-0" />
        <span>Применить закрепления</span>
      </button>

      <button
        type="button"
        onClick={() => { handleCopyWeekShiftsToNextWeek(); onCloseMenu(); }}
        className={btnClass}
        title="Скопировать график смен кресел на следующую неделю (+7 дней)"
        data-testid="btn-copy-chair-week-next"
        role="menuitem"
      >
        <Copy size={14} className="text-[var(--teal)] shrink-0" />
        <span>На след. неделю</span>
      </button>

      <button
        type="button"
        onClick={() => { setIsDateRangeModalOpen(true); onCloseMenu(); }}
        className={btnClass}
        title="Назначить смену на диапазон дат"
        data-testid="btn-assign-date-range"
        role="menuitem"
      >
        <CalendarRange size={14} className="text-[var(--teal)] shrink-0" />
        <span>На диапазон дат...</span>
      </button>
    </>
  );
}
