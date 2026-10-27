import React from "react";
import { Settings2, UserCheck } from "lucide-react";
import { ChairShiftPopover } from "../../ChairShiftPopover";
import type { ChairScheduleToolbarProps } from "../types";

export interface ChairItemChipActionsProps {
  chair: any;
  assignedDocName: string | null | undefined;
  activeShiftChairId: string | null | undefined;
  onOpenShiftPopover: (e: React.MouseEvent) => void;
  onEditChair: (e: React.MouseEvent) => void;
  toolbarProps: ChairScheduleToolbarProps;
}

export function ChairItemChipActions({
  chair,
  assignedDocName,
  activeShiftChairId,
  onOpenShiftPopover,
  onEditChair,
  toolbarProps,
}: ChairItemChipActionsProps) {
  const {
    popoverRef,
    setActiveShiftChairId,
    doctors,
    popoverSelectedDocId,
    setPopoverSelectedDocId,
    chairDoctorAssignments,
    dateKey,
    onAssignChairDoctor,
    handleAssignShift,
    handleUnassignShift,
    handleDuplicateChair,
    isSubstituteOpen,
    setIsSubstituteOpen,
    handleQuickSubstituteDoctor,
  } = toolbarProps;

  return (
    <>
      {/* Кнопка настройки смены и врача */}
      {assignedDocName ? (
        <button
          type="button"
          onClick={onOpenShiftPopover}
          className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0 touch-manipulation"
          title="Изменить врача и смену"
          data-testid={`chair-view-assign-doctor-${chair.id}`}
          aria-label={`Изменить врача на кресле ${chair.name}`}
        >
          <UserCheck size={14} className="text-[var(--primary)]" />
        </button>
      ) : (
        <button
          type="button"
          style={{ display: "none" }}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onClick={onOpenShiftPopover}
          data-testid={`chair-view-assign-doctor-${chair.id}`}
          aria-label={`Назначить врача на кресло ${chair.name}`}
        />
      )}

      {/* Settings Button */}
      <button
        type="button"
        onClick={onEditChair}
        className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0 touch-manipulation"
        title={`Настройки кресла «${chair.name}» (смена врача / кабинета)`}
        data-testid={`chair-view-settings-${chair.id}`}
        aria-label={`Настройки кресла ${chair.name}`}
      >
        <Settings2 size={14} />
      </button>

      {/* 1-Click Shift Popover */}
      {activeShiftChairId === chair.id && (
        <ChairShiftPopover
          chair={chair}
          popoverRef={popoverRef}
          onClose={() => setActiveShiftChairId(null)}
          doctors={doctors}
          popoverSelectedDocId={popoverSelectedDocId}
          setPopoverSelectedDocId={setPopoverSelectedDocId}
          chairDoctorAssignments={chairDoctorAssignments}
          dateKey={dateKey}
          onAssignChairDoctor={onAssignChairDoctor}
          handleAssignShift={handleAssignShift}
          handleUnassignShift={handleUnassignShift}
          handleDuplicateChair={handleDuplicateChair}
          isSubstituteOpen={isSubstituteOpen}
          setIsSubstituteOpen={setIsSubstituteOpen}
          handleQuickSubstituteDoctor={handleQuickSubstituteDoctor}
        />
      )}
    </>
  );
}
