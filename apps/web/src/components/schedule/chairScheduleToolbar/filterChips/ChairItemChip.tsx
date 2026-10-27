import React from "react";
import type { ChairScheduleToolbarProps } from "../types";
import { ChairItemChipInfo } from "./ChairItemChipInfo";
import { ChairItemChipActions } from "./ChairItemChipActions";

export interface ChairItemChipProps {
  chair: any;
  toolbarProps: ChairScheduleToolbarProps;
}

export function ChairItemChip({ chair, toolbarProps }: ChairItemChipProps) {
  const {
    effectiveSelectedChairId,
    handleToggleChairFilter,
    chairDoctorAssignments,
    dashboard,
    activeShiftChairId,
    setActiveShiftChairId,
    handleEditChair,
  } = toolbarProps;

  const chairColor = (chair as { color?: string }).color || "var(--teal, #0d9488)";
  const isSelected = effectiveSelectedChairId === chair.id;
  const currentAssignment = chairDoctorAssignments?.[chair.id];
  const subShifts = currentAssignment?.subShifts;
  const hasTwoSubShifts = Boolean(subShifts && subShifts.length >= 2);
  const morningSub = hasTwoSubShifts ? subShifts![0] : null;
  const eveningSub = hasTwoSubShifts ? subShifts![1] : null;

  const assignedDocName =
    currentAssignment?.doctorName ||
    ((chair as any).defaultDoctorId
      ? dashboard?.clinicSettings?.staff?.find(
          (s) => s.id === (chair as any).defaultDoctorId,
        )?.fullName
      : null);
  const assignedShiftLabel =
    currentAssignment?.shiftLabel || currentAssignment?.shiftHours || null;
  const roomLabel = (chair as any).roomNumber || (chair as any).room;
  const isRoomAlreadyInName = Boolean(
    roomLabel && (
      chair.name.toLowerCase().includes(`каб. ${String(roomLabel).toLowerCase()}`) ||
      chair.name.toLowerCase().includes(`кабинет ${String(roomLabel).toLowerCase()}`) ||
      chair.name.toLowerCase().includes(`каб ${String(roomLabel).toLowerCase()}`)
    )
  );
  const cleanChairTitle = chair.name.replace(/^Кабинет\s+/i, "Каб. ");
  const displayChairTitle = cleanChairTitle.replace(/\s*\([^)]*\)/g, "").trim() || cleanChairTitle;

  const handleOpenShift = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveShiftChairId((prev) => (prev === chair.id ? null : chair.id));
  };

  return (
    <div
      key={chair.id}
      onClick={() => handleToggleChairFilter(chair.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggleChairFilter(chair.id);
        }
      }}
      tabIndex={0}
      className={`relative px-2.5 py-1 rounded-xl border text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 shrink-0 shadow-2xs transition-all cursor-pointer select-none text-left h-9 min-h-[36px] max-h-[36px] whitespace-nowrap touch-manipulation ${
        isSelected
          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30 bg-[var(--primary-soft)] shadow-sm"
          : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--primary)]/60 hover:bg-[var(--paper-soft)]"
      }`}
      data-testid={`chair-view-badge-${chair.id}`}
      role="button"
      aria-pressed={isSelected}
      title={`Кресло «${chair.name}» (${roomLabel ? `Кабинет ${roomLabel}` : "Кабинет"})${
        hasTwoSubShifts && morningSub && eveningSub
          ? ` • Врачи: У: ${morningSub.doctorName} / В: ${eveningSub.doctorName}`
          : assignedDocName
            ? ` • Врач: ${assignedDocName}`
            : ""
      }${assignedShiftLabel ? ` [${assignedShiftLabel}]` : ""}. Клик: ${
        isSelected ? "снять фильтр" : "фильтр по этому креслу"
      }`}
    >
      <ChairItemChipInfo
        chair={chair}
        chairColor={chairColor}
        isSelected={isSelected}
        displayChairTitle={displayChairTitle}
        roomLabel={roomLabel}
        isRoomAlreadyInName={isRoomAlreadyInName}
        assignedDocName={assignedDocName}
        hasTwoSubShifts={hasTwoSubShifts}
        morningSub={morningSub}
        eveningSub={eveningSub}
        assignedShiftLabel={assignedShiftLabel}
        onOpenShiftPopover={handleOpenShift}
      />
      <ChairItemChipActions
        chair={chair}
        assignedDocName={assignedDocName}
        activeShiftChairId={activeShiftChairId}
        onOpenShiftPopover={handleOpenShift}
        onEditChair={(e) => {
          e.stopPropagation();
          handleEditChair(chair as any);
        }}
        toolbarProps={toolbarProps}
      />
    </div>
  );
}
