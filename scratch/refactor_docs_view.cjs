const fs = require('fs');

let documentStoreCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', 'utf8');

if (!documentStoreCode.includes('taxDocumentYear:')) {
    // Add to DocumentState interface
    documentStoreCode = documentStoreCode.replace('  documentAuditFacts: DocumentAuditFacts | null;', '  documentAuditFacts: DocumentAuditFacts | null;\n  taxDocumentYear: number;\n  setTaxDocumentYear: (val: number | ((prev: number) => number)) => void;\n  selectedDocumentKind: GeneratedDocument["kind"];\n  setSelectedDocumentKind: (val: GeneratedDocument["kind"] | ((prev: GeneratedDocument["kind"]) => GeneratedDocument["kind"])) => void;\n  isDocumentIngesting: boolean;\n  setIsDocumentIngesting: (val: boolean | ((prev: boolean) => boolean)) => void;');

    // Add to store implementation
    documentStoreCode = documentStoreCode.replace('  documentAuditFacts: null,', '  documentAuditFacts: null,\n  taxDocumentYear: initialUiPreferences?.taxDocumentYear ?? new Date().getFullYear(),\n  setTaxDocumentYear: (val) => set((state) => ({ taxDocumentYear: typeof val === "function" ? val(state.taxDocumentYear) : val })),\n  selectedDocumentKind: "treatment_plan",\n  setSelectedDocumentKind: (val) => set((state) => ({ selectedDocumentKind: typeof val === "function" ? val(state.selectedDocumentKind) : val })),\n  isDocumentIngesting: false,\n  setIsDocumentIngesting: (val) => set((state) => ({ isDocumentIngesting: typeof val === "function" ? val(state.isDocumentIngesting) : val })),');

    fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', documentStoreCode);
    console.log('Added missing document fields to DocumentStore');
}

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

// Remove from App.tsx
const regexes = [
  /^\s*const \[taxDocumentYear, setTaxDocumentYear\] = useState\(initialUiPreferences\.taxDocumentYear\);\r?\n/gm,
  /^\s*const \[selectedDocumentKind, setSelectedDocumentKind\] = useState<GeneratedDocument\["kind"\]>\(\s*initialTelegramHandoffTarget\?\.documentKind \?\? initialUiPreferences\.selectedDocumentKind\s*\);\r?\n/gm,
  /^\s*const \[isDocumentIngesting, setIsDocumentIngesting\] = useState\(false\);\r?\n/gm,
];

regexes.forEach(regex => {
    appCode = appCode.replace(regex, '');
});

// Update the destructuring in App.tsx
// It has const { ... } = useDocumentStore();
if (appCode.includes('useDocumentStore();') && !appCode.includes('taxDocumentYear,')) {
    appCode = appCode.replace('  } = useDocumentStore();', '    taxDocumentYear,\n    setTaxDocumentYear,\n    selectedDocumentKind,\n    setSelectedDocumentKind,\n    isDocumentIngesting,\n    setIsDocumentIngesting,\n  } = useDocumentStore();');
}

// Remove the props passed to DocumentsView
const allKeys = ['taxDocumentYear', 'setTaxDocumentYear', 'selectedDocumentKind', 'setSelectedDocumentKind', 'isDocumentIngesting', 'setIsDocumentIngesting'];
allKeys.forEach(key => {
    const propPassRegex = new RegExp(`\\s+${key}={${key}}`, 'g');
    appCode = appCode.replace(propPassRegex, '');
});

// Also fix typescript error with setter parameters that lack type
allKeys.filter(k => k.startsWith('set')).forEach(key => {
    const regex = new RegExp(`(?<![a-zA-Z0-9_])${key}\\(\\(current\\) =>`, 'g');
    appCode = appCode.replace(regex, `${key}((current: any) =>`);
});

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

let docsViewCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx', 'utf8');

allKeys.forEach(key => {
    const propRegex = new RegExp(`^\\s+${key}:\\s+.*?;\\r?\\n`, 'gm');
    docsViewCode = docsViewCode.replace(propRegex, '');
    
    const destructureRegex = new RegExp(`^\\s+${key},\\r?\\n`, 'gm');
    docsViewCode = docsViewCode.replace(destructureRegex, '');
});

// Add to destructuring in DocumentsView
if (docsViewCode.includes('useDocumentStore();') && !docsViewCode.includes('taxDocumentYear,')) {
    docsViewCode = docsViewCode.replace('  } = useDocumentStore();', '    taxDocumentYear,\n    setTaxDocumentYear,\n    selectedDocumentKind,\n    setSelectedDocumentKind,\n    isDocumentIngesting,\n    setIsDocumentIngesting,\n  } = useDocumentStore();');
}

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx', docsViewCode);

console.log('Fixed DocumentsView.tsx and App.tsx');
