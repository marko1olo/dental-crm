import { randomUUID } from "node:crypto";
import {
	type SpeechRecordingAssembly,
	type SpeechRecordingRecoveryItem,
	type SpeechRecordingRecoveryList,
	type SpeechTranscriptionChunk,
	type SpeechTranscriptionQuality,
	speechTranscriptionChunkSchema,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { transactionStorage } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import { aiJobs, patients, visits } from "../db/schema.js";

// Локальная копия, как в polish.ts: хранилище расшифровок не должно тянуть за
// собой пул ключей вместе с undici, socks и tls ради одного разбора числа.
function numberFromEnv(name: string, fallback: number): number {
	const parsed = Number(process.env[name]);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

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

// Горячий кэш фрагментов диктовки: живая лента для UI во время записи.
// Долговременное хранение — таблица ai_jobs (kind = voice_transcription), см. persistSpeechRecording.
const speechTranscriptionChunks: SpeechTranscriptionChunk[] = [];

/**
 * Долговременное хранилище расшифровок.
 *
 * ЗАЧЕМ: до этого фрагменты жили ТОЛЬКО в массиве выше. tsx watch перезапускает
 * процесс на каждое сохранение файла, деплой перезапускает его штатно — и
 * продиктованный врачом текст исчезал без ошибки и без следа. Это медицинская
 * документация, терять её нельзя.
 *
 * Новой таблицы здесь не заводится: в схеме уже есть ai_jobs, а в перечислении
 * ai_job_kind уже есть значение voice_transcription. На запись (recordingId)
 * приходится одна строка: result_text — собранный текст расшифровки (читается
 * обычным SQL), input_text — JSON-конверт с полными фрагментами для точного
 * восстановления, input_storage_path — устойчивый ключ записи.
 */
const durableRecordingPathPrefix = "speech-recording://";
const durableSourceLabelPrefix = "speech_dictation:";
const durableEnvelopeVersion = 1;
const durableRecordingJobKind = "voice_transcription" as const;
const durableWriteFailureWarningPrefix = "Фрагмент не сохранен в базу";

type SpeechRecordingEnvelope = {
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

/**
 * Конверт сохранённой записи не читается вообще (не JSON или в нём нет массива
 * фрагментов). Сливать с ним нечего, а перезаписывать его нельзя: под ним лежит
 * медицинский текст. Поэтому запись падает громко, фрагмент остаётся в памяти с
 * предупреждением, а строка в базе не трогается.
 */
class SpeechDurableEnvelopeUnreadableError extends Error {
	constructor(recordingId: string, reason: string) {
		super(
			`Конверт записи ${recordingId} не читается (${reason}); перезапись отменена, чтобы не потерять сохранённый текст.`,
		);
		this.name = "SpeechDurableEnvelopeUnreadableError";
	}
}

function maxCachedRecordingCount(): number {
	return Math.max(1, numberFromEnv("DENTAL_SPEECH_CACHED_RECORDINGS", 80));
}

function maxCachedChunksPerRecording(): number {
	return Math.max(
		1,
		numberFromEnv("DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING", 600),
	);
}

/**
 * ПОТОЛОК ВОССТАНОВЛЕНИЯ НА ВЕСЬ ПРОЦЕСС, а не на клинику.
 *
 * ЧТО БЫЛО СЛОМАНО: восстановление ранжирует записи
 * row_number() OVER (PARTITION BY organization_id) и берёт первые
 * DENTAL_SPEECH_CACHED_RECORDINGS в КАЖДОЙ организации. Внешнего лимита у
 * запроса не было вообще, хотя до перехода на ранжирование по клинике стоял
 * .limit(maxCachedRecordingCount()) — один жёсткий предел на весь процесс.
 * То есть память, занятая при старте сервера, стала расти линейно по числу
 * арендаторов: 80 записей на клинику x сколько угодно клиник. Справедливость
 * бюджета между клиниками — правильная; исчезновение общего предела — ошибка.
 *
 * ПОЧЕМУ ОДНОГО ЛИМИТА ЗАПИСЕЙ НЕ ХВАТАЕТ. Число записей не ограничивает
 * память: у сохранённого конверта нет предела по числу фрагментов (вытеснение
 * чистит горячий кэш, но конверт в базе растёт всю запись), а у самого
 * фрагмента нет предела по длине текста —
 * speechTranscriptionChunkSchema.transcript объявлен как z.string() без max, и
 * только загрузка ограничена 20 000 символами (localTranscript). Поэтому
 * потолок задаётся тремя величинами, и все три читаются из окружения.
 *
 * ЗАЧЕМ ИМЕННО ТАКИЕ ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ:
 *   DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL = 160 — ровно то, что нынешняя
 *   установка с двумя организациями уже поднимала (2 x 80). Поведение сегодня
 *   не меняется, но перестаёт расти при добавлении третьей клиники.
 *   DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL = 48 000 — 80 записей x 600 фрагментов,
 *   то есть бюджет ОДНОЙ организации, пересчитанный в фрагменты. Это и есть
 *   прежняя семантика общего предела, выраженная в том, что реально занимает
 *   память: объектах фрагментов.
 *   DENTAL_SPEECH_RESTORED_CHARS_TOTAL = 64 000 000 символов (около 128 МБ в
 *   строках V8, где кириллица занимает два байта на символ). При измеренном
 *   ревьюером реальном размере фрагмента (~1500 символов) этого хватает на все
 *   160 записей по ~260 фрагментов. Отсекается именно патологическая форма
 *   600 фрагментов x 20 000 символов, из которой и получались 960 МБ НА КАЖДУЮ
 *   организацию.
 *
 * УСЕЧЕНИЕ ЗДЕСЬ НЕ ТЕРЯЕТ ТЕКСТ, и это принципиально отличает его от
 * trimSpeechTranscriptionChunkRetention: восстановление читает то, что УЖЕ
 * лежит в PostgreSQL. Не поднятая в память запись остаётся в базе целиком,
 * loadDurableRecordingEnvelope прочитает её конверт при следующем фрагменте, и
 * слияние отдаст полный текст. Пропуск виден: он уходит в предупреждение сборки
 * и в speechDurableRestoreState().
 */
function maxRestoredRecordingCount(): number {
	return Math.max(
		1,
		numberFromEnv("DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL", 160),
	);
}

function maxRestoredChunkCount(): number {
	return Math.max(
		1,
		numberFromEnv("DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL", 48_000),
	);
}

function maxRestoredTranscriptChars(): number {
	return Math.max(
		1,
		numberFromEnv("DENTAL_SPEECH_RESTORED_CHARS_TOTAL", 64_000_000),
	);
}

function durableRecordingPath(recordingId: string): string {
	return `${durableRecordingPathPrefix}${recordingId}`;
}

function speechChunkKey(recordingId: string, chunkIndex: number): string {
	return `${recordingId}#${chunkIndex}`;
}

// Ключи фрагментов, чей текст подтверждённо лежит в PostgreSQL. Вытеснять из
// памяти разрешено только их.
const durableChunkKeys = new Set<string>();

type SpeechRecordingScope = {
	/** Tenant gate. Routes must pass verified organizationId; null/omit is legacy-only. */
	organizationId?: string | null;
	patientId?: string | null;
	visitId?: string | null;
	source?: SpeechTranscriptionChunk["source"] | null;
};

function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values.filter(Boolean)));
}

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
): SpeechRecordingAssembly["qualityCounts"] {
	const counts = { clear: 0, review: 0, empty: 0, failed: 0 };
	for (const chunk of chunks) {
		counts[speechChunkQuality(chunk).level] += 1;
	}
	return counts;
}

function speechChunkMatchesScope(
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
		speechDurableStoreWarning(),
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

/**
 * Личность записи диктовки: чей прием, чей пациент, откуда диктуют и на каком
 * языке. Все фрагменты одной recordingId обязаны совпадать по всем четырём
 * полям, иначе в одной строке ai_jobs окажется медицинский текст двух приемов.
 *
 * Тип берётся от самого фрагмента, чтобы правило нельзя было применить к
 * половине полей: и сохранённый конверт, и горячий кэш, и входящий фрагмент
 * сравниваются ОДНОЙ функцией.
 */
type SpeechRecordingIdentity = Pick<
	SpeechTranscriptionChunk,
	"source" | "patientId" | "visitId" | "language"
>;

function speechRecordingIdentityMatches(
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
function speechIdentityDivergence(
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

function describeSpeechRecordingIdentity(
	identity: SpeechRecordingIdentity,
): string {
	return `прием ${identity.visitId ?? "не указан"}, пациент ${identity.patientId ?? "не указан"}, источник ${identity.source}, язык ${identity.language}`;
}

/**
 * Вытеснение из горячего кэша. Раньше оно резало массив по числу записей и
 * фрагментов без единой проверки, сохранён ли текст хоть где-то, — то есть
 * молча уничтожало медицинский текст. Теперь выбрасываются только фрагменты,
 * подтверждённо записанные в PostgreSQL; всё остальное остаётся в памяти,
 * даже если лимит превышен.
 *
 * Бюджет записей считается ПО КЛИНИКЕ, а не на всю базу. Общий счётчик означал,
 * что поток диктовок одной клиники выбивает из памяти живую запись другой: её
 * фрагменты перестают отдаваться через GET /api/speech/chunks до следующего
 * восстановления. Медицинскому продукту такой общий кэш арендаторов не нужен.
 */
function trimSpeechTranscriptionChunkRetention(): void {
	const chunkCap = maxCachedChunksPerRecording();
	const recordingCap = maxCachedRecordingCount();
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
		if (
			overCap &&
			durableChunkKeys.has(speechChunkKey(chunk.recordingId, chunk.chunkIndex))
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
 * Это то самое неограниченное потребление памяти, которым оплачен запрет на
 * уничтожение текста: пока база не приняла фрагмент, вытеснить его нельзя.
 * Число попадает в предупреждение врачу, чтобы отказ базы был виден по величине,
 * а не только по факту.
 */
function undurableCachedChunkCount(): number {
	let count = 0;
	for (const chunk of speechTranscriptionChunks) {
		if (
			!durableChunkKeys.has(speechChunkKey(chunk.recordingId, chunk.chunkIndex))
		)
			count += 1;
	}
	return count;
}

async function resolveSpeechChunkOrganizationId(scope: {
	patientId?: string | null;
	visitId?: string | null;
}): Promise<string> {
	if (scope.visitId) {
		/*
		 * Идентификатор кладётся в const ДО замыкания, и это не косметика.
		 * Сужение типа, которое даёт `if (scope.visitId)`, внутрь стрелочной
		 * функции не переносится: свойство объекта может быть переприсвоено к
		 * моменту вызова колбэка, поэтому компилятор возвращает полю исходный тип
		 * `string | null | undefined`. Именно эту потерю сужения затыкал прежний
		 * `as string` — каст пропустил бы null в запрос как `WHERE id = NULL`,
		 * условие всегда ложно, ноль строк и невнятный отказ позже. У const
		 * переприсваивания нет, сужение сохраняется, и проверку держит компилятор.
		 */
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
		// const по той же причине, что и visitId выше: сужение типа не переживает
		// границу замыкания, а каст вместо него пропускает null в запрос.
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

function speechRecordingJobStatus(
	chunks: SpeechTranscriptionChunk[],
): "queued" | "needs_review" | "failed" {
	if (chunks.some((chunk) => chunk.status === "needs_provider_key"))
		return "queued";
	if (chunks.length > 0 && chunks.every((chunk) => chunk.status === "failed"))
		return "failed";
	return "needs_review";
}

/**
 * Средняя уверенность по фрагментам, у которых она вообще есть. Если её нет ни
 * у одного — возвращается null.
 */
function speechRecordingConfidence(
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

/**
 * ai_jobs.confidence — real NOT NULL DEFAULT 0 (проверено по
 * information_schema.columns живой базы). Колонка не умеет хранить
 * «неизвестно»: db/aiQuery.ts отдаёт её как confidence ?? 0, а настройки
 * показывают Math.round(confidence * 100) + '%'. Раньше при неизвестной
 * уверенности значение просто не писали — ноль приходил из DEFAULT молча, и
 * отсутствие оценки выглядело как оценка «0 %». Теперь ноль пишется явно И в ту
 * же строку кладётся предупреждение, которое интерфейс показывает рядом с
 * процентом. Убрать ноль совсем можно только миграцией (nullable-колонка плюс
 * AiRecognitionJob.confidence: number | null) — это вне делянки и объявлено долгом.
 */
const unknownConfidenceColumnValue = 0;

function speechConfidenceDisclosures(
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

/**
 * Куда предназначен распознанный текст. Раньше здесь стояло
 * target: "visit_note" для любого источника, и диктовка из документов или из
 * импорта пациентов ложилась в базу с пометкой записи приема. Перечисление
 * ai_recognition_target значения для лабораторной диктовки не содержит, поэтому
 * settings_lab отправляется в document_draft: это черновик текста, но точно не
 * запись приема.
 */
function durableRecordingTarget(
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

type DurableEnvelopeRead = {
	chunks: SpeechTranscriptionChunk[];
	unreadableChunks: unknown[];
};

function readDurableEnvelope(
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
 * Сохранённый конверт записи. Читается ВНУТРИ очереди записи по этой же
 * recordingId, поэтому между чтением и перезаписью в этом процессе никто не
 * вклинится. Межпроцессная гонка остаётся: уникального индекса на
 * (organization_id, input_storage_path) в ai_jobs нет, он требует миграции.
 */
async function loadDurableRecordingEnvelope(
	recordingId: string,
	organizationId: string,
): Promise<DurableEnvelopeRead> {
	/*
	 * ТЕНАНТ-КОНТЕКСТ, А НЕ ОБХОД. Запрос уже сужен по organization_id, то есть
	 * читает строку СВОЕЙ клиники, и обход ему не нужен ни для чего. Он тут стоял
	 * лишь потому, что рядом стояла запись под обходом. Разница не косметическая:
	 * под обходом дизъюнкт `USING` истинен для КАЖДОЙ строки, и единственным
	 * барьером против чтения чужого конверта диктовки остаётся правильность
	 * предиката в коде; под тенант-контекстом чужую строку не отдаст сама
	 * политика. Для медицинского текста это разные уровни гарантии.
	 */
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

/**
 * Слияние сохранённого конверта с горячим кэшем по номеру фрагмента.
 *
 * ЗАЧЕМ: кэш имеет право быть неполным — вытеснение выбрасывает из него именно
 * те фрагменты, которые уже лежат в базе. Пока конверт собирался из одного кэша,
 * следующий фрагмент той же записи переписывал строку усечённым набором, и
 * продиктованный текст уничтожался в PostgreSQL. Воспроизведено прогоном:
 * при пределе в один фрагмент result_text терял первую строку диктовки.
 * Кто из двух версий одного номера лучше, решает тот же порядок, по которому
 * повторное распознавание заменяет фрагмент в памяти.
 *
 * ЛИЧНОСТЬ ЗАПИСИ ЗДЕСЬ УЖЕ ПРОВЕРЕНА: обе стороны слияния отбирает
 * persistSpeechRecording, и обе принадлежат одному приему и одному пациенту.
 * Слияние по одному номеру фрагмента без такой проверки и давало одну строку с
 * текстом двух приемов.
 */
function mergeDurableAndCachedChunks(
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

/**
 * Предупреждение «фрагмент не сохранен в базу» описывает состояние памяти, а не
 * содержимое строки. Попав в конверт удавшейся записи, оно становится ложью,
 * которую потом никто не снимет. Из конверта оно вырезается.
 */
function withoutDurableFailureWarnings(
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

function clearCachedDurableFailureWarnings(recordingId: string): void {
	for (const chunk of speechTranscriptionChunks) {
		if (chunk.recordingId !== recordingId) continue;
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

/**
 * Отклонённый фрагмент убирается из горячего кэша.
 *
 * ПОЧЕМУ ЭТО НЕ ТИХАЯ ПОТЕРЯ ТЕКСТА: запрос завершается ошибкой 409, то есть
 * фрагмент НЕ ПРИНЯТ и остаётся у клиента (локальная очередь браузера удаляет
 * фрагмент только после успешного ответа). Обратный вариант хуже: чужой
 * фрагмент, оставленный в памяти, не попадёт ни в одну строку (сборка берёт
 * только фрагменты своей личности), в базу не уйдёт никогда, а вытеснение
 * выбросит его МОЛЧА — ключ вытеснения общий для recordingId#chunkIndex, и
 * сохранение фрагмента своей записи с тем же номером делает чужой фрагмент
 * «подтверждённо сохранённым».
 *
 * durableChunkKeys здесь не трогается намеренно: ключ описывает пару
 * (recordingId, chunkIndex) и может принадлежать законному фрагменту записи.
 * Ключи без живого фрагмента вычищает trimSpeechTranscriptionChunkRetention.
 */
function forgetCachedSpeechChunk(chunk: SpeechTranscriptionChunk): void {
	const index = speechTranscriptionChunks.findIndex(
		(cached) => cached.id === chunk.id,
	);
	if (index >= 0) speechTranscriptionChunks.splice(index, 1);
}

/**
 * Кому принадлежит запись по СОХРАНЁННОМУ конверту: фрагменту с наименьшим
 * номером. Он же подписывает строку ai_jobs — speechRecordingRecoveryFromChunks
 * берёт patientId/visitId из sortedChunks[0], а persistSpeechRecording пишет их
 * в колонки. То есть личность записи и подпись строки — одна величина, а не две
 * независимые, и разойтись они не могут.
 */
function storedRecordingOwner(
	storedChunks: SpeechTranscriptionChunk[],
): SpeechTranscriptionChunk | null {
	let owner: SpeechTranscriptionChunk | null = null;
	for (const chunk of storedChunks) {
		if (!owner || chunk.chunkIndex < owner.chunkIndex) owner = chunk;
	}
	return owner;
}

/**
 * ЛИЧНОСТЬ ЗАПИСИ ПРОВЕРЯЕТСЯ ЗДЕСЬ, ПО СОХРАНЁННОМУ КОНВЕРТУ — по тому же
 * источнику, который читает слияние.
 *
 * ЧТО БЫЛО СЛОМАНО: проверка личности стояла ТОЛЬКО над горячим кэшем
 * (recordSpeechTranscriptionChunk), а кэшу разрешено терять фрагменты —
 * вытеснение выбрасывает всё, что уже в базе. Как только запись уходила из
 * памяти, проверка молча перестала работать, а слияние объединяло конверт по
 * номеру фрагмента, не глядя на прием и пациента. Результат воспроизведён
 * прогоном на живой базе: одна строка ai_jobs с текстом двух приемов
 * («Прием А: …\nПрием Б: …») под пациентом первого, потому что подпись строки
 * берётся из фрагмента с наименьшим номером и после слияния это всегда
 * сохранённый фрагмент. Проверка над кэшем оставлена как быстрый отказ до
 * похода в базу, но гарантия — эта, потому что вытеснить сохранённый конверт
 * нельзя.
 *
 * ФРАГМЕНТЫ ЧУЖОЙ ЛИЧНОСТИ, УЖЕ ЛЕЖАЩИЕ В КОНВЕРТЕ (следствие прежнего
 * дефекта), НЕ УДАЛЯЮТСЯ: уничтожать медицинский текст нельзя, а разделить его
 * на два приема автоматически — значит угадывать. Такая строка получает
 * предупреждение о необходимости ручного разбора, а новые чужие фрагменты в неё
 * уже не попадут.
 */
async function persistSpeechRecording(
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
			listSpeechTranscriptionChunks(recordingId).filter((chunk) =>
				speechRecordingIdentityMatches(chunk, identity),
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

	/*
	 * ЗАПИСЬ ДИКТОВКИ ИДЁТ ПОД ТЕНАНТ-КОНТЕКСТОМ СВОЕЙ КЛИНИКИ, А НЕ ПОД ОБХОДОМ.
	 *
	 * ЧТО БЫЛО СЛОМАНО. Обе команды стояли внутри `withSuperuserBypass`, и это
	 * единственное место в дереве, где мутация тенант-таблицы шла под обходом.
	 * Работало оно не потому, что обход что-то даёт записи, а по НАСЛЕДСТВУ:
	 * маршрут `POST /api/speech/transcribe-chunk` не помечен
	 * `tenantTxSelfManaged`, поэтому авто-обёртка `server.ts` открывает
	 * `withTenantCtx`, а `withSuperuserBypass` при живой транзакции переиспользует
	 * её и `app.current_tenant` НЕ трогает (`db/rls.ts:189-209`). То есть
	 * арендатор к моменту записи был выставлен вызывающим.
	 *
	 * Замерено на живой базе (роль `dental`, rolsuper=false, rolbypassrls=false;
	 * все транзакции откачены):
	 *   обход есть, арендатор НЕ задан ......... 42501
	 *   арендатор задан И обход ................ INSERT прошёл
	 *   арендатор ЧУЖОЙ, обход ................. 42501
	 *   арендатор задан, обхода нет ............ INSERT прошёл
	 * У `ai_jobs` в `WITH CHECK` дизъюнкта обхода нет вовсе, поэтому запись
	 * определяет РОВНО `app.current_tenant` — обход для неё бесполезен.
	 *
	 * ПОЧЕМУ ЭТО НАДО БЫЛО ЧИНИТЬ, ЕСЛИ «РАБОТАЛО». Гарантия бралась не из кода в
	 * точке записи, а из того, кто эту точку вызвал. Любой вызов вне запроса —
	 * фоновый обработчик, CLI-скрипт, тест, будущая очередь — попадает в первую
	 * строку таблицы замеров: медицинский текст молча не сохраняется, а врач
	 * получает 201 с предупреждением в теле. Вложенный `withTenantCtx` внутри
	 * активной транзакции переиспользует её, выставляет арендатора и гасит флаг
	 * обхода (`db/rls.ts:137-141`), возвращая всё в `finally`; вне транзакции —
	 * открывает свою. Запись перестаёт зависеть от вызывающего.
	 *
	 * `organizationId` — параметр этой функции, он выведен из приема или пациента
	 * фрагмента (`resolveSpeechChunkOrganizationId`), а не из запроса, поэтому
	 * строка ложится своей клинике и при чужом контексте вызывающего.
	 */
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

	for (const chunk of chunks) {
		durableChunkKeys.add(speechChunkKey(chunk.recordingId, chunk.chunkIndex));
	}
}

/**
 * Записи по одной recordingId сохраняются строго по очереди: конверт всегда
 * собирается из актуального состояния кэша, поэтому параллельные запросы не
 * могут затереть чужой фрагмент более старым снимком. Запись из карты удаляется,
 * как только цепочка опустела, — таймеров и подписок нет, утечки нет.
 */
const speechRecordingWriteChains = new Map<string, Promise<void>>();

function queueDurableRecordingWrite(
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

let speechRestorePromise: Promise<void> | null = null;
let speechRestoreFailure: string | null = null;
let speechRestoreFailedAttempts = 0;
let speechRestoreRetryAtMs = 0;
let speechRestoreUnreadableRows = 0;
let speechRestoreSkippedRecordings = 0;
let speechRestoreLoadedRecordings = 0;
let speechRestoreCachedChunkCount = 0;
let speechRestoreCachedCharCount = 0;

function speechRestoreBackoffMs(): number {
	const base = numberFromEnv("DENTAL_SPEECH_RESTORE_RETRY_MS", 5000);
	return base * 2 ** Math.min(Math.max(speechRestoreFailedAttempts - 1, 0), 6);
}

function speechDurableStoreWarning(): string {
	if (speechRestoreFailure) {
		return `Расшифровки не восстановлены из базы (${speechRestoreFailure}); неудачных попыток: ${speechRestoreFailedAttempts}; список может быть неполным.`;
	}
	if (speechRestoreUnreadableRows > 0) {
		return `Конверты ${speechRestoreUnreadableRows} записей диктовки не прочитаны; их фрагменты не восстановлены в память, но в базе не тронуты.`;
	}
	if (speechRestoreSkippedRecordings > 0) {
		return `Записей диктовки, не поднятых в память из-за общего предела памяти сервера: ${speechRestoreSkippedRecordings} (в памяти ${speechRestoreCachedChunkCount} фрагментов, ${speechRestoreCachedCharCount} символов). Их текст в базе не тронут, но в живом списке фрагментов появится только с очередным фрагментом той же записи.`;
	}
	return "";
}

/**
 * Состояние восстановления для теста границы отказа базы и для диагностики:
 * причина последнего провала, число неудачных попыток и время следующей.
 *
 * loadedRecordings / skippedRecordings / cachedChunks / cachedChars описывают
 * потолок памяти по факту, а не по расчёту: без них «память ограничена» было бы
 * утверждением без единого измеримого числа, а именно так и был потерян общий
 * предел восстановления.
 */
export function speechDurableRestoreState(): {
	failureReason: string | null;
	failedAttempts: number;
	unreadableRows: number;
	nextRetryAt: string | null;
	loadedRecordings: number;
	skippedRecordings: number;
	cachedChunks: number;
	cachedChars: number;
} {
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

/**
 * Восстановление горячего кэша из PostgreSQL.
 *
 * Префикс input_storage_path проверяется в WHERE, а не после лимита. В ai_jobs с
 * тем же kind = voice_transcription пишет второй автор
 * (db/aiQuery.ts createAiRecognitionJobInDb, input_storage_path у него пуст), и
 * пока фильтр стоял после SQL-лимита, его строки съедали лимит целиком —
 * восстановление возвращало ноль расшифровок при полной базе.
 *
 * row_number() по организации: бюджет кэша принадлежит клинике. Общий лимит
 * означал, что клиника с потоком диктовок вытесняет расшифровки соседней.
 *
 * ВНЕШНИЙ LIMIT — общий потолок на весь процесс, которого после перехода на
 * ранжирование по клинике не стало вовсе. Порядок отбора взят
 * (recording_rank, updated_at DESC), а не просто (updated_at DESC): сначала
 * берётся самая свежая запись КАЖДОЙ клиники, потом вторая по свежести каждой, и
 * так далее. Иначе общий потолок вернул бы ту самую несправедливость, ради
 * устранения которой появилось ранжирование по организации: клиника с потоком
 * диктовок забрала бы весь лимит целиком.
 *
 * Нечитаемый конверт больше не роняет весь проход: строка пропускается,
 * счётчик уходит в предупреждение врачу, остальные записи восстанавливаются.
 *
 * ЧТО ЗДЕСЬ ОСТАЛОСЬ НЕПРАВИЛЬНЫМ ПО ФОРМЕ, но не переделывается этим отрезком:
 * загрузка жадная, она срабатывает на импорт модуля (см. последнюю строку
 * файла), то есть сервер поднимает расшифровки в память ещё до первого запроса,
 * даже если диктовку в этот день никто не откроет. Правильная форма — ленивое
 * чтение конверта по recordingId, которое уже реализовано
 * (loadDurableRecordingEnvelope) и используется на записи. Горячий кэш нужен
 * ровно одному читателю — GET /api/speech/chunks. Переделка задевает пути
 * чтения роутов и границу перезапуска процесса, поэтому она вынесена отдельной
 * задачей, а здесь возвращён измеримый потолок.
 */
async function restoreSpeechTranscriptionChunks(): Promise<void> {
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

	const cached = new Set(
		speechTranscriptionChunks.map((chunk) =>
			speechChunkKey(chunk.recordingId, chunk.chunkIndex),
		),
	);
	// Бюджет считается от всего горячего кэша, а не от прибавки восстановления:
	// потолок обязан описывать занятую память, а не размер одного прохода.
	let cachedChunkCount = speechTranscriptionChunks.length;
	let cachedCharCount = speechTranscriptionChunks.reduce(
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

		// Запись поднимается целиком или не поднимается вовсе. Половина записи
		// выглядела бы как запись с дырами в нумерации, и сборка сообщила бы
		// «нет фрагментов с индексами …» про текст, который в базе есть.
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
			// Ключи НЕ помечаются сохранёнными: иначе повторный фрагмент этой записи
			// попал бы в кэш, а withDurableSpeechRecording счёл бы его уже
			// записанным и не сохранил бы улучшенный текст.
			skippedRecordings += 1;
			continue;
		}

		for (const chunk of restoredChunks) {
			const key = speechChunkKey(chunk.recordingId, chunk.chunkIndex);
			durableChunkKeys.add(key);
			if (cached.has(key)) continue;
			cached.add(key);
			speechTranscriptionChunks.push(chunk);
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

/**
 * Идемпотентная загрузка расшифровок из PostgreSQL в горячий кэш. Вызывается
 * при импорте модуля (то есть на старте сервера) и перед каждой записью, чтобы
 * восстановление не гонялось с новым фрагментом. Тест использует её же, чтобы
 * пройти границу перезапуска процесса.
 *
 * ПОЧЕМУ ПРОВАЛ НЕ ЗАПОМИНАЕТСЯ НАВСЕГДА: раньше обработчик проглатывал отказ,
 * промис оставался УСПЕШНЫМ, и каждая следующая проверка мгновенно
 * возвращала его. Одна секундная недоступность базы на старте означала, что
 * процесс до конца жизни работает с пустым кэшем — а записи в этом состоянии
 * сливаться не с чем. Теперь после провала промис сбрасывается, и следующая
 * запись пробует снова, но не раньше выдержки (DENTAL_SPEECH_RESTORE_RETRY_MS,
 * по умолчанию 5000 мс, удваивается до седьмой попытки), чтобы не бомбить
 * упавшую базу запросом на каждый фрагмент.
 */
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

/**
 * Только для тестов границы перезапуска: сбрасывает горячий кэш и состояние
 * восстановления, имитируя новый процесс поверх той же базы.
 */
export function resetSpeechTranscriptionCacheForRestart(): void {
	speechTranscriptionChunks.length = 0;
	durableChunkKeys.clear();
	speechRecordingWriteChains.clear();
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

/**
 * Восстановление кэша НИКОГДА не выполняется внутри чужой транзакции.
 *
 * ЧТО ЭТО ЗА ЗАПРОС. `restoreSpeechTranscriptionChunks` — единственное
 * настоящее межарендное чтение модуля: оно идёт под обходом и поднимает в
 * общий для процесса массив расшифровки ВСЕХ клиник (ранжирование
 * `PARTITION BY organization_id`). На старте процесса это осознанная форма
 * горячего кэша. Внутри запроса — нет.
 *
 * ДЕФЕКТ 1: ОТКАЗ ЧТЕНИЯ УБИВАЛ ТРАНЗАКЦИЮ ЗАПРОСА. Вызов стоял первой строкой
 * `recordSpeechTranscriptionChunk` и срабатывал внутри запроса, если старт не
 * удался и истекла выдержка. `withSuperuserBypass` при живой транзакции
 * переиспользует ЕЁ, то есть межарендный SELECT выполнялся прямо в транзакции
 * арендатора. Любая ошибка оператора в PostgreSQL переводит транзакцию в
 * состояние 25P02, и КАЖДЫЙ следующий оператор в ней падает с «текущая
 * транзакция прервана». А отказ восстановления здесь глотается намеренно
 * (иначе недоступная база рушила бы приём диктовки) — значит запрос продолжал
 * работу на мёртвой транзакции, и продиктованный врачом текст не сохранялся с
 * причиной, не имеющей отношения к настоящей. Одно временное чтение
 * превращалось в тихую потерю медицинского текста с подменённой причиной.
 *
 * ДЕФЕКТ 2: ЧУЖОЙ МЕДИЦИНСКИЙ ТЕКСТ ПОДНИМАЛСЯ ПО ЗАПРОСУ ПОСТОРОННЕГО. Наружу
 * он не течёт — выдача фильтруется по организации (`speechChunkMatchesScope`),
 * — но расшифровки чужих клиник оказывались в памяти процесса в момент,
 * выбираемый арендатором, который к ним отношения не имеет.
 *
 * ЧТО СДЕЛАНО. Внутри активной транзакции попытка НЕ присоединяется к ней и НЕ
 * ожидается: `transactionStorage.exit` выводит вызов из контекста транзакции,
 * поэтому `withSuperuserBypass` открывает СВОЁ соединение, а вызывающий идёт
 * дальше немедленно.
 *
 * ПОЧЕМУ ИМЕННО НЕ ОЖИДАЕТСЯ, а не просто «выполняется на своём соединении».
 * Пул конечен (`db/rls.ts:66-73`): запрос, который держит одно соединение и
 * ЖДЁТ второго, при насыщении пула образует цикл ожидания. Здесь цикла нет —
 * никто попытку не ждёт, а `speechRestorePromise` делает её единственной на
 * процесс, поэтому лишнее соединение максимум одно.
 *
 * ЧТО ОТ ЭТОГО НЕ ЛОМАЕТСЯ. Долговременная запись не зависит от горячего кэша:
 * `persistSpeechRecording` сливает фрагмент с СОХРАНЁННЫМ конвертом, прочитанным
 * из базы (`loadDurableRecordingEnvelope`), а не с памятью. Кэш нужен чтению
 * (`GET /api/speech/chunks`) и быстрому отказу по личности записи, гарантию
 * которого даёт та же проверка над конвертом.
 *
 * ЧЕГО ЭТО НЕ ЧИНИТ И ЧТО ОСТАЁТСЯ ДОЛГОМ. Сам факт того, что горячий кэш
 * общий для всех клиник, здесь не отменяется: его наполняет и загрузка при
 * импорте модуля. Переход на ленивое чтение по recordingId объявлен отдельной
 * задачей в шапке `restoreSpeechTranscriptionChunks`.
 */
function ensureSpeechCacheRestoredOutsideCallerTransaction(): Promise<void> {
	if (!transactionStorage.getStore())
		return ensureSpeechTranscriptionChunksRestored();
	transactionStorage.exit(() => {
		// Отказ уже разобран внутри: обработчик записывает причину, назначает
		// выдержку и возвращает выполненный промис, поэтому непойманного отклонения
		// здесь появиться не может.
		void ensureSpeechTranscriptionChunksRestored();
	});
	return Promise.resolve();
}

export async function recordSpeechTranscriptionChunk(
	input: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">,
): Promise<SpeechTranscriptionChunk> {
	await ensureSpeechCacheRestoredOutsideCallerTransaction();

	/**
	 * КЛИНИКА ФРАГМЕНТА ОПРЕДЕЛЯЕТСЯ ДО ЛЮБОГО ОБРАЩЕНИЯ К ГОРЯЧЕМУ КЭШУ.
	 *
	 * ЧТО БЫЛО СЛОМАНО. Обе выборки ниже искали по общему для всех клиник массиву
	 * ТОЛЬКО по recordingId (и номеру фрагмента), без фильтра по организации, а
	 * найденная строка отдавала свой `organizationId` записи. recordingId
	 * приходит от клиента и уникальности между клиниками не имеет, поэтому при
	 * совпадении запись одной клиники решала судьбу фрагмента другой: либо
	 * фрагмент писался бы с чужим арендатором (42501 на `WITH CHECK`), либо
	 * законная диктовка получала бы 409 из-за чужой записи, а текст отказа ещё и
	 * называл бы, чем именно расходятся прием, пациент, источник и язык чужой
	 * записи. От первого исхода спасала только проверка личности строкой ниже —
	 * опора косвенная и держится на том, что приемы и пациенты не совпадают между
	 * клиниками.
	 *
	 * Организация берётся из приема или пациента фрагмента, а не из кэша, поэтому
	 * теперь она проверена базой, а не унаследована. Цена — один поиск по
	 * первичному ключу на повторный фрагмент; раньше он делался только для нового.
	 */
	const organizationId = await resolveSpeechChunkOrganizationId(input);

	/**
	 * Быстрый отказ по горячему кэшу: он экономит поход в базу, но НИЧЕГО не
	 * гарантирует — кэшу разрешено быть пустым, вытеснение выбрасывает из него
	 * всё, что уже сохранено. Гарантию даёт та же проверка внутри очереди записи,
	 * над сохранённым конвертом (persistSpeechRecording). Отдельной проверки на
	 * фрагмент с тем же номером больше нет: он тоже лежит в кэше этой записи и
	 * попадает под эту же проверку.
	 */
	const cachedConflict = speechTranscriptionChunks.find(
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

	const existingIndex = speechTranscriptionChunks.findIndex(
		(chunk) =>
			chunk.organizationId === organizationId &&
			chunk.recordingId === input.recordingId &&
			chunk.chunkIndex === input.chunkIndex,
	);
	const existing =
		existingIndex >= 0 ? speechTranscriptionChunks[existingIndex] : undefined;

	if (existing) {
		if (!shouldReplaceSpeechTranscriptionChunk(existing, input)) {
			// Повтор не улучшил фрагмент, но прошлая запись в базу могла не пройти.
			// Используем повтор как ещё одну попытку сохранить текст.
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
		speechTranscriptionChunks.splice(existingIndex, 1, chunk);
		durableChunkKeys.delete(
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
	speechTranscriptionChunks.unshift(chunk);
	const stored = await withDurableSpeechRecording(chunk, organizationId);
	trimSpeechTranscriptionChunkRetention();
	return stored;
}

/**
 * Сохраняет запись в PostgreSQL и, если сохранить не удалось, вешает на сам
 * фрагмент явное предупреждение. Ошибка не глотается: она уходит и в лог, и в
 * ответ API, откуда попадает в предупреждения сборки записи и видна врачу.
 */
async function withDurableSpeechRecording(
	chunk: SpeechTranscriptionChunk,
	organizationId: string,
): Promise<SpeechTranscriptionChunk> {
	const key = speechChunkKey(chunk.recordingId, chunk.chunkIndex);
	if (durableChunkKeys.has(key)) return chunk;

	try {
		await queueDurableRecordingWrite(chunk.recordingId, () =>
			persistSpeechRecording(chunk, organizationId),
		);
		// Запись прошла — прежнее предупреждение о том, что текст только в памяти,
		// стало неправдой и снимается, иначе оно висело бы на сохранённой записи.
		clearCachedDurableFailureWarnings(chunk.recordingId);
		return chunk;
	} catch (error) {
		// Несовпадение личности записи — это отказ ЗАПРОСУ, а не сбой хранилища.
		// Отдать фрагмент чужого приема врачу как «сохранено, но с предупреждением»
		// нельзя: клиент счёл бы фрагмент принятым и выбросил бы его из локальной
		// очереди. Ошибка уходит наверх и превращается в 409 на роуте.
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
			`${durableWriteFailureWarningPrefix} (${reason}); текст держится только в памяти сервера (несохраненных фрагментов: ${undurableCachedChunkCount()}) и будет потерян при перезапуске.`,
		]).slice(0, 12);
		return chunk;
	}
}

void ensureSpeechTranscriptionChunksRestored();
