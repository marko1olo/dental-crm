import fs from 'fs';

const storePath = 'C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts';
let code = fs.readFileSync(storePath, 'utf8');

// Replace the imports with the correct paths relative to src/store
code = code.replace(/import \{ dateInputValuePlusDays \} from "\.\.\/helpers";/, 'import { dateInputValuePlusDays } from "../AppHelpers";');
code = code.replace(/import \{ defaultClinicalToothRowsText \} from "\.\.\/AppHelpers";/, 'import { defaultClinicalToothRowsText } from "../AppHelpers";');
// `postVisitCarePresets` comes from `../postVisitCareData` (already correct)
// `loadUiPreferences` comes from `../uiStore`? wait, no. `./uiStore`? Wait, where is `loadUiPreferences` imported from in App.tsx?

fs.writeFileSync(storePath, code);
console.log('Fixed helper imports.');
