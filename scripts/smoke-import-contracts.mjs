import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.DENTAL_DADATA_API_KEY;
delete process.env.DADATA_API_KEY;

const routeFiles = {
  imports: path.resolve("apps/api/dist/routes/imports.js"),
  smartImports: path.resolve("apps/api/dist/routes/smartImports.js")
};
const sharedPath = path.resolve("packages/shared/dist/index.js");

for (const [label, routePath] of Object.entries(routeFiles)) {
  if (!existsSync(routePath)) throw new Error(`Build API first: npm run build (${label} missing)`);
}
if (!existsSync(sharedPath)) throw new Error("Build shared first: npm run build");

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const [{ registerImportRoutes }, { registerSmartImportRoutes }, shared] = await Promise.all([
  import(pathToFileURL(routeFiles.imports).href),
  import(pathToFileURL(routeFiles.smartImports).href),
  import(pathToFileURL(sharedPath).href)
]);

const { importPreviewRequestSchema, importIntakeRequestSchema, smartImportRequestSchema } = shared;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!importPreviewRequestSchema.safeParse({ rawText: "   " }).success, "patient import must reject blank raw text");
assert(
  !importPreviewRequestSchema.safeParse({ rawText: "x".repeat(120001) }).success,
  "patient import must reject oversized raw text"
);
assert(
  !importPreviewRequestSchema.safeParse({ sourceName: "x".repeat(161), rawText: "full name;phone\nIvan;+79001112233" }).success,
  "patient import must reject oversized source names"
);
const patientParsed = importPreviewRequestSchema.parse({
  sourceName: "  front desk csv  ",
  rawText: "  full name;phone\nIvan Petrov;+79001112233  "
});
assert(patientParsed.sourceName === "front desk csv", "patient import must trim source names");
assert(patientParsed.rawText.startsWith("full name;phone"), "patient import must trim raw text edges");

assert(
  !importIntakeRequestSchema.safeParse({ sourceKind: "free_text", rawText: "   " }).success,
  "patient intake import must reject blank raw text"
);
assert(
  !importIntakeRequestSchema.safeParse({ sourceKind: "free_text", rawText: "Ivan Petrov", fileName: "   " }).success,
  "patient intake import must reject blank file names"
);
assert(
  importIntakeRequestSchema.parse({ sourceKind: "free_text", rawText: " Ivan Petrov ", fileName: " import.txt " }).fileName ===
    "import.txt",
  "patient intake import must trim file names"
);

assert(!smartImportRequestSchema.safeParse({ rawText: "   " }).success, "smart import must reject blank raw text");
assert(!smartImportRequestSchema.safeParse({ rawText: "x".repeat(120001) }).success, "smart import must reject oversized raw text");
const smartParsed = smartImportRequestSchema.parse({ sourceName: "  mixed export  ", rawText: " Ivan Petrov +79001112233 " });
assert(smartParsed.sourceName === "mixed export", "smart import must trim source names");
assert(smartParsed.rawText === "Ivan Petrov +79001112233", "smart import must trim raw text edges");

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return reply.code(400).send({ error: "ValidationError", issues: error.issues });
  }
  return reply.send(error);
});
await registerImportRoutes(app);
await registerSmartImportRoutes(app);

const headers = { "x-dente-admin-secret": "synthetic-clinical-secret" };

const blankPatientPreview = await app.inject({
  method: "POST",
  url: "/api/imports/patients/preview",
  headers,
  payload: { rawText: "   " }
});
assert(blankPatientPreview.statusCode === 400, `blank patient preview must fail with 400, got ${blankPatientPreview.statusCode}`);

const patientPreview = await app.inject({
  method: "POST",
  url: "/api/imports/patients/preview",
  headers,
  payload: {
    sourceName: "  front desk csv  ",
    rawText: "  full name;phone\nIvan Petrov;+79001112233  "
  }
});
assert(patientPreview.statusCode === 200, `valid patient preview failed: ${patientPreview.statusCode}`);
assert(patientPreview.json().sourceName === "front desk csv", "patient preview API must use trimmed source name");

const blankSmartPreview = await app.inject({
  method: "POST",
  url: "/api/imports/smart/preview",
  headers,
  payload: { rawText: "   " }
});
assert(blankSmartPreview.statusCode === 400, `blank smart preview must fail with 400, got ${blankSmartPreview.statusCode}`);

const smartReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.csv",
  headers,
  payload: {
    sourceName: '  bad "name"\r\n.csv  ',
    rawText: "Ivan Petrov +79001112233\nC:\\cases\\ivan\\36.dcm cbct 36"
  }
});
assert(smartReport.statusCode === 200, `smart report failed: ${smartReport.statusCode}`);
const disposition = smartReport.headers["content-disposition"];
assert(typeof disposition === "string", "smart report must return Content-Disposition");
assert(!/[\r\n]/.test(disposition), "smart report Content-Disposition must not contain line breaks");
assert(!disposition.includes('bad "name"'), "smart report Content-Disposition must not contain raw source names");
assert(disposition.includes("bad_name_.csv_report.csv"), `smart report filename must be sanitized, got ${disposition}`);

const safeSmartReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.safe.csv",
  headers,
  payload: {
    sourceName: '  bad "name"\r\n.csv  ',
    rawText: [
      "Ivan Petrov +79001112233 01.02.1980 migration",
      "C:\\cases\\ivan\\36.dcm cbct 36",
      "Старая база C:\\Legacy\\clinic_2024.fdb",
      "Dental clinic Smile Center INN 1234567890 Address: Samara, Lenina 1"
    ].join("\n")
  }
});
assert(safeSmartReport.statusCode === 200, `safe smart handoff report failed: ${safeSmartReport.statusCode}`);
assert(
  safeSmartReport.headers["content-disposition"] === 'attachment; filename="smart_import_safe_handoff.csv"',
  "safe smart handoff report filename must be static"
);
assert(safeSmartReport.body.startsWith("\uFEFFsection;"), "safe smart handoff report must be a BOM-prefixed CSV");
assert(safeSmartReport.body.includes("patient_row"), "safe smart handoff report must include patient row status without identity");
assert(safeSmartReport.body.includes("imaging_row"), "safe smart handoff report must include imaging row status without file paths");
assert(safeSmartReport.body.includes("legacy_source"), "safe smart handoff report must include legacy source aliases");
assert(
  !/Ivan|Petrov|\+79001112233|79001112233|01\.02\.1980|C:\\|cases|36\.dcm|clinic_2024\.fdb/i.test(safeSmartReport.body),
  "safe smart handoff report must not leak patient identity, birth dates, local paths, file names, or raw DB names"
);

const migrationPreview = await app.inject({
  method: "POST",
  url: "/api/imports/smart/preview",
  headers,
  payload: {
    sourceName: "migration cockpit",
    mode: "auto",
    rawText: [
      "Старая МИС: Firebird backup C:\\Legacy\\clinic_2024.fdb",
      "PACS Orthanc DICOMweb http://127.0.0.1:8042/dicom-web",
      "DICOMDIR folder \\\\NAS\\CBCT\\Archive\\DICOMDIR",
      "Sidexis export folder C:\\XRay\\Sidexis\\2024",
      "Old RVG image archive \\\\NAS\\XRay\\RVG",
      "Dental clinic Smile Center",
      "INN 1234567890 KPP 123456789 OGRN 1234567890123",
      "Address: Samara, Lenina 1",
      "Phone +7 927 222-33-44 email info@smile.example website smile.example",
      "License L-63-01-123456 issued 12.05.2020",
      "Ivan Petrov +7 900 111-22-33 01.02.1980 legacy MIS",
      "Ivan Petrov +7 900 111-22-33 CBCT 36 12.05.2026 C:\\CBCT\\ivan\\IMG0001.dcm"
    ].join("\n")
  }
});
assert(migrationPreview.statusCode === 200, `smart migration preview failed: ${migrationPreview.statusCode}`);
const migration = migrationPreview.json();
assert(migration.lineClassifications.some((line) => line.kind === "clinic"), "smart import must classify clinic profile lines");
assert(migration.lineClassifications.some((line) => line.kind === "legacy_source"), "smart import must classify legacy source lines");
assert(migration.clinicRawText.includes("INN 1234567890"), "smart import must keep clinic raw text separate");
assert(migration.legacySourceRawText.includes("clinic_2024.fdb"), "smart import must keep legacy source raw text separate");
assert(migration.legacySourceRawText.includes("DICOMDIR"), "smart import must keep DICOM folder source in legacy raw text");
assert(migration.legacySourceRawText.includes("Sidexis"), "smart import must keep vendor imaging source in legacy raw text");
assert(migration.legacySourceRawText.includes("Old RVG image archive"), "smart import must keep x-ray archive source in legacy raw text");
assert(migration.clinicSuggestion?.fields?.clinicName === "Dental clinic Smile Center", "smart import must suggest clinic name");
assert(migration.clinicSuggestion?.fields?.inn === "1234567890", "smart import must extract clinic INN");
assert(migration.clinicSuggestion?.fields?.kpp === "123456789", "smart import must extract clinic KPP");
assert(migration.clinicSuggestion?.fields?.phone === "+79272223344", "smart import must extract clinic phone");
assert(migration.clinicSuggestion?.fields?.email === "info@smile.example", "smart import must extract clinic email");
assert(migration.clinicSuggestion?.fields?.website === "https://smile.example", "smart import must normalize clinic website");
assert(migration.publicLookupTargets.some((target) => target.kind === "maps"), "smart import must prepare safe maps lookup");
assert(
  migration.publicLookupTargets.some((target) => target.kind === "maps" && /2ГИС/.test(target.title)),
  "smart import must prepare 2GIS public lookup"
);
assert(
  migration.publicLookupTargets.some((target) => target.kind === "maps" && /Яндекс\.Карты/.test(target.title)),
  "smart import must prepare Yandex Maps public lookup"
);
assert(
  migration.publicLookupTargets.some((target) => target.kind === "company_registry" && /egrul\.nalog\.ru/.test(target.url)),
  "smart import must prepare official company registry lookup by INN"
);
assert(
  migration.publicLookupTargets.some((target) => target.kind === "medical_license_registry" && /roszdravnadzor\.gov\.ru/.test(target.url)),
  "smart import must prepare medical license registry lookup"
);
assert(
  migration.publicLookupTargets.every((target) => target.query === "1234567890" || !/Ivan|Petrov|\+7 900|79001112233|IMG0001|CBCT/i.test(`${target.query} ${target.url}`)),
  "migration public lookup targets must not echo patient data"
);
assert(migration.migrationPlan.coverage.clinicProfile, "migration plan must mark clinic profile coverage");
assert(migration.migrationPlan.coverage.publicLookup, "migration plan must mark public lookup coverage");
assert(migration.migrationPlan.coverage.patients, "migration plan must mark patient coverage");
assert(migration.migrationPlan.coverage.imaging, "migration plan must mark imaging coverage");
assert(migration.migrationPlan.coverage.legacySources, "migration plan must mark legacy source coverage");
assert(
  migration.legacySources.some((source) => source.kind === "firebird_database" && source.automationLevel === "needs_local_bridge"),
  "smart import must suggest read-only local bridge for Firebird backups"
);
assert(
  migration.legacySources.some((source) => source.kind === "pacs_dicom" && source.requiredArtifacts.some((item) => /DICOMweb|DICOMDIR/.test(item))),
  "smart import must suggest PACS/DICOM artifacts"
);
assert(
  migration.legacySources.some((source) => source.kind === "dicom_folder" && /metadata-only/i.test(source.recommendedRoute)),
  "smart import must suggest metadata-only DICOM folder workup"
);
assert(
  migration.legacySources.some((source) => source.kind === "vendor_imaging_system" && /DICOMDIR/.test(source.recommendedRoute)),
  "smart import must suggest vendor imaging export route"
);
assert(
  migration.legacySources.some((source) => source.kind === "xray_image_archive" && /imaging manifest/i.test(source.recommendedRoute)),
  "smart import must suggest x-ray image archive manifest route"
);
assert(
  migration.legacySources.every((source) => !source.sourceRef || (source.safeSourceAlias && !/C:\\|\\\\NAS|clinic_2024|IMG0001|Ivan|Petrov/i.test(source.safeSourceAlias))),
  "smart import legacy sources must expose a safe alias for UI/report handoff instead of raw paths or patient-like names"
);
assert(
  migration.lineClassifications.some((line) => line.kind === "imaging" && /IMG0001\.dcm/.test(line.text)),
  "smart import must keep a concrete patient DICOM file as imaging row"
);
assert(
  migration.migrationPlan.privacyWarnings.every((warning) => !/Ivan|Petrov|\+7 900/.test(warning)),
  "migration public lookup warnings must not echo patient data"
);

const tempMigrationRoot = mkdtempSync(path.join(tmpdir(), "dental-crm-migration-smoke-"));
try {
  const firebirdFolder = path.join(tempMigrationRoot, "LegacyDental");
  const dicomFolder = path.join(tempMigrationRoot, "Ivan Petrov Sidexis export");
  const rvgFolder = path.join(tempMigrationRoot, "RVG_ARCHIVE_Petrov");
  const oneCFolder = path.join(tempMigrationRoot, "1C Dentistry Base");
  const carestreamFolder = path.join(tempMigrationRoot, "Carestream export");
  const sqliteFolder = path.join(tempMigrationRoot, "DentalPro sqlite backup");
  mkdirSync(firebirdFolder, { recursive: true });
  mkdirSync(dicomFolder, { recursive: true });
  mkdirSync(rvgFolder, { recursive: true });
  mkdirSync(oneCFolder, { recursive: true });
  mkdirSync(carestreamFolder, { recursive: true });
  mkdirSync(sqliteFolder, { recursive: true });
  writeFileSync(path.join(firebirdFolder, "clinic.fdb"), "synthetic-firebird-placeholder");
  writeFileSync(path.join(dicomFolder, "DICOMDIR"), "synthetic-dicomdir-placeholder");
  writeFileSync(path.join(rvgFolder, "pano001.png"), "synthetic-png-placeholder");
  writeFileSync(path.join(oneCFolder, "clinic.1cd"), "synthetic-1c-placeholder");
  writeFileSync(path.join(carestreamFolder, "study.dc3"), "synthetic-carestream-dicom-placeholder");
  writeFileSync(path.join(sqliteFolder, "clinic.sqlite"), Buffer.concat([Buffer.from("SQLite format 3\0", "latin1"), Buffer.alloc(64)]));

  const localSourceDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [tempMigrationRoot],
      maxDepth: 4,
      maxFolders: 80,
      maxFilesPerFolder: 40,
      maxCandidates: 12,
      includeWorkstationSignals: false
    }
  });
  assert(localSourceDiscovery.statusCode === 200, `local source discovery failed: ${localSourceDiscovery.statusCode}`);
  const discovery = localSourceDiscovery.json();
  const discoveryKinds = new Set(discovery.candidates.map((candidate) => candidate.sourceKind));
  assert(discovery.scannedFolders >= 3, "local source discovery must scan the synthetic folders");
  assert(discovery.roots.some((root) => /^local-root:[A-F0-9]{10}$/i.test(root)), "local source discovery must return safe root aliases");
  assert(
    discovery.roots.every((root) => !root.includes(tempMigrationRoot) && !/Ivan|Petrov|LegacyDental/i.test(root)),
    "local source discovery roots must not expose raw local paths or patient-like folder names"
  );
  assert(discovery.candidates.length >= 4, "local source discovery must find DB, DICOM, RVG, and legacy MIS candidates");
  assert(discoveryKinds.has("firebird_database"), "local source discovery must detect Firebird/InterBase DBs");
  assert(discoveryKinds.has("sqlite_database"), "local source discovery must detect SQLite DBs");
  assert(discoveryKinds.has("mis_database"), "local source discovery must detect 1C/legacy MIS databases");
  assert(
    discoveryKinds.has("dicom_folder") || discoveryKinds.has("vendor_imaging_system"),
    "local source discovery must detect DICOMDIR/vendor imaging folders"
  );
  assert(discoveryKinds.has("vendor_imaging_system"), "local source discovery must detect known imaging vendor folders");
  assert(discoveryKinds.has("xray_image_archive"), "local source discovery must detect RVG/OPG/photo archives");
  assert(
    discovery.candidates.every((candidate) => candidate.smartImportLine && candidate.sourceFingerprint && candidate.safeDisplayName),
    "local source discovery candidates must be actionable"
  );
  assert(
    discovery.candidates.every((candidate) => !candidate.safeDisplayName.includes(tempMigrationRoot) && !/Ivan|Petrov/i.test(candidate.safeDisplayName)),
    "local source discovery safe display names must not expose raw paths or patient-like folder names"
  );

  const noisyRoot = path.join(tempMigrationRoot, "noisy-workstation-root");
  mkdirSync(noisyRoot, { recursive: true });
  for (let index = 0; index < 36; index += 1) {
    mkdirSync(path.join(noisyRoot, `ordinary-folder-${String(index).padStart(2, "0")}`), { recursive: true });
  }
  mkdirSync(path.join(noisyRoot, "zz Sidexis Workstation"), { recursive: true });
  const workstationProfileDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [noisyRoot],
      maxDepth: 1,
      maxFolders: 8,
      maxFilesPerFolder: 5,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(workstationProfileDiscovery.statusCode === 200, `workstation profile discovery failed: ${workstationProfileDiscovery.statusCode}`);
  const workstationProfiles = workstationProfileDiscovery.json();
  const sidexisProfile = workstationProfiles.candidates.find((candidate) => candidate.sourceKind === "vendor_imaging_system");
  assert(sidexisProfile, "local source discovery must prioritize known workstation profile folders before exhausting maxFolders");
  assert(sidexisProfile.matchedFiles === 0, "profile-only workstation candidates must be allowed without fake file counts");
  assert(sidexisProfile.sourceLabel === "Папка профиля старой системы", "profile-only workstation candidates must label the source boundary");
  assert(
    sidexisProfile.reasons.some((reason) => /Sidexis|profile|похоже/i.test(reason)),
    "profile-only workstation candidates must explain the matched legacy system profile"
  );
  const startMenuRoot = path.join(tempMigrationRoot, "Start Menu", "Programs");
  mkdirSync(startMenuRoot, { recursive: true });
  writeFileSync(path.join(startMenuRoot, "Romexis Imaging.lnk"), "synthetic-shortcut");
  const workstationShortcutDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [startMenuRoot],
      maxDepth: 1,
      maxFolders: 4,
      maxFilesPerFolder: 20,
      maxCandidates: 5,
      includeWorkstationSignals: false
    }
  });
  assert(workstationShortcutDiscovery.statusCode === 200, `workstation shortcut discovery failed: ${workstationShortcutDiscovery.statusCode}`);
  const shortcutProfile = workstationShortcutDiscovery.json().candidates.find((candidate) => candidate.sourceRef.startsWith("workstation-profile:"));
  assert(shortcutProfile, "local source discovery must turn Start Menu shortcuts into safe workstation-profile hints");
  assert(shortcutProfile.sourceKind === "vendor_imaging_system", "workstation shortcut hints must keep the matched vendor/source kind");
  assert(shortcutProfile.sourceLabel === "След установленной системы", "workstation shortcut hints must not pretend to be a data folder");
  assert(/Romexis|Planmeca/i.test(shortcutProfile.safeDisplayName), "workstation shortcut hints must keep a safe vendor label in the alias");

  const workstationSignalRoot = path.join(tempMigrationRoot, "empty-signal-root");
  mkdirSync(workstationSignalRoot, { recursive: true });
  process.env.DENTAL_MIGRATION_WORKSTATION_SIGNALS = "Romexis Imaging Service";
  const workstationSignalDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [workstationSignalRoot],
      maxDepth: 0,
      maxFolders: 2,
      maxFilesPerFolder: 2,
      maxCandidates: 5,
      includeWorkstationSignals: true,
      maxWorkstationSignals: 5
    }
  });
  assert(workstationSignalDiscovery.statusCode === 200, `workstation signal discovery failed: ${workstationSignalDiscovery.statusCode}`);
  const workstationSignal = workstationSignalDiscovery.json().candidates.find((candidate) => candidate.sourceRef.startsWith("workstation-signal:"));
  assert(workstationSignal, "local source discovery must turn configured workstation signals into safe migration hints");
  assert(workstationSignal.sourceKind === "vendor_imaging_system", "workstation signal hints must keep the matched vendor/source kind");
  assert(workstationSignal.sourceLabel === "Системный след рабочей станции", "workstation signal hints must not pretend to be a data folder");
  assert(workstationSignal.matchedFiles === 0, "workstation signal hints must not fake file counts");
  assert(/Romexis|Planmeca/i.test(workstationSignal.safeDisplayName), "workstation signal hints must keep a safe vendor label in the alias");
  assert(
    workstationSignal.warnings.every((warning) => !/Romexis Imaging Service/i.test(warning)),
    "workstation signal warnings must not echo raw process/service names"
  );

  const workstationSignalWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: workstationSignal.sourceRef,
      sourceKind: workstationSignal.sourceKind,
      safeDisplayName: workstationSignal.safeDisplayName
    }
  });
  assert(workstationSignalWorkup.statusCode === 200, `workstation signal workup failed: ${workstationSignalWorkup.statusCode}`);
  const workstationSignalPlan = workstationSignalWorkup.json();
  assert(workstationSignalPlan.sourceLabel === "Системный след рабочей станции", "workstation signal workup must preserve the trace boundary");
  assert(workstationSignalPlan.readiness.level === "needs_export", "workstation signal workup must require export/data folder");
  assert(workstationSignalPlan.bridgeKit.kind === "dicom_export", "workstation signal workup bridge kit must direct admins to DICOM export");

  const workstationSignalProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: workstationSignal.sourceRef,
      sourceKind: workstationSignal.sourceKind,
      safeDisplayName: workstationSignal.safeDisplayName,
      maxDepth: 1,
      maxFolders: 2,
      maxFiles: 2,
      maxSampleArtifacts: 2
    }
  });
  assert(workstationSignalProbe.statusCode === 200, `workstation signal probe failed: ${workstationSignalProbe.statusCode}`);
  const workstationSignalProbeBody = workstationSignalProbe.json();
  assert(workstationSignalProbeBody.sourceLabel === "Системный след рабочей станции", "workstation signal probe must preserve the trace boundary");
  assert(workstationSignalProbeBody.readiness.level === "needs_export", "workstation signal probe must require export/data folder");
  assert(workstationSignalProbeBody.bridgeKit.kind === "dicom_export", "workstation signal probe bridge kit must preserve the DICOM export route");

  const workstationAppRoot = path.join(tempMigrationRoot, "empty-installed-app-root");
  mkdirSync(workstationAppRoot, { recursive: true });
  process.env.DENTAL_MIGRATION_WORKSTATION_SIGNALS = "";
  process.env.DENTAL_MIGRATION_WORKSTATION_APPS = "Sidexis XG Installed Suite";
  const workstationAppDiscovery = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-discovery",
    headers,
    payload: {
      rootPaths: [workstationAppRoot],
      maxDepth: 0,
      maxFolders: 2,
      maxFilesPerFolder: 2,
      maxCandidates: 5,
      includeWorkstationSignals: true,
      maxWorkstationSignals: 5
    }
  });
  assert(workstationAppDiscovery.statusCode === 200, `workstation installed-app discovery failed: ${workstationAppDiscovery.statusCode}`);
  const workstationAppSignal = workstationAppDiscovery.json().candidates.find((candidate) =>
    candidate.reasons.some((reason) => /установленная программа/i.test(reason))
  );
  assert(workstationAppSignal, "local source discovery must turn installed Windows app names into safe migration hints");
  assert(workstationAppSignal.sourceKind === "vendor_imaging_system", "installed app hints must keep the matched vendor/source kind");
  assert(workstationAppSignal.sourceLabel === "Системный след рабочей станции", "installed app hints must not pretend to be a data folder");
  assert(/Sidexis|Sirona/i.test(workstationAppSignal.safeDisplayName), "installed app hints must keep a safe vendor label in the alias");
  assert(
    workstationAppSignal.warnings.every((warning) => !/Sidexis XG Installed Suite/i.test(warning)),
    "installed app warnings must not echo raw Windows DisplayName values"
  );

  const workstationProfileWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: shortcutProfile.sourceRef,
      sourceKind: shortcutProfile.sourceKind,
      safeDisplayName: shortcutProfile.safeDisplayName
    }
  });
  assert(workstationProfileWorkup.statusCode === 200, `workstation profile workup failed: ${workstationProfileWorkup.statusCode}`);
  const workstationProfilePlan = workstationProfileWorkup.json();
  assert(workstationProfilePlan.sourceLabel === "След установленной системы", "workstation profile workup must preserve the hint boundary");
  assert(
    workstationProfilePlan.warnings.some((warning) => /след установленной системы|read-only bridge|export/i.test(warning)),
    "workstation profile workup must explain that the hint still needs a bridge/export/data folder"
  );
  assert(
    workstationProfilePlan.requiredArtifacts.some((artifact) => /Romexis|Planmeca|DICOMDIR/i.test(artifact)),
    "workstation profile workup must add vendor-specific export/data-folder guidance"
  );
  assert(
    /Romexis|Planmeca|DICOMDIR/i.test(workstationProfilePlan.nextAction),
    "workstation profile workup must choose a vendor-specific next action"
  );
  assert(workstationProfilePlan.readiness.level === "needs_export", "workstation profile workup readiness must require export/data folder");
  assert(workstationProfilePlan.bridgeKit.kind === "dicom_export", "workstation profile workup bridge kit must direct admins to DICOM export");
  assert(workstationProfilePlan.bridgeKit.status === "needs_export", "workstation profile bridge kit must not mark shortcut-only evidence ready");
  assert(
    workstationProfilePlan.bridgeKit.outputManifest.forbiddenFields.some((field) => /pixel|path|public/i.test(field)),
    "workstation profile bridge kit must forbid raw pixels, paths, and public lookup leakage"
  );
  assert(
    workstationProfilePlan.readiness.blockers.some((item) => /след старой программы|Shortcut|data-папк|export/i.test(`${item.title} ${item.detail} ${item.nextAction}`)),
    "workstation profile readiness must not pretend that a shortcut is data"
  );

  const workstationProfileProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: shortcutProfile.sourceRef,
      sourceKind: shortcutProfile.sourceKind,
      safeDisplayName: shortcutProfile.safeDisplayName,
      maxDepth: 1,
      maxFolders: 2,
      maxFiles: 2,
      maxSampleArtifacts: 2
    }
  });
  assert(workstationProfileProbe.statusCode === 200, `workstation profile probe failed: ${workstationProfileProbe.statusCode}`);
  const workstationProfileProbeBody = workstationProfileProbe.json();
  assert(workstationProfileProbeBody.sourceLabel === "След установленной системы", "workstation profile probe must preserve the hint boundary");
  assert(
    workstationProfileProbeBody.formatSignals.some((signal) => /Romexis|Planmeca/i.test(signal)),
    "workstation profile probe must expose the matched safe vendor profile"
  );
  assert(workstationProfileProbeBody.readiness.level === "needs_export", "workstation profile probe readiness must require export/data folder");
  assert(workstationProfileProbeBody.bridgeKit.kind === "dicom_export", "workstation profile probe bridge kit must preserve the DICOM export route");

  const firebirdCandidate = discovery.candidates.find((candidate) => candidate.sourceKind === "firebird_database");
  assert(firebirdCandidate, "local source discovery must return an actionable Firebird candidate");
  const localSourceWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: firebirdCandidate.sourceRef,
      sourceKind: firebirdCandidate.sourceKind,
      safeDisplayName: firebirdCandidate.safeDisplayName
    }
  });
  assert(localSourceWorkup.statusCode === 200, `local source workup failed: ${localSourceWorkup.statusCode}`);
  const workup = localSourceWorkup.json();
  assert(workup.sourceKind === "firebird_database", "local source workup must preserve the selected source kind");
  assert(workup.extractableEntities.includes("patients"), "local source workup must describe extractable patients for DB imports");
  assert(workup.extractableEntities.includes("visits"), "local source workup must describe extractable visits for DB imports");
  assert(
    workup.steps.some((step) => step.status === "needs_bridge"),
    "local source workup must require a local staging bridge for DB imports"
  );
  assert(workup.readiness.level === "needs_bridge", "local source workup readiness must mark DB imports as bridge-gated");
  assert(workup.bridgeKit.kind === "local_db_bridge", "local source workup bridge kit must produce a DB bridge plan");
  assert(
    workup.bridgeKit.adminActions.some((action) => /offline copy|backup|копи/i.test(`${action.title} ${action.detail}`)),
    "local source workup bridge kit must make offline backup/copy the first admin action"
  );
  assert(
    workup.bridgeKit.outputManifest.requiredColumns.includes("source_row_hash"),
    "local source workup bridge kit must require source_row_hash for staging traceability"
  );
  assert(
    workup.readiness.blockers.some((item) => /staging bridge|БД старой МИС|offline-копия/i.test(`${item.title} ${item.detail} ${item.nextAction}`)),
    "local source workup readiness must block direct DB commit until staging bridge"
  );
  assert(
    workup.readiness.warnings.some((item) => item.owner === "doctor" && /контрольная выборка|10-20 карт/i.test(`${item.title} ${item.detail}`)),
    "local source workup readiness must require doctor control-sample review"
  );
  assert(
    workup.privacyWarnings.every((warning) => !/Ivan|Petrov|\+7 900/.test(warning)),
    "local source workup privacy warnings must not echo patient data"
  );

  const vendorCandidate = discovery.candidates.find((candidate) => candidate.sourceKind === "vendor_imaging_system");
  assert(vendorCandidate, "local source discovery must return an actionable vendor imaging candidate");
  const vendorWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: vendorCandidate.sourceRef,
      sourceKind: vendorCandidate.sourceKind,
      safeDisplayName: vendorCandidate.safeDisplayName
    }
  });
  assert(vendorWorkup.statusCode === 200, `vendor imaging workup failed: ${vendorWorkup.statusCode}`);
  assert(
    vendorWorkup.json().handoffs.some((handoff) => handoff.endpoint === "/api/imaging/dicom/folder-workup-plan"),
    "vendor imaging workup must hand off to the DICOM folder workup planner"
  );

  const sqliteCandidate = discovery.candidates.find((candidate) => candidate.sourceKind === "sqlite_database");
  assert(sqliteCandidate, "local source discovery must return an actionable SQLite candidate");
  const localSourceProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: sqliteCandidate.sourceRef,
      sourceKind: sqliteCandidate.sourceKind,
      safeDisplayName: sqliteCandidate.safeDisplayName,
      maxDepth: 1,
      maxFolders: 20,
      maxFiles: 40,
      maxSampleArtifacts: 8,
      readHeaderBytes: 128
    }
  });
  assert(localSourceProbe.statusCode === 200, `local source probe failed: ${localSourceProbe.statusCode}`);
  const probe = localSourceProbe.json();
  assert(probe.version === "dental-crm-migration-source-probe-v1", "local source probe must expose the v1 contract");
  assert(probe.counts.databases >= 1, "local source probe must count database artifacts");
  assert(probe.formatSignals.includes("SQLite header"), "local source probe must inspect database headers");
  assert(
    probe.adapters.some((adapter) => adapter.id === "legacy_db_staging_bridge"),
    "local source probe must choose a DB staging bridge for legacy DB files"
  );
  assert(probe.readiness.level === "needs_bridge", "local source probe readiness must mark SQLite DB imports as bridge-gated");
  assert(probe.bridgeKit.kind === "local_db_bridge", "local source probe bridge kit must keep SQLite on the DB bridge route");
  assert(
    probe.bridgeKit.outputManifest.forbiddenFields.includes("live_db_connection_string"),
    "local source probe bridge kit must forbid live DB connection strings in staging output"
  );
  assert(
    probe.readiness.ready.some((item) => item.id === "public_lookup_scope"),
    "local source probe readiness must prove that public lookup stays clinic-only"
  );
  assert(
    probe.artifactSamples.every((artifact) => !artifact.safeName.includes(tempMigrationRoot) && !/Ivan|Petrov/i.test(artifact.safeName)),
    "local source probe artifact samples must not expose raw paths or patient-like file/folder names"
  );

  const browserManifestWorkup = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-workup",
    headers,
    payload: {
      sourceRef: "browser-local:ABCDEF12",
      sourceKind: "dicom_folder",
      safeDisplayName: "Browser manifest #ABCDEF12"
    }
  });
  assert(browserManifestWorkup.statusCode === 200, `browser manifest workup failed: ${browserManifestWorkup.statusCode}`);
  const browserWorkup = browserManifestWorkup.json();
  assert(browserWorkup.sourceExists === true, "browser-local manifest workup must not be marked as a missing filesystem path");
  assert(browserWorkup.sourceLabel === "Браузерный manifest", "browser-local manifest workup must label its boundary clearly");
  assert(browserWorkup.readiness.level === "needs_bridge", "browser-local manifest workup readiness must require bridge/reselection before durable staging");
  assert(browserWorkup.bridgeKit.kind === "browser_manifest_bridge", "browser-local manifest workup bridge kit must expose the browser handle boundary");
  assert(
    browserWorkup.warnings.some((warning) => /локальный bridge|manifest/i.test(warning)),
    "browser-local manifest workup must explain that real staging needs a bridge or repeated folder selection"
  );

  const browserManifestProbe = await app.inject({
    method: "POST",
    url: "/api/imports/smart/local-source-probe",
    headers,
    payload: {
      sourceRef: "browser-local:ABCDEF12",
      sourceKind: "dicom_folder",
      safeDisplayName: "Browser manifest #ABCDEF12",
      maxDepth: 1,
      maxFolders: 2,
      maxFiles: 2,
      maxSampleArtifacts: 2
    }
  });
  assert(browserManifestProbe.statusCode === 200, `browser manifest probe failed: ${browserManifestProbe.statusCode}`);
  const browserProbe = browserManifestProbe.json();
  assert(browserProbe.sourceExists === true, "browser-local manifest probe must be an adapter-plan, not a broken local path");
  assert(browserProbe.readiness.level === "needs_bridge", "browser-local manifest probe readiness must keep the browser boundary visible");
  assert(browserProbe.bridgeKit.kind === "browser_manifest_bridge", "browser-local manifest probe bridge kit must keep the browser handle boundary");
  assert(
    browserProbe.adapters.some((adapter) => adapter.id === "dicom_folder_workup"),
    "browser-local DICOM manifest probe must still route to DICOM workup"
  );

  const browserManifestPreview = await app.inject({
    method: "POST",
    url: "/api/imports/smart/preview",
    headers,
    payload: {
      sourceName: "browser manifest",
      mode: "auto",
      rawText: "legacy source DICOMDIR browser-local:ABCDEF12 files=10 dicom=10 images=0"
    }
  });
  assert(browserManifestPreview.statusCode === 200, `browser manifest smart preview failed: ${browserManifestPreview.statusCode}`);
  assert(
    browserManifestPreview.json().legacySources.some((source) => source.sourceRef === "browser-local:ABCDEF12"),
    "smart import must preserve browser-local manifest refs as migration sources"
  );

  const migrationAutopilotPayload = {
    rootPaths: [tempMigrationRoot],
    maxDepth: 4,
    maxFolders: 80,
    maxFilesPerFolder: 40,
    maxCandidates: 12,
    maxProbeCandidates: 4,
    knownScannedFolders: 3,
    knownSources: [
      {
        sourceRef: "browser-local:ABCDEF12",
        safeDisplayName: "Browser manifest #ABCDEF12",
        sourceKind: "dicom_folder",
        sourceLabel: "Браузерный manifest",
        sourceFingerprint: "ABCDEF12",
        depth: 0,
        confidence: 0.91,
        matchedFiles: 10,
        databaseFiles: 0,
        dumpFiles: 0,
        tableFiles: 0,
        archiveFiles: 0,
        dicomLikeFiles: 10,
        imageFiles: 0,
        hasDicomDir: true,
        latestModifiedAt: null,
        reasons: ["browser-local metadata-only manifest"],
        warnings: ["full local path is intentionally unavailable to the server"],
        smartImportLine: "legacy source DICOMDIR browser-local:ABCDEF12 files=10 dicom=10 images=0"
      }
    ],
    clinic: {
      inn: "1234567890",
      clinicName: "Smile Clinic patient Ivan Petrov +7 900 111-22-33",
      address: "Samara, Lenina 1"
    }
  };
  const migrationAutopilotResponse = await app.inject({
    method: "POST",
    url: "/api/imports/smart/migration-autopilot",
    headers,
    payload: migrationAutopilotPayload
  });
  assert(migrationAutopilotResponse.statusCode === 200, `migration autopilot failed: ${migrationAutopilotResponse.statusCode}`);
  const migrationAutopilot = migrationAutopilotResponse.json();
  assert(migrationAutopilot.version === "dental-crm-migration-autopilot-v1", "migration autopilot must expose the v1 contract");
  assert(migrationAutopilot.discovery.candidateCount >= 4, "migration autopilot must reuse local source discovery");
  assert(migrationAutopilot.discovery.probedCount > 0, "migration autopilot must probe top candidates");
  assert(migrationAutopilot.discovery.roots.includes("browser-local:ABCDEF12"), "migration autopilot must include browser-local known roots");
  assert(
    migrationAutopilot.discovery.roots.every((root) => !root.includes(tempMigrationRoot) && !/Ivan|Petrov|LegacyDental/i.test(root)),
    "migration autopilot discovery roots must be safe aliases, not raw filesystem roots"
  );
  assert(migrationAutopilot.discovery.scannedFolders >= 3, "migration autopilot must include browser-local scanned folder counts");
  assert(migrationAutopilot.sources.length > 0, "migration autopilot must return ranked migration sources");
  assert(
    migrationAutopilot.sources.some(
      (source) => source.candidate.sourceRef === "browser-local:ABCDEF12" && source.probe?.sourceLabel === "Браузерный manifest"
    ),
    "migration autopilot must carry browser-local manifest candidates into ranking and probe planning"
  );
  assert(
    migrationAutopilot.sources.some((source) =>
      source.probe?.adapters.some((adapter) => adapter.id === "legacy_db_staging_bridge" || adapter.id === "dicom_folder_workup")
    ),
    "migration autopilot must surface built-in handoff adapters"
  );
  assert(
    migrationAutopilot.sources.some((source) => source.readiness && ["needs_bridge", "needs_export", "ready_for_preview"].includes(source.readiness.level)),
    "migration autopilot must rank sources with explicit readiness"
  );
  assert(
    migrationAutopilot.sources.some((source) => source.bridgeKit?.kind === "local_db_bridge" || source.bridgeKit?.kind === "dicom_export"),
    "migration autopilot must rank sources with concrete bridge/export kits"
  );
  assert(
    migrationAutopilot.steps.some((step) => step.owner === "doctor" && step.blocking),
    "migration autopilot must require doctor control-sample review before mass commit"
  );
  assert(migrationAutopilot.operatorPacket?.totals.sources === migrationAutopilot.sources.length, "migration autopilot must return an operator migration packet");
  assert(
    migrationAutopilot.operatorPacket.totals.databaseSources > 0 && migrationAutopilot.operatorPacket.totals.mediaSources > 0,
    "migration operator packet must summarize old DB and imaging lanes"
  );
  assert(
    migrationAutopilot.operatorPacket.lanes.some((lane) => lane.id === "clinic-requisites") &&
      migrationAutopilot.operatorPacket.lanes.some((lane) => lane.id === "bridge-export") &&
      migrationAutopilot.operatorPacket.firstActions.some((action) => /staging|preview|контрольной выборки|backup|DICOM/i.test(action)),
    "migration operator packet must give admin/doctor first actions"
  );
  assert(
    migrationAutopilot.operatorPacket.handoffChecklist.some((item) => item.phase === "clinic_requisites" && /ИНН|ОГРН|лиценз/i.test(item.requiredArtifact)) &&
      migrationAutopilot.operatorPacket.handoffChecklist.some((item) => item.phase === "export_or_bridge" || item.phase === "source_access") &&
      migrationAutopilot.operatorPacket.handoffChecklist.some((item) => item.phase === "doctor_control" && item.blocking),
    "migration operator packet must include clinic, export/bridge, and doctor handoff checklist items"
  );
  assert(
    migrationAutopilot.operatorPacket.onlineLookupPolicy.allowed.some((item) => /ИНН|ОГРН/.test(item)) &&
      migrationAutopilot.operatorPacket.onlineLookupPolicy.forbidden.some((item) => /пациент|DICOM|база/i.test(item)),
    "migration operator packet must define public lookup boundaries"
  );
  assert(migrationAutopilot.clinicLookup?.safeQuery === "1234567890", "migration autopilot must run safe clinic lookup when clinic fields are provided");
  assert(
    !/Ivan|Petrov|\+7 900|79001112233/.test(
      `${migrationAutopilot.clinicLookup?.safeQuery ?? ""} ${JSON.stringify(migrationAutopilot.clinicLookup?.publicLookupTargets ?? [])} ${JSON.stringify(migrationAutopilot.operatorPacket ?? {})} ${migrationAutopilot.privacyWarnings.join(" ")}`
    ),
    "migration autopilot must not echo patient identity into public clinic lookup fields or operator packet"
  );

  const migrationAutopilotReportResponse = await app.inject({
    method: "POST",
    url: "/api/imports/smart/migration-autopilot/report.csv",
    headers,
    payload: migrationAutopilotPayload
  });
  assert(migrationAutopilotReportResponse.statusCode === 200, `migration handoff report failed: ${migrationAutopilotReportResponse.statusCode}`);
  const reportDisposition = String(migrationAutopilotReportResponse.headers["content-disposition"] ?? "");
  assert(
    reportDisposition === 'attachment; filename="migration_autopilot_handoff.csv"',
    "migration handoff report filename must be static and safe"
  );
  assert(!/[\r\n]/.test(reportDisposition), "migration handoff report disposition must reject header injection shape");
  const migrationAutopilotReportCsv = migrationAutopilotReportResponse.body;
  assert(migrationAutopilotReportCsv.startsWith("\uFEFFsection;"), "migration handoff report must be a BOM-prefixed CSV");
  assert(migrationAutopilotReportCsv.includes("handoff_checklist"), "migration handoff report must include the handoff checklist");
  assert(migrationAutopilotReportCsv.includes("clinic_public_lookup_policy"), "migration handoff report must include public lookup policy");
  assert(migrationAutopilotReportCsv.includes("sourceFingerprint"), "migration handoff report must expose fingerprinted source references");
  assert(
    !/Ivan|Petrov|\+7 900|79001112233/.test(migrationAutopilotReportCsv),
    "migration handoff report must not leak patient identity from clinic lookup input"
  );
  assert(!migrationAutopilotReportCsv.includes(tempMigrationRoot), "migration handoff report must not leak raw local roots");
} finally {
  rmSync(tempMigrationRoot, { recursive: true, force: true });
}

const clinicPublicLookup = await app.inject({
  method: "POST",
  url: "/api/imports/smart/clinic-public-lookup",
  headers,
  payload: {
    inn: "1234567890",
    clinicName: "Smile Clinic patient Ivan Petrov +7 900 111-22-33",
    address: "Samara, Lenina 1",
    medicalLicenseNumber: "L-63-01-123456"
  }
});
assert(clinicPublicLookup.statusCode === 200, `clinic public lookup failed: ${clinicPublicLookup.statusCode}`);
const clinicLookup = clinicPublicLookup.json();
assert(clinicLookup.providerStatus === "not_configured", "clinic public lookup smoke must not depend on an external API token");
assert(clinicLookup.safeQuery === "1234567890", "clinic public lookup must prefer sanitized INN as the safe query");
assert(
  clinicLookup.publicLookupTargets.some((target) => target.kind === "company_registry" && /egrul\.nalog\.ru/.test(target.url)),
  "clinic public lookup must include official FNS registry target"
);
assert(
  clinicLookup.publicLookupTargets.some((target) => target.kind === "medical_license_registry" && /roszdravnadzor\.gov\.ru/.test(target.url)),
  "clinic public lookup must include Roszdravnadzor license target"
);
assert(
  !/Ivan|Petrov|\+7 900|79001112233/.test(`${clinicLookup.safeQuery} ${JSON.stringify(clinicLookup.publicLookupTargets)}`),
  "clinic public lookup must not echo patient identity into public requests"
);

const riskyClinicLookupPreview = await app.inject({
  method: "POST",
  url: "/api/imports/smart/preview",
  headers,
  payload: {
    sourceName: "dirty clinic card",
    mode: "auto",
    rawText: "Клиника Белая улыбка address Samara, Lenina 1 INN 1234567890 patient Ivan Petrov +7 900 111-22-33"
  }
});
assert(riskyClinicLookupPreview.statusCode === 200, `risky clinic preview failed: ${riskyClinicLookupPreview.statusCode}`);
const riskyClinicLookup = riskyClinicLookupPreview.json();
assert(riskyClinicLookup.clinicSuggestion?.fields?.clinicName === "Клиника Белая улыбка", "dirty clinic line must keep clinic name");
assert(riskyClinicLookup.clinicSuggestion?.fields?.address === "Samara, Lenina 1", "dirty clinic line must keep clinic address");
assert(
  !/Ivan|Petrov|\+7 900|79001112233/.test(riskyClinicLookup.clinicSuggestion?.fields?.address ?? ""),
  "dirty clinic line must cut patient tail from address"
);
assert(!riskyClinicLookup.clinicSuggestion?.fields?.phone, "dirty clinic line must not suggest a patient phone as clinic phone");
assert(riskyClinicLookup.publicLookupTargets.length > 0, "dirty clinic line must still prepare safe public lookup");
assert(
  !/Ivan|Petrov|\+7 900|79001112233/.test(JSON.stringify(riskyClinicLookup.publicLookupTargets)),
  "dirty clinic public lookup targets must not echo patient identity"
);

const migrationReport = await app.inject({
  method: "POST",
  url: "/api/imports/smart/report.csv",
  headers,
  payload: {
    sourceName: "migration cockpit",
    mode: "auto",
    rawText: [
      "Старая база C:\\Legacy\\clinic_2024.fdb",
      "Dental clinic Smile Center",
      "INN 1234567890 KPP 123456789",
      "Address: Samara, Lenina 1",
      "Ivan Petrov +7 900 111-22-33"
    ].join("\n")
  }
});
assert(migrationReport.statusCode === 200, `smart migration report failed: ${migrationReport.statusCode}`);
assert(migrationReport.body.includes("clinic_profile_suggestion"), "smart import report must include clinic suggestions");
assert(migrationReport.body.includes("public_lookup"), "smart import report must include public lookup rows");
assert(migrationReport.body.includes("legacy_source"), "smart import report must include legacy source rows");
assert(!/C:\\Legacy|clinic_2024\.fdb/i.test(migrationReport.body), "smart import report legacy source rows must not leak raw local DB paths");

console.log(
  JSON.stringify({
    ok: true,
    checked: "import contracts",
    patientRows: patientPreview.json().totalRows,
    contentDisposition: disposition
  })
);
