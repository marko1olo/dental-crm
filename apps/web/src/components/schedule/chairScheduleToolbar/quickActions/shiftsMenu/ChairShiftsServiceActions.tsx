import React from "react";
import { Search, ShieldCheck, XCircle } from "lucide-react";
import type { ChairScheduleToolbarProps } from "../../types";

export interface ChairShiftsServiceActionsProps {
  props: ChairScheduleToolbarProps;
  onCloseMenu: () => void;
}

export function ChairShiftsServiceActions({
  props,
  onCloseMenu,
}: ChairShiftsServiceActionsProps) {
  const {
    handleClearAllDayShifts,
    onOpenDoctorFreeSlots,
    onOpenPreventiveInspection,
    preventiveInspectionCount,
  } = props;

  const btnClass = "w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors cursor-pointer text-left h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px]";

  return (
    <>
      {onOpenDoctorFreeSlots && (
        <button
          type="button"
          onClick={() => {
            onOpenDoctorFreeSlots();
            onCloseMenu();
          }}
          className={btnClass}
          title="Умный подбор свободного времени и окон"
          data-testid="btn-chair-menu-find-slots"
          role="menuitem"
        >
          <Search size={14} className="text-[var(--teal)] shrink-0" />
          <span>Умный подбор времени...</span>
        </button>
      )}

      {onOpenPreventiveInspection && (
        <button
          type="button"
          onClick={() => {
            onOpenPreventiveInspection();
            onCloseMenu();
          }}
          className={btnClass}
          title="Сервисный контроль: осмотры по гарантии (имплантация/протезирование) и профгигиена раз в 6 месяцев"
          data-testid="btn-chair-preventive-inspection"
          role="menuitem"
        >
          <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Осмотры по гарантии (6 мес.)</span>
          {preventiveInspectionCount !== undefined && preventiveInspectionCount > 0 && (
            <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
              {preventiveInspectionCount}
            </span>
          )}
        </button>
      )}

      <div className="border-t border-[var(--line)] my-1" />

      <button
        type="button"
        onClick={() => {
          handleClearAllDayShifts();
          onCloseMenu();
        }}
        className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px]"
        title="Очистить все смены кресел на текущий день"
        data-testid="btn-clear-day-shifts"
        role="menuitem"
      >
        <XCircle size={14} />
        <span>Очистить смены дня</span>
      </button>
    </>
  );
}
