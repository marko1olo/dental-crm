import { readFile } from "node:fs/promises";

const appSource = await readFile("apps/web/src/App.tsx", "utf8");
const settingsSource = await readFile("apps/web/src/SettingsView.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} missing marker: ${marker}`);
  }
}

function sourceSlice(startMarker, endMarker, label) {
  const start = appSource.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`${label} missing start marker: ${startMarker}`);
  }
  const end = appSource.indexOf(endMarker, start + startMarker.length);
  if (end === -1) {
    throw new Error(`${label} missing end marker: ${endMarker}`);
  }
  return appSource.slice(start, end);
}

function assertFunctionIncludes(startMarker, endMarker, markers, label) {
  const block = sourceSlice(startMarker, endMarker, label);
  for (const marker of markers) {
    assertIncludes(block, marker, label);
  }
}

[
  "type LocalDicomOperationOptions",
  "localDicomOperationAbortRef",
  "isLocalDicomOperationActive",
  "startLocalDicomOperation",
  "finishLocalDicomOperation(controller)",
  "cancelLocalDicomOperation",
  "isLocalDicomOperationAbortError",
  "signal: options.signal ?? null",
  "signal: controller.signal",
  "fetchDicomFolderWorkup(folderPath, \"dicom_folder_workup\", { signal: controller.signal })",
  "fetchDicomFolderWorkup(cleanFolderPath, sourceName, { signal: controller.signal })",
  "if (isLocalDicomOperationAbortError(workupError)) return;",
  "if (isLocalDicomOperationAbortError(workbenchError)) return;",
  "if (isLocalDicomOperationAbortError(reconnectError)) return;"
].forEach((marker) => assertIncludes(appSource, marker, "App local DICOM operation cancel contract"));

[
  "cancelLocalDicomOperation={cancelLocalDicomOperation}",
  "isLocalDicomOperationActive={isLocalDicomOperationActive}"
].forEach((marker) => assertIncludes(appSource, marker, "App Settings local DICOM cancel props"));

[
  "cancelLocalDicomOperation",
  "isLocalDicomOperationActive",
  "data-testid=\"cancel-local-dicom-operation\"",
  "Остановить КТ"
].forEach((marker) => assertIncludes(settingsSource, marker, "Settings local DICOM cancel UI"));

const signalFetchCount = (appSource.match(/signal: controller\.signal/g) ?? []).length;
if (signalFetchCount < 8) {
  throw new Error(`expected local DICOM operation fetches to pass AbortController signal, got ${signalFetchCount}`);
}

assertFunctionIncludes(
  "async function previewDicomSeries()",
  "async function checkDicomWebConnector()",
  [
    "const controller = startLocalDicomOperation();",
    'fetch("/api/imaging/dicom/series-preview"',
    "signal: controller.signal",
    "if (isLocalDicomOperationAbortError(seriesError)) return;",
    "finishLocalDicomOperation(controller);"
  ],
  "DICOM series preview cancel source"
);

assertFunctionIncludes(
  "async function checkDicomWebConnector()",
  "async function buildDicomViewerWorkbenchManifest()",
  [
    "const controller = startLocalDicomOperation();",
    'fetch("/api/imaging/dicomweb/check"',
    "signal: controller.signal",
    "if (isLocalDicomOperationAbortError(checkError)) return;",
    "finishLocalDicomOperation(controller);"
  ],
  "DICOMweb check cancel source"
);

assertFunctionIncludes(
  "async function buildDicomViewerWorkbenchManifest()",
  "async function buildDicomViewerLaunchManifest()",
  [
    "const controller = startLocalDicomOperation();",
    'fetch("/api/imaging/dicom/viewer-workbench-manifest"',
    "signal: controller.signal",
    "saveDicomWorkbenchBundleToServer(result, clientSavedAt, { silent: true, signal: controller.signal })",
    "if (isLocalDicomOperationAbortError(workbenchError)) return;",
    "finishLocalDicomOperation(controller);"
  ],
  "DICOM current-series workbench cancel source"
);

assertFunctionIncludes(
  "async function buildDicomViewerLaunchManifest()",
  "async function buildDicomViewerToolStateBundle()",
  [
    "const controller = startLocalDicomOperation();",
    'fetch("/api/imaging/dicom/viewer-launch-manifest"',
    "signal: controller.signal",
    "if (isLocalDicomOperationAbortError(manifestError)) return;",
    "finishLocalDicomOperation(controller);"
  ],
  "DICOM launch cancel source"
);

assertFunctionIncludes(
  "async function buildDicomViewerToolStateBundle()",
  "function downloadDicomViewerToolStateBundle()",
  [
    "const controller = startLocalDicomOperation();",
    'fetch("/api/imaging/dicom/viewer-tool-state"',
    "signal: controller.signal",
    "if (isLocalDicomOperationAbortError(toolStateError)) return;",
    "finishLocalDicomOperation(controller);"
  ],
  "DICOM viewer tool-state cancel source"
);

assertFunctionIncludes(
  "async function saveDicomWorkbenchBundleToServer",
  "async function reconnectDicomWorkbenchFromCurrentFolder()",
  [
    "options: { silent?: boolean; signal?: AbortSignal }",
    'fetch("/api/imaging/dicom/workbench-bundles"',
    "signal: options.signal ?? null",
    "if (isLocalDicomOperationAbortError(saveError)) return null;"
  ],
  "DICOM workbench server save cancel source"
);

assertFunctionIncludes(
  "async function reconnectDicomWorkbenchFromCurrentFolder()",
  "async function checkDicomWorkstationReadiness()",
  [
    "const controller = startLocalDicomOperation();",
    'fetch("/api/imaging/dicom/folder-workup-plan"',
    'fetch("/api/imaging/dicom/viewer-workbench-manifest"',
    "signal: controller.signal",
    "saveDicomWorkbenchBundleToServer(manifest, clientSavedAt, { silent: true, signal: controller.signal })",
    "if (isLocalDicomOperationAbortError(reconnectError)) return;",
    "finishLocalDicomOperation(controller);"
  ],
  "DICOM reconnect cancel source"
);

assertFunctionIncludes(
  "async function checkDicomWorkstationReadiness()",
  "async function buildDicomRenderCachePlan()",
  [
    "const controller = startLocalDicomOperation();",
    'fetch("/api/imaging/dicom/workstation-readiness"',
    "signal: controller.signal",
    "if (isLocalDicomOperationAbortError(readinessError)) return;",
    "finishLocalDicomOperation(controller);"
  ],
  "DICOM workstation readiness cancel source"
);

assertFunctionIncludes(
  "async function buildDicomRenderCachePlan()",
  "async function commitImagingImport()",
  [
    "const controller = startLocalDicomOperation();",
    'fetch("/api/imaging/dicom/render-cache-plan"',
    "signal: controller.signal",
    "if (isLocalDicomOperationAbortError(cachePlanError)) return;",
    "finishLocalDicomOperation(controller);"
  ],
  "DICOM render-cache cancel source"
);

const smokeCommand = packageJson.scripts?.["smoke:dicom-workbench-ui-cancel-source"];
if (smokeCommand !== "node scripts/smoke-dicom-workbench-ui-cancel-source.mjs") {
  throw new Error("package.json missing smoke:dicom-workbench-ui-cancel-source");
}

console.log("dicom workbench UI cancel source smoke passed");
