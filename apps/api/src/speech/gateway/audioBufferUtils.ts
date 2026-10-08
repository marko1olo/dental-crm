import {
	numberFromEnv,
	sanitizeProviderErrorMessage,
	SpeechProviderRequestError,
} from "../keyPool.js";
import {
	HALLUCINATION_BLACKLIST,
	SpeechAsyncJobTimeoutError,
	SpeechChunkPayloadError,
} from "./types.js";

/**
 * Returns true if the transcription text looks like a hallucination.
 * Centralised — all providers pass through this before the text is used.
 */
export function isHallucinatedTranscript(text: string): {
	hallucinated: boolean;
	reason: string;
} {
	const trimmed = text.trim();
	if (!trimmed) return { hallucinated: false, reason: "" };

	// Check blacklist
	//
	// БЫЛО: подстрочное сравнение по ВСЕЙ расшифровке. Врач заканчивал
	// полутораминутную диктовку словами «...спасибо за внимание» — одно попадание
	// обнуляло весь корректный текст фрагмента. Галлюцинация Whisper на тишине
	// это ОТДЕЛЬНАЯ короткая фраза, а не вкрапление в осмысленную речь.
	// Сравниваем по полному совпадению нормализованного текста (без концевой
	// пунктуации), что ловит галлюцинации и не режет реальную диктовку.
	const normalized = trimmed
		.toLowerCase()
		.replace(/[.!?,;:\s]+$/g, "")
		.trim();
	for (const entry of HALLUCINATION_BLACKLIST) {
		if (typeof entry === "string") {
			const normalizedEntry = entry
				.toLowerCase()
				.replace(/[.!?,;:\s]+$/g, "")
				.trim();
			// Ловим два случая:
			//  • полное совпадение («Продолжение следует»);
			//  • фраза в начале с коротким «хвостом» — типичная подпись Whisper
			//    вида «Субтитры создавал DimaTorzok» или «Спасибо за просмотр!..».
			// Порог хвоста 24 символа выбран так, чтобы отличить подпись от реальной
			// речи: «Продолжение следует после снятия слепков — второй этап...» имеет
			// осмысленное продолжение длиннее порога и остаётся в тексте приёма.
			const isExact = normalized === normalizedEntry;
			const isDominant =
				normalized.startsWith(normalizedEntry) &&
				normalized.length <= normalizedEntry.length + 24;
			if (isExact || isDominant) {
				return { hallucinated: true, reason: `Blacklisted phrase: "${entry}"` };
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

	// Check for extreme word repetition (same word 5+ times in a row)
	const words = trimmed.split(/\s+/);
	if (words.length >= 5) {
		let runLen = 1;
		for (let i = 1; i < words.length; i++) {
			if (words[i]?.toLowerCase() === words[i - 1]?.toLowerCase()) {
				runLen++;
				if (runLen >= 5) {
					return {
						hallucinated: true,
						reason: `Word repetition loop: "${words[i - 1]}" x${runLen}`,
					};
				}
			} else {
				runLen = 1;
			}
		}
	}

	return { hallucinated: false, reason: "" };
}

export function getMaxChunkBytes(): number {
	return numberFromEnv("DENTAL_SPEECH_MAX_CHUNK_BYTES", 6_000_000);
}

export function speechJsonBodyLimitBytes(): number {
	return Math.ceil(getMaxChunkBytes() * 1.4) + 4096;
}

export function decodeBase64Audio(
	value: string | undefined,
	maxChunkBytes: number,
): Buffer {
	if (!value?.trim()) return Buffer.alloc(0);
	const trimmed = value.trim();

	// Anti-RAM-Hog ceiling: check raw base64 string length BEFORE Buffer.from allocation in V8 heap
	// Base64 encoding expands raw bytes by 4/3. A valid payload cannot exceed Math.ceil(maxChunkBytes * 4 / 3) + 8.
	const maxAllowedBase64Length = Math.ceil((maxChunkBytes * 4) / 3) + 8;
	if (trimmed.length > maxAllowedBase64Length) {
		throw new SpeechChunkPayloadError(
			`Аудиофрагмент слишком большой для текущих настроек (${Math.ceil(
				(trimmed.length * 3) / 4 / 1024 / 1024,
			)} МБ из ${Math.ceil(
				maxChunkBytes / 1024 / 1024,
			)} МБ). Запишите короче или дождитесь отправки очереди.`,
		);
	}

	if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
		throw new SpeechChunkPayloadError(
			"Аудиофрагмент поврежден или передан не как файл записи. Повторите запись либо оставьте текстовый черновик.",
		);
	}
	const buffer = Buffer.from(trimmed, "base64");
	if (buffer.byteLength > maxChunkBytes) {
		throw new SpeechChunkPayloadError(
			`Аудиофрагмент слишком большой для текущих настроек (${Math.ceil(buffer.byteLength / 1024 / 1024)} МБ из ${Math.ceil(
				maxChunkBytes / 1024 / 1024,
			)} МБ). Запишите короче или дождитесь отправки очереди.`,
		);
	}
	return buffer;
}

/**
 * Признаки запроса, который не доехал: обрыв сокета, DNS, сетевой таймаут. Такая
 * ошибка говорит о канале, а не о содержимом задания у провайдера.
 */
export const transientNetworkFailurePattern =
	/fetch failed|network|econnreset|econnrefused|etimedout|timeout|socket|terminated|temporar|dns|enotfound/;

export function looksLikeTransientNetworkFailure(error: unknown): boolean {
	const message = sanitizeProviderErrorMessage(
		error instanceof Error ? error.message : String(error ?? ""),
	).toLowerCase();
	return transientNetworkFailurePattern.test(message);
}

export function speechProviderFailureReason(error: unknown): string {
	if (error instanceof SpeechAsyncJobTimeoutError) {
		return `задание распознавания не завершилось за ${Math.round(error.waitedMs / 1000)} сек. после ${
			error.pollCount
		} опросов; результат этого задания CRM уже не получит, отправьте фрагмент заново`;
	}
	if (error instanceof SpeechProviderRequestError) {
		if (error.timedOut) return "источник распознавания не ответил вовремя";
		if (error.rateLimited || error.statusCode === 429)
			return "источник временно ограничил запросы";
		if (error.statusCode === 401 || error.statusCode === 403)
			return "серверный доступ к источнику отклонен";
		if (error.statusCode && error.statusCode >= 500)
			return "у источника временный сбой";
		if (error.statusCode) return "источник отклонил аудиофрагмент";
	}
	if (looksLikeTransientNetworkFailure(error)) {
		return "нет устойчивого соединения с источником распознавания";
	}
	return "источник распознавания не вернул готовый текст";
}

export function publicSpeechProviderFailure(
	providerLabel: string,
	error: unknown,
): string {
	return `${providerLabel}: ${speechProviderFailureReason(error)}; локальный черновик и очередь повтора сохранены.`;
}

export function publicProviderFailureReason(error: unknown): string {
	return speechProviderFailureReason(error);
}

export function fileNameForMime(mimeType: string): string {
	if (mimeType.includes("ogg")) return "chunk.ogg";
	if (mimeType.includes("wav")) return "chunk.wav";
	if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "chunk.m4a";
	return "chunk.webm";
}

export function normalizeLanguage(value: string): string {
	const lower = value.toLowerCase();
	if (lower.startsWith("ru")) return "ru";
	if (lower.startsWith("en")) return "en";
	return lower.slice(0, 8);
}

export function uniqueNonEmpty(values: string[]): string[] {
	return Array.from(
		new Set(
			values
				.map((value) => sanitizeProviderErrorMessage(value).trim())
				.filter(Boolean),
		),
	);
}

export function countTranscriptWords(text: string): number {
	return (
		text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g)?.length ??
		0
	);
}

export function roundMetric(value: number, digits = 2): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

export function confidenceFromWhisperLogprob(values: number[]): number | null {
	const cleanValues = values.filter((value) => Number.isFinite(value));
	if (!cleanValues.length) return null;
	const averageLogprob =
		cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length;
	return roundMetric(Math.max(0, Math.min(1, Math.exp(averageLogprob))));
}
