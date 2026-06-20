const fs = require('fs');

const appFile = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
let appCode = fs.readFileSync(appFile, 'utf8');

const storeFile = 'C:/Clinic_MVP/dental-crm/apps/web/src/store/visitStore.ts';
const storeCode = `import { create } from "zustand";
import type { 
  DentalSpecialty, 
  VisitNoteDraft, 
  VisitNoteForm, 
  AcceptVisitDraftResponse, 
  SpeechTranscriptionResponse 
} from "@dental/shared";
import { emptyVisitNoteForm, loadUiPreferences, defaultUiPreferences } from "../AppHelpers";

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

  visitNoteForm: emptyVisitNoteForm(),
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
`;

fs.writeFileSync(storeFile, storeCode);
console.log('Created store file');

const toReplace = [
  '  const [selectedSpecialty, setSelectedSpecialty] = useState<DentalSpecialty>(initialUiPreferences.selectedSpecialty);',
  '  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(initialUiPreferences.selectedProtocolId);',
  '  const [clearedTranscriptSnapshot, setClearedTranscriptSnapshot] = useState<string | null>(null);',
  '  const [transcript, setTranscript] = useState("");',
  '  const [draft, setDraft] = useState<VisitNoteDraft | null>(null);',
  '  const [visitNoteForm, setVisitNoteForm] = useState<VisitNoteForm>(emptyVisitNoteForm);',
  '  const [lastServerDraftSavedAt, setLastServerDraftSavedAt] = useState<string | null>(null);',
  '  const [serverDraftSyncState, setServerDraftSyncState] = useState<"idle" | "saving" | "saved" | "queued" | "error">("idle");',
  '  const [localDraftWasRestored, setLocalDraftWasRestored] = useState(false);',
  '  const [pendingVisitSaveCount, setPendingVisitSaveCount] = useState(0);',
  '  const [lastPendingVisitSaveAt, setLastPendingVisitSaveAt] = useState<string | null>(null);',
  '  const [lastVisitSaveReceipt, setLastVisitSaveReceipt] = useState<AcceptVisitDraftResponse["saveReceipt"] | null>(null);',
  '  const [speechLastQuality, setSpeechLastQuality] = useState<SpeechTranscriptionResponse["chunk"]["quality"] | null>(null);',
  '  const [isDraftLoading, setIsDraftLoading] = useState(false);',
  '  const [isDraftAccepting, setIsDraftAccepting] = useState(false);',
  '  const [isPendingVisitSyncing, setIsPendingVisitSyncing] = useState(false);',
  '  const [isVisitDictating, setIsVisitDictating] = useState(false);',
  '  const [isTranscriptPolishing, setIsTranscriptPolishing] = useState(false);',
  '  const lastServerDraftSignatureRef = useRef<string | null>(null);',
  '  const visitDraftUserEditedRef = useRef(false);'
];

let foundAll = true;
toReplace.forEach(r => {
    if (!appCode.includes(r.trim())) { // fallback to check if part of it exists
       const start = r.substring(0, r.indexOf('='));
       if (!appCode.includes(start.trim())) {
           console.log('COULD NOT FIND:', r);
           foundAll = false;
       }
    }
});

if (foundAll) {
  // We need to inject the store usage
  const injectTarget = '  const { recognitionKind, setRecognitionKind, recognitionTarget, setRecognitionTarget } = useImagingStore();';
  
  const injectString = `  const {
    selectedSpecialty, setSelectedSpecialty,
    selectedProtocolId, setSelectedProtocolId,
    clearedTranscriptSnapshot, setClearedTranscriptSnapshot,
    transcript, setTranscript,
    draft, setDraft,
    visitNoteForm, setVisitNoteForm,
    lastServerDraftSavedAt, setLastServerDraftSavedAt,
    serverDraftSyncState, setServerDraftSyncState,
    localDraftWasRestored, setLocalDraftWasRestored,
    pendingVisitSaveCount, setPendingVisitSaveCount,
    lastPendingVisitSaveAt, setLastPendingVisitSaveAt,
    lastVisitSaveReceipt, setLastVisitSaveReceipt,
    speechLastQuality, setSpeechLastQuality,
    isDraftLoading, setIsDraftLoading,
    isDraftAccepting, setIsDraftAccepting,
    isPendingVisitSyncing, setIsPendingVisitSyncing,
    isVisitDictating, setIsVisitDictating,
    isTranscriptPolishing, setIsTranscriptPolishing,
    lastServerDraftSignatureRef, visitDraftUserEditedRef
  } = useVisitStore();`;

  if (!appCode.includes('useVisitStore')) {
      appCode = appCode.replace(injectTarget, injectTarget + '\\n' + injectString);
      appCode = appCode.replace('import { useImagingStore } from "./store/imagingStore";', 'import { useImagingStore } from "./store/imagingStore";\\nimport { useVisitStore } from "./store/visitStore";');
  }

  // Remove the replaced lines
  toReplace.forEach(r => {
      // Find the line that contains the definition and remove it
      const start = r.substring(0, r.indexOf('=')).trim();
      const regex = new RegExp('^\\\\s*' + start.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '.*$', 'gm');
      appCode = appCode.replace(regex, '');
  });

  fs.writeFileSync(appFile, appCode);
  console.log('App.tsx modified');
} else {
  console.log('Not applying App.tsx modification due to missing variables.');
}
