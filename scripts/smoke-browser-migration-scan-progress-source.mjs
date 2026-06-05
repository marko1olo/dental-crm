import { readFile } from "node:fs/promises";

const appSource = await readFile("apps/web/src/App.tsx", "utf8");
const settingsSource = await readFile("apps/web/src/SettingsView.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} missing marker: ${marker}`);
  }
}

function assertNotIncludes(source, marker, label) {
  if (source.includes(marker)) {
    throw new Error(`${label} still includes forbidden marker: ${marker}`);
  }
}

[
  "type BrowserMigrationScanStats",
  "type BrowserMigrationScanProgress",
  "type BrowserMigrationScanOptions",
  "type BrowserMigrationScanRuntime",
  "const browserMigrationScanFileLimit = 1200",
  "const browserMigrationScanFolderLimit = 320",
  "const browserMigrationScanDirectoryEntryLimit = 1600",
  "const browserMigrationScanMagicReadLimit = 220",
  "const browserMigrationScanYieldEveryUnits = 24",
  "const browserMigrationScanYieldEveryMs = 20",
  "const browserMigrationScanProgressEveryUnits = 12",
  "const browserMigrationScanProgressEveryMs = 96",
  "browserMigrationScanAbortRef",
  "new AbortController()",
  "cancelBrowserMigrationScan",
  "signal?: AbortSignal",
  "throwIfBrowserMigrationScanAborted",
  "isBrowserMigrationScanAbortError",
  "createBrowserMigrationScanRuntime",
  "browserMigrationScanProgressFromStats",
  "publishBrowserMigrationScanProgress",
  "maybeYieldBrowserMigrationScan",
  "await browserImagingScanYield()",
  "runBrowserMigrationSourceScan",
  "setBrowserMigrationScanProgress",
  "scanBrowserMigrationDirectoryHandle(directoryHandle, options)",
  "scanBrowserMigrationFileList(fileList, options)",
  "onProgress: setBrowserMigrationScanProgress",
  "if (controller.signal.aborted) return",
  "await runMigrationAutopilot(discovery)",
  "const scanCount = Math.min(selectedFileCount, browserMigrationScanFileLimit)",
  "fileList.item(fileIndex)",
  "inspectedDirectoryEntries > browserMigrationScanDirectoryEntryLimit",
  "scannedFolders < browserMigrationScanFolderLimit && scannedFiles < browserMigrationScanFileLimit"
].forEach((marker) => assertIncludes(appSource, marker, "App browser migration scan progress contract"));

[
  "browserMigrationScanProgress",
  "cancelBrowserMigrationScan",
  "browser-cancel-migration-source-scan",
  "browser-cancel-migration-source-scan-inline",
  "browser-migration-scan-progress",
  "aria-live=\"polite\"",
  "Интерфейс остается доступным: проверка идет короткими порциями и без загрузки содержимого файлов.",
  "browserMigrationScanProgress.fileLimit",
  "browserMigrationScanProgress.folderLimit",
  "browserMigrationScanProgress.magicReadLimit",
  "browserMigrationScanProgress.processedUnits"
].forEach((marker) => assertIncludes(settingsSource, marker, "Settings browser migration scan UI"));

[
  "const maxFiles = 1200",
  "const maxFolders = 320",
  "const maxMagicReads = 220",
  "Array.from(fileList)",
  "files.slice(0, browserMigrationScanFileLimit)"
].forEach((marker) => assertNotIncludes(appSource, marker, "Browser migration scan must keep bounded streaming iteration"));

const smokeCommand = packageJson.scripts?.["smoke:browser-migration-scan-progress-source"];
if (smokeCommand !== "node scripts/smoke-browser-migration-scan-progress-source.mjs") {
  throw new Error("package.json missing smoke:browser-migration-scan-progress-source");
}

console.log("browser migration scan progress source smoke passed");
