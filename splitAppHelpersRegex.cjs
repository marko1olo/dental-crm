const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'apps/web/src/AppHelpers.tsx');
let content = fs.readFileSync(srcPath, 'utf8');

// Extract all top-level imports
const importRegex = /^import\s+[^;]*;/gm;
const allImports = [];
let match;
while ((match = importRegex.exec(content)) !== null) {
    allImports.push(match[0]);
}
const sharedImportsText = allImports.join('\n');

// Domains based on Phase 6 plan
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

// Split content by exports. This is a bit tricky because "export " might appear in comments,
// but let's assume standard formatting where exports start at the beginning of the line.
// We'll replace all top-level "export " with a unique marker to split by.
// To avoid splitting inside strings/comments, we use a basic regex.
const blocks = content.split(/^export /m);

// blocks[0] contains imports and maybe some top-level variables that aren't exported.
// We'll just preserve it in the barrel file, or ignore it if it's just imports.

const fileToBlocks = {};
Object.keys(domains).forEach(d => fileToBlocks[d] = []);
const commonBlocks = [];

// Re-exports like `export { x } from "./y";`
const reExports = [];

for (let i = 1; i < blocks.length; i++) {
    const block = "export " + blocks[i];
    
    // Check if it's a re-export
    if (block.match(/^export\s+\{.*\}\s+from\s+['"]/s)) {
        reExports.push(block.trim());
        continue;
    }
    
    // Extract the name of the exported entity
    const nameMatch = block.match(/^export\s+(?:function|const|let|var|type|interface|enum|class)\s+([a-zA-Z0-9_]+)/);
    if (!nameMatch) {
        // Might be a multi-export like `export { a, b, c };`
        if (block.match(/^export\s+\{/)) {
            // We just send these to CommonHelpers
            commonBlocks.push(block.trim());
            continue;
        }
        
        console.warn("Could not find name in block:", block.substring(0, 50));
        commonBlocks.push(block.trim());
        continue;
    }
    
    const name = nameMatch[1];
    
    let matchedDomain = null;
    for (const [domain, prefixes] of Object.entries(domains)) {
        if (prefixes.some(p => name.toLowerCase().startsWith(p.toLowerCase()))) {
            matchedDomain = domain;
            break;
        }
    }
    
    if (matchedDomain) {
        fileToBlocks[matchedDomain].push(block.trim());
    } else {
        commonBlocks.push(block.trim());
    }
}

fileToBlocks["CommonHelpers"].push(...commonBlocks);

// Write domain files
Object.keys(domains).forEach(domain => {
    const filePath = path.join(__dirname, `apps/web/src/utils/${domain}.ts`);
    const fileContent = `${sharedImportsText}\n\n${fileToBlocks[domain].join('\n\n')}\n`;
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`Created ${domain}.ts with ${fileToBlocks[domain].length} blocks`);
});

// Create barrel file
let barrelText = `// AppHelpers.tsx - Barrel re-export\n\n`;
Object.keys(domains).forEach(domain => {
  barrelText += `export * from "./utils/${domain}";\n`;
});

if (reExports.length > 0) {
    barrelText += `\n// Original re-exports\n${reExports.join('\n')}\n`;
}

fs.writeFileSync(srcPath, barrelText, 'utf8');
console.log("AppHelpers.tsx replaced with barrel.");
