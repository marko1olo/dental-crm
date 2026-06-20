const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

code = code.replace('    documentIngestionTarget,\n    setDocumentIngestionTarget,\n    documentIngestion,\n    setDocumentIngestion,\n  } = useDocumentStore();', '    documentIngestionTarget,\n    setDocumentIngestionTarget,\n    documentIngestion,\n    setDocumentIngestion,\n    taxDocumentYear,\n    setTaxDocumentYear,\n    selectedDocumentKind,\n    setSelectedDocumentKind,\n    isDocumentIngesting,\n    setIsDocumentIngesting,\n  } = useDocumentStore();');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', code);
console.log('Fixed missing document variables in App.tsx');
