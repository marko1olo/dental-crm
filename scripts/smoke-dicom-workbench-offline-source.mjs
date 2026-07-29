import { readFile } from "node:fs/promises";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

/*
 * ТРЕБОВАНИЯ ЗДЕСЬ ОПИСЫВАЮТ КОД, А НЕ ЕГО РАСКЛАДКУ ПО СТРОКАМ.
 *
 * Все 14 непройденных требований этого стража краснели на форматировании, а не на
 * поведении. Замерено по apps/web/src/useAppLogic.tsx и browserContinuity.ts:
 *   4292-4294  const restore = async () => { const recovered =
 *              await loadLocalDicomWorkbenchDraft(activeOrganizationId);
 *              — Biome перенёс присваивание, а образец требовал одну строку
 *                И РОВНО ШЕСТЬ ПРОБЕЛОВ отступа, хотя в файле табы;
 *   6484-6485  useEffect(() => { if (!activeImagingStudies.length) { — то же;
 *   10066      const savedLocally = await saveLocalDicomWorkbenchDraft(
 *                manifest, clientSavedAt, activeOrganizationId,
 *              ) — разложен по строкам и с висячей запятой;
 *   133-135    const directoryPickerSupported =
 *                typeof fileAccessWindow?.showDirectoryPicker === "function";
 *   7219-7220  browserContinuity?.browserCtOfflineStorageBoundary.mode ===
 *                "metadata_only".
 * Два из этих образцов служили ГРАНИЦАМИ sourceSlice, поэтому один перенос строки
 * гасил ещё пять требований внутри блока: страж терял не одно поведение, а шесть.
 *
 * Поэтому сравнение идёт по нормализованному тексту: переносы и отступы сводятся к
 * одному пробелу, пробелы вокруг разделителей убираются, висячая запятая Biome
 * перед закрывающей скобкой отбрасывается. ПОСЛЕДОВАТЕЛЬНОСТЬ ТОКЕНОВ СОХРАНЯЕТСЯ
 * ЦЕЛИКОМ: пропажа await, аргумента, поля или вызова по-прежнему красит стража.
 * Проверено искусственной поломкой копии — см. отчёт пакета OO5.
 *
 * Образцы в файле оставлены дословно, в исходном виде, чтобы требование читалось
 * и находилось поиском.
 */
function normalizeFormatting(text) {
	return text
		.replace(/\s+/g, " ")
		.replace(/\s*([(),;{}[\]])\s*/g, "$1")
		.replace(/,([)\]}])/g, "$1");
}

function includesMarker(normalizedText, marker) {
	return normalizedText.includes(normalizeFormatting(marker));
}

const source = normalizeFormatting(
	[
		await readFile("apps/web/src/App.tsx", "utf8"),
		await readAppLogicSource(),
		await readFile("apps/web/src/AppHelpers.tsx", "utf8"),
	].join("\n"),
);
const browserContinuitySource = normalizeFormatting(
	await readFile("apps/web/src/browserContinuity.ts", "utf8"),
);
const ctPlanningExportSource = normalizeFormatting(
	await readFile("apps/web/src/ctPlanningExport.ts", "utf8"),
);
const ctPlanningImplantModelSource = normalizeFormatting(
	await readFile("apps/web/src/ctPlanningImplantModel.ts", "utf8"),
);
const ctPlanningViewerBridgeHandoffSource = normalizeFormatting(
	await readFile("apps/web/src/ctPlanningViewerBridgeHandoff.ts", "utf8"),
);
const packageJson = await readFile("package.json", "utf8");

function fail(message) {
	throw new Error(message);
}

function sourceSlice(startMarker, endMarker) {
	const start = source.indexOf(normalizeFormatting(startMarker));
	if (start === -1) fail(`Missing marker: ${startMarker}`);
	const end = source.indexOf(normalizeFormatting(endMarker), start);
	if (end === -1) fail(`Missing marker: ${endMarker}`);
	return source.slice(start, end);
}

const storageKeyBlock = sourceSlice(
	"function dicomWorkbenchSeriesKey",
	"function isMprProjection",
);
const dicomDraftTypeBlock = sourceSlice(
	"type DicomWorkbenchLocalDraft",
	"type LocalImagingFolderDraft",
);
const indexedDbBlock = sourceSlice(
	"async function readLocalDicomWorkbenchDraftFromIndexedDb",
	"async function readPendingVisitSavesFromIndexedDb",
);
const restoreEffectBlock = sourceSlice(
	"const restore = async () => {\n      const recovered = await loadLocalDicomWorkbenchDraft",
	"localImagingRecoveryHydratedOrganizationIdRef",
);
const mprRestoreBlock = sourceSlice(
	"async function restoreMprWorkbenchLocalDraft",
	"useEffect(() => {\n    if (!activeImagingStudies.length)",
);
const mprAutoRestoreBlock = sourceSlice(
	"if (!cbctWorkbenchSeriesKey || !mprControlsReady)",
	"function applyImagingViewerSessionState",
);

function forbidPattern(sourceText, pattern, message) {
	if (pattern.test(sourceText)) fail(message);
}

function requirePattern(sourceText, pattern, message) {
	if (!pattern.test(sourceText)) fail(message);
}

/*
 * ЗАКРЫТИЕ БАЗЫ ПО versionchange — ПРЕДМЕТ; ОДНОСТРОЧНОСТЬ ОБРАБОТЧИКА — НЕТ.
 *
 * Образец был дословной строкой "db.onversionchange = () => db.close();" и
 * покраснел ровно потому, что обработчик СТАЛ ЛУЧШЕ: apps/web/src/AppHelpers.tsx
 * 5322-5325 теперь сбрасывает и кэш обещания, и только потом закрывает базу —
 *   db.onversionchange = () => { speechChunkDbPromise = null; db.close(); };
 * без сброса кэша соседняя вкладка получила бы закрытую базу из кэша.
 *
 * Образец закрепляет СВЯЗЬ «обработчик versionchange закрывает базу», допускает
 * и одну строку, и блок, но [^}]* не даёт выйти за тело обработчика: если
 * db.close() из него исчезнет, страж краснеет.
 */
requirePattern(
	source,
	/db\.onversionchange\s*=\s*\(\)\s*=>\s*\{?[^}]*db\.close\(\)/,
	"DICOM workbench IndexedDB versionchange handler must close the database: db.onversionchange = () => db.close();",
);

for (const marker of [
	"type DicomWorkbenchIndexedDbDraft",
	"type MprWorkbenchIndexedDbDraft",
	"const speechChunkDbVersion = 4;",
	"const requiredSpeechChunkDbStoreNames = [",
	"function assertSpeechChunkDbStores(db: IDBDatabase): void",
	"assertSpeechChunkDbStores(db);",
	"speechChunkDbPromise = null;",
	'const dicomWorkbenchDraftStoreName = "dicomWorkbenchDrafts";',
	'const mprWorkbenchDraftStoreName = "mprWorkbenchDrafts";',
	'db.createObjectStore(dicomWorkbenchDraftStoreName, { keyPath: "storageKey" })',
	'db.createObjectStore(mprWorkbenchDraftStoreName, { keyPath: "storageKey" })',
	'store.createIndex("organizationId", "organizationId")',
	'store.createIndex("seriesKey", "seriesKey")',
	'store.createIndex("clientSavedAt", "clientSavedAt")',
]) {
	if (!includesMarker(source, marker))
		fail(`DICOM workbench IndexedDB marker missing: ${marker}`);
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
	'const directoryPickerSupported = typeof fileAccessWindow?.showDirectoryPicker === "function";',
	'const filePickerSupported = typeof fileAccessWindow?.showOpenFilePicker === "function";',
	'const opfsSupported = typeof storageManager?.getDirectory === "function";',
]) {
	if (!includesMarker(browserContinuitySource, marker))
		fail(`Browser CT offline storage boundary marker missing: ${marker}`);
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
	'return "local_offline_available";',
]) {
	if (!includesMarker(ctPlanningExportSource, marker))
		fail(`CT planning runtime truth marker missing: ${marker}`);
}

for (const marker of [
	"containsMeshGeometry: false",
	"containsDiagnosticPixels: false",
	"browserStoresHeavyGeometry: false",
	'heavyDataOwner: "external_viewer_or_local_3d_module"',
	"Поверхности черепа/кости",
]) {
	if (!includesMarker(ctPlanningImplantModelSource, marker))
		fail(`CT local 3D no-heavy-geometry marker missing: ${marker}`);
}

for (const marker of [
	"runtimeTruthPolicy: CtPlanningViewerBridgeRuntimeTruthPolicy",
	"defaultRuntimeTruthPolicy",
	"browserStoresHeavyGeometry: false",
	'heavyDataOwner: "external_viewer_or_local_3d_module"',
]) {
	if (!includesMarker(ctPlanningViewerBridgeHandoffSource, marker))
		fail(`CT viewer bridge runtime truth marker missing: ${marker}`);
}

for (const marker of [
	"browserContinuity?.directoryPickerSupported",
	"browserContinuity?.filePickerSupported",
	"browserContinuity?.opfsSupported",
	'browserContinuity?.browserCtOfflineStorageBoundary.mode === "metadata_only"',
	"Выбор локальной КТ",
	"Граница КТ-хранилища",
]) {
	if (!includesMarker(source, marker))
		fail(`Browser CT offline audit UI marker missing: ${marker}`);
}

forbidPattern(
	dicomDraftTypeBlock,
	/\b(Blob|ArrayBuffer|Uint8Array|FileSystemFileHandle|FileSystemDirectoryHandle|File)\b|pixelData|rawPixel|meshGeometry|meshBytes/i,
	"DICOM workbench offline draft types must not embed files, diagnostic image payloads, or mesh geometry.",
);

if (includesMarker(source, "const speechChunkDbVersion = 3;")) {
	fail(
		"DICOM workbench IndexedDB migration must not stay on v3 after CT stores were added.",
	);
}

for (const marker of [
	"dicomWorkbenchIndexedDbKey(organizationId",
	"mprWorkbenchIndexedDbKey(seriesKey",
	"normalizeLocalDicomWorkbenchDraft",
	"loadLocalDicomWorkbenchDraftFromLocalStorage",
	"loadLocalMprWorkbenchDraftFromLocalStorage",
	"saveLocalMprWorkbenchDraftToLocalStorage",
]) {
	if (
		!includesMarker(storageKeyBlock, marker) &&
		!includesMarker(source, marker)
	)
		fail(`DICOM workbench fallback/migration marker missing: ${marker}`);
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
	"window.localStorage.removeItem(mprWorkbenchLocalKey(seriesKey, organizationId))",
]) {
	if (
		!includesMarker(indexedDbBlock, marker) &&
		!includesMarker(source, marker)
	)
		fail(`DICOM workbench IndexedDB helper missing: ${marker}`);
}

for (const marker of [
	"const recovered = await loadLocalDicomWorkbenchDraft(activeOrganizationId);",
	"void loadDicomWorkbenchBundles({ silent: true, restoreLatest: !recovered });",
	"if (cancelled) return;",
]) {
	if (!includesMarker(restoreEffectBlock, marker))
		fail(`DICOM workbench restore effect must be async/cancellable: ${marker}`);
}

for (const marker of [
	"async function restoreMprWorkbenchLocalDraft()",
	"const draft = await loadLocalMprWorkbenchDraft(cbctWorkbenchSeriesKey, activeOrganizationId);",
]) {
	if (!includesMarker(mprRestoreBlock, marker))
		fail(`MPR manual restore must await IndexedDB: ${marker}`);
}

for (const marker of [
	"const draft = await loadLocalMprWorkbenchDraft(cbctWorkbenchSeriesKey, activeOrganizationId);",
	"void saveLocalMprWorkbenchDraft(",
	").then((saved) => {",
	"if (saved) setMprWorkbenchLocalSavedAt(clientSavedAt);",
]) {
	if (!includesMarker(mprAutoRestoreBlock, marker))
		fail(`MPR auto restore/save must use async IndexedDB path: ${marker}`);
}

for (const marker of [
	"const savedLocally = await saveLocalDicomWorkbenchDraft(manifest, clientSavedAt, activeOrganizationId);",
	"const savedLocally = await saveLocalDicomWorkbenchDraft(result, clientSavedAt, activeOrganizationId);",
	"setDicomWorkbenchLocalSavedAt(savedLocally ? clientSavedAt : null);",
	"void removeLocalDicomWorkbenchDraft(activeOrganizationId);",
]) {
	if (!includesMarker(source, marker))
		fail(
			`DICOM workbench UI must await durable local recovery path: ${marker}`,
		);
}

if (
	!packageJson.includes(
		'"smoke:dicom-workbench-offline-source": "node scripts/smoke-dicom-workbench-offline-source.mjs"',
	)
) {
	fail("package.json must expose smoke:dicom-workbench-offline-source.");
}

console.log(
	JSON.stringify({ ok: true, guard: "dicom-workbench-offline-indexeddb" }),
);
