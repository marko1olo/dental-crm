/**
 * patientTimelineEngine.ts
 * DENTE Dental CRM — Patient Timeline & Cross-Module Clinical Audit Engine (Wave 123)
 *
 * Reverse-engineered & adapted from DentalPin (backend/app/modules/patient_timeline):
 * - Aggregates cross-module timeline events (clinical, financial, administrative, imaging, lab, communication).
 * - Implements safe category filtering, case-insensitive substring search (title, description, actorName).
 * - Safe boundary pagination with descending date sort.
 * - Resilient event creation with Mandate 8e defaults (Doctor Autonomy, zero dead-ends).
 * - Formats clean A4 outpatient chronology summary with strictly 0 emojis (Mandate 8d item 7).
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPES & CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

export const TIMELINE_CATEGORIES = [
	"visit",
	"treatment",
	"financial",
	"clinical",
	"diagnostic",
	"legal",
	"communication",
	"administrative",
	"imaging",
	"lab",
] as const;

export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number];

export const CLINICAL_TIMELINE_CATEGORIES = [
	"clinical",
	"financial",
	"administrative",
	"imaging",
	"lab",
	"communication",
] as const;

export type ClinicalTimelineCategory = (typeof CLINICAL_TIMELINE_CATEGORIES)[number];

export const TIMELINE_CATEGORY_LABELS_RU: Record<TimelineCategory, string> = {
	clinical: "Клинический прием",
	financial: "Финансы и оплата",
	administrative: "Административное",
	imaging: "Рентген и снимки",
	lab: "Зуботехническая лаборатория",
	communication: "Коммуникация и связь",
	visit: "Визиты и приёмы",
	treatment: "Лечение и планы",
	diagnostic: "Диагностика и КТ",
	legal: "ИДС и договоры",
};

/**
 * Type guard to verify whether a string is a valid TimelineCategory.
 */
export function isTimelineCategory(category: unknown): category is TimelineCategory {
	return (
		typeof category === "string" &&
		(CLINICAL_TIMELINE_CATEGORIES as readonly string[]).includes(category)
	);
}

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

// ─────────────────────────────────────────────────────────────────────────────
// EMR ZOD SCHEMAS & CONTRACTS (MANDATE 8s CONSOLIDATION)
// ─────────────────────────────────────────────────────────────────────────────

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
	administrative: {
		category: "administrative",
		labelRu: "Административное",
		badgeColor: "#64748b",
		badgeBg: "rgba(100, 116, 139, 0.12)",
		iconName: "Folder",
	},
	imaging: {
		category: "imaging",
		labelRu: "Рентген и снимки",
		badgeColor: "#06b6d4",
		badgeBg: "rgba(6, 182, 212, 0.12)",
		iconName: "Scan",
	},
	lab: {
		category: "lab",
		labelRu: "Зуботехническая лаборатория",
		badgeColor: "#8b5cf6",
		badgeBg: "rgba(139, 92, 246, 0.12)",
		iconName: "Wrench",
	},
};

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
		const dateKey = Number.isNaN(dt.getTime())
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

export const PATIENT_TIMELINE_EVENT_TYPES = {
	APPOINTMENT_SCHEDULED: "appointment.scheduled",
	APPOINTMENT_CONFIRMED: "appointment.confirmed",
	APPOINTMENT_CHECKED_IN: "appointment.checked_in",
	APPOINTMENT_IN_TREATMENT: "appointment.in_treatment",
	APPOINTMENT_COMPLETED: "appointment.completed",
	APPOINTMENT_CANCELLED: "appointment.cancelled",
	APPOINTMENT_NO_SHOW: "appointment.no_show",
	TREATMENT_PERFORMED: "treatment.performed",
	TREATMENT_PLAN_CREATED: "treatment_plan.created",
	TREATMENT_PLAN_ITEM_COMPLETED: "treatment_plan.item_completed",
	BUDGET_SENT: "budget.sent",
	BUDGET_ACCEPTED: "budget.accepted",
	BUDGET_REJECTED: "budget.rejected",
	INVOICE_ISSUED: "invoice.issued",
	INVOICE_PAID: "invoice.paid",
	IMAGING_UPLOADED: "imaging.uploaded",
	LAB_ORDER_SENT: "lab.order_sent",
	LAB_RESULT_RECEIVED: "lab.result_received",
	COMMUNICATION_SENT: "communication.sent",
	COMMUNICATION_REPLY: "communication.reply",
} as const;

export interface PatientTimelineEvent {
	id: string;
	patientId: string;
	clinicId?: string;
	category: TimelineCategory;
	eventType: string;
	title: string;
	description?: string;
	eventData?: Record<string, unknown>;
	occurredAt: string;
	actorId?: string;
	actorName?: string;
	actorRole?: string;
	sourceTable: string;
	sourceId: string;
	isCritical?: boolean;
	tags?: string[];
}

export interface TimelineFilter {
	categories?: TimelineCategory[];
	search?: string;
	startDate?: string;
	endDate?: string;
	isCriticalOnly?: boolean;
	page?: number;
	pageSize?: number;
}

export interface TimelineQueryResult {
	entries: PatientTimelineEvent[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
	categoryCounts: Record<TimelineCategory, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function generateUuid(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function parseTimestamp(dateStr?: string): number {
	if (!dateStr || typeof dateStr !== "string") {
		return 0;
	}
	const ts = new Date(dateStr).getTime();
	return Number.isNaN(ts) ? 0 : ts;
}

function createEmptyCategoryCounts(): Record<TimelineCategory, number> {
	return {
		visit: 0,
		treatment: 0,
		financial: 0,
		clinical: 0,
		diagnostic: 0,
		legal: 0,
		communication: 0,
		administrative: 0,
		imaging: 0,
		lab: 0,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CORE TIMELINE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates and validates a PatientTimelineEvent with resilient defaults.
 * Under Mandate 8e (Doctor Autonomy):
 * - Auto-generates UUID v4 if missing.
 * - Auto-generates ISO timestamp if missing or invalid.
 * - Sets fallback defaults for non-critical fields rather than blocking operations.
 */
export function createTimelineEvent(
	payload: Omit<PatientTimelineEvent, "id" | "occurredAt"> & {
		id?: string;
		occurredAt?: string;
	},
): PatientTimelineEvent {
	if (!payload) {
		throw new Error("PatientTimelineEvent payload is required");
	}

	const patientId = typeof payload.patientId === "string" ? payload.patientId.trim() : "";
	if (!patientId) {
		throw new Error("PatientTimelineEvent requires a valid patientId");
	}

	const id = payload.id && typeof payload.id === "string" && payload.id.trim()
		? payload.id.trim()
		: generateUuid();

	let occurredAt = payload.occurredAt;
	if (!occurredAt || typeof occurredAt !== "string" || Number.isNaN(new Date(occurredAt).getTime())) {
		occurredAt = new Date().toISOString();
	}

	const validCategories: Set<string> = new Set(TIMELINE_CATEGORIES);
	const category: TimelineCategory = validCategories.has(payload.category)
		? payload.category
		: "clinical";

	const eventType = payload.eventType && typeof payload.eventType === "string" && payload.eventType.trim()
		? payload.eventType.trim()
		: "clinical.event";

	const title = payload.title && typeof payload.title === "string" && payload.title.trim()
		? payload.title.trim()
		: "Клиническое событие";

	const sourceTable = payload.sourceTable && typeof payload.sourceTable === "string" && payload.sourceTable.trim()
		? payload.sourceTable.trim()
		: "patient_timeline";

	const sourceId = payload.sourceId && typeof payload.sourceId === "string" && payload.sourceId.trim()
		? payload.sourceId.trim()
		: id;

	return {
		id,
		patientId,
		...(payload.clinicId ? { clinicId: payload.clinicId.trim() } : {}),
		category,
		eventType,
		title,
		...(payload.description !== undefined ? { description: payload.description } : {}),
		eventData: payload.eventData && typeof payload.eventData === "object" ? payload.eventData : {},
		occurredAt,
		...(payload.actorId ? { actorId: payload.actorId.trim() } : {}),
		...(payload.actorName ? { actorName: payload.actorName.trim() } : {}),
		...(payload.actorRole ? { actorRole: payload.actorRole.trim() } : {}),
		sourceTable,
		sourceId,
		isCritical: Boolean(payload.isCritical),
		tags: Array.isArray(payload.tags) ? payload.tags.filter((t) => typeof t === "string") : [],
	};
}

/**
 * Filters, searches, sorts, and paginates patient timeline events.
 *
 * Invariants:
 * 1. Sorting: Strictly occurredAt descending (newest first).
 * 2. Category filtering: Matches any selected categories if provided.
 * 3. Text search: Case-insensitive substring matching against title, description, and actorName.
 * 4. Date filtering: Safe timestamp comparison supporting partial dates or ISO strings.
 * 5. Facet counts: categoryCounts accurately reflects the distribution across categories.
 * 6. Pagination: Safe boundaries (page >= 1, pageSize >= 1), computing total and hasMore.
 * 7. Immunity: Handles null, undefined, malformed, or corrupt event objects without throwing.
 */
export function filterAndPaginateTimeline(
	events: PatientTimelineEvent[],
	filter: TimelineFilter = {},
): TimelineQueryResult {
	const categoryCounts = createEmptyCategoryCounts();

	if (!Array.isArray(events) || events.length === 0) {
		const page = typeof filter.page === "number" && !Number.isNaN(filter.page) && filter.page >= 1
			? Math.floor(filter.page)
			: 1;
		const pageSize = typeof filter.pageSize === "number" && !Number.isNaN(filter.pageSize) && filter.pageSize >= 1
			? Math.floor(filter.pageSize)
			: 20;
		return {
			entries: [],
			total: 0,
			page,
			pageSize,
			hasMore: false,
			categoryCounts,
		};
	}

	// 1. Sanitize input array
	const sanitizedEvents: PatientTimelineEvent[] = [];
	for (const e of events) {
		if (e && typeof e === "object" && typeof e.id === "string" && typeof e.patientId === "string") {
			sanitizedEvents.push(e);
		}
	}

	const searchTerm = filter.search && typeof filter.search === "string"
		? filter.search.trim().toLowerCase()
		: "";

	const startTs = filter.startDate ? parseTimestamp(filter.startDate) : 0;
	const endTs = filter.endDate ? parseTimestamp(filter.endDate) : 0;
	const isCriticalOnly = Boolean(filter.isCriticalOnly);

	// 2. Filter by search, date range, and critical status (base criteria)
	const matchingBaseEvents: PatientTimelineEvent[] = [];
	for (const event of sanitizedEvents) {
		if (isCriticalOnly && !event.isCritical) {
			continue;
		}

		if (startTs > 0 || endTs > 0) {
			const eventTs = parseTimestamp(event.occurredAt);
			if (startTs > 0 && eventTs < startTs) {
				continue;
			}
			if (endTs > 0 && eventTs > endTs) {
				continue;
			}
		}

		if (searchTerm.length > 0) {
			const titleMatch = event.title && typeof event.title === "string"
				? event.title.toLowerCase().includes(searchTerm)
				: false;
			const descMatch = event.description && typeof event.description === "string"
				? event.description.toLowerCase().includes(searchTerm)
				: false;
			const actorMatch = event.actorName && typeof event.actorName === "string"
				? event.actorName.toLowerCase().includes(searchTerm)
				: false;

			if (!titleMatch && !descMatch && !actorMatch) {
				continue;
			}
		}

		matchingBaseEvents.push(event);

		// Increment category facet count for matching events
		if (event.category && event.category in categoryCounts) {
			categoryCounts[event.category]++;
		}
	}

	// 3. Filter by category selection if specified
	let filteredEvents: PatientTimelineEvent[];
	if (filter.categories && Array.isArray(filter.categories) && filter.categories.length > 0) {
		const categorySet = new Set<TimelineCategory>(filter.categories);
		filteredEvents = matchingBaseEvents.filter((e) => categorySet.has(e.category));
	} else {
		filteredEvents = matchingBaseEvents;
	}

	// 4. Sort occurredAt descending (newest first)
	filteredEvents.sort((a, b) => {
		const tsA = parseTimestamp(a.occurredAt);
		const tsB = parseTimestamp(b.occurredAt);
		if (tsB !== tsA) {
			return tsB - tsA;
		}
		return (b.id || "").localeCompare(a.id || "");
	});

	// 5. Paginate with safe boundaries
	const total = filteredEvents.length;
	const page = typeof filter.page === "number" && !Number.isNaN(filter.page) && filter.page >= 1
		? Math.floor(filter.page)
		: 1;
	const pageSize = typeof filter.pageSize === "number" && !Number.isNaN(filter.pageSize) && filter.pageSize >= 1
		? Math.floor(filter.pageSize)
		: 20;

	const offset = (page - 1) * pageSize;
	const entries = offset < total ? filteredEvents.slice(offset, offset + pageSize) : [];
	const hasMore = offset + entries.length < total;

	return {
		entries,
		total,
		page,
		pageSize,
		hasMore,
		categoryCounts,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PRINTABLE A4 SUMMARY EXPORT (MANDATE 8d ITEM 7: ZERO EMOJIS)
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTimeRu(isoString: string): string {
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) {
		return isoString || "Не указано";
	}
	const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
	const day = pad(d.getDate());
	const month = pad(d.getMonth() + 1);
	const year = d.getFullYear();
	const hours = pad(d.getHours());
	const minutes = pad(d.getMinutes());
	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

const CATEGORY_TAG_LABELS_RU: Record<TimelineCategory, string> = {
	clinical: "КЛИНИКА",
	financial: "ФИНАНСЫ",
	administrative: "АДМИНИСТРАТИВНОЕ",
	imaging: "СНИМКИ",
	lab: "ЛАБОРАТОРИЯ",
	communication: "СВЯЗЬ",
	visit: "ВИЗИТ",
	treatment: "ЛЕЧЕНИЕ",
	diagnostic: "ДИАГНОСТИКА",
	legal: "ДОГОВОРЫ",
};

/**
 * Generates a clean, structured outpatient chronology summary for A4 medical discharge / Form 043/u.
 *
 * Invariants (Mandate 8d item 7):
 * - STRICTLY 0 EMOJIS (no cartoon icons, no unicode emojis).
 * - Formal typography and layout suited for official medical documentation in the Russian Federation.
 */
export function formatTimelineA4Summary(
	events: PatientTimelineEvent[],
	patientName: string,
	patientBirthDate?: string,
): string {
	const safeName = typeof patientName === "string" && patientName.trim()
		? patientName.trim()
		: "Пациент не указан";

	const safeBirthDate = typeof patientBirthDate === "string" && patientBirthDate.trim()
		? patientBirthDate.trim()
		: "Не указана";

	const safeEvents = Array.isArray(events)
		? events.filter((e) => e && typeof e === "object" && typeof e.title === "string")
		: [];

	// Chronological sort: newest first
	const sorted = [...safeEvents].sort((a, b) => {
		const tsA = parseTimestamp(a.occurredAt);
		const tsB = parseTimestamp(b.occurredAt);
		if (tsB !== tsA) {
			return tsB - tsA;
		}
		return (b.id || "").localeCompare(a.id || "");
	});

	const lines: string[] = [];
	const separator = "=".repeat(78);
	const subSeparator = "-".repeat(78);

	lines.push(separator);
	lines.push("ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА 043/У)");
	lines.push("СКВОЗНОЙ ХРОНОЛОГИЧЕСКИЙ РЕЕСТР СОБЫТИЙ И МАНИПУЛЯЦИЙ");
	lines.push(separator);
	lines.push(`Пациент: ${safeName}`);
	lines.push(`Дата рождения: ${safeBirthDate}`);
	lines.push(`Дата формирования реестра: ${formatDateTimeRu(new Date().toISOString())}`);
	lines.push(`Всего записей в хронологии: ${sorted.length}`);
	lines.push(separator);
	lines.push("");

	if (sorted.length === 0) {
		lines.push("Записи в хронологическом реестре пациента отсутствуют.");
		lines.push("");
	} else {
		for (let i = 0; i < sorted.length; i++) {
			const event = sorted[i];
			if (!event) {
				continue;
			}
			const indexStr = String(i + 1).padStart(3, "0");
			const timeFormatted = formatDateTimeRu(event.occurredAt);
			const categoryTag = CATEGORY_TAG_LABELS_RU[event.category] || "СОБЫТИЕ";
			const criticalTag = event.isCritical ? " [КРИТИЧЕСКИЙ СТАТУС / ВАЖНО]" : "";

			lines.push(`[${indexStr}] ${timeFormatted} | [${categoryTag}] ${event.title}${criticalTag}`);

			if (event.actorName) {
				const rolePart = event.actorRole ? ` (${event.actorRole})` : "";
				lines.push(`      Специалист: ${event.actorName}${rolePart}`);
			}

			if (event.description) {
				lines.push(`      Описание/протокол: ${event.description}`);
			}

			if (event.tags && event.tags.length > 0) {
				lines.push(`      Метки: ${event.tags.join(", ")}`);
			}

			if (i < sorted.length - 1) {
				lines.push(subSeparator);
			}
		}
		lines.push("");
	}

	lines.push(separator);
	lines.push("Документ сформирован в медицинской информационной системе DENTE Dental CRM.");
	lines.push("Подпись лечащего врача / ответственного лица: ____________________ / ____________________");
	lines.push("М.П. (Место печати медицинской организации)");
	lines.push(separator);

	return lines.join("\n");
}

export const formatPatientTimelineChronology = formatTimelineA4Summary;
