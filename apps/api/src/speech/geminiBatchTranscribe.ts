import type { DentalSpecialty } from "@dental/shared";
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

export interface GeminiWordTimestamp {
	word: string;
	startOffsetMs: number;
	endOffsetMs: number;
	speaker?: string | undefined;
	confidence?: number | null | undefined;
}

export interface GeminiSpeakerSegment {
	speaker: string;
	role?: string | undefined;
	text: string;
	startOffsetMs: number;
	endOffsetMs: number;
	words?: GeminiWordTimestamp[] | undefined;
}

export interface GeminiBatchTranscribeInput {
	audio?: Buffer | Uint8Array | undefined;
	mimeType?: string | undefined;
	fileUri?: string | undefined;
	language?: string | undefined;
	specialty?: DentalSpecialty | null | undefined;
	diarization?: boolean | undefined;
	speakerRoles?: Record<string, string> | undefined;
	wordTimestamps?: boolean | undefined;
	speechBiasing?: string[] | boolean | undefined;
	customPrompt?: string | null | undefined;
	apiKey?: string | undefined;
	timeoutMs?: number | undefined;
}

export interface GeminiBatchTranscribeResult {
	text: string;
	language: string;
	model: string;
	durationMs: number | null;
	segments: GeminiSpeakerSegment[];
	words: GeminiWordTimestamp[];
	speakers: string[];
	confidence: number | null;
	warnings: string[];
	keyFingerprint?: string | undefined;
}

const SUPPORTED_MIME_TYPES = new Set([
	"audio/wav",
	"audio/x-wav",
	"audio/wave",
	"audio/mp3",
	"audio/mpeg",
	"audio/ogg",
	"audio/vorbis",
	"audio/webm",
	"audio/flac",
	"audio/x-flac",
	"audio/aac",
	"audio/m4a",
	"audio/mp4",
]);

export function normalizeAudioMimeType(mimeType?: string | undefined): string {
	if (!mimeType) return "audio/wav";
	const base = mimeType.split(";")[0]?.trim().toLowerCase() || "audio/wav";
	if (SUPPORTED_MIME_TYPES.has(base)) return base;
	if (base.includes("wav")) return "audio/wav";
	if (base.includes("mp3") || base.includes("mpeg")) return "audio/mp3";
	if (base.includes("ogg")) return "audio/ogg";
	if (base.includes("webm")) return "audio/webm";
	if (base.includes("flac")) return "audio/flac";
	if (base.includes("m4a") || base.includes("aac")) return "audio/aac";
	return "audio/wav";
}

function getGeminiBatchModel(): string {
	return (
		process.env.GOOGLE_SPEECH_BATCH_MODEL?.trim() ||
		process.env.GEMINI_BATCH_MODEL?.trim() ||
		process.env.GOOGLE_SPEECH_MODEL?.trim() ||
		"gemini-3.5-transcribe"
	);
}

function geminiBatchTimeoutMs(): number {
	return numberFromEnv("DENTAL_GEMINI_BATCH_TIMEOUT_MS", 120_000);
}

function buildBatchTranscriptionPrompt(input: {
	language: string;
	diarization: boolean;
	wordTimestamps: boolean;
	speakerRoles?: Record<string, string> | undefined;
	speechBiasing?: string[] | boolean | undefined;
	specialty?: DentalSpecialty | null | undefined;
	customPrompt?: string | null | undefined;
}): string {
	const language = input.language || "ru";
	const defaultRoles: Record<string, string> = {
		"Speaker 1": "Врач",
		"Speaker 2": "Пациент",
		"Speaker 3": "Ассистент",
		...input.speakerRoles,
	};

	const roleHints = Object.entries(defaultRoles)
		.map(([spk, role]) => `${spk} (${role})`)
		.join(", ");

	let biasingTerms = "";
	if (Array.isArray(input.speechBiasing) && input.speechBiasing.length > 0) {
		biasingTerms = `\nСтоматологический глоссарий для распознавания: ${input.speechBiasing.join(", ")}.`;
	} else if (input.speechBiasing !== false) {
		const dentalTerms = buildDentalSttPrompt({
			providerId: "google_speech",
			specialty: input.specialty ?? "universal",
			source: "visit",
		});
		if (dentalTerms) {
			biasingTerms = `\nСтоматологический глоссарий: ${dentalTerms}`;
		}
	}

	const promptLines = [
		`Ты — медицинский транскрибатор стоматологической клиники. Выполни высокоточную дословную расшифровку предоставленной аудиозаписи на языке '${language}'.`,
		"КРИТИЧЕСКИЕ ИНВАРИАНТЫ:",
		"1. Запрещены любые галлюцинации, приветствия, рассуждения или добавления от себя.",
		"2. Точно сохраняй клиническую терминологию (формулу зубов FDI 11-48, диагнозы МКБ-10, названия препаратов, поверхностей зубов МОД).",
	];

	if (input.diarization) {
		promptLines.push(
			`3. Диаризация спикеров: раздели реплики участников диалога. Используй роли: ${roleHints}.`,
		);
	}

	if (input.wordTimestamps) {
		promptLines.push(
			"4. Таймкоды слов: укажи точное время начала и окончания каждого произнесенного слова в миллисекундах (startOffsetMs, endOffsetMs).",
		);
	}

	if (biasingTerms) {
		promptLines.push(biasingTerms);
	}

	if (input.customPrompt?.trim()) {
		promptLines.push(`Дополнительные указания врача: ${input.customPrompt.trim()}`);
	}

	promptLines.push(
		"\nОтвет верни СТРОГО в формате JSON без разметки markdown со следующей структурой:",
		JSON.stringify(
			{
				text: "Полный текст расшифровки диалога",
				language,
				durationMs: 12000,
				speakers: ["Speaker 1 (Врач)", "Speaker 2 (Пациент)"],
				segments: [
					{
						speaker: "Speaker 1 (Врач)",
						role: "Врач",
						text: "Здравствуйте, на что жалуетесь?",
						startOffsetMs: 0,
						endOffsetMs: 2500,
						words: [
							{
								word: "Здравствуйте",
								startOffsetMs: 0,
								endOffsetMs: 900,
								speaker: "Speaker 1 (Врач)",
								confidence: 0.98,
							},
						],
					},
				],
				words: [
					{
						word: "Здравствуйте",
						startOffsetMs: 0,
						endOffsetMs: 900,
						speaker: "Speaker 1 (Врач)",
						confidence: 0.98,
					},
				],
			},
			null,
			2,
		),
	);

	return promptLines.join("\n");
}

function parseTimeOffset(val: unknown): number {
	if (typeof val === "number" && Number.isFinite(val)) {
		return Math.max(0, Math.floor(val));
	}
	if (typeof val === "string") {
		// handle "1.5s", "1500ms", "00:01:23.456"
		const str = val.trim();
		if (str.endsWith("ms")) {
			const n = Number.parseFloat(str.slice(0, -2));
			if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
		}
		if (str.endsWith("s")) {
			const n = Number.parseFloat(str.slice(0, -1));
			if (Number.isFinite(n)) return Math.max(0, Math.floor(n * 1000));
		}
		if (str.includes(":")) {
			const parts = str.split(":").map(Number);
			if (parts.length === 2 && parts.every((p) => Number.isFinite(p))) {
				return Math.floor((parts[0]! * 60 + parts[1]!) * 1000);
			}
			if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) {
				return Math.floor(
					(parts[0]! * 3600 + parts[1]! * 60 + parts[2]!) * 1000,
				);
			}
		}
		const direct = Number(str);
		if (Number.isFinite(direct)) return Math.max(0, Math.floor(direct));
	}
	return 0;
}

function parseGeminiBatchResponse(
	rawText: string,
	fallbackLanguage: string,
): {
	text: string;
	language: string;
	durationMs: number | null;
	segments: GeminiSpeakerSegment[];
	words: GeminiWordTimestamp[];
	speakers: string[];
	confidence: number | null;
} {
	let jsonStr = rawText.trim();
	if (jsonStr.startsWith("```")) {
		jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
	}

	try {
		const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
		const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
		const language =
			typeof parsed.language === "string" ? parsed.language : fallbackLanguage;
		const durationMs =
			typeof parsed.durationMs === "number" ? parsed.durationMs : null;

		const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
		const segments: GeminiSpeakerSegment[] = rawSegments.map(
			(seg: Record<string, unknown>) => {
				const segSpeaker =
					typeof seg.speaker === "string"
						? seg.speaker.trim()
						: "Speaker 1 (Врач)";
				const segRole =
					typeof seg.role === "string" ? seg.role.trim() : undefined;
				const segText = typeof seg.text === "string" ? seg.text.trim() : "";
				const startOffsetMs = parseTimeOffset(seg.startOffsetMs ?? seg.start);
				const endOffsetMs = parseTimeOffset(seg.endOffsetMs ?? seg.end);

				const segWordsRaw = Array.isArray(seg.words) ? seg.words : [];
				const segWords: GeminiWordTimestamp[] = segWordsRaw.map(
					(w: Record<string, unknown>) => ({
						word: String(w.word || "").trim(),
						startOffsetMs: parseTimeOffset(w.startOffsetMs ?? w.start),
						endOffsetMs: parseTimeOffset(w.endOffsetMs ?? w.end),
						speaker: typeof w.speaker === "string" ? w.speaker : segSpeaker,
						confidence:
							typeof w.confidence === "number" ? w.confidence : undefined,
					}),
				);

				return {
					speaker: segSpeaker,
					role: segRole,
					text: segText,
					startOffsetMs,
					endOffsetMs,
					words: segWords.length > 0 ? segWords : undefined,
				};
			},
		);

		const rawWords = Array.isArray(parsed.words) ? parsed.words : [];
		let words: GeminiWordTimestamp[] = rawWords.map(
			(w: Record<string, unknown>) => ({
				word: String(w.word || "").trim(),
				startOffsetMs: parseTimeOffset(w.startOffsetMs ?? w.start),
				endOffsetMs: parseTimeOffset(w.endOffsetMs ?? w.end),
				speaker: typeof w.speaker === "string" ? w.speaker : undefined,
				confidence: typeof w.confidence === "number" ? w.confidence : undefined,
			}),
		);

		// If top-level words were not provided, flatten from segments
		if (words.length === 0 && segments.length > 0) {
			for (const seg of segments) {
				if (seg.words && seg.words.length > 0) {
					words.push(...seg.words);
				}
			}
		}

		// Extract unique speakers
		const speakersSet = new Set<string>();
		if (Array.isArray(parsed.speakers)) {
			for (const s of parsed.speakers) {
				if (typeof s === "string" && s.trim()) speakersSet.add(s.trim());
			}
		}
		for (const seg of segments) {
			if (seg.speaker) speakersSet.add(seg.speaker);
		}

		const fullText =
			text || segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");

		return {
			text: fullText,
			language,
			durationMs,
			segments,
			words,
			speakers: Array.from(speakersSet),
			confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
		};
	} catch {
		// Fallback: parse conversational line-by-line speaker headers
		const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
		const segments: GeminiSpeakerSegment[] = [];
		const speakersSet = new Set<string>();
		let totalText = "";

		for (const line of lines) {
			const speakerMatch = line.match(/^([^:]+?):\s*(.+)$/);
			if (speakerMatch && speakerMatch[1] && speakerMatch[2]) {
				const spk = speakerMatch[1].trim();
				const content = speakerMatch[2].trim();
				speakersSet.add(spk);
				segments.push({
					speaker: spk,
					text: content,
					startOffsetMs: 0,
					endOffsetMs: 0,
				});
				totalText += (totalText ? "\n" : "") + line;
			} else {
				totalText += (totalText ? "\n" : "") + line;
			}
		}

		return {
			text: totalText || rawText.trim(),
			language: fallbackLanguage,
			durationMs: null,
			segments,
			words: [],
			speakers: Array.from(speakersSet),
			confidence: null,
		};
	}
}

export async function transcribeGeminiBatch(
	input: GeminiBatchTranscribeInput,
): Promise<GeminiBatchTranscribeResult> {
	if (!input.audio && !input.fileUri) {
		throw new SpeechProviderRequestError(
			"Необходимо передать бинарные данные аудио (audio) или Google File URI (fileUri).",
			{ statusCode: 400, retryable: false },
		);
	}

	const mimeType = normalizeAudioMimeType(input.mimeType);
	const language = input.language || "ru";
	const diarization = input.diarization !== false;
	const wordTimestamps = input.wordTimestamps !== false;
	const timeoutMs = input.timeoutMs ?? geminiBatchTimeoutMs();
	const model = getGeminiBatchModel();

	const systemPrompt = buildBatchTranscriptionPrompt({
		language,
		diarization,
		wordTimestamps,
		speakerRoles: input.speakerRoles,
		speechBiasing: input.speechBiasing,
		specialty: input.specialty,
		customPrompt: input.customPrompt,
	});

	const contentParts: Array<Record<string, unknown>> = [{ text: systemPrompt }];

	if (input.audio) {
		const base64Data = Buffer.isBuffer(input.audio)
			? input.audio.toString("base64")
			: Buffer.from(input.audio).toString("base64");

		contentParts.push({
			inline_data: {
				mime_type: mimeType,
				data: base64Data,
			},
		});
	} else if (input.fileUri) {
		contentParts.push({
			file_data: {
				file_uri: input.fileUri,
				mime_type: mimeType,
			},
		});
	}

	const requestBody = {
		contents: [
			{
				role: "user",
				parts: contentParts,
			},
		],
		generationConfig: {
			temperature: 0.0,
			responseMimeType: "application/json",
		},
	};

	// Key pool rotation or direct API key execution
	if (input.apiKey) {
		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${input.apiKey.trim()}`;
		const response = await fetchWithProviderTimeout(
			endpoint,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			},
			timeoutMs,
		);

		// biome-ignore lint/suspicious/noExplicitAny: JSON parsing from Google API
		const payload = (await response.json().catch(() => ({}))) as any;
		if (!response.ok) {
			throw providerHttpError(
				response.status,
				response.statusText,
				payload?.error?.message || JSON.stringify(payload),
			);
		}

		const candidateText =
			payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
		if (!candidateText) {
			throw new SpeechProviderRequestError(
				`Google Gemini Batch Transcribe вернул пустой результат: ${JSON.stringify(payload)}`,
				{ statusCode: 502, retryable: true },
			);
		}

		const parsed = parseGeminiBatchResponse(candidateText, language);
		return {
			text: parsed.text,
			language: parsed.language,
			model,
			durationMs: parsed.durationMs,
			segments: parsed.segments,
			words: parsed.words,
			speakers: parsed.speakers,
			confidence: parsed.confidence,
			warnings: [],
		};
	}

	// Zero-Downtime Key Pool
	const triedFingerprints = new Set<string>();
	const maxAttempts = Math.max(1, keyRetryLimit("google_speech"));
	let lastError: unknown = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const keyCandidate = selectProviderKey("google_speech", triedFingerprints);
		if (!keyCandidate) break;
		triedFingerprints.add(keyCandidate.fingerprint);

		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${keyCandidate.value}`;
		try {
			const response = await fetchWithProviderTimeout(
				endpoint,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(requestBody),
				},
				timeoutMs,
			);

			// biome-ignore lint/suspicious/noExplicitAny: API json payload
			const payload = (await response.json().catch(() => ({}))) as any;
			if (!response.ok) {
				throw providerHttpError(
					response.status,
					response.statusText,
					payload?.error?.message || JSON.stringify(payload),
				);
			}

			const candidateText =
				payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
			if (!candidateText) {
				throw new SpeechProviderRequestError(
					`Google Gemini Batch Transcribe вернул пустой результат: ${JSON.stringify(payload)}`,
					{ statusCode: 502, retryable: true },
				);
			}

			recordProviderKeySuccess("google_speech", keyCandidate);
			const parsed = parseGeminiBatchResponse(candidateText, language);
			const warnings: string[] = [];
			if (attempt > 0) {
				warnings.push(
					`Google Gemini Batch Transcribe восстановился после резервной попытки N ${attempt + 1}.`,
				);
			}

			return {
				text: parsed.text,
				language: parsed.language,
				model,
				durationMs: parsed.durationMs,
				segments: parsed.segments,
				words: parsed.words,
				speakers: parsed.speakers,
				confidence: parsed.confidence,
				warnings,
				keyFingerprint: keyCandidate.fingerprint,
			};
		} catch (err) {
			lastError = err;
			recordProviderKeyFailure("google_speech", keyCandidate, err);
			if (!shouldTryNextProviderKey(err)) break;
		}
	}

	if (lastError instanceof SpeechProviderRequestError) {
		throw lastError;
	}
	throw new SpeechProviderRequestError(
		`Google Gemini Batch Transcribe не смог расшифровать аудио: ${lastError instanceof Error ? lastError.message : "Ключи не настроены или исчерпали квоту"}`,
		{ statusCode: 503, retryable: true },
	);
}
