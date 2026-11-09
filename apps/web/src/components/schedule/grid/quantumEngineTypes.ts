import type { Appointment } from "@dental/shared";
import type { ChairMaintenanceBlock } from "../../../utils/scheduleCollisionUtils";

export interface QuantumCollisionResult {
  hasCollision: boolean;
  conflictType: "chair" | "doctor" | "patient" | "chair_maintenance" | null;
  conflictingEntity: Appointment | ChairMaintenanceBlock | null;
  message: string | null;
  isCitoOverbooking?: boolean;
}

export interface QuantumSlotAlternative {
  timeDisplay: string;
  label?: string;
  startsAt: string;
  endsAt: string;
}

export interface QuantumCollisionParams {
  chairId?: string | null | undefined;
  doctorUserId?: string | null | undefined;
  patientId?: string | null | undefined;
  slotHour?: string | undefined;
  startsAt?: string | null | undefined;
  endsAt?: string | null | undefined;
  durationMinutes?: number | undefined;
  excludeAppointmentId?: string | null | undefined;
  isCito?: boolean | undefined;
  allowCitoOverbooking?: boolean | undefined;
  doctorName?: string | undefined;
  chairName?: string | undefined;
  patientName?: string | undefined;
}

export function isMaintenanceBlock(entity: any): entity is ChairMaintenanceBlock {
  return (
    Boolean(entity) &&
    !("status" in entity) &&
    "reason" in entity &&
    !("patientId" in entity)
  );
}
