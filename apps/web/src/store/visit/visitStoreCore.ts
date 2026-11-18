import { create } from "zustand";
import { emptyVisitNoteForm } from "../../utils/draftDefaults.js";
import { createBillingInvoiceSlice } from "./billingInvoiceSlice.js";
import { createDiaryProtocolSlice } from "./diaryProtocolSlice.js";
import { createOdontogramSlice } from "./odontogramSlice.js";
import type { VisitStore } from "./types.js";

export const useVisitStore = create<VisitStore>((set) => ({
	...createOdontogramSlice(set),
	...createDiaryProtocolSlice(set),
	...createBillingInvoiceSlice(set),
	resetPatientVisitSession: () =>
		set({
			visitToothStateByCode: {},
			visitAiDiagnosesByCode: {},
			visitToothRecordsByCode: {},
			completedServices: [],
			visitNoteForm: emptyVisitNoteForm,
			transcript: "",
			sessionTranscript: "",
			clearedTranscriptSnapshot: null,
			draft: null,
			undoStack: [],
			redoStack: [],
			canUndo: false,
			canRedo: false,
			activeToothNumber: null,
			activeStudy: null,
			visitFlowResult: null,
			lastServerDraftSavedAt: null,
			serverDraftSyncState: "idle",
			localDraftWasRestored: false,
			isDraftLoading: false,
			isDraftAccepting: false,
			isPendingVisitSyncing: false,
			isVisitDictating: false,
			isTranscriptPolishing: false,
		}),
}));

declare global {
	interface Window {
		__useVisitStore?: typeof useVisitStore;
	}
}

if (typeof window !== "undefined") {
	window.__useVisitStore = useVisitStore;

	// Сквозная реактивность одонтограммы: автоматическое обновление статуса зуба при начислении услуг
	window.addEventListener("dente-add-services-to-invoice", (event: Event) => {
		try {
			if (event instanceof CustomEvent && event.detail) {
				useVisitStore.getState().applyServicesToToothState(event.detail);
			}
		} catch (err) {
			console.warn("Failed to apply services to tooth state from event:", err);
		}
	});
}
