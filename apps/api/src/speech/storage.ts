import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  speechTranscriptionChunkSchema,
  type SpeechTranscriptionChunk,
  type SpeechTranscriptionQuality,
  type SpeechRecordingAssembly,
  type SpeechRecordingRecoveryList,
  type SpeechRecordingRecoveryItem
} from "@dental/shared";
import { db } from "../db/client.js";
import { aiJobs, patients, visits } from "../db/schema.js";

// Локальная копия, как в polish.ts: хранилище расшифровок не должно тянуть за
// собой пул ключей вместе с undici, socks и tls ради одного разбора числа.
function numberFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export class SpeechChunkIdentityConflictError extends Error {
  readonly statusCode = 409;
  constructor() {
    super("Фрагмент принадлежит другой записи");
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
    super("Диктовка не принята: не указан ни пациент, ни прием, поэтому клиника фрагмента не определяется.");
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

type SpeechRecordingEnvelope = {
  envelopeVersion: number;
  recordingId: string;
  chunks: SpeechTranscriptionChunk[];
};

function maxCachedRecordingCount(): number {
  return Math.max(1, numberFromEnv("DENTAL_SPEECH_CACHED_RECORDINGS", 80));
}

function maxCachedChunksPerRecording(): number {
  return Math.max(1, numberFromEnv("DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING", 600));
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
  patientId?: string | null;
  visitId?: string | null;
  source?: SpeechTranscriptionChunk["source"] | null;
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function countSpeechWords(text: string): number {
  return text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g)?.length ?? 0;
}

function speechChunkQuality(chunk: SpeechTranscriptionChunk): SpeechTranscriptionQuality {
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
    bytesPerSecond: chunk.durationMs ? Math.round((chunk.byteLength / (chunk.durationMs / 1000)) * 10) / 10 : null,
    providerWarnings: chunk.warnings.slice(0, 8),
    signals: ["legacy_chunk"],
    nextAction: "Проверьте старый фрагмент распознавания: он сохранен до появления метаданных качества."
  };
}

function countSpeechQualities(chunks: SpeechTranscriptionChunk[]): SpeechRecordingAssembly["qualityCounts"] {
  const counts = { clear: 0, review: 0, empty: 0, failed: 0 };
  for (const chunk of chunks) {
    counts[speechChunkQuality(chunk).level] += 1;
  }
  return counts;
}

function speechChunkMatchesScope(chunk: SpeechTranscriptionChunk, scope: SpeechRecordingScope = {}): boolean {
  if (scope.patientId !== undefined && chunk.patientId !== scope.patientId) return false;
  if (scope.visitId !== undefined && chunk.visitId !== scope.visitId) return false;
  if (scope.source !== undefined && chunk.source !== scope.source) return false;
  return true;
}

export function listSpeechTranscriptionChunks(recordingId: string, scope: SpeechRecordingScope = {}): SpeechTranscriptionChunk[] {
  const chunks = speechTranscriptionChunks.filter(
    (chunk) => chunk.recordingId === recordingId && speechChunkMatchesScope(chunk, scope)
  );
  return chunks.slice().sort((left, right) => left.chunkIndex - right.chunkIndex || left.createdAt.localeCompare(right.createdAt));
}

function assembleSpeechRecordingFromChunks(recordingId: string, chunks: SpeechTranscriptionChunk[]): SpeechRecordingAssembly {
  const receivedChunkIndexes = chunks.map((chunk) => chunk.chunkIndex);
  const maxChunkIndex = receivedChunkIndexes.length ? Math.max(...receivedChunkIndexes) : -1;
  const received = new Set(receivedChunkIndexes);
  const missingChunkIndexes = maxChunkIndex >= 0
    ? Array.from({ length: maxChunkIndex + 1 }, (_, index) => index).filter((index) => !received.has(index))
    : [];
  const transcript = chunks.map((chunk) => chunk.transcript.trim()).filter(Boolean).join("\n").trim();
  const providerLabels = uniqueStrings(chunks.map((chunk) => chunk.providerLabel));
  const statuses = Array.from(new Set(chunks.map((chunk) => chunk.status)));
  const qualityCounts = countSpeechQualities(chunks);
  const qualityWarnings = chunks
    .map((chunk) => {
      const quality = speechChunkQuality(chunk);
      return quality.level === "clear" ? "" : `Фрагмент ${chunk.chunkIndex + 1}: качество ${quality.level}, ${quality.nextAction}`;
    })
    .filter(Boolean);
  const warnings = [
    ...chunks.flatMap((chunk) => chunk.warnings),
    ...qualityWarnings,
    speechDurableStoreWarning(),
    chunks.length ? "" : "У записи пока нет серверных фрагментов.",
    missingChunkIndexes.length ? `Нет фрагментов с индексами: ${missingChunkIndexes.join(", ")}.` : "",
    chunks.some((chunk) => chunk.status === "failed") ? "Минимум один фрагмент не распознан." : "",
    transcript ? "" : "Текст расшифровки еще не собран; локальный черновик браузера может содержать несинхронизированный текст."
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
    assembledAt: new Date().toISOString()
  };
}

export function assembleSpeechRecording(recordingId: string, scope: SpeechRecordingScope = {}): SpeechRecordingAssembly {
  return assembleSpeechRecordingFromChunks(recordingId, listSpeechTranscriptionChunks(recordingId, scope));
}

function speechRecordingRecoveryFromChunks(recordingId: string, chunks: SpeechTranscriptionChunk[]): SpeechRecordingRecoveryItem {
  const sortedChunks = chunks.slice().sort((left, right) => left.chunkIndex - right.chunkIndex || left.createdAt.localeCompare(right.createdAt));
  const assembly = assembleSpeechRecordingFromChunks(recordingId, sortedChunks);
  const statusCounts = {
    transcribed: sortedChunks.filter((chunk) => chunk.status === "transcribed").length,
    fallback_text: sortedChunks.filter((chunk) => chunk.status === "fallback_text").length,
    needs_provider_key: sortedChunks.filter((chunk) => chunk.status === "needs_provider_key").length,
    failed: sortedChunks.filter((chunk) => chunk.status === "failed").length
  };
  const totalDurationMs = sortedChunks.some((chunk) => chunk.durationMs !== null)
    ? sortedChunks.reduce((total, chunk) => total + (chunk.durationMs ?? 0), 0)
    : null;
  const totalBytes = sortedChunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const qualityCounts = countSpeechQualities(sortedChunks);
  const transcriptPreview = assembly.transcript.replace(/\s+/g, " ").trim().slice(0, 220);
  const recoveryState = assembly.missingChunkIndexes.length > 0
    ? "missing_chunks"
    : statusCounts.failed > 0
      ? "failed_chunks"
      : assembly.transcript.trim()
        ? qualityCounts.review || qualityCounts.empty || qualityCounts.failed
          ? "quality_review"
          : "complete"
        : "transcript_empty";
  const nextAction = recoveryState === "complete"
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
    warnings: assembly.warnings
  };
}

export function listSpeechRecordingRecoveries(input: { visitId?: string | null; patientId?: string | null; limit?: number | null } = {}): SpeechRecordingRecoveryList {
  const grouped = new Map<string, SpeechTranscriptionChunk[]>();
  for (const chunk of speechTranscriptionChunks) {
    if (input.visitId && chunk.visitId !== input.visitId) continue;
    if (input.patientId && chunk.patientId !== input.patientId) continue;
    const chunks = grouped.get(chunk.recordingId) ?? [];
    chunks.push(chunk);
    grouped.set(chunk.recordingId, chunks);
  }

  const recordings = Array.from(grouped.entries())
    .map(([recordingId, chunks]) => speechRecordingRecoveryFromChunks(recordingId, chunks))
    .sort((left, right) => (right.lastChunkAt ?? "").localeCompare(left.lastChunkAt ?? ""))
    .slice(0, Math.max(1, Math.min(input.limit ?? 50, 200)));

  return {
    recordings,
    totalRecordings: grouped.size,
    generatedAt: new Date().toISOString()
  };
}

function speechTranscriptionStatusRank(status: SpeechTranscriptionChunk["status"]): number {
  switch (status) {
    case "transcribed": return 4;
    case "fallback_text": return 3;
    case "needs_provider_key": return 2;
    case "failed": return 1;
  }
}

function speechQualityRank(quality: SpeechTranscriptionQuality): number {
  switch (quality.level) {
    case "clear": return 4;
    case "review": return 3;
    case "empty": return 2;
    case "failed": return 1;
  }
}

function shouldReplaceSpeechTranscriptionChunk(
  existing: SpeechTranscriptionChunk,
  next: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">
): boolean {
  const existingTranscript = existing.transcript.trim();
  const nextTranscript = next.transcript.trim();
  if (!existingTranscript && nextTranscript) return true;
  if (existingTranscript && !nextTranscript) return false;

  const existingStatusRank = speechTranscriptionStatusRank(existing.status);
  const nextStatusRank = speechTranscriptionStatusRank(next.status);
  if (nextStatusRank !== existingStatusRank) return nextStatusRank > existingStatusRank;

  const existingQualityRank = speechQualityRank(speechChunkQuality(existing));
  const nextQualityRank = speechQualityRank(next.quality);
  if (nextQualityRank !== existingQualityRank) return nextQualityRank > existingQualityRank;

  return nextTranscript.length > existingTranscript.length && next.status !== "failed";
}

function speechChunkRetryIdentityMatches(
  existing: SpeechTranscriptionChunk,
  next: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">
): boolean {
  return (
    existing.source === next.source &&
    existing.patientId === next.patientId &&
    existing.visitId === next.visitId &&
    existing.language === next.language
  );
}

/**
 * Вытеснение из горячего кэша. Раньше оно резало массив по числу записей и
 * фрагментов без единой проверки, сохранён ли текст хоть где-то, — то есть
 * молча уничтожало медицинский текст. Теперь выбрасываются только фрагменты,
 * подтверждённо записанные в PostgreSQL; всё остальное остаётся в памяти,
 * даже если лимит превышен.
 */
function trimSpeechTranscriptionChunkRetention(): void {
  const chunkCap = maxCachedChunksPerRecording();
  const recordingCap = maxCachedRecordingCount();
  const retainedRecordings = new Set(
    Array.from(new Set(speechTranscriptionChunks.map((chunk) => chunk.recordingId))).slice(0, recordingCap)
  );
  const keptPerRecording = new Map<string, number>();
  const keptChunks: SpeechTranscriptionChunk[] = [];
  for (const chunk of speechTranscriptionChunks) {
    const count = keptPerRecording.get(chunk.recordingId) ?? 0;
    const overCap = !retainedRecordings.has(chunk.recordingId) || count >= chunkCap;
    if (overCap && durableChunkKeys.has(speechChunkKey(chunk.recordingId, chunk.chunkIndex))) {
      continue;
    }
    keptPerRecording.set(chunk.recordingId, count + 1);
    keptChunks.push(chunk);
  }
  speechTranscriptionChunks.splice(0, speechTranscriptionChunks.length, ...keptChunks);

  const liveKeys = new Set(keptChunks.map((chunk) => speechChunkKey(chunk.recordingId, chunk.chunkIndex)));
  for (const key of durableChunkKeys) {
    if (!liveKeys.has(key)) durableChunkKeys.delete(key);
  }
}

async function resolveSpeechChunkOrganizationId(scope: {
  patientId?: string | null;
  visitId?: string | null;
}): Promise<string> {
  if (scope.visitId) {
    const [visit] = await db
      .select({ organizationId: visits.organizationId })
      .from(visits)
      .where(eq(visits.id, scope.visitId))
      .limit(1);
    if (visit?.organizationId) return visit.organizationId;
  }
  if (scope.patientId) {
    const [patient] = await db
      .select({ organizationId: patients.organizationId })
      .from(patients)
      .where(eq(patients.id, scope.patientId))
      .limit(1);
    if (patient?.organizationId) return patient.organizationId;
  }
  throw new SpeechChunkOrganizationScopeError();
}

function speechRecordingJobStatus(chunks: SpeechTranscriptionChunk[]): "queued" | "needs_review" | "failed" {
  if (chunks.some((chunk) => chunk.status === "needs_provider_key")) return "queued";
  if (chunks.length > 0 && chunks.every((chunk) => chunk.status === "failed")) return "failed";
  return "needs_review";
}

/**
 * Средняя уверенность по фрагментам, у которых она вообще есть. Если её нет ни
 * у одного — возвращается null, и колонка не переписывается: подставлять ноль
 * вместо неизвестного значения запрещено, это выдумывание данных.
 */
function speechRecordingConfidence(chunks: SpeechTranscriptionChunk[]): number | null {
  const values = chunks
    .map((chunk) => chunk.confidence)
    .filter((confidence): confidence is number => typeof confidence === "number");
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function persistSpeechRecording(recordingId: string, organizationId: string): Promise<void> {
  const chunks = listSpeechTranscriptionChunks(recordingId);
  if (chunks.length === 0) return;

  const assembly = assembleSpeechRecordingFromChunks(recordingId, chunks);
  const recovery = speechRecordingRecoveryFromChunks(recordingId, chunks);
  const envelope: SpeechRecordingEnvelope = { envelopeVersion: durableEnvelopeVersion, recordingId, chunks };
  const confidence = speechRecordingConfidence(chunks);
  const storagePath = durableRecordingPath(recordingId);
  const values = {
    patientId: recovery.patientId,
    visitId: recovery.visitId,
    target: "visit_note" as const,
    status: speechRecordingJobStatus(chunks),
    sourceLabel: `${durableSourceLabelPrefix}${recovery.source}`,
    inputText: JSON.stringify(envelope),
    resultText: assembly.transcript,
    warnings: assembly.warnings,
    suggestedNextStep: recovery.nextAction,
    modelName: assembly.providerLabels.join(", ") || null,
    updatedAt: new Date(),
    ...(confidence === null ? {} : { confidence })
  };

  const [updated] = await db
    .update(aiJobs)
    .set(values)
    .where(and(eq(aiJobs.organizationId, organizationId), eq(aiJobs.inputStoragePath, storagePath)))
    .returning({ id: aiJobs.id });

  if (!updated) {
    await db.insert(aiJobs).values({
      organizationId,
      kind: "voice_transcription",
      inputStoragePath: storagePath,
      ...values
    });
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

function queueDurableRecordingWrite(recordingId: string, task: () => Promise<void>): Promise<void> {
  const previous = speechRecordingWriteChains.get(recordingId) ?? Promise.resolve();
  const started = previous.then(task, task);
  const tracked: Promise<void> = started.then(
    () => {
      if (speechRecordingWriteChains.get(recordingId) === tracked) speechRecordingWriteChains.delete(recordingId);
    },
    () => {
      if (speechRecordingWriteChains.get(recordingId) === tracked) speechRecordingWriteChains.delete(recordingId);
    }
  );
  speechRecordingWriteChains.set(recordingId, tracked);
  return started;
}

let speechRestorePromise: Promise<void> | null = null;
let speechRestoreFailure: string | null = null;

function speechDurableStoreWarning(): string {
  if (speechRestoreFailure) {
    return `Расшифровки не восстановлены из базы (${speechRestoreFailure}); список может быть неполным.`;
  }
  return "";
}

function restoredChunksFromEnvelope(rawEnvelope: string | null): SpeechTranscriptionChunk[] {
  if (!rawEnvelope) return [];
  const parsed = JSON.parse(rawEnvelope) as Partial<SpeechRecordingEnvelope>;
  if (!Array.isArray(parsed.chunks)) return [];
  const restored: SpeechTranscriptionChunk[] = [];
  for (const candidate of parsed.chunks) {
    const chunk = speechTranscriptionChunkSchema.safeParse(candidate);
    if (chunk.success) restored.push(chunk.data);
  }
  return restored;
}

async function restoreSpeechTranscriptionChunks(): Promise<void> {
  const rows = await db
    .select({ inputText: aiJobs.inputText, inputStoragePath: aiJobs.inputStoragePath })
    .from(aiJobs)
    .where(eq(aiJobs.kind, "voice_transcription"))
    .orderBy(desc(aiJobs.updatedAt))
    .limit(maxCachedRecordingCount());

  const cached = new Set(speechTranscriptionChunks.map((chunk) => speechChunkKey(chunk.recordingId, chunk.chunkIndex)));
  for (const row of rows) {
    if (!row.inputStoragePath?.startsWith(durableRecordingPathPrefix)) continue;
    for (const chunk of restoredChunksFromEnvelope(row.inputText)) {
      const key = speechChunkKey(chunk.recordingId, chunk.chunkIndex);
      durableChunkKeys.add(key);
      if (cached.has(key)) continue;
      cached.add(key);
      speechTranscriptionChunks.push(chunk);
    }
  }
}

/**
 * Идемпотентная загрузка расшифровок из PostgreSQL в горячий кэш. Вызывается
 * при импорте модуля (то есть на старте сервера) и перед каждой записью, чтобы
 * восстановление не гонялось с новым фрагментом. Тест использует её же, чтобы
 * пройти границу перезапуска процесса.
 */
export function ensureSpeechTranscriptionChunksRestored(): Promise<void> {
  if (!speechRestorePromise) {
    speechRestorePromise = restoreSpeechTranscriptionChunks().then(
      () => {
        speechRestoreFailure = null;
      },
      (error: unknown) => {
        speechRestoreFailure = error instanceof Error ? error.message : "неизвестная ошибка чтения";
        console.error("[SpeechStorage] Не удалось восстановить расшифровки диктовки из базы:", error);
      }
    );
  }
  return speechRestorePromise;
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
}

export async function recordSpeechTranscriptionChunk(
  input: Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">
): Promise<SpeechTranscriptionChunk> {
  await ensureSpeechTranscriptionChunksRestored();

  const identityConflict = speechTranscriptionChunks.find(
    (chunk) => chunk.recordingId === input.recordingId && !speechChunkRetryIdentityMatches(chunk, input)
  );
  if (identityConflict) {
    throw new SpeechChunkIdentityConflictError();
  }

  const existingIndex = speechTranscriptionChunks.findIndex(
    (chunk) => chunk.recordingId === input.recordingId && chunk.chunkIndex === input.chunkIndex
  );

  if (existingIndex >= 0) {
    const existing = speechTranscriptionChunks[existingIndex];
    if (existing && !speechChunkRetryIdentityMatches(existing, input)) {
      throw new SpeechChunkIdentityConflictError();
    }
    if (existing && !shouldReplaceSpeechTranscriptionChunk(existing, input)) {
      // Повтор не улучшил фрагмент, но прошлая запись в базу могла не пройти.
      // Используем повтор как ещё одну попытку сохранить текст.
      return await withDurableSpeechRecording(existing, existing.organizationId);
    }
    if (existing) {
      const chunk: SpeechTranscriptionChunk = {
        ...existing,
        ...input,
        id: existing.id,
        organizationId: existing.organizationId,
        createdAt: existing.createdAt,
        warnings: uniqueStrings([
          ...input.warnings,
          `Повторное распознавание улучшило аудиофрагмент: ${existing.status}/${speechChunkQuality(existing).level} -> ${input.status}/${input.quality.level}.`
        ]).slice(0, 12)
      };
      speechTranscriptionChunks.splice(existingIndex, 1, chunk);
      durableChunkKeys.delete(speechChunkKey(chunk.recordingId, chunk.chunkIndex));
      return await withDurableSpeechRecording(chunk, chunk.organizationId);
    }
  }

  const organizationId = await resolveSpeechChunkOrganizationId(input);

  const chunk: SpeechTranscriptionChunk = {
    id: randomUUID(),
    organizationId,
    createdAt: new Date().toISOString(),
    ...input
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
  organizationId: string
): Promise<SpeechTranscriptionChunk> {
  const key = speechChunkKey(chunk.recordingId, chunk.chunkIndex);
  if (durableChunkKeys.has(key)) return chunk;

  try {
    await queueDurableRecordingWrite(chunk.recordingId, () => persistSpeechRecording(chunk.recordingId, organizationId));
    return chunk;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "неизвестная ошибка записи";
    console.error(`[SpeechStorage] Расшифровка ${chunk.recordingId} не сохранена в базу:`, error);
    chunk.warnings = uniqueStrings([
      ...chunk.warnings,
      `Фрагмент не сохранен в базу (${reason}); текст держится только в памяти сервера и будет потерян при перезапуске.`
    ]).slice(0, 12);
    return chunk;
  }
}

void ensureSpeechTranscriptionChunksRestored();
