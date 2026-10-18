import { useMemo } from "react";
import { generateTimeSlots } from "./gridSlotMath";
import { useScheduleChairDuty } from "./useScheduleChairDuty";
import { useScheduleAppointmentInteractions } from "./useScheduleAppointmentInteractions";
import { useScheduleGridData } from "./useScheduleGridData";
import type { ScheduleGridProps } from "./gridTypes";

export function useScheduleGridController(props: ScheduleGridProps) {
  const {
    dashboard,
    dateKey,
    appointments = [],
    patientName: propPatientName,
    getPatientName: propGetPatientName,
    formatTime,
    toDateTimeLocalValue = (iso: string) => (iso ? iso.slice(0, 16) : ""),
    selectedChairId,
    selectedDoctorId,
    onAppointmentMove,
    onQuickStatusChange,
  } = props;

  const patientName = propPatientName || propGetPatientName || ((_p: any, _id: string | null) => "Пациент");
  const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

  const duty = useScheduleChairDuty({
    dashboard,
    dateKey,
    selectedChairId,
    chairDoctorAssignments: props.chairDoctorAssignments,
    onAssignChairDoctor: props.onAssignChairDoctor,
    onOpenAddChair: props.onOpenAddChair,
  });

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

  const timeSlots = useMemo(() => generateTimeSlots(interactions.gridStep), [interactions.gridStep]);

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

  const now = new Date();
  const todayKey = toDateTimeLocalValue(now.toISOString(), timezone).slice(0, 10);
  const isToday = dateKey === todayKey;
  const currentHour = Number.parseInt(toDateTimeLocalValue(now.toISOString(), timezone).slice(11, 13), 10) || now.getHours();

  return {
    duty,
    interactions,
    gridData,
    timeSlots,
    patientName,
    timezone,
    isToday,
    currentHour,
    toDateTimeLocalValue,
  };
}
