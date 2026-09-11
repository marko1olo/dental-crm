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

export type TimelineCategory =
	| "clinical"
	| "financial"
	| "administrative"
	| "imaging"
	| "lab"
	| "communication";

export const CLINICAL_TIMELINE_CATEGORIES: readonly TimelineCategory[] = [
	"clinical",
	"financial",
	"administrative",
	"imaging",
	"lab",
	"communication",
] as const;

export const TIMELINE_CATEGORY_LABELS_RU: Record<TimelineCategory, string> = {
	clinical: "Клинический прием",
	financial: "Финансы и оплата",
	administrative: "Административное",
	imaging: "Рентген и снимки",
	lab: "Зуботехническая лаборатория",
	communication: "Коммуникация и связь",
};

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
		clinical: 0,
		financial: 0,
		administrative: 0,
		imaging: 0,
		lab: 0,
		communication: 0,
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

	const validCategories: Set<string> = new Set(CLINICAL_TIMELINE_CATEGORIES);
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
