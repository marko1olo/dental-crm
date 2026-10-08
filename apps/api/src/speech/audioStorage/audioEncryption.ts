import {
	createCipheriv,
	createDecipheriv,
	createHmac,
	randomBytes,
} from "node:crypto";
import type {
	SpeechRecordingAssembly,
	SpeechTranscriptionChunk,
	SpeechTranscriptionQuality,
} from "@dental/shared";
import {
	AUDIO_GCM_AUTH_TAG_LENGTH_BYTES,
	AUDIO_GCM_IV_LENGTH_BYTES,
	AUDIO_MAGIC_HEADER,
	DEFAULT_AUDIO_ENCRYPTION_ALGORITHM,
} from "./constants.js";
import type { EncryptedAudioPayload, SpeechRecordingIdentity } from "./types.js";

/**
 * Деривация 256-битного ключа шифрования организации по 323-ФЗ (Врачебная тайна).
 * Обеспечивает криптографическую изоляцию аудиозаписей между клиниками.
 */
export function deriveTenantAudioKey(
	organizationId: string,
	secretOverride?: string,
): Buffer {
	const masterSecret =
		secretOverride ||
		process.env.DENTAL_AUDIO_MASTER_KEY ||
		process.env.SESSION_SECRET ||
		"dente-crm-speech-audio-master-key-fallback-323fz";
	return createHmac("sha256", masterSecret)
		.update(`tenant-speech-audio-key:${organizationId}`)
		.digest();
}

/**
 * Шифрование аудиопотока/буфера с использованием AES-256-GCM.
 */
export function encryptAudioBuffer(
	buffer: Buffer,
	key: Buffer,
	additionalData?: Buffer,
): EncryptedAudioPayload {
	const iv = randomBytes(AUDIO_GCM_IV_LENGTH_BYTES);
	const cipher = createCipheriv(DEFAULT_AUDIO_ENCRYPTION_ALGORITHM, key, iv);
	if (additionalData) {
		cipher.setAAD(additionalData);
	}
	const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return {
		ciphertext,
		iv,
		authTag,
		algorithm: DEFAULT_AUDIO_ENCRYPTION_ALGORITHM,
	};
}

/**
 * Расшифровка аудиопотока/буфера AES-256-GCM.
 */
export function decryptAudioBuffer(
	payload: EncryptedAudioPayload,
	key: Buffer,
	additionalData?: Buffer,
): Buffer {
	const decipher = createDecipheriv(payload.algorithm, key, payload.iv);
	decipher.setAuthTag(payload.authTag);
	if (additionalData) {
		decipher.setAAD(additionalData);
	}
	return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
}

/**
 * Сериализация зашифрованного контейнера в монолитный бинарный буфер:
 * [Magic (8B) | IV (12B) | AuthTag (16B) | Ciphertext (NB)]
 */
export function packEncryptedAudio(payload: EncryptedAudioPayload): Buffer {
	return Buffer.concat([
		AUDIO_MAGIC_HEADER,
		payload.iv,
		payload.authTag,
		payload.ciphertext,
	]);
}

/**
 * Десериализация монолитного зашифрованного буфера.
 */
export function unpackEncryptedAudio(data: Buffer): EncryptedAudioPayload {
	const minHeaderLength =
		AUDIO_MAGIC_HEADER.length +
		AUDIO_GCM_IV_LENGTH_BYTES +
		AUDIO_GCM_AUTH_TAG_LENGTH_BYTES;
	if (data.length < minHeaderLength) {
		throw new Error("Зашифрованный буфер аудио поврежден: размер меньше заголовка");
	}
	const magic = data.subarray(0, AUDIO_MAGIC_HEADER.length);
	if (!magic.equals(AUDIO_MAGIC_HEADER)) {
		throw new Error("Зашифрованный буфер аудио поврежден: неверный заголовок DENTEAUD");
	}
	let offset = AUDIO_MAGIC_HEADER.length;
	const iv = data.subarray(offset, offset + AUDIO_GCM_IV_LENGTH_BYTES);
	offset += AUDIO_GCM_IV_LENGTH_BYTES;
	const authTag = data.subarray(offset, offset + AUDIO_GCM_AUTH_TAG_LENGTH_BYTES);
	offset += AUDIO_GCM_AUTH_TAG_LENGTH_BYTES;
	const ciphertext = data.subarray(offset);

	return {
		ciphertext: Buffer.from(ciphertext),
		iv: Buffer.from(iv),
		authTag: Buffer.from(authTag),
		algorithm: DEFAULT_AUDIO_ENCRYPTION_ALGORITHM,
	};
}

export function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)));
}

export function countSpeechWords(text: string): number {
	return (
		text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g)?.length ??
		0
	);
}

export function speechChunkQuality(
	chunk: SpeechTranscriptionChunk,
): SpeechTranscriptionQuality {
	const existingQuality = (chunk as Partial<SpeechTranscriptionChunk>).quality;
	if (existingQuality) return existingQuality;

	const transcript = chunk.transcript.replace(/\s+/g, " ").trim();
	const level: SpeechTranscriptionQuality["level"] =
		chunk.status === "failed" ? "failed" : transcript ? "review" : "empty";
	return {
		level,
		confidence: chunk.confidence,
		wordCount: countSpeechWords(transcript),
		charCount: transcript.length,
		durationMs: chunk.durationMs,
		bytesPerSecond: chunk.durationMs
			? Math.round((chunk.byteLength / (chunk.durationMs / 1000)) * 10) / 10
			: null,
		providerWarnings: chunk.warnings.slice(0, 8),
		signals: ["legacy_chunk"],
		nextAction:
			"Проверьте старый фрагмент распознавания: он сохранен до появления метаданных качества.",
	};
}

export function countSpeechQualities(
	chunks: SpeechTranscriptionChunk[],
): SpeechRecordingAssembly["qualityCounts"] {
	const counts = { clear: 0, review: 0, empty: 0, failed: 0 };
	for (const chunk of chunks) {
		counts[speechChunkQuality(chunk).level] += 1;
	}
	return counts;
}

export function speechTranscriptionStatusRank(
	status: SpeechTranscriptionChunk["status"],
): number {
	switch (status) {
		case "transcribed":
			return 4;
		case "fallback_text":
			return 3;
		case "needs_provider_key":
			return 2;
		case "failed":
			return 1;
	}
}

export function speechQualityRank(quality: SpeechTranscriptionQuality): number {
	switch (quality.level) {
		case "clear":
			return 4;
		case "review":
			return 3;
		case "empty":
			return 2;
		case "failed":
			return 1;
	}
}

export function shouldReplaceSpeechTranscriptionChunk(
	existing: SpeechTranscriptionChunk,
	next: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">,
): boolean {
	const existingTranscript = existing.transcript.trim();
	const nextTranscript = next.transcript.trim();
	if (!existingTranscript && nextTranscript) return true;
	if (existingTranscript && !nextTranscript) return false;

	const existingStatusRank = speechTranscriptionStatusRank(existing.status);
	const nextStatusRank = speechTranscriptionStatusRank(next.status);
	if (nextStatusRank !== existingStatusRank)
		return nextStatusRank > existingStatusRank;

	const existingQualityRank = speechQualityRank(speechChunkQuality(existing));
	const nextQualityRank = speechQualityRank(next.quality);
	if (nextQualityRank !== existingQualityRank)
		return nextQualityRank > existingQualityRank;

	return (
		nextTranscript.length > existingTranscript.length &&
		next.status !== "failed"
	);
}

export function speechRecordingIdentityMatches(
	left: SpeechRecordingIdentity,
	right: SpeechRecordingIdentity,
): boolean {
	return (
		left.source === right.source &&
		left.patientId === right.patientId &&
		left.visitId === right.visitId &&
		left.language === right.language
	);
}

/**
 * Чем именно фрагмент не подошёл записи. Без идентификаторов: строка уходит в
 * сообщение об ошибке, а идентификаторы приема и пациента остаются в логе.
 */
export function speechIdentityDivergence(
	owner: SpeechRecordingIdentity,
	next: SpeechRecordingIdentity,
): string {
	const fields = [
		owner.visitId !== next.visitId ? "прием" : "",
		owner.patientId !== next.patientId ? "пациент" : "",
		owner.source !== next.source ? "источник диктовки" : "",
		owner.language !== next.language ? "язык" : "",
	].filter(Boolean);
	return fields.join(", ");
}

export function describeSpeechRecordingIdentity(
	identity: SpeechRecordingIdentity,
): string {
	return `прием ${identity.visitId ?? "не указан"}, пациент ${identity.patientId ?? "не указан"}, источник ${identity.source}, язык ${identity.language}`;
}
