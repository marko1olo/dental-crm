import { after, before, describe, it } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { db, pool } from "../../db/client.js";
import { aiJobs, visits } from "../../db/schema.js";
import {
  SpeechChunkOrganizationScopeError,
  assembleSpeechRecording,
  ensureSpeechTranscriptionChunksRestored,
  listSpeechTranscriptionChunks,
  recordSpeechTranscriptionChunk,
  resetSpeechTranscriptionCacheForRestart
} from "../storage.js";

/**
 * Граница перезапуска процесса проверяется на настоящей PostgreSQL: фрагмент
 * пишется, горячий кэш обнуляется как при новом процессе, и текст читается
 * обратно из базы. Идентификаторы приема и клиники берутся запросом, а не
 * прописываются в коде.
 */

const dictationText = "Жалобы на боль в зубе 26 при накусывании. Перкуссия слабоположительная.";
const durableRecordingPathPrefix = "speech-recording://";

type SpeechChunkInput = Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">;

let clinicalScope: { visitId: string; patientId: string; organizationId: string } | null = null;
const createdRecordingIds: string[] = [];

function buildChunkInput(overrides: Partial<SpeechChunkInput> & { recordingId: string }): SpeechChunkInput {
  return {
    chunkIndex: 0,
    source: "visit",
    patientId: clinicalScope?.patientId ?? null,
    visitId: clinicalScope?.visitId ?? null,
    providerId: "none",
    providerLabel: "Локальный текст браузера",
    mimeType: "audio/webm",
    byteLength: 2048,
    durationMs: 4000,
    language: "ru",
    transcript: dictationText,
    confidence: 0.91,
    status: "transcribed",
    quality: {
      level: "clear",
      confidence: 0.91,
      wordCount: 11,
      charCount: dictationText.length,
      durationMs: 4000,
      bytesPerSecond: 512,
      providerWarnings: [],
      signals: ["unit_test"],
      nextAction: "Проверьте текст перед подписанием приема."
    },
    warnings: [],
    clientRecordedAt: new Date().toISOString(),
    ...overrides
  };
}

before(async () => {
  const [visit] = await db
    .select({ id: visits.id, patientId: visits.patientId, organizationId: visits.organizationId })
    .from(visits)
    .limit(1);
  assert.ok(visit, "в базе нет ни одного приема: тест диктовки нечем привязать к клинике");
  clinicalScope = { visitId: visit.id, patientId: visit.patientId, organizationId: visit.organizationId };
});

after(async () => {
  for (const recordingId of createdRecordingIds) {
    await db.delete(aiJobs).where(eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`));
  }
  resetSpeechTranscriptionCacheForRestart();
  await pool.end();
});

describe("хранение расшифровок диктовки", () => {
  it("текст переживает перезапуск процесса и читается из PostgreSQL", async () => {
    const scope = clinicalScope;
    assert.ok(scope);
    const recordingId = `test-restart-${randomUUID()}`;
    createdRecordingIds.push(recordingId);

    resetSpeechTranscriptionCacheForRestart();
    const chunk = await recordSpeechTranscriptionChunk(buildChunkInput({ recordingId }));
    assert.strictEqual(
      chunk.organizationId,
      scope.organizationId,
      "клиника фрагмента должна браться из приема, а не из первой строки organizations"
    );
    assert.deepStrictEqual(
      chunk.warnings.filter((warning) => warning.includes("не сохранен в базу")),
      [],
      "запись в базу не должна была провалиться"
    );

    // Граница перезапуска: новый процесс поверх той же базы, кэш пуст.
    resetSpeechTranscriptionCacheForRestart();
    assert.deepStrictEqual(
      listSpeechTranscriptionChunks(recordingId),
      [],
      "после сброса кэша в памяти не должно остаться ничего"
    );

    await ensureSpeechTranscriptionChunksRestored();
    const restored = listSpeechTranscriptionChunks(recordingId);
    assert.strictEqual(restored.length, 1, "фрагмент не восстановлен из базы");
    assert.strictEqual(restored[0]?.transcript, dictationText);
    assert.strictEqual(restored[0]?.organizationId, scope.organizationId);
    assert.strictEqual(restored[0]?.visitId, scope.visitId);
    assert.strictEqual(assembleSpeechRecording(recordingId).transcript, dictationText);
  });

  it("собранный текст лежит в ai_jobs как voice_transcription и читается обычным SQL", async () => {
    const scope = clinicalScope;
    assert.ok(scope);
    const recordingId = `test-sql-${randomUUID()}`;
    createdRecordingIds.push(recordingId);

    resetSpeechTranscriptionCacheForRestart();
    await recordSpeechTranscriptionChunk(buildChunkInput({ recordingId }));
    const secondLine = "Диагноз K04.0, пульпит. План: эндодонтическое лечение.";
    await recordSpeechTranscriptionChunk(
      buildChunkInput({ recordingId, chunkIndex: 1, transcript: secondLine })
    );

    const [row] = await db
      .select({
        organizationId: aiJobs.organizationId,
        visitId: aiJobs.visitId,
        kind: aiJobs.kind,
        sourceLabel: aiJobs.sourceLabel,
        resultText: aiJobs.resultText
      })
      .from(aiJobs)
      .where(
        and(
          eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`),
          eq(aiJobs.organizationId, scope.organizationId)
        )
      )
      .limit(1);

    assert.ok(row, "строка расшифровки не найдена в ai_jobs");
    assert.strictEqual(row.kind, "voice_transcription");
    assert.strictEqual(row.sourceLabel, "speech_dictation:visit");
    assert.strictEqual(row.visitId, scope.visitId);
    assert.strictEqual(row.resultText, `${dictationText}\n${secondLine}`);
  });

  it("одна запись диктовки даёт одну строку, а не строку на каждый фрагмент", async () => {
    const scope = clinicalScope;
    assert.ok(scope);
    const recordingId = `test-single-row-${randomUUID()}`;
    createdRecordingIds.push(recordingId);

    resetSpeechTranscriptionCacheForRestart();
    for (let chunkIndex = 0; chunkIndex < 4; chunkIndex += 1) {
      await recordSpeechTranscriptionChunk(
        buildChunkInput({ recordingId, chunkIndex, transcript: `Фрагмент ${chunkIndex + 1}: осмотр продолжается.` })
      );
    }

    const rows = await db
      .select({ id: aiJobs.id })
      .from(aiJobs)
      .where(like(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`));
    assert.strictEqual(rows.length, 1, "на запись диктовки должна приходиться ровно одна строка ai_jobs");

    resetSpeechTranscriptionCacheForRestart();
    await ensureSpeechTranscriptionChunksRestored();
    assert.strictEqual(listSpeechTranscriptionChunks(recordingId).length, 4);
  });

  it("фрагмент без пациента и приема отклоняется, а не приписывается выдуманной клинике", async () => {
    resetSpeechTranscriptionCacheForRestart();
    await assert.rejects(
      () =>
        recordSpeechTranscriptionChunk(
          buildChunkInput({
            recordingId: `test-no-scope-${randomUUID()}`,
            source: "document",
            patientId: null,
            visitId: null
          })
        ),
      (error: unknown) => {
        assert.ok(error instanceof SpeechChunkOrganizationScopeError);
        assert.strictEqual(error.statusCode, 400);
        return true;
      }
    );
  });
});
