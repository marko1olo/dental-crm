import fs from 'fs';

const storePath = 'C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts';
let code = fs.readFileSync(storePath, 'utf8');

const imports = `import { GeneratedDocument, TreatmentPlanAcceptanceVariant, PostVisitCareTopic, PhotoVideoConsentMaterial, XrayCbctReferralStudyType, XrayCbctReferralPregnancyStatus, XrayCbctReferralPriority } from "@dental/shared";
import { dateInputValuePlusDays } from "../helpers";
import { defaultClinicalToothRowsText } from "../AppHelpers";
import { postVisitCarePresets } from "../postVisitCareData";
import { loadUiPreferences } from "./uiStore";

const initialUiPreferences = loadUiPreferences();
`;

// Remove the old simple import if it exists
code = code.replace(/import \{ GeneratedDocument \} from \"@dental\/shared\";\n/, '');

// Add the massive imports right after `import { create } from 'zustand';`
code = code.replace(/import \{ create \} from 'zustand';/, `import { create } from 'zustand';\n${imports}`);

fs.writeFileSync(storePath, code);
console.log('Fixed imports successfully.');
