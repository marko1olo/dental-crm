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
const recoveryBlock = sourceSlice("async function loadSpeechRecordingRecovery", "async function refreshSpeechRuntime");
const autoFlushBlock = sourceSlice("const speechAutoFlushPendingAudioReady =", "const speechTranscriptionBusyDetail =");

for (const marker of [
  "if (!dashboard?.activeVisit.id || !dashboard.activeVisit.patientId)",
  "setSpeechRecordingRecovery(null);",
  'params.set("visitId", dashboard.activeVisit.id);',
  'params.set("patientId", dashboard.activeVisit.patientId);',
  'fetch(`/api/speech/recordings/recovery?${params.toString()}`'
]) {
  if (!recoveryBlock.includes(marker)) fail(`Speech recovery request must stay active-visit scoped before fetch: ${marker}`);
}

for (const marker of [
  "function speechTranscriptionMatchesActiveVisit(result: SpeechTranscriptionResponse): boolean",
  'if (result.chunk.source !== "visit" || !result.chunk.visitId || !dashboard?.activeVisit.id) return true;',
  "return result.chunk.visitId === dashboard.activeVisit.id;",
  "if (!speechTranscriptionMatchesActiveVisit(result))",
  "Эта часть записи относится к другому приему и не добавлена в текущую карту.",
  "appendVisitDictationText(text)"
]) {
  if (!applyBlock.includes(marker)) fail(`Speech apply guard missing marker: ${marker}`);
}

if (applyBlock.includes("STT-фрагмент синхронизирован")) {
  fail("Speech foreign-visit status must not expose STT jargon.");
}

if (applyBlock.indexOf("if (!speechTranscriptionMatchesActiveVisit(result))") > applyBlock.indexOf("appendVisitDictationText(text)")) {
  fail("Speech foreign-visit guard must run before appending transcript to the current visit.");
}

if (!flushBlock.includes("if (speechTranscriptionMatchesActiveVisit(result)) flushedRecordingIds.add(item.recordingId);")) {
  fail("Pending speech queue must assemble only recordings that match the active visit.");
}

if (!flushBlock.includes("const hasAudioWaitingForServer = queue.some((item) => Boolean(item.audioBase64?.trim()));")) {
  fail("Pending speech queue must keep every queued audio blob local until a server/local recognizer is currently available.");
}

for (const marker of [
  "const speechRecognitionReady = speechUploadReady && isOnline;",
  "const serverVoiceRecordingAvailable =",
  "const visitVoicePrimaryUsesServer = serverVoiceRecordingAvailable || isServerVoiceRecording;",
  "const speechGatewayActiveProviderIsLocal =",
  'speechGatewayStatus?.providerId === "local_whisper" || speechGatewayStatus?.providerId === "vosk_local";',
  "speechActiveGatewayStatusRef.current = currentGatewayStatus;",
  "const effectiveGatewayStatus = speechActiveGatewayStatusRef.current ?? currentGatewayStatus;",
  "uploadSpeechBlob(event.data, effectiveGatewayStatus)",
  '"CRM запишет голос нормально и проверит Groq при старте.',
  '"Записать голос"'
]) {
  if (!source.includes(marker)) fail(`Speech primary recording path missing marker: ${marker}`);
}

for (const marker of [
  "pendingSpeechChunkCount > 0",
  "!speechTranscriptionBusy",
  "!isServerVoiceRecording",
  "!isServerVoiceRecordingStarting",
  "speechAutoFlushInFlightRef.current",
  "speechAutoFlushLastKeyRef.current",
  "speechAutoFlushRetryTimerRef.current",
  "speechGatewayStatus?.serverTranscriptionCurrentlyAvailable ? \"available\" : \"unavailable\"",
  "void flushPendingSpeechChunks({ silent: true })",
  "window.setTimeout(() =>",
  "setSpeechAutoFlushRetryTick((tick) => tick + 1)",
  "speechAutoFlushRetryTick"
]) {
  if (!autoFlushBlock.includes(marker)) fail(`Speech queued-audio auto flush missing marker: ${marker}`);
}

for (const marker of [
  'const pendingSpeechFlushActionLabel = speechRecognitionReady ? "Отправить звук" : "Проверить очередь";',
  "const pendingSpeechFlushActionTitle =",
  "{pendingSpeechFlushActionLabel}"
]) {
  if (!source.includes(marker)) fail(`Speech queued-audio action missing availability-aware marker: ${marker}`);
}

for (const forbidden of [
  '"Запись локально"',
  "когда сервер будет готов"
]) {
  if (source.includes(forbidden)) fail(`Speech queue/status copy still implies fake local recognition or server-only recovery: ${forbidden}`);
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

for (const marker of [
  "function speechChunkFailureDetail",
  "chunk.quality.providerWarnings[0]",
  "chunk.quality.nextAction",
  "const failureDetail = operatorReadableErrorDetailFromUnknown(speechError);",
  "CRM повторит отправку позже."
]) {
  if (!source.includes(marker)) fail(`Speech queued-audio failure feedback missing marker: ${marker}`);
}

if (flushBlock.includes("\n        flushedRecordingIds.add(item.recordingId);")) {
  fail("Pending speech queue still has an unconditional active-visit assembly path.");
}

if (!speechPlan.includes("compare the returned `chunk.visitId` with the currently open visit")) {
  fail("Speech transcription plan must document active-visit ownership for offline queue flush.");
}

console.log(JSON.stringify({ ok: true, guard: "speech-queue-active-visit" }));
