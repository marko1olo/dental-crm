const fs = require('fs');

let patientStoreCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/patientStore.ts', 'utf8');

patientStoreCode = patientStoreCode.replace(
  'export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";\nexport type PatientAdministrativeProfileSaveState = "idle" | "saving" | "saved" | "error";\n',
  ''
);

patientStoreCode = patientStoreCode.replace(
  '  emptyPatientCoreDraft, \n  emptyPatientAdministrativeProfileDraft, \n  loadUiPreferences, \n  defaultUiPreferences \n} from "../AppHelpers";',
  '  emptyPatientCoreDraft, \n  emptyPatientAdministrativeProfileDraft, \n  loadUiPreferences, \n  defaultUiPreferences, \n  type PatientCoreSaveState,\n  type PatientAdministrativeProfileSaveState\n} from "../AppHelpers";'
);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/patientStore.ts', patientStoreCode);
