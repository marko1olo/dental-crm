import type {
	SpeechRecordingAssembly,
	SpeechRecordingRecoveryItem,
	SpeechRecordingRecoveryList,
	SpeechTranscriptionChunk,
} from "@dental/shared";
import {
	countSpeechQualities,
	speechChunkQuality,
	uniqueStrings,
} from "./audioEncryption.js";
import {
	durableWriteFailureWarningPrefix,
	maxCachedChunksPerRecording,
	maxCachedRecordingCount,
	maxGlobalCachedChunks,
	maxUndurableChunksPerRecording,
	speechChunkKey,
} from "./constants.js";
import type { SpeechRecordingScope } from "./types.js";

// Горячий кэш фрагментов диктовки: живая лента для UI во время записи.
// Долговременное хранение — таблица ai_jobs (kind = voice_transcription).
const speechTranscriptionChunks: SpeechTranscriptionChunk[] = [];

// Ключи фрагментов, чей текст подтверждённо лежит в PostgreSQL. Вытеснять из
// памяти разрешено только их.
const durableChunkKeys = new Set<string>();

let storeWarningsProvider: (() => string[]) | null = null;

export function setSpeechDurableStoreWarningsProvider(
	provider: () => string[],
): void {
	storeWarningsProvider = provider;
}

export function getSpeechTranscriptionChunks(): SpeechTranscriptionChunk[] {
	return speechTranscriptionChunks;
}

export function getDurableChunkKeys(): Set<string> {
	return durableChunkKeys;
}

export function speechChunkMatchesScope(
	chunk: SpeechTranscriptionChunk,
	scope: SpeechRecordingScope = {},
): boolean {
	if (
		scope.organizationId !== undefined &&
		scope.organizationId !== null &&
		chunk.organizationId !== scope.organizationId
	) {
		return false;
	}
	if (scope.patientId !== undefined && chunk.patientId !== scope.patientId)
		return false;
	if (scope.visitId !== undefined && chunk.visitId !== scope.visitId)
		return false;
	if (scope.source !== undefined && chunk.source !== scope.source) return false;
	return true;
}

export function listSpeechTranscriptionChunks(
	recordingId: string,
	scope: SpeechRecordingScope = {},
): SpeechTranscriptionChunk[] {
	const chunks = speechTranscriptionChunks.filter(
		(chunk) =>
			chunk.recordingId === recordingId &&
			speechChunkMatchesScope(chunk, scope),
	);
	return chunks
		.slice()
		.sort(
			(left, right) =>
				left.chunkIndex - right.chunkIndex ||
				left.createdAt.localeCompare(right.createdAt),
		);
}

export function assembleSpeechRecordingFromChunks(
	recordingId: string,
	chunks: SpeechTranscriptionChunk[],
): SpeechRecordingAssembly {
	const receivedChunkIndexes = chunks.map((chunk) => chunk.chunkIndex);
	const maxChunkIndex = receivedChunkIndexes.length
		? Math.max(...receivedChunkIndexes)
		: -1;
	const received = new Set(receivedChunkIndexes);
	const missingChunkIndexes =
		maxChunkIndex >= 0
			? Array.from({ length: maxChunkIndex + 1 }, (_, index) => index).filter(
					(index) => !received.has(index),
				)
			: [];
	const transcript = chunks
		.map((chunk) => chunk.transcript.trim())
		.filter(Boolean)
		.join("\n")
		.trim();
	const providerLabels = uniqueStrings(
		chunks.map((chunk) => chunk.providerLabel),
	);
	const statuses = Array.from(new Set(chunks.map((chunk) => chunk.status)));
	const qualityCounts = countSpeechQualities(chunks);
	const qualityWarnings = chunks
		.map((chunk) => {
			const quality = speechChunkQuality(chunk);
			return quality.level === "clear"
				? ""
				: `Фрагмент ${chunk.chunkIndex + 1}: качество ${quality.level}, ${quality.nextAction}`;
		})
		.filter(Boolean);
	const externalWarnings = storeWarningsProvider ? storeWarningsProvider() : [];
	const warnings = [
		...chunks.flatMap((chunk) => chunk.warnings),
		...qualityWarnings,
		...externalWarnings,
		chunks.length ? "" : "У записи пока нет серверных фрагментов.",
		missingChunkIndexes.length
			? `Нет фрагментов с индексами: ${missingChunkIndexes.join(", ")}.`
			: "",
		chunks.some((chunk) => chunk.status === "failed")
			? "Минимум один фрагмент не распознан."
			: "",
		transcript
			? ""
			: "Текст расшифровки еще не собран; локальный черновик браузера может содержать несинхронизированный текст.",
	].filter(Boolean);

	return {
		recordingId,
		chunkCount: chunks.length,
		receivedChunkIndexes,
		missingChunkIndexes,
		providerLabels,
		statuses,
		qualityCounts,
		transcript,
		warnings: uniqueStrings(warnings).slice(0, 12),
		firstChunkAt: chunks[0]?.createdAt ?? null,
		lastChunkAt: chunks.at(-1)?.createdAt ?? null,
		assembledAt: new Date().toISOString(),
	};
}

export function assembleSpeechRecording(
	recordingId: string,
	scope: SpeechRecordingScope = {},
): SpeechRecordingAssembly {
	return assembleSpeechRecordingFromChunks(
		recordingId,
		listSpeechTranscriptionChunks(recordingId, scope),
	);
}

export function speechRecordingRecoveryFromChunks(
	recordingId: string,
	chunks: SpeechTranscriptionChunk[],
): SpeechRecordingRecoveryItem {
	const sortedChunks = chunks
		.slice()
		.sort(
			(left, right) =>
				left.chunkIndex - right.chunkIndex ||
				left.createdAt.localeCompare(right.createdAt),
		);
	const assembly = assembleSpeechRecordingFromChunks(recordingId, sortedChunks);
	const statusCounts = {
		transcribed: sortedChunks.filter((chunk) => chunk.status === "transcribed")
			.length,
		fallback_text: sortedChunks.filter(
			(chunk) => chunk.status === "fallback_text",
		).length,
		needs_provider_key: sortedChunks.filter(
			(chunk) => chunk.status === "needs_provider_key",
		).length,
		failed: sortedChunks.filter((chunk) => chunk.status === "failed").length,
	};
	const totalDurationMs = sortedChunks.some(
		(chunk) => chunk.durationMs !== null,
	)
		? sortedChunks.reduce((total, chunk) => total + (chunk.durationMs ?? 0), 0)
		: null;
	const totalBytes = sortedChunks.reduce(
		(total, chunk) => total + chunk.byteLength,
		0,
	);
	const qualityCounts = countSpeechQualities(sortedChunks);
	const transcriptPreview = assembly.transcript
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 220);
	const recoveryState =
		assembly.missingChunkIndexes.length > 0
			? "missing_chunks"
			: statusCounts.failed > 0
				? "failed_chunks"
				: assembly.transcript.trim()
					? qualityCounts.review || qualityCounts.empty || qualityCounts.failed
						? "quality_review"
						: "complete"
					: "transcript_empty";
	const nextAction =
		recoveryState === "complete"
			? "Соберите фрагменты в текст визита или оставьте их как источник аудита."
			: recoveryState === "quality_review"
				? "Текст пригоден, но перед подписанием записи проверьте отмеченные фрагменты."
				: recoveryState === "missing_chunks"
					? "Выгрузите локальную очередь речи из IndexedDB, затем соберите запись повторно."
					: recoveryState === "failed_chunks"
						? "Повторите распознавание неудачных фрагментов или сохраните локальный текст как резерв."
						: "Используйте браузерный/локальный текст и детерминированный разбор; в аудио пока нет пригодного текста.";

	return {
		recordingId,
		source: sortedChunks[0]?.source ?? "visit",
		patientId: sortedChunks[0]?.patientId ?? null,
		visitId: sortedChunks[0]?.visitId ?? null,
		chunkCount: sortedChunks.length,
		receivedChunkIndexes: assembly.receivedChunkIndexes,
		missingChunkIndexes: assembly.missingChunkIndexes,
		statusCounts,
		qualityCounts,
		providerLabels: assembly.providerLabels,
		transcriptPreview,
		transcriptCharCount: assembly.transcript.length,
		totalDurationMs,
		totalBytes,
		firstChunkAt: assembly.firstChunkAt,
		lastChunkAt: assembly.lastChunkAt,
		recoveryState,
		nextAction,
		warnings: assembly.warnings,
	};
}

export function listSpeechRecordingRecoveries(
	input: {
		organizationId?: string | null;
		visitId?: string | null;
		patientId?: string | null;
		limit?: number | null;
	} = {},
): SpeechRecordingRecoveryList {
	const grouped = new Map<string, SpeechTranscriptionChunk[]>();
	for (const chunk of speechTranscriptionChunks) {
		if (
			input.organizationId !== undefined &&
			input.organizationId !== null &&
			chunk.organizationId !== input.organizationId
		) {
			continue;
		}
		if (input.visitId && chunk.visitId !== input.visitId) continue;
		if (input.patientId && chunk.patientId !== input.patientId) continue;
		const chunks = grouped.get(chunk.recordingId) ?? [];
		chunks.push(chunk);
		grouped.set(chunk.recordingId, chunks);
	}

	const recordings = Array.from(grouped.entries())
		.map(([recordingId, chunks]) =>
			speechRecordingRecoveryFromChunks(recordingId, chunks),
		)
		.sort((left, right) =>
			(right.lastChunkAt ?? "").localeCompare(left.lastChunkAt ?? ""),
		)
		.slice(0, Math.max(1, Math.min(input.limit ?? 50, 200)));

	return {
		recordings,
		totalRecordings: grouped.size,
		generatedAt: new Date().toISOString(),
	};
}

/**
 * Вытеснение из горячего кэша.
 */
export function trimSpeechTranscriptionChunkRetention(): void {
	const chunkCap = maxCachedChunksPerRecording();
	const recordingCap = maxCachedRecordingCount();
	const undurableChunkCap = maxUndurableChunksPerRecording();
	const globalChunkCap = maxGlobalCachedChunks();
	const retainedByOrganization = new Map<string, Set<string>>();
	for (const chunk of speechTranscriptionChunks) {
		const retained =
			retainedByOrganization.get(chunk.organizationId) ?? new Set<string>();
		if (!retained.has(chunk.recordingId) && retained.size >= recordingCap)
			continue;
		retained.add(chunk.recordingId);
		retainedByOrganization.set(chunk.organizationId, retained);
	}

	const keptPerRecording = new Map<string, number>();
	const keptChunks: SpeechTranscriptionChunk[] = [];
	for (const chunk of speechTranscriptionChunks) {
		const count = keptPerRecording.get(chunk.recordingId) ?? 0;
		const overCap =
			!retainedByOrganization
				.get(chunk.organizationId)
				?.has(chunk.recordingId) || count >= chunkCap;

		// Anti-RAM-Hog ceiling: even if undurable, never exceed undurableChunkCap per recording
		// or globalChunkCap across entire process, preventing catastrophic OOM under DB outage
		const hardOverCap =
			count >= undurableChunkCap || keptChunks.length >= globalChunkCap;

		if (
			(overCap &&
			durableChunkKeys.has(speechChunkKey(chunk.recordingId, chunk.chunkIndex))) ||
			hardOverCap
		) {
			continue;
		}
		keptPerRecording.set(chunk.recordingId, count + 1);
		keptChunks.push(chunk);
	}
	speechTranscriptionChunks.splice(
		0,
		speechTranscriptionChunks.length,
		...keptChunks,
	);

	const liveKeys = new Set(
		keptChunks.map((chunk) =>
			speechChunkKey(chunk.recordingId, chunk.chunkIndex),
		),
	);
	for (const key of durableChunkKeys) {
		if (!liveKeys.has(key)) durableChunkKeys.delete(key);
	}
}

/**
 * Сколько фрагментов диктовки держится в памяти без подтверждения записи в базу.
 * Изолировано по организации: врач клиники А не видит счётчики клиники Б.
 */
export function undurableCachedChunkCount(organizationId?: string): number {
	let count = 0;
	for (const chunk of speechTranscriptionChunks) {
		if (organizationId && chunk.organizationId !== organizationId) continue;
		if (
			!durableChunkKeys.has(speechChunkKey(chunk.recordingId, chunk.chunkIndex))
		)
			count += 1;
	}
	return count;
}

/**
 * Отклонённый фрагмент убирается из горячего кэша.
 */
export function forgetCachedSpeechChunk(chunk: SpeechTranscriptionChunk): void {
	const index = speechTranscriptionChunks.findIndex(
		(cached) => cached.id === chunk.id,
	);
	if (index >= 0) speechTranscriptionChunks.splice(index, 1);
}

export function clearCachedDurableFailureWarnings(
	recordingId: string,
	organizationId?: string,
): void {
	for (const chunk of speechTranscriptionChunks) {
		if (chunk.recordingId !== recordingId) continue;
		if (organizationId && chunk.organizationId !== organizationId) continue;
		if (
			!chunk.warnings.some((warning) =>
				warning.startsWith(durableWriteFailureWarningPrefix),
			)
		)
			continue;
		chunk.warnings = chunk.warnings.filter(
			(warning) => !warning.startsWith(durableWriteFailureWarningPrefix),
		);
	}
}

export function trimSpeechTranscriptionChunkRetentionForTesting(): void {
	trimSpeechTranscriptionChunkRetention();
}

export function getUndurableCachedChunkCountForTesting(
	organizationId?: string,
): number {
	return undurableCachedChunkCount(organizationId);
}

export function seedSpeechTranscriptionChunkForTesting(
	chunk: SpeechTranscriptionChunk,
	durable = false,
): void {
	speechTranscriptionChunks.push(chunk);
	if (durable) {
		durableChunkKeys.add(speechChunkKey(chunk.recordingId, chunk.chunkIndex));
	}
}

export function resetSpeechRetentionCache(): void {
	speechTranscriptionChunks.length = 0;
	durableChunkKeys.clear();
}
