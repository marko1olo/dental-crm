import type { SpeechTranscriptionChunk } from "@dental/shared";

/**
 * Фрагмент не принадлежит этой записи диктовки. Причина называется полями
 * («другой прием», «другой пациент»), но БЕЗ идентификаторов: сообщение может
 * уйти наружу, а врачу роут отдаёт свой текст.
 */
export class SpeechChunkIdentityConflictError extends Error {
	readonly statusCode = 409;
	constructor(detail?: string) {
		super(
			detail
				? `Фрагмент принадлежит другой записи: ${detail}`
				: "Фрагмент принадлежит другой записи",
		);
		this.name = "SpeechChunkIdentityConflictError";
	}
}

/**
 * Диктовка без пациента и без приема не привязывается ни к какой клинике.
 * Раньше в этом случае бралась первая попавшаяся строка organizations, а если
 * таблица пуста — вообще случайный UUID. В базе две организации, то есть текст
 * приема одной клиники мог быть записан на другую. Лучше отказать врачу явно,
 * чем принять медицинский текст, который некуда положить.
 */
export class SpeechChunkOrganizationScopeError extends Error {
	readonly statusCode = 400;
	constructor() {
		super(
			"Диктовка не принята: не указан ни пациент, ни прием, поэтому клиника фрагмента не определяется.",
		);
		this.name = "SpeechChunkOrganizationScopeError";
	}
}

/**
 * Конверт сохранённой записи не читается вообще (не JSON или в нём нет массива
 * фрагментов). Сливать с ним нечего, а перезаписывать его нельзя: под ним лежит
 * медицинский текст. Поэтому запись падает громко, фрагмент остаётся в памяти с
 * предупреждением, а строка в базе не трогается.
 */
export class SpeechDurableEnvelopeUnreadableError extends Error {
	constructor(recordingId: string, reason: string) {
		super(
			`Конверт записи ${recordingId} не читается (${reason}); перезапись отменена, чтобы не потерять сохранённый текст.`,
		);
		this.name = "SpeechDurableEnvelopeUnreadableError";
	}
}

export type SpeechRecordingEnvelope = {
	envelopeVersion: number;
	recordingId: string;
	chunks: SpeechTranscriptionChunk[];
	/**
	 * Записи конверта, которые не прошли проверку схемы фрагмента. Они переносятся
	 * в новый конверт как есть: перезапись не имеет права выбрасывать
	 * продиктованный текст только потому, что не смогла его разобрать. В горячий
	 * кэш такие записи не попадают — роуты чтения парсят полный
	 * speechTranscriptionChunkSchema и на неполном фрагменте отдали бы 500.
	 */
	unreadableChunks?: unknown[];
};

export type SpeechRecordingScope = {
	/** Tenant gate. Routes must pass verified organizationId; null/omit is legacy-only. */
	organizationId?: string | null;
	patientId?: string | null;
	visitId?: string | null;
	source?: SpeechTranscriptionChunk["source"] | null;
};

/**
 * Личность записи диктовки: чей прием, чей пациент, откуда диктуют и на каком
 * языке. Все фрагменты одной recordingId обязаны совпадать по всем четырём
 * полям, иначе в одной строке ai_jobs окажется медицинский текст двух приемов.
 */
export type SpeechRecordingIdentity = Pick<
	SpeechTranscriptionChunk,
	"source" | "patientId" | "visitId" | "language"
>;

export type DurableEnvelopeRead = {
	chunks: SpeechTranscriptionChunk[];
	unreadableChunks: unknown[];
};

export type SpeechDurableRestoreState = {
	failureReason: string | null;
	failedAttempts: number;
	unreadableRows: number;
	nextRetryAt: string | null;
	loadedRecordings: number;
	skippedRecordings: number;
	cachedChunks: number;
	cachedChars: number;
};

/**
 * Метаданные аудиофайла диктовки или фрагмента речи на физическом носителе.
 */
export type AudioFileMetadata = {
	id: string;
	recordingId: string;
	chunkIndex?: number;
	mimeType: string;
	byteLength: number;
	durationMs?: number | null;
	format?: "wav" | "webm" | "opus" | "ogg" | "unknown";
	checksumSha256?: string;
	organizationId: string;
	createdAt: string;
};

/**
 * Зашифрованный контейнер аудио (AES-256-GCM по 323-ФЗ)
 */
export type EncryptedAudioPayload = {
	ciphertext: Buffer;
	iv: Buffer;
	authTag: Buffer;
	algorithm: "aes-256-gcm";
	keyId?: string;
};

/**
 * Результат сохранения аудиофайла в безопасном хранилище.
 */
export type AudioStorageResult = {
	storagePath: string;
	byteLength: number;
	checksumSha256: string;
	encrypted: boolean;
};

/**
 * Опции для потокового чтения аудиозаписи.
 */
export type AudioReadStreamOptions = {
	start?: number;
	end?: number;
};
