import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;

const routeFiles = {
  patients: path.resolve("apps/api/dist/routes/patients.js"),
  visits: path.resolve("apps/api/dist/routes/visits.js"),
  billing: path.resolve("apps/api/dist/routes/billing.js"),
  documents: path.resolve("apps/api/dist/routes/documents.js"),
  imports: path.resolve("apps/api/dist/routes/imports.js"),
  smartImports: path.resolve("apps/api/dist/routes/smartImports.js"),
  ai: path.resolve("apps/api/dist/routes/ai.js"),
  speech: path.resolve("apps/api/dist/routes/speech.js"),
  settings: path.resolve("apps/api/dist/routes/settings.js"),
  ingestion: path.resolve("apps/api/dist/routes/ingestion.js"),
  pricelist: path.resolve("apps/api/dist/routes/pricelist.js"),
  imaging: path.resolve("apps/api/dist/routes/imaging.js"),
  clinical: path.resolve("apps/api/dist/routes/clinical.js"),
  communications: path.resolve("apps/api/dist/routes/communications.js"),
  dashboard: path.resolve("apps/api/dist/routes/dashboard.js"),
  system: path.resolve("apps/api/dist/routes/system.js")
};

for (const [label, routePath] of Object.entries(routeFiles)) {
  if (!existsSync(routePath)) {
    throw new Error(`Build API first: npm run build (${label} missing)`);
  }
}

const guardedSources = [
  ["apps/api/src/routes/patients.ts", 3],
  ["apps/api/src/routes/visits.ts", 2],
  ["apps/api/src/routes/billing.ts", 1],
  ["apps/api/src/routes/documents.ts", 3],
  ["apps/api/src/routes/imports.ts", 1],
  ["apps/api/src/routes/smartImports.ts", 1],
  ["apps/api/src/routes/ai.ts", 1],
  ["apps/api/src/routes/speech.ts", 2],
  ["apps/api/src/routes/ingestion.ts", 1],
  ["apps/api/src/routes/imaging.ts", 4],
  ["apps/api/src/routes/clinical.ts", 2],
  ["apps/api/src/routes/communications.ts", 1]
];

const guardedReadSources = [
  ["apps/api/src/routes/dashboard.ts", 1],
  ["apps/api/src/routes/patients.ts", 1],
  ["apps/api/src/routes/visits.ts", 1],
  ["apps/api/src/routes/ai.ts", 2],
  ["apps/api/src/routes/speech.ts", 7],
  ["apps/api/src/routes/imports.ts", 2],
  ["apps/api/src/routes/smartImports.ts", 7],
  ["apps/api/src/routes/pricelist.ts", 1],
  ["apps/api/src/routes/imaging.ts", 17],
  ["apps/api/src/routes/documents.ts", 4],
  ["apps/api/src/routes/system.ts", 4],
  ["apps/api/src/routes/clinical.ts", 1]
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readSource(sourcePath) {
  if (sourcePath === "apps/api/src/routes/documents.ts") {
    const main = readFileSync(sourcePath, "utf8");
    const subFiles = ["create.ts", "issue.ts", "void.ts", "taxXml.ts", "auditFacts.ts", "pdf.ts", "html.ts"];
    const subContents = subFiles.map(file => readFileSync(`apps/api/src/routes/documents/${file}`, "utf8"));
    return [main, ...subContents].join("\n");
  }
  return readFileSync(sourcePath, "utf8");
}

for (const [sourcePath, expectedGuardCount] of guardedSources) {
  const source = readSource(sourcePath);
  const guardCount = (source.match(/requireClinicalMutationAccess/g) ?? []).length - 1;
  assert(
    guardCount >= expectedGuardCount,
    `${sourcePath} must guard ${expectedGuardCount} protected route(s), found ${guardCount}`
  );
}

for (const [sourcePath, expectedGuardCount] of guardedReadSources) {
  const source = readSource(sourcePath);
  const guardCount = (source.match(/requireClinicalReadAccess/g) ?? []).length - 1;
  assert(
    guardCount >= expectedGuardCount,
    `${sourcePath} must guard ${expectedGuardCount} protected read route(s), found ${guardCount}`
  );
}

const appSource = [
  readFileSync("apps/web/src/App.tsx", "utf8"),
  readFileSync("apps/web/src/useAppLogic.tsx", "utf8")
].join("\n");
[
  "accessUnlockRequired",
  "denteClinicalReadHeaders",
  'fetch("/api/dashboard"',
  'fetch("/api/system/persistence/verify", { cache: "no-store", headers: denteClinicalReadHeaders() })',
  'fetch("/api/system/local-bridges/use-plans", { cache: "no-store", headers: denteClinicalReadHeaders() })',
  'fetch("/api/speech/status", { cache: "no-store", headers: denteClinicalReadHeaders() })',
  'fetch("/api/speech/providers/runtime", { cache: "no-store", headers: denteClinicalReadHeaders() })',
  "denteAdminSecretRequestHeaders",
  "loadServerUiPreferences(preferencesAccessSecret)",
  "saveServerUiPreferences(localPreferences, preferencesAccessSecret)",
  'fetch(`/api/visits/${visitId}/draft/autosave`, {\n      cache: "no-store",\n      headers: denteClinicalReadHeaders()\n    })',
  'headers: denteClinicalReadHeaders({ "Content-Type": "application/json" })',
  'fetch("/api/imports/patients/intake"',
  'fetch("/api/imports/smart/report.csv"',
  'fetch("/api/imports/smart/local-source-discovery"',
  'fetch("/api/imports/smart/local-source-workup"',
  'fetch("/api/imports/smart/local-source-probe"',
  'fetch("/api/imports/smart/migration-autopilot"',
  'fetch("/api/imports/smart/migration-autopilot/report.csv"',
  'fetch("/api/imports/smart/clinic-public-lookup"',
  'fetch("/api/pricelist/analyze"',
  'fetch("/api/imaging/dicom/folder-workup-plan"',
  "openIssuedDocumentHtml",
  "imagingPreviewObjectUrls"
].forEach((needle) => {
  assert(appSource.includes(needle), `web app must include guarded read unlock/source path: ${needle}`);
});

const serverSource = readFileSync("apps/api/src/server.ts", "utf8");
const accessGuardSource = readFileSync("apps/api/src/accessGuard.ts", "utf8");
assert(
    appSource.includes("function settingsAccessHeaders") &&
    appSource.includes("function scheduleMutationHeaders") &&
    appSource.includes("function resolvedAdminSecretUnlockDomain(domainOverride?: AdminSecretUnlockDomain)") &&
    appSource.includes("function adminSecretDraftForDomain(domain: AdminSecretUnlockDomain): string") &&
    appSource.includes("function clearAdminSecretDraft(domain: AdminSecretUnlockDomain)") &&
    appSource.includes("adminSecretOverride ?? clinicalAdminSecretSession") &&
    appSource.includes("adminSecretOverride ?? settingsAdminSecretSession") &&
    appSource.includes("adminSecretOverride ?? scheduleAdminSecretSession") &&
    appSource.includes("adminSecretOverride ?? telegramAdminSecretSession"),
  "web app must keep clinical/settings/schedule/Telegram admin-secret sessions separated"
);
assert(
  appSource.includes('const [clinicalAdminSecretDraft, setClinicalAdminSecretDraft] = useState("")') &&
    appSource.includes('const [settingsAdminSecretDraft, setSettingsAdminSecretDraft] = useState("")') &&
    appSource.includes('const [scheduleAdminSecretDraft, setScheduleAdminSecretDraft] = useState("")') &&
    appSource.includes('const [telegramAdminSecretDraft, setTelegramAdminSecretDraft] = useState("")') &&
    appSource.includes("const secret = adminSecretDraftForDomain(domain).trim()") &&
    appSource.includes("clearAdminSecretDraft(domain)") &&
    appSource.includes("adminSecretDraft={clinicalAdminSecretDraft}") &&
    appSource.includes("onAdminSecretChange={setClinicalAdminSecretDraft}") &&
    appSource.includes("setScheduleAdminSecretDraft={setScheduleAdminSecretDraft}") &&
    appSource.includes("scheduleAdminSecretDraft={scheduleAdminSecretDraft}") &&
    /setTelegramAdminSecretDraft=\{\s*settingsAdminSecretDomain === "telegram"\s*\?\s*setTelegramAdminSecretDraft\s*:\s*setSettingsAdminSecretDraft\s*\}/.test(appSource) &&
    /telegramAdminSecretDraft=\{\s*settingsAdminSecretDomain === "telegram"\s*\?\s*telegramAdminSecretDraft\s*:\s*settingsAdminSecretDraft\s*\}/.test(appSource),
  "web admin-secret drafts must be separated by clinical/settings/schedule/Telegram domain"
);
assert(
  !appSource.includes("const secret = telegramAdminSecretDraft.trim()"),
  "admin unlock must not read one shared Telegram-named draft for every domain"
);
assert(
  appSource.includes('onUnlock={() => unlockTelegramAdminSession("all")}') &&
    appSource.includes('unlockScheduleAdminSession={() => unlockTelegramAdminSession("schedule")}') &&
    appSource.includes('lockScheduleAdminSession={() => lockTelegramAdminSession("schedule")}') &&
    appSource.includes('unlockTelegramAdminSession={() => unlockTelegramAdminSession(settingsAdminSecretDomain)}') &&
    appSource.includes('lockTelegramAdminSession={() => lockTelegramAdminSession(settingsAdminSecretDomain)}') &&
    appSource.includes('unlockTelegramAdminSession("telegram")'),
  "fixed web admin-secret panels must pass an explicit access domain instead of relying on ambient route state"
);
assert(
  !appSource.includes('settingsTab === "telegram" || onboardingStep === "telegram"'),
  "settings unlock routing must not let a retained onboarding step override the active settings tab"
);
assert(
  !/function denteClinical(?:Read|Mutation)Headers[^{]*\{[^}]*telegramControlPlaneHeaders/.test(appSource),
  "clinical web headers must not route through Telegram control-plane headers"
);
assert(
  appSource.includes('headers: settingsAccessHeaders({ "Content-Type": "application/json" })') &&
    appSource.includes('headers: scheduleMutationHeaders({ "Content-Type": "application/json" })'),
  "settings and schedule web mutations must use their domain admin-secret headers"
);
assert(
  /fetch\("\/api\/imaging\/dicomweb\/check",\s*\{[\s\S]*headers: settingsAccessHeaders\(\{ "Content-Type": "application\/json" \}\)/.test(appSource),
  "DICOMweb connector checks are settings-admin work and must use settings access headers"
);
assert(
  !/function configuredClinicalAccessSecret\(\)[\s\S]*DENTE_SETTINGS_ADMIN_SECRET/.test(accessGuardSource),
  "clinical access guard must not accept settings admin secret fallback"
);
assert(
  !/function configuredClinicalAccessSecret\(\)[\s\S]*DENTE_TELEGRAM_ADMIN_SECRET/.test(accessGuardSource),
  "clinical access guard must not accept Telegram admin secret fallback"
);
assert(
  !serverSource.includes("publicPersistentStateMeta"),
  "public health endpoint must not expose persistence metadata helpers"
);
assert(
  !serverSource.includes("persistence:"),
  "public health endpoint must not expose persistence metadata"
);
assert(
  !appSource.includes('fetch("/api/health"'),
  "web persistence audit must not read backup metadata from public health"
);
assert(
  appSource.includes('fetch("/api/system/persistence/verify",'),
  "web persistence audit must read backup metadata from the guarded verify endpoint"
);
assert(serverSource.includes('contentType.includes("text/html")'), "server CSP must distinguish printable HTML documents from JSON APIs");
assert(serverSource.includes("style-src 'unsafe-inline'"), "document HTML CSP must allow renderer inline styles");
assert(serverSource.includes("base-uri 'none'; form-action 'none'"), "document HTML CSP must keep navigation/form capabilities locked down");

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");

const [
  { registerPatientRoutes },
  { registerVisitRoutes },
  { registerBillingRoutes },
  { registerDocumentRoutes },
  { registerImportRoutes },
  { registerSmartImportRoutes },
  { registerAiRoutes },
  { registerSpeechRoutes },
  { registerSettingsRoutes },
  { registerIngestionRoutes },
  { registerPricelistRoutes },
  { registerImagingRoutes },
  { registerClinicalRoutes },
  { registerCommunicationRoutes },
  { registerDashboardRoutes },
  { registerSystemRoutes }
] = await Promise.all(Object.values(routeFiles).map((routePath) => import(pathToFileURL(routePath).href)));

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

const app = createApp();
await registerPatientRoutes(app);
await registerVisitRoutes(app);
await registerBillingRoutes(app);
await registerDocumentRoutes(app);
await registerImportRoutes(app);
await registerSmartImportRoutes(app);
await registerAiRoutes(app);
await registerSpeechRoutes(app);
await registerSettingsRoutes(app);
await registerIngestionRoutes(app);
await registerPricelistRoutes(app);
await registerImagingRoutes(app);
await registerClinicalRoutes(app);
await registerCommunicationRoutes(app);
await registerDashboardRoutes(app);
await registerSystemRoutes(app);

const protectedReadRequests = [
  { method: "GET", url: "/api/dashboard" },
  { method: "GET", url: "/api/patients" },
  { method: "GET", url: "/api/visits/11111111-1111-4111-8111-111111111111/draft/autosave" },
  { method: "GET", url: "/api/ai/recognition-jobs" },
  {
    method: "POST",
    url: "/api/ai/visit-note-draft",
    payload: {
      patientId: "3ebb4567-7777-4f19-8c23-2a78c9962796",
      transcript: "Жалобы на боль при накусывании, осмотр, кариес 16.",
      specialty: "therapist",
      source: "voice"
    }
  },
  { method: "GET", url: "/api/speech/chunks?recordingId=guard-smoke" },
  { method: "GET", url: "/api/speech/status" },
  { method: "GET", url: "/api/speech/gateway-health" },
  { method: "GET", url: "/api/speech/providers/runtime" },
  {
    method: "POST",
    url: "/api/speech/recording-strategy",
    payload: {
      expectedDurationMs: 180000,
      networkState: "online",
      privacyMode: "cloud_allowed",
      specialty: "therapist",
      source: "visit"
    }
  },
  { method: "GET", url: "/api/speech/recordings/recovery?visitId=11111111-1111-4111-8111-111111111111" },
  { method: "GET", url: "/api/speech/recordings/guard-smoke/assemble?visitId=11111111-1111-4111-8111-111111111111" },
  { method: "POST", url: "/api/imports/patients/intake", payload: {} },
  { method: "POST", url: "/api/imports/patients/preview", payload: {} },
  { method: "POST", url: "/api/imports/smart/preview", payload: {} },
  { method: "POST", url: "/api/imports/smart/report.csv", payload: {} },
  {
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    payload: {
      rootPaths: [path.resolve("scripts")],
      maxDepth: 0,
      maxFolders: 1,
      maxFilesPerFolder: 1,
      maxCandidates: 1
    }
  },
  {
    method: "POST",
    url: "/api/imports/smart/clinic-public-lookup",
    payload: {
      inn: "1234567890"
    }
  },
  {
    method: "POST",
    url: "/api/imports/smart/migration-autopilot",
    payload: {
      rootPaths: [path.resolve("scripts")],
      maxDepth: 0,
      maxFolders: 1,
      maxFilesPerFolder: 1,
      maxCandidates: 1,
      maxProbeCandidates: 1,
      clinic: {
        inn: "1234567890"
      }
    }
  },
  {
    method: "POST",
    url: "/api/imports/smart/migration-autopilot/report.csv",
    payload: {
      rootPaths: [path.resolve("scripts")],
      maxDepth: 0,
      maxFolders: 1,
      maxFilesPerFolder: 1,
      maxCandidates: 1,
      maxProbeCandidates: 1
    }
  },
  {
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    payload: {
      sourceRef: path.resolve("scripts"),
      sourceKind: "network_share",
      safeDisplayName: "Scripts smoke source"
    }
  },
  {
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    payload: {
      sourceRef: path.resolve("scripts"),
      sourceKind: "network_share",
      safeDisplayName: "Scripts smoke source",
      maxDepth: 0,
      maxFolders: 1,
      maxFiles: 2,
      maxSampleArtifacts: 2
    }
  },
  { method: "POST", url: "/api/pricelist/analyze", payload: {} },
  { method: "POST", url: "/api/imaging/imports/preview", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/series-preview", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/viewer-launch-manifest", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/viewer-tool-state", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/render-cache-plan", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/workstation-readiness", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/viewer-workbench-manifest", payload: {} },
  { method: "GET", url: "/api/imaging/dicom/workbench-bundles?limit=1" },
  { method: "POST", url: "/api/imaging/dicom/local-folder-discovery", payload: {} },
  { method: "POST", url: "/api/imaging/local-organizer/scan-preview", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/folder-series-preview", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/first-frame-preview", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/folder-workup-plan", payload: {} },
  { method: "POST", url: "/api/imaging/folders/scan-preview", payload: {} },
  { method: "GET", url: "/api/imaging/studies" },
  { method: "GET", url: "/api/imaging/studies/11111111-1111-4111-8111-111111111111/viewer-session" },
  { method: "GET", url: "/api/imaging/studies/11111111-1111-4111-8111-111111111111/preview.svg" },
  { method: "GET", url: "/api/documents/11111111-1111-4111-8111-111111111111/html" },
  { method: "GET", url: "/api/documents/11111111-1111-4111-8111-111111111111/pdf" },
  { method: "GET", url: "/api/documents/11111111-1111-4111-8111-111111111111/tax-xml" },
  { method: "GET", url: "/api/documents/11111111-1111-4111-8111-111111111111/audit-facts" },
  { method: "GET", url: "/api/system/persistence/verify" },
  { method: "GET", url: "/api/system/local-bridges/readiness" },
  { method: "GET", url: "/api/system/local-bridges/use-plans" },
  {
    method: "POST",
    url: "/api/clinical/rules/evaluate",
    payload: {
      patientId: "3ebb4567-7777-4f19-8c23-2a78c9962796",
      serviceIds: ["svc-consult-primary"],
      completedServiceIds: []
    }
  },
  { method: "GET", url: "/api/system/persistence/export" }
];

for (const request of protectedReadRequests) {
  const missingSecretResponse = await app.inject(request);
  assert(
    missingSecretResponse.statusCode === 403,
    `${request.method} ${request.url} must reject missing clinical read secret: ${missingSecretResponse.statusCode}`
  );

  const wrongSecretResponse = await app.inject({
    ...request,
    headers: { "x-dente-admin-secret": "wrong-secret" }
  });
  assert(
    wrongSecretResponse.statusCode === 403,
    `${request.method} ${request.url} must reject wrong clinical read secret: ${wrongSecretResponse.statusCode}`
  );

  const allowedResponse = await app.inject({
    ...request,
    headers: { "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET }
  });
  assert(
    allowedResponse.statusCode !== 403 && allowedResponse.statusCode !== 503,
    `${request.method} ${request.url} must pass read guard with valid clinical secret: ${allowedResponse.statusCode} ${allowedResponse.body}`
  );
}

process.env.DENTAL_LOCAL_WHISPER_URL = "not a valid local bridge url";
const localBridgeReadinessResponse = await app.inject({
  method: "GET",
  url: "/api/system/local-bridges/readiness",
  headers: { "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET }
});
delete process.env.DENTAL_LOCAL_WHISPER_URL;
assert(
  localBridgeReadinessResponse.statusCode === 200,
  `local bridge readiness malformed URL smoke must pass guard: ${localBridgeReadinessResponse.statusCode}`
);
const localBridgeReadinessBody = localBridgeReadinessResponse.json();
const localBridgeReadinessText = JSON.stringify(localBridgeReadinessBody);
assert(
  localBridgeReadinessText.includes("Адрес локального модуля не читается. Проверьте URL в серверных настройках."),
  "local bridge malformed URL warning must be operator-readable"
);
assert(
  !/(Invalid URL|TypeError|AbortError|ECONNREFUSED|ECONNRESET|fetch failed)/i.test(localBridgeReadinessText),
  "local bridge readiness must not expose raw parser or network exception text"
);

const protectedRequests = [
  { method: "POST", url: "/api/patients", payload: {} },
  { method: "PUT", url: "/api/patients/11111111-1111-4111-8111-111111111111", payload: {} },
  { method: "PUT", url: "/api/patients/11111111-1111-4111-8111-111111111111/administrative-profile", payload: {} },
  { method: "PUT", url: "/api/visits/11111111-1111-4111-8111-111111111111/draft/autosave", payload: {} },
  { method: "POST", url: "/api/visits/11111111-1111-4111-8111-111111111111/draft/accept", payload: {} },
  { method: "POST", url: "/api/billing/payments", payload: {} },
  { method: "POST", url: "/api/documents", payload: {} },
  { method: "POST", url: "/api/documents/11111111-1111-4111-8111-111111111111/issue", payload: {} },
  { method: "POST", url: "/api/documents/11111111-1111-4111-8111-111111111111/void", payload: {} },
  { method: "POST", url: "/api/imports/patients/commit", payload: {} },
  { method: "POST", url: "/api/imports/smart/commit", payload: {} },
  { method: "POST", url: "/api/ai/recognition-jobs", payload: {} },
  { method: "POST", url: "/api/speech/transcribe-chunk", payload: {} },
  { method: "POST", url: "/api/speech/polish-transcript", payload: {} },
  { method: "POST", url: "/api/ingestion/extract", payload: {} },
  { method: "POST", url: "/api/imaging/dicom/workbench-bundles", payload: {} },
  { method: "POST", url: "/api/imaging/imports/commit", payload: {} },
  { method: "PUT", url: "/api/imaging/studies/11111111-1111-4111-8111-111111111111/viewer-session", payload: {} },
  { method: "POST", url: "/api/imaging/studies", payload: {} },
  { method: "POST", url: "/api/clinical/rules", payload: {} },
  { method: "PATCH", url: "/api/clinical/rules/clinical-rule-smoke", payload: {} },
  { method: "POST", url: "/api/communications/tasks/complete", payload: {} }
];

for (const request of protectedRequests) {
  const missingSecretResponse = await app.inject(request);
  assert(
    missingSecretResponse.statusCode === 403,
    `${request.method} ${request.url} must reject missing clinical secret: ${missingSecretResponse.statusCode}`
  );

  const wrongSecretResponse = await app.inject({
    ...request,
    headers: { "x-dente-admin-secret": "wrong-secret" }
  });
  assert(
    wrongSecretResponse.statusCode === 403,
    `${request.method} ${request.url} must reject wrong clinical secret: ${wrongSecretResponse.statusCode}`
  );

  const allowedResponse = await app.inject({
    ...request,
    headers: { "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET }
  });
  assert(
    allowedResponse.statusCode !== 403 && allowedResponse.statusCode !== 503,
    `${request.method} ${request.url} must pass guard with valid clinical secret: ${allowedResponse.statusCode} ${allowedResponse.body}`
  );
}

delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;

const failClosedResponse = await app.inject(protectedRequests[0]);
assert(failClosedResponse.statusCode === 503, `production without clinical secret must fail closed: ${failClosedResponse.statusCode}`);

const failClosedReadResponse = await app.inject(protectedReadRequests[0]);
assert(
  failClosedReadResponse.statusCode === 503,
  `production without clinical secret must fail closed for reads: ${failClosedReadResponse.statusCode}`
);

process.env.DENTE_SETTINGS_ADMIN_SECRET = "synthetic-settings-only-secret";
const settingsOnlyMutationResponse = await app.inject(protectedRequests[0]);
assert(
  settingsOnlyMutationResponse.statusCode === 503,
  `settings-only secret must not unlock clinical mutation routes: ${settingsOnlyMutationResponse.statusCode}`
);
const settingsOnlyReadResponse = await app.inject(protectedReadRequests[0]);
assert(
  settingsOnlyReadResponse.statusCode === 503,
  `settings-only secret must not unlock clinical read routes: ${settingsOnlyReadResponse.statusCode}`
);
delete process.env.DENTE_SETTINGS_ADMIN_SECRET;

process.env.DENTE_TELEGRAM_ADMIN_SECRET = "synthetic-telegram-only-secret";
const telegramOnlyMutationResponse = await app.inject(protectedRequests[0]);
assert(
  telegramOnlyMutationResponse.statusCode === 503,
  `Telegram-only secret must not unlock clinical mutation routes: ${telegramOnlyMutationResponse.statusCode}`
);
const telegramOnlyReadResponse = await app.inject(protectedReadRequests[0]);
assert(
  telegramOnlyReadResponse.statusCode === 503,
  `Telegram-only secret must not unlock clinical read routes: ${telegramOnlyReadResponse.statusCode}`
);
delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;

process.env.NODE_ENV = "development";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
const explicitEscapeResponse = await app.inject(protectedRequests[0]);
assert(
  explicitEscapeResponse.statusCode !== 403 && explicitEscapeResponse.statusCode !== 503,
  `explicit clinical mutation escape hatch must bypass guard for prototype stand: ${explicitEscapeResponse.statusCode}`
);

process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
const explicitReadEscapeResponse = await app.inject(protectedReadRequests[0]);
assert(
  explicitReadEscapeResponse.statusCode !== 403 && explicitReadEscapeResponse.statusCode !== 503,
  `explicit clinical read escape hatch must bypass guard for prototype stand: ${explicitReadEscapeResponse.statusCode}`
);

await app.close();

delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
delete process.env.NODE_ENV;

console.log(
  JSON.stringify(
    {
      ok: true,
      protectedRouteCount: protectedRequests.length,
      protectedReadRouteCount: protectedReadRequests.length,
      sourceGuardChecks: guardedSources.length,
      sourceReadGuardChecks: guardedReadSources.length,
      productionFailsClosed: true,
      explicitEscapeHatch: true
    },
    null,
    2
  )
);
