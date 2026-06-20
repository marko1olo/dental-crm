const fs = require('fs');
let storeCode = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/settingsStore.ts', 'utf8');

const importsToAdd = `
import { 
  DenteTelegramHandoffTarget, 
  DenteTelegramBotStatus, 
  TelegramFeaturePlan,
  DenteTelegramOutboxResponse,
  TelegramOutboxStatusFilter,
  TelegramOutboxTemplateFilter,
  DenteTelegramLinkCodePublic,
  DenteTelegramChatLinkPublic,
  DenteTelegramLinkCodeListResponse,
  DenteTelegramChatLinkListResponse,
  TelegramLinkSubjectType,
  DenteTelegramLinkCodeCreated,
  DenteTelegramMessagePreview,
  DenteTelegramBotMode,
  DenteTelegramVisualCardUrls,
  DenteTelegramFeature,
  DenteTelegramPrivacyMode,
  TelegramPostVisitCheckupDelayDrafts
} from "@dental/shared";
import { OnboardingStep, initialUiPreferences } from "../AppHelpers";

// Hardcoded fallback for missing variables that were removed from AppHelpers
const currentView = "settings";
const settingsTab = "clinic";
const emptyTelegramVisualCardUrlDrafts: DenteTelegramVisualCardUrls = { default: "" };
const defaultTelegramPostVisitCheckupDelayDrafts: TelegramPostVisitCheckupDelayDrafts = { "default": 2 };
`;

storeCode = importsToAdd + '\n' + storeCode;
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/settingsStore.ts', storeCode);
console.log('Fixed imports in settingsStore.ts');
