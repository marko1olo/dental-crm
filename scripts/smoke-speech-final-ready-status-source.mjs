import { readFile } from "node:fs/promises";

const appSource = (await readFile("apps/web/src/App.tsx", "utf8")).replace(/\r\n/g, "\n");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireIn(source, marker, message) {
  if (!source.includes(marker)) fail(message);
}

requireIn(
  appSource,
  "const speechRecordingHadRecognizedTextRef = useRef(false);",
  "Visit speech recording must remember whether the current recording already produced recognized text."
);
requireIn(
  appSource,
  "const speechRecordingVoiceLevelAvailableAtStopRef = useRef(false);",
  "Visit speech recording must remember whether microphone level diagnostics were available at stop."
);
requireIn(
  appSource,
  "const speechRecordingVoiceDetectedAtStopRef = useRef(false);",
  "Visit speech recording must remember whether voice was actually audible before final status."
);
requireIn(
  appSource,
  "speechRecordingHadRecognizedTextRef.current = true;\n      setSpeechRetrySuggested(false);\n      appendVisitDictationText(text);",
  "Recognized speech chunks must mark the current recording as having usable text before appending it."
);
requireIn(
  appSource,
  "speechRecordingHadRecognizedTextRef.current = true;\n        visitDraftUserEditedRef.current = true;",
  "Assembled speech transcript must also mark the current recording as having usable text."
);
requireIn(
  appSource,
  "speechRecordingHadRecognizedTextRef.current = false;",
  "Starting a new server voice recording must clear the per-recording recognized-text flag."
);
requireIn(
  appSource,
  "speechRecordingHadRecognizedTextRef.current = false;\n      speechVoiceDetectedDuringRecordingRef.current = false;\n      speechSegmentVoiceDetectedRef.current = false;\n      speechQuietWarningShownRef.current = false;",
  "Starting a new server voice recording must clear audible-voice flags only at the real new-recording boundary."
);
requireIn(
  appSource,
  "speechRecordingVoiceLevelAvailableAtStopRef.current = false;\n      speechRecordingVoiceDetectedAtStopRef.current = false;",
  "Starting a new server voice recording must clear the per-recording microphone diagnostics."
);
requireIn(
  appSource,
  "speechRecordingVoiceLevelAvailableAtStopRef.current = voiceLevelAvailable;\n      speechRecordingVoiceDetectedAtStopRef.current = voiceDetected;",
  "Stopping a server voice recording must preserve microphone diagnostics before the monitor is cleared."
);
requireIn(
  appSource,
  "if (assembly.transcript.trim() || speechRecordingHadRecognizedTextRef.current) {",
  "Final speech status must treat already-appended chunks as successful recognition."
);
requireIn(
  appSource,
  "Текст готов. Проверьте поле диктовки и нажмите «Собрать ЭМК».",
  "Final speech status must give the doctor the next action after successful recognition."
);
requireIn(
  appSource,
  "for (let attempt = 0; attempt < 8; attempt += 1) {",
  "Final speech upload waiting must poll for late MediaRecorder dataavailable uploads."
);
requireIn(
  appSource,
  "await new Promise<void>((resolve) => window.setTimeout(resolve, 150));",
  "Final speech upload waiting must give the last MediaRecorder chunk a short grace period."
);
requireIn(
  appSource,
  "const remainingUploads = Array.from(speechUploadPromisesRef.current);",
  "Final speech upload waiting must drain uploads that appeared after the initial snapshot."
);
requireIn(
  appSource,
  "const queuedChunksAfterFlush = await loadPendingSpeechChunks(activeOrganizationId);",
  "Final speech status must inspect the local audio queue after flush attempts."
);
requireIn(
  appSource,
  "const queuedCurrentRecordingCount = queuedChunksAfterFlush.filter((chunk) => chunk.recordingId === recordingId).length;",
  "Final speech status must identify queued chunks for the current recording."
);
requireIn(
  appSource,
  "Звук сохранен локально: ${queuedCurrentRecordingCount} фрагм. Когда распознавание будет готово, CRM отправит его и добавит текст.",
  "Final speech status must tell the doctor that queued audio is preserved instead of implying failed recognition."
);
requireIn(
  appSource,
  "function finalSpeechNoTextMessage()",
  "Final speech status must use a dedicated readable no-text diagnostic message."
);
requireIn(
  appSource,
  "Запись сделана, но микрофон почти не слышал голос.",
  "Final speech status must identify a quiet microphone when the level monitor saw no audible voice."
);
requireIn(
  appSource,
  "Нажмите «Проверить микрофон», затем запишите еще раз ближе к микрофону.",
  "Final speech status must give the doctor a concrete next action after no transcript appears."
);
requireIn(
  appSource,
  "setSpeechStatusNote(finalSpeechNoTextMessage());",
  "Final speech status must use the readable no-text diagnostic instead of a generic retry message."
);

const finalizeStart = appSource.indexOf("async function finalizeSpeechRecording(");
const flushStart = appSource.indexOf("async function flushPendingSpeechChunks(", finalizeStart);
if (finalizeStart === -1 || flushStart === -1) fail("Speech finalization block was not found.");
const finalizeBlock = appSource.slice(finalizeStart, flushStart);
const genericRetryIndex = finalizeBlock.indexOf("Распознавание завершено, но текст не появился");
if (genericRetryIndex !== -1 && finalizeBlock.indexOf("speechRecordingHadRecognizedTextRef.current") > genericRetryIndex) {
  fail("Final speech status must check recognized text before showing the retry message.");
}
if (genericRetryIndex !== -1 && finalizeBlock.indexOf("queuedCurrentRecordingCount > 0") > genericRetryIndex) {
  fail("Final speech status must check queued audio before showing the retry message.");
}

const waitStart = appSource.indexOf("async function waitForSpeechUploads()");
const waitEnd = appSource.indexOf("async function finalizeSpeechRecording(", waitStart);
if (waitStart === -1 || waitEnd === -1) fail("Speech upload wait block was not found.");
const waitBlock = appSource.slice(waitStart, waitEnd);
if (waitBlock.indexOf("await new Promise<void>((resolve) => window.setTimeout(resolve, 150));") > waitBlock.indexOf("if (!speechUploadPromisesRef.current.size) return;")) {
  fail("Speech upload wait must check for late uploads after the grace period.");
}

const monitorStart = appSource.indexOf("function startSpeechMonitor(");
const configureStart = appSource.indexOf("function configureServerVoiceRecorder(", monitorStart);
if (monitorStart === -1 || configureStart === -1) fail("Speech monitor block was not found.");
const monitorBlock = appSource.slice(monitorStart, configureStart);
if (monitorBlock.includes("speechVoiceDetectedDuringRecordingRef.current = false;")) {
  fail("Speech monitor restarts must not clear the whole-recording audible-voice flag.");
}

console.log(JSON.stringify({ ok: true, guard: "speech-final-ready-status" }));
