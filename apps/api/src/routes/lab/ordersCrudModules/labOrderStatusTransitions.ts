import {
	LAB_ORDER_CLINIC_TRANSITIONS,
	type LabOrderStatus,
} from "../../../db/labQuery.js";

export function isPermittedLabStatusTransition(
	currentStatus: LabOrderStatus,
	targetStatus: LabOrderStatus,
): boolean {
	if (currentStatus === targetStatus) return true;
	const allowed = LAB_ORDER_CLINIC_TRANSITIONS[currentStatus];
	if (allowed && allowed.includes(targetStatus)) return true;

	const isPermittedShortcut =
		(currentStatus === "in_progress" &&
			["received", "refitting", "completed", "shipped", "cancelled"].includes(targetStatus)) ||
		(currentStatus === "received" &&
			["completed", "refitting", "in_progress", "cancelled"].includes(targetStatus)) ||
		(currentStatus === "refitting" &&
			["in_progress", "received", "completed", "cancelled"].includes(targetStatus)) ||
		(currentStatus === "sent" &&
			["in_progress", "shipped", "received", "cancelled"].includes(targetStatus)) ||
		(currentStatus === "completed" && ["refitting"].includes(targetStatus)) ||
		targetStatus === "cancelled";

	return isPermittedShortcut;
}
