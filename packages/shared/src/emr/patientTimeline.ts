/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT TIMELINE & CLINICAL AUDIT EVENT AGGREGATOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements a denormalized chronological timeline of patient-scoped events
 * across clinical, operational, financial, and diagnostic modules.
 */

import { z } from "zod";

export const TIMELINE_CATEGORIES = [
	"visit",
	"treatment",
	"financial",
	"clinical",
	"diagnostic",
	"legal",
	"communication",
] as const;
export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number];

export const TIMELINE_EVENT_TYPES = [
	// Visits
	"appointment.scheduled",
	"appointment.confirmed",
	"appointment.checked_in",
	"appointment.in_treatment",
	"appointment.completed",
	"appointment.no_show",
	"appointment.cancelled",

	// Treatments & Plans
	"treatment.performed",
	"treatment_plan.created",
	"treatment_plan.approved",
	"treatment_plan.item_completed",
	"treatment_plan.recalculated",

	// Financial & Budgets
	"budget.sent",
	"budget.accepted",
	"budget.rejected",
	"budget.expired",
	"invoice.issued",
	"payment.received",
	"refund.processed",

	// Clinical & Odontogram
	"odontogram.state_changed",
	"periodontogram.snapshot_closed",
	"anamnesis.updated",
	"allergy.recorded",
	"vital_signs.measured",

	// Diagnostics & Lab
	"dicom.uploaded",
	"xray.captured",
	"lab_order.created",
	"lab_result.received",

	// Legal & Consents
	"consent.signed",
	"contract.executed",
	"legal_guardian.assigned",

	// Communications
	"message.sms_sent",
	"message.whatsapp_sent",
	"reminder.delivered",
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

// ───────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ───────────────────────────────────────────────────────────────────────────

export const timelineCategorySchema = z.enum(TIMELINE_CATEGORIES);

export const timelineEventTypeSchema = z.string().min(3).max(100);

export const patientTimelineEntrySchema = z.object({
	id: z.string().uuid(),
	clinicId: z.string().uuid(),
	patientId: z.string().uuid(),
	eventType: timelineEventTypeSchema,
	eventCategory: timelineCategorySchema,
	sourceTable: z.string().min(1).max(100),
	sourceId: z.string().uuid(),
	title: z.string().min(1).max(300),
	description: z.string().max(4000).nullable().default(null),
	eventData: z.record(z.string(), z.unknown()).nullable().default(null),
	occurredAt: z.string().datetime(),
	createdBy: z.string().uuid().nullable().default(null),
	createdByName: z.string().max(200).nullable().default(null),
	createdAt: z.string().datetime().optional(),
});
export type PatientTimelineEntry = z.infer<typeof patientTimelineEntrySchema>;

export const createPatientTimelineEntrySchema = z.object({
	clinicId: z.string().uuid(),
	patientId: z.string().uuid(),
	eventType: timelineEventTypeSchema,
	eventCategory: timelineCategorySchema,
	sourceTable: z.string().min(1).max(100),
	sourceId: z.string().uuid(),
	title: z.string().min(1).max(300),
	description: z.string().max(4000).optional().nullable(),
	eventData: z.record(z.string(), z.unknown()).optional().nullable(),
	occurredAt: z.string().datetime().optional(),
	createdBy: z.string().uuid().optional().nullable(),
});
export type CreatePatientTimelineEntryInput = z.infer<typeof createPatientTimelineEntrySchema>;

export const patientTimelineFilterSchema = z.object({
	patientId: z.string().uuid(),
	categories: z.array(timelineCategorySchema).optional(),
	eventTypes: z.array(z.string()).optional(),
	fromDate: z.string().datetime().optional(),
	toDate: z.string().datetime().optional(),
	searchQuery: z.string().max(200).optional(),
	limit: z.number().int().min(1).max(500).default(100),
	offset: z.number().int().min(0).default(0),
});
export type PatientTimelineFilter = z.infer<typeof patientTimelineFilterSchema>;

export interface TimelineGroupedByDate {
	readonly date: string; // YYYY-MM-DD
	readonly dateFormattedRu: string;
	readonly totalEvents: number;
	readonly entries: readonly PatientTimelineEntry[];
}

export interface TimelineCategoryMetadata {
	readonly category: TimelineCategory;
	readonly labelRu: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly iconName: string;
}

export const TIMELINE_CATEGORY_META: Record<TimelineCategory, TimelineCategoryMetadata> = {
	visit: {
		category: "visit",
		labelRu: "Визиты и приёмы",
		badgeColor: "#3b82f6",
		badgeBg: "rgba(59, 130, 246, 0.12)",
		iconName: "Calendar",
	},
	treatment: {
		category: "treatment",
		labelRu: "Лечение и планы",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
		iconName: "Activity",
	},
	financial: {
		category: "financial",
		labelRu: "Финансы и сметы",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.12)",
		iconName: "CreditCard",
	},
	clinical: {
		category: "clinical",
		labelRu: "Клинические осмотры",
		badgeColor: "#8b5cf6",
		badgeBg: "rgba(139, 92, 246, 0.12)",
		iconName: "HeartPulse",
	},
	diagnostic: {
		category: "diagnostic",
		labelRu: "Диагностика и КТ",
		badgeColor: "#06b6d4",
		badgeBg: "rgba(6, 182, 212, 0.12)",
		iconName: "Scan",
	},
	legal: {
		category: "legal",
		labelRu: "ИДС и договоры",
		badgeColor: "#ec4899",
		badgeBg: "rgba(236, 72, 153, 0.12)",
		iconName: "FileCheck",
	},
	communication: {
		category: "communication",
		labelRu: "Уведомления и SMS",
		badgeColor: "#64748b",
		badgeBg: "rgba(100, 116, 139, 0.12)",
		iconName: "MessageSquare",
	},
};

// ───────────────────────────────────────────────────────────────────────────
// Helper Functions
// ───────────────────────────────────────────────────────────────────────────

/**
 * Groups raw timeline entries into ascending or descending date clusters (YYYY-MM-DD).
 */
export function groupTimelineEntriesByDate(
	entries: readonly PatientTimelineEntry[],
	order: "desc" | "asc" = "desc",
): TimelineGroupedByDate[] {
	const map = new Map<string, PatientTimelineEntry[]>();

	for (const entry of entries) {
		const dt = new Date(entry.occurredAt);
		const dateKey = isNaN(dt.getTime())
			? "unknown-date"
			: dt.toISOString().split("T")[0]!;

		const list = map.get(dateKey) ?? [];
		list.push(entry);
		map.set(dateKey, list);
	}

	const keys = Array.from(map.keys()).sort((a, b) =>
		order === "desc" ? b.localeCompare(a) : a.localeCompare(b),
	);

	return keys.map((dateKey) => {
		const list = map.get(dateKey)!;
		list.sort((a, b) => {
			const tA = new Date(a.occurredAt).getTime();
			const tB = new Date(b.occurredAt).getTime();
			return order === "desc" ? tB - tA : tA - tB;
		});

		let dateFormattedRu = dateKey;
		if (dateKey !== "unknown-date") {
			const [y, m, d] = dateKey.split("-");
			dateFormattedRu = `${d}.${m}.${y}`;
		}

		return {
			date: dateKey,
			dateFormattedRu,
			totalEvents: list.length,
			entries: list,
		};
	});
}

/**
 * Filters timeline entries in-memory by category, date range, or text search query.
 */
export function filterTimelineEntries(
	entries: readonly PatientTimelineEntry[],
	filter: Partial<PatientTimelineFilter>,
): PatientTimelineEntry[] {
	return entries.filter((entry) => {
		if (filter.categories && filter.categories.length > 0) {
			if (!filter.categories.includes(entry.eventCategory)) return false;
		}

		if (filter.eventTypes && filter.eventTypes.length > 0) {
			if (!filter.eventTypes.includes(entry.eventType)) return false;
		}

		if (filter.fromDate) {
			const fromMs = new Date(filter.fromDate).getTime();
			const entryMs = new Date(entry.occurredAt).getTime();
			if (entryMs < fromMs) return false;
		}

		if (filter.toDate) {
			const toMs = new Date(filter.toDate).getTime();
			const entryMs = new Date(entry.occurredAt).getTime();
			if (entryMs > toMs) return false;
		}

		if (filter.searchQuery) {
			const q = filter.searchQuery.toLowerCase();
			const titleMatch = entry.title.toLowerCase().includes(q);
			const descMatch = entry.description?.toLowerCase().includes(q) ?? false;
			if (!titleMatch && !descMatch) return false;
		}

		return true;
	});
}
