import { readFile } from "node:fs/promises";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

const systemSource = await readFile("apps/api/src/routes/system.ts", "utf8");
const gatewaySource = await readFile("apps/api/src/speech/gateway.ts", "utf8");
const appSource = [
	await readFile("apps/web/src/App.tsx", "utf8"),
	await readAppLogicSource(),
	await readFile("apps/web/src/AppHelpers.tsx", "utf8"),
].join("\n");
const speechPlan = await readFile(
	"docs/05-speech-transcription-plan.md",
	"utf8",
);

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
	"LOCAL_VOSK_TRANSCRIBE_URL",
]) {
	if (!systemSource.includes(marker))
		fail(
			`Local bridge readiness does not recognize speech env marker: ${marker}`,
		);
	if (!gatewaySource.includes(marker))
		fail(`Speech gateway does not recognize expected env marker: ${marker}`);
}

/*
 * ДВА ТРЕБОВАНИЯ ВЫНЕСЕНЫ ИЗ ДОСЛОВНОГО СПИСКА: ФОРМАТТЕР РАЗНЁС ИХ ПО СТРОКАМ.
 *
 * Замер 2026-08-11: подпись и вызов `healthUrl` ЖИВЫ и не менялись по сути —
 * routes/system.ts:196-200 и :260-264, просто параметры теперь на отдельных
 * строках с висячей запятой. Односрочный `includes()` этого не видит.
 *
 * Логика вывода health-пути на месте целиком (system.ts:205-216), поэтому
 * сверяется СВЯЗЬ, а не раскладка пробелов: имена параметров, их порядок и
 * значение по умолчанию по-прежнему обязательны.
 */
for (const [pattern, label] of [
	[
		/function\s+healthUrl\(\s*rawUrl:\s*string,\s*defaultHealthPath:\s*string,\s*deriveHealthFromConfiguredPath\s*=\s*false,?\s*\):\s*URL/,
		"function healthUrl(rawUrl, defaultHealthPath, deriveHealthFromConfiguredPath = false): URL",
	],
	[
		/healthUrl\(\s*configuredUrl,\s*definition\.defaultHealthPath,\s*definition\.deriveHealthFromConfiguredPath,?\s*\)/,
		"healthUrl(configuredUrl, definition.defaultHealthPath, definition.deriveHealthFromConfiguredPath)",
	],
]) {
	if (!pattern.test(systemSource))
		fail(`Local bridge readiness health derivation missing marker: ${label}`);
}

for (const marker of [
	"deriveHealthFromConfiguredPath?: boolean",
	"deriveHealthFromConfiguredPath: true",
	"/\\/(?:health|healthz|status)$/i.test(cleanPath)",
	"/\\/v1\\/audio\\/transcriptions$/i.test(cleanPath)",
	"url.pathname = `${cleanPath}${defaultHealthPath}`",
]) {
	if (!systemSource.includes(marker))
		fail(`Local bridge readiness health derivation missing marker: ${marker}`);
}

if (
	!speechPlan.includes("DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL") ||
	!speechPlan.includes("DENTAL_VOSK_TRANSCRIBE_URL")
) {
	fail(
		"Speech plan must document local speech transcribe URL environment variables.",
	);
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
	"когда источник будет готов",
]) {
	if (!appSource.includes(marker))
		fail(
			`Visit speech status UI does not map local bridge readiness honestly: ${marker}`,
		);
}

for (const forbidden of ['"Запись локально"', "когда сервер будет готов"]) {
	if (appSource.includes(forbidden))
		fail(
			`Visit speech status UI still implies fake local recognition or server-only recovery: ${forbidden}`,
		);
}

console.log(
	JSON.stringify({
		ok: true,
		guard: "speech-local-bridge-readiness-ui-api-alignment",
	}),
);
