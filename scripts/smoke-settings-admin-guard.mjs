import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_SETTINGS_ADMIN_SECRET = "synthetic-settings-secret";
delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;
delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;

const routePath = path.resolve("apps/api/dist/routes/settings.js");

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSettingsRoutes } = await import(pathToFileURL(routePath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createApp() {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    if (error?.name === "ZodError" && Array.isArray(error.issues)) {
      return reply.code(400).send({ error: "ValidationError", issues: error.issues });
    }
    return reply.send(error);
  });
  return app;
}

const preferencesPayload = {
  uiLanguage: "ru",
  selectedWorkspaceRole: "owner",
  selectedSpecialty: "therapist",
  selectedProtocolId: "protocol-therapy-caries",
  selectedPatientId: "11111111-1111-4111-8111-111111111111",
  paymentMethod: "cash",
  taxDocumentYear: 2026,
  selectedDocumentKind: "treatment_plan",
  pricelistSourceKind: "manual",
  usePricelistAi: false,
  recognitionKind: "voice_transcription",
  recognitionTarget: "visit_note",
  importSourceKind: "csv_text",
  documentIngestionTarget: "patients",
  imagingImportSourceKind: "dicom_file",
  smartImportMode: "patients",
  imagingKindFilter: "all",
  dicomWebEndpointUrl: "http://127.0.0.1:8042/dicom-web",
  ohifBaseUrl: "http://127.0.0.1:3000",
  onboardingDismissed: false,
  onboardingDismissedAt: null,
  onboardingStep: "intro",
  onboardingDraftMode: true,
  savedAt: "2026-05-21T08:00:00.000Z"
};

const app = createApp();
await registerSettingsRoutes(app);

const missingClinicReadSecretResponse = await app.inject({
  method: "GET",
  url: "/api/settings/clinic"
});
assert(
  missingClinicReadSecretResponse.statusCode === 403,
  `clinic settings read must reject missing read/admin secret: ${missingClinicReadSecretResponse.statusCode}`
);

const wrongClinicReadSecretResponse = await app.inject({
  method: "GET",
  url: "/api/settings/clinic",
  headers: { "x-dente-admin-secret": "wrong-settings-secret" }
});
assert(
  wrongClinicReadSecretResponse.statusCode === 403,
  `clinic settings read must reject wrong read/admin secret: ${wrongClinicReadSecretResponse.statusCode}`
);

const allowedClinicReadResponse = await app.inject({
  method: "GET",
  url: "/api/settings/clinic",
  headers: { "x-dente-admin-secret": process.env.DENTE_SETTINGS_ADMIN_SECRET }
});
assert(
  allowedClinicReadResponse.statusCode === 200,
  `clinic settings read must allow valid read/admin secret: ${allowedClinicReadResponse.statusCode}`
);

const missingPreferencesReadResponse = await app.inject({
  method: "GET",
  url: "/api/settings/preferences"
});
assert(
  missingPreferencesReadResponse.statusCode === 403,
  `UI preferences read must reject missing read/admin secret: ${missingPreferencesReadResponse.statusCode}`
);

const missingPreferencesWriteResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/preferences",
  payload: preferencesPayload
});
assert(
  missingPreferencesWriteResponse.statusCode === 403,
  `UI preferences write must reject missing mutation/admin secret: ${missingPreferencesWriteResponse.statusCode}`
);

const preferencesResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/preferences",
  headers: { "x-dente-admin-secret": process.env.DENTE_SETTINGS_ADMIN_SECRET },
  payload: preferencesPayload
});
assert(preferencesResponse.statusCode === 200, `UI preferences must accept valid admin secret: ${preferencesResponse.statusCode}`);
assert(preferencesResponse.json().onboardingDraftMode === true, "UI preferences must still persist onboarding draft mode");
assert(preferencesResponse.json().selectedProtocolId === preferencesPayload.selectedProtocolId, "UI preferences must persist selected protocol context");
assert(preferencesResponse.json().selectedPatientId === preferencesPayload.selectedPatientId, "UI preferences must persist selected patient context");

const missingSecretResponse = await app.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  payload: { mode: "one_chair" }
});
assert(missingSecretResponse.statusCode === 403, `missing admin secret must block clinic mode mutation: ${missingSecretResponse.statusCode}`);

const wrongSecretResponse = await app.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  headers: { "x-dente-admin-secret": "wrong-settings-secret" },
  payload: { mode: "one_chair" }
});
assert(wrongSecretResponse.statusCode === 403, `wrong admin secret must block clinic mode mutation: ${wrongSecretResponse.statusCode}`);

const allowedResponse = await app.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  headers: { "x-dente-admin-secret": process.env.DENTE_SETTINGS_ADMIN_SECRET },
  payload: { mode: "one_chair" }
});
assert(allowedResponse.statusCode === 200, `valid settings admin secret must allow clinic mode mutation: ${allowedResponse.statusCode}`);

const chairResponse = await app.inject({
  method: "POST",
  url: "/api/settings/chairs",
  headers: { "x-dente-admin-secret": process.env.DENTE_SETTINGS_ADMIN_SECRET },
  payload: {
    name: "Smoke Guard 1",
    room: "Smoke Guard 1",
    specialization: "therapist",
    hasXraySensor: true,
    hasMicroscope: false,
    hasSurgeryKit: false
  }
});
assert(chairResponse.statusCode === 201, `valid settings admin secret must allow chair creation: ${chairResponse.statusCode}`);

await app.close();

delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
process.env.DENTE_TELEGRAM_ADMIN_SECRET = "synthetic-telegram-only-secret";
process.env.NODE_ENV = "production";
delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;

const telegramOnlyApp = createApp();
await registerSettingsRoutes(telegramOnlyApp);
const telegramOnlySettingsResponse = await telegramOnlyApp.inject({
  method: "GET",
  url: "/api/settings/clinic",
  headers: { "x-dente-admin-secret": process.env.DENTE_TELEGRAM_ADMIN_SECRET }
});
assert(
  telegramOnlySettingsResponse.statusCode === 503,
  `Telegram-only admin secret must not unlock settings routes: ${telegramOnlySettingsResponse.statusCode}`
);
await telegramOnlyApp.close();
delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;

process.env.NODE_ENV = "production";
delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;

const missingEnvApp = createApp();
await registerSettingsRoutes(missingEnvApp);
const missingEnvResponse = await missingEnvApp.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  payload: { mode: "one_chair" }
});
assert(missingEnvResponse.statusCode === 503, `production without settings secret must fail closed: ${missingEnvResponse.statusCode}`);
await missingEnvApp.close();

process.env.NODE_ENV = "development";
process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS = "1";
const explicitEscapeApp = createApp();
await registerSettingsRoutes(explicitEscapeApp);
const explicitEscapeResponse = await explicitEscapeApp.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  payload: { mode: "one_chair" }
});
assert(
  explicitEscapeResponse.statusCode === 200,
  `explicit unguarded settings escape hatch must allow local/prototype mutation: ${explicitEscapeResponse.statusCode}`
);
await explicitEscapeApp.close();

delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.NODE_ENV;

console.log(
  JSON.stringify({
    ok: true,
    settingsMutationGuard: true,
    clinicSettingsReadGuard: true,
    preferencesGuard: true,
    productionFailsClosed: true,
    explicitEscapeHatch: true
  })
);
