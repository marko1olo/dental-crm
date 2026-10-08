/**
 * @file speechRecognition.ts
 * @description Layer 2: Speech transcription chunks, assembly, and recording recovery.
 */
import { randomUUID } from "node:crypto";
import { organizationId } from "./fixtureIds.js";
import { recordAuditEvent } from "./audit.js";


import type {
	AiRecognitionJob,
	CreateAiRecognitionJobInput,
	SpeechRecordingAssembly,
	SpeechRecordingRecoveryItem,
	SpeechRecordingRecoveryList,
	SpeechTranscriptionChunk,
	SpeechTranscriptionQuality,
} from "@dental/shared";
import { createAiRecognitionJobSchema } from "@dental/shared";
import { persistMutableState } from "./stateNotifier.js";
import { speechProviders } from "./speechProviders.js";

const aiRecognitionJobs: AiRecognitionJob[] = [];
const speechTranscriptionChunks: SpeechTranscriptionChunk[] = [];

class SpeechChunkIdentityConflictError extends Error {
	statusCode = 409;

	constructor() {
		super(
			"Speech chunk retry identity mismatch; audio remains recoverable in the local queue.",
		);
		this.name = "SpeechChunkIdentityConflictError";
	}
}

/**
 * СРЕЗ ДАННЫХ ОДНОЙ КЛИНИКИ — ЯВНЫЙ ПАРАМЕТР ВМЕСТО ОБЩИХ НА ПРОЦЕСС МАССИВОВ.
 *
 * ЗАЧЕМ. Раньше `db/domainStateHydration.ts` читал строки клиники из базы и
 * перезаписывал ими объявленные выше массивы (`replaceAll`, 13 вызовов). Массивы
 * общие на процесс, поэтому параллельный запрос ДРУГОЙ клиники видел чужие
 * данные, и автор защищался глобальной промис-очередью, сериализовавшей запросы
 * всех клиник разом. Под RLS каждый маршрут работает в транзакции, а пул
 * ограничен десятью соединениями: запрос, ждущий своей очереди, держит
 * транзакцию открытой, и на этом проект уже горел — десять занятых клиентов
 * давали таймаут 8012 мс на любом обращении к базе.
 *
 * СТАЛО. Гидратация возвращает ЭТУ структуру, а расчёт принимает её параметром.
 * Общие массивы на пути базы не участвуют вовсе, очередь не нужна: у каждого
 * запроса свой срез, и пересечься им негде.
 *
 * ПОЧЕМУ ПАРАМЕТР НЕОБЯЗАТЕЛЬНЫЙ. Значение по умолчанию — `inMemoryDomainState`,
 * то есть те же общие массивы. Это сохраняет поведение режима без базы
 * (`DENTAL_STATE_PERSISTENCE=off`) и всех существующих вызовов из маршрутов и
 * смоук-скриптов, которые правят массивы на месте и зовут расчёт без аргументов.
 */

/**
 * Срез по умолчанию: те самые общие на процесс массивы.
 *
 * Ссылки, а не копии — смоук-скрипты и режим без базы правят коллекции на месте
 * (`push`, `splice`, `Object.assign`), и расчёт обязан видеть их правки. Все
 * коллекции объявлены через `const`, поэтому переприсвоить их нельзя и ссылки
 * не устаревают.
 */

function buildRecognitionOutput(input: CreateAiRecognitionJobInput) {
	const normalized = input.inputText
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+/g, " ")
		.trim();
	const hasPhone =
		/(?:\+7|8)\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/.test(normalized);
	const hasDate = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(normalized);

	if (input.target === "patient_import" || input.kind === "paper_ocr") {
		const resultText = normalized.includes(";")
			? normalized
			: `ФИО;Телефон;Комментарий\n${normalized}`;
		return {
			resultText,
			confidence: hasPhone ? 0.82 : 0.48,
			warnings: [
				"OCR/диктовка не пишет в базу напрямую: сначала preview, дубли и ручное подтверждение.",
				...(hasPhone
					? []
					: [
							"Телефон не найден уверенно, строка должна попасть в предупреждения импорта.",
						]),
			],
			suggestedNextStep:
				"Отправить результат в мастер переноса пациентов или smart parser.",
		};
	}

	if (input.target === "imaging_summary" || input.kind === "image_summary") {
		return {
			resultText: `Черновик описания снимка: ${normalized}. Проверить врачом, связать с зубом/областью и только потом переносить в ЭМК.`,
			confidence: hasDate ? 0.68 : 0.58,
			warnings: [
				"AI не ставит диагноз по снимку и не заменяет врача.",
				"Для КЛКТ/КТ-серий нужен просмотрщик и метаданные, а не только текстовое описание.",
			],
			suggestedNextStep:
				"Прикрепить как черновик описания снимка и запросить проверку врача.",
		};
	}

	if (input.target === "document_draft" || input.kind === "document_draft") {
		return {
			resultText: `Черновик документа: ${normalized}`,
			confidence: 0.64,
			warnings: [
				"Юридические документы требуют шаблона клиники и проверки перед выдачей пациенту.",
			],
			suggestedNextStep:
				"Открыть документ как черновик, не выдавать без проверки.",
		};
	}

	return {
		resultText: `Транскрипт/черновик приема: ${normalized}`,
		confidence: 0.72,
		warnings: [
			"Диктовка врача остается черновиком до подтверждения.",
			"Диагноз и план лечения нельзя подписывать автоматически.",
		],
		suggestedNextStep:
			"Преобразовать в структурированный черновик ЭМК и показать врачу.",
	};
}

function _listAiRecognitionJobs(): AiRecognitionJob[] {
	return aiRecognitionJobs.slice(0, 20);
}

function _createAiRecognitionJob(
	input: CreateAiRecognitionJobInput,
): AiRecognitionJob {
	const normalizedInput = createAiRecognitionJobSchema.parse(input);
	const createdAt = new Date().toISOString();
	const output = buildRecognitionOutput(normalizedInput);
	const job: AiRecognitionJob = {
		id: randomUUID(),
		organizationId,
		patientId: normalizedInput.patientId ?? null,
		imagingStudyId: normalizedInput.imagingStudyId ?? null,
		kind: normalizedInput.kind,
		target: normalizedInput.target,
		status: "needs_review",
		sourceLabel: normalizedInput.sourceLabel,
		inputText: normalizedInput.inputText,
		resultText: output.resultText,
		confidence: output.confidence,
		warnings: output.warnings,
		suggestedNextStep: output.suggestedNextStep,
		createdAt,
		updatedAt: createdAt,
	};
	aiRecognitionJobs.unshift(job);
	recordAuditEvent({
		entityType: "ai_job",
		entityId: job.id,
		action: "ai_recognition_prepared",
		reason: `${job.kind} подготовлен как черновик для ${job.target}.`,
	});
	return job;
}

type SpeechRecordingScope = {
	patientId?: string | null;
	visitId?: string | null;
	source?: SpeechTranscriptionChunk["source"] | null;
};

function speechChunkMatchesScope(
	chunk: SpeechTranscriptionChunk,
	scope: SpeechRecordingScope = {},
): boolean {
	if (scope.patientId !== undefined && chunk.patientId !== scope.patientId)
		return false;
	if (scope.visitId !== undefined && chunk.visitId !== scope.visitId)
		return false;
	if (scope.source !== undefined && chunk.source !== scope.source) return false;
	return true;
}

function listSpeechTranscriptionChunks(
	recordingId: string,
	scope: SpeechRecordingScope = {},
): SpeechTranscriptionChunk[] {
	const chunks = speechTranscriptionChunks.filter(
		(chunk) =>
			chunk.recordingId === recordingId &&
			speechChunkMatchesScope(chunk, scope),
	);
	const sortedChunks = chunks
		.slice()
		.sort(
			(left, right) =>
				left.chunkIndex - right.chunkIndex ||
				left.createdAt.localeCompare(right.createdAt),
		);
	return sortedChunks;
}

function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)));
}

type SpeechQualityCounts = SpeechRecordingAssembly["qualityCounts"];

function countSpeechWords(text: string): number {
	return (
		text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g)?.length ??
		0
	);
}

function speechChunkQuality(
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

function countSpeechQualities(
	chunks: SpeechTranscriptionChunk[],
): SpeechQualityCounts {
	const counts: SpeechQualityCounts = {
		clear: 0,
		review: 0,
		empty: 0,
		failed: 0,
	};
	for (const chunk of chunks) {
		counts[speechChunkQuality(chunk).level] += 1;
	}
	return counts;
}

function speechRecordingRecoveryFromChunks(
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
	// БЫЛО: семь отдельных проходов по массиву фрагментов. Считаем за один.
	const statusCounts = {
		transcribed: 0,
		fallback_text: 0,
		needs_provider_key: 0,
		failed: 0,
	};
	let hasKnownDuration = false;
	let durationSumMs = 0;
	let totalBytes = 0;
	for (const chunk of sortedChunks) {
		if (chunk.status === "transcribed") statusCounts.transcribed += 1;
		else if (chunk.status === "fallback_text") statusCounts.fallback_text += 1;
		else if (chunk.status === "needs_provider_key")
			statusCounts.needs_provider_key += 1;
		else if (chunk.status === "failed") statusCounts.failed += 1;

		if (chunk.durationMs !== null) {
			hasKnownDuration = true;
			durationSumMs += chunk.durationMs;
		}
		totalBytes += chunk.byteLength;
	}
	const totalDurationMs = hasKnownDuration ? durationSumMs : null;
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

function _listSpeechRecordingRecoveries(
	input: {
		visitId?: string | null;
		patientId?: string | null;
		limit?: number | null;
	} = {},
): SpeechRecordingRecoveryList {
	const grouped = new Map<string, SpeechTranscriptionChunk[]>();
	for (const chunk of speechTranscriptionChunks) {
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

function assembleSpeechRecordingFromChunks(
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
	const warnings = [
		...chunks.flatMap((chunk) => chunk.warnings),
		...qualityWarnings,
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

function _assembleSpeechRecording(
	recordingId: string,
	scope: SpeechRecordingScope = {},
): SpeechRecordingAssembly {
	return assembleSpeechRecordingFromChunks(
		recordingId,
		listSpeechTranscriptionChunks(recordingId, scope),
	);
}

function speechTranscriptionStatusRank(
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

function speechQualityRank(quality: SpeechTranscriptionQuality): number {
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

function shouldReplaceSpeechTranscriptionChunk(
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

function speechChunkRetryIdentityMatches(
	existing: SpeechTranscriptionChunk,
	next: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">,
): boolean {
	return (
		existing.source === next.source &&
		existing.patientId === next.patientId &&
		existing.visitId === next.visitId &&
		existing.language === next.language
	);
}

function trimSpeechTranscriptionChunkRetention(): void {
	const maxChunksPerRecording = 600;
	const maxRecordingCount = 80;
	const recordingIds = Array.from(
		new Set(speechTranscriptionChunks.map((chunk) => chunk.recordingId)),
	).slice(0, maxRecordingCount);
	const allowedRecordings = new Set(recordingIds);
	const keptPerRecording = new Map<string, number>();
	const keptChunks: SpeechTranscriptionChunk[] = [];
	for (const chunk of speechTranscriptionChunks) {
		if (!allowedRecordings.has(chunk.recordingId)) {
			continue;
		}
		const count = keptPerRecording.get(chunk.recordingId) ?? 0;
		if (count >= maxChunksPerRecording) {
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
}

function _recordSpeechTranscriptionChunk(
	input: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">,
): SpeechTranscriptionChunk {
	const identityConflict = speechTranscriptionChunks.find(
		(chunk) =>
			chunk.recordingId === input.recordingId &&
			!speechChunkRetryIdentityMatches(chunk, input),
	);
	if (identityConflict) {
		throw new SpeechChunkIdentityConflictError();
	}
	const existingIndex = speechTranscriptionChunks.findIndex(
		(chunk) =>
			chunk.recordingId === input.recordingId &&
			chunk.chunkIndex === input.chunkIndex,
	);
	if (existingIndex >= 0) {
		const existing = speechTranscriptionChunks[existingIndex];
		if (existing && !speechChunkRetryIdentityMatches(existing, input)) {
			throw new SpeechChunkIdentityConflictError();
		}
		if (existing && !shouldReplaceSpeechTranscriptionChunk(existing, input))
			return existing;
		if (existing) {
			const chunk: SpeechTranscriptionChunk = {
				...existing,
				...input,
				id: existing.id,
				organizationId: existing.organizationId,
				createdAt: existing.createdAt,
				warnings: uniqueStrings([
					...input.warnings,
					`Повторное распознавание улучшило аудиофрагмент: ${existing.status}/${speechChunkQuality(existing).level} -> ${input.status}/${input.quality.level}.`,
				]).slice(0, 12),
			};
			speechTranscriptionChunks.splice(existingIndex, 1, chunk);
			persistMutableState();
			return chunk;
		}
	}

	const chunk: SpeechTranscriptionChunk = {
		id: randomUUID(),
		organizationId,
		createdAt: new Date().toISOString(),
		...input,
	};
	speechTranscriptionChunks.unshift(chunk);
	trimSpeechTranscriptionChunkRetention();
	persistMutableState();
	return chunk;
}


export { aiRecognitionJobs, speechTranscriptionChunks };
