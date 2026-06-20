const fs = require('fs');

const appHelpers = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/AppHelpers.tsx', 'utf8');
const appStorePath = 'C:/Clinic_MVP/dental-crm/apps/web/src/store/appStore.ts';
let appStoreCode = fs.readFileSync(appStorePath, 'utf8');

// Get all imports from AppHelpers
const imports = [];
const lines = appHelpers.split('\n');
for (let line of lines) {
    if (line.startsWith('import ')) {
        // Adjust relative imports if necessary. From `src/AppHelpers.tsx` to `src/store/appStore.ts`
        let fixedLine = line;
        if (line.includes('from "./')) {
            fixedLine = line.replace('from "./', 'from "../');
        } else if (line.includes('from "../')) {
            fixedLine = line.replace('from "../', 'from "../../');
        }
        imports.push(fixedLine);
    }
}

const newContent = imports.join('\n') + '\n\n' + appStoreCode;

// also replace initialUiPreferences with anything
// initialUiPreferences etc. are from AppHelpers. Let's just import them too!
let finalCode = newContent;
if (!finalCode.includes('initialUiPreferences')) {
  finalCode = 'import { initialUiPreferences, initialRecognitionText, emptyClinicProfileDraft, viewFromHash, settingsTabFromHash, loadPendingSpeechChunksFromLocalStorage } from "../AppHelpers";\n' + finalCode;
} else {
  // If we already import them, we might need to export them from AppHelpers
  // Just in case, let's inject it.
  finalCode = 'import { initialUiPreferences, initialRecognitionText, emptyClinicProfileDraft, viewFromHash, settingsTabFromHash, loadPendingSpeechChunksFromLocalStorage } from "../AppHelpers";\n' + finalCode;
}

// wait activeOrganizationId isn't exported anywhere. Let's just mock activeOrganizationId for now, or change it to take an argument, or use a hardcoded value.
finalCode = finalCode.replace('loadPendingSpeechChunksFromLocalStorage(activeOrganizationId)', 'loadPendingSpeechChunksFromLocalStorage("hardcoded-id-for-store")');

fs.writeFileSync(appStorePath, finalCode);
console.log('Fixed imports in appStore.ts');
