import type {
	AcceptVisitDraftResponse,
	DentalSpecialty,
	SpeechTranscriptionResponse,
	ToothClinicalServicePayload,
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
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../components/odontogram/odontogramStorage";
import {
	createDefaultAdultTeethData,
	type ToothData,
	type ToothState as ClinicalToothState,
} from "../components/odontogram/chart/toothChartTypes";
import { useAppStore } from "./appStore";

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
	| "treatment"
	| "caries"
	| "pulpitis"
	| "crown";

export type ToothState = VisitToothUiState;

/**
 * Преобразование UI-статуса приёма в клинический статус зуба одонтограммы ToothChart
 */
export function mapVisitUiStateToToothDataState(
	uiState: VisitToothUiState,
): ClinicalToothState {
	switch (uiState) {
		case "done":
			return "Filled";
		case "crown":
			return "Crown";
		case "missing":
			return "Missing";
		case "treatment":
			return "Pulpitis";
		case "caries":
			return "Caries";
		case "pulpitis":
			return "Pulpitis";
		case "planned":
			return "Caries";
		case "watch":
		case "idle":
		default:
			return "Healthy";
	}
}

/**
 * Автоматическое сопоставление услуги Номенклатуры 804н / клинической манипуляции
 * с целевым статусом зуба на одонтограмме (Мандаты 8c, 8e).
 *
 * - Пломбирование / реставрация (A16.07.002%) -> "done" (зеленый)
 * - Удаление зуба (A16.07.001%) -> "missing" (перечеркнутый серый)
 * - Ортопедия / коронка (A16.07.004%) -> "crown" / "done" (золотистый)
 * - Эндодонтия / пульпит (A16.07.030%, A16.07.008%) -> "treatment" (красный)
 */
export function inferToothStateFromService(service: {
	code?: string;
	code804n?: string;
	title?: string;
	name?: string;
}): ToothState {
	const code = (service.code804n || service.code || "").trim();
	const title = (service.title || service.name || "").toLowerCase();

	// 1. Проверка кодов Номенклатуры 804н
	if (code.startsWith("A16.07.001")) {
		return "missing"; // Удаление зуба
	}
	if (code.startsWith("A16.07.004")) {
		return "crown"; // Ортопедия / коронка
	}
	if (code.startsWith("A16.07.002")) {
		return "done"; // Пломбирование / реставрация
	}
	if (
		code.startsWith("A16.07.030") ||
		code.startsWith("A16.07.008") ||
		code.startsWith("A16.07.082")
	) {
		return "treatment"; // Эндодонтия / корневые каналы / пульпит
	}

	// 2. Проверка текстовых маркеров манипуляции
	if (title.includes("удален")) {
		return "missing";
	}
	if (
		title.includes("коронк") ||
		title.includes("протез") ||
		title.includes("вкладк") ||
		title.includes("циркони") ||
		title.includes("металлокерамик")
	) {
		return "crown";
	}
	if (
		title.includes("пломб") ||
		title.includes("реставрац") ||
		title.includes("композит") ||
		title.includes("герметизац") ||
		title.includes("светоотвержд")
	) {
		return "done";
	}
	if (
		title.includes("пульпит") ||
		title.includes("периодонтит") ||
		title.includes("канал") ||
		title.includes("эндодонт") ||
		title.includes("депульп")
	) {
		return "treatment";
	}

	return "done";
}

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
	applyServicesToToothState: (payload: {
		patientId?: string | undefined;
		toothNumber?: number | string | undefined;
		toothCode?: string | undefined;
		services?: Array<{
			code?: string;
			code804n?: string;
			title?: string;
			name?: string;
			price?: number;
			unitPriceRub?: number;
			toothCode?: string | undefined;
			toothNumber?: number | string | undefined;
		}>;
		items?: Array<{
			code?: string;
			code804n?: string;
			title?: string;
			name?: string;
			price?: number;
			unitPriceRub?: number;
			toothCode?: string | undefined;
			toothNumber?: number | string | undefined;
		}>;
		service?: {
			code?: string;
			code804n?: string;
			title?: string;
			name?: string;
			price?: number;
			unitPriceRub?: number;
			toothCode?: string | undefined;
			toothNumber?: number | string | undefined;
		};
	}) => void;

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

	completedServices: [],
	addCompletedService: (service) =>
		set((prev) => ({
			completedServices: [...prev.completedServices, service],
		})),
	setCompletedServices: (val) =>
		set((state) => ({
			completedServices:
				typeof val === "function" ? val(state.completedServices) : val,
		})),
	removeCompletedService: (index) =>
		set((prev) => ({
			completedServices: prev.completedServices.filter((_, i) => i !== index),
		})),

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
				completedServices: [...state.completedServices],
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
				completedServices: [...state.completedServices],
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
				completedServices: targetSnapshot.completedServices ? [...targetSnapshot.completedServices] : [],
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
				completedServices: [...state.completedServices],
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
				completedServices: targetSnapshot.completedServices ? [...targetSnapshot.completedServices] : [],
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
			completedServices: [],
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

	applyServicesToToothState: (payload) =>
		set((prev) => {
			if (!payload) return prev;
			const rawList = Array.isArray(payload.services)
				? payload.services
				: Array.isArray(payload.items)
					? payload.items
					: payload.service
						? [payload.service]
						: [];

			if (rawList.length === 0 && !payload.toothNumber && !payload.toothCode) {
				return prev;
			}

			const nextToothStates = { ...prev.visitToothStateByCode };
			const nextToothRecords = { ...prev.visitToothRecordsByCode };
			let lastToothNumber: number | null = null;

			// Обработка списка услуг
			for (const srv of rawList) {
				const toothCandidate =
					srv.toothCode ??
					srv.toothNumber ??
					payload.toothCode ??
					payload.toothNumber;

				let codeStr =
					toothCandidate !== undefined && toothCandidate !== null
						? String(toothCandidate).trim()
						: "";

				// Если код зуба не указан в поле, ищем в названии: «(зуб 16)», «(зубы 16, 17)», «Зуб 16:»
				if (!codeStr) {
					const title = srv.title || srv.name || "";
					const match = title.match(/(?:\(?зуб(?:ы)?\s+([A-Za-z0-9,\s]+)\)?|^зуб(?:ы)?\s+([A-Za-z0-9,\s]+):)/i);
					if (match) {
						codeStr = (match[1] || match[2] || "").trim();
					}
				}

				if (
					codeStr &&
					codeStr.toLowerCase() !== "none" &&
					codeStr !== "0" &&
					codeStr.toLowerCase() !== "без зуба"
				) {
					const individualCodes = codeStr.includes(",")
						? codeStr.split(",").map((c) => c.trim()).filter(Boolean)
						: [codeStr];

					for (const singleCode of individualCodes) {
						if (
							!singleCode ||
							singleCode.toLowerCase() === "none" ||
							singleCode === "0" ||
							singleCode.toLowerCase() === "без зуба"
						) {
							continue;
						}

						const state = inferToothStateFromService(srv);
						nextToothStates[singleCode] = state;
						const toothNum = Number.parseInt(singleCode, 10) || 16;
						lastToothNumber = toothNum;

						const existing = nextToothRecords[singleCode] || {
							toothNumber: toothNum,
							state,
						};

						const srvEntry = {
							code: srv.code804n || srv.code || "A16.07.001",
							title: srv.title || srv.name || "Стоматологическая услуга",
							price: srv.price ?? srv.unitPriceRub ?? 0,
						};

						const updatedServices = existing.services
							? [...existing.services, srvEntry]
							: [srvEntry];

						nextToothRecords[singleCode] = {
							...existing,
							toothNumber: toothNum,
							state,
							services: updatedServices,
							updatedAt: new Date().toISOString(),
						};
					}
				}
			}

			// Если список услуг пустой, но указан конкретный зуб
			if (rawList.length === 0 && (payload.toothNumber || payload.toothCode)) {
				const codeStr = String(payload.toothCode || payload.toothNumber).trim();
				if (
					codeStr &&
					codeStr.toLowerCase() !== "none" &&
					codeStr !== "0" &&
					codeStr.toLowerCase() !== "без зуба"
				) {
					const toothNum = Number.parseInt(codeStr, 10) || 16;
					lastToothNumber = toothNum;
					nextToothStates[codeStr] = "done";
					const existing = nextToothRecords[codeStr] || {
						toothNumber: toothNum,
						state: "done" as ToothState,
					};
					nextToothRecords[codeStr] = {
						...existing,
						toothNumber: toothNum,
						state: "done",
						updatedAt: new Date().toISOString(),
					};
				}
			}

			// Определяем затронутые зубы для синхронизации с ToothChart & odontogramStorage
			const affectedToothNumbers: number[] = [];
			for (const [codeStr, state] of Object.entries(nextToothStates)) {
				if (prev.visitToothStateByCode[codeStr] !== state) {
					const num = Number.parseInt(codeStr, 10);
					if (Number.isFinite(num)) affectedToothNumbers.push(num);
				}
			}
			if (lastToothNumber && !affectedToothNumbers.includes(lastToothNumber)) {
				affectedToothNumbers.push(lastToothNumber);
			}

			// Двухуровневое сохранение и реактивная диспетчеризация (Мандаты 8c, 8e)
			const effectivePatientId =
				payload.patientId ||
				useAppStore.getState().activePatientId ||
				useAppStore.getState().dashboard?.activeVisit?.patientId ||
				null;

			if (effectivePatientId && affectedToothNumbers.length > 0) {
				try {
					const existingTeeth =
						loadStoredTeethData(effectivePatientId) || createDefaultAdultTeethData();
					const updatedTeeth: ToothData[] = [...existingTeeth];

					for (const toothNum of affectedToothNumbers) {
						const uiState = nextToothStates[String(toothNum)] ?? "done";
						const clinicalState = mapVisitUiStateToToothDataState(uiState);
						const idx = updatedTeeth.findIndex((t) => t.toothNumber === toothNum);
						if (idx >= 0 && updatedTeeth[idx]) {
							updatedTeeth[idx] = {
								...updatedTeeth[idx],
								toothNumber: toothNum,
								state: clinicalState,
								updatedAt: new Date().toISOString(),
							};
						} else {
							updatedTeeth.push({
								toothNumber: toothNum,
								state: clinicalState,
								updatedAt: new Date().toISOString(),
							});
						}
					}

					saveStoredTeethData(effectivePatientId, updatedTeeth, true);

					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("dente-odontogram-update", {
								detail: {
									patientId: effectivePatientId,
									states: updatedTeeth,
									teeth: updatedTeeth,
								},
							}),
						);
					}
				} catch (storageErr) {
					console.warn(
						"[visitStore] Ошибка локального обновления одонтограммы:",
						storageErr,
					);
				}
			}

			return {
				visitToothStateByCode: nextToothStates,
				visitToothRecordsByCode: nextToothRecords,
				activeToothNumber: lastToothNumber ?? prev.activeToothNumber,
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

	// Сквозная реактивность одонтограммы: автоматическое обновление статуса зуба при начислении услуг
	window.addEventListener("dente-add-services-to-invoice", ((event: Event) => {
		try {
			const detail = (event as CustomEvent)?.detail;
			if (detail) {
				useVisitStore.getState().applyServicesToToothState(detail);
			}
		} catch (err) {
			console.warn("Failed to apply services to tooth state from event:", err);
		}
	}) as EventListener);
}

