import { emptyVisitNoteForm } from "../../utils/draftDefaults";
import {
	defaultUiPreferences,
	loadUiPreferences,
} from "../../utils/preferencesUtils";
import type { VisitStore, VisitStoreSet } from "./types.js";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

export type DiaryProtocolSlice = Pick<
	VisitStore,
	| "activeStudy"
	| "setActiveStudy"
	| "selectedSpecialty"
	| "setSelectedSpecialty"
	| "selectedProtocolId"
	| "setSelectedProtocolId"
	| "clearedTranscriptSnapshot"
	| "setClearedTranscriptSnapshot"
	| "transcript"
	| "setTranscript"
	| "sessionTranscript"
	| "setSessionTranscript"
	| "draft"
	| "setDraft"
	| "visitNoteForm"
	| "setVisitNoteForm"
	| "lastServerDraftSavedAt"
	| "setLastServerDraftSavedAt"
	| "serverDraftSyncState"
	| "setServerDraftSyncState"
	| "localDraftWasRestored"
	| "setLocalDraftWasRestored"
	| "pendingVisitSaveCount"
	| "setPendingVisitSaveCount"
	| "lastPendingVisitSaveAt"
	| "setLastPendingVisitSaveAt"
	| "lastVisitSaveReceipt"
	| "setLastVisitSaveReceipt"
	| "speechLastQuality"
	| "setSpeechLastQuality"
	| "isDraftLoading"
	| "setIsDraftLoading"
	| "isDraftAccepting"
	| "setIsDraftAccepting"
	| "visitFlowResult"
	| "setVisitFlowResult"
	| "isPendingVisitSyncing"
	| "setIsPendingVisitSyncing"
	| "isVisitDictating"
	| "setIsVisitDictating"
	| "isTranscriptPolishing"
	| "setIsTranscriptPolishing"
	| "lastServerDraftSignatureRef"
	| "visitDraftUserEditedRef"
	| "speechRetrySuggested"
	| "setSpeechRetrySuggested"
	| "speechLiveRms"
	| "setSpeechLiveRms"
>;

export function createDiaryProtocolSlice(set: VisitStoreSet): DiaryProtocolSlice {
	return {
		activeStudy: null,
		setActiveStudy: (val) =>
			set((state) => ({
				activeStudy:
					typeof val === "function" ? val(state.activeStudy) : val,
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
	};
}
