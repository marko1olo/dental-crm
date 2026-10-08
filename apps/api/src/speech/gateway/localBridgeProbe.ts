import type {
	SpeechGatewayProvider,
	SpeechProviderKind,
} from "@dental/shared";
import { numberFromEnv, providerKeyCount } from "../keyPool.js";
import {
	type LocalSpeechBridgeProbeState,
	localSpeechProviders,
	providerLabels,
	wiredServerProviders,
} from "./types.js";

export function isWiredServerProvider(providerId: SpeechGatewayProvider): boolean {
	return (
		providerId !== "none" &&
		wiredServerProviders.includes(providerId as SpeechProviderKind)
	);
}

export function isLocalSpeechProvider(providerId: SpeechGatewayProvider): boolean {
	return (
		providerId !== "none" &&
		localSpeechProviders.includes(providerId as SpeechProviderKind)
	);
}

export function cloudflareAccountId(): string {
	return (
		process.env.CLOUDFLARE_ACCOUNT_ID ??
		process.env.CF_ACCOUNT_ID ??
		""
	).trim();
}

export function envString(names: string[]): string {
	for (const name of names) {
		const value = process.env[name]?.trim();
		if (value) return value;
	}
	return "";
}

export function localBridgeRemoteAllowed(): boolean {
	return (
		(process.env.DENTAL_ALLOW_REMOTE_LOCAL_BRIDGES ?? "")
			.trim()
			.toLowerCase() === "true"
	);
}

export function isPrivateBridgeHost(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
	if (host === "localhost" || host === "::1" || host.endsWith(".local"))
		return true;
	if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host))
		return true;
	const match = host.match(/^172\.(\d{1,2})\./);
	return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function localBridgeUrlAllowed(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			(url.protocol === "http:" || url.protocol === "https:") &&
			(localBridgeRemoteAllowed() || isPrivateBridgeHost(url.hostname))
		);
	} catch {
		return false;
	}
}

export function redactedBridgeUrl(value: string): string | null {
	try {
		const url = new URL(value);
		url.username = "";
		url.password = "";
		url.search = "";
		url.hash = "";
		return url.toString();
	} catch {
		return null;
	}
}

export function localWhisperTranscribeUrlFromBase(value: string): string {
	const url = new URL(value);
	const cleanPath = url.pathname.replace(/\/+$/g, "");
	if (cleanPath.endsWith("/v1/audio/transcriptions")) return url.toString();
	if (
		cleanPath.endsWith("/health") ||
		cleanPath.endsWith("/healthz") ||
		cleanPath.endsWith("/status")
	) {
		url.pathname = `${cleanPath.replace(/\/(health|healthz|status)$/i, "")}/v1/audio/transcriptions`;
		return url.toString();
	}
	url.pathname = `${cleanPath || ""}/v1/audio/transcriptions`;
	return url.toString();
}

export function localSpeechTranscribeUrl(
	providerId: SpeechGatewayProvider,
): string | null {
	const explicit =
		providerId === "local_whisper"
			? envString([
					"DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL",
					"WHISPER_CPP_TRANSCRIBE_URL",
					"LOCAL_WHISPER_TRANSCRIBE_URL",
				])
			: providerId === "vosk_local"
				? envString([
						"DENTAL_VOSK_TRANSCRIBE_URL",
						"VOSK_TRANSCRIBE_URL",
						"LOCAL_VOSK_TRANSCRIBE_URL",
					])
				: "";
	if (explicit) return localBridgeUrlAllowed(explicit) ? explicit : null;

	if (providerId === "local_whisper") {
		const base = envString([
			"DENTAL_LOCAL_WHISPER_URL",
			"WHISPER_CPP_URL",
			"LOCAL_WHISPER_URL",
		]);
		if (!base || !localBridgeUrlAllowed(base)) return null;
		return localWhisperTranscribeUrlFromBase(base);
	}

	if (providerId === "vosk_local") {
		const base = envString([
			"DENTAL_VOSK_URL",
			"VOSK_SERVER_URL",
			"LOCAL_VOSK_URL",
		]);
		if (!base || !localBridgeUrlAllowed(base)) return null;
		return base;
	}

	return null;
}

export function localSpeechHealthUrlFromBase(value: string): string {
	const url = new URL(value);
	const cleanPath = url.pathname.replace(/\/+$/g, "");
	if (
		cleanPath.endsWith("/health") ||
		cleanPath.endsWith("/healthz") ||
		cleanPath.endsWith("/status")
	) {
		return url.toString();
	}
	if (cleanPath.endsWith("/v1/audio/transcriptions")) {
		url.pathname = `${cleanPath.replace(/\/v1\/audio\/transcriptions$/i, "")}/health`;
		return url.toString();
	}
	url.pathname = `${cleanPath || ""}/health`;
	return url.toString();
}

export function localSpeechHealthUrl(
	providerId: SpeechGatewayProvider,
): string | null {
	const explicit =
		providerId === "local_whisper"
			? envString([
					"DENTAL_LOCAL_WHISPER_HEALTH_URL",
					"WHISPER_CPP_HEALTH_URL",
					"LOCAL_WHISPER_HEALTH_URL",
				])
			: providerId === "vosk_local"
				? envString([
						"DENTAL_VOSK_HEALTH_URL",
						"VOSK_HEALTH_URL",
						"LOCAL_VOSK_HEALTH_URL",
					])
				: "";
	if (explicit) return localBridgeUrlAllowed(explicit) ? explicit : null;

	const base =
		providerId === "local_whisper"
			? envString([
					"DENTAL_LOCAL_WHISPER_URL",
					"WHISPER_CPP_URL",
					"LOCAL_WHISPER_URL",
				])
			: providerId === "vosk_local"
				? envString(["DENTAL_VOSK_URL", "VOSK_SERVER_URL", "LOCAL_VOSK_URL"])
				: "";
	if (base && localBridgeUrlAllowed(base)) {
		return localSpeechHealthUrlFromBase(base);
	}

	const transcribeUrl = localSpeechTranscribeUrl(providerId);
	if (transcribeUrl && localBridgeUrlAllowed(transcribeUrl)) {
		return localSpeechHealthUrlFromBase(transcribeUrl);
	}

	return null;
}

export function localSpeechTimeoutMs(): number {
	return numberFromEnv("DENTAL_LOCAL_STT_TIMEOUT_MS", 25_000);
}

export function localSpeechProbeTimeoutMs(): number {
	return Math.max(
		250,
		Math.min(numberFromEnv("DENTAL_LOCAL_STT_PROBE_TIMEOUT_MS", 900), 5_000),
	);
}

export function localSpeechProbeTtlMs(): number {
	return Math.max(
		500,
		Math.min(numberFromEnv("DENTAL_LOCAL_STT_PROBE_TTL_MS", 7_000), 60_000),
	);
}

export const localSpeechBridgeProbeByProvider = new Map<
	SpeechGatewayProvider,
	LocalSpeechBridgeProbeState
>();

export function defaultLocalSpeechBridgeProbeState(): LocalSpeechBridgeProbeState {
	return {
		status: "unknown",
		checkedAt: null,
		latencyMs: null,
		urlRedacted: null,
		warning: null,
		pending: null,
	};
}

export function localSpeechBridgeProbeState(
	providerId: SpeechGatewayProvider,
): LocalSpeechBridgeProbeState {
	const existing = localSpeechBridgeProbeByProvider.get(providerId);
	if (existing) return existing;
	const state = defaultLocalSpeechBridgeProbeState();
	localSpeechBridgeProbeByProvider.set(providerId, state);
	return state;
}

export function localSpeechBridgeProbeFresh(
	state: LocalSpeechBridgeProbeState,
): boolean {
	return (
		state.checkedAt !== null &&
		Date.now() - state.checkedAt < localSpeechProbeTtlMs()
	);
}

export async function runLocalSpeechBridgeProbe(
	providerId: SpeechGatewayProvider,
): Promise<void> {
	const state = localSpeechBridgeProbeState(providerId);
	const url = localSpeechHealthUrl(providerId);
	if (!url) {
		state.status = providerConfigReady(providerId)
			? "blocked"
			: "misconfigured";
		state.checkedAt = Date.now();
		state.latencyMs = null;
		state.urlRedacted = null;
		state.warning = `${providerLabels[providerId]}: адрес проверки не настроен или находится вне localhost/частной сети.`;
		return;
	}

	state.urlRedacted = redactedBridgeUrl(url);
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		localSpeechProbeTimeoutMs(),
	);
	const startedAt = Date.now();
	try {
		const response = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/json,text/plain,*/*" },
			signal: controller.signal,
		});
		state.checkedAt = Date.now();
		state.latencyMs = state.checkedAt - startedAt;
		if (response.ok) {
			state.status = "ready";
			state.warning = null;
		} else {
			state.status = "unreachable";
			state.warning = `${providerLabels[providerId]}: локальный модуль не подтвердил готовность; аудио в очереди остается локально.`;
		}
	} catch (error) {
		state.status = "unreachable";
		state.checkedAt = Date.now();
		state.latencyMs = null;
		const probeReason =
			error instanceof Error && error.name === "AbortError"
				? "локальный модуль не ответил вовремя"
				: "локальный модуль недоступен по локальной сети";
		state.warning = `${providerLabels[providerId]}: ${probeReason}; аудио в очереди остается локально.`;
	} finally {
		clearTimeout(timeout);
	}
}

export function primeLocalSpeechBridgeProbe(
	providerId: SpeechGatewayProvider,
): LocalSpeechBridgeProbeState {
	const state = localSpeechBridgeProbeState(providerId);
	if (!isLocalSpeechProvider(providerId)) return state;
	if (!providerConfigReady(providerId)) return state;
	if (state.pending || localSpeechBridgeProbeFresh(state)) return state;

	const pending = runLocalSpeechBridgeProbe(providerId)
		.catch((error) => {
			state.status = "unreachable";
			state.checkedAt = Date.now();
			state.latencyMs = null;
			const probeReason =
				error instanceof Error && error.name === "AbortError"
					? "локальный модуль не ответил вовремя"
					: "локальный модуль недоступен по локальной сети";
			state.warning = `${providerLabels[providerId]}: ${probeReason}; аудио в очереди остается локально.`;
		})
		.finally(() => {
			state.pending = null;
		});
	state.pending = pending;
	return state;
}

export function localSpeechBridgeReady(providerId: SpeechGatewayProvider): boolean {
	const state = primeLocalSpeechBridgeProbe(providerId);
	return state.status === "ready";
}

export function localSpeechBridgeProbeWarning(
	providerId: SpeechGatewayProvider,
): string | null {
	const state = primeLocalSpeechBridgeProbe(providerId);
	if (!providerConfigReady(providerId)) return null;
	const urlSuffix = state.urlRedacted ? ` (${state.urlRedacted})` : "";
	if (state.status === "ready") {
		const latency =
			state.latencyMs !== null ? `, проверка ${state.latencyMs} мс` : "";
		return `${providerLabels[providerId]}: локальный модуль доступен${latency}; фрагменты остаются на localhost или в частной сети.`;
	}
	if (state.pending || state.status === "unknown") {
		return `${providerLabels[providerId]}: адрес локального модуля настроен, проверка доступности еще идет${urlSuffix}; аудио в очереди остается локально до готовности модуля.`;
	}
	return `${state.warning ?? `${providerLabels[providerId]}: локальный модуль недоступен`}${urlSuffix}`;
}

export function localSpeechApiKey(providerId: SpeechGatewayProvider): string | null {
	const value =
		providerId === "local_whisper"
			? envString([
					"DENTAL_LOCAL_WHISPER_API_KEY",
					"WHISPER_CPP_API_KEY",
					"LOCAL_WHISPER_API_KEY",
				])
			: providerId === "vosk_local"
				? envString([
						"DENTAL_VOSK_API_KEY",
						"VOSK_API_KEY",
						"LOCAL_VOSK_API_KEY",
					])
				: "";
	return value || null;
}

export function providerConfigMissingEnvVars(
	providerId: SpeechGatewayProvider,
): string[] {
	if (providerId === "cloudflare_whisper" && !cloudflareAccountId()) {
		return ["CLOUDFLARE_ACCOUNT_ID"];
	}
	if (providerId === "local_whisper" && !localSpeechTranscribeUrl(providerId)) {
		return ["DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL", "DENTAL_LOCAL_WHISPER_URL"];
	}
	if (providerId === "vosk_local" && !localSpeechTranscribeUrl(providerId)) {
		return ["DENTAL_VOSK_TRANSCRIBE_URL", "DENTAL_VOSK_URL"];
	}
	return [];
}

export function providerConfigReady(providerId: SpeechGatewayProvider): boolean {
	if (isWiredServerProvider(providerId)) {
		return (
			providerKeyCount(providerId) > 0 &&
			providerConfigMissingEnvVars(providerId).length === 0
		);
	}
	if (isLocalSpeechProvider(providerId)) {
		return (
			Boolean(localSpeechTranscribeUrl(providerId)) &&
			providerConfigMissingEnvVars(providerId).length === 0
		);
	}
	return false;
}
