import { readFile } from "node:fs/promises";

const appSource = [
  await readFile("apps/web/src/App.tsx", "utf8"),
  await readFile("apps/web/src/useAppLogic.tsx", "utf8")
].join("\n");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireIn(source, marker, message) {
  if (!source.includes(marker)) fail(message);
}

function forbidIn(source, marker, message) {
  if (source.includes(marker)) fail(message);
}

requireIn(
  appSource,
  "serverVoiceRecordingShouldContinueRef",
  "Visit voice recorder must track whether a stop was requested by the doctor."
);
requireIn(
  appSource,
  "serverVoiceRecordingStopRequestedRef",
  "Visit voice recorder must distinguish manual stop from browser recorder interruption."
);
requireIn(
  appSource,
  "serverVoiceRecordingRestartTimerRef",
  "Visit voice recorder must debounce unexpected MediaRecorder restarts."
);
requireIn(
  appSource,
  "const [isServerVoiceRecordingStarting, setIsServerVoiceRecordingStarting] = useState(false);",
  "Visit voice recorder must expose a startup state while waiting for microphone permission."
);
requireIn(
  appSource,
  "const serverVoiceRecordingStartingRef = useRef(false);",
  "Visit voice recorder must use an immediate ref guard against double-click startup."
);
requireIn(
  appSource,
  "function configureServerVoiceRecorder(",
  "Visit voice recorder start and restart paths must share one recorder configuration."
);
requireIn(
  appSource,
  "function restartServerVoiceRecorderAfterUnexpectedStop(",
  "Visit voice recorder must have an explicit unexpected-stop restart path."
);
requireIn(
  appSource,
  "serverVoiceRecordingShouldContinueRef.current && !serverVoiceRecordingStopRequestedRef.current && Boolean(recordingId)",
  "Unexpected MediaRecorder stop must restart only while the same dictation should continue."
);
requireIn(
  appSource,
  "Браузер прервал запись на секунду. CRM снова включает микрофон и продолжает эту же диктовку.",
  "Unexpected recorder interruption must be explained in human wording."
);
requireIn(
  appSource,
  "Запись продолжена. Говорите дальше, текст добавится в тот же черновик.",
  "Successful recorder restart must be visible to the doctor."
);
requireIn(
  appSource,
  "clearServerVoiceRecordingRestartTimer();",
  "Manual stop must cancel pending unexpected-stop restart timer."
);
requireIn(
  appSource,
  "const gatewayStatusPromise = loadSpeechGatewayStatus({ silent: true });",
  "Visit voice recording must start gateway checks in the background instead of blocking microphone startup."
);
requireIn(
  appSource,
  "const currentGatewayStatus = speechGatewayStatus;",
  "Visit voice recording must use the current cached gateway status for immediate microphone startup."
);
requireIn(
  appSource,
  "if (serverVoiceRecordingStartingRef.current || isServerVoiceRecordingStarting) {",
  "Visit voice recorder must ignore repeated start clicks while microphone startup is already in progress."
);
requireIn(
  appSource,
  "setSpeechStatusNote(\"Запись уже включается. Разрешите микрофон и подождите несколько секунд.\");",
  "Repeated voice-record start clicks must be explained in human wording."
);
requireIn(
  appSource,
  "serverVoiceRecordingStartingRef.current = true;\n      setIsServerVoiceRecordingStarting(true);",
  "Visit voice recorder must mark startup before async microphone access begins."
);
requireIn(
  appSource,
  "serverVoiceRecordingStartingRef.current = false;\n      setIsServerVoiceRecordingStarting(false);",
  "Visit voice recorder must clear startup state after successful microphone startup."
);
requireIn(
  appSource,
  "stream?.getTracks().forEach((track) => track.stop());\n      serverVoiceRecordingStartingRef.current = false;",
  "Visit voice recorder must stop partially opened microphone streams and clear startup state on failure."
);
requireIn(
  appSource,
  "void gatewayStatusPromise.then((freshGatewayStatus) => {",
  "Visit voice recording must apply a freshly loaded gateway status after recording has started."
);
requireIn(
  appSource,
  "if (speechChunkIndexRef.current === 0) {",
  "Visit voice recording must only show background gateway status before the first speech chunk is handled."
);
requireIn(
  appSource,
  "Текст появится по мере распознавания.",
  "Visit voice recording must tell the doctor when provider recognition is ready after background startup checks."
);
requireIn(
  appSource,
  "Запись идет. Распознавание пока не готово, звук сохранится и отправится позже.",
  "Visit voice recording must explain background gateway unavailability without stopping the recording."
);
requireIn(
  appSource,
  "const effectiveGatewayStatus = speechActiveGatewayStatusRef.current ?? currentGatewayStatus;",
  "Visit voice recorder chunks must use the freshest gateway status available at upload time."
);
requireIn(
  appSource,
  "trackSpeechUpload(uploadSpeechBlob(event.data, effectiveGatewayStatus));",
  "Visit voice recorder chunks must pass the effective gateway status into speech upload."
);
requireIn(
  appSource,
  "Голос почти не слышен, но CRM все равно отправляет фрагмент на распознавание.",
  "Quiet local voice-meter readings must warn the doctor without dropping the active audio chunk."
);
requireIn(
  appSource,
  "Голос почти не слышен, но CRM все равно проверяет последний фрагмент.",
  "Quiet final chunks must still be sent for recognition instead of being discarded locally."
);
requireIn(
  appSource,
  "Запись остановлена. Проверяю даже тихую запись.",
  "Quiet stopped recordings must go through normal final recognition before suggesting a retry."
);
forbidIn(
  appSource,
  "Фрагмент не отправлен на распознавание: микрофон не слышал голос",
  "Local microphone-level checks must not discard speech audio before provider recognition."
);
forbidIn(
  appSource,
  "Запись остановлена, но микрофон почти не слышал голос.",
  "Quiet stopped recordings must not be marked as failed before final recognition finishes."
);

const configureStartIndex = appSource.indexOf("function configureServerVoiceRecorder(");
const restartIndex = appSource.indexOf("function restartServerVoiceRecorderAfterUnexpectedStop(");
const startIndex = appSource.indexOf("async function startServerVoiceRecording()");
const stopIndex = appSource.indexOf("function stopServerVoiceRecording()");
if (configureStartIndex === -1 || restartIndex === -1 || startIndex === -1 || stopIndex === -1) {
  fail("Visit voice recorder source shape changed; update this smoke test.");
}

const recorderStopBlock = appSource.slice(appSource.indexOf("recorder.onstop = () =>", configureStartIndex), restartIndex);
if (recorderStopBlock.indexOf("if (shouldRestart)") > recorderStopBlock.indexOf("void finalizeSpeechRecording")) {
  fail("Unexpected recorder stop must check restart before finalizing speech recording.");
}
forbidIn(
  recorderStopBlock,
  "progressNote: !(voiceLevelAvailable && !voiceDetected)",
  "Quiet stopped recordings must not suppress the final ready/retry status."
);

const startBlock = appSource.slice(startIndex, stopIndex);
requireIn(
  startBlock,
  "let stream: MediaStream | null = null;",
  "Initial voice recorder start path must retain the stream so failures can release the microphone."
);
forbidIn(
  startBlock,
  "await loadSpeechGatewayStatus({ silent: true })",
  "Initial voice recorder start path must not wait for gateway status before opening the microphone."
);
forbidIn(
  startBlock,
  "recorder.ondataavailable =",
  "Initial voice recorder start path must use configureServerVoiceRecorder instead of duplicating handlers."
);
forbidIn(
  startBlock,
  "recorder.onstop =",
  "Initial voice recorder start path must use configureServerVoiceRecorder instead of duplicating stop behavior."
);
requireIn(
  startBlock,
  "configureServerVoiceRecorder(stream, recorder, currentGatewayStatus);",
  "Initial voice recorder start path must use the shared recorder configuration."
);

const manualStopBlock = appSource.slice(stopIndex, appSource.indexOf("function startImportDictation()", stopIndex));
requireIn(
  manualStopBlock,
  "serverVoiceRecordingShouldContinueRef.current = false;",
  "Manual stop must prevent automatic recorder restart."
);
requireIn(
  manualStopBlock,
  "serverVoiceRecordingStopRequestedRef.current = true;",
  "Manual stop must be marked before stopping MediaRecorder."
);

const uploadStart = appSource.indexOf("async function uploadSpeechBlob(");
const uploadEnd = appSource.indexOf("function stopSpeechMonitor()", uploadStart);
if (uploadStart === -1 || uploadEnd === -1) fail("Speech upload block was not found.");
const uploadBlock = appSource.slice(uploadStart, uploadEnd);
const quietBlockStart = uploadBlock.indexOf("if (chunkHadVoice === false) {");
const maxChunkIndex = uploadBlock.indexOf("const maxChunkBytes");
if (quietBlockStart === -1 || maxChunkIndex === -1 || quietBlockStart > maxChunkIndex) {
  fail("Speech quiet-chunk handling block was not found.");
}
const quietChunkBlock = uploadBlock.slice(quietBlockStart, maxChunkIndex);
forbidIn(
  quietChunkBlock,
  "return;",
  "Quiet local voice-meter readings must not return before the audio is queued and sent."
);

console.log(JSON.stringify({ ok: true, guard: "speech-recorder-unexpected-stop-resilience" }));
