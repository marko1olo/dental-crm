import React from "react";
import { ScheduleGridTimeCorner } from "./ScheduleGridToolbar";
import { ScheduleChairHeader } from "./ScheduleChairHeader";

export interface ScheduleGridChairsHeaderRowProps {
  duty: any;
  interactions: any;
  gridData: any;
  dateKey: string;
  isToday: boolean;
  currentHour: number;
  dashboard: any;
  onEditChair: any;
}

export function ScheduleGridChairsHeaderRow({
  duty,
  interactions,
  gridData,
  dateKey,
  isToday,
  currentHour,
  dashboard,
  onEditChair,
}: ScheduleGridChairsHeaderRowProps) {
  return (
    <div
      className="grid min-w-full border-b border-[var(--line)] bg-[var(--paper-soft)] sticky top-0 z-30"
      style={{
        minWidth: duty.effectiveChairs.length > 1 ? `${Math.max(260, 72 + duty.effectiveChairs.length * 220)}px` : undefined,
        gridTemplateColumns: `clamp(68px, 5.5vw, 76px) repeat(${duty.effectiveChairs.length}, minmax(180px, 1fr))`,
      }}
    >
      <ScheduleGridTimeCorner gridStep={interactions.gridStep} handleSetGridStep={interactions.handleSetGridStep} />
      {duty.effectiveChairs.map((chair: any, chairIndex: number) => (
        <ScheduleChairHeader
          key={chair.id}
          chair={chair}
          chairIndex={chairIndex}
          dailyTally={gridData.dailyTally}
          effectiveChairAssignments={duty.effectiveChairAssignments}
          doctors={duty.doctors}
          suggestedDoctor={duty.getSuggestedDoctorForChair(chair.id)}
          isSoloDoctor={duty.isSoloDoctor}
          dateKey={dateKey}
          dashboard={dashboard}
          isToday={isToday}
          currentHour={currentHour}
          activeHeaderDoctorPopoverChairId={duty.activeHeaderDoctorPopoverChairId}
          setActiveHeaderDoctorPopoverChairId={duty.setActiveHeaderDoctorPopoverChairId}
          activeHeaderMaintenanceChairId={duty.activeHeaderMaintenanceChairId}
          setActiveHeaderMaintenanceChairId={duty.setActiveHeaderMaintenanceChairId}
          onEditChair={onEditChair}
          openAssignModal={duty.openAssignModal}
          handleConfirmAssignDoctor={duty.handleConfirmAssignDoctor}
          handleUnassignDoctor={duty.handleUnassignDoctor}
          handleAssignDoctorWeek={duty.handleAssignDoctorWeek}
          handleAssignDoctorMonth={duty.handleAssignDoctorMonth}
          handleQuickSubstituteDoctor={duty.handleQuickSubstituteDoctor}
          handleBindDoctorToChair={duty.handleBindDoctorToChair}
          handleAddMaintenance={interactions.handleAddMaintenance}
        />
      ))}
    </div>
  );
}
