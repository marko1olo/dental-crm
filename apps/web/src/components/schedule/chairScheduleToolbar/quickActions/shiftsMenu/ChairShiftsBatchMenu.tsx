import React from "react";
import { SlidersHorizontal } from "lucide-react";
import type { ChairScheduleToolbarProps } from "../../types";
import { ChairShiftsBatchMenuItems } from "./ChairShiftsBatchMenuItems";

export interface ChairShiftsBatchMenuProps {
  props: ChairScheduleToolbarProps;
  onBeforeOpen?: () => void;
}

export function ChairShiftsBatchMenu({
  props,
  onBeforeOpen,
}: ChairShiftsBatchMenuProps) {
  const { isShiftsMenuOpen, setIsShiftsMenuOpen, shiftsMenuRef } = props;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsShiftsMenuOpen((prev) => !prev);
          onBeforeOpen?.();
        }}
        className="secondary-button"
        title="Пакетные действия со сменами (копирование, ротация, закрепления, очистка)"
        data-testid="btn-chair-shifts-menu-trigger"
        aria-expanded={isShiftsMenuOpen}
        aria-haspopup="true"
      >
        <SlidersHorizontal size={14} className="text-[var(--teal)] shrink-0" />
        <span>Смены...</span>
      </button>

      {/* Dropdown container: Always present in DOM for test compatibility */}
      <div
        ref={shiftsMenuRef}
        data-testid="chair-shifts-dropdown-menu"
        className={`absolute right-0 top-full mt-1.5 z-50 w-64 p-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100 ${
          isShiftsMenuOpen ? "flex" : "hidden"
        }`}
        role="menu"
        aria-label="Меню действий со сменами"
      >
        <ChairShiftsBatchMenuItems
          props={props}
          onCloseMenu={() => setIsShiftsMenuOpen(false)}
        />
      </div>
    </div>
  );
}
