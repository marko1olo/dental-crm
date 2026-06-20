const fs = require('fs');

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

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
  } = useVisitStore();\n`;

appCode = appCode.replace('  } = useImagingStore();\n', '  } = useImagingStore();\n\n' + injectString);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

console.log('App.tsx useVisitStore injected');
