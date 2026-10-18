import React from "react";
import {
  type ChairScheduleViewProps,
  resolveChairDutyDoctor,
  useSchedule,
} from "./ChairScheduleTypes";
import { useChairScheduleState } from "./useChairScheduleState";
import { findPreventiveInspectionCandidates } from "./doctorFreeSlotsEngine";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ChairScheduleModalsLayer } from "./view/ChairScheduleModalsLayer";
import { ChairScheduleMobileBranch } from "./view/ChairScheduleMobileBranch";
import { ChairScheduleDesktopLayout } from "./view/ChairScheduleDesktopLayout";

// Transparent re-exports per Mandates 8b, 8e
export * from "./ChairScheduleTypes";
export * from "./ChairDateRangeModal";
export * from "./ChairShiftPopover";
export * from "./useChairShiftOperations";
export * from "./useChairScheduleState";
export * from "./ChairScheduleToolbar";
export * from "./DoctorFreeSlotsModal";
export * from "./PreventiveInspectionModal";
export { resolveChairDutyDoctor, useSchedule };

export const ChairScheduleView: React.FC<ChairScheduleViewProps> = (props) => {
  const { dashboard, dateKey, appointments, selectedDoctorId } = props;

  const state = useChairScheduleState(props);
  const [isDoctorFreeSlotsOpen, setIsDoctorFreeSlotsOpen] = React.useState(false);
  const [isPreventiveInspectionOpen, setIsPreventiveInspectionOpen] = React.useState(false);

  const preventiveCandidatesCount = React.useMemo(() => {
    return findPreventiveInspectionCandidates({
      patients: dashboard?.patients ?? [],
      appointments: appointments ?? dashboard?.appointments ?? [],
      minDaysSinceVisit: 150,
      referenceDate: dateKey || undefined,
    }).length;
  }, [dashboard?.patients, dashboard?.appointments, appointments, dateKey]);

  const isMobile = useIsMobile(768);

  if (isMobile && dashboard) {
    return (
      <ChairScheduleMobileBranch
        props={props}
        state={state}
        dashboard={dashboard}
        dateKey={dateKey}
        appointments={appointments}
        selectedDoctorId={selectedDoctorId}
        onAppointmentClick={props.onAppointmentClick}
        onAppointmentMove={props.onAppointmentMove}
        onQuickStatusChange={props.onQuickStatusChange}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--paper)]">
      <ChairScheduleDesktopLayout
        props={props}
        state={state}
        preventiveCandidatesCount={preventiveCandidatesCount}
        onOpenDoctorFreeSlots={() => setIsDoctorFreeSlotsOpen(true)}
        onOpenPreventiveInspection={() => setIsPreventiveInspectionOpen(true)}
      />

      <ChairScheduleModalsLayer
        state={state}
        dashboard={dashboard}
        dateKey={dateKey}
        selectedDoctorId={selectedDoctorId}
        onAssignChairDoctor={props.onAssignChairDoctor}
        onAddDoctor={props.onAddDoctor}
        isDoctorFreeSlotsOpen={isDoctorFreeSlotsOpen}
        setIsDoctorFreeSlotsOpen={setIsDoctorFreeSlotsOpen}
        isPreventiveInspectionOpen={isPreventiveInspectionOpen}
        setIsPreventiveInspectionOpen={setIsPreventiveInspectionOpen}
      />
    </div>
  );
};

export default ChairScheduleView;
