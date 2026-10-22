import React from "react";
import { Moon, Sun } from "lucide-react";
import { DecoupledDragGhost } from "../DecoupledDragGhost";
import type {
  ScheduleAppointmentTrackProps,
  AppointmentTrackController,
} from "./types";
import {
  DEFAULT_EMPTY_SLOT_CELL_DATA,
  calcSlotStartMin,
} from "./appointmentTrackUtils";
import { AppointmentTimeSlotCell } from "./AppointmentTimeSlotCell";
import { ScheduleCurrentTimeIndicator } from "../ScheduleCurrentTimeIndicator";

export interface AppointmentTrackGridLinesProps {
  props: ScheduleAppointmentTrackProps;
  controller: AppointmentTrackController;
}

export function AppointmentTrackGridLines({
  props,
  controller,
}: AppointmentTrackGridLinesProps) {
  const renderedApptIds = new Set<string>();
  const {
    canSplitShift,
    morningSlots,
    eveningSlots,
    baseSlotHeightPx,
    effectiveDensityMode,
    handleSlotDrop,
  } = controller;

  if (canSplitShift) {
    const chair = props.effectiveChairs[0];
    return (
      <>
        <DecoupledDragGhost />
        <div
          className="schedule-split-day-track grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--line)] border-b border-[var(--line)] bg-[var(--paper)]"
          data-testid="schedule-split-day-track"
        >
          {/* Morning Shift (08:00 — 14:00) */}
          <div className="schedule-shift-subtrack flex flex-col min-w-0">
            <div className="schedule-shift-header schedule-shift-header-morning">
              <span className="flex items-center gap-1.5">
                <Sun size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>1-я смена / Утро (08:00 — 14:00)</span>
              </span>
              <span className="text-[10px] text-[var(--muted)] font-medium">
                {morningSlots.length} слотов · {props.gridStep} мин
              </span>
            </div>
            <div
              className="schedule-grid-container grid min-w-full"
              style={{
                gridTemplateColumns: "clamp(64px, 5vw, 84px) 1fr",
                gridTemplateRows: `repeat(${morningSlots.length}, minmax(${baseSlotHeightPx}px, auto))`,
              }}
            >
              {morningSlots.map((hour, hIndex) => (
                <div
                  key={`morning-time-${hour}`}
                  className="schedule-time-label px-1.5 sm:px-2 py-1 text-center text-xs font-bold text-[var(--muted)] border-r border-b border-[var(--line)] sticky left-0 z-10 bg-[var(--paper)] select-none flex items-center justify-center"
                  style={{ gridColumn: 1, gridRow: hIndex + 1, minHeight: `${baseSlotHeightPx}px` }}
                >
                  {hour}
                </div>
              ))}
              {morningSlots.map((hour, hIndex) => {
                const slotStartMin = calcSlotStartMin(hour);
                const cellData =
                  props.chairSlotCellMap.get(`${chair.id}_${slotStartMin}`) ??
                  props.EMPTY_SLOT_CELL_DATA ??
                  DEFAULT_EMPTY_SLOT_CELL_DATA;
                return (
                  <AppointmentTimeSlotCell
                    key={`morning-slot-${chair.id}-${hour}`}
                    hour={hour}
                    hIndex={hIndex}
                    chair={chair}
                    chairIndex={0}
                    slotsList={morningSlots}
                    isLastCol={true}
                    colIndex={2}
                    cellData={cellData}
                    renderedApptIds={renderedApptIds}
                    onSlotDrop={handleSlotDrop}
                    effectiveDensityMode={effectiveDensityMode}
                    props={props}
                  />
                );
              })}
              <ScheduleCurrentTimeIndicator
                timeSlots={morningSlots}
                gridStep={props.gridStep}
                dateKey={props.dateKey}
                timezone={props.timezone}
                baseSlotHeightPx={baseSlotHeightPx}
                leftOffset="clamp(64px, 5vw, 84px)"
              />
            </div>
          </div>

          {/* Evening Shift (14:00 — 20:00) */}
          <div className="schedule-shift-subtrack flex flex-col min-w-0">
            <div className="schedule-shift-header schedule-shift-header-evening">
              <span className="flex items-center gap-1.5">
                <Moon size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>2-я смена / Вечер (14:00 — 20:00)</span>
              </span>
              <span className="text-[10px] text-[var(--muted)] font-medium">
                {eveningSlots.length} слотов · {props.gridStep} мин
              </span>
            </div>
            <div
              className="schedule-grid-container grid min-w-full"
              style={{
                gridTemplateColumns: "clamp(64px, 5vw, 84px) 1fr",
                gridTemplateRows: `repeat(${eveningSlots.length}, minmax(${baseSlotHeightPx}px, auto))`,
              }}
            >
              {eveningSlots.map((hour, hIndex) => (
                <div
                  key={`evening-time-${hour}`}
                  className="schedule-time-label px-1.5 sm:px-2 py-1 text-center text-xs font-bold text-[var(--muted)] border-r border-b border-[var(--line)] sticky left-0 z-10 bg-[var(--paper)] select-none flex items-center justify-center"
                  style={{ gridColumn: 1, gridRow: hIndex + 1, minHeight: `${baseSlotHeightPx}px` }}
                >
                  {hour}
                </div>
              ))}
              {eveningSlots.map((hour, hIndex) => {
                const slotStartMin = calcSlotStartMin(hour);
                const cellData =
                  props.chairSlotCellMap.get(`${chair.id}_${slotStartMin}`) ??
                  props.EMPTY_SLOT_CELL_DATA ??
                  DEFAULT_EMPTY_SLOT_CELL_DATA;
                return (
                  <AppointmentTimeSlotCell
                    key={`evening-slot-${chair.id}-${hour}`}
                    hour={hour}
                    hIndex={hIndex}
                    chair={chair}
                    chairIndex={0}
                    slotsList={eveningSlots}
                    isLastCol={true}
                    colIndex={2}
                    cellData={cellData}
                    renderedApptIds={renderedApptIds}
                    onSlotDrop={handleSlotDrop}
                    effectiveDensityMode={effectiveDensityMode}
                    props={props}
                  />
                );
              })}
              <ScheduleCurrentTimeIndicator
                timeSlots={eveningSlots}
                gridStep={props.gridStep}
                dateKey={props.dateKey}
                timezone={props.timezone}
                baseSlotHeightPx={baseSlotHeightPx}
                leftOffset="clamp(64px, 5vw, 84px)"
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Multi-chair panoramic grid (all chairs side by side 1fr 1fr ...)
  return (
    <>
      <DecoupledDragGhost />
      <div
        className="schedule-grid-container grid min-w-full relative"
        style={{
          minWidth:
            props.effectiveChairs.length > 1
              ? `${Math.max(260, 72 + props.effectiveChairs.length * 220)}px`
              : undefined,
          gridTemplateColumns: `clamp(68px, 5.5vw, 76px) repeat(${props.effectiveChairs.length}, minmax(180px, 1fr))`,
          gridTemplateRows: `repeat(${props.timeSlots.length}, minmax(${baseSlotHeightPx}px, auto))`,
        }}
      >
        {/* 1. Time Column Labels (Column 1) */}
        {props.timeSlots.map((hour, hIndex) => (
          <div
            key={`time-${hour}`}
            className="schedule-time-label px-1.5 sm:px-2 py-1 sm:py-1.5 text-center text-xs font-bold text-[var(--muted)] border-r border-b border-[var(--line)] sticky left-0 z-10 bg-[var(--paper)] select-none flex items-center justify-center"
            style={{
              gridColumn: 1,
              gridRow: hIndex + 1,
              minHeight: `${baseSlotHeightPx}px`,
            }}
          >
            {hour}
          </div>
        ))}

        {/* 2. Chair Grid Cells (Columns 2 .. effectiveChairs.length + 1) */}
        {props.timeSlots.map((hour, hIndex) => {
          const slotStartMin = calcSlotStartMin(hour);
          return props.effectiveChairs.map((chair, chairIndex) => {
            const colIndex = chairIndex + 2;
            const isLastCol = chairIndex === props.effectiveChairs.length - 1;
            const cellData =
              props.chairSlotCellMap.get(`${chair.id}_${slotStartMin}`) ??
              props.EMPTY_SLOT_CELL_DATA ??
              DEFAULT_EMPTY_SLOT_CELL_DATA;
            return (
              <AppointmentTimeSlotCell
                key={`panoramic-slot-${chair.id}-${hour}`}
                hour={hour}
                hIndex={hIndex}
                chair={chair}
                chairIndex={chairIndex}
                slotsList={props.timeSlots}
                isLastCol={isLastCol}
                colIndex={colIndex}
                cellData={cellData}
                renderedApptIds={renderedApptIds}
                onSlotDrop={handleSlotDrop}
                effectiveDensityMode={effectiveDensityMode}
                props={props}
              />
            );
          });
        })}

        {/* 3. StomX-Parity Red Current Time Indicator Line */}
        <ScheduleCurrentTimeIndicator
          timeSlots={props.timeSlots}
          gridStep={props.gridStep}
          dateKey={props.dateKey}
          timezone={props.timezone}
          baseSlotHeightPx={baseSlotHeightPx}
          leftOffset="clamp(68px, 5.5vw, 76px)"
        />
      </div>
    </>
  );
}
