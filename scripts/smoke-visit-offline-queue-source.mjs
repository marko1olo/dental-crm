import { readFile } from "node:fs/promises";

const source = [
  await readFile("apps/web/src/App.tsx", "utf8"),
  await readFile("apps/web/src/useAppLogic.tsx", "utf8"),
  await readFile("apps/web/src/AppHelpers.tsx", "utf8")
].join("\n");
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

const visitQueueStorageBlock = sourceSlice("function parsePendingVisitSaveQueue", "function isPendingSpeechChunk");
const indexedDbBlock = sourceSlice("function pendingVisitSaveIndexedDbAvailable", "async function readPendingSpeechChunksFromIndexedDb");
const queueBlock = sourceSlice("async function queuePendingVisitSave", "function latestPendingVisitSaveAt");
const appStateBlock = sourceSlice("const [localDraftWasRestored", "const [lastVisitSaveReceipt");
const refreshBlock = sourceSlice("async function refreshPendingVisitSaveState", "async function refreshPendingSpeechChunkState");
const flushBlock = sourceSlice("async function flushPendingVisitSaves", "async function submitSpeechChunk");
const acceptBlock = sourceSlice("async function acceptDraftToVisit", "async function previewImport");

for (const marker of [
  'const speechChunkDbVersion = 4;',
  "const requiredSpeechChunkDbStoreNames = [",
  "function assertSpeechChunkDbStores(db: IDBDatabase): void",
  "assertSpeechChunkDbStores(db);",
  "db.onversionchange = () => db.close();",
  'const pendingVisitSaveStoreName = "pendingVisitSaves";',
  'db.createObjectStore(pendingVisitSaveStoreName, { keyPath: "id" })',
  'store.createIndex("queuedAt", "queuedAt")',
  'store.createIndex("organizationId", "organizationId")',
  'store.createIndex("visitId", "visitId")',
  "async function readPendingVisitSavesFromIndexedDb",
  "async function savePendingVisitSavesToIndexedDb",
  "async function deletePendingVisitSaveFromIndexedDb",
  "async function migratePendingVisitSavesFromLocalStorage",
  "async function loadPendingVisitSaves",
  "async function savePendingVisitSaves"
]) {
  if (!source.includes(marker)) fail(`Visit offline queue IndexedDB marker missing: ${marker}`);
}

for (const marker of [
  "class WorkflowResponseError extends Error",
  "function acceptedVisitSaveFailureIsRetryable(error: unknown): boolean",
  "error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500",
  'throw new WorkflowResponseError(await responseErrorMessage(response, "Прием не принят"), response.status);'
]) {
  if (!source.includes(marker)) fail(`Visit accept queue retryability marker missing: ${marker}`);
}

if (source.includes("const speechChunkDbVersion = 3;")) {
  fail("Visit offline queue IndexedDB migration must not stay on v3 after CT workbench stores were added.");
}

for (const marker of [
  "normalizePendingVisitSave(item, activeOrganizationId, legacyOrganizationFallback)",
  "sortPendingVisitSaves(Array.from(byId.values()))",
  "savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId)",
  "loadPendingVisitSavesFromLocalStorage(normalizedOrganizationId)",
  "window.localStorage.removeItem(pendingVisitSaveQueueLocalKey(normalizedOrganizationId))"
]) {
  if (!visitQueueStorageBlock.includes(marker) && !source.includes(marker)) fail(`Visit offline queue migration marker missing: ${marker}`);
}

for (const marker of [
  "const existing = await loadPendingVisitSaves(normalizedOrganizationId);",
  "await savePendingVisitSaves([...withoutSameVisit, queued], normalizedOrganizationId);"
]) {
  if (!queueBlock.includes(marker)) fail(`Visit queue must be async and preserve replacement-by-visit: ${marker}`);
}

for (const marker of [
  "const [pendingVisitSaveCount, setPendingVisitSaveCount] = useState(0);",
  "const [lastPendingVisitSaveAt, setLastPendingVisitSaveAt] = useState<string | null>(null);"
]) {
  if (!appStateBlock.includes(marker)) fail(`Visit offline queue must not synchronously read storage during boot: ${marker}`);
}

for (const marker of [
  "const pending = await loadPendingVisitSaves(activeOrganizationId);",
  "setLastPendingVisitSaveAt(latestPendingVisitSaveAt(pending));"
]) {
  if (!refreshBlock.includes(marker)) fail(`Visit offline queue refresh marker missing: ${marker}`);
}

for (const marker of [
  "const pending = await loadPendingVisitSaves(activeOrganizationId);",
  "await savePendingVisitSaves(remaining, activeOrganizationId);",
  "await refreshPendingVisitSaveState();"
]) {
  if (!flushBlock.includes(marker)) fail(`Visit offline queue flush marker missing: ${marker}`);
}

for (const marker of [
  "if (!acceptedVisitSaveFailureIsRetryable(acceptError))",
  "const queued = await queuePendingVisitSave({",
  "await refreshPendingVisitSaveState();"
]) {
  if (!acceptBlock.includes(marker)) fail(`Visit accept fallback must await durable local queue: ${marker}`);
}

for (const marker of [
  "const malformedActiveRecord = localQueueOrganizationMatches(itemOrganizationId, normalizedOrganizationId);",
  "if (stale || malformedActiveRecord) {"
]) {
  if (!indexedDbBlock.includes(marker)) fail(`Visit IndexedDB queue cleanup marker missing: ${marker}`);
}

if (appStateBlock.includes("loadPendingVisitSaves(activeOrganizationId)")) {
  fail("Visit offline queue still reads storage synchronously in React state initializer.");
}

if (!packageJson.includes('"smoke:visit-offline-queue-source": "node scripts/smoke-visit-offline-queue-source.mjs"')) {
  fail("package.json must expose smoke:visit-offline-queue-source.");
}

console.log(JSON.stringify({ ok: true, guard: "visit-offline-queue-indexeddb" }));
