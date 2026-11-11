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
			["received", "ready", "ready_in_clinic", "fitted", "refitting", "completed", "shipped", "sent", "cancelled", "rejected_remake"].includes(targetStatus)) ||
		(currentStatus === "received" &&
			["ready", "ready_in_clinic", "fitted", "completed", "refitting", "in_progress", "sent", "cancelled", "rejected_remake"].includes(targetStatus)) ||
		(currentStatus === "ready" &&
			["ready_in_clinic", "received", "fitted", "completed", "refitting", "cancelled", "rejected_remake"].includes(targetStatus)) ||
		(currentStatus === "ready_in_clinic" &&
			["ready", "received", "fitted", "completed", "refitting", "cancelled", "rejected_remake"].includes(targetStatus)) ||
		(currentStatus === "refitting" &&
			["in_progress", "shipped", "received", "ready", "ready_in_clinic", "fitted", "completed", "sent", "cancelled"].includes(targetStatus)) ||
		(currentStatus === "sent" &&
			["in_progress", "shipped", "received", "ready", "ready_in_clinic", "refitting", "completed", "cancelled"].includes(targetStatus)) ||
		(currentStatus === "draft" &&
			["sent", "in_progress", "received", "ready", "ready_in_clinic", "refitting", "completed", "cancelled"].includes(targetStatus)) ||
		(currentStatus === "completed" &&
			["refitting", "rejected_remake", "received", "in_progress"].includes(targetStatus)) ||
		(currentStatus === "fitted" &&
			["completed", "refitting", "cancelled", "rejected_remake"].includes(targetStatus)) ||
		(currentStatus === "rejected_remake" &&
			["draft", "sent", "in_progress", "cancelled"].includes(targetStatus)) ||
		targetStatus === "cancelled";

	return Boolean(isPermittedShortcut);
}
