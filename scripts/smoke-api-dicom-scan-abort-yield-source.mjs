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

function assertMatches(source, pattern, label) {
	if (!pattern.test(source)) {
		throw new Error(`${label} missing pattern: ${pattern}`);
	}
}

function assertNoMatch(source, pattern, label) {
	const found = source.match(pattern);
	if (found) {
		throw new Error(`${label} forbidden pattern hit: ${found[0].trim()}`);
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
	"sendImagingScanCancelled",
].forEach((marker) =>
	assertIncludes(imagingSource, marker, "API DICOM scan abort/yield core"),
);

[
	"const zipEocdSearchWindowBytes = 65_557",
	"const zipCentralDirectoryReadLimit = 8 * 1024 * 1024",
	"const zipEntryMetadataCompressedReadLimit = 8 * 1024 * 1024",
	"const zipEntryMetadataChunkBytes = 64 * 1024",
	"type ZipCentralDirectoryDetailedResult",
	"async function readExactFileRange(",
	"await fileHandle.read(buffer, bytesRead, length - bytesRead, position + bytesRead)",
	"fileHandle: FileHandle | null",
	'fileHandle = await open(filePath, "r")',
	"readExactFileRange(fileHandle, stats.size - tailLength, tailLength)",
	"readExactFileRange(fileHandle, centralDirectoryOffset, centralDirectorySize)",
	"centralDirectoryOffset + centralDirectorySize > stats.size",
	"createInflateRaw()",
	"async function zipEntryPrefix(",
	"zipEntryPrefix(fileHandle: FileHandle",
	"await zipEntryPrefix(zip.fileHandle, entry, input.maxHeaderBytes)",
	"await zip.fileHandle.close()",
	"split/multi-disk ZIP",
	"zip64_entry_skipped",
	"zip_entry_out_of_bounds",
	'if (filePath.includes("::")) return false;',
	"function isDicomArchiveVirtualEntryPath(filePath: string | null): boolean",
	"const archiveVirtualSource = isDicomArchiveVirtualEntryPath(input.firstFilePath)",
	"isDicomArchiveVirtualEntryPath(series.firstFilePath)",
	"Boolean(series.firstFilePath) && !hasVirtualArchiveEntries",
	"!remoteSource && !hasVirtualArchiveEntries",
].forEach((marker) =>
	assertIncludes(
		imagingSource,
		marker,
		"API DICOM ZIP bounded range-read contract",
	),
);

[
	'import { opendir, readdir, stat } from "node:fs/promises";',
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
].forEach((marker) =>
	assertIncludes(imagingSource, marker, "API DICOM scan helper threading"),
);

/*
 * ПРЕДМЕТ ЗДЕСЬ — ПРОБРОС СИГНАЛА ОТМЕНЫ, А НЕ ФОРМА СПИСКА АРГУМЕНТОВ.
 *
 * Раньше эти три требования были дословными подстроками одной строки, например
 * "buildDicomFolderWorkupPlan(input: DicomFolderWorkupPlanRequest, options:
 * ApiDicomScanOptions = {})". Они покраснели от двух безобидных изменений:
 *   1) у помощников появился третий параметр organizationId (разбор папки от
 *      имени вызывающей клиники, а не «первой строки таблицы organizations»);
 *   2) Biome перенёс подписи и вызовы на несколько строк.
 * Проброс options никуда не делся: apps/api/src/routes/imaging.ts:6179-6182
 * (подпись), :6184 и :6442 (buildDicomFolderSeriesPreview(input, options, …)),
 * :6469 (buildDicomFolderWorkupPlan(input, options, workupOrgId)).
 *
 * Образцы закрепляют СВЯЗЬ «имя помощника → options на своём месте», допускают
 * перенос строк и следующий за options аргумент, но НЕ допускают исчезновение
 * самого options: без него AbortSignal до обхода папки не доходит и «Остановить»
 * перестаёт останавливать.
 */
assertMatches(
	imagingSource,
	/buildDicomFolderWorkupPlan\(\s*input:\s*DicomFolderWorkupPlanRequest,\s*options:\s*ApiDicomScanOptions\s*=\s*\{\}\s*[,)]/,
	"API DICOM scan helper threading",
);

[
	"maxFolders: input.maxFolders",
	"maxEntriesPerFolder: input.maxEntriesPerFolder",
	"await buildDicomHeaderManifest(",
	"discoverLocalDicomFolders(input, options)",
	"organizeLocalImagingSources(input, options)",
	"buildDicomFirstFramePreview(input, options)",
].forEach((marker) =>
	assertIncludes(
		imagingSource,
		marker,
		"API DICOM scan callsite signal propagation",
	),
);

/* Те же два вызова, что и выше: options обязан оставаться вторым аргументом,
 * organizationId после него разрешён. */
for (const pattern of [
	/buildDicomFolderSeriesPreview\(\s*input,\s*options\s*[,)]/,
	/buildDicomFolderWorkupPlan\(\s*input,\s*options\s*[,)]/,
]) {
	assertMatches(
		imagingSource,
		pattern,
		"API DICOM scan callsite signal propagation",
	);
}

/*
 * КАЖДЫЙ ВЫЗОВ, А НЕ ХОТЯ БЫ ОДИН. Требование выше выполняется первым же
 * совпадением, и у buildDicomFolderSeriesPreview вызовов ДВА (imaging.ts:6184 и
 * :6442). Найдено искусственной поломкой: если снять options только с одного
 * вызова, второй держит требование зелёным в одиночку, и маршрут без проброса
 * сигнала уезжает молча — «Остановить» на нём перестаёт останавливать обход папки.
 * Отрицательные образцы ловят ровно это: вызов с input первым аргументом и
 * чем угодно кроме options вторым.
 *
 * Проверка «нет пробела перед options» стоит ВНУТРИ опережающей проверки, сразу
 * за запятой. Если написать \s*(?!options), движок откатит \s* на ноль символов и
 * увидит впереди " options" — строку, которая с "options" не начинается; образец
 * тогда срабатывает на исправном коде. Так и вышло с первой попытки.
 */
for (const pattern of [
	/buildDicomFolderSeriesPreview\(\s*input,(?!\s*options)[^)]{0,60}/,
	/buildDicomFolderWorkupPlan\(\s*input,(?!\s*options)[^)]{0,60}/,
]) {
	assertNoMatch(
		imagingSource,
		pattern,
		"API DICOM scan callsite must thread scan options at every callsite",
	);
}

[
	'const canUseWorker = renderPlan.useWebWorker && renderPlan.textureStrategy !== "external_viewer"',
	"!canUseWorker\n      ? 0",
	"Фоновая подготовка КТ-срезов недоступна",
	'target: canUseWorker ? "web_worker" : "main_thread"',
].forEach((marker) =>
	assertIncludes(
		imagingSource,
		marker,
		"API DICOM render-cache worker honesty",
	),
);

[
	"function buildDicomRenderHardwarePolicy(",
	"memoryBudgetClass",
	"hardwareQualityWeight",
	"progressiveSliceWindowCap",
	"diagnosticPixelPolicy",
	'runtimeProfile.executionLane === "desktop_app_mpr"',
	"browser_preview_not_diagnostic",
	"const residentSliceCap = Math.max(1, Math.min(fileCount, renderPlan.progressiveSliceWindowCap))",
	"Math.min(renderPlan.targetSliceBatch, renderPlan.progressiveSliceWindowCap)",
	'id: "ct_memory_policy"',
].forEach((marker) =>
	assertIncludes(
		imagingSource,
		marker,
		"API DICOM CT runtime budget and pixel policy honesty",
	),
);

[
	"/api/imaging/dicom/local-folder-discovery",
	"/api/imaging/local-organizer/scan-preview",
	"/api/imaging/dicom/folder-series-preview",
	"/api/imaging/dicom/first-frame-preview",
	"/api/imaging/dicom/folder-workup-plan",
	"/api/imaging/folders/scan-preview",
].forEach((route) =>
	assertIncludes(imagingSource, route, "API DICOM scan route coverage"),
);

const wrappedRouteCount = (
	imagingSource.match(/runAbortableImagingScan\(request, reply/g) ?? []
).length;
if (wrappedRouteCount < 6) {
	throw new Error(
		`expected at least 6 abortable imaging scan routes, got ${wrappedRouteCount}`,
	);
}

const yieldCount = (
	imagingSource.match(
		/maybeYieldApiDicomScan\(yieldState, options\.signal\)/g,
	) ?? []
).length;
if (yieldCount < 8) {
	throw new Error(
		`expected DICOM scan helpers to yield in folder and file loops, got ${yieldCount}`,
	);
}

const detailedZipParser = imagingSource.slice(
	imagingSource.indexOf("function readZipCentralDirectoryDetailed"),
	imagingSource.indexOf("function zipEntryPrefix"),
);
if (detailedZipParser.includes("readFileSync(filePath)")) {
	throw new Error(
		"readZipCentralDirectoryDetailed must not buffer the whole ZIP archive",
	);
}

const namesOnlyZipParser = imagingSource.slice(
	imagingSource.indexOf("function readZipCentralDirectory(filePath"),
	imagingSource.indexOf("function expandDicomArchiveManifestLines"),
);
if (namesOnlyZipParser.includes("readFileSync(filePath)")) {
	throw new Error(
		"readZipCentralDirectory must reuse bounded ZIP metadata reads",
	);
}

assertNotIncludes(
	imagingSource,
	"zipPreviewByteLimit",
	"API DICOM ZIP parser must not use a total archive-size gate",
);
assertNotIncludes(
	imagingSource,
	"stats.size > zipPreviewByteLimit",
	"API DICOM ZIP parser must not reject large regular ZIP archives before range reads",
);
assertNotIncludes(
	imagingSource,
	"inflateRawSync",
	"API DICOM ZIP metadata scan must not inflate full entries synchronously",
);
assertNotIncludes(
	imagingSource,
	"readExactFileRange(descriptor, dataStart, entry.compressedSize)",
	"API DICOM ZIP metadata scan must not read full compressed entries",
);
assertNotIncludes(
	imagingSource,
	"parseDicomFirstFramePixel(readFileSync(filePath)",
	"DICOM first-frame preview must not read full files synchronously",
);
assertNotIncludes(
	imagingSource,
	"readFileSync(filePath)",
	"API imaging route must not use full synchronous file reads for DICOM previews",
);

const boundedImagingCollector = imagingSource.slice(
	imagingSource.indexOf("async function collectImagingFiles"),
	imagingSource.indexOf("function quoteManifestCell"),
);
if (
	boundedImagingCollector.includes("queue.shift()") ||
	boundedImagingCollector.includes("await readdir(current")
) {
	throw new Error(
		"collectImagingFiles must use bounded opendir traversal without queue.shift or directory materialization",
	);
}

const boundedDicomCollector = imagingSource.slice(
	imagingSource.indexOf("async function collectDicomHeaderFiles"),
	imagingSource.indexOf("async function buildDicomHeaderManifest"),
);
if (
	boundedDicomCollector.includes("queue.shift()") ||
	boundedDicomCollector.includes("await readdir(current")
) {
	throw new Error(
		"collectDicomHeaderFiles must use bounded opendir traversal without queue.shift or directory materialization",
	);
}

const smokeCommand =
	packageJson.scripts?.["smoke:api-dicom-scan-abort-yield-source"];
if (
	smokeCommand !== "node scripts/smoke-api-dicom-scan-abort-yield-source.mjs"
) {
	throw new Error(
		"package.json missing smoke:api-dicom-scan-abort-yield-source",
	);
}

console.log("api dicom scan abort/yield source smoke passed");
