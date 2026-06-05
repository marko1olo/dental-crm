import { readFile } from "node:fs/promises";

const imagingSource = await readFile("apps/api/src/routes/imaging.ts", "utf8");
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
  'import { setImmediate as yieldImmediate } from "node:timers/promises";',
  "type ApiDicomScanOptions",
  "type ApiDicomScanYieldState",
  "const apiDicomScanYieldEveryUnits = 64",
  "const apiDicomScanYieldEveryMs = 20",
  "createImagingRequestAbortSignal",
  'request.raw.once("close"',
  "request.raw.aborted",
  "new AbortController()",
  "throwIfApiDicomScanAborted",
  "maybeYieldApiDicomScan",
  "yieldImmediate(undefined, { signal })",
  "runAbortableImagingScan",
  "sendImagingScanCancelled"
].forEach((marker) => assertIncludes(imagingSource, marker, "API DICOM scan abort/yield core"));

[
  "const zipEocdSearchWindowBytes = 65_557",
  "const zipCentralDirectoryReadLimit = 8 * 1024 * 1024",
  "const zipEntryMetadataCompressedReadLimit = 8 * 1024 * 1024",
  "const zipEntryMetadataChunkBytes = 64 * 1024",
  "type ZipCentralDirectoryDetailedResult",
  "function readExactFileRange(",
  "readSync(descriptor, buffer, bytesRead, length - bytesRead, position + bytesRead)",
  "descriptor: number | null",
  "const descriptor = openSync(filePath, \"r\")",
  "readExactFileRange(descriptor, stats.size - tailLength, tailLength)",
  "readExactFileRange(descriptor, centralDirectoryOffset, centralDirectorySize)",
  "centralDirectoryOffset + centralDirectorySize > stats.size",
  "createInflateRaw()",
  "async function zipEntryPrefix(",
  "zipEntryPrefix(descriptor: number",
  "await zipEntryPrefix(zip.descriptor, entry, input.maxHeaderBytes)",
  "closeSync(zip.descriptor)",
  "split/multi-disk ZIP",
  "zip64_entry_skipped",
  "zip_entry_out_of_bounds",
  'if (filePath.includes("::")) return false;',
  "function isDicomArchiveVirtualEntryPath(filePath: string | null): boolean",
  "const archiveVirtualSource = isDicomArchiveVirtualEntryPath(input.firstFilePath)",
  "isDicomArchiveVirtualEntryPath(series.firstFilePath)",
  "Boolean(series.firstFilePath) && !hasVirtualArchiveEntries",
  "!remoteSource && !hasVirtualArchiveEntries"
].forEach((marker) => assertIncludes(imagingSource, marker, "API DICOM ZIP bounded range-read contract"));

[
  'import { opendir, readdir } from "node:fs/promises";',
  "type ApiDicomFolderTraversalLimits",
  "const apiDicomDefaultMaxFolders = 900",
  "const apiDicomDefaultMaxEntriesPerFolder = 2000",
  "collectImagingFiles(",
  "collectDicomHeaderFiles(",
  "limits: ApiDicomFolderTraversalLimits = {}",
  "const directory = await opendir(current)",
  "let queueIndex = 0",
  "entriesInspected > maxEntriesPerFolder",
  "foldersScanned + queuedFolders < maxFolders",
  "Сканирование папок остановлено на лимите",
  "Сканирование папок снимков остановлено на лимите",
  "buildDicomHeaderManifest(",
  "const dicomFirstFrameHeaderReadLimit = 8 * 1024 * 1024",
  "const dicomFirstFramePixelReadLimit = 32 * 1024 * 1024",
  "function locateLittleEndianPixelData(buffer: Buffer)",
  "function readDicomFirstFramePreviewBuffer(filePath: string, maxFileBytes: number)",
  "buildDicomFirstFramePreview(input: {",
  "readDicomFirstFramePreviewBuffer(filePath, input.maxFileBytes)",
  "discoverLocalDicomFolders(input: DicomLocalFolderDiscoveryRequest, options: ApiDicomScanOptions = {})",
  "organizeLocalImagingSources(input: LocalImagingOrganizerRequest, options: ApiDicomScanOptions = {})",
  "buildDicomFolderSeriesPreview(input: {",
  "buildDicomFolderWorkupPlan(input: DicomFolderWorkupPlanRequest, options: ApiDicomScanOptions = {})"
].forEach((marker) => assertIncludes(imagingSource, marker, "API DICOM scan helper threading"));

[
  "maxFolders: input.maxFolders",
  "maxEntriesPerFolder: input.maxEntriesPerFolder",
  "await buildDicomHeaderManifest(",
  "discoverLocalDicomFolders(input, options)",
  "organizeLocalImagingSources(input, options)",
  "buildDicomFolderSeriesPreview(input, options)",
  "buildDicomFirstFramePreview(input, options)",
  "buildDicomFolderWorkupPlan(input, options)"
].forEach((marker) => assertIncludes(imagingSource, marker, "API DICOM scan callsite signal propagation"));

[
  "const canUseWorker = renderPlan.useWebWorker && renderPlan.textureStrategy !== \"external_viewer\"",
  "!canUseWorker\n      ? 0",
  "Фоновая подготовка КТ-срезов недоступна",
  "target: canUseWorker ? \"web_worker\" : \"main_thread\""
].forEach((marker) => assertIncludes(imagingSource, marker, "API DICOM render-cache worker honesty"));

[
  "function buildDicomRenderHardwarePolicy(",
  "memoryBudgetClass",
  "hardwareQualityWeight",
  "progressiveSliceWindowCap",
  "diagnosticPixelPolicy",
  "runtimeProfile.executionLane === \"desktop_app_mpr\"",
  "browser_preview_not_diagnostic",
  "const residentSliceCap = Math.max(1, Math.min(fileCount, renderPlan.progressiveSliceWindowCap))",
  "Math.min(renderPlan.targetSliceBatch, renderPlan.progressiveSliceWindowCap)",
  "id: \"ct_memory_policy\""
].forEach((marker) => assertIncludes(imagingSource, marker, "API DICOM CT runtime budget and pixel policy honesty"));

[
  "/api/imaging/dicom/local-folder-discovery",
  "/api/imaging/local-organizer/scan-preview",
  "/api/imaging/dicom/folder-series-preview",
  "/api/imaging/dicom/first-frame-preview",
  "/api/imaging/dicom/folder-workup-plan",
  "/api/imaging/folders/scan-preview"
].forEach((route) => assertIncludes(imagingSource, route, "API DICOM scan route coverage"));

const wrappedRouteCount = (imagingSource.match(/runAbortableImagingScan\(request, reply/g) ?? []).length;
if (wrappedRouteCount < 6) {
  throw new Error(`expected at least 6 abortable imaging scan routes, got ${wrappedRouteCount}`);
}

const yieldCount = (imagingSource.match(/maybeYieldApiDicomScan\(yieldState, options\.signal\)/g) ?? []).length;
if (yieldCount < 8) {
  throw new Error(`expected DICOM scan helpers to yield in folder and file loops, got ${yieldCount}`);
}

const detailedZipParser = imagingSource.slice(
  imagingSource.indexOf("function readZipCentralDirectoryDetailed"),
  imagingSource.indexOf("function zipEntryPrefix")
);
if (detailedZipParser.includes("readFileSync(filePath)")) {
  throw new Error("readZipCentralDirectoryDetailed must not buffer the whole ZIP archive");
}

const namesOnlyZipParser = imagingSource.slice(
  imagingSource.indexOf("function readZipCentralDirectory(filePath"),
  imagingSource.indexOf("function expandDicomArchiveManifestLines")
);
if (namesOnlyZipParser.includes("readFileSync(filePath)")) {
  throw new Error("readZipCentralDirectory must reuse bounded ZIP metadata reads");
}

assertNotIncludes(imagingSource, "zipPreviewByteLimit", "API DICOM ZIP parser must not use a total archive-size gate");
assertNotIncludes(imagingSource, "stats.size > zipPreviewByteLimit", "API DICOM ZIP parser must not reject large regular ZIP archives before range reads");
assertNotIncludes(imagingSource, "inflateRawSync", "API DICOM ZIP metadata scan must not inflate full entries synchronously");
assertNotIncludes(imagingSource, "readExactFileRange(descriptor, dataStart, entry.compressedSize)", "API DICOM ZIP metadata scan must not read full compressed entries");
assertNotIncludes(imagingSource, "parseDicomFirstFramePixel(readFileSync(filePath)", "DICOM first-frame preview must not read full files synchronously");
assertNotIncludes(imagingSource, "readFileSync(filePath)", "API imaging route must not use full synchronous file reads for DICOM previews");

const boundedImagingCollector = imagingSource.slice(
  imagingSource.indexOf("async function collectImagingFiles"),
  imagingSource.indexOf("function quoteManifestCell")
);
if (boundedImagingCollector.includes("queue.shift()") || boundedImagingCollector.includes("await readdir(current")) {
  throw new Error("collectImagingFiles must use bounded opendir traversal without queue.shift or directory materialization");
}

const boundedDicomCollector = imagingSource.slice(
  imagingSource.indexOf("async function collectDicomHeaderFiles"),
  imagingSource.indexOf("async function buildDicomHeaderManifest")
);
if (boundedDicomCollector.includes("queue.shift()") || boundedDicomCollector.includes("await readdir(current")) {
  throw new Error("collectDicomHeaderFiles must use bounded opendir traversal without queue.shift or directory materialization");
}

const smokeCommand = packageJson.scripts?.["smoke:api-dicom-scan-abort-yield-source"];
if (smokeCommand !== "node scripts/smoke-api-dicom-scan-abort-yield-source.mjs") {
  throw new Error("package.json missing smoke:api-dicom-scan-abort-yield-source");
}

console.log("api dicom scan abort/yield source smoke passed");
