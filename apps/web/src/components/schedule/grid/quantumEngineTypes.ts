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
  chairId?: string | null;
  doctorUserId?: string | null;
  patientId?: string | null;
  slotHour?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  durationMinutes?: number;
  excludeAppointmentId?: string | null;
  isCito?: boolean;
  allowCitoOverbooking?: boolean;
  doctorName?: string;
  chairName?: string;
  patientName?: string;
}

export function isMaintenanceBlock(entity: any): entity is ChairMaintenanceBlock {
  return (
    Boolean(entity) &&
    !("status" in entity) &&
    "reason" in entity &&
    !("patientId" in entity)
  );
}
