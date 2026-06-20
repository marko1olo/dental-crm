import { create } from "zustand";
import type { 
  DentalSpecialty, 
  VisitNoteDraft, 
  AcceptVisitDraftResponse, 
  SpeechTranscriptionResponse 
} from "@dental/shared";
import { emptyVisitNoteForm, type VisitNoteForm, loadUiPreferences, defaultUiPreferences } from "../AppHelpers";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

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
