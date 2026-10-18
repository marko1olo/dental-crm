import React from "react";
import type { Dashboard } from "@dental/shared";
import type { useChairScheduleState } from "../useChairScheduleState";
import { ChairScheduleQuickModals } from "./ChairScheduleQuickModals";
import { ChairScheduleInspectionModals } from "./ChairScheduleInspectionModals";

export interface ChairScheduleModalsLayerProps {
  state: ReturnType<typeof useChairScheduleState>;
  dashboard?: Dashboard | null | undefined;
  dateKey?: string | undefined;
  selectedDoctorId?: string | null | undefined;
  onAssignChairDoctor?: ((chairId: string, shift: any) => void) | undefined;
  onAddDoctor?: ((docData: any) => Promise<void> | void) | undefined;
  isDoctorFreeSlotsOpen: boolean;
  setIsDoctorFreeSlotsOpen: (open: boolean) => void;
  isPreventiveInspectionOpen: boolean;
  setIsPreventiveInspectionOpen: (open: boolean) => void;
}

export function ChairScheduleModalsLayer(props: ChairScheduleModalsLayerProps) {
  return (
    <>
      <ChairScheduleQuickModals
        state={props.state}
        dashboard={props.dashboard}
        onAssignChairDoctor={props.onAssignChairDoctor}
        onAddDoctor={props.onAddDoctor}
      />
      <ChairScheduleInspectionModals
        state={props.state}
        dashboard={props.dashboard}
        dateKey={props.dateKey}
        selectedDoctorId={props.selectedDoctorId}
        isDoctorFreeSlotsOpen={props.isDoctorFreeSlotsOpen}
        setIsDoctorFreeSlotsOpen={props.setIsDoctorFreeSlotsOpen}
        isPreventiveInspectionOpen={props.isPreventiveInspectionOpen}
        setIsPreventiveInspectionOpen={props.setIsPreventiveInspectionOpen}
      />
    </>
  );
}
