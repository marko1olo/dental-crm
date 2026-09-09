/**
 * DENTE Dental CRM — Schedule Resource Collision & CITO Overbooking Engine
 * Feature 192: CITO overbooking during Drag-and-Drop and configurable grid step.
 * Mandates 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty).
 */

export {
	checkAppointmentResourceCollision,
	isCitoAppointment,
	type ResourceCollisionResult,
	type ChairMaintenanceBlock,
	type ResourceCollisionOptions,
} from "../../utils/scheduleCollisionUtils";
