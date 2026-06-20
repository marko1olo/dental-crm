const fs = require('fs');

let storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/settingsStore.ts', 'utf8');

// Remove types from @dental/shared
storeCode = storeCode.replace('DenteTelegramHandoffTarget,', '');
storeCode = storeCode.replace('TelegramFeaturePlan,', '');
storeCode = storeCode.replace('TelegramOutboxStatusFilter,', '');
storeCode = storeCode.replace('TelegramOutboxTemplateFilter,', '');
storeCode = storeCode.replace('TelegramLinkSubjectType,', '');
storeCode = storeCode.replace('TelegramPostVisitCheckupDelayDrafts', '');

// Remove existing AppHelpers imports
storeCode = storeCode.replace(/import \{ OnboardingStep, initialUiPreferences \} from "\.\.\/AppHelpers";/g, '');
storeCode = storeCode.replace(/import \{ initialUiPreferences \} from "\.\.\/AppHelpers";/g, '');

const newImports = `
import {
  TelegramFeaturePlan,
  TelegramOutboxStatusFilter,
  TelegramOutboxTemplateFilter,
  TelegramLinkSubjectType,
  TelegramPostVisitCheckupDelayDrafts,
  DenteTelegramHandoffTarget,
  OnboardingStep,
  initialUiPreferences
} from "../AppHelpers";
`;

storeCode = newImports + storeCode;
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/settingsStore.ts', storeCode);

let appCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', 'utf8');
appCode = appCode.replace(/setScheduleAdminSecretDraft\s*=\s*\{setScheduleAdminSecretDraft\}/g, '');
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);

let schedProps = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/ScheduleView.tsx', 'utf8');
schedProps = schedProps.replace(/setScheduleAdminSecretDraft:\s*\([^)]*\)\s*=>\s*void;/g, '');
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/ScheduleView.tsx', schedProps);

console.log('Fixed imports and ScheduleView props');
