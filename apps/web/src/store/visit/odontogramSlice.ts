import type { ToothState as ClinicalToothState } from "../../components/odontogram/chart/toothChartTypes";
import type {
	ToothState,
	VisitStateSnapshot,
	VisitStore,
	VisitStoreSet,
	VisitToothTreatmentRecord,
	VisitToothUiState,
} from "./types.js";

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

export type OdontogramSlice = Pick<
	VisitStore,
	| "activeToothNumber"
	| "setActiveToothNumber"
	| "visitToothStateByCode"
	| "setVisitToothStateByCode"
	| "visitAiDiagnosesByCode"
	| "visitToothRecordsByCode"
	| "setVisitToothRecordsByCode"
	| "setVisitToothRecord"
	| "clearVisitToothRecord"
	| "undoStack"
	| "redoStack"
	| "canUndo"
	| "canRedo"
	| "pushVisitSnapshot"
	| "undoVisit"
	| "redoVisit"
	| "clearVisitHistory"
	| "setToothState"
	| "resetVisitToothState"
	| "applyAiToothCodes"
>;

export function createOdontogramSlice(set: VisitStoreSet): OdontogramSlice {
	return {
		activeToothNumber: 16,
		setActiveToothNumber: (val) =>
			set((state) => ({
				activeToothNumber:
					typeof val === "function" ? val(state.activeToothNumber) : val,
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
					visitToothRecordsByCode: {
						...prev.visitToothRecordsByCode,
						[code]: merged,
					},
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
					activeToothNumber:
						targetSnapshot.activeToothNumber ?? state.activeToothNumber,
					completedServices: targetSnapshot.completedServices
						? [...targetSnapshot.completedServices]
						: [],
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
					activeToothNumber:
						targetSnapshot.activeToothNumber ?? state.activeToothNumber,
					completedServices: targetSnapshot.completedServices
						? [...targetSnapshot.completedServices]
						: [],
				};
			});
			return restored;
		},

		clearVisitHistory: () =>
			set({ undoStack: [], redoStack: [], canUndo: false, canRedo: false }),

		setToothState: (code, state) =>
			set((prev) => {
				const toothNumber = Number.parseInt(code, 10) || 16;
				const existing = prev.visitToothRecordsByCode[code] || {
					toothNumber,
					state,
				};
				return {
					visitToothStateByCode: {
						...prev.visitToothStateByCode,
						[code]: state,
					},
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
	};
}
