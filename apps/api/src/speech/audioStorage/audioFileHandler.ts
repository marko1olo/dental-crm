import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import {
	type SpeechTranscriptionChunk,
	speechTranscriptionChunkSchema,
} from "@dental/shared";
import {
	ALLOWED_SPEECH_AUDIO_MIME_TYPES,
	MAX_AUDIO_CHUNK_FILE_BYTES,
	durableWriteFailureWarningPrefix,
} from "./constants.js";
import {
	type DurableEnvelopeRead,
	SpeechDurableEnvelopeUnreadableError,
} from "./types.js";

/**
 * Записи по одной recordingId сохраняются строго по очереди: конверт всегда
 * собирается из актуального состояния кэша, поэтому параллельные запросы не
 * могут затереть чужой фрагмент более старым снимком. Запись из карты удаляется,
 * как только цепочка опустела, — таймеров и подписок нет, утечки нет.
 */
const speechRecordingWriteChains = new Map<string, Promise<void>>();

export function queueDurableRecordingWrite(
	recordingId: string,
	task: () => Promise<void>,
): Promise<void> {
	const previous =
		speechRecordingWriteChains.get(recordingId) ?? Promise.resolve();
	const started = previous.then(task, task);
	const tracked: Promise<void> = started.then(
		() => {
			if (speechRecordingWriteChains.get(recordingId) === tracked)
				speechRecordingWriteChains.delete(recordingId);
		},
		() => {
			if (speechRecordingWriteChains.get(recordingId) === tracked)
				speechRecordingWriteChains.delete(recordingId);
		},
	);
	speechRecordingWriteChains.set(recordingId, tracked);
	return started;
}

export function clearSpeechRecordingWriteChainsForTesting(): void {
	speechRecordingWriteChains.clear();
}

export function readDurableEnvelope(
	recordingId: string,
	rawEnvelope: string | null,
): DurableEnvelopeRead {
	if (!rawEnvelope) return { chunks: [], unreadableChunks: [] };
	let parsed: { chunks?: unknown; unreadableChunks?: unknown };
	try {
		parsed = JSON.parse(rawEnvelope) as {
			chunks?: unknown;
			unreadableChunks?: unknown;
		};
	} catch (error) {
		throw new SpeechDurableEnvelopeUnreadableError(
			recordingId,
			error instanceof Error ? error.message : "не разбирается как JSON",
		);
	}
	if (!Array.isArray(parsed.chunks)) {
		throw new SpeechDurableEnvelopeUnreadableError(
			recordingId,
			"в конверте нет массива фрагментов",
		);
	}
	const chunks: SpeechTranscriptionChunk[] = [];
	const unreadableChunks: unknown[] = Array.isArray(parsed.unreadableChunks)
		? [...parsed.unreadableChunks]
		: [];
	for (const candidate of parsed.chunks) {
		const chunk = speechTranscriptionChunkSchema.safeParse(candidate);
		if (chunk.success) chunks.push(chunk.data);
		else unreadableChunks.push(candidate);
	}
	return { chunks, unreadableChunks };
}

/**
 * Предупреждение «фрагмент не сохранен в базу» описывает состояние памяти, а не
 * содержимое строки. Попав в конверт удавшейся записи, оно становится ложью,
 * которую потом никто не снимет. Из конверта оно вырезается.
 */
export function withoutDurableFailureWarnings(
	chunks: SpeechTranscriptionChunk[],
): SpeechTranscriptionChunk[] {
	return chunks.map((chunk) =>
		chunk.warnings.some((warning) =>
			warning.startsWith(durableWriteFailureWarningPrefix),
		)
			? {
					...chunk,
					warnings: chunk.warnings.filter(
						(warning) => !warning.startsWith(durableWriteFailureWarningPrefix),
					),
				}
			: chunk,
	);
}

/**
 * Валидация MIME-типа аудиофайла диктовки.
 */
export function validateAudioMimeType(mimeType: string): boolean {
	const normalized = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
	return (ALLOWED_SPEECH_AUDIO_MIME_TYPES as readonly string[]).includes(normalized);
}

/**
 * Валидация размера бинарного буфера аудио.
 */
export function validateAudioBuffer(
	buffer: Buffer,
	maxBytes: number = MAX_AUDIO_CHUNK_FILE_BYTES,
): void {
	if (!buffer || buffer.length === 0) {
		throw new Error("Аудиофайл пуст (0 байт)");
	}
	if (buffer.length > maxBytes) {
		throw new Error(
			`Размер аудиофайла (${buffer.length} байт) превышает допустимый лимит (${maxBytes} байт)`,
		);
	}
}

/**
 * Безопасный путь к аудиофайлу в хранилище с защитой от directory traversal.
 */
export function buildSecureAudioStoragePath(
	baseDir: string,
	organizationId: string,
	recordingId: string,
	extension = ".webm",
): string {
	const sanitizedOrg = organizationId.replace(/[^a-zA-Z0-9_-]/g, "");
	const sanitizedRec = recordingId.replace(/[^a-zA-Z0-9_-]/g, "");
	const sanitizedExt = extension.replace(/[^a-zA-Z0-9.]/g, "");
	const targetPath = path.resolve(
		baseDir,
		sanitizedOrg,
		`${sanitizedRec}${sanitizedExt}`,
	);
	const resolvedBase = path.resolve(baseDir);
	if (!targetPath.startsWith(resolvedBase)) {
		throw new Error("Недопустимый путь к файлу: попытка выхода за пределы хранилища");
	}
	return targetPath;
}

/**
 * Потоковое сохранение аудиофайла на диск.
 */
export async function saveAudioStreamToFile(
	sourceStream: Readable,
	targetPath: string,
): Promise<{ byteLength: number; checksumSha256: string }> {
	await fs.mkdir(path.dirname(targetPath), { recursive: true });
	const hash = createHash("sha256");
	let byteLength = 0;

	sourceStream.on("data", (chunk: Buffer) => {
		byteLength += chunk.length;
		hash.update(chunk);
	});

	const writeStream = createWriteStream(targetPath);
	await pipeline(sourceStream, writeStream);

	return {
		byteLength,
		checksumSha256: hash.digest("hex"),
	};
}

/**
 * Безопасное чтение аудиофайла.
 */
export async function readAudioFileBuffer(filePath: string): Promise<Buffer> {
	return await fs.readFile(filePath);
}
