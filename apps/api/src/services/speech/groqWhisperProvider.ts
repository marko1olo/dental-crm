/**
 * @file apps/api/src/services/speech/groqWhisperProvider.ts
 * @description Dedicated Groq Whisper SOTA speech-to-text provider with keyPool rotation,
 * dental glossary prompt biasing, silence detection, hallucination guard, and phonetic postprocessing.
 */

import { Buffer } from "node:buffer";
import type { DentalSpecialty } from "@dental/shared";
import { postProcessDentalSpeech, type DentalSpeechReplacementItem } from "@dental/shared";
import { buildDentalSttPrompt } from "../../speech/dentalPrompt.js";
import {
	fetchWithProviderTimeout,
	keyRetryLimit,
	providerHttpError,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	shouldTryNextProviderKey,
	SpeechProviderRequestError,
} from "../../speech/keyPool.js";
import { isHallucinatedWhisperTranscript } from "../../speech/whisperCascade.js";

export const DEFAULT_GROQ_WHISPER_MODEL = "whisper-large-v3-turbo";
export const GROQ_WHISPER_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";

interface GroqWhisperApiResponse {
	text?: unknown;
	confidence?: unknown;
	error?: {
		message?: string;
	};
}

export interface GroqWhisperOptions {
	readonly audio: Buffer | Uint8Array;
	readonly mimeType?: string | undefined;
	readonly language?: string | undefined;
	readonly model?: string | undefined;
	readonly specialty?: DentalSpecialty | null | undefined;
	readonly customPrompt?: string | null | undefined;
	readonly timeoutMs?: number | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly explicitApiKey?: string | undefined;
}

export interface GroqWhisperResult {
	readonly text: string;
	readonly rawText: string;
	readonly confidence: number | null;
	readonly model: string;
	readonly keyFingerprint?: string | undefined;
	readonly corrections: readonly DentalSpeechReplacementItem[];
	readonly isSilent: boolean;
	readonly durationMs: number;
}

function resolveAudioFileName(mimeType?: string): string {
	const base = mimeType?.split(";")[0]?.toLowerCase() || "";
	if (base.includes("wav")) return "speech.wav";
	if (base.includes("mp3") || base.includes("mpeg")) return "speech.mp3";
	if (base.includes("ogg")) return "speech.ogg";
	if (base.includes("webm")) return "speech.webm";
	if (base.includes("flac")) return "speech.flac";
	if (base.includes("m4a") || base.includes("aac")) return "speech.m4a";
	return "speech.wav";
}

/**
 * Executes high-accuracy dental speech transcription via Groq Whisper API.
 * Uses GROQ_API_KEYS pool from keyPool, applies dental prompt, and runs phonetic postprocessing.
 */
export async function transcribeWithGroqWhisper(options: GroqWhisperOptions): Promise<GroqWhisperResult> {
	const startTime = Date.now();

	const audioBuf = Buffer.isBuffer(options.audio)
		? options.audio
		: Buffer.from(options.audio);

	// Silence and empty chunk guard
	if (!audioBuf || audioBuf.byteLength < 44) {
		return {
			text: "",
			rawText: "",
			confidence: null,
			model: options.model || DEFAULT_GROQ_WHISPER_MODEL,
			corrections: [],
			isSilent: true,
			durationMs: Date.now() - startTime,
		};
	}

	const mimeType = options.mimeType || "audio/wav";
	const language = options.language || "ru";
	const model =
		options.model ||
		process.env.GROQ_WHISPER_MODEL?.trim() ||
		DEFAULT_GROQ_WHISPER_MODEL;
	const timeoutMs = options.timeoutMs ?? 30_000;
	const fetchFn = options.fetchFn ?? fetchWithProviderTimeout;

	// Dental Glossary Prompt biasing (max ~850 chars for Whisper prompt)
	const dentalPrompt =
		options.customPrompt?.trim() ||
		buildDentalSttPrompt({
			providerId: "groq_whisper",
			specialty: options.specialty ?? "universal",
			source: "visit",
		}) ||
		"Стоматологическая терминология DENTE, зубная формула FDI 11-48, коффердам, апекслокатор, Biodentine, Reciproc Blue, вертипреп / Vertiprep, BOPT.";

	const triedFingerprints = new Set<string>();
	const maxAttempts = options.explicitApiKey
		? 1
		: Math.max(1, keyRetryLimit("groq_whisper"));
	let lastError: unknown = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const keyCandidate = options.explicitApiKey
			? {
					value: options.explicitApiKey,
					fingerprint: "explicit",
					source: "config" as const,
					ordinal: 1,
				}
			: selectProviderKey("groq_whisper", triedFingerprints);

		if (!keyCandidate) break;
		triedFingerprints.add(keyCandidate.fingerprint);

		const form = new FormData();
		form.append(
			"file",
			new Blob([new Uint8Array(audioBuf)], { type: mimeType }),
			resolveAudioFileName(mimeType),
		);
		form.append("model", model);
		form.append("language", language);
		form.append("response_format", "json");
		if (dentalPrompt) {
			form.append("prompt", dentalPrompt);
		}

		try {
			const response = await fetchFn(
				GROQ_WHISPER_ENDPOINT,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${keyCandidate.value}`,
					},
					body: form,
				},
				timeoutMs,
			);

			const rawJson: unknown = await response.json().catch(() => ({}));
			const payload =
				typeof rawJson === "object" && rawJson !== null
					? (rawJson as GroqWhisperApiResponse)
					: undefined;
			if (!response.ok) {
				throw providerHttpError(
					response.status,
					response.statusText,
					payload?.error?.message,
				);
			}

			const rawText =
				typeof payload?.text === "string" ? payload.text.trim() : "";

			if (!options.explicitApiKey) {
				recordProviderKeySuccess("groq_whisper", keyCandidate);
			}

			// Empty or silence check
			if (!rawText) {
				return {
					text: "",
					rawText: "",
					confidence: null,
					model,
					keyFingerprint: keyCandidate.fingerprint,
					corrections: [],
					isSilent: true,
					durationMs: Date.now() - startTime,
				};
			}

			// Hallucination detection
			const hallucination = isHallucinatedWhisperTranscript(rawText);
			if (hallucination.hallucinated) {
				return {
					text: "",
					rawText,
					confidence: null,
					model,
					keyFingerprint: keyCandidate.fingerprint,
					corrections: [],
					isSilent: true,
					durationMs: Date.now() - startTime,
				};
			}

			// SOTA Phonetic Dental Normalization
			const postProcessed = postProcessDentalSpeech(rawText);

			return {
				text: postProcessed.text,
				rawText,
				confidence:
					typeof payload?.confidence === "number" ? payload.confidence : null,
				model,
				keyFingerprint: keyCandidate.fingerprint,
				corrections: postProcessed.replacements,
				isSilent: false,
				durationMs: Date.now() - startTime,
			};
		} catch (err) {
			lastError = err;
			if (!options.explicitApiKey) {
				recordProviderKeyFailure("groq_whisper", keyCandidate, err);
			}
			if (!shouldTryNextProviderKey(err)) break;
		}
	}

	if (lastError instanceof SpeechProviderRequestError) throw lastError;
	throw new SpeechProviderRequestError(
		`Groq Whisper STT failed: ${lastError instanceof Error ? lastError.message : "All keys exhausted or invalid request"}`,
		{ statusCode: 503, retryable: true },
	);
}

export class GroqWhisperProvider {
	public readonly providerId = "groq_whisper" as const;
	public readonly defaultModel = DEFAULT_GROQ_WHISPER_MODEL;

	public async transcribe(options: GroqWhisperOptions): Promise<GroqWhisperResult> {
		return transcribeWithGroqWhisper(options);
	}
}
