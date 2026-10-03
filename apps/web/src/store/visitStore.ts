import type {
	AcceptVisitDraftResponse,
	DentalSpecialty,
	SpeechTranscriptionResponse,
	VisitFlowResult,
	VisitNoteDraft,
} from "@dental/shared";
import { create } from "zustand";
import type { VisitNoteForm } from "../AppConstants";
import { emptyVisitNoteForm } from "../utils/draftDefaults";
import {
	defaultUiPreferences,
	loadUiPreferences,
} from "../utils/preferencesUtils";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

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
	| "treatment";

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
}

export const useVisitStore = create<VisitStore>((set) => ({
	activeToothNumber: 16,
	setActiveToothNumber: (val) =>
		set((state) => ({
			activeToothNumber:
				typeof val === "function" ? val(state.activeToothNumber) : val,
		})),

	selectedSpecialty: initialUiPreferences.selectedSpecialty,
	setSelectedSpecialty: (val) =>
		set((state) => ({
			selectedSpecialty:
				typeof val === "function" ? val(state.selectedSpecialty) : val,
		})),

	selectedProtocolId: initialUiPreferences.selectedProtocolId,
	setSelectedProtocolId: (val) =>
		set((state) => ({
			selectedProtocolId:
				typeof val === "function" ? val(state.selectedProtocolId) : val,
		})),

	clearedTranscriptSnapshot: null,
	setClearedTranscriptSnapshot: (val) =>
		set((state) => ({
			clearedTranscriptSnapshot:
				typeof val === "function" ? val(state.clearedTranscriptSnapshot) : val,
		})),

	transcript: "",
	setTranscript: (val) =>
		set((state) => ({
			transcript: typeof val === "function" ? val(state.transcript) : val,
		})),

	sessionTranscript: "",
	setSessionTranscript: (val) =>
		set((state) => ({
			sessionTranscript:
				typeof val === "function" ? val(state.sessionTranscript) : val,
		})),

	draft: null,
	setDraft: (val) =>
		set((state) => ({
			draft: typeof val === "function" ? val(state.draft) : val,
		})),

	visitNoteForm: emptyVisitNoteForm,
	setVisitNoteForm: (val) =>
		set((state) => ({
			visitNoteForm: typeof val === "function" ? val(state.visitNoteForm) : val,
		})),

	visitToothStateByCode: {},
	setVisitToothStateByCode: (val) =>
		set((state) => ({
			visitToothStateByCode:
				typeof val === "function" ? val(state.visitToothStateByCode) : val,
		})),

	visitAiDiagnosesByCode: {},

	visitToothRecordsByCode: {},
	setVisitToothRecordsByCode: (val) =>
		set((state) => ({
			visitToothRecordsByCode:
				typeof val === "function" ? val(state.visitToothRecordsByCode) : val,
		})),

	setVisitToothRecord: (code, record) =>
		set((prev) => {
			const toothNumber = Number.parseInt(code, 10) || 16;
			const existing = prev.visitToothRecordsByCode[code] || {
				toothNumber,
				state: record.state || prev.visitToothStateByCode[code] || "treatment",
			};
			const merged: VisitToothTreatmentRecord = {
				...existing,
				...record,
				toothNumber,
				state: record.state || existing.state || "treatment",
				updatedAt: new Date().toISOString(),
			};
			const nextStateMap = record.state
				? { ...prev.visitToothStateByCode, [code]: record.state }
				: prev.visitToothStateByCode;
			const nextAiMap = record.diagnosis
				? { ...prev.visitAiDiagnosesByCode, [code]: record.diagnosis }
				: prev.visitAiDiagnosesByCode;
			return {
				visitToothRecordsByCode: { ...prev.visitToothRecordsByCode, [code]: merged },
				visitToothStateByCode: nextStateMap,
				visitAiDiagnosesByCode: nextAiMap,
			};
		}),

	clearVisitToothRecord: (code) =>
		set((prev) => {
			const nextRecords = { ...prev.visitToothRecordsByCode };
			delete nextRecords[code];
			const nextStates = { ...prev.visitToothStateByCode };
			delete nextStates[code];
			const nextDiags = { ...prev.visitAiDiagnosesByCode };
			delete nextDiags[code];
			return {
				visitToothRecordsByCode: nextRecords,
				visitToothStateByCode: nextStates,
				visitAiDiagnosesByCode: nextDiags,
			};
		}),

	undoStack: [],
	redoStack: [],
	canUndo: false,
	canRedo: false,

	pushVisitSnapshot: (description) =>
		set((state) => {
			const snapshot: VisitStateSnapshot = {
				timestamp: Date.now(),
				description: description || "Правка приёма",
				visitNoteForm: JSON.parse(JSON.stringify(state.visitNoteForm)),
				visitToothStateByCode: { ...state.visitToothStateByCode },
				visitToothRecordsByCode: JSON.parse(
					JSON.stringify(state.visitToothRecordsByCode),
				),
				visitAiDiagnosesByCode: { ...state.visitAiDiagnosesByCode },
				activeToothNumber: state.activeToothNumber,
			};
			const nextUndo = [...state.undoStack, snapshot];
			if (nextUndo.length > 50) nextUndo.shift();
			return {
				undoStack: nextUndo,
				redoStack: [],
				canUndo: true,
				canRedo: false,
			};
		}),

	undoVisit: () => {
		let restored = false;
		set((state) => {
			if (state.undoStack.length === 0) return state;
			const nextUndo = [...state.undoStack];
			const targetSnapshot = nextUndo.pop()!;
			const currentSnapshot: VisitStateSnapshot = {
				timestamp: Date.now(),
				description: "Перед отменой",
				visitNoteForm: JSON.parse(JSON.stringify(state.visitNoteForm)),
				visitToothStateByCode: { ...state.visitToothStateByCode },
				visitToothRecordsByCode: JSON.parse(
					JSON.stringify(state.visitToothRecordsByCode),
				),
				visitAiDiagnosesByCode: { ...state.visitAiDiagnosesByCode },
				activeToothNumber: state.activeToothNumber,
			};
			const nextRedo = [...state.redoStack, currentSnapshot];
			restored = true;
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-visit-undo-restored", {
						detail: { snapshot: targetSnapshot, type: "undo" },
					}),
				);
			}
			return {
				undoStack: nextUndo,
				redoStack: nextRedo,
				canUndo: nextUndo.length > 0,
				canRedo: true,
				visitNoteForm: targetSnapshot.visitNoteForm,
				visitToothStateByCode: targetSnapshot.visitToothStateByCode,
				visitToothRecordsByCode: targetSnapshot.visitToothRecordsByCode,
				visitAiDiagnosesByCode: targetSnapshot.visitAiDiagnosesByCode,
				activeToothNumber: targetSnapshot.activeToothNumber ?? state.activeToothNumber,
			};
		});
		return restored;
	},

	redoVisit: () => {
		let restored = false;
		set((state) => {
			if (state.redoStack.length === 0) return state;
			const nextRedo = [...state.redoStack];
			const targetSnapshot = nextRedo.pop()!;
			const currentSnapshot: VisitStateSnapshot = {
				timestamp: Date.now(),
				description: "Перед повтором",
				visitNoteForm: JSON.parse(JSON.stringify(state.visitNoteForm)),
				visitToothStateByCode: { ...state.visitToothStateByCode },
				visitToothRecordsByCode: JSON.parse(
					JSON.stringify(state.visitToothRecordsByCode),
				),
				visitAiDiagnosesByCode: { ...state.visitAiDiagnosesByCode },
				activeToothNumber: state.activeToothNumber,
			};
			const nextUndo = [...state.undoStack, currentSnapshot];
			restored = true;
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-visit-undo-restored", {
						detail: { snapshot: targetSnapshot, type: "redo" },
					}),
				);
			}
			return {
				undoStack: nextUndo,
				redoStack: nextRedo,
				canUndo: true,
				canRedo: nextRedo.length > 0,
				visitNoteForm: targetSnapshot.visitNoteForm,
				visitToothStateByCode: targetSnapshot.visitToothStateByCode,
				visitToothRecordsByCode: targetSnapshot.visitToothRecordsByCode,
				visitAiDiagnosesByCode: targetSnapshot.visitAiDiagnosesByCode,
				activeToothNumber: targetSnapshot.activeToothNumber ?? state.activeToothNumber,
			};
		});
		return restored;
	},

	clearVisitHistory: () =>
		set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false }),

	setToothState: (code, state) =>
		set((prev) => {
			const toothNumber = Number.parseInt(code, 10) || 16;
			const existing = prev.visitToothRecordsByCode[code] || { toothNumber, state };
			return {
				visitToothStateByCode: { ...prev.visitToothStateByCode, [code]: state },
				visitToothRecordsByCode: {
					...prev.visitToothRecordsByCode,
					[code]: {
						...existing,
						state,
						toothNumber,
						updatedAt: new Date().toISOString(),
					},
				},
			};
		}),
	resetVisitToothState: () =>
		set({
			visitToothStateByCode: {},
			visitAiDiagnosesByCode: {},
			visitToothRecordsByCode: {},
		}),
	applyAiToothCodes: (
		detectedCodes,
		primaryState = "planned",
		detectedToothStates,
		aiDiagnoses,
	) =>
		set((prev) => {
			const next = { ...prev.visitToothStateByCode };
			const nextDiagnoses = { ...prev.visitAiDiagnosesByCode };

			// 1. If AI returned explicit states, apply them first
			if (detectedToothStates) {
				for (const [code, state] of Object.entries(detectedToothStates)) {
					if (!next[code] || next[code] === "idle") {
						next[code] = state;
					}
				}
			}

			// 2. Map AI diagnoses
			if (aiDiagnoses) {
				for (const [code, diag] of Object.entries(aiDiagnoses)) {
					nextDiagnoses[code] = diag;
				}
			}

			// 3. Fallback to just lighting up codes with primaryState (from regex parse) if not explicitly mapped
			for (const code of detectedCodes) {
				if (!next[code] || next[code] === "idle") {
					next[code] = primaryState;
				}
			}
			return {
				visitToothStateByCode: next,
				visitAiDiagnosesByCode: nextDiagnoses,
			};
		}),

	lastServerDraftSavedAt: null,
	setLastServerDraftSavedAt: (val) =>
		set((state) => ({
			lastServerDraftSavedAt:
				typeof val === "function" ? val(state.lastServerDraftSavedAt) : val,
		})),

	serverDraftSyncState: "idle",
	setServerDraftSyncState: (val) =>
		set((state) => ({
			serverDraftSyncState:
				typeof val === "function" ? val(state.serverDraftSyncState) : val,
		})),

	localDraftWasRestored: false,
	setLocalDraftWasRestored: (val) =>
		set((state) => ({
			localDraftWasRestored:
				typeof val === "function" ? val(state.localDraftWasRestored) : val,
		})),

	pendingVisitSaveCount: 0,
	setPendingVisitSaveCount: (val) =>
		set((state) => ({
			pendingVisitSaveCount:
				typeof val === "function" ? val(state.pendingVisitSaveCount) : val,
		})),

	lastPendingVisitSaveAt: null,
	setLastPendingVisitSaveAt: (val) =>
		set((state) => ({
			lastPendingVisitSaveAt:
				typeof val === "function" ? val(state.lastPendingVisitSaveAt) : val,
		})),

	lastVisitSaveReceipt: null,
	setLastVisitSaveReceipt: (val) =>
		set((state) => ({
			lastVisitSaveReceipt:
				typeof val === "function" ? val(state.lastVisitSaveReceipt) : val,
		})),

	speechLastQuality: null,
	setSpeechLastQuality: (val) =>
		set((state) => ({
			speechLastQuality:
				typeof val === "function" ? val(state.speechLastQuality) : val,
		})),

	isDraftLoading: false,
	setIsDraftLoading: (val) =>
		set((state) => ({
			isDraftLoading:
				typeof val === "function" ? val(state.isDraftLoading) : val,
		})),

	isDraftAccepting: false,
	setIsDraftAccepting: (val) =>
		set((state) => ({
			isDraftAccepting:
				typeof val === "function" ? val(state.isDraftAccepting) : val,
		})),

	visitFlowResult: null,
	setVisitFlowResult: (val) =>
		set((state) => ({
			visitFlowResult:
				typeof val === "function" ? val(state.visitFlowResult) : val,
		})),

	isPendingVisitSyncing: false,
	setIsPendingVisitSyncing: (val) =>
		set((state) => ({
			isPendingVisitSyncing:
				typeof val === "function" ? val(state.isPendingVisitSyncing) : val,
		})),

	isVisitDictating: false,
	setIsVisitDictating: (val) =>
		set((state) => ({
			isVisitDictating:
				typeof val === "function" ? val(state.isVisitDictating) : val,
		})),

	isTranscriptPolishing: false,
	setIsTranscriptPolishing: (val) =>
		set((state) => ({
			isTranscriptPolishing:
				typeof val === "function" ? val(state.isTranscriptPolishing) : val,
		})),

	lastServerDraftSignatureRef: { current: null },
	visitDraftUserEditedRef: { current: false },

	speechRetrySuggested: false,
	setSpeechRetrySuggested: (val) =>
		set((state) => ({
			speechRetrySuggested:
				typeof val === "function" ? val(state.speechRetrySuggested) : val,
		})),

	speechLiveRms: 0,
	setSpeechLiveRms: (val) =>
		set((state) => ({
			speechLiveRms:
				typeof val === "function" ? val(state.speechLiveRms) : val,
		})),
}));

if (typeof window !== "undefined") {
	(window as any).__useVisitStore = useVisitStore;
}

