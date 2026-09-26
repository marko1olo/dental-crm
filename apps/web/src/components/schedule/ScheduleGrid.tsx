import React, { useMemo } from "react";
import { STOMX_WORKPLACE_PALETTES, getStomxWorkplacePalette } from "@dental/shared";
export { STOMX_WORKPLACE_PALETTES, getStomxWorkplacePalette };
// Parity contract: data-chair-palette and chair-palette-badge- are delegated to ScheduleChairHeader
export { resolveChairDutyDoctor } from "./chairRosterMath";
export type { ChairMaintenanceBlock } from "../../utils/scheduleCollisionUtils";
export type {
  ChairDoctorSubShift,
  ChairDoctorShiftAssignment,
  ScheduleGridProps,
} from "./grid/gridTypes";
export {
  CHAIR_SHIFT_PRESETS,
  HOURS,
  DEFAULT_SOLO_CHAIR,
} from "./grid/gridConstants";
import {
  generateTimeSlots,
  safeBuildSlotIso,
  buildDoctorSlotAppointmentsMap,
} from "./grid/gridSlotMath";
export {
  generateTimeSlots,
  safeBuildSlotIso,
  buildDoctorSlotAppointmentsMap,
};
import {
  formatDoctorShortName,
  isAppointmentInChair,
  getNormalizedAppointmentStatusLabel,
  GridAppointmentCard,
} from "./GridAppointmentCard";
export {
  formatDoctorShortName,
  isAppointmentInChair,
  getNormalizedAppointmentStatusLabel,
  GridAppointmentCard,
};

import { useScheduleChairDuty } from "./grid/useScheduleChairDuty";
import { useScheduleAppointmentInteractions } from "./grid/useScheduleAppointmentInteractions";
import { useScheduleGridData } from "./grid/useScheduleGridData";
import { ScheduleZeroChairsEmptyState } from "./grid/ScheduleZeroChairsEmptyState";
import {
  ScheduleDayZeroBanner,
  ScheduleGridCompatibilityTriggers,
  ScheduleGridTimeCorner,
} from "./grid/ScheduleGridToolbar";
import { ScheduleChairHeader } from "./grid/ScheduleChairHeader";
import { ScheduleAppointmentTrack } from "./grid/ScheduleAppointmentTrack";
import { ScheduleMobileBottomSheet } from "./grid/ScheduleMobileBottomSheet";
import { ScheduleGridFooter } from "./grid/ScheduleGridFooter";
import { ScheduleGridModals } from "./grid/ScheduleGridModals";
import type { ScheduleGridProps } from "./grid/gridTypes";

export const ScheduleGrid = React.memo(function ScheduleGrid(
  props: ScheduleGridProps,
) {
  const {
    dashboard,
    dateKey,
    appointments = [],
    onSlotClick,
    onAppointmentClick,
    onQuickStatusChange,
    patientName: propPatientName,
    getPatientName: propGetPatientName,
    formatTime,
    toDateTimeLocalValue = (iso: string) => (iso ? iso.slice(0, 16) : ""),
    appointmentLabels,
    selectedChairId,
    selectedDoctorId,
    onAppointmentMove,
    onEditChair,
    hideToolbar = false,
    hideInlineAddChair = false,
  } = props;

  const patientName =
    propPatientName ||
    propGetPatientName ||
    ((_patients: any, _id: string | null) => "Пациент");

  const timezone =
    dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

  // Chair and doctor duty assignments
  const duty = useScheduleChairDuty({
    dashboard,
    dateKey,
    selectedChairId,
    chairDoctorAssignments: props.chairDoctorAssignments,
    onAssignChairDoctor: props.onAssignChairDoctor,
    onOpenAddChair: props.onOpenAddChair,
  });

  // Appointment interaction handlers & drawer states
  const interactions = useScheduleAppointmentInteractions({
    dateKey,
    gridStepMinutes: props.gridStepMinutes,
    onGridStepChange: props.onGridStepChange,
    chairMaintenanceBlocks: props.chairMaintenanceBlocks,
    onAddChairMaintenance: props.onAddChairMaintenance,
    onRemoveChairMaintenance: props.onRemoveChairMaintenance,
    appointments,
    dashboard,
    patientName,
    formatTime,
    toDateTimeLocalValue,
    timezone,
    onAppointmentMove,
    onQuickStatusChange,
    onOpenWaitlistForSlot: props.onOpenWaitlistForSlot,
  });

  const timeSlots = useMemo(
    () => generateTimeSlots(interactions.gridStep),
    [interactions.gridStep],
  );

  // Day calculations, slot mapping, collisions, daily tally
  const gridData = useScheduleGridData({
    appointments,
    dateKey,
    toDateTimeLocalValue,
    timezone,
    timeSlots,
    effectiveChairs: duty.effectiveChairs,
    gridStep: interactions.gridStep,
    effectiveMaintenanceBlocks: interactions.effectiveMaintenanceBlocks,
    selectedDoctorId,
    doctors: duty.doctors,
    dashboard,
  });

  // Zero chairs empty state
  if (duty.isZeroChairs) {
    return (
      <ScheduleZeroChairsEmptyState
        onOpenAddChair={props.onOpenAddChair}
        isInternalAddChairModalOpen={duty.isInternalAddChairModalOpen}
        setIsInternalAddChairModalOpen={duty.setIsInternalAddChairModalOpen}
        doctors={duty.doctors}
        onAddChair={props.onAddChair}
        dashboard={dashboard}
        handleConfirmAssignDoctor={duty.handleConfirmAssignDoctor}
        handleOpenAddChair={duty.handleOpenAddChair}
      />
    );
  }

  const now = new Date();
  const todayKey = toDateTimeLocalValue(
    now.toISOString(),
    timezone,
  ).slice(0, 10);
  const isToday = dateKey === todayKey;
  const currentHour =
    Number.parseInt(
      toDateTimeLocalValue(now.toISOString(), timezone).slice(11, 13),
      10,
    ) || now.getHours();

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {/* Day 0 Empty State Banner when no appointments for selected day */}
      <ScheduleDayZeroBanner
        dayAppointmentsCount={gridData.dayAppointments.length}
      />

      {/* Hidden backward-compatibility triggers */}
      <ScheduleGridCompatibilityTriggers
        handleOpenAddChair={duty.handleOpenAddChair}
        setIsQuickAddDoctorOpen={duty.setIsQuickAddDoctorOpen}
      />

      <div
        ref={interactions.gridContainerRef}
        className="schedule-grid-container overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs select-none"
        data-testid="schedule-grid-view"
        role="region"
        aria-label="Сетка расписания по креслам и времени"
      >
        <div
          className="grid min-w-full border-b border-[var(--line)] bg-[var(--paper-soft)] sticky top-0 z-30"
          style={{
            minWidth:
              duty.effectiveChairs.length > 1
                ? `${Math.max(260, 72 + duty.effectiveChairs.length * 180)}px`
                : undefined,
            gridTemplateColumns: `clamp(76px, 15vw, 90px) repeat(${duty.effectiveChairs.length}, minmax(180px, 1fr))`,
          }}
        >
          {/* Time corner header with Grid Step Selector */}
          <ScheduleGridTimeCorner
            gridStep={interactions.gridStep}
            handleSetGridStep={interactions.handleSetGridStep}
          />

          {/* Chair Column Headers */}
          {duty.effectiveChairs.map((chair, chairIndex) => (
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
              activeHeaderDoctorPopoverChairId={
                duty.activeHeaderDoctorPopoverChairId
              }
              setActiveHeaderDoctorPopoverChairId={
                duty.setActiveHeaderDoctorPopoverChairId
              }
              activeHeaderMaintenanceChairId={
                duty.activeHeaderMaintenanceChairId
              }
              setActiveHeaderMaintenanceChairId={
                duty.setActiveHeaderMaintenanceChairId
              }
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

        {/* Time Rows & Appointment Cells */}
        <ScheduleAppointmentTrack
          timeSlots={timeSlots}
          gridStep={interactions.gridStep}
          effectiveChairs={duty.effectiveChairs}
          dateKey={dateKey}
          chairSlotCellMap={gridData.chairSlotCellMap}
          EMPTY_SLOT_CELL_DATA={{
            cellAppointments: [],
            continuingAppointments: [],
            cellMaintenance: [],
          }}
          patientName={patientName}
          dashboard={dashboard}
          handleRemoveMaintenance={interactions.handleRemoveMaintenance}
          doctors={duty.doctors}
          patientLookupMap={gridData.patientLookupMap}
          staffLookupMap={gridData.staffLookupMap}
          collisionMap={gridData.collisionMap}
          timezone={timezone}
          toDateTimeLocalValue={toDateTimeLocalValue}
          appointmentLabels={appointmentLabels}
          hoveredApptId={interactions.hoveredApptId}
          activeStatusPickerApptId={interactions.activeStatusPickerApptId}
          activeMenuApptId={interactions.activeMenuApptId}
          onAppointmentClick={onAppointmentClick}
          handleSelectMobileAppt={interactions.handleSelectMobileAppt}
          onQuickStatusChange={onQuickStatusChange}
          handleAdjustAppointmentDuration={
            interactions.handleAdjustAppointmentDuration
          }
          handleShiftAppointmentLateness={
            interactions.handleShiftAppointmentLateness
          }
          handleReassignAppointmentChair={
            interactions.handleReassignAppointmentChair
          }
          handleReassignAppointmentDoctor={
            interactions.handleReassignAppointmentDoctor
          }
          handleFreeSlotToWaitlist={interactions.handleFreeSlotToWaitlist}
          handleAppointmentMouseEnter={interactions.handleAppointmentMouseEnter}
          handleAppointmentMouseLeave={interactions.handleAppointmentMouseLeave}
          handleKeepHovered={interactions.handleKeepHovered}
          handleToggleStatusPicker={interactions.handleToggleStatusPicker}
          handleToggleMenu={interactions.handleToggleMenu}
          handleCloseStatusPicker={interactions.handleCloseStatusPicker}
          handleCloseMenu={interactions.handleCloseMenu}
          appointments={appointments}
          getDoctorForChairAndHour={duty.getDoctorForChairAndHour}
          selectedDoctorId={selectedDoctorId}
          effectiveChairAssignments={duty.effectiveChairAssignments}
          effectiveMaintenanceBlocks={interactions.effectiveMaintenanceBlocks}
          onAppointmentMove={onAppointmentMove}
          onSlotClick={onSlotClick}
          emergencyReserveSlots={gridData.emergencyReserveSlots}
        />

        {/* Footer Status Bar: Occupancy tally & privacy */}
        <ScheduleGridFooter
          dailyTally={gridData.dailyTally}
          effectiveChairs={duty.effectiveChairs}
          handleCopyWeekShiftsToNextWeek={duty.handleCopyWeekShiftsToNextWeek}
          showRevenue={interactions.showRevenue}
          handleToggleShowRevenue={interactions.handleToggleShowRevenue}
        />
      </div>

      {/* Mobile Native Bottom Sheet */}
      <ScheduleMobileBottomSheet
        selectedMobileAppt={interactions.selectedMobileAppt}
        onClose={() => interactions.setSelectedMobileAppt(null)}
        patientName={patientName}
        dashboard={dashboard}
        timezone={timezone}
        toDateTimeLocalValue={toDateTimeLocalValue}
        appointmentLabels={appointmentLabels}
        effectiveChairs={duty.effectiveChairs}
        doctors={duty.doctors}
        onAppointmentClick={onAppointmentClick}
        onQuickStatusChange={onQuickStatusChange}
        handleAdjustAppointmentDuration={
          interactions.handleAdjustAppointmentDuration
        }
        handleShiftAppointmentLateness={
          interactions.handleShiftAppointmentLateness
        }
        handleReassignAppointmentChair={
          interactions.handleReassignAppointmentChair
        }
        handleReassignAppointmentDoctor={
          interactions.handleReassignAppointmentDoctor
        }
        handleFreeSlotToWaitlist={interactions.handleFreeSlotToWaitlist}
      />

      {/* Modal Dialogs */}
      <ScheduleGridModals
        assigningChairId={duty.assigningChairId}
        setAssigningChairId={duty.setAssigningChairId}
        effectiveChairs={duty.effectiveChairs}
        doctors={duty.doctors}
        dateKey={dateKey}
        effectiveChairAssignments={duty.effectiveChairAssignments}
        handleConfirmAssignDoctor={duty.handleConfirmAssignDoctor}
        handleUnassignDoctor={duty.handleUnassignDoctor}
        onAddDoctor={props.onAddDoctor}
        isSoloDoctor={duty.isSoloDoctor}
        onOpenAddChair={props.onOpenAddChair}
        isInternalAddChairModalOpen={duty.isInternalAddChairModalOpen}
        setIsInternalAddChairModalOpen={duty.setIsInternalAddChairModalOpen}
        onAddChair={props.onAddChair}
        dashboard={dashboard}
        isQuickAddDoctorOpen={duty.isQuickAddDoctorOpen}
        setIsQuickAddDoctorOpen={duty.setIsQuickAddDoctorOpen}
        handleBindDoctorToChair={duty.handleBindDoctorToChair}
        waitlistDrawerSlot={interactions.waitlistDrawerSlot}
        setWaitlistDrawerSlot={interactions.setWaitlistDrawerSlot}
      />
    </div>
  );
});
