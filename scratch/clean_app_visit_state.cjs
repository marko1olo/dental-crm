const fs = require('fs');

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

const regexes = [
  /^\s*const \[selectedSpecialty, setSelectedSpecialty\] = useState<DentalSpecialty>\(initialUiPreferences\.selectedSpecialty\);\r?\n/gm,
  /^\s*const \[selectedProtocolId, setSelectedProtocolId\] = useState<string \| null>\(initialUiPreferences\.selectedProtocolId\);\r?\n/gm,
  /^\s*const \[clearedTranscriptSnapshot, setClearedTranscriptSnapshot\] = useState<string \| null>\(null\);\r?\n/gm,
  /^\s*const \[transcript, setTranscript\] = useState\([\s\S]*?\);\r?\n/gm,
  /^\s*const \[draft, setDraft\] = useState<VisitNoteDraft \| null>\(null\);\r?\n/gm,
  /^\s*const \[visitNoteForm, setVisitNoteForm\] = useState<VisitNoteForm>\(emptyVisitNoteForm\);\r?\n/gm,
  /^\s*const \[lastServerDraftSavedAt, setLastServerDraftSavedAt\] = useState<string \| null>\(null\);\r?\n/gm,
  /^\s*const \[serverDraftSyncState, setServerDraftSyncState\] = useState<"idle" \| "saving" \| "saved" \| "queued" \| "error">\("idle"\);\r?\n/gm,
  /^\s*const \[localDraftWasRestored, setLocalDraftWasRestored\] = useState\(false\);\r?\n/gm,
  /^\s*const \[pendingVisitSaveCount, setPendingVisitSaveCount\] = useState\(0\);\r?\n/gm,
  /^\s*const \[lastPendingVisitSaveAt, setLastPendingVisitSaveAt\] = useState<string \| null>\(null\);\r?\n/gm,
  /^\s*const \[lastVisitSaveReceipt, setLastVisitSaveReceipt\] = useState<AcceptVisitDraftResponse\["saveReceipt"\] \| null>\(null\);\r?\n/gm,
  /^\s*const \[speechLastQuality, setSpeechLastQuality\] = useState<SpeechTranscriptionResponse\["chunk"\]\["quality"\] \| null>\(null\);\r?\n/gm,
  /^\s*const \[isDraftLoading, setIsDraftLoading\] = useState\(false\);\r?\n/gm,
  /^\s*const \[isDraftAccepting, setIsDraftAccepting\] = useState\(false\);\r?\n/gm,
  /^\s*const \[isPendingVisitSyncing, setIsPendingVisitSyncing\] = useState\(false\);\r?\n/gm,
  /^\s*const \[isVisitDictating, setIsVisitDictating\] = useState\(false\);\r?\n/gm,
  /^\s*const \[isTranscriptPolishing, setIsTranscriptPolishing\] = useState\(false\);\r?\n/gm,
  /^\s*const lastServerDraftSignatureRef = useRef<string \| null>\(null\);\r?\n/gm,
  /^\s*const visitDraftUserEditedRef = useRef\(false\);\r?\n/gm,
];

regexes.forEach(regex => {
    appCode = appCode.replace(regex, '');
});

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

console.log('App.tsx cleaned');
