import type {
	DentalSpecialty,
	SpeechChunkUploadInput,
	SpeechGatewayProvider,
	SpeechTranscriptionResponse,
	SpeechTranscriptionStatus,
} from "@dental/shared";
import { buildDentalSttPrompt } from "../dentalPrompt.js";
import { transcribeWithGeminiLiveStt } from "../geminiLiveStt.js";
import {
	fetchWithProviderTimeout,
	getProviderKeyPoolSummary,
	keyRetryLimit,
	providerHttpError,
	providerKeyCount,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	shouldTryNextProviderKey,
	SpeechProviderRequestError,
} from "../keyPool.js";
import { recordSpeechTranscriptionChunk } from "../storage.js";
import { transcribeAssemblyAi } from "./assemblyAiClient.js";
import {
	confidenceFromWhisperLogprob,
	decodeBase64Audio,
	fileNameForMime,
	isHallucinatedTranscript,
	normalizeLanguage,
	publicProviderFailureReason,
	publicSpeechProviderFailure,
} from "./audioBufferUtils.js";
import {
	cloudflareAccountId,
	isLocalSpeechProvider,
	isWiredServerProvider,
	localSpeechApiKey,
	localSpeechTimeoutMs,
	localSpeechTranscribeUrl,
	providerConfigMissingEnvVars,
} from "./localBridgeProbe.js";
import { getSpeechGatewayStatus } from "./speechSessionManager.js";
import { buildSpeechTranscriptionQuality } from "./transcriptionQuality.js";
import {
	providerLabels,
	type ProviderTranscript,
	SpeechAsyncJobTimeoutError,
} from "./types.js";
import { transcribeLocalVoskBridge } from "./voskClient.js";

export async function transcribeOpenAiCompatible(input: {
	endpoint: string;
	apiKey?: string | null;
	model: string;
	audio: Buffer;
	mimeType: string;
	language: string;
	responseFormat?: "json" | "verbose_json";
	prompt?: string | null;
	timeoutMs?: number;
}): Promise<ProviderTranscript> {
	const form = new FormData();
	form.append(
		"file",
		new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
		fileNameForMime(input.mimeType),
	);
	form.append("model", input.model);
	form.append("language", normalizeLanguage(input.language));
	form.append("response_format", input.responseFormat ?? "json");
	if (input.prompt?.trim()) form.append("prompt", input.prompt.trim());

	const headers: Record<string, string> = {};
	if (input.apiKey?.trim()) {
		headers.Authorization = `Bearer ${input.apiKey.trim()}`;
	}

	const response = await fetchWithProviderTimeout(
		input.endpoint,
		{
			method: "POST",
			headers,
			body: form,
		},
		input.timeoutMs,
	);
	const payload = (await response.json().catch(() => ({}))) as {
		text?: unknown;
		segments?: Array<{
			text?: unknown;
			avg_logprob?: unknown;
			compression_ratio?: unknown;
			no_speech_prob?: unknown;
		}>;
		error?: { message?: string };
	};
	if (!response.ok) {
		throw providerHttpError(
			response.status,
			response.statusText,
			payload.error?.message,
		);
	}

	const segmentWarnings: string[] = [];
	const segmentAvgLogprobs =
		payload.segments
			?.map((segment) => segment.avg_logprob)
			.filter((value): value is number => typeof value === "number") ?? [];
	const noSpeechSegments =
		payload.segments?.filter(
			(segment) =>
				typeof segment.no_speech_prob === "number" &&
				segment.no_speech_prob > 0.6,
		).length ?? 0;
	const compressedSegments =
		payload.segments?.filter(
			(segment) =>
				typeof segment.compression_ratio === "number" &&
				segment.compression_ratio > 2.4,
		).length ?? 0;
	if (noSpeechSegments) {
		segmentWarnings.push(
			`${noSpeechSegments} фрагмент(ов) похожи на тишину; проверьте, не попал ли в запись пустой участок.`,
		);
	}
	if (compressedSegments) {
		segmentWarnings.push(
			`${compressedSegments} фрагмент(ов) похожи на сжатый или повторяющийся звук; проверьте текст перед сохранением.`,
		);
	}

	return {
		text: typeof payload.text === "string" ? payload.text.trim() : "",
		confidence: confidenceFromWhisperLogprob(segmentAvgLogprobs),
		warnings: segmentWarnings,
	};
}

export async function transcribeLocalWhisperBridge(input: {
	audio: Buffer;
	mimeType: string;
	language: string;
}): Promise<ProviderTranscript> {
	const endpoint = localSpeechTranscribeUrl("local_whisper");
	if (!endpoint) {
		throw new Error(
			"Локальный модуль Whisper.cpp не настроен: укажите адрес локального модуля в серверных настройках клиники.",
		);
	}

	const result = await transcribeOpenAiCompatible({
		endpoint,
		apiKey: localSpeechApiKey("local_whisper"),
		model:
			process.env.DENTAL_LOCAL_WHISPER_MODEL ??
			process.env.WHISPER_CPP_MODEL ??
			"whisper.cpp",
		audio: input.audio,
		mimeType: input.mimeType,
		language: input.language,
		responseFormat: "verbose_json",
		timeoutMs: localSpeechTimeoutMs(),
	});
	result.warnings.push(
		"Использован локальный модуль Whisper.cpp; текст нужно проверить, потому что точность зависит от размера и настроек локальной модели.",
	);
	return result;
}

export async function transcribeDeepgram(input: {
	apiKey: string;
	audio: Buffer;
	mimeType: string;
	language: string;
	specialty?: DentalSpecialty | null;
	source?: SpeechChunkUploadInput["source"];
}): Promise<ProviderTranscript> {
	const language = normalizeLanguage(input.language);
	const url = new URL("https://api.deepgram.com/v1/listen");
	url.searchParams.set("model", process.env.DEEPGRAM_STT_MODEL ?? "nova-3");
	url.searchParams.set("language", language);
	url.searchParams.set("smart_format", "true");
	url.searchParams.set("punctuate", "true");

	const response = await fetchWithProviderTimeout(url, {
		method: "POST",
		headers: {
			Authorization: `Token ${input.apiKey}`,
			"Content-Type": input.mimeType,
		},
		body: input.audio,
	});
	const payload = (await response.json().catch(() => ({}))) as {
		err_msg?: string;
		results?: {
			channels?: Array<{
				alternatives?: Array<{ transcript?: string; confidence?: number }>;
			}>;
		};
	};
	if (!response.ok) {
		throw providerHttpError(
			response.status,
			response.statusText,
			payload.err_msg,
		);
	}
	const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
	return {
		text: alternative?.transcript?.trim() ?? "",
		confidence:
			typeof alternative?.confidence === "number"
				? alternative.confidence
				: null,
		warnings: [],
	};
}

export async function transcribeCloudflareWhisper(input: {
	apiKey: string;
	audio: Buffer;
	mimeType: string;
}): Promise<ProviderTranscript> {
	const accountId = cloudflareAccountId();
	if (!accountId) {
		throw new Error(
			"Cloudflare Workers AI Whisper не настроен полностью: заполните недостающий пункт в серверных настройках распознавания.",
		);
	}

	const model = (
		process.env.CLOUDFLARE_WHISPER_MODEL ?? "@cf/openai/whisper"
	).trim();
	const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
	const response = await fetchWithProviderTimeout(endpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${input.apiKey}`,
			"Content-Type": input.mimeType || "application/octet-stream",
		},
		body: input.audio,
	});
	const payload = (await response.json().catch(() => ({}))) as {
		success?: boolean;
		result?: {
			text?: unknown;
			transcription_info?: { duration?: unknown };
			word_count?: unknown;
		};
		text?: unknown;
		errors?: Array<{ message?: string }>;
	};
	if (!response.ok || payload.success === false) {
		throw providerHttpError(
			response.status,
			response.statusText,
			payload.errors?.[0]?.message,
		);
	}

	const result = payload.result ?? payload;
	return {
		text: typeof result.text === "string" ? result.text.trim() : "",
		confidence: null,
		warnings: [],
	};
}

export async function transcribeGeminiMultimodal(input: {
	apiKey: string;
	audio: Buffer;
	mimeType: string;
	language: string;
	prompt?: string | null;
}): Promise<ProviderTranscript> {
	const model = process.env.GOOGLE_SPEECH_MODEL ?? "gemini-2.5-flash";
	const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${input.apiKey}`;

	const baseMimeType = input.mimeType.split(";")[0] || "audio/webm";
	const base64Audio = input.audio.toString("base64");

	const textPrompt = `Transcribe the following audio accurately in ${input.language}. Do not add any conversational filler. ${input.prompt ?? ""}`;

	const response = await fetchWithProviderTimeout(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			contents: [
				{
					parts: [
						{ text: textPrompt },
						{ inline_data: { mime_type: baseMimeType, data: base64Audio } },
					],
				},
			],
			generationConfig: {
				temperature: 0.1,
			},
		}),
	});

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const payload = (await response.json().catch(() => ({}))) as any;
	if (!response.ok) {
		throw providerHttpError(
			response.status,
			response.statusText,
			payload?.error?.message || JSON.stringify(payload),
		);
	}

	const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
	if (typeof text !== "string") {
		throw new Error(
			`Invalid response format from Gemini: ${JSON.stringify(payload)}`,
		);
	}

	const cleanText = text.trim();
	return {
		text: cleanText,
		confidence: null,
		warnings: [],
	};
}

export async function transcribeWithProvider(input: {
	providerId: SpeechGatewayProvider;
	audio: Buffer;
	mimeType: string;
	language: string;
	specialty?: DentalSpecialty | null;
	source?: SpeechChunkUploadInput["source"];
	abortSignal?: AbortSignal;
	/** Канал для сообщений, которые обязаны дойти до врача даже на отказе распознавания. */
	warnings: string[];
}): Promise<ProviderTranscript> {
	if (input.providerId === "local_whisper") {
		return transcribeLocalWhisperBridge({
			audio: input.audio,
			mimeType: input.mimeType,
			language: input.language,
		});
	}
	if (input.providerId === "vosk_local") {
		return transcribeLocalVoskBridge({
			audio: input.audio,
			mimeType: input.mimeType,
			language: input.language,
			specialty: input.specialty ?? null,
			...(input.source ? { source: input.source } : {}),
		});
	}

	if (!providerKeyCount(input.providerId)) {
		throw new Error(
			`Для ${providerLabels[input.providerId]} не настроен серверный доступ. До подключения врач может использовать локальный текст или браузерную диктовку.`,
		);
	}
	const missingConfigEnvVars = providerConfigMissingEnvVars(input.providerId);
	if (missingConfigEnvVars.length) {
		throw new Error(
			`${providerLabels[input.providerId]}: не хватает серверных настроек (${missingConfigEnvVars.length})`,
		);
	}

	const triedFingerprints = new Set<string>();
	const maxAttempts = keyRetryLimit(input.providerId);
	let lastError: unknown = null;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const keyCandidate = selectProviderKey(input.providerId, triedFingerprints);
		if (!keyCandidate) break;
		triedFingerprints.add(keyCandidate.fingerprint);

		try {
			let result: ProviderTranscript;
			if (input.providerId === "groq_whisper") {
				const prompt = buildDentalSttPrompt({
					providerId: "groq_whisper",
					specialty: input.specialty ?? null,
					source: input.source ?? "visit",
				});
				result = await transcribeOpenAiCompatible({
					endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
					apiKey: keyCandidate.value,
					model: process.env.GROQ_STT_MODEL ?? "whisper-large-v3",
					audio: input.audio,
					mimeType: input.mimeType,
					language: input.language,
					responseFormat: "verbose_json",
					prompt,
				});
			} else if (input.providerId === "openai_transcribe") {
				const prompt = buildDentalSttPrompt({
					providerId: "openai_transcribe",
					specialty: input.specialty ?? null,
					source: input.source ?? "visit",
				});
				result = await transcribeOpenAiCompatible({
					endpoint: "https://api.openai.com/v1/audio/transcriptions",
					apiKey: keyCandidate.value,
					model: process.env.OPENAI_STT_MODEL ?? "gpt-4o-mini-transcribe",
					audio: input.audio,
					mimeType: input.mimeType,
					language: input.language,
					prompt,
				});
			} else if (input.providerId === "deepgram_streaming") {
				result = await transcribeDeepgram({
					apiKey: keyCandidate.value,
					audio: input.audio,
					mimeType: input.mimeType,
					language: input.language,
				});
			} else if (input.providerId === "assemblyai_async") {
				result = await transcribeAssemblyAi({
					apiKey: keyCandidate.value,
					audio: input.audio,
					mimeType: input.mimeType,
					language: input.language,
					warnings: input.warnings,
				});
			} else if (input.providerId === "cloudflare_whisper") {
				result = await transcribeCloudflareWhisper({
					apiKey: keyCandidate.value,
					audio: input.audio,
					mimeType: input.mimeType,
				});
			} else if (input.providerId === "google_speech") {
				const prompt = buildDentalSttPrompt({
					providerId: "google_speech",
					specialty: input.specialty ?? null,
					source: input.source ?? "visit",
				});
				result = await transcribeGeminiMultimodal({
					apiKey: keyCandidate.value,
					audio: input.audio,
					mimeType: input.mimeType,
					language: input.language,
					prompt,
				});
			} else if (input.providerId === "gemini_transcribe_live") {
				result = await transcribeWithGeminiLiveStt({
					audio: input.audio,
					mimeType: input.mimeType,
					specialty: input.specialty ?? null,
					language: input.language,
					config: {
						apiKey: keyCandidate.value,
						providerId: "gemini_transcribe_live",
					},
				});
			} else {
				throw new Error(
					`${providerLabels[input.providerId]} есть в каталоге, но прямое серверное распознавание пока не включено. Выберите подключенный источник или браузерную диктовку.`,
				);
			}

			recordProviderKeySuccess(input.providerId, keyCandidate);
			if (attempt > 0) {
				result.warnings.push(
					`${providerLabels[input.providerId]} восстановился после резервной попытки N ${attempt + 1}.`,
				);
			}
			return result;
		} catch (error) {
			lastError = error;
			if (error instanceof SpeechAsyncJobTimeoutError) {
				break;
			}
			recordProviderKeyFailure(input.providerId, keyCandidate, error);
			if (!shouldTryNextProviderKey(error)) break;
		}
	}

	const summary = getProviderKeyPoolSummary(input.providerId);
	const detail = publicProviderFailureReason(lastError);
	if (
		lastError instanceof SpeechAsyncJobTimeoutError ||
		lastError instanceof SpeechProviderRequestError
	) {
		throw lastError;
	}
	throw new Error(
		`${providerLabels[input.providerId]} не распознал фрагмент после ${triedFingerprints.size}/${maxAttempts} попыток; доступных маршрутов ${summary.availableKeyCount}/${summary.configuredKeyCount}. ${detail}. Локальный черновик и очередь повтора сохранены.`,
	);
}

export async function transcribeSpeechChunk(
	input: SpeechChunkUploadInput,
): Promise<SpeechTranscriptionResponse> {
	const gateway = getSpeechGatewayStatus();
	const audio = decodeBase64Audio(input.audioBase64, gateway.maxChunkBytes);
	const localTranscript = input.localTranscript?.trim() ?? "";
	const warnings: string[] = [];
	let transcript = "";
	let confidence: number | null = null;
	let responseStatus: SpeechTranscriptionStatus = "failed";
	let usedProviderId: SpeechGatewayProvider = gateway.providerId;
	let usedProviderLabel = gateway.providerLabel;

	if (!audio.byteLength && localTranscript) {
		transcript = localTranscript;
		responseStatus = "fallback_text";
		warnings.push(
			"Сохранен браузерный или локальный текст без отправки аудио во внешний контур.",
		);
	} else if (!gateway.serverTranscriptionEnabled) {
		transcript = localTranscript;
		responseStatus = "needs_provider_key";
		warnings.push(...gateway.warnings);
		if (!transcript)
			warnings.push(
				"Аудио принято, но серверное распознавание не запущено без доступного источника.",
			);
	} else if (!gateway.serverTranscriptionCurrentlyAvailable) {
		transcript = localTranscript;
		responseStatus = localTranscript ? "fallback_text" : "needs_provider_key";
		warnings.push(...gateway.warnings);
		warnings.push(
			"Аудио не отправлено: сейчас нет доступного источника распознавания или локального модуля; сохраните клиентскую очередь аудио и повторите позже.",
		);
	} else {
		const providerAttempts = gateway.fallbackProviderIds.length
			? gateway.fallbackProviderIds
			: [gateway.providerId];
		for (const providerId of providerAttempts) {
			if (
				!isWiredServerProvider(providerId) &&
				!isLocalSpeechProvider(providerId)
			)
				continue;
			try {
				const providerResult = await transcribeWithProvider({
					providerId,
					audio,
					mimeType: input.mimeType,
					language: input.language,
					specialty: input.specialty ?? null,
					source: input.source,
					warnings,
				});
				usedProviderId = providerId;
				usedProviderLabel = providerLabels[providerId];
				confidence = providerResult.confidence;
				warnings.push(...providerResult.warnings);
				if (providerResult.text) {
					const hallucinationCheck = isHallucinatedTranscript(
						providerResult.text,
					);
					if (hallucinationCheck.hallucinated) {
						warnings.push(
							`Фрагмент распознан как шум и не добавлен в текст (${hallucinationCheck.reason}).`,
						);
						if (localTranscript) {
							transcript = localTranscript;
							responseStatus = "fallback_text";
						} else {
							transcript = "";
							responseStatus = "transcribed";
						}
						break;
					} else {
						transcript = providerResult.text;
						responseStatus = "transcribed";
						break;
					}
				}
				warnings.push(`${providerLabels[providerId]} не вернул текст.`);
				if (localTranscript) {
					transcript = localTranscript;
					responseStatus = "fallback_text";
					break;
				}
			} catch (error) {
				warnings.push(
					publicSpeechProviderFailure(providerLabels[providerId], error),
				);
			}
		}
		if (responseStatus === "failed") {
			transcript = localTranscript;
			responseStatus = localTranscript ? "fallback_text" : "failed";
			if (localTranscript) {
				warnings.push(
					"Локальный текст сохранен, врач может продолжать без блокировки.",
				);
			} else {
				warnings.push(
					"Ни один источник распознавания из резервной цепочки не вернул текст.",
				);
			}
		}
	}

	const quality = buildSpeechTranscriptionQuality({
		transcript,
		confidence,
		status: responseStatus,
		warnings,
		byteLength: audio.byteLength,
		durationMs: input.durationMs ?? null,
		providerLabel: usedProviderLabel,
	});

	const chunk = await recordSpeechTranscriptionChunk({
		recordingId: input.recordingId,
		chunkIndex: input.chunkIndex,
		source: input.source,
		patientId: input.patientId ?? null,
		visitId: input.visitId ?? null,
		providerId: usedProviderId,
		providerLabel: usedProviderLabel,
		mimeType: input.mimeType,
		byteLength: audio.byteLength,
		durationMs: input.durationMs ?? null,
		language: input.language,
		transcript,
		confidence,
		status: responseStatus,
		quality,
		warnings,
		clientRecordedAt: input.clientRecordedAt ?? null,
	});

	return { chunk, gateway };
}
