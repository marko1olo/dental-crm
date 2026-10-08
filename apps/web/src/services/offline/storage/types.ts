import type { MutationEntityType } from "../types";

export type {
	AppointmentMutationInput,
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedOdontogramTooth,
	CachedPatientCard,
	CachedPriceList804n,
	Card043MutationInput,
	CashReceiptMutationInput,
	EnqueueMutationInput,
	Icd10DictionaryItem,
	MutationEntityType,
	MutationStatus,
	OdontogramStampMutationInput,
	OfflineDraft,
	OfflineMutation,
	OfflineQueueMetrics,
	PrescriptionMutationInput,
	PriceList804nItem,
	ServiceAdditionMutationInput,
} from "../types";

export interface SaveOfflineDraftOptions {
	/** Немедленная запись на диск (IndexedDB + LocalStorage). Если false — запись дебаунсится (HDD 5400 RPM защита) */
	readonly immediate?: boolean | undefined;
	/** Кастомная задержка дебаунса в миллисекундах */
	readonly debounceMs?: number | undefined;
}

export interface AutosaveEntry<T = unknown> {
	draftKey: string;
	entityType: MutationEntityType;
	entityId: string;
	data: T;
	organizationId?: string | undefined;
	timer: ReturnType<typeof setTimeout> | null;
	lastScheduledAtMs: number;
}

export interface StorageEstimateInfo {
	usageBytes: number;
	quotaBytes: number;
	percentUsed: number;
	freeBytes: number;
	freeFormatted: string;
	usageFormatted: string;
	isWarning: boolean;
	isPersistent?: boolean | undefined;
	indexedDbAvailable?: boolean | undefined;
}

export interface PatientClinicalCacheRecord<T = unknown> {
	cacheKey: string;
	entityKind: string;
	entityId: string;
	data: T;
	cachedAtMs: number;
	cachedAtIso: string;
	organizationId?: string | undefined;
}
