import { create } from "zustand";
import type { 
  DentalSpecialty, 
  VisitNoteDraft, 
  AcceptVisitDraftResponse, 
  SpeechTranscriptionResponse 
} from "@dental/shared";
import { emptyVisitNoteForm, type VisitNoteForm, loadUiPreferences, defaultUiPreferences } from "../AppHelpers";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

export type ToothState = "idle" | "watch" | "planned" | "done" | "missing" | "treatment";

export interface VisitStore {
  selectedSpecialty: DentalSpecialty;
  setSelectedSpecialty: (val: DentalSpecialty | ((prev: DentalSpecialty) => DentalSpecialty)) => void;

  selectedProtocolId: string | null;
  setSelectedProtocolId: (val: string | null | ((prev: string | null) => string | null)) => void;

  clearedTranscriptSnapshot: string | null;
  setClearedTranscriptSnapshot: (val: string | null | ((prev: string | null) => string | null)) => void;

  transcript: string;
  setTranscript: (val: string | ((prev: string) => string)) => void;

  draft: VisitNoteDraft | null;
  setDraft: (val: VisitNoteDraft | null | ((prev: VisitNoteDraft | null) => VisitNoteDraft | null)) => void;

  visitNoteForm: VisitNoteForm;
  setVisitNoteForm: (val: VisitNoteForm | ((prev: VisitNoteForm) => VisitNoteForm)) => void;

  /** Reactive tooth state map — updated from AI draft + manual clicks. Resets on new visit load. */
  visitToothStateByCode: Record<string, ToothState>;
  setVisitToothStateByCode: (val: Record<string, ToothState> | ((prev: Record<string, ToothState>) => Record<string, ToothState>)) => void;
  setToothState: (code: string, state: ToothState) => void;
  applyAiToothCodes: (detectedCodes: string[], primaryState?: ToothState, detectedToothStates?: Record<string, ToothState>) => void;

  lastServerDraftSavedAt: string | null;
  setLastServerDraftSavedAt: (val: string | null | ((prev: string | null) => string | null)) => void;

  serverDraftSyncState: "idle" | "saving" | "saved" | "queued" | "error";
  setServerDraftSyncState: (val: "idle" | "saving" | "saved" | "queued" | "error" | ((prev: "idle" | "saving" | "saved" | "queued" | "error") => "idle" | "saving" | "saved" | "queued" | "error")) => void;

  localDraftWasRestored: boolean;
  setLocalDraftWasRestored: (val: boolean | ((prev: boolean) => boolean)) => void;

  pendingVisitSaveCount: number;
  setPendingVisitSaveCount: (val: number | ((prev: number) => number)) => void;

  lastPendingVisitSaveAt: string | null;
  setLastPendingVisitSaveAt: (val: string | null | ((prev: string | null) => string | null)) => void;

  lastVisitSaveReceipt: AcceptVisitDraftResponse["saveReceipt"] | null;
  setLastVisitSaveReceipt: (val: AcceptVisitDraftResponse["saveReceipt"] | null | ((prev: AcceptVisitDraftResponse["saveReceipt"] | null) => AcceptVisitDraftResponse["saveReceipt"] | null)) => void;

  speechLastQuality: SpeechTranscriptionResponse["chunk"]["quality"] | null;
  setSpeechLastQuality: (val: SpeechTranscriptionResponse["chunk"]["quality"] | null | ((prev: SpeechTranscriptionResponse["chunk"]["quality"] | null) => SpeechTranscriptionResponse["chunk"]["quality"] | null)) => void;

  isDraftLoading: boolean;
  setIsDraftLoading: (val: boolean | ((prev: boolean) => boolean)) => void;

  isDraftAccepting: boolean;
  setIsDraftAccepting: (val: boolean | ((prev: boolean) => boolean)) => void;

  isPendingVisitSyncing: boolean;
  setIsPendingVisitSyncing: (val: boolean | ((prev: boolean) => boolean)) => void;

  isVisitDictating: boolean;
  setIsVisitDictating: (val: boolean | ((prev: boolean) => boolean)) => void;

  isTranscriptPolishing: boolean;
  setIsTranscriptPolishing: (val: boolean | ((prev: boolean) => boolean)) => void;

  lastServerDraftSignatureRef: { current: string | null };
  visitDraftUserEditedRef: { current: boolean };
}

export const useVisitStore = create<VisitStore>((set) => ({
  selectedSpecialty: initialUiPreferences.selectedSpecialty,
  setSelectedSpecialty: (val) => set((state) => ({ selectedSpecialty: typeof val === "function" ? val(state.selectedSpecialty) : val })),

  selectedProtocolId: initialUiPreferences.selectedProtocolId,
  setSelectedProtocolId: (val) => set((state) => ({ selectedProtocolId: typeof val === "function" ? val(state.selectedProtocolId) : val })),

  clearedTranscriptSnapshot: null,
  setClearedTranscriptSnapshot: (val) => set((state) => ({ clearedTranscriptSnapshot: typeof val === "function" ? val(state.clearedTranscriptSnapshot) : val })),

  transcript: "",
  setTranscript: (val) => set((state) => ({ transcript: typeof val === "function" ? val(state.transcript) : val })),

  draft: null,
  setDraft: (val) => set((state) => ({ draft: typeof val === "function" ? val(state.draft) : val })),

  visitNoteForm: emptyVisitNoteForm,
  setVisitNoteForm: (val) => set((state) => ({ visitNoteForm: typeof val === "function" ? val(state.visitNoteForm) : val })),

  visitToothStateByCode: {},
  setVisitToothStateByCode: (val) => set((state) => ({ visitToothStateByCode: typeof val === "function" ? val(state.visitToothStateByCode) : val })),
  setToothState: (code, state) => set((prev) => ({ visitToothStateByCode: { ...prev.visitToothStateByCode, [code]: state } })),
  applyAiToothCodes: (detectedCodes, primaryState = "planned", detectedToothStates) => set((prev) => {
    const next = { ...prev.visitToothStateByCode };
    
    // 1. If AI returned explicit states, apply them first
    if (detectedToothStates) {
      for (const [code, state] of Object.entries(detectedToothStates)) {
        if (!next[code] || next[code] === "idle") {
          next[code] = state;
        }
      }
    }
    
    // 2. Fallback to just lighting up codes with primaryState (from regex parse) if not explicitly mapped
    for (const code of detectedCodes) {
      if (!next[code] || next[code] === "idle") {
        next[code] = primaryState;
      }
    }
    return { visitToothStateByCode: next };
  }),

  lastServerDraftSavedAt: null,
  setLastServerDraftSavedAt: (val) => set((state) => ({ lastServerDraftSavedAt: typeof val === "function" ? val(state.lastServerDraftSavedAt) : val })),

  serverDraftSyncState: "idle",
  setServerDraftSyncState: (val) => set((state) => ({ serverDraftSyncState: typeof val === "function" ? val(state.serverDraftSyncState) : val })),

  localDraftWasRestored: false,
  setLocalDraftWasRestored: (val) => set((state) => ({ localDraftWasRestored: typeof val === "function" ? val(state.localDraftWasRestored) : val })),

  pendingVisitSaveCount: 0,
  setPendingVisitSaveCount: (val) => set((state) => ({ pendingVisitSaveCount: typeof val === "function" ? val(state.pendingVisitSaveCount) : val })),

  lastPendingVisitSaveAt: null,
  setLastPendingVisitSaveAt: (val) => set((state) => ({ lastPendingVisitSaveAt: typeof val === "function" ? val(state.lastPendingVisitSaveAt) : val })),

  lastVisitSaveReceipt: null,
  setLastVisitSaveReceipt: (val) => set((state) => ({ lastVisitSaveReceipt: typeof val === "function" ? val(state.lastVisitSaveReceipt) : val })),

  speechLastQuality: null,
  setSpeechLastQuality: (val) => set((state) => ({ speechLastQuality: typeof val === "function" ? val(state.speechLastQuality) : val })),

  isDraftLoading: false,
  setIsDraftLoading: (val) => set((state) => ({ isDraftLoading: typeof val === "function" ? val(state.isDraftLoading) : val })),

  isDraftAccepting: false,
  setIsDraftAccepting: (val) => set((state) => ({ isDraftAccepting: typeof val === "function" ? val(state.isDraftAccepting) : val })),

  isPendingVisitSyncing: false,
  setIsPendingVisitSyncing: (val) => set((state) => ({ isPendingVisitSyncing: typeof val === "function" ? val(state.isPendingVisitSyncing) : val })),

  isVisitDictating: false,
  setIsVisitDictating: (val) => set((state) => ({ isVisitDictating: typeof val === "function" ? val(state.isVisitDictating) : val })),

  isTranscriptPolishing: false,
  setIsTranscriptPolishing: (val) => set((state) => ({ isTranscriptPolishing: typeof val === "function" ? val(state.isTranscriptPolishing) : val })),

  lastServerDraftSignatureRef: { current: null },
  visitDraftUserEditedRef: { current: false },
}));
