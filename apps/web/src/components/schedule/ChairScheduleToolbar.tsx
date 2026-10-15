/**
 * DENTE Dental CRM — Chair Schedule Toolbar Facade (Layer 5)
 * Decomposed Facade per Mandate 8b (<120 lines facade, submodules <= 800 lines).
 * 100% Behavioral, AST and Test Anchors Parity.
 */

import React from "react";
import {
  ChairScheduleDatePicker,
  ChairScheduleFilterChips,
  ChairScheduleQuickActions,
  type ChairScheduleToolbarProps,
} from "./chairScheduleToolbar/index";

export type { ChairScheduleToolbarProps };
export * from "./chairScheduleToolbar/index";

export function ChairScheduleToolbar(props: ChairScheduleToolbarProps) {
  return (
    <div
      className="flex items-center justify-between px-3 h-12 min-h-[48px] max-h-[52px] border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-2 select-none flex-nowrap"
      data-testid="chair-schedule-palette-strip"
      role="toolbar"
      aria-label="Панель стоматологических установок и смен врачей"
    >
      {/* Date Navigation (Optional Compact Stepper) */}
      {props.onDateChange && (
        <ChairScheduleDatePicker
          dateKey={props.dateKey}
          onDateChange={props.onDateChange}
        />
      )}

      {/* Cabinets, Chairs and Duty Doctor Filter Chips */}
      <ChairScheduleFilterChips {...props} />

      {/* Density Switcher, Shift Batch Actions & Quick CTAs */}
      <ChairScheduleQuickActions {...props} />
    </div>
  );
}
