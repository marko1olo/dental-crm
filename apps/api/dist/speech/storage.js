import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { organizations } from "../db/schema.js";
export class SpeechChunkIdentityConflictError extends Error {
    statusCode = 409;
    constructor() {
        super("Фрагмент принадлежит другой записи");
        this.name = "SpeechChunkIdentityConflictError";
    }
}
// Transient in-memory storage for dictation chunks
const speechTranscriptionChunks = [];
function uniqueStrings(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function countSpeechWords(text) {
    return text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)*/g)?.length ?? 0;
}
function speechChunkQuality(chunk) {
    const existingQuality = chunk.quality;
    if (existingQuality)
        return existingQuality;
    const transcript = chunk.transcript.replace(/\s+/g, " ").trim();
    const level = chunk.status === "failed" ? "failed" : transcript ? "review" : "empty";
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
function countSpeechQualities(chunks) {
    const counts = { clear: 0, review: 0, empty: 0, failed: 0 };
    for (const chunk of chunks) {
        counts[speechChunkQuality(chunk).level] += 1;
    }
    return counts;
}
function speechChunkMatchesScope(chunk, scope = {}) {
    if (scope.patientId !== undefined && chunk.patientId !== scope.patientId)
        return false;
    if (scope.visitId !== undefined && chunk.visitId !== scope.visitId)
        return false;
    if (scope.source !== undefined && chunk.source !== scope.source)
        return false;
    return true;
}
export function listSpeechTranscriptionChunks(recordingId, scope = {}) {
    const chunks = speechTranscriptionChunks.filter((chunk) => chunk.recordingId === recordingId && speechChunkMatchesScope(chunk, scope));
    return chunks.slice().sort((left, right) => left.chunkIndex - right.chunkIndex || left.createdAt.localeCompare(right.createdAt));
}
function assembleSpeechRecordingFromChunks(recordingId, chunks) {
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
export function assembleSpeechRecording(recordingId, scope = {}) {
    return assembleSpeechRecordingFromChunks(recordingId, listSpeechTranscriptionChunks(recordingId, scope));
}
function speechRecordingRecoveryFromChunks(recordingId, chunks) {
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
export function listSpeechRecordingRecoveries(input = {}) {
    const grouped = new Map();
    for (const chunk of speechTranscriptionChunks) {
        if (input.visitId && chunk.visitId !== input.visitId)
            continue;
        if (input.patientId && chunk.patientId !== input.patientId)
            continue;
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
function speechTranscriptionStatusRank(status) {
    switch (status) {
        case "transcribed": return 4;
        case "fallback_text": return 3;
        case "needs_provider_key": return 2;
        case "failed": return 1;
    }
}
function speechQualityRank(quality) {
    switch (quality.level) {
        case "clear": return 4;
        case "review": return 3;
        case "empty": return 2;
        case "failed": return 1;
    }
}
function shouldReplaceSpeechTranscriptionChunk(existing, next) {
    const existingTranscript = existing.transcript.trim();
    const nextTranscript = next.transcript.trim();
    if (!existingTranscript && nextTranscript)
        return true;
    if (existingTranscript && !nextTranscript)
        return false;
    const existingStatusRank = speechTranscriptionStatusRank(existing.status);
    const nextStatusRank = speechTranscriptionStatusRank(next.status);
    if (nextStatusRank !== existingStatusRank)
        return nextStatusRank > existingStatusRank;
    const existingQualityRank = speechQualityRank(speechChunkQuality(existing));
    const nextQualityRank = speechQualityRank(next.quality);
    if (nextQualityRank !== existingQualityRank)
        return nextQualityRank > existingQualityRank;
    return nextTranscript.length > existingTranscript.length && next.status !== "failed";
}
function speechChunkRetryIdentityMatches(existing, next) {
    return (existing.source === next.source &&
        existing.patientId === next.patientId &&
        existing.visitId === next.visitId &&
        existing.language === next.language);
}
function trimSpeechTranscriptionChunkRetention() {
    const maxChunksPerRecording = 600;
    const maxRecordingCount = 80;
    const recordingIds = Array.from(new Set(speechTranscriptionChunks.map((chunk) => chunk.recordingId))).slice(0, maxRecordingCount);
    const allowedRecordings = new Set(recordingIds);
    const keptPerRecording = new Map();
    const keptChunks = [];
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
    speechTranscriptionChunks.splice(0, speechTranscriptionChunks.length, ...keptChunks);
}
export async function recordSpeechTranscriptionChunk(input) {
    const identityConflict = speechTranscriptionChunks.find((chunk) => chunk.recordingId === input.recordingId && !speechChunkRetryIdentityMatches(chunk, input));
    if (identityConflict) {
        throw new SpeechChunkIdentityConflictError();
    }
    const existingIndex = speechTranscriptionChunks.findIndex((chunk) => chunk.recordingId === input.recordingId && chunk.chunkIndex === input.chunkIndex);
    if (existingIndex >= 0) {
        const existing = speechTranscriptionChunks[existingIndex];
        if (existing && !speechChunkRetryIdentityMatches(existing, input)) {
            throw new SpeechChunkIdentityConflictError();
        }
        if (existing && !shouldReplaceSpeechTranscriptionChunk(existing, input))
            return existing;
        if (existing) {
            const chunk = {
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
            return chunk;
        }
    }
    const [org] = await db.select().from(organizations).limit(1);
    const organizationId = org?.id ?? randomUUID();
    const chunk = {
        id: randomUUID(),
        organizationId,
        createdAt: new Date().toISOString(),
        ...input
    };
    speechTranscriptionChunks.unshift(chunk);
    trimSpeechTranscriptionChunkRetention();
    return chunk;
}
