/**
 * interactionTypes.ts — Interfaces and props for schedule appointment interactions.
 */

import type { Appointment, Dashboard } from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../../utils/scheduleCollisionUtils";
import type { TargetSlotInfo } from "../../waitlist/WaitlistDrawer";

export interface UseScheduleAppointmentInteractionsProps {
  dateKey: string;
  gridStepMinutes?: 15 | 30 | 60 | undefined;
  onGridStepChange?: ((step: 15 | 30 | 60) => void) | undefined;
  chairMaintenanceBlocks?: ChairMaintenanceBlock[] | undefined;
  onAddChairMaintenance?: ((block: ChairMaintenanceBlock) => void) | undefined;
  onRemoveChairMaintenance?: ((blockId: string) => void) | undefined;
  appointments: Appointment[];
  dashboard: Dashboard;
  patientName: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  formatTime: (iso: string) => string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  timezone: string;
  onAppointmentMove?:
    | ((
        appointmentId: string,
        updates: Partial<Appointment> & { allowOverbooking?: boolean; [key: string]: unknown },
      ) => Promise<boolean | void | unknown> | boolean | void)
    | undefined;
  onQuickStatusChange?:
    | ((appointmentId: string, status: Appointment["status"]) => void)
    | undefined;
  onOpenWaitlistForSlot?: ((slot: TargetSlotInfo) => void) | undefined;
}
