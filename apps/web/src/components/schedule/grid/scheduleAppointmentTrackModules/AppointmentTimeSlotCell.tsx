import React from "react";
import { Clock, Plus, Zap } from "lucide-react";
import { getStomxWorkplacePalette } from "@dental/shared";
import type { ScheduleDensityMode } from "../../useScheduleState";
import type { ScheduleAppointmentTrackProps, SlotCellData } from "./types";
import { calcAppointmentsSpan } from "./appointmentTrackUtils";
import {
  ChairMaintenanceCard,
  TrackAppointmentCard,
} from "./AppointmentTrackCardOverlay";

export interface AppointmentTimeSlotCellProps {
  hour: string;
  hIndex: number;
  chair: any;
  chairIndex: number;
  slotsList: string[];
  isLastCol: boolean;
  colIndex: number;
  cellData: SlotCellData;
  renderedApptIds: Set<string>;
  onSlotDrop: (e: React.DragEvent, chair: any, hour: string) => void;
  effectiveDensityMode: ScheduleDensityMode;
  props: ScheduleAppointmentTrackProps;
}

export function AppointmentTimeSlotCell({
  hour,
  hIndex,
  chair,
  chairIndex,
  slotsList,
  isLastCol,
  colIndex,
  cellData,
  renderedApptIds,
  onSlotDrop,
  effectiveDensityMode,
  props,
}: AppointmentTimeSlotCellProps) {
  const rowIndex = hIndex + 1;
  const chairPalette = getStomxWorkplacePalette(
    (chair as any).colorId ?? chair.id ?? chairIndex,
  );
  const { cellAppointments, continuingAppointments, cellMaintenance } = cellData;

  // Case A: Appointments or maintenance starting in this slot
  if (cellAppointments.length > 0 || cellMaintenance.length > 0) {
    for (const a of cellAppointments) {
      renderedApptIds.add(a.id);
    }

    const clampedSpan = calcAppointmentsSpan(
      cellAppointments,
      props.gridStep,
      slotsList.length,
      hIndex,
    );

    const isCellHovered = cellAppointments.some(
      (a) =>
        props.hoveredApptId === a.id ||
        props.activeMenuApptId === a.id ||
        props.activeStatusPickerApptId === a.id,
    );

    return (
      <div
        key={`occupied-${chair.id}-${hour}`}
        className={`p-1 border-b border-[var(--line)] ${isLastCol ? "" : "border-r"} space-y-1 relative h-full flex flex-col`}
        style={{
          gridColumn: colIndex,
          gridRow: `${rowIndex} / span ${clampedSpan}`,
          zIndex: isCellHovered ? 60 : 10,
          ["--slot-position" as any]: hIndex,
          ["--slot-size" as any]: clampedSpan,
          ["--slot-step" as any]: props.gridStep,
        }}
        data-chair-id={chair.id}
        data-chair-palette={chairPalette.nameRu}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => onSlotDrop(e, chair, hour)}
      >
        {cellMaintenance.map((mBlock) => (
          <ChairMaintenanceCard
            key={mBlock.id}
            mBlock={mBlock}
            chairId={chair.id}
            onRemove={props.handleRemoveMaintenance}
          />
        ))}
        {cellAppointments.map((a) => {
          const isNearBottom = hIndex >= slotsList.length - 4;
          const isNearRightEdge =
            chairIndex >= props.effectiveChairs.length - 1 &&
            props.effectiveChairs.length > 1;
          return (
            <TrackAppointmentCard
              key={a.id}
              appointment={a}
              chair={chair}
              isNearBottom={isNearBottom}
              isNearRightEdge={isNearRightEdge}
              effectiveDensityMode={effectiveDensityMode}
              props={props}
            />
          );
        })}
      </div>
    );
  }

  // Case B: Continuing appointment check
  const unrenderedContinuing = continuingAppointments.filter(
    (cA) => !renderedApptIds.has(cA.id),
  );
  if (continuingAppointments.length > 0 && unrenderedContinuing.length === 0) {
    return null;
  }

  if (unrenderedContinuing.length > 0) {
    for (const a of unrenderedContinuing) {
      renderedApptIds.add(a.id);
    }

    const clampedSpan = calcAppointmentsSpan(
      unrenderedContinuing,
      props.gridStep,
      slotsList.length,
      hIndex,
    );

    const isContinuingHovered = unrenderedContinuing.some(
      (a) =>
        props.hoveredApptId === a.id ||
        props.activeMenuApptId === a.id ||
        props.activeStatusPickerApptId === a.id,
    );

    return (
      <div
        key={`continuing-start-${chair.id}-${hour}`}
        className={`p-1 border-b border-[var(--line)] ${isLastCol ? "" : "border-r"} space-y-1 relative h-full flex flex-col`}
        style={{
          gridColumn: colIndex,
          gridRow: `${rowIndex} / span ${clampedSpan}`,
          zIndex: isContinuingHovered ? 60 : 10,
          ["--slot-position" as any]: hIndex,
          ["--slot-size" as any]: clampedSpan,
          ["--slot-step" as any]: props.gridStep,
        }}
        data-chair-id={chair.id}
        data-chair-palette={chairPalette.nameRu}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => onSlotDrop(e, chair, hour)}
      >
        {unrenderedContinuing.map((a) => {
          const isNearBottom = hIndex >= slotsList.length - 4;
          const isNearRightEdge =
            chairIndex >= props.effectiveChairs.length - 1 &&
            props.effectiveChairs.length > 1;
          return (
            <TrackAppointmentCard
              key={a.id}
              appointment={a}
              chair={chair}
              isNearBottom={isNearBottom}
              isNearRightEdge={isNearRightEdge}
              effectiveDensityMode={effectiveDensityMode}
              props={props}
            />
          );
        })}
      </div>
    );
  }

  // Case C: Empty cell with 1-click booking & Drop handler
  const assignedDocId = props.getDoctorForChairAndHour(chair.id, hour);
  const slotDocId = assignedDocId || props.selectedDoctorId || null;
  const slotDocName =
    props.dashboard?.clinicSettings?.staff?.find((m) => m.id === slotDocId)
      ?.fullName ||
    props.effectiveChairAssignments[chair.id]?.doctorName ||
    undefined;

  const isEmergencyBuffer = props.emergencyReserveSlots.some((r) => {
    const rHour = props.toDateTimeLocalValue(r.startTime, props.timezone).slice(11, 13);
    return rHour === hour.slice(0, 2);
  });

  const hasDoctorForDay = Boolean(
    props.effectiveChairAssignments[chair.id]?.doctorId,
  );
  const isOffDuty = hasDoctorForDay && !assignedDocId;

  return (
    <div
      key={`empty-${chair.id}-${hour}`}
      className={`p-0.5 sm:p-1 border-b border-[var(--line)] ${isLastCol ? "" : "border-r"} min-h-[52px] flex items-center justify-center hover:bg-[var(--paper-soft)]/50 transition-colors`}
      style={{
        gridColumn: colIndex,
        gridRow: rowIndex,
        ["--slot-position" as any]: hIndex,
        ["--slot-size" as any]: 1,
        ["--slot-step" as any]: props.gridStep,
      }}
      data-chair-id={chair.id}
      data-chair-palette={chairPalette.nameRu}
      data-tour="schedule-slot"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => onSlotDrop(e, chair, hour)}
    >
      {isEmergencyBuffer ? (
        <button
          type="button"
          onClick={() =>
            props.onSlotClick({
              dateKey: props.dateKey,
              startTime: hour,
              chairId: chair.id,
              doctorUserId: slotDocId,
              doctorName: slotDocName,
              durationMinutes: 30,
              reason: "Острая боль (Срочный резерв)",
            })
          }
          className="w-full h-full min-h-[30px] sm:min-h-[32px] rounded-lg border border-dashed border-amber-500/70 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-center gap-1.5 px-2 cursor-pointer transition-all shadow-2xs"
          title={`Экстренный резерв (срочно): ${hour} (${chair.name}). Буфер 30 мин для пациентов с острой болью`}
          aria-label={`Экстренный резерв на ${hour}, кресло ${chair.name}. Буфер 30 минут для пациентов с острой болью`}
          data-testid="schedule-emergency-buffer-slot"
        >
          <Zap
            size={13}
            className="text-amber-600 dark:text-amber-400 animate-pulse shrink-0"
          />
          <span className="text-[11px] font-bold whitespace-nowrap shrink-0">
            Острая боль • Резерв ({hour})
          </span>
        </button>
      ) : isOffDuty ? (
        <button
          type="button"
          onClick={() =>
            props.onSlotClick({
              dateKey: props.dateKey,
              startTime: hour,
              chairId: chair.id,
              doctorUserId: props.selectedDoctorId || null,
              doctorName: props.selectedDoctorId
                ? props.dashboard?.clinicSettings?.staff?.find(
                    (m) => m.id === props.selectedDoctorId,
                  )?.fullName
                : undefined,
              durationMinutes: 30,
            })
          }
          className="schedule-slot-hatched schedule-slot--off-duty w-full h-full min-h-[30px] sm:min-h-[32px] rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/40 hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1 px-2 cursor-pointer transition-colors"
          title={`Вне графика смены врача на ${hour} (${chair.name}). Нажмите для записи`}
          aria-label={`Вне графика врача на ${hour}, кресло ${chair.name}`}
          data-testid={`btn-slot-${chair.id}-${hour.replace(":", "")}`}
        >
          <Clock size={11} className="opacity-50 shrink-0" />
          <span className="text-[10px] text-[var(--muted)]">
            Вне смены ({hour})
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            props.onSlotClick({
              dateKey: props.dateKey,
              startTime: hour,
              chairId: chair.id,
              doctorUserId: slotDocId,
              doctorName: slotDocName,
              durationMinutes: 30,
            })
          }
          className="schedule-empty-slot-btn group w-full h-full min-h-[30px] sm:min-h-[32px] rounded-lg border border-transparent hover:border-dashed hover:border-[var(--teal)]/60 bg-transparent hover:bg-[var(--teal)]/[0.04] flex items-center justify-center gap-1 px-2 cursor-pointer transition-all"
          title={`Записать на ${hour} (${chair.name})`}
          aria-label={`Свободно на ${hour}, кресло ${chair.name}. Нажмите для быстрой записи`}
          data-testid={`btn-slot-${chair.id}-${hour.replace(":", "")}`}
          data-tour="schedule-slot"
        >
          <Plus
            size={13}
            className="text-[var(--teal)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shrink-0"
          />
          <span className="text-[11px] font-semibold whitespace-nowrap shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 text-[var(--teal)] transition-opacity">
            Записать на {hour}
          </span>
        </button>
      )}
    </div>
  );
}
