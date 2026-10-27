import React from "react";
import { getWorkplaceChairPalette } from "@dental/shared";
import { ScheduleChairDoctorPopover } from "./ScheduleChairDoctorPopover";
import { ScheduleChairMaintenancePopover } from "./ScheduleChairMaintenancePopover";
import { ScheduleChairDutySection } from "./ScheduleChairDutySection";
import { ScheduleChairHeaderTopBar } from "./ScheduleChairHeaderTopBar";
import { ScheduleChairHeaderHiddenButtons } from "./ScheduleChairHeaderHiddenButtons";
import { ScheduleChairHeaderSelects } from "./ScheduleChairHeaderSelects";
import type { ScheduleChairHeaderProps } from "./scheduleChairHeaderTypes";

export { type ScheduleChairHeaderProps };

export function ScheduleChairHeader(props: ScheduleChairHeaderProps) {
  const {
    chair, chairIndex, effectiveChairAssignments, doctors, suggestedDoctor, isSoloDoctor,
    dateKey, dashboard, isToday, currentHour, activeHeaderDoctorPopoverChairId,
    setActiveHeaderDoctorPopoverChairId, activeHeaderMaintenanceChairId,
    setActiveHeaderMaintenanceChairId, onEditChair, openAssignModal,
    handleConfirmAssignDoctor, handleUnassignDoctor, handleAssignDoctorWeek,
    handleAssignDoctorMonth, handleQuickSubstituteDoctor, handleBindDoctorToChair,
    handleAddMaintenance,
  } = props;

  const assignment = effectiveChairAssignments[chair.id];
  const hasDoctor = Boolean(assignment && assignment.doctorId);
  const chairPalette = getWorkplaceChairPalette((chair as any).colorId ?? chair.id ?? chairIndex);
  const chairAccentColor = chair.color || chairPalette.bright_code;

  return (
    <div
      key={chair.id}
      className="px-2.5 py-1.5 text-xs border-r border-[var(--line)] last:border-r-0 flex flex-col justify-start gap-1.5 relative overflow-hidden bg-[var(--paper-soft)] select-none"
      data-testid={`chair-header-${chair.id}`}
      data-chair-palette={chairPalette.nameRu}
    >
      <ScheduleChairHeaderTopBar
        chair={chair} chairAccentColor={chairAccentColor} chairPalette={chairPalette}
        doctors={doctors} hasDoctor={hasDoctor} assignment={assignment}
        activeHeaderDoctorPopoverChairId={activeHeaderDoctorPopoverChairId}
        setActiveHeaderMaintenanceChairId={setActiveHeaderMaintenanceChairId}
        setActiveHeaderDoctorPopoverChairId={setActiveHeaderDoctorPopoverChairId}
        onEditChair={onEditChair} handleConfirmAssignDoctor={handleConfirmAssignDoctor}
      />

      <ScheduleChairHeaderHiddenButtons
        chair={chair} assignment={assignment} suggestedDoctor={suggestedDoctor}
        activeHeaderDoctorPopoverChairId={activeHeaderDoctorPopoverChairId}
        setActiveHeaderDoctorPopoverChairId={setActiveHeaderDoctorPopoverChairId}
        openAssignModal={openAssignModal} onEditChair={onEditChair}
        handleUnassignDoctor={handleUnassignDoctor} handleAssignDoctorWeek={handleAssignDoctorWeek}
        handleAssignDoctorMonth={handleAssignDoctorMonth}
        handleQuickSubstituteDoctor={handleQuickSubstituteDoctor}
        handleBindDoctorToChair={handleBindDoctorToChair}
      />

      <div className="flex items-center justify-between gap-1 w-full min-w-0">
        <ScheduleChairHeaderSelects
          chair={chair} doctors={doctors} assignment={assignment}
          openAssignModal={openAssignModal} handleBindDoctorToChair={handleBindDoctorToChair}
          handleConfirmAssignDoctor={handleConfirmAssignDoctor} handleUnassignDoctor={handleUnassignDoctor}
        />
        <div className="flex items-center gap-1 shrink-0 w-full">
          <ScheduleChairDutySection
            chair={chair} assignment={assignment} hasDoctor={hasDoctor}
            isToday={isToday} currentHour={currentHour} doctors={doctors}
            suggestedDoctor={suggestedDoctor} isSoloDoctor={isSoloDoctor} dateKey={dateKey}
            openAssignModal={openAssignModal} handleConfirmAssignDoctor={handleConfirmAssignDoctor}
          />
        </div>
      </div>

      {activeHeaderDoctorPopoverChairId === chair.id && (
        <ScheduleChairDoctorPopover
          chair={chair} doctors={doctors} assignment={assignment}
          suggestedDoctor={suggestedDoctor} hasDoctor={hasDoctor} dateKey={dateKey}
          dashboard={dashboard} onClose={() => setActiveHeaderDoctorPopoverChairId(null)}
          handleConfirmAssignDoctor={handleConfirmAssignDoctor} handleAssignDoctorWeek={handleAssignDoctorWeek}
          handleAssignDoctorMonth={handleAssignDoctorMonth}
          handleQuickSubstituteDoctor={handleQuickSubstituteDoctor}
          handleBindDoctorToChair={handleBindDoctorToChair} handleUnassignDoctor={handleUnassignDoctor}
          openAssignModal={openAssignModal}
        />
      )}

      {activeHeaderMaintenanceChairId === chair.id && (
        <ScheduleChairMaintenancePopover
          chair={chair} onClose={() => setActiveHeaderMaintenanceChairId(null)}
          handleAddMaintenance={handleAddMaintenance}
        />
      )}
    </div>
  );
}
