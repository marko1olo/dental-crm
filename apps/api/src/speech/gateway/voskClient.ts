import type { DentalSpecialty, SpeechChunkUploadInput } from "@dental/shared";
import { fetchWithProviderTimeout, providerHttpError } from "../keyPool.js";
import { fileNameForMime, normalizeLanguage } from "./audioBufferUtils.js";
import {
	localSpeechApiKey,
	localSpeechTimeoutMs,
	localSpeechTranscribeUrl,
} from "./localBridgeProbe.js";
import type { ProviderTranscript } from "./types.js";

function stringFromRecord(
	record: Record<string, unknown>,
	keys: string[],
): string {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return "";
}

function numberFromUnknown(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function averageConfidence(values: number[]): number | null {
	const filtered = values.filter(
		(value) => Number.isFinite(value) && value >= 0 && value <= 1,
	);
	if (!filtered.length) return null;
	return Math.max(
		0,
		Math.min(
			1,
			filtered.reduce((sum, value) => sum + value, 0) / filtered.length,
		),
	);
}

function textFromVoskPayload(payload: Record<string, unknown>): string {
	const directText = stringFromRecord(payload, [
		"text",
		"transcript",
		"partial",
	]);
	if (directText) return directText;

	const result = payload.result;
	if (result && typeof result === "object" && !Array.isArray(result)) {
		const resultText = stringFromRecord(result as Record<string, unknown>, [
			"text",
			"transcript",
		]);
		if (resultText) return resultText;
	}
	if (Array.isArray(result)) {
		const words = result
			.map((item) =>
				item && typeof item === "object"
					? stringFromRecord(item as Record<string, unknown>, ["word", "text"])
					: "",
			)
			.filter(Boolean);
		if (words.length) return words.join(" ");
	}

	const alternatives = payload.alternatives;
	if (Array.isArray(alternatives)) {
		const alternative = alternatives.find(
			(item) => item && typeof item === "object",
		) as Record<string, unknown> | undefined;
		if (alternative)
			return stringFromRecord(alternative, ["text", "transcript"]);
	}

	return "";
}

function confidenceFromVoskPayload(
	payload: Record<string, unknown>,
): number | null {
	const directConfidence = numberFromUnknown(payload.confidence);
	if (directConfidence !== null)
		return Math.max(0, Math.min(1, directConfidence));

	const result = payload.result;
	if (Array.isArray(result)) {
		return averageConfidence(
			result
				.map((item) =>
					item && typeof item === "object"
						? numberFromUnknown((item as Record<string, unknown>).conf)
						: null,
				)
				.filter((value): value is number => value !== null),
		);
	}

	const alternatives = payload.alternatives;
	if (Array.isArray(alternatives)) {
		return averageConfidence(
			alternatives
				.map((item) =>
					item && typeof item === "object"
						? numberFromUnknown((item as Record<string, unknown>).confidence)
						: null,
				)
				.filter((value): value is number => value !== null),
		);
	}

	return null;
}

function errorMessageFromPayload(
	payload: Record<string, unknown>,
): string | undefined {
	const directError = payload.error;
	if (typeof directError === "string") return directError;
	if (directError && typeof directError === "object") {
		const message = (directError as Record<string, unknown>).message;
		if (typeof message === "string") return message;
	}
	const message = payload.message;
	return typeof message === "string" ? message : undefined;
}

export async function transcribeLocalVoskBridge(input: {
	audio: Buffer;
	mimeType: string;
	language: string;
	specialty?: DentalSpecialty | null;
	source?: SpeechChunkUploadInput["source"];
}): Promise<ProviderTranscript> {
	const endpoint = localSpeechTranscribeUrl("vosk_local");
	if (!endpoint) {
		throw new Error(
			"Локальный модуль Vosk не настроен: укажите адрес локального модуля в серверных настройках клиники.",
		);
	}

	const form = new FormData();
	form.append(
		"file",
		new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
		fileNameForMime(input.mimeType),
	);
	form.append("language", normalizeLanguage(input.language));
	if (input.source) form.append("source", input.source);
	if (input.specialty) form.append("specialty", input.specialty);

	const headers: Record<string, string> = {};
	const apiKey = localSpeechApiKey("vosk_local");
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	const response = await fetchWithProviderTimeout(
		endpoint,
		{
			method: "POST",
			headers,
			body: form,
		},
		localSpeechTimeoutMs(),
	);
	const payload = (await response.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	if (!response.ok) {
		throw providerHttpError(
			response.status,
			response.statusText,
			errorMessageFromPayload(payload),
		);
	}

	const text = textFromVoskPayload(payload);
	return {
		text,
		confidence: confidenceFromVoskPayload(payload),
		warnings: text
			? [
					"Использован локальный модуль Vosk; пунктуацию и стоматологические термины нужно проверить перед подписанием.",
				]
			: [
					"Локальный модуль Vosk не вернул текст; оставьте печатный локальный черновик как восстановление.",
				],
	};
}
