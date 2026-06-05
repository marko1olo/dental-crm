import { readFile } from "node:fs/promises";

const appSource = await readFile("apps/web/src/App.tsx", "utf8");
const settingsSource = await readFile("apps/web/src/SettingsView.tsx", "utf8");
const stylesSource = await readFile("apps/web/src/styles/main.css", "utf8");
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
  "type BrowserImagingScanProgress",
  "elapsedMs: number",
  "processedUnits: number",
  "fileLimit: number",
  "folderLimit: number",
  "magicReadLimit: number",
  "type BrowserImagingScanOptions",
  "const browserImagingScanFileLimit = 900",
  "const browserImagingScanFolderLimit = 260",
  "const browserImagingScanDirectoryEntryLimit = 1600",
  "const browserImagingScanMagicReadLimit = 180",
  "const browserImagingScanYieldEveryUnits = 24",
  "const browserImagingScanProgressEveryMs = 96",
  "browserImagingScanAbortRef",
  "new AbortController()",
  "cancelBrowserImagingFolderScan",
  "signal?: AbortSignal",
  "throwIfBrowserImagingScanAborted",
  "browserImagingScanElapsedFromIso",
  "startedAtMs: now",
  "fileLimit: browserImagingScanFileLimit",
  "browserImagingScanYield",
  "scheduler?: { yield?: () => Promise<void> }",
  "setTimeout(resolve, 0)",
  "publishBrowserImagingScanProgress",
  "maybeYieldBrowserImagingScan",
  "runBrowserImagingFolderScan",
  "scanBrowserDirectoryHandle(directoryHandle, options)",
  "scanBrowserFileList(fileList, options)",
  "const selectedFileCount = fileList.length",
  "const scanCount = Math.min(selectedFileCount, browserImagingScanFileLimit)",
  "fileList.item(fileIndex)",
  "inspectedDirectoryEntries > browserImagingScanDirectoryEntryLimit",
  "setBrowserImagingScanProgress"
].forEach((marker) => assertIncludes(appSource, marker, "App browser imaging scan contract"));

[
  "CircleStop",
  "browserImagingScanProgress",
  "browser-cancel-local-imaging-folder-scan",
  "browser-cancel-local-imaging-folder-scan-inline",
  "browser-imaging-scan-progress",
  "aria-live=\"polite\"",
  "Интерфейс остается доступным: обработка идет короткими порциями.",
  "formatBrowserImagingScanElapsed",
  "browserImagingScanProgress.fileLimit",
  "browserImagingScanProgress.folderLimit",
  "browserImagingScanProgress.magicReadLimit",
  "browserImagingScanProgress.processedUnits"
].forEach((marker) => assertIncludes(settingsSource, marker, "Settings browser imaging scan UI"));

[
  "browser-imaging-scan-progress",
  "browser-scan-stop-button"
].forEach((marker) => assertIncludes(stylesSource, marker, "Browser imaging scan styles"));

[
  "const maxFiles = 900",
  "const maxFolders = 260",
  "const maxMagicReads = 180"
].forEach((marker) => assertNotIncludes(appSource, marker, "Browser imaging scan hardcoded local limit"));

[
  "Array.from(fileList)",
  "files.slice(0, browserImagingScanFileLimit)"
].forEach((marker) => assertNotIncludes(appSource, marker, "Browser imaging scan must not materialize full FileList"));

const smokeCommand = packageJson.scripts?.["smoke:browser-imaging-scan-progress-source"];
if (smokeCommand !== "node scripts/smoke-browser-imaging-scan-progress-source.mjs") {
  throw new Error("package.json missing smoke:browser-imaging-scan-progress-source");
}

console.log("browser imaging scan progress source smoke passed");
