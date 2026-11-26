import React from "react";
import type { Appointment, UrgentScheduleRequest } from "@dental/shared";
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { ScheduleDayZeroBanner, ScheduleGridCompatibilityTriggers } from "./ScheduleGridToolbar";
import { ScheduleGridChairsHeaderRow } from "./ScheduleGridChairsHeaderRow";
import { ScheduleAppointmentTrack } from "./ScheduleAppointmentTrack";
import { ScheduleGridFooter } from "./ScheduleGridFooter";
import { ScheduleGridModalsAndSheet } from "./ScheduleGridModalsAndSheet";
import { ScheduleCockpitLeftPanel } from "./ScheduleCockpitLeftPanel";
import { ScheduleAppointmentInspector } from "../inspector";
import { openVisitWithBackendSync } from "../appointmentCardActions/visitSyncHelper";
import type { ScheduleGridDesktopLayoutProps } from "./scheduleGridDesktopLayoutTypes";

export type { ScheduleGridDesktopLayoutProps };

export function ScheduleGridDesktopLayout({
  props,
  duty,
  interactions,
  gridData,
  timeSlots,
  dateKey,
  isToday,
  currentHour,
  timezone,
  patientName,
  effectiveMaintenanceBlocksOverride,
  onDeleteTimeReservation,
}: ScheduleGridDesktopLayoutProps) {
  const {
    dashboard,
    appointments = [],
    onSlotClick,
    onAppointmentClick,
    onQuickStatusChange,
    toDateTimeLocalValue,
    appointmentLabels,
    selectedDoctorId,
    onAppointmentMove,
    onEditChair,
  } = props;

  const [selectedInspectorAppt, setSelectedInspectorAppt] = React.useState<Appointment | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = React.useState<boolean>(true);
  const [isCockpitOpen, setIsCockpitOpen] = React.useState<boolean>(() => {
    const saved = safeLocalStorageGetItem("dente_schedule_left_cockpit_open");
    return saved === "false" ? false : true;
  });

  const handleToggleCockpit = React.useCallback(() => {
    setIsCockpitOpen((prev) => {
      const next = !prev;
      safeLocalStorageSetItem("dente_schedule_left_cockpit_open", next ? "true" : "false");
      return next;
    });
  }, []);

  const handleRemoveMaintenanceBlock = React.useCallback(
    (blockId: string) => {
      if (blockId.startsWith("res::") && onDeleteTimeReservation) {
        void onDeleteTimeReservation(blockId);
        return;
      }
      interactions.handleRemoveMaintenance(blockId);
    },
    [interactions, onDeleteTimeReservation],
  );

  const handleBookUrgentRequest = React.useCallback(
    (req: UrgentScheduleRequest) => {
      const timeMatch = req.preferredSlotTime?.match(/(\d{2}:\d{2})/);
      const startTime = timeMatch?.[1] ?? "10:00";
      const firstChair = duty.effectiveChairs[0];
      const normalizedDoc = req.doctorName?.trim().toLowerCase() ?? "";
      const matchedDoctor = normalizedDoc
        ? duty.doctors.find((d) => d.fullName.toLowerCase().includes(normalizedDoc))
        : undefined;
      onSlotClick?.({
        dateKey,
        startTime,
        chairId: firstChair?.id ?? null,
        chairName: firstChair?.name ?? null,
        doctorUserId: matchedDoctor?.id ?? selectedDoctorId ?? duty.doctors[0]?.id ?? null,
        doctorName: matchedDoctor?.fullName ?? (req.doctorName || null),
        patientName: req.patientName,
        reason: req.requestType || "Острая боль",
        durationMinutes: 30,
        isCitoEmergency: true,
      });
    },
    [dateKey, duty.doctors, duty.effectiveChairs, onSlotClick, selectedDoctorId],
  );

  // Keep selectedInspectorAppt synced with latest appointments data
  const effectiveSelectedAppt = React.useMemo(() => {
    if (!selectedInspectorAppt) return null;
    return (
      (appointments as Appointment[]).find((a) => a.id === selectedInspectorAppt.id) ||
      selectedInspectorAppt
    );
  }, [selectedInspectorAppt, appointments]);

  const handleAppointmentClick = React.useCallback(
    (appt: Appointment) => {
      // Mandate [SCH-03]: Single click opens 0-click inspector in the right panel WITHOUT opening QuickBookingDrawer modal overlay.
      setSelectedInspectorAppt(appt);
      setIsInspectorOpen(true);
    },
    [],
  );

  const handleAppointmentDoubleClick = React.useCallback(
    (appt: Appointment) => {
      // Mandate [SCH-03]: Detailed editing drawer opens strictly via double click or "Edit" button in inspector.
      setSelectedInspectorAppt(appt);
      if (onAppointmentClick) {
        onAppointmentClick(appt);
      }
    },
    [onAppointmentClick],
  );

  const handleDeselect = React.useCallback(() => {
    setSelectedInspectorAppt(null);
  }, []);

  const handleOpenVisit = React.useCallback((appointment: Appointment) => {
    void openVisitWithBackendSync(appointment, null);
  }, []);

  const handleDateChange = React.useCallback(
    (newDateKey: string) => {
      if (typeof props.onDateChange === "function") {
        props.onDateChange(newDateKey);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dente:schedule-date-change", { detail: newDateKey }),
        );
      }
    },
    [props],
  );

  return (
    <div className="space-y-1.5 sm:space-y-2">
      <ScheduleDayZeroBanner dayAppointmentsCount={gridData.dayAppointments.length} />
      <ScheduleGridCompatibilityTriggers
        handleOpenAddChair={duty.handleOpenAddChair}
        setIsQuickAddDoctorOpen={duty.setIsQuickAddDoctorOpen}
      />

      <div className="flex flex-row items-stretch gap-2 w-full min-w-0">
        <ScheduleCockpitLeftPanel
          isOpen={isCockpitOpen}
          onToggleOpen={handleToggleCockpit}
          dateKey={dateKey}
          onDateChange={handleDateChange}
          appointments={appointments as Appointment[]}
          toDateTimeLocalValue={toDateTimeLocalValue}
          timezone={timezone}
          onBookUrgentRequest={handleBookUrgentRequest}
        />

        <div
          ref={interactions.gridContainerRef}
          className="schedule-grid-container flex-1 min-w-0 overflow-x-auto overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs select-none"
          style={{ maxHeight: "calc(100vh - 156px)", overflowY: "auto" }}
          data-testid="schedule-grid-view"
          role="region"
          aria-label="Сетка расписания по креслам и времени"
        >
          <ScheduleGridChairsHeaderRow
            duty={duty}
            interactions={interactions}
            gridData={gridData}
            dateKey={dateKey}
            isToday={isToday}
            currentHour={currentHour}
            dashboard={dashboard}
            onEditChair={onEditChair}
          />

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
            handleRemoveMaintenance={handleRemoveMaintenanceBlock}
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
            onAppointmentClick={handleAppointmentClick}
            onAppointmentDoubleClick={handleAppointmentDoubleClick}
            handleSelectMobileAppt={interactions.handleSelectMobileAppt}
            onQuickStatusChange={onQuickStatusChange}
            handleAdjustAppointmentDuration={interactions.handleAdjustAppointmentDuration}
            handleShiftAppointmentLateness={interactions.handleShiftAppointmentLateness}
            handleReassignAppointmentChair={interactions.handleReassignAppointmentChair}
            handleReassignAppointmentDoctor={interactions.handleReassignAppointmentDoctor}
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
            effectiveMaintenanceBlocks={
              effectiveMaintenanceBlocksOverride ?? interactions.effectiveMaintenanceBlocks
            }
            onAppointmentMove={onAppointmentMove}
            onSlotClick={onSlotClick}
            emergencyReserveSlots={gridData.emergencyReserveSlots}
          />

          <ScheduleGridFooter
            dailyTally={gridData.dailyTally}
            effectiveChairs={duty.effectiveChairs}
            handleCopyWeekShiftsToNextWeek={duty.handleCopyWeekShiftsToNextWeek}
            showRevenue={interactions.showRevenue}
            handleToggleShowRevenue={interactions.handleToggleShowRevenue}
            isInspectorOpen={isInspectorOpen}
            onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
          />
        </div>

        {isInspectorOpen && (
          <ScheduleAppointmentInspector
            selectedAppointment={effectiveSelectedAppt}
            onDeselect={handleDeselect}
            dashboard={dashboard}
            appointments={appointments}
            dateKey={dateKey}
            onDateChange={handleDateChange}
            patientLookupMap={gridData.patientLookupMap || new Map()}
            staffLookupMap={gridData.staffLookupMap || new Map()}
            toDateTimeLocalValue={toDateTimeLocalValue}
            timezone={timezone}
            appointmentLabels={appointmentLabels}
            onQuickStatusChange={onQuickStatusChange}
            onOpenVisit={handleOpenVisit}
            onEditAppointment={(appt) => onAppointmentClick?.(appt)}
            onSelectAppointment={(appt) => setSelectedInspectorAppt(appt)}
            isOpen={isInspectorOpen}
            onToggleOpen={() => setIsInspectorOpen((prev) => !prev)}
            hideMiniCalendar={isCockpitOpen}
          />
        )}
      </div>

      <ScheduleGridModalsAndSheet
        props={props}
        duty={duty}
        interactions={interactions}
        dateKey={dateKey}
        timezone={timezone}
        patientName={patientName}
      />
    </div>
  );
}
