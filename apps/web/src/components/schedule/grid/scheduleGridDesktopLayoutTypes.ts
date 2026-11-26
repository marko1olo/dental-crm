import type { Dashboard } from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";
import type { ScheduleGridProps } from "./gridTypes";
import type { useScheduleChairDuty } from "./useScheduleChairDuty";
import type { useScheduleAppointmentInteractions } from "./useScheduleAppointmentInteractions";
import type { useScheduleGridData } from "./useScheduleGridData";

export interface ScheduleGridDesktopLayoutProps {
  props: ScheduleGridProps;
  duty: ReturnType<typeof useScheduleChairDuty>;
  interactions: ReturnType<typeof useScheduleAppointmentInteractions>;
  gridData: ReturnType<typeof useScheduleGridData>;
  timeSlots: string[];
  dateKey: string;
  isToday: boolean;
  currentHour: number;
  timezone: string;
  patientName: (patients: Dashboard["patients"] | undefined, id: string | null) => string;
  effectiveMaintenanceBlocksOverride?: ChairMaintenanceBlock[] | undefined;
  onDeleteTimeReservation?: ((blockId: string) => Promise<void> | void) | undefined;
}
