import type {
	AcceptVisitDraftResponse,
	DentalSpecialty,
	SpeechTranscriptionResponse,
	ToothClinicalServicePayload,
	VisitFlowResult,
	VisitNoteDraft,
} from "@dental/shared";
import type { VisitNoteForm } from "../../AppConstants";

/**
 * UI-статус зуба в контексте текущего визита (визуальная подсветка в плане/приеме).
 * ВНИМАНИЕ: не путать с клиническим дефектом ToothState из ToothChart / @dental/shared
 * ("Caries" | "Pulpitis" | "Filled" | "Missing" и др.).
 */
export type VisitToothUiState =
	| "idle"
	| "watch"
	| "planned"
	| "done"
	| "missing"
	| "treatment"
	| "caries"
	| "pulpitis"
	| "crown";

export type ToothState = VisitToothUiState;

/**
 * Структурированная клиническая запись по конкретному зубу в рамках приёма.
 * Обеспечивает независимое сохранение диагноза, полости (MO/OD/MOD),
 * формулы препарирования, материала и анестезии для каждого зуба.
 */
export interface VisitToothTreatmentRecord {
	toothNumber: number;
	state: ToothState;
	diagnosis?: string;
	diagnosisIcd10?: string;
	cavity?: string; // "MOD", "MO", "OD", "O", "V", "B", "L", "P"
	surfaces?: string[]; // ["M", "O", "D"]
	preparationFormula?: string;
	material?: string;
	anesthesia?: string;
	treatmentPlan?: string;
	services?: Array<{ code: string; title: string; price?: number }>;
	updatedAt?: string;
}

/**
 * Полный снимок состояния приёма для 1-клик отката (Undo / Redo).
 * Сохраняет дневник, одонтограмму, диагнозы и мультизубные записи.
 */
export interface VisitStateSnapshot {
	timestamp: number;
	description?: string;
	visitNoteForm: VisitNoteForm;
	visitToothStateByCode: Record<string, ToothState>;
	visitToothRecordsByCode: Record<string, VisitToothTreatmentRecord>;
	visitAiDiagnosesByCode: Record<string, string>;
	activeToothNumber?: number | null;
	completedServices?: ToothClinicalServicePayload[];
}

export interface VisitServiceItemInput {
	code?: string;
	code804n?: string;
	title?: string;
	name?: string;
	price?: number;
	unitPriceRub?: number;
	toothCode?: string | undefined;
	toothNumber?: number | string | undefined;
}

export interface ApplyServicesToToothStatePayload {
	patientId?: string | undefined;
	toothNumber?: number | string | undefined;
	toothCode?: string | undefined;
	services?: VisitServiceItemInput[];
	items?: VisitServiceItemInput[];
	service?: VisitServiceItemInput;
}

export interface VisitStore {
	activeToothNumber: number | null;
	setActiveToothNumber: (
		val: number | null | ((prev: number | null) => number | null),
	) => void;

	selectedSpecialty: DentalSpecialty;
	setSelectedSpecialty: (
		val: DentalSpecialty | ((prev: DentalSpecialty) => DentalSpecialty),
	) => void;

	selectedProtocolId: string | null;
	setSelectedProtocolId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;

	clearedTranscriptSnapshot: string | null;
	setClearedTranscriptSnapshot: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;

	transcript: string;
	setTranscript: (val: string | ((prev: string) => string)) => void;

	sessionTranscript: string;
	setSessionTranscript: (val: string | ((prev: string) => string)) => void;

	draft: VisitNoteDraft | null;
	setDraft: (
		val:
			| VisitNoteDraft
			| null
			| ((prev: VisitNoteDraft | null) => VisitNoteDraft | null),
	) => void;

	visitNoteForm: VisitNoteForm;
	setVisitNoteForm: (
		val: VisitNoteForm | ((prev: VisitNoteForm) => VisitNoteForm),
	) => void;

	/** Reactive tooth state map — updated from AI draft + manual clicks. Resets on new visit load. */
	visitToothStateByCode: Record<string, ToothState>;
	setVisitToothStateByCode: (
		val:
			| Record<string, ToothState>
			| ((prev: Record<string, ToothState>) => Record<string, ToothState>),
	) => void;

	visitAiDiagnosesByCode: Record<string, string>;

	/** Структурированные клинические данные по зубам (диагноз, полость MOD, материал, анестезия) */
	visitToothRecordsByCode: Record<string, VisitToothTreatmentRecord>;
	setVisitToothRecordsByCode: (
		val:
			| Record<string, VisitToothTreatmentRecord>
			| ((
					prev: Record<string, VisitToothTreatmentRecord>,
			  ) => Record<string, VisitToothTreatmentRecord>),
	) => void;
	setVisitToothRecord: (
		code: string,
		record: Partial<VisitToothTreatmentRecord>,
	) => void;
	clearVisitToothRecord: (code: string) => void;

	/** Оказанные услуги приёма по Номенклатуре 804н с привязкой к зубу (Мандаты 8b, 8e) */
	completedServices: ToothClinicalServicePayload[];
	addCompletedService: (service: ToothClinicalServicePayload) => void;
	setCompletedServices: (
		val:
			| ToothClinicalServicePayload[]
			| ((
					prev: ToothClinicalServicePayload[],
			  ) => ToothClinicalServicePayload[]),
	) => void;
	removeCompletedService: (index: number) => void;

	/** Стек отката и повтора (Undo / Redo) */
	undoStack: VisitStateSnapshot[];
	redoStack: VisitStateSnapshot[];
	pushVisitSnapshot: (description?: string) => void;
	undoVisit: () => boolean;
	redoVisit: () => boolean;
	canUndo: boolean;
	canRedo: boolean;
	clearVisitHistory: () => void;

	setToothState: (code: string, state: ToothState) => void;
	/**
	 * Полный сброс карты зубов и ИИ-диагнозов.
	 *
	 * БЫЛО: комментарий выше обещал «Resets on new visit load», но
	 * setVisitToothStateByCode не вызывался НИ ИЗ ОДНОГО места, а setToothState
	 * и applyAiToothCodes только добавляют значения. Из-за этого отметки зубов
	 * пациента А оставались на экране при открытии пациента Б, и, что хуже,
	 * applyAiToothCodes отказывался перезаписывать «не idle» значения — то есть
	 * находка ИИ по зубу пациента Б молча игнорировалась в пользу данных пациента А.
	 */
	resetVisitToothState: () => void;
	applyAiToothCodes: (
		detectedCodes: string[],
		primaryState?: ToothState,
		detectedToothStates?: Record<string, ToothState>,
		aiDiagnoses?: Record<string, string>,
	) => void;

	/** Реактивная подсветка зубов при добавлении услуг в приём / кассовый счёт (Мандаты 8c, 8e) */
	applyServicesToToothState: (payload: ApplyServicesToToothStatePayload) => void;

	lastServerDraftSavedAt: string | null;
	setLastServerDraftSavedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;

	serverDraftSyncState: "idle" | "saving" | "saved" | "queued" | "error";
	setServerDraftSyncState: (
		val:
			| "idle"
			| "saving"
			| "saved"
			| "queued"
			| "error"
			| ((
					prev: "idle" | "saving" | "saved" | "queued" | "error",
			  ) => "idle" | "saving" | "saved" | "queued" | "error"),
	) => void;

	localDraftWasRestored: boolean;
	setLocalDraftWasRestored: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;

	pendingVisitSaveCount: number;
	setPendingVisitSaveCount: (val: number | ((prev: number) => number)) => void;

	lastPendingVisitSaveAt: string | null;
	setLastPendingVisitSaveAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;

	lastVisitSaveReceipt: AcceptVisitDraftResponse["saveReceipt"] | null;
	setLastVisitSaveReceipt: (
		val:
			| AcceptVisitDraftResponse["saveReceipt"]
			| null
			| ((
					prev: AcceptVisitDraftResponse["saveReceipt"] | null,
			  ) => AcceptVisitDraftResponse["saveReceipt"] | null),
	) => void;

	speechLastQuality: SpeechTranscriptionResponse["chunk"]["quality"] | null;
	setSpeechLastQuality: (
		val:
			| SpeechTranscriptionResponse["chunk"]["quality"]
			| null
			| ((
					prev: SpeechTranscriptionResponse["chunk"]["quality"] | null,
			  ) => SpeechTranscriptionResponse["chunk"]["quality"] | null),
	) => void;

	isDraftLoading: boolean;
	setIsDraftLoading: (val: boolean | ((prev: boolean) => boolean)) => void;

	isDraftAccepting: boolean;
	setIsDraftAccepting: (val: boolean | ((prev: boolean) => boolean)) => void;

	/*
	 * Было `any`, и именно это хранилище обрывало тип по дороге к панели: сервер
	 * отдаёт разбор приёма по контракту, а панель «Ассистент обработки приема»
	 * получала его как `any` и приводила поля руками. Диагноз ДЛЯ ПАЦИЕНТА,
	 * рекомендации после процедуры и список документов на подпись врач читает
	 * отсюда — здесь и должен стоять тип из контракта.
	 */
	visitFlowResult: VisitFlowResult | null;
	setVisitFlowResult: (
		val:
			| VisitFlowResult
			| null
			| ((prev: VisitFlowResult | null) => VisitFlowResult | null),
	) => void;

	isPendingVisitSyncing: boolean;
	setIsPendingVisitSyncing: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;

	isVisitDictating: boolean;
	setIsVisitDictating: (val: boolean | ((prev: boolean) => boolean)) => void;

	isTranscriptPolishing: boolean;
	setIsTranscriptPolishing: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;

	lastServerDraftSignatureRef: { current: string | null };
	visitDraftUserEditedRef: { current: boolean };

	speechRetrySuggested: boolean;
	setSpeechRetrySuggested: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;

	speechLiveRms: number;
	setSpeechLiveRms: (val: number | ((prev: number) => number)) => void;

	activeStudy: unknown | null;
	setActiveStudy: (
		val: unknown | null | ((prev: unknown | null) => unknown | null),
	) => void;
}

export type VisitStoreSet = (
	partial:
		| VisitStore
		| Partial<VisitStore>
		| ((state: VisitStore) => VisitStore | Partial<VisitStore>),
	replace?: false,
) => void;
