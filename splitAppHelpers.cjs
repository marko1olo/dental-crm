const { Project, SyntaxKind } = require("ts-morph");
const path = require("path");

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "tsconfig.json"),
});

const srcFile = project.getSourceFileOrThrow("apps/web/src/AppHelpers.tsx");
const utilsDir = project.getDirectoryOrThrow("apps/web/src/utils");

// Get all external imports to copy to all new files
const allImports = srcFile.getImportDeclarations().map(imp => imp.getText());
const sharedImportsText = allImports.join("\n");

// Define domain mappings
const domains = {
  DocumentHelpers: ["document", "normalizedDocument", "loadDocument", "saveDocument", "outpatient025u", "medicalRecordExtract", "taxApplication", "compactDocumentText", "confirmedDocumentLiteral"],
  SpeechHelpers: ["speech", "pendingSpeechChunk", "openSpeechChunk", "visitNote", "visitDraft", "BrowserSpeechRecognition", "BrowserWindowWithSpeech", "appendSpeechText", "normalizeSpeech", "readPending", "savePending", "queuePending", "removePending", "blobToBase64", "buildOfflineVisit"],
  ImagingHelpers: ["imaging", "dicom", "mpr", "viewerWindow", "localImaging", "ctImplant", "redactedDicom", "xray", "preparePricelistImage", "readFileAsDataUrl", "loadImageFromDataUrl", "isMpr", "resolveMpr", "redactDicom", "photoVideoMaterialOptions"],
  TelegramHelpers: ["telegram", "denteTelegram", "normalizedTelegram", "isTelegram", "readDenteTelegram", "stripDenteTelegram"],
  PreferencesHelpers: ["uiPreference", "pickUiPreference", "persistUiPreferences", "uiLanguage", "settingsTab", "isUiLanguage", "normalizeUiLanguage", "loadServerUi", "saveServerUi", "initialUiPreferences"],
  PatientHelpers: ["patient", "normalizedPatient", "clinicalTooth", "findPatient", "toothRows", "toothState"],
  AuthOnboardingHelpers: ["onboarding", "auth", "normalizedLocalOrg", "adminSecret", "parseOnboarding", "loadOnboarding", "mergeLocalOnboarding", "saveOnboarding", "denteAdminSecret"],
  AppointmentHelpers: ["appointment", "newAppointment", "normalizedAppointment", "weekdayOptions", "treatmentAcceptance"],
  CommonHelpers: ["responseError", "requestFailure", "browser", "operator", "WorkflowResponseError", "acceptedVisit", "createLocalQueueId", "normalizePersistence", "isNullableString", "isRecordKey", "isOptionValue", "isStringUnionValue", "isBooleanPreference", "isBoundedPreference", "countLabel"]
};

const exportedDecls = Array.from(srcFile.getExportedDeclarations().entries());
console.log(`Found ${exportedDecls.length} exported names.`);

const fileToNodes = {};
Object.keys(domains).forEach(d => fileToNodes[d] = []);
const remaining = [];

for (const [name, decls] of exportedDecls) {
  let matchedDomain = null;
  for (const [domain, prefixes] of Object.entries(domains)) {
    if (prefixes.some(p => name.toLowerCase().startsWith(p.toLowerCase()))) {
      matchedDomain = domain;
      break;
    }
  }
  
  if (matchedDomain) {
    fileToNodes[matchedDomain].push({ name, decls });
  } else {
    remaining.push({ name, decls });
  }
}

// Any remaining goes to CommonHelpers
fileToNodes["CommonHelpers"].push(...remaining);

Object.keys(domains).forEach(domain => {
  const filePath = `apps/web/src/utils/${domain}.ts`;
  let file = project.getSourceFile(filePath);
  if (!file) file = project.createSourceFile(filePath, "", { overwrite: true });
  
  file.addStatements(sharedImportsText);
  
  const addedNodes = new Set();
  
  fileToNodes[domain].forEach(({ name, decls }) => {
    for (const decl of decls) {
      if (addedNodes.has(decl)) continue;
      addedNodes.add(decl);
      
      let text = decl.getText();
      // If it's a variable declaration, we need the whole statement (export const x = ...)
      if (decl.getKind() === SyntaxKind.VariableDeclaration) {
         text = decl.getFirstAncestorByKind(SyntaxKind.VariableStatement).getText();
      }
      
      // We don't want to copy re-exports directly as code, but for now we just dump text.
      // Wait, if it's an ExportSpecifier, it's a re-export. We should just recreate it.
      if (decl.getKind() === SyntaxKind.ExportSpecifier) {
         // skip for now, we'll handle re-exports manually or leave them
         continue; 
      }
      
      // If the text doesn't start with export, add it
      if (!text.startsWith("export")) {
         text = "export " + text;
      }
      
      file.addStatements("\n" + text);
    }
  });
  
  console.log(`Created ${filePath} with ${fileToNodes[domain].length} exports.`);
});

// Create new barrel file
let barrelText = `// AppHelpers.tsx - Barrel re-export\n\n`;
Object.keys(domains).forEach(domain => {
  barrelText += `export * from "./utils/${domain}";\n`;
});

// Re-exports that were in AppHelpers natively
const reExports = srcFile.getExportDeclarations().filter(e => e.hasModuleSpecifier());
reExports.forEach(e => {
  barrelText += e.getText() + "\n";
});

const appHelpers = project.createSourceFile("apps/web/src/AppHelpers.tsx", barrelText, { overwrite: true });

project.saveSync();
console.log("Done.");
