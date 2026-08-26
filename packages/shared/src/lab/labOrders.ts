/**
 * Dental Laboratory Work Orders & Prosthodontic Job Tracking Engine.
 * Adapted from dentalpin lab_orders module for DENTE Dental CRM.
 *
 * Provides typed Zod schemas, VITA 3D-Master & Classical shade catalog,
 * turnaround SLA calculations, and prosthetic lifecycle state machine.
 */

import { z } from "zod";

export const labWorkTypeSchema = z.enum([
	"crown",
	"bridge",
	"denture",
	"implant",
	"veneer",
	"orthodontic",
	"inlay_onlay",
	"splint_nightguard",
	"repair",
	"other",
]);
export type LabWorkType = z.infer<typeof labWorkTypeSchema>;

export const labOrderStatusSchema = z.enum([
	"draft",
	"sent",
	"in_progress",
	"ready",
	"received",
	"fitted",
	"completed",
	"cancelled",
	"rejected_remake",
]);
export type LabOrderStatus = z.infer<typeof labOrderStatusSchema>;

export const impressionTypeSchema = z.enum([
	"alginate",
	"pvs_silicone",
	"polyether",
	"digital_scan",
	"other",
]);
export type ImpressionType = z.infer<typeof impressionTypeSchema>;

export const vitaClassicalShadeSchema = z.enum([
	"A1",
	"A2",
	"A3",
	"A3.5",
	"A4",
	"B1",
	"B2",
	"B3",
	"B4",
	"C1",
	"C2",
	"C3",
	"C4",
	"D2",
	"D3",
	"D4",
	"OM1",
	"OM2",
	"OM3",
	"BL1",
	"BL2",
	"BL3",
	"BL4",
]);
export type VitaClassicalShade = z.infer<typeof vitaClassicalShadeSchema>;

export const labOrderSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid().optional().nullable(),
	labContactId: z.string().uuid(),
	orderNumber: z.string().min(1).max(50),
	workType: labWorkTypeSchema,
	toothReference: z.string().max(50).optional().nullable(),
	impressionType: impressionTypeSchema.optional().nullable(),
	antagonistInfo: z.string().max(500).optional().nullable(),
	shade: vitaClassicalShadeSchema.optional().nullable(),
	status: labOrderStatusSchema.default("sent"),
	sentDate: z.string(), // YYYY-MM-DD
	expectedDate: z.string().optional().nullable(), // YYYY-MM-DD
	receivedDate: z.string().optional().nullable(), // YYYY-MM-DD
	fittedDate: z.string().optional().nullable(), // YYYY-MM-DD
	costKopecks: z.number().int().nonnegative().default(0),
	notes: z.string().max(2000).optional().nullable(),
	isRemake: z.boolean().default(false),
	remakeReason: z.string().max(500).optional().nullable(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});
export type LabOrder = z.infer<typeof labOrderSchema>;

/**
 * Standard turnaround SLA days for common lab work types.
 */
export const DEFAULT_LAB_TURNAROUND_DAYS: Record<LabWorkType, number> = {
	crown: 7,
	bridge: 10,
	denture: 14,
	implant: 10,
	veneer: 7,
	orthodontic: 10,
	inlay_onlay: 5,
	splint_nightguard: 5,
	repair: 2,
	other: 7,
};

/**
 * Calculates default expected delivery date based on work type and business days.
 */
export function calculateExpectedDeliveryDate(
	sentDate: Date | string,
	workType: LabWorkType,
	customTurnaroundDays?: number,
): Date {
	const start = typeof sentDate === "string" ? new Date(sentDate) : new Date(sentDate);
	const daysToAdd = customTurnaroundDays ?? DEFAULT_LAB_TURNAROUND_DAYS[workType] ?? 7;

	const result = new Date(start.getTime());
	let added = 0;
	while (added < daysToAdd) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		// Skip weekends (0 = Sunday, 6 = Saturday)
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

/**
 * Evaluates whether a lab order is delayed based on current date.
 */
export function isLabOrderDelayed(order: LabOrder, now: Date = new Date()): boolean {
	if (order.status === "received" || order.status === "fitted" || order.status === "completed" || order.status === "cancelled") {
		return false;
	}
	if (!order.expectedDate) return false;
	const expected = new Date(order.expectedDate);
	return now.getTime() > expected.getTime();
}

/**
 * Validates allowed state transitions for lab orders.
 */
export function canTransitionLabOrderStatus(
	current: LabOrderStatus,
	target: LabOrderStatus,
): boolean {
	if (current === target) return true;

	const transitions: Record<LabOrderStatus, LabOrderStatus[]> = {
		draft: ["sent", "cancelled"],
		sent: ["in_progress", "ready", "received", "cancelled"],
		in_progress: ["ready", "received", "cancelled", "rejected_remake"],
		ready: ["received", "cancelled", "rejected_remake"],
		received: ["fitted", "completed", "rejected_remake"],
		fitted: ["completed", "rejected_remake"],
		completed: ["rejected_remake"],
		cancelled: ["draft", "sent"],
		rejected_remake: ["draft", "sent", "cancelled"],
	};

	return transitions[current]?.includes(target) ?? false;
}
