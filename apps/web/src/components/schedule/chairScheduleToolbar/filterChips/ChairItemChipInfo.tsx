import React from "react";
import { formatDoctorShortName } from "../../ScheduleGrid";

export interface ChairItemChipInfoProps {
  chair: any;
  chairColor: string;
  isSelected: boolean;
  displayChairTitle: string;
  roomLabel: string | number | null | undefined;
  isRoomAlreadyInName: boolean;
  assignedDocName: string | null | undefined;
  hasTwoSubShifts: boolean;
  morningSub: any;
  eveningSub: any;
  assignedShiftLabel: string | null | undefined;
  onOpenShiftPopover: (e: React.MouseEvent) => void;
}

export function ChairItemChipInfo({
  chair,
  chairColor,
  isSelected,
  displayChairTitle,
  roomLabel,
  isRoomAlreadyInName,
  assignedDocName,
  hasTwoSubShifts,
  morningSub,
  eveningSub,
  assignedShiftLabel,
  onOpenShiftPopover,
}: ChairItemChipInfoProps) {
  return (
    <>
      <div
        className="h-1 w-full absolute top-0 left-0 right-0 rounded-t-xl"
        style={{ backgroundColor: chairColor }}
        data-testid={`chair-view-accent-strip-${chair.id}`}
      />
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${
          isSelected ? "scale-125" : ""
        }`}
        style={{ backgroundColor: chairColor }}
        aria-hidden="true"
      />
      <span
        className="font-bold text-xs whitespace-nowrap shrink-0"
        title={chair.name}
      >
        {displayChairTitle}
      </span>
      {roomLabel && !isRoomAlreadyInName && (
        <span
          className="text-[11px] text-[var(--muted)] font-normal shrink-0 whitespace-nowrap"
          data-testid={`chair-view-room-${chair.id}`}
        >
          ({typeof roomLabel === "string" && roomLabel.startsWith("Каб") ? roomLabel : `Каб. ${roomLabel}`})
        </span>
      )}
      {(assignedDocName || hasTwoSubShifts) && (
        <span
          className="text-[11px] text-[var(--muted)] font-normal whitespace-nowrap hidden 2xl:inline shrink-0"
          title={
            hasTwoSubShifts && morningSub && eveningSub
              ? `У: ${morningSub.doctorName} / В: ${eveningSub.doctorName}`
              : `${assignedDocName}${assignedShiftLabel ? ` • ${assignedShiftLabel}` : ""}`
          }
          data-testid={`chair-view-doc-${chair.id}`}
        >
          {hasTwoSubShifts && morningSub && eveningSub
            ? `(У: ${formatDoctorShortName(morningSub.doctorName)} / В: ${formatDoctorShortName(eveningSub.doctorName)})`
            : `(${formatDoctorShortName(assignedDocName)})`}
        </span>
      )}
      {!assignedDocName && !hasTwoSubShifts && chair.active !== false && (
        <button
          type="button"
          onClick={onOpenShiftPopover}
          className="text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded-lg border border-amber-500/35 shrink-0 cursor-pointer transition-all inline-flex items-center justify-center gap-1 touch-manipulation active:scale-95 shadow-2xs h-7 min-h-[28px] max-h-[32px]"
          title="Кресло свободно (врач не назначен). Нажмите для назначения смены"
          data-testid={`chair-view-unstaffed-badge-${chair.id}`}
        >
          + Врач
        </button>
      )}
      {chair.active === false && (
        <span className="text-xs text-[var(--muted)] font-normal">(архив)</span>
      )}
      {isSelected && (
        <span
          className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[var(--primary)] text-white uppercase tracking-wider shadow-2xs"
          data-testid={`chair-view-badge-selected-${chair.id}`}
        >
          Выбрано
        </span>
      )}
    </>
  );
}
