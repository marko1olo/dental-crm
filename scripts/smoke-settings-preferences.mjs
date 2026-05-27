import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_SETTINGS_ADMIN_SECRET = "synthetic-settings-secret";

const routePath = path.resolve("apps/api/dist/routes/settings.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(routePath) || !existsSync(sharedPath)) {
  throw new Error("Build API/shared first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSettingsRoutes } = await import(pathToFileURL(routePath).href);
const { createChairSchema } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });
await registerSettingsRoutes(app);
const guardedHeaders = { "x-dente-admin-secret": process.env.DENTE_SETTINGS_ADMIN_SECRET };

const payload = {
  uiLanguage: "ru",
  selectedWorkspaceRole: "administrator",
  selectedSpecialty: "orthopedist",
  selectedProtocolId: "protocol-ortho-crown",
  selectedPatientId: "11111111-1111-4111-8111-111111111111",
  scheduleDoctorFilterId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
  scheduleAssistantFilterId: "f365da0c-7094-4f80-b52d-59b7b1254791",
  scheduleChairFilterId: "b5450677-b0fc-4228-9672-56b27062783f",
  scheduleDefaultDoctorUserId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
  scheduleDefaultAssistantUserId: "f365da0c-7094-4f80-b52d-59b7b1254791",
  scheduleDefaultChairId: "b5450677-b0fc-4228-9672-56b27062783f",
  scheduleStatusFilter: "confirmed",
  scheduleDateFilter: "2026-05-20",
  paymentMethod: "bank_transfer",
  taxDocumentYear: 2025,
  selectedDocumentKind: "paid_medical_services_contract",
  taxApplicationForm: "knd_1151156",
  taxApplicationDeliveryChannel: "portal",
  paymentReceiptTaxSupportRequested: true,
  procedureConsentProcedureType: "surgery_extraction",
  postVisitCareTopic: "extraction",
  pricelistSourceKind: "spreadsheet_copy",
  usePricelistAi: true,
  recognitionKind: "voice_transcription",
  recognitionTarget: "visit_note",
  importSourceKind: "csv_text",
  documentIngestionTarget: "patients",
  imagingImportSourceKind: "dicom_file",
  smartImportMode: "patients",
  imagingKindFilter: "cbct",
  dicomWebEndpointUrl: "http://127.0.0.1:8042/dicom-web",
  ohifBaseUrl: "http://127.0.0.1:3000",
  telegramBotConfigId: "clinic-main",
  telegramLinkSubjectType: "staff",
  telegramLinkStaffId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
  telegramOutboxStatusFilter: "due",
  telegramOutboxTemplateFilter: "review_request",
  onboardingDismissed: true,
  onboardingDismissedAt: "2026-05-20T10:00:00.000Z",
  onboardingStep: "telegram"
};

const saveResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/preferences",
  headers: guardedHeaders,
  payload
});
assert(saveResponse.statusCode === 200, `preference save failed: ${saveResponse.statusCode}`);
const saved = saveResponse.json();
assert(saved.selectedWorkspaceRole === "administrator", "saved role mismatch");
assert(saved.uiLanguage === "ru", "saved language mismatch");
assert(saved.selectedProtocolId === payload.selectedProtocolId, "saved selected protocol mismatch");
assert(saved.selectedPatientId === payload.selectedPatientId, "saved selected patient mismatch");
assert(saved.scheduleDoctorFilterId === payload.scheduleDoctorFilterId, "saved schedule doctor filter mismatch");
assert(saved.scheduleAssistantFilterId === payload.scheduleAssistantFilterId, "saved schedule assistant filter mismatch");
assert(saved.scheduleChairFilterId === payload.scheduleChairFilterId, "saved schedule chair filter mismatch");
assert(saved.scheduleDefaultDoctorUserId === payload.scheduleDefaultDoctorUserId, "saved schedule default doctor mismatch");
assert(saved.scheduleDefaultAssistantUserId === payload.scheduleDefaultAssistantUserId, "saved schedule default assistant mismatch");
assert(saved.scheduleDefaultChairId === payload.scheduleDefaultChairId, "saved schedule default chair mismatch");
assert(saved.scheduleStatusFilter === payload.scheduleStatusFilter, "saved schedule status filter mismatch");
assert(saved.scheduleDateFilter === payload.scheduleDateFilter, "saved schedule date filter mismatch");
assert(saved.taxDocumentYear === 2025, "saved tax year mismatch");
assert(saved.selectedDocumentKind === "paid_medical_services_contract", "saved document kind mismatch");
assert(saved.taxApplicationForm === payload.taxApplicationForm, "saved tax application form mismatch");
assert(saved.taxApplicationDeliveryChannel === payload.taxApplicationDeliveryChannel, "saved tax delivery channel mismatch");
assert(saved.paymentReceiptTaxSupportRequested === true, "saved receipt tax support flag mismatch");
assert(saved.procedureConsentProcedureType === payload.procedureConsentProcedureType, "saved procedure consent type mismatch");
assert(saved.postVisitCareTopic === payload.postVisitCareTopic, "saved post-visit care topic mismatch");
assert(saved.telegramLinkSubjectType === payload.telegramLinkSubjectType, "saved Telegram QR subject type mismatch");
assert(saved.telegramBotConfigId === payload.telegramBotConfigId, "saved Telegram bot config id mismatch");
assert(saved.telegramLinkStaffId === payload.telegramLinkStaffId, "saved Telegram QR staff mismatch");
assert(saved.telegramOutboxStatusFilter === payload.telegramOutboxStatusFilter, "saved Telegram outbox status filter mismatch");
assert(saved.telegramOutboxTemplateFilter === payload.telegramOutboxTemplateFilter, "saved Telegram outbox template filter mismatch");
assert(saved.onboardingDismissedAt === payload.onboardingDismissedAt, "saved onboarding dismissal timestamp mismatch");
assert(saved.onboardingStep === "telegram", "saved onboarding step mismatch");
assert(saved.savedAt, "server must stamp savedAt");

const readResponse = await app.inject({
  method: "GET",
  url: "/api/settings/preferences",
  headers: guardedHeaders
});
assert(readResponse.statusCode === 200, `preference read failed: ${readResponse.statusCode}`);
const preferences = readResponse.json().preferences;
assert(preferences.selectedSpecialty === "orthopedist", "read specialty mismatch");
assert(preferences.selectedProtocolId === payload.selectedProtocolId, "read selected protocol mismatch");
assert(preferences.selectedPatientId === payload.selectedPatientId, "read selected patient mismatch");
assert(preferences.scheduleDoctorFilterId === payload.scheduleDoctorFilterId, "read schedule doctor filter mismatch");
assert(preferences.scheduleAssistantFilterId === payload.scheduleAssistantFilterId, "read schedule assistant filter mismatch");
assert(preferences.scheduleChairFilterId === payload.scheduleChairFilterId, "read schedule chair filter mismatch");
assert(preferences.scheduleDefaultDoctorUserId === payload.scheduleDefaultDoctorUserId, "read schedule default doctor mismatch");
assert(preferences.scheduleDefaultAssistantUserId === payload.scheduleDefaultAssistantUserId, "read schedule default assistant mismatch");
assert(preferences.scheduleDefaultChairId === payload.scheduleDefaultChairId, "read schedule default chair mismatch");
assert(preferences.scheduleStatusFilter === payload.scheduleStatusFilter, "read schedule status filter mismatch");
assert(preferences.scheduleDateFilter === payload.scheduleDateFilter, "read schedule date filter mismatch");
assert(preferences.documentIngestionTarget === "patients", "read ingestion target mismatch");
assert(preferences.selectedDocumentKind === "paid_medical_services_contract", "read document kind mismatch");
assert(preferences.taxApplicationForm === payload.taxApplicationForm, "read tax application form mismatch");
assert(preferences.taxApplicationDeliveryChannel === payload.taxApplicationDeliveryChannel, "read tax delivery channel mismatch");
assert(preferences.paymentReceiptTaxSupportRequested === true, "read receipt tax support flag mismatch");
assert(preferences.procedureConsentProcedureType === payload.procedureConsentProcedureType, "read procedure consent type mismatch");
assert(preferences.postVisitCareTopic === payload.postVisitCareTopic, "read post-visit care topic mismatch");
assert(preferences.telegramLinkSubjectType === payload.telegramLinkSubjectType, "read Telegram QR subject type mismatch");
assert(preferences.telegramBotConfigId === payload.telegramBotConfigId, "read Telegram bot config id mismatch");
assert(preferences.telegramLinkStaffId === payload.telegramLinkStaffId, "read Telegram QR staff mismatch");
assert(preferences.telegramOutboxStatusFilter === payload.telegramOutboxStatusFilter, "read Telegram outbox status filter mismatch");
assert(preferences.telegramOutboxTemplateFilter === payload.telegramOutboxTemplateFilter, "read Telegram outbox template filter mismatch");
assert(preferences.onboardingDismissed === true, "read onboarding dismissal mismatch");
assert(preferences.onboardingDismissedAt === payload.onboardingDismissedAt, "read onboarding dismissal timestamp mismatch");
assert(preferences.onboardingStep === "telegram", "read onboarding step mismatch");
assert(preferences.savedAt === saved.savedAt, "read must return persisted savedAt");

for (const invalidLicenseDate of ["not-a-date", "31.02.2026", "2026-05-18 99:99"]) {
  const invalidProfileDateResponse = await app.inject({
    method: "PUT",
    url: "/api/settings/clinic/profile",
    headers: guardedHeaders,
    payload: {
      medicalLicenseIssuedAt: invalidLicenseDate
    }
  });
  assert(invalidProfileDateResponse.statusCode === 400, `clinic profile must reject invalid license date ${invalidLicenseDate}`);
}

const clearedLicenseDateResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  headers: guardedHeaders,
  payload: {
    medicalLicenseIssuedAt: ""
  }
});
assert(clearedLicenseDateResponse.statusCode === 200, "clinic profile must allow clearing license issue date");

const profilePayload = {
  clinicName: "Smoke Dental",
  legalName: "OOO Smoke Dental",
  inn: "1234567890",
  kpp: "123456789",
  ogrn: "1234567890123",
  address: "Samara, Test street, 1",
  phone: "+7 900 000-00-00",
  email: "clinic@example.test",
  website: "https://clinic.example.test",
  medicalLicenseNumber: "L041-01184-63/00000000",
  medicalLicenseIssuedAt: "2026-01-01",
  medicalLicenseIssuer: "Regional health authority",
  signatoryName: "Ivan Petrov",
  signatoryTitle: "Director",
  bankDetails: "Settlement account 40702810000000000000",
  timezone: "Europe/Samara",
  defaultVisitMinutes: 50,
  scheduleDefaults: {
    workdayStart: "08:30",
    workdayEnd: "17:30",
    workingDays: [1, 2, 3, 4, 5, 6],
    appointmentBufferMinutes: 12
  },
  egiszEnabled: true
};

const profileResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  headers: guardedHeaders,
  payload: profilePayload
});
assert(profileResponse.statusCode === 200, `clinic profile save failed: ${profileResponse.statusCode}`);
const clinicSettings = profileResponse.json();
assert(clinicSettings.profile.clinicName === profilePayload.clinicName, "clinic profile name mismatch");
assert(clinicSettings.profile.legalName === profilePayload.legalName, "clinic legal name mismatch");
assert(clinicSettings.profile.inn === profilePayload.inn, "clinic inn mismatch");
assert(clinicSettings.profile.defaultVisitMinutes === 50, "clinic visit duration mismatch");
assert(clinicSettings.profile.scheduleDefaults.workdayStart === "08:30", "clinic workday start mismatch");
assert(clinicSettings.profile.scheduleDefaults.appointmentBufferMinutes === 12, "clinic buffer mismatch");
assert(clinicSettings.profile.egiszEnabled === true, "clinic egisz flag mismatch");

assert(!createChairSchema.safeParse({ name: "   " }).success, "chair creation must reject blank chair names");
assert(
  !createChairSchema.safeParse({ name: "Smoke Chair", room: "x".repeat(121) }).success,
  "chair creation must reject oversized room labels"
);
const chairCreateResponse = await app.inject({
  method: "POST",
  url: "/api/settings/chairs",
  headers: guardedHeaders,
  payload: {
    name: "  Smoke Chair API  ",
    room: "   ",
    specialization: "therapist",
    notes: "   ",
    hasXraySensor: true,
    hasMicroscope: false,
    hasSurgeryKit: false
  }
});
assert(chairCreateResponse.statusCode === 201, `trimmed chair create failed: ${chairCreateResponse.statusCode}`);
const createdChair = chairCreateResponse.json();
assert(createdChair.name === "Smoke Chair API", "created chair name must be trimmed");
assert(createdChair.room === null, "blank chair room must be stored as null");
assert(createdChair.notes === null, "blank chair notes must be stored as null");

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    savedAt: saved.savedAt,
    selectedWorkspaceRole: saved.selectedWorkspaceRole,
    clinicName: clinicSettings.profile.clinicName
  })
);
