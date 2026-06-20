import fs from 'fs';

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', 'utf8');

// Add imports at the top
const extraImports = `
import { TreatmentPlanAcceptanceVariant, PostVisitCareTopic, PhotoVideoConsentMaterial, XrayCbctReferralStudyType, XrayCbctReferralPregnancyStatus, XrayCbctReferralPriority } from "@dental/shared";
import { dateInputValuePlusDays } from "../helpers";
import { defaultClinicalToothRowsText } from "../AppHelpers";
import { postVisitCarePresets } from "../postVisitCareData";
import { loadUiPreferences } from "./uiStore";

const initialUiPreferences = loadUiPreferences();
`;

code = code.replace(/import { GeneratedDocument } from "@dental\/shared";/, 'import { GeneratedDocument } from "@dental/shared";' + extraImports);

// Fix TS issues with arrays where type was incorrectly inferred
// e.g.   personalDataPurposes: any; -> personalDataPurposes: string[];
code = code.replace(/personalDataPurposes: any;/g, 'personalDataPurposes: string[];');
code = code.replace(/personalDataCategories: any;/g, 'personalDataCategories: string[];');
code = code.replace(/personalDataActions: any;/g, 'personalDataActions: string[];');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', code);
console.log("Fixed documentStore.ts");
