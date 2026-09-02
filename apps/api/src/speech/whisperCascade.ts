import { Buffer } from "node:buffer";
import type { DentalSpecialty, SpeechTranscriptionSource } from "@dental/shared";
import { buildDentalSttPrompt } from "./dentalPrompt.js";
import {
	fetchWithProviderTimeout,
	keyRetryLimit,
	numberFromEnv,
	providerHttpError,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	shouldTryNextProviderKey,
	SpeechProviderRequestError,
} from "./keyPool.js";

export type WhisperProviderId =
	| "groq_whisper"
	| "openai_transcribe"
	| "cloudflare_whisper"
	| "local_whisper";

export const WHISPER_HALLUCINATION_BLACKLIST: ReadonlyArray<string | RegExp> = [
	"Продолжение следует",
	"продолжение следует",
	"To be continued",
	"to be continued",
	"Субтитры создавал",
	"Субтитры сделал",
	"Субтитры подготовлены",
	"Субтитры предоставил",
	"DimaTorzok",
	"dimatorzok",
	"Amara.org",
	"amara.org",
	"Спасибо за просмотр",
	"спасибо за просмотр",
	"Спасибо за внимание",
	"спасибо за внимание",
	"Подписывайтесь на канал",
	"подписывайтесь на канал",
	"Ставьте лайки",
	"ставьте лайки",
	"Не забудьте подписаться",
	"www.youtube.com",
	"YouTube",
	"Редактор субтитров",
	"Корректор",
	"[Музыка]",
	"[музыка]",
	"(Музыка)",
	"(музыка)",
	"[Аплодисменты]",
	"(аплодисменты)",
	"[Смех]",
	"(смех)",
	"(помехи)",
	"[BLANK_AUDIO]",
	"BLANK_AUDIO",
	// Silent / punctuation-only hallucinations
	/^[\s.,!?…—–-]+$/,
	// Whisper cyclic repetition loops
	/^(.{1,60})\1{4,}$/s,
];

export function isHallucinatedWhisperTranscript(text: string): {
	hallucinated: boolean;
	reason: string;
} {
	const trimmed = text.trim();
	if (!trimmed) return { hallucinated: false, reason: "" };

	const normalized = trimmed
		.toLowerCase()
		.replace(/[.!?,;:\s]+$/g, "")
		.trim();

	for (const entry of WHISPER_HALLUCINATION_BLACKLIST) {
		if (typeof entry === "string") {
			const normalizedEntry = entry
				.toLowerCase()
				.replace(/[.!?,;:\s]+$/g, "")
				.trim();

			const isExact = normalized === normalizedEntry;
			const isDominant =
				normalized.startsWith(normalizedEntry) &&
				normalized.length <= normalizedEntry.length + 24;

			if (isExact || isDominant) {
				return {
					hallucinated: true,
					reason: `Blacklisted hallucination pattern: "${entry}"`,
				};
			}
		} else {
			if (entry.test(trimmed)) {
				return {
					hallucinated: true,
					reason: `Repetition loop detected (regex: ${entry.source})`,
				};
			}
		}
	}

	// Extreme word repetition check (same word repeated >= 5 times consecutively)
	const words = trimmed.split(/\s+/);
	if (words.length >= 5) {
		let runLen = 1;
		for (let i = 1; i < words.length; i++) {
			if (words[i]?.toLowerCase() === words[i - 1]?.toLowerCase()) {
				runLen++;
				if (runLen >= 5) {
					return {
						hallucinated: true,
						reason: `Consecutive word repetition loop: "${words[i - 1]}" x${runLen}`,
					};
				}
			} else {
				runLen = 1;
			}
		}
	}

	return { hallucinated: false, reason: "" };
}

export interface WhisperCascadeInput {
	audio: Buffer | Uint8Array;
	mimeType?: string | undefined;
	language?: string | undefined;
	specialty?: DentalSpecialty | null | undefined;
	source?: SpeechTranscriptionSource | null | undefined;
	preferredProviders?: WhisperProviderId[] | undefined;
	timeoutMs?: number | undefined;
	customPrompt?: string | null | undefined;
}

export interface WhisperCascadeAttempt {
	provider: WhisperProviderId;
	success: boolean;
	durationMs: number;
	error?: string | undefined;
	hallucinationReason?: string | undefined;
	textPreview?: string | undefined;
	keyFingerprint?: string | undefined;
}

export interface WhisperCascadeResult {
	text: string;
	confidence: number | null;
	provider: WhisperProviderId;
	attempts: WhisperCascadeAttempt[];
	fallbackOccurred: boolean;
	warnings: string[];
	durationMs: number;
}

function fileNameForMime(mimeType?: string | undefined): string {
	const base = mimeType?.split(";")[0]?.toLowerCase() || "";
	if (base.includes("wav")) return "recording.wav";
	if (base.includes("mp3") || base.includes("mpeg")) return "recording.mp3";
	if (base.includes("ogg")) return "recording.ogg";
	if (base.includes("webm")) return "recording.webm";
	if (base.includes("flac")) return "recording.flac";
	if (base.includes("m4a") || base.includes("aac")) return "recording.m4a";
	return "recording.wav";
}

function cloudflareAccountId(): string {
	return (
		process.env.CLOUDFLARE_ACCOUNT_ID ??
		process.env.CF_ACCOUNT_ID ??
		""
	).trim();
}

function getLocalWhisperUrl(): string | null {
	const explicit =
		process.env.DENTAL_LOCAL_WHISPER_TRANSCRIBE_URL?.trim() ||
		process.env.WHISPER_CPP_TRANSCRIBE_URL?.trim() ||
		process.env.LOCAL_WHISPER_TRANSCRIBE_URL?.trim();
	if (explicit) return explicit;

	const base =
		process.env.DENTAL_LOCAL_WHISPER_URL?.trim() ||
		process.env.WHISPER_CPP_URL?.trim() ||
		process.env.LOCAL_WHISPER_URL?.trim();
	if (!base) return null;

	const clean = base.replace(/\/+$/, "");
	if (clean.endsWith("/inference") || clean.endsWith("/transcribe")) return clean;
	return `${clean}/inference`;
}

// 1. Groq Whisper provider call
async function callGroqWhisper(
	audio: Buffer,
	mimeType: string,
	language: string,
	prompt: string | null,
	timeoutMs: number,
): Promise<{ text: string; confidence: number | null; keyFingerprint?: string | undefined }> {
	const triedFingerprints = new Set<string>();
	const maxAttempts = Math.max(1, keyRetryLimit("groq_whisper"));
	let lastError: unknown = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const keyCandidate = selectProviderKey("groq_whisper", triedFingerprints);
		if (!keyCandidate) break;
		triedFingerprints.add(keyCandidate.fingerprint);

		const model =
			process.env.GROQ_WHISPER_MODEL?.trim() || "whisper-large-v3";
		const endpoint = "https://api.groq.com/openai/v1/audio/transcriptions";

		const form = new FormData();
		form.append(
			"file",
			new Blob([new Uint8Array(audio)], { type: mimeType }),
			fileNameForMime(mimeType),
		);
		form.append("model", model);
		form.append("language", language);
		form.append("response_format", "json");
		if (prompt?.trim()) form.append("prompt", prompt.trim());

		try {
			const response = await fetchWithProviderTimeout(
				endpoint,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${keyCandidate.value}`,
					},
					body: form,
				},
				timeoutMs,
			);

			// biome-ignore lint/suspicious/noExplicitAny: json response
			const payload = (await response.json().catch(() => ({}))) as any;
			if (!response.ok) {
				throw providerHttpError(
					response.status,
					response.statusText,
					payload?.error?.message,
				);
			}

			const text = typeof payload.text === "string" ? payload.text.trim() : "";
			recordProviderKeySuccess("groq_whisper", keyCandidate);
			return {
				text,
				confidence: null,
				keyFingerprint: keyCandidate.fingerprint,
			};
		} catch (err) {
			lastError = err;
			recordProviderKeyFailure("groq_whisper", keyCandidate, err);
			if (!shouldTryNextProviderKey(err)) break;
		}
	}

	if (lastError instanceof SpeechProviderRequestError) throw lastError;
	throw new SpeechProviderRequestError(
		`Groq Whisper failed: ${lastError instanceof Error ? lastError.message : "No available keys"}`,
		{ statusCode: 503, retryable: true },
	);
}

// 2. OpenAI Whisper provider call
async function callOpenAiWhisper(
	audio: Buffer,
	mimeType: string,
	language: string,
	prompt: string | null,
	timeoutMs: number,
): Promise<{ text: string; confidence: number | null; keyFingerprint?: string | undefined }> {
	const triedFingerprints = new Set<string>();
	const maxAttempts = Math.max(1, keyRetryLimit("openai_transcribe"));
	let lastError: unknown = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const keyCandidate = selectProviderKey(
			"openai_transcribe",
			triedFingerprints,
		);
		if (!keyCandidate) break;
		triedFingerprints.add(keyCandidate.fingerprint);

		const model = process.env.OPENAI_STT_MODEL?.trim() || "whisper-1";
		const endpoint = "https://api.openai.com/v1/audio/transcriptions";

		const form = new FormData();
		form.append(
			"file",
			new Blob([new Uint8Array(audio)], { type: mimeType }),
			fileNameForMime(mimeType),
		);
		form.append("model", model);
		form.append("language", language);
		form.append("response_format", "json");
		if (prompt?.trim()) form.append("prompt", prompt.trim());

		try {
			const response = await fetchWithProviderTimeout(
				endpoint,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${keyCandidate.value}`,
					},
					body: form,
				},
				timeoutMs,
			);

			// biome-ignore lint/suspicious/noExplicitAny: json response
			const payload = (await response.json().catch(() => ({}))) as any;
			if (!response.ok) {
				throw providerHttpError(
					response.status,
					response.statusText,
					payload?.error?.message,
				);
			}

			const text = typeof payload.text === "string" ? payload.text.trim() : "";
			recordProviderKeySuccess("openai_transcribe", keyCandidate);
			return {
				text,
				confidence: null,
				keyFingerprint: keyCandidate.fingerprint,
			};
		} catch (err) {
			lastError = err;
			recordProviderKeyFailure("openai_transcribe", keyCandidate, err);
			if (!shouldTryNextProviderKey(err)) break;
		}
	}

	if (lastError instanceof SpeechProviderRequestError) throw lastError;
	throw new SpeechProviderRequestError(
		`OpenAI Whisper failed: ${lastError instanceof Error ? lastError.message : "No available keys"}`,
		{ statusCode: 503, retryable: true },
	);
}

// 3. Cloudflare Workers AI Whisper provider call
async function callCloudflareWhisper(
	audio: Buffer,
	mimeType: string,
	timeoutMs: number,
): Promise<{ text: string; confidence: number | null; keyFingerprint?: string | undefined }> {
	const accountId = cloudflareAccountId();
	if (!accountId) {
		throw new SpeechProviderRequestError(
			"Cloudflare Account ID is not configured.",
			{ statusCode: 400, retryable: false },
		);
	}

	const triedFingerprints = new Set<string>();
	const maxAttempts = Math.max(1, keyRetryLimit("cloudflare_whisper"));
	let lastError: unknown = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const keyCandidate = selectProviderKey(
			"cloudflare_whisper",
			triedFingerprints,
		);
		if (!keyCandidate) break;
		triedFingerprints.add(keyCandidate.fingerprint);

		const model = (
			process.env.CLOUDFLARE_WHISPER_MODEL ?? "@cf/openai/whisper"
		).trim();
		const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;

		try {
			const response = await fetchWithProviderTimeout(
				endpoint,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${keyCandidate.value}`,
						"Content-Type": mimeType || "application/octet-stream",
					},
					body: audio,
				},
				timeoutMs,
			);

			// biome-ignore lint/suspicious/noExplicitAny: response json
			const payload = (await response.json().catch(() => ({}))) as any;
			if (!response.ok || payload?.success === false) {
				throw providerHttpError(
					response.status,
					response.statusText,
					payload?.errors?.[0]?.message,
				);
			}

			const result = payload.result ?? payload;
			const text = typeof result.text === "string" ? result.text.trim() : "";
			recordProviderKeySuccess("cloudflare_whisper", keyCandidate);
			return {
				text,
				confidence: null,
				keyFingerprint: keyCandidate.fingerprint,
			};
		} catch (err) {
			lastError = err;
			recordProviderKeyFailure("cloudflare_whisper", keyCandidate, err);
			if (!shouldTryNextProviderKey(err)) break;
		}
	}

	if (lastError instanceof SpeechProviderRequestError) throw lastError;
	throw new SpeechProviderRequestError(
		`Cloudflare Workers AI Whisper failed: ${lastError instanceof Error ? lastError.message : "No available keys"}`,
		{ statusCode: 503, retryable: true },
	);
}

// 4. Local Whisper.cpp HTTP provider call
async function callLocalWhisper(
	audio: Buffer,
	mimeType: string,
	language: string,
	prompt: string | null,
	timeoutMs: number,
): Promise<{ text: string; confidence: number | null }> {
	const endpoint = getLocalWhisperUrl();
	if (!endpoint) {
		throw new SpeechProviderRequestError(
			"Local Whisper.cpp endpoint is not configured.",
			{ statusCode: 400, retryable: false },
		);
	}

	const form = new FormData();
	form.append(
		"file",
		new Blob([new Uint8Array(audio)], { type: mimeType }),
		fileNameForMime(mimeType),
	);
	form.append("language", language);
	form.append("response_format", "json");
	if (prompt?.trim()) form.append("prompt", prompt.trim());

	const apiKey =
		process.env.DENTAL_LOCAL_WHISPER_API_KEY?.trim() ||
		process.env.WHISPER_CPP_API_KEY?.trim();
	const headers: Record<string, string> = {};
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	const response = await fetchWithProviderTimeout(
		endpoint,
		{
			method: "POST",
			headers,
			body: form,
		},
		timeoutMs,
	);

	// biome-ignore lint/suspicious/noExplicitAny: response json
	const payload = (await response.json().catch(() => ({}))) as any;
	if (!response.ok) {
		throw providerHttpError(
			response.status,
			response.statusText,
			payload?.error?.message,
		);
	}

	const text = typeof payload.text === "string" ? payload.text.trim() : "";
	return { text, confidence: null };
}

export async function transcribeWhisperCascade(
	input: WhisperCascadeInput,
): Promise<WhisperCascadeResult> {
	const audioBuf = Buffer.isBuffer(input.audio)
		? input.audio
		: Buffer.from(input.audio);

	const mimeType = input.mimeType || "audio/wav";
	const language = input.language || "ru";
	const timeoutMs =
		input.timeoutMs ?? numberFromEnv("DENTAL_WHISPER_CASCADE_TIMEOUT_MS", 30_000);

	const defaultCascade: WhisperProviderId[] = [
		"groq_whisper",
		"openai_transcribe",
		"cloudflare_whisper",
		"local_whisper",
	];

	const providersToTry = input.preferredProviders?.length
		? input.preferredProviders
		: defaultCascade;

	const prompt =
		input.customPrompt?.trim() ||
		buildDentalSttPrompt({
			providerId: "groq_whisper",
			specialty: input.specialty ?? "universal",
			source: input.source ?? "visit",
		});

	const attempts: WhisperCascadeAttempt[] = [];
	const warnings: string[] = [];
	const cascadeStartTime = Date.now();

	for (let i = 0; i < providersToTry.length; i++) {
		const providerId = providersToTry[i]!;
		const attemptStart = Date.now();

		try {
			let result: {
				text: string;
				confidence: number | null;
				keyFingerprint?: string | undefined;
			};

			if (providerId === "groq_whisper") {
				result = await callGroqWhisper(
					audioBuf,
					mimeType,
					language,
					prompt,
					timeoutMs,
				);
			} else if (providerId === "openai_transcribe") {
				result = await callOpenAiWhisper(
					audioBuf,
					mimeType,
					language,
					prompt,
					timeoutMs,
				);
			} else if (providerId === "cloudflare_whisper") {
				result = await callCloudflareWhisper(audioBuf, mimeType, timeoutMs);
			} else if (providerId === "local_whisper") {
				result = await callLocalWhisper(
					audioBuf,
					mimeType,
					language,
					prompt,
					timeoutMs,
				);
			} else {
				continue;
			}

			const duration = Date.now() - attemptStart;
			const trimmedText = result.text.trim();

			// Check for empty or hallucinated result
			if (!trimmedText) {
				attempts.push({
					provider: providerId,
					success: false,
					durationMs: duration,
					error: "Empty transcription text returned",
					...(result.keyFingerprint
						? { keyFingerprint: result.keyFingerprint }
						: {}),
				});
				warnings.push(
					`Провайдер ${providerId} вернул пустой текст; переключение на следующий уровень каскада.`,
				);
				continue;
			}

			const hallucinationCheck = isHallucinatedWhisperTranscript(trimmedText);
			if (hallucinationCheck.hallucinated) {
				attempts.push({
					provider: providerId,
					success: false,
					durationMs: duration,
					hallucinationReason: hallucinationCheck.reason,
					textPreview: trimmedText.slice(0, 80),
					...(result.keyFingerprint
						? { keyFingerprint: result.keyFingerprint }
						: {}),
				});
				warnings.push(
					`Провайдер ${providerId} сгенерировал фантомную галлюцинацию (${hallucinationCheck.reason}); выполнено каскадное переключение.`,
				);
				continue;
			}

			// Successful transcription!
			attempts.push({
				provider: providerId,
				success: true,
				durationMs: duration,
				textPreview: trimmedText.slice(0, 80),
				...(result.keyFingerprint
					? { keyFingerprint: result.keyFingerprint }
					: {}),
			});

			const fallbackOccurred = i > 0;
			if (fallbackOccurred) {
				warnings.push(
					`Успешно распознано через резервный провайдер ${providerId} (уровень каскада ${i + 1}).`,
				);
			}

			return {
				text: trimmedText,
				confidence: result.confidence,
				provider: providerId,
				attempts,
				fallbackOccurred,
				warnings,
				durationMs: Date.now() - cascadeStartTime,
			};
		} catch (err) {
			const duration = Date.now() - attemptStart;
			const errMsg = err instanceof Error ? err.message : String(err);
			attempts.push({
				provider: providerId,
				success: false,
				durationMs: duration,
				error: errMsg,
			});
			warnings.push(
				`Провайдер ${providerId} завершился с ошибкой: ${errMsg}; каскад продолжается.`,
			);
		}
	}

	const totalDuration = Date.now() - cascadeStartTime;
	const failureSummary = attempts
		.map(
			(a) =>
				`${a.provider}: ${a.error || a.hallucinationReason || "failed"} (${a.durationMs}ms)`,
		)
		.join("; ");

	throw new SpeechProviderRequestError(
		`Каскад Whisper исчерпал все доступные провайдеры (${providersToTry.join(" -> ")}): ${failureSummary}`,
		{ statusCode: 502, retryable: true },
	);
}
