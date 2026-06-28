import { readFile } from "node:fs/promises";

const systemSource = await readFile("apps/api/src/routes/system.ts", "utf8");
const gatewaySource = await readFile("apps/api/src/speech/gateway.ts", "utf8");
const appSource = [
  await readFile("apps/web/src/App.tsx", "utf8"),
  await readFile("apps/web/src/useAppLogic.tsx", "utf8"),
  await readFile("apps/web/src/AppHelpers.tsx", "utf8")
].join("\n");
const speechPlan = await readFile("docs/05-speech-transcription-plan.md", "utf8");

function fail(message) {
  throw new Error(message);
}

for (const marker of [
  "DENTAL_LOCAL_WHISPER_HEALTH_URL",
  "DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL",
  "WHISPER_CPP_HEALTH_URL",
  "WHISPER_CPP_TRANSCRIBE_URL",
  "LOCAL_WHISPER_HEALTH_URL",
  "LOCAL_WHISPER_TRANSCRIBE_URL",
  "DENTAL_VOSK_HEALTH_URL",
  "DENTAL_VOSK_TRANSCRIBE_URL",
  "VOSK_HEALTH_URL",
  "VOSK_TRANSCRIBE_URL",
  "LOCAL_VOSK_HEALTH_URL",
  "LOCAL_VOSK_TRANSCRIBE_URL"
]) {
  if (!systemSource.includes(marker)) fail(`Local bridge readiness does not recognize speech env marker: ${marker}`);
  if (!gatewaySource.includes(marker)) fail(`Speech gateway does not recognize expected env marker: ${marker}`);
}

for (const marker of [
  "deriveHealthFromConfiguredPath?: boolean",
  "deriveHealthFromConfiguredPath: true",
  "function healthUrl(rawUrl: string, defaultHealthPath: string, deriveHealthFromConfiguredPath = false): URL",
  "/\\/(?:health|healthz|status)$/i.test(cleanPath)",
  "/\\/v1\\/audio\\/transcriptions$/i.test(cleanPath)",
  "url.pathname = `${cleanPath}${defaultHealthPath}`",
  "healthUrl(configuredUrl, definition.defaultHealthPath, definition.deriveHealthFromConfiguredPath)"
]) {
  if (!systemSource.includes(marker)) fail(`Local bridge readiness health derivation missing marker: ${marker}`);
}

if (!speechPlan.includes("DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL") || !speechPlan.includes("DENTAL_VOSK_TRANSCRIBE_URL")) {
  fail("Speech plan must document local speech transcribe URL environment variables.");
}

for (const marker of [
  "const speechRecognitionReady = speechUploadReady && isOnline;",
  "const serverVoiceRecordingAvailable =",
  "const visitVoicePrimaryUsesServer = serverVoiceRecordingAvailable || isServerVoiceRecording;",
  "const speechGatewayActiveProviderIsLocal =",
  'speechGatewayStatus?.providerId === "local_whisper" || speechGatewayStatus?.providerId === "vosk_local";',
  '`${speechGatewayStatus?.providerLabel ?? "локальный модуль"}: запись частями`',
  "speechActiveGatewayStatusRef.current = currentGatewayStatus;",
  "Groq будет проверен при старте записи.",
  "звук сохранится в очередь",
  "когда источник будет готов"
]) {
  if (!appSource.includes(marker)) fail(`Visit speech status UI does not map local bridge readiness honestly: ${marker}`);
}

for (const forbidden of [
  '"Запись локально"',
  "когда сервер будет готов"
]) {
  if (appSource.includes(forbidden)) fail(`Visit speech status UI still implies fake local recognition or server-only recovery: ${forbidden}`);
}

console.log(JSON.stringify({ ok: true, guard: "speech-local-bridge-readiness-ui-api-alignment" }));
