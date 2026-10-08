import { randomUUID } from "node:crypto";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { transactionStorage } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { aiJobs, patients, visits } from "../../db/schema.js";
import {
	describeSpeechRecordingIdentity,
	shouldReplaceSpeechTranscriptionChunk,
	speechChunkQuality,
	speechIdentityDivergence,
	speechRecordingIdentityMatches,
	uniqueStrings,
} from "./audioEncryption.js";
import {
	clearSpeechRecordingWriteChainsForTesting,
	queueDurableRecordingWrite,
	readDurableEnvelope,
	withoutDurableFailureWarnings,
} from "./audioFileHandler.js";
import {
	durableEnvelopeVersion,
	durableRecordingJobKind,
	durableRecordingPath,
	durableRecordingPathPrefix,
	durableSourceLabelPrefix,
	durableWriteFailureWarningPrefix,
	maxCachedRecordingCount,
	maxRestoredChunkCount,
	maxRestoredRecordingCount,
	maxRestoredTranscriptChars,
	numberFromEnv,
	speechChunkKey,
	unknownConfidenceColumnValue,
} from "./constants.js";
import {
	assembleSpeechRecordingFromChunks,
	clearCachedDurableFailureWarnings,
	forgetCachedSpeechChunk,
	getDurableChunkKeys,
	getSpeechTranscriptionChunks,
	listSpeechTranscriptionChunks,
	resetSpeechRetentionCache,
	setSpeechDurableStoreWarningsProvider,
	speechRecordingRecoveryFromChunks,
	trimSpeechTranscriptionChunkRetention,
	undurableCachedChunkCount,
} from "./retentionPolicy.js";
import {
	type DurableEnvelopeRead,
	type SpeechDurableRestoreState,
	SpeechChunkIdentityConflictError,
	SpeechChunkOrganizationScopeError,
	type SpeechRecordingEnvelope,
} from "./types.js";

let speechRestorePromise: Promise<void> | null = null;
let speechRestoreFailure: string | null = null;
let speechRestoreFailedAttempts = 0;
let speechRestoreRetryAtMs = 0;
let speechRestoreUnreadableRows = 0;
let speechRestoreSkippedRecordings = 0;
let speechRestoreLoadedRecordings = 0;
let speechRestoreCachedChunkCount = 0;
let speechRestoreCachedCharCount = 0;

export function speechRestoreBackoffMs(): number {
	const base = numberFromEnv("DENTAL_SPEECH_RESTORE_RETRY_MS", 5000);
	return base * 2 ** Math.min(Math.max(speechRestoreFailedAttempts - 1, 0), 6);
}

export function speechDurableStoreWarnings(): string[] {
	const warnings: string[] = [];
	if (speechRestoreFailure) {
		warnings.push(
			`Расшифровки не восстановлены из базы (${speechRestoreFailure}); неудачных попыток: ${speechRestoreFailedAttempts}; список может быть неполным.`,
		);
	}
	if (speechRestoreUnreadableRows > 0) {
		warnings.push(
			`Конверты ${speechRestoreUnreadableRows} записей диктовки не прочитаны; их фрагменты не восстановлены в память, но в базе не тронуты.`,
		);
	}
	if (speechRestoreSkippedRecordings > 0) {
		warnings.push(
			`Записей диктовки, не поднятых в память из-за общего предела памяти сервера: ${speechRestoreSkippedRecordings} (в памяти ${speechRestoreCachedChunkCount} фрагментов, ${speechRestoreCachedCharCount} символов). Их текст в базе не тронут, но в живом списке фрагментов появится только с очередным фрагментом той же записи.`,
		);
	}
	return warnings;
}

// Регистрируем провайдер предупреждений хранилища в модуле политик удержания
setSpeechDurableStoreWarningsProvider(speechDurableStoreWarnings);

export function speechDurableRestoreState(): SpeechDurableRestoreState {
	return {
		failureReason: speechRestoreFailure,
		failedAttempts: speechRestoreFailedAttempts,
		unreadableRows: speechRestoreUnreadableRows,
		nextRetryAt:
			speechRestoreRetryAtMs > 0
				? new Date(speechRestoreRetryAtMs).toISOString()
				: null,
		loadedRecordings: speechRestoreLoadedRecordings,
		skippedRecordings: speechRestoreSkippedRecordings,
		cachedChunks: speechRestoreCachedChunkCount,
		cachedChars: speechRestoreCachedCharCount,
	};
}

export async function resolveSpeechChunkOrganizationId(scope: {
	patientId?: string | null;
	visitId?: string | null;
}): Promise<string> {
	if (scope.visitId) {
		const visitId = scope.visitId;
		const [visit] = await withSuperuserBypass(async (tx) =>
			tx
				.select({ organizationId: visits.organizationId })
				.from(visits)
				.where(eq(visits.id, visitId))
				.limit(1),
		);
		if (visit?.organizationId) return visit.organizationId;
	}
	if (scope.patientId) {
		const patientId = scope.patientId;
		const [patient] = await withSuperuserBypass(async (tx) =>
			tx
				.select({ organizationId: patients.organizationId })
				.from(patients)
				.where(eq(patients.id, patientId))
				.limit(1),
		);
		if (patient?.organizationId) return patient.organizationId;
	}
	throw new SpeechChunkOrganizationScopeError();
}

export function speechRecordingJobStatus(
	chunks: SpeechTranscriptionChunk[],
): "queued" | "needs_review" | "failed" {
	if (chunks.some((chunk) => chunk.status === "needs_provider_key"))
		return "queued";
	if (chunks.length > 0 && chunks.every((chunk) => chunk.status === "failed"))
		return "failed";
	return "needs_review";
}

export function speechRecordingConfidence(
	chunks: SpeechTranscriptionChunk[],
): number | null {
	const values = chunks
		.map((chunk) => chunk.confidence)
		.filter(
			(confidence): confidence is number => typeof confidence === "number",
		);
	if (values.length === 0) return null;
	return values.reduce((total, value) => total + value, 0) / values.length;
}

export function speechConfidenceDisclosures(
	chunks: SpeechTranscriptionChunk[],
	confidence: number | null,
): string[] {
	if (confidence === null) {
		return [
			"Уверенность распознавания не сообщена ни одним фрагментом: ноль в поле confidence означает отсутствие оценки, а не нулевую уверенность.",
		];
	}
	const reported = chunks.filter(
		(chunk) => typeof chunk.confidence === "number",
	).length;
	if (reported < chunks.length) {
		return [
			`Уверенность распознавания известна только для ${reported} из ${chunks.length} фрагментов, среднее посчитано по ним.`,
		];
	}
	return [];
}

export function durableRecordingTarget(
	source: SpeechTranscriptionChunk["source"],
): "visit_note" | "patient_import" | "document_draft" {
	switch (source) {
		case "visit":
			return "visit_note";
		case "import":
			return "patient_import";
		case "document":
			return "document_draft";
		case "settings_lab":
			return "document_draft";
	}
}

export async function loadDurableRecordingEnvelope(
	recordingId: string,
	organizationId: string,
): Promise<DurableEnvelopeRead> {
	const [row] = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({ inputText: aiJobs.inputText })
			.from(aiJobs)
			.where(
				and(
					eq(aiJobs.organizationId, organizationId),
					eq(aiJobs.inputStoragePath, durableRecordingPath(recordingId)),
				),
			)
			.limit(1),
	);
	if (!row) return { chunks: [], unreadableChunks: [] };
	const stored = readDurableEnvelope(recordingId, row.inputText);
	return {
		chunks: stored.chunks.filter((chunk) => chunk.recordingId === recordingId),
		unreadableChunks: stored.unreadableChunks,
	};
}

export function mergeDurableAndCachedChunks(
	storedChunks: SpeechTranscriptionChunk[],
	cachedChunks: SpeechTranscriptionChunk[],
): SpeechTranscriptionChunk[] {
	const merged = new Map<number, SpeechTranscriptionChunk>();
	for (const chunk of storedChunks) merged.set(chunk.chunkIndex, chunk);
	for (const chunk of cachedChunks) {
		const stored = merged.get(chunk.chunkIndex);
		merged.set(
			chunk.chunkIndex,
			!stored || shouldReplaceSpeechTranscriptionChunk(stored, chunk)
				? chunk
				: stored,
		);
	}
	return Array.from(merged.values()).sort(
		(left, right) =>
			left.chunkIndex - right.chunkIndex ||
			left.createdAt.localeCompare(right.createdAt),
	);
}

export function storedRecordingOwner(
	storedChunks: SpeechTranscriptionChunk[],
): SpeechTranscriptionChunk | null {
	let owner: SpeechTranscriptionChunk | null = null;
	for (const chunk of storedChunks) {
		if (!owner || chunk.chunkIndex < owner.chunkIndex) owner = chunk;
	}
	return owner;
}

export async function persistSpeechRecording(
	trigger: SpeechTranscriptionChunk,
	organizationId: string,
): Promise<void> {
	const recordingId = trigger.recordingId;
	const stored = await loadDurableRecordingEnvelope(
		recordingId,
		organizationId,
	);
	const owner = storedRecordingOwner(stored.chunks);
	if (owner && !speechRecordingIdentityMatches(owner, trigger)) {
		forgetCachedSpeechChunk(trigger);
		console.error(
			`[SpeechStorage] Фрагмент ${trigger.chunkIndex} записи ${recordingId} отклонен: запись сохранена как ${describeSpeechRecordingIdentity(owner)}, а фрагмент пришёл как ${describeSpeechRecordingIdentity(trigger)}.`,
		);
		throw new SpeechChunkIdentityConflictError(
			`у сохранённой записи другой ${speechIdentityDivergence(owner, trigger)}`,
		);
	}

	const identity = owner ?? trigger;
	const foreignStoredChunks = stored.chunks.filter(
		(chunk) => !speechRecordingIdentityMatches(chunk, identity),
	);
	const chunks = withoutDurableFailureWarnings(
		mergeDurableAndCachedChunks(
			stored.chunks,
			listSpeechTranscriptionChunks(recordingId, { organizationId }).filter(
				(chunk) => speechRecordingIdentityMatches(chunk, identity),
			),
		),
	);
	if (chunks.length === 0) return;

	const assembly = assembleSpeechRecordingFromChunks(recordingId, chunks);
	const recovery = speechRecordingRecoveryFromChunks(recordingId, chunks);
	const envelope: SpeechRecordingEnvelope = {
		envelopeVersion: durableEnvelopeVersion,
		recordingId,
		chunks,
		...(stored.unreadableChunks.length > 0
			? { unreadableChunks: stored.unreadableChunks }
			: {}),
	};
	const confidence = speechRecordingConfidence(chunks);
	const storagePath = durableRecordingPath(recordingId);
	const values = {
		patientId: recovery.patientId,
		visitId: recovery.visitId,
		target: durableRecordingTarget(recovery.source),
		status: speechRecordingJobStatus(chunks),
		sourceLabel: `${durableSourceLabelPrefix}${recovery.source}`,
		inputText: JSON.stringify(envelope),
		resultText: assembly.transcript,
		warnings: uniqueStrings([
			...speechConfidenceDisclosures(chunks, confidence),
			foreignStoredChunks.length > 0
				? `В конверте записи есть фрагменты другого приема или пациента: ${foreignStoredChunks.length}. Текст сохранен как есть и не удалён, но запись нужно разобрать вручную — разделить медицинский текст двух приемов автоматически нельзя.`
				: "",
			stored.unreadableChunks.length > 0
				? `Записей конверта, не прошедших проверку схемы: ${stored.unreadableChunks.length}; они сохранены как есть и не потеряны.`
				: "",
			...assembly.warnings,
		]).slice(0, 12),
		suggestedNextStep: recovery.nextAction,
		modelName: assembly.providerLabels.join(", ") || null,
		confidence: confidence ?? unknownConfidenceColumnValue,
		updatedAt: new Date(),
	};

	const [updated] = await withTenantCtx(organizationId, async (tx) =>
		tx
			.update(aiJobs)
			.set(values)
			.where(
				and(
					eq(aiJobs.organizationId, organizationId),
					eq(aiJobs.inputStoragePath, storagePath),
				),
			)
			.returning({ id: aiJobs.id }),
	);

	if (!updated) {
		await withTenantCtx(organizationId, async (tx) =>
			tx.insert(aiJobs).values({
				organizationId,
				kind: durableRecordingJobKind,
				inputStoragePath: storagePath,
				...values,
			}),
		);
	}

	const durableKeys = getDurableChunkKeys();
	for (const chunk of chunks) {
		durableKeys.add(speechChunkKey(chunk.recordingId, chunk.chunkIndex));
	}
}

export async function restoreSpeechTranscriptionChunks(): Promise<void> {
	const perOrganizationLimit = maxCachedRecordingCount();
	const globalRecordingLimit = maxRestoredRecordingCount();
	const chunkBudget = maxRestoredChunkCount();
	const charBudget = maxRestoredTranscriptChars();
	const storagePathPattern = `${durableRecordingPathPrefix}%`;
	const restored = await withSuperuserBypass(async (tx) =>
		tx.execute(sql`
    SELECT input_text, input_storage_path
    FROM (
      SELECT
        ${aiJobs.inputText} AS input_text,
        ${aiJobs.inputStoragePath} AS input_storage_path,
        ${aiJobs.updatedAt} AS updated_at,
        row_number() OVER (
          PARTITION BY ${aiJobs.organizationId}
          ORDER BY ${aiJobs.updatedAt} DESC
        ) AS recording_rank
      FROM ${aiJobs}
      WHERE ${aiJobs.kind} = ${durableRecordingJobKind}
        AND ${aiJobs.inputStoragePath} LIKE ${storagePathPattern}
    ) ranked
    WHERE ranked.recording_rank <= ${perOrganizationLimit}
    ORDER BY ranked.recording_rank ASC, ranked.updated_at DESC
    LIMIT ${globalRecordingLimit}
  `),
	);

	const chunksList = getSpeechTranscriptionChunks();
	const durableKeys = getDurableChunkKeys();
	const cached = new Set(
		chunksList.map((chunk) =>
			speechChunkKey(chunk.recordingId, chunk.chunkIndex),
		),
	);

	let cachedChunkCount = chunksList.length;
	let cachedCharCount = chunksList.reduce(
		(total, chunk) => total + chunk.transcript.length,
		0,
	);
	let unreadableRows = 0;
	let skippedRecordings = 0;
	let loadedRecordings = 0;
	for (const row of restored.rows ?? []) {
		const storagePath =
			typeof row.input_storage_path === "string" ? row.input_storage_path : "";
		const inputText =
			typeof row.input_text === "string" ? row.input_text : null;
		let restoredChunks: SpeechTranscriptionChunk[];
		try {
			restoredChunks = readDurableEnvelope(
				storagePath.slice(durableRecordingPathPrefix.length),
				inputText,
			).chunks;
		} catch (error) {
			unreadableRows += 1;
			console.error(
				"[SpeechStorage] Конверт расшифровки не прочитан, строка пропущена:",
				error,
			);
			continue;
		}

		const admitted = restoredChunks.filter(
			(chunk) =>
				!cached.has(speechChunkKey(chunk.recordingId, chunk.chunkIndex)),
		);
		const admittedChars = admitted.reduce(
			(total, chunk) => total + chunk.transcript.length,
			0,
		);
		if (
			cachedChunkCount + admitted.length > chunkBudget ||
			cachedCharCount + admittedChars > charBudget
		) {
			skippedRecordings += 1;
			continue;
		}

		for (const chunk of restoredChunks) {
			const key = speechChunkKey(chunk.recordingId, chunk.chunkIndex);
			durableKeys.add(key);
			if (cached.has(key)) continue;
			cached.add(key);
			chunksList.push(chunk);
		}
		cachedChunkCount += admitted.length;
		cachedCharCount += admittedChars;
		loadedRecordings += 1;
	}
	speechRestoreUnreadableRows = unreadableRows;
	speechRestoreSkippedRecordings = skippedRecordings;
	speechRestoreLoadedRecordings = loadedRecordings;
	speechRestoreCachedChunkCount = cachedChunkCount;
	speechRestoreCachedCharCount = cachedCharCount;
}

export function ensureSpeechTranscriptionChunksRestored(): Promise<void> {
	if (speechRestorePromise) return speechRestorePromise;
	if (speechRestoreFailure !== null && Date.now() < speechRestoreRetryAtMs) {
		return Promise.resolve();
	}
	const attempt: Promise<void> = restoreSpeechTranscriptionChunks().then(
		() => {
			speechRestoreFailure = null;
			speechRestoreFailedAttempts = 0;
			speechRestoreRetryAtMs = 0;
		},
		(error: unknown) => {
			speechRestoreFailedAttempts += 1;
			speechRestoreFailure =
				error instanceof Error ? error.message : "неизвестная ошибка чтения";
			speechRestoreRetryAtMs = Date.now() + speechRestoreBackoffMs();
			if (speechRestorePromise === attempt) speechRestorePromise = null;
			console.error(
				"[SpeechStorage] Не удалось восстановить расшифровки диктовки из базы:",
				error,
			);
		},
	);
	speechRestorePromise = attempt;
	return attempt;
}

export function ensureSpeechCacheRestoredOutsideCallerTransaction(): Promise<void> {
	if (!transactionStorage.getStore())
		return ensureSpeechTranscriptionChunksRestored();
	transactionStorage.exit(() => {
		void ensureSpeechTranscriptionChunksRestored();
	});
	return Promise.resolve();
}

export async function withDurableSpeechRecording(
	chunk: SpeechTranscriptionChunk,
	organizationId: string,
): Promise<SpeechTranscriptionChunk> {
	const key = speechChunkKey(chunk.recordingId, chunk.chunkIndex);
	if (getDurableChunkKeys().has(key)) return chunk;

	try {
		await queueDurableRecordingWrite(chunk.recordingId, () =>
			persistSpeechRecording(chunk, organizationId),
		);
		clearCachedDurableFailureWarnings(chunk.recordingId, organizationId);
		return chunk;
	} catch (error) {
		if (error instanceof SpeechChunkIdentityConflictError) throw error;
		const reason =
			error instanceof Error ? error.message : "неизвестная ошибка записи";
		console.error(
			`[SpeechStorage] Расшифровка ${chunk.recordingId} не сохранена в базу:`,
			error,
		);
		chunk.warnings = uniqueStrings([
			...chunk.warnings.filter(
				(warning) => !warning.startsWith(durableWriteFailureWarningPrefix),
			),
			`${durableWriteFailureWarningPrefix} (${reason}); текст держится только в памяти сервера (несохраненных фрагментов: ${undurableCachedChunkCount(organizationId)}) и будет потерян при перезапуске.`,
		]).slice(0, 12);
		return chunk;
	}
}

export async function recordSpeechTranscriptionChunk(
	input: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">,
): Promise<SpeechTranscriptionChunk> {
	await ensureSpeechCacheRestoredOutsideCallerTransaction();

	const organizationId = await resolveSpeechChunkOrganizationId(input);
	const chunksList = getSpeechTranscriptionChunks();

	const cachedConflict = chunksList.find(
		(chunk) =>
			chunk.organizationId === organizationId &&
			chunk.recordingId === input.recordingId &&
			!speechRecordingIdentityMatches(chunk, input),
	);
	if (cachedConflict) {
		throw new SpeechChunkIdentityConflictError(
			`у записи в памяти сервера другой ${speechIdentityDivergence(cachedConflict, input)}`,
		);
	}

	const existingIndex = chunksList.findIndex(
		(chunk) =>
			chunk.organizationId === organizationId &&
			chunk.recordingId === input.recordingId &&
			chunk.chunkIndex === input.chunkIndex,
	);
	const existing = existingIndex >= 0 ? chunksList[existingIndex] : undefined;

	if (existing) {
		if (!shouldReplaceSpeechTranscriptionChunk(existing, input)) {
			return await withDurableSpeechRecording(existing, organizationId);
		}
		const chunk: SpeechTranscriptionChunk = {
			...existing,
			...input,
			id: existing.id,
			organizationId,
			createdAt: existing.createdAt,
			warnings: uniqueStrings([
				...input.warnings,
				`Повторное распознавание улучшило аудиофрагмент: ${existing.status}/${speechChunkQuality(existing).level} -> ${input.status}/${input.quality.level}.`,
			]).slice(0, 12),
		};
		chunksList.splice(existingIndex, 1, chunk);
		getDurableChunkKeys().delete(
			speechChunkKey(chunk.recordingId, chunk.chunkIndex),
		);
		return await withDurableSpeechRecording(chunk, organizationId);
	}

	const chunk: SpeechTranscriptionChunk = {
		id: randomUUID(),
		organizationId,
		createdAt: new Date().toISOString(),
		...input,
	};
	chunksList.unshift(chunk);
	const stored = await withDurableSpeechRecording(chunk, organizationId);
	trimSpeechTranscriptionChunkRetention();
	return stored;
}

export function resetSpeechTranscriptionCacheForRestart(): void {
	resetSpeechRetentionCache();
	clearSpeechRecordingWriteChainsForTesting();
	speechRestorePromise = null;
	speechRestoreFailure = null;
	speechRestoreFailedAttempts = 0;
	speechRestoreRetryAtMs = 0;
	speechRestoreUnreadableRows = 0;
	speechRestoreSkippedRecordings = 0;
	speechRestoreLoadedRecordings = 0;
	speechRestoreCachedChunkCount = 0;
	speechRestoreCachedCharCount = 0;
}
