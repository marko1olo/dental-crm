import { readFile } from "node:fs/promises";

const source = await readFile("apps/web/src/App.tsx", "utf8");
const speechPlan = await readFile("docs/05-speech-transcription-plan.md", "utf8");

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

const applyBlock = sourceSlice("function speechTranscriptionMatchesActiveVisit", "async function assembleSpeechRecording");
const flushBlock = sourceSlice("async function flushPendingSpeechChunks", "function applyUiPreferences");
const queueStorageBlock = sourceSlice("function normalizePendingSpeechChunk", "function speechChunkIndexedDbAvailable");

for (const marker of [
  "function speechTranscriptionMatchesActiveVisit(result: SpeechTranscriptionResponse): boolean",
  'if (result.chunk.source !== "visit" || !result.chunk.visitId || !dashboard?.activeVisit.id) return true;',
  "return result.chunk.visitId === dashboard.activeVisit.id;",
  "if (!speechTranscriptionMatchesActiveVisit(result))",
  "STT-фрагмент синхронизирован, но относится к другому приему",
  "appendVisitDictationText(text)"
]) {
  if (!applyBlock.includes(marker)) fail(`Speech apply guard missing marker: ${marker}`);
}

if (applyBlock.indexOf("if (!speechTranscriptionMatchesActiveVisit(result))") > applyBlock.indexOf("appendVisitDictationText(text)")) {
  fail("Speech foreign-visit guard must run before appending transcript to the current visit.");
}

if (!flushBlock.includes("if (speechTranscriptionMatchesActiveVisit(result)) flushedRecordingIds.add(item.recordingId);")) {
  fail("Pending speech queue must assemble only recordings that match the active visit.");
}

for (const marker of [
  "speechAudioQueueRetentionMs",
  "localQueueOrganizationMatches(organizationId, activeOrganizationId)",
  "localSavedAtFresh(value.queuedAt, speechAudioQueueRetentionMs)",
  "pendingSpeechChunkQueueLocalKey",
  "savePendingSpeechChunksToLocalStorage(queue, normalizedOrganizationId)"
]) {
  if (!queueStorageBlock.includes(marker) && !source.includes(marker)) fail(`Speech queue scoped retention marker missing: ${marker}`);
}

for (const marker of [
  "const queue = await loadPendingSpeechChunks(activeOrganizationId);",
  "await removePendingSpeechChunkById(item.id, activeOrganizationId);",
  "queuePendingSpeechChunk(chunk, activeOrganizationId)"
]) {
  if (!source.includes(marker)) fail(`Speech queue active-organization wiring missing: ${marker}`);
}

if (flushBlock.includes("\n        flushedRecordingIds.add(item.recordingId);")) {
  fail("Pending speech queue still has an unconditional active-visit assembly path.");
}

if (!speechPlan.includes("compare the returned `chunk.visitId` with the currently open visit")) {
  fail("Speech transcription plan must document active-visit ownership for offline queue flush.");
}

console.log(JSON.stringify({ ok: true, guard: "speech-queue-active-visit" }));
