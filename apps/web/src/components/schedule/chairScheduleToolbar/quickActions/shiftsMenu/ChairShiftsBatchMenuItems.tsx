import React from "react";
import type { ChairScheduleToolbarProps } from "../../types";
import { ChairShiftsCopyActions } from "./ChairShiftsCopyActions";
import { ChairShiftsServiceActions } from "./ChairShiftsServiceActions";

export interface ChairShiftsBatchMenuItemsProps {
  props: ChairScheduleToolbarProps;
  onCloseMenu: () => void;
}

export function ChairShiftsBatchMenuItems({
  props,
  onCloseMenu,
}: ChairShiftsBatchMenuItemsProps) {
  return (
    <>
      <div className="px-2 py-1 text-[11px] font-semibold text-[var(--muted)] border-b border-[var(--line)] mb-1">
        Пакетное управление сменами
      </div>
      <ChairShiftsCopyActions props={props} onCloseMenu={onCloseMenu} />
      <ChairShiftsServiceActions props={props} onCloseMenu={onCloseMenu} />
    </>
  );
}
