import { readFile } from "node:fs/promises";

const source = [
  await readFile("apps/web/src/App.tsx", "utf8"),
  await readFile("apps/web/src/useAppLogic.tsx", "utf8"),
  await readFile("apps/web/src/AppHelpers.tsx", "utf8")
].join("\n");
const browserContinuitySource = await readFile("apps/web/src/browserContinuity.ts", "utf8");
const ctPlanningExportSource = await readFile("apps/web/src/ctPlanningExport.ts", "utf8");
const ctPlanningImplantModelSource = await readFile("apps/web/src/ctPlanningImplantModel.ts", "utf8");
const ctPlanningViewerBridgeHandoffSource = await readFile("apps/web/src/ctPlanningViewerBridgeHandoff.ts", "utf8");
const packageJson = await readFile("package.json", "utf8");

function fail(message) {
  throw new Error(message);
}

function sourceSlice(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) fail(`Missing marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) fail(`Missing marker: ${endMarker}`);
  return source.slice(start, end);
}

const storageKeyBlock = sourceSlice("function dicomWorkbenchSeriesKey", "function isMprProjection");
const dicomDraftTypeBlock = sourceSlice("type DicomWorkbenchLocalDraft", "type LocalImagingFolderDraft");
const indexedDbBlock = sourceSlice("async function readLocalDicomWorkbenchDraftFromIndexedDb", "async function readPendingVisitSavesFromIndexedDb");
const restoreEffectBlock = sourceSlice("const restore = async () => {\n      const recovered = await loadLocalDicomWorkbenchDraft", "localImagingRecoveryHydratedOrganizationIdRef");
const mprRestoreBlock = sourceSlice("async function restoreMprWorkbenchLocalDraft", "useEffect(() => {\n    if (!activeImagingStudies.length)");
const mprAutoRestoreBlock = sourceSlice("if (!cbctWorkbenchSeriesKey || !mprControlsReady)", "function applyImagingViewerSessionState");

function forbidPattern(sourceText, pattern, message) {
  if (pattern.test(sourceText)) fail(message);
}

for (const marker of [
  "type DicomWorkbenchIndexedDbDraft",
  "type MprWorkbenchIndexedDbDraft",
  "const speechChunkDbVersion = 4;",
  "const requiredSpeechChunkDbStoreNames = [",
  "function assertSpeechChunkDbStores(db: IDBDatabase): void",
  "assertSpeechChunkDbStores(db);",
  "db.onversionchange = () => db.close();",
  "speechChunkDbPromise = null;",
  'const dicomWorkbenchDraftStoreName = "dicomWorkbenchDrafts";',
  'const mprWorkbenchDraftStoreName = "mprWorkbenchDrafts";',
  "db.createObjectStore(dicomWorkbenchDraftStoreName, { keyPath: \"storageKey\" })",
  "db.createObjectStore(mprWorkbenchDraftStoreName, { keyPath: \"storageKey\" })",
  'store.createIndex("organizationId", "organizationId")',
  'store.createIndex("seriesKey", "seriesKey")',
  'store.createIndex("clientSavedAt", "clientSavedAt")'
]) {
  if (!source.includes(marker)) fail(`DICOM workbench IndexedDB marker missing: ${marker}`);
}

for (const marker of [
  "export type BrowserCtOfflineStorageBoundary",
  "export const browserCtOfflineStorageBoundary",
  'mode: "metadata_only"',
  'indexedDbStore: "dicomWorkbenchDrafts"',
  'mprIndexedDbStore: "mprWorkbenchDrafts"',
  "savesDiagnosticPixels: false",
  "savesMeshGeometry: false",
  "storesDirectoryHandles: false",
  "storesUserFilePaths: false",
  "opfsDiagnosticStorageEnabled: false",
  "opfsSyncAccessHandleWorkerOnly: true",
  'heavyDataOwner: "external_viewer_or_future_local_module"',
  "const directoryPickerSupported = typeof fileAccessWindow?.showDirectoryPicker === \"function\";",
  "const filePickerSupported = typeof fileAccessWindow?.showOpenFilePicker === \"function\";",
  "const opfsSupported = typeof storageManager?.getDirectory === \"function\";"
]) {
  if (!browserContinuitySource.includes(marker)) fail(`Browser CT offline storage boundary marker missing: ${marker}`);
}

for (const marker of [
  "export type CtPlanningRuntimeTruthPolicy",
  "sourceMode: CtPlanningRuntimeSourceMode",
  "executionLane: CtPlanningRuntimeExecutionLane",
  "local_offline_available",
  "remote_online_required",
  "server_or_uploaded_copy",
  "mobile_or_constrained_preview",
  "desktop_browser_planning_preview",
  "desktop_app_or_external_diagnostic",
  "metadata_only_no_pixels",
  "hardwareQualityWeight",
  "progressiveSliceWindowCap",
  "targetSliceBatch",
  "containsDiagnosticPixels: false",
  "containsMeshGeometry: false",
  "browserStoresHeavyGeometry: false",
  'heavyDataOwner: "external_viewer_or_local_3d_module"',
  'sourceKind === "dicomweb" || sourceKind === "pacs"',
  'return "local_offline_available";'
]) {
  if (!ctPlanningExportSource.includes(marker)) fail(`CT planning runtime truth marker missing: ${marker}`);
}

for (const marker of [
  "containsMeshGeometry: false",
  "containsDiagnosticPixels: false",
  "browserStoresHeavyGeometry: false",
  'heavyDataOwner: "external_viewer_or_local_3d_module"',
  "Поверхности черепа/кости"
]) {
  if (!ctPlanningImplantModelSource.includes(marker)) fail(`CT local 3D no-heavy-geometry marker missing: ${marker}`);
}

for (const marker of [
  "runtimeTruthPolicy: CtPlanningViewerBridgeRuntimeTruthPolicy",
  "defaultRuntimeTruthPolicy",
  "browserStoresHeavyGeometry: false",
  'heavyDataOwner: "external_viewer_or_local_3d_module"'
]) {
  if (!ctPlanningViewerBridgeHandoffSource.includes(marker)) fail(`CT viewer bridge runtime truth marker missing: ${marker}`);
}

for (const marker of [
  "browserContinuity?.directoryPickerSupported",
  "browserContinuity?.filePickerSupported",
  "browserContinuity?.opfsSupported",
  "browserContinuity?.browserCtOfflineStorageBoundary.mode === \"metadata_only\"",
  "Выбор локальной КТ",
  "Граница КТ-хранилища"
]) {
  if (!source.includes(marker)) fail(`Browser CT offline audit UI marker missing: ${marker}`);
}

forbidPattern(
  dicomDraftTypeBlock,
  /\b(Blob|ArrayBuffer|Uint8Array|FileSystemFileHandle|FileSystemDirectoryHandle|File)\b|pixelData|rawPixel|meshGeometry|meshBytes/i,
  "DICOM workbench offline draft types must not embed files, diagnostic image payloads, or mesh geometry."
);

if (source.includes("const speechChunkDbVersion = 3;")) {
  fail("DICOM workbench IndexedDB migration must not stay on v3 after CT stores were added.");
}

for (const marker of [
  "dicomWorkbenchIndexedDbKey(organizationId",
  "mprWorkbenchIndexedDbKey(seriesKey",
  "normalizeLocalDicomWorkbenchDraft",
  "loadLocalDicomWorkbenchDraftFromLocalStorage",
  "loadLocalMprWorkbenchDraftFromLocalStorage",
  "saveLocalMprWorkbenchDraftToLocalStorage"
]) {
  if (!storageKeyBlock.includes(marker) && !source.includes(marker)) fail(`DICOM workbench fallback/migration marker missing: ${marker}`);
}

for (const marker of [
  "async function migrateLocalDicomWorkbenchDraftFromLocalStorage",
  "async function loadLocalDicomWorkbenchDraft",
  "async function saveLocalDicomWorkbenchDraft",
  "async function removeLocalDicomWorkbenchDraft",
  "async function migrateLocalMprWorkbenchDraftFromLocalStorage",
  "async function loadLocalMprWorkbenchDraft",
  "async function saveLocalMprWorkbenchDraft",
  "removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId)",
  "window.localStorage.removeItem(mprWorkbenchLocalKey(seriesKey, organizationId))"
]) {
  if (!indexedDbBlock.includes(marker) && !source.includes(marker)) fail(`DICOM workbench IndexedDB helper missing: ${marker}`);
}

for (const marker of [
  "const recovered = await loadLocalDicomWorkbenchDraft(activeOrganizationId);",
  "void loadDicomWorkbenchBundles({ silent: true, restoreLatest: !recovered });",
  "if (cancelled) return;"
]) {
  if (!restoreEffectBlock.includes(marker)) fail(`DICOM workbench restore effect must be async/cancellable: ${marker}`);
}

for (const marker of [
  "async function restoreMprWorkbenchLocalDraft()",
  "const draft = await loadLocalMprWorkbenchDraft(cbctWorkbenchSeriesKey, activeOrganizationId);"
]) {
  if (!mprRestoreBlock.includes(marker)) fail(`MPR manual restore must await IndexedDB: ${marker}`);
}

for (const marker of [
  "const draft = await loadLocalMprWorkbenchDraft(cbctWorkbenchSeriesKey, activeOrganizationId);",
  "void saveLocalMprWorkbenchDraft(",
  ").then((saved) => {",
  "if (saved) setMprWorkbenchLocalSavedAt(clientSavedAt);"
]) {
  if (!mprAutoRestoreBlock.includes(marker)) fail(`MPR auto restore/save must use async IndexedDB path: ${marker}`);
}

for (const marker of [
  "const savedLocally = await saveLocalDicomWorkbenchDraft(manifest, clientSavedAt, activeOrganizationId);",
  "const savedLocally = await saveLocalDicomWorkbenchDraft(result, clientSavedAt, activeOrganizationId);",
  "setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);",
  "void removeLocalDicomWorkbenchDraft(activeOrganizationId);"
]) {
  if (!source.includes(marker)) fail(`DICOM workbench UI must await durable local recovery path: ${marker}`);
}

if (!packageJson.includes('"smoke:dicom-workbench-offline-source": "node scripts/smoke-dicom-workbench-offline-source.mjs"')) {
  fail("package.json must expose smoke:dicom-workbench-offline-source.");
}

console.log(JSON.stringify({ ok: true, guard: "dicom-workbench-offline-indexeddb" }));
