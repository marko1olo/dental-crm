import fs from 'fs';

const code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');

const startStr = 'const [documentCreateSavingKind, setDocumentCreateSavingKind] = useState<GeneratedDocument["kind"] | null>(null);';
const endStr = 'const [outpatient025uHealthStatusDisclosureContact, setOutpatient025uHealthStatusDisclosureContact] = useState("");';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr) + endStr.length;

const sliced = code.substring(startIndex, endIndex);

const stateVars = [];
const regex = /const \[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]\s*=\s*useState(?:<([^>]+)>)?\(([\s\S]*?)\);/g;

let match;
while ((match = regex.exec(sliced)) !== null) {
  const name = match[1];
  const setter = match[2];
  const type = match[3] || 'any';
  const defaultValue = match[4].trim();
  stateVars.push({ name, setter, type, defaultValue });
}

let interfaceBody = '';
let storeBody = '';

for (const v of stateVars) {
  let inferredType = v.type;
  if (inferredType === 'any') {
    if (v.defaultValue.startsWith('"') || v.defaultValue.startsWith('\`')) inferredType = 'string';
    else if (v.defaultValue === 'false' || v.defaultValue === 'true') inferredType = 'boolean';
    else if (v.defaultValue.includes('=>')) inferredType = 'string';
  }

  interfaceBody += `  ${v.name}: ${inferredType};\n`;
  interfaceBody += `  ${v.setter}: (val: ${inferredType} | ((prev: ${inferredType}) => ${inferredType})) => void;\n`;

  let cleanDefault = v.defaultValue;
  if (cleanDefault.startsWith('() =>')) {
    cleanDefault = `(${cleanDefault})()`;
  }

  storeBody += `  ${v.name}: ${cleanDefault},\n`;
  storeBody += `  ${v.setter}: (val) => set((state) => ({ ${v.name}: typeof val === 'function' ? (val as any)(state.${v.name}) : val })),\n`;
}

const zustandFile = `
import { create } from 'zustand';
import { GeneratedDocument, TreatmentPlanAcceptanceVariant, PostVisitCareTopic, PhotoVideoConsentMaterial, XrayCbctReferralStudyType, XrayCbctReferralPregnancyStatus, XrayCbctReferralPriority, TaxDeductionApplicationForm, TaxDeductionApplicationDeliveryChannel, TaxDeductionApplicationRelationship, PatientIntakePregnancyStatus, ProcedureSpecificConsentProcedure } from "@dental/shared";
import { dateInputValuePlusDays } from "../AppHelpers";
import { defaultClinicalToothRowsText, toDateTimeLocalValue, loadUiPreferences } from "../AppHelpers";
import { postVisitCarePresets } from "../postVisitCareData";

const initialUiPreferences = loadUiPreferences();

export interface DocumentState {
${interfaceBody}
}

export const useDocumentStore = create<DocumentState>((set) => ({
${storeBody}
}));
`;

// Fix TS issues with arrays
const finalStore = zustandFile
  .replace(/personalDataPurposes: any;/g, 'personalDataPurposes: string[];')
  .replace(/personalDataCategories: any;/g, 'personalDataCategories: string[];')
  .replace(/personalDataActions: any;/g, 'personalDataActions: string[];');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/documentStore.ts', finalStore);
console.log(`Generated Zustand store with ${stateVars.length} state variables.`);
