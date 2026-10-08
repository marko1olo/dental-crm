/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Assistant & Staff Pager Event Dispatcher (Layer 1)
 *
 * Assistant & Staff Pager Event Dispatcher:
 * - Types:
 *    - "assistant_needed" (call dental assistant to chair)
 *    - "sterilization_needed" (sanitation / kraft-pack change)
 *    - "emergency_doctor" (urgent medical / resuscitation alert)
 *    - "reception_call" (administrator summon)
 * - State machine: "active" -> "acknowledged" -> "resolved" / "cancelled"
 * - Audit logging with responder IDs and ISO timestamps
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

export const pagerEventTypeSchema = z.enum([
	"assistant_needed",
	"sterilization_needed",
	"emergency_doctor",
	"reception_call",
]);
export type PagerEventType = z.infer<typeof pagerEventTypeSchema>;

export const pagerUrgencySchema = z.enum(["routine", "urgent", "emergency"]);
export type PagerUrgency = z.infer<typeof pagerUrgencySchema>;

export const pagerStatusSchema = z.enum([
	"active",
	"acknowledged",
	"resolved",
	"cancelled",
]);
export type PagerStatus = z.infer<typeof pagerStatusSchema>;

export const PAGER_EVENT_TYPE_META: Record<
	PagerEventType,
	{
		labelRu: string;
		targetRoleRu: string;
		defaultUrgency: PagerUrgency;
		iconName: string;
		badgeColor: string;
		audioAlertName: string;
		descriptionRu: string;
	}
> = {
	assistant_needed: {
		labelRu: "Вызов ассистента",
		targetRoleRu: "Ассистент стоматолога",
		defaultUrgency: "routine",
		iconName: "user-plus",
		badgeColor: "blue",
		audioAlertName: "chime-soft",
		descriptionRu: "Требуется помощь ассистента у кресла (аспирация, 4 руки, замешивание).",
	},
	sterilization_needed: {
		labelRu: "Стерилизация / Санитарка",
		targetRoleRu: "Санитарка / ЦСО",
		defaultUrgency: "routine",
		iconName: "sparkles",
		badgeColor: "teal",
		audioAlertName: "chime-soft",
		descriptionRu: "Требуется смена крафт-пакетов, уборка кабинета или дезинфекция столика.",
	},
	emergency_doctor: {
		labelRu: "ЭКСТРЕННО: Врач / Реанимация",
		targetRoleRu: "Дежурный реаниматолог / Главврач",
		defaultUrgency: "emergency",
		iconName: "alert-triangle",
		badgeColor: "rose",
		audioAlertName: "alarm-critical",
		descriptionRu: "Экстренная ситуация в кабинете! Требуется противошоковая укладка / помощь.",
	},
	reception_call: {
		labelRu: "Вызов администратора",
		targetRoleRu: "Администратор ресепшен",
		defaultUrgency: "routine",
		iconName: "phone-call",
		badgeColor: "amber",
		audioAlertName: "chime-soft",
		descriptionRu: "Требуется администратор (расчет, заказ такси, перенос записи, документы).",
	},
};

export const assistantPagerEventSchema = z.object({
	id: z.string().min(1),
	eventType: pagerEventTypeSchema,
	doctorId: z.string().min(1),
	doctorFullName: z.string().min(1),
	cabinetNumber: z.string().min(1),
	chairId: z.string().optional(),
	urgency: pagerUrgencySchema.default("routine"),
	status: pagerStatusSchema.default("active"),
	createdAtIso: z.string().min(1),
	acknowledgedAtIso: z.string().optional(),
	acknowledgedByUserId: z.string().optional(),
	acknowledgedByName: z.string().optional(),
	resolvedAtIso: z.string().optional(),
	resolvedByUserId: z.string().optional(),
	notes: z.string().optional(),
});
export type AssistantPagerEvent = z.infer<typeof assistantPagerEventSchema>;

/**
 * Creates a structured pager alert event for calling clinic staff to the cabinet.
 */
export function createAssistantPagerEvent(params: {
	eventType: PagerEventType;
	doctorId: string;
	doctorFullName: string;
	cabinetNumber: string;
	chairId?: string;
	urgency?: PagerUrgency;
	notes?: string;
	createdAtIso?: string;
}): AssistantPagerEvent {
	const typeMeta = PAGER_EVENT_TYPE_META[params.eventType];
	const urgency = params.urgency ?? typeMeta.defaultUrgency;
	const createdAtIso = params.createdAtIso ?? new Date().toISOString();
	const id = `pager-${params.eventType}-${params.doctorId.replace(/[^a-zA-Z0-9_-]/g, "")}-${new Date(createdAtIso).getTime()}`;

	return {
		id,
		eventType: params.eventType,
		doctorId: params.doctorId,
		doctorFullName: params.doctorFullName,
		cabinetNumber: params.cabinetNumber,
		chairId: params.chairId,
		urgency,
		status: "active",
		createdAtIso,
		notes: params.notes,
	};
}

/**
 * Acknowledges an active pager event by a responder.
 */
export function acknowledgeAssistantPagerEvent(
	event: AssistantPagerEvent,
	params: {
		responderUserId: string;
		responderFullName: string;
		acknowledgedAtIso?: string;
	},
): AssistantPagerEvent {
	if (event.status !== "active") {
		return event;
	}
	return {
		...event,
		status: "acknowledged",
		acknowledgedAtIso: params.acknowledgedAtIso ?? new Date().toISOString(),
		acknowledgedByUserId: params.responderUserId,
		acknowledgedByName: params.responderFullName,
	};
}

/**
 * Resolves a pager event upon task completion.
 */
export function resolveAssistantPagerEvent(
	event: AssistantPagerEvent,
	params: {
		resolvedByUserId: string;
		resolvedAtIso?: string;
	},
): AssistantPagerEvent {
	return {
		...event,
		status: "resolved",
		resolvedAtIso: params.resolvedAtIso ?? new Date().toISOString(),
		resolvedByUserId: params.resolvedByUserId,
	};
}

/**
 * Cancels a pager event (e.g. called by mistake).
 */
export function cancelAssistantPagerEvent(event: AssistantPagerEvent): AssistantPagerEvent {
	return {
		...event,
		status: "cancelled",
	};
}

/**
 * Filters active or unacknowledged pager alerts for display in workstation header.
 */
export function filterActivePagerEvents(
	events: readonly AssistantPagerEvent[],
	doctorId?: string,
): AssistantPagerEvent[] {
	return events.filter((evt) => {
		if (doctorId && evt.doctorId !== doctorId) return false;
		return evt.status === "active" || evt.status === "acknowledged";
	});
}
