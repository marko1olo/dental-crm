/**
 * DENTE CRM — Offline-First & Multi-Level Sync Type Definitions
 *
 * Строго типизированные контракты:
 * - Локальная очередь мутаций (Outbox) в IndexedDB / LocalStorage
 * - Черновики клинических форм (043/у, одонтограмма, 107-1/у, документы, чеки)
 * - Пакетный шлюз синхронизации (Sync Gateway) с векторными часами
 * - Стратегии разрешения конфликтов Field-Level LWW / CRDT
 * - Кэширование расписания, карточек пациентов 043/у, одонтограммы, прайса 804н и МКБ-10
 * - Экспоненциальный бэкофф и метрики непрерывности рабочего пространства
 */

import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationStatus,
} from "@dental/shared";

export type MutationEntityType =
	| "DIARY_043_DRAFT"
	| "ODONTOGRAM_STATUS"
	| "PRESCRIPTION_107_DRAFT"
	| "DOCUMENT_DRAFT"
	| "CASH_RECEIPT_DRAFT"
	| "APPOINTMENT_BOOKING_DRAFT"
	| "TREATMENT_PLAN_DRAFT"
	| "PATIENT_DRAFT"
	| "GENERIC"
	| "odontogram"
	| "treatment_plan"
	| "visit"
	| "patient"
	| "patient_card_043"
	| "payment"
	| "appointment"
	| "pricelist"
	| "pricelist_804n"
	| "service_item"
	| "inventory"
	| "prescription"
	| "icd10"
	| "icd10_dictionary"
	| SyncMutationEntityKind;

export type MutationAction = SyncMutationAction | "sync";

export type MutationStatus = "pending" | "syncing" | "synced" | "failed";

export interface OfflineMutation<T = unknown> {
	mutationId: string;
	idempotencyKey?: string | undefined;
	payloadHash?: string | undefined;
	entityType: MutationEntityType;
	entityId: string;
	action: MutationAction;
	payload: T;
	timestamp: string; // ISO 8601 with milliseconds (e.g. 2026-08-23T08:30:00.123Z)
	timestampMs: number;
	organizationId?: string | undefined;
	mutationVector?: MutationVector | undefined;
	authorUserId?: string | undefined;
	status: MutationStatus;
	retryCount: number;
	lastError?: string | undefined;
}

export interface OfflineDraft<T = unknown> {
	draftKey: string;
	entityType: MutationEntityType;
	entityId: string;
	data: T;
	updatedAt: string; // ISO 8601 with milliseconds
	updatedAtMs: number;
	organizationId?: string | undefined;
	version: number;
}

export interface EnqueueMutationInput<T = unknown> {
	mutationId?: string | undefined;
	idempotencyKey?: string | undefined;
	entityType: MutationEntityType;
	entityId: string;
	action?: MutationAction | undefined;
	payload: T;
	timestamp?: string | undefined;
	organizationId?: string | undefined;
	mutationVector?: MutationVector | undefined;
	authorUserId?: string | undefined;
}

export interface OfflineQueueMetrics {
	pendingCount: number;
	syncingCount: number;
	failedCount: number;
	syncedCount: number;
	totalDrafts: number;
}

export interface SyncBatchDrainOptions {
	batchSize?: number | undefined;
	maxRetries?: number | undefined;
	baseBackoffMs?: number | undefined;
	maxBackoffMs?: number | undefined;
	jitter?: boolean | undefined;
	organizationId?: string | undefined;
	gatewayUrl?: string | undefined;
	headers?: Record<string, string> | undefined;
	fetchImpl?: typeof fetch | undefined;
}

export interface SyncBatchDrainResult {
	processedCount: number;
	appliedCount: number;
	duplicateCount: number;
	mergedCount: number;
	rejectedCount: number;
	failedCount: number;
	conflicts: FieldConflictDetail[];
	errors: Array<{ mutationId: string; error: string }>;
	serverTime?: string | undefined;
}

export interface SyncConflictEvent {
	mutationId: string;
	entityKind: SyncMutationEntityKind;
	entityId: string;
	conflicts: FieldConflictDetail[];
	appliedAt: string;
}

export type SyncEventListener = (event: {
	type: "progress" | "complete" | "conflict" | "error" | "slow_drain";
	data: unknown;
}) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Clinical Offline Caching Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CachedActiveSchedule {
	scheduleKey: string; // e.g. "schedule_org_2026-08-26"
	date: string; // YYYY-MM-DD
	organizationId?: string | undefined;
	appointments: Array<Record<string, unknown>>;
	cachedAt: string;
	cachedAtMs: number;
}

export interface CachedPatientCard {
	patientId: string;
	organizationId?: string | undefined;
	personalInfo: {
		fullName: string;
		birthDate?: string | undefined;
		phone?: string | undefined;
		passport?: string | undefined;
		snils?: string | undefined;
		policyOms?: string | undefined;
		gender?: string | undefined;
		email?: string | undefined;
	};
	card043?: {
		anamnesis?: string | undefined;
		complaints?: string | undefined;
		pastDiseases?: string | undefined;
		allergies?: string[] | undefined;
		diagnosisIcd10?: string | undefined;
		treatmentPlan?: string | undefined;
		visits?: Array<Record<string, unknown>> | undefined;
	} | undefined;
	odontogram?: Record<string, unknown> | undefined;
	cachedAt: string;
	cachedAtMs: number;
}

export interface CachedOdontogramTooth {
	toothNumber: number;
	statusCode: string;
	surfaces?: string[] | undefined;
	mobility?: number | undefined;
	notes?: string | undefined;
	updatedAt?: string | undefined;
}

export interface CachedOdontogram {
	patientId: string;
	organizationId?: string | undefined;
	teeth: CachedOdontogramTooth[];
	adultMode?: boolean | undefined;
	cachedAt: string;
	cachedAtMs: number;
}

export interface PriceList804nItem {
	code804n: string; // e.g. "A16.07.002.001"
	name: string;
	category?: string | undefined;
	priceRub: number;
	priceKopecks: number;
	unit?: string | undefined;
	isActive?: boolean | undefined;
}

export interface CachedPriceList804n {
	catalogKey: string; // e.g. "pricelist_804n_org_1"
	organizationId?: string | undefined;
	version?: string | undefined;
	items: PriceList804nItem[];
	cachedAt: string;
	cachedAtMs: number;
}

export interface Icd10DictionaryItem {
	code: string; // e.g. "K02.1"
	name: string; // e.g. "Кариес дентина"
	category?: string | undefined;
	class?: string | undefined;
}

export interface CachedIcd10Dictionary {
	dictionaryKey: string; // e.g. "icd10_dental_catalog"
	items: Icd10DictionaryItem[];
	cachedAt: string;
	cachedAtMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialized Domain Outbox Mutation Inputs
// ─────────────────────────────────────────────────────────────────────────────

export interface Card043MutationInput {
	patientId: string;
	diaryData: Record<string, unknown>;
	action?: MutationAction | undefined;
	organizationId?: string | undefined;
	authorUserId?: string | undefined;
}

export interface OdontogramStampMutationInput {
	patientId: string;
	tooth: number;
	surface?: string | undefined;
	condition: string;
	state?: Record<string, unknown> | undefined;
	action?: MutationAction | undefined;
	organizationId?: string | undefined;
	authorUserId?: string | undefined;
}

export interface ServiceAdditionMutationInput {
	visitId?: string | undefined;
	patientId: string;
	serviceItem: {
		code804n?: string | undefined;
		name: string;
		priceRub: number;
		priceKopecks?: number | undefined;
		quantity?: number | undefined;
		toothNumber?: number | undefined;
		discountRub?: number | undefined;
	};
	action?: MutationAction | undefined;
	organizationId?: string | undefined;
	authorUserId?: string | undefined;
}
