import { after, before, describe, it } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { and, eq, like, ne } from "drizzle-orm";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { db, pool } from "../../db/client.js";
import { aiJobs, patients, visits } from "../../db/schema.js";
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
let otherClinicScope: { patientId: string; organizationId: string } | null = null;
const createdRecordingIds: string[] = [];
const createdForeignJobIds: string[] = [];

/**
 * Лимиты кэша читаются из окружения на каждом вызове, поэтому границу
 * вытеснения можно пройти без ожидания 80 записей. Значения возвращаются
 * обратно, чтобы соседние тесты видели штатную конфигурацию.
 */
async function withEnv(values: Record<string, string>, run: () => Promise<void>): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function durableRowFilter(recordingId: string, organizationId: string) {
  return and(
    eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`),
    eq(aiJobs.organizationId, organizationId)
  );
}

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

  // Вторая клиника нужна для проверки, что бюджет кэша принадлежит клинике, а не
  // всей базе. Берётся пациент любой ДРУГОЙ организации: у второй клиники в базе
  // может не быть приемов, а клиника фрагмента определяется и по пациенту.
  const [otherPatient] = await db
    .select({ id: patients.id, organizationId: patients.organizationId })
    .from(patients)
    .where(ne(patients.organizationId, visit.organizationId))
    .limit(1);
  assert.ok(otherPatient, "в базе только одна организация: межклиничную границу кэша проверить нечем");
  otherClinicScope = { patientId: otherPatient.id, organizationId: otherPatient.organizationId };
});

after(async () => {
  for (const recordingId of createdRecordingIds) {
    await db.delete(aiJobs).where(eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`));
  }
  for (const jobId of createdForeignJobIds) {
    await db.delete(aiJobs).where(eq(aiJobs.id, jobId));
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

  /**
   * Сценарий ревьюера пакета C4 дословно: фрагмент вытесняется из кэша, потому
   * что он уже в базе, а следующий фрагмент той же записи переписывал строку
   * конвертом из усечённого кэша. Ревьюер получил на этом
   * «AFTER 4TH CHUNK (cap=2): "Часть 2.\nЧасть 3.\nЧасть 4."» — «Часть 1.»
   * была удалена из PostgreSQL. Запись обязана сливаться с сохранённым конвертом.
   */
  it("вытеснение из кэша не затирает продиктованный текст в PostgreSQL", async () => {
    const scope = clinicalScope;
    assert.ok(scope);
    const recordingId = `test-merge-${randomUUID()}`;
    createdRecordingIds.push(recordingId);
    const lines = ["Жалобы: боль зуб 26.", "Диагноз K04.0 пульпит.", "План: эндодонтическое лечение."];

    await withEnv({ DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING: "1" }, async () => {
      resetSpeechTranscriptionCacheForRestart();
      for (const [chunkIndex, transcript] of lines.entries()) {
        await recordSpeechTranscriptionChunk(buildChunkInput({ recordingId, chunkIndex, transcript }));
      }

      assert.strictEqual(
        listSpeechTranscriptionChunks(recordingId).length,
        1,
        "кэш должен быть вытеснен до предела: иначе сценарий потери не воспроизводится"
      );

      const [row] = await db
        .select({ resultText: aiJobs.resultText, inputText: aiJobs.inputText })
        .from(aiJobs)
        .where(durableRowFilter(recordingId, scope.organizationId))
        .limit(1);
      assert.ok(row, "строка расшифровки не найдена в ai_jobs");
      assert.strictEqual(
        row.resultText,
        lines.join("\n"),
        "текст вытесненных фрагментов затёрт в базе конвертом из усечённого кэша"
      );
      const envelope = JSON.parse(row.inputText ?? "{}") as { chunks?: unknown[] };
      assert.strictEqual(envelope.chunks?.length, 3, "конверт потерял фрагменты");

      resetSpeechTranscriptionCacheForRestart();
      await ensureSpeechTranscriptionChunksRestored();
      assert.strictEqual(listSpeechTranscriptionChunks(recordingId).length, 3, "из базы восстановлены не все фрагменты");
      assert.strictEqual(assembleSpeechRecording(recordingId).transcript, lines.join("\n"));
    });
  });

  /**
   * В ai_jobs с тем же kind = voice_transcription пишет второй автор —
   * db/aiQuery.ts createAiRecognitionJobInDb, у него input_storage_path пуст.
   * Пока префикс проверялся ПОСЛЕ SQL-лимита, такие строки съедали лимит и
   * восстановление возвращало ноль расшифровок.
   */
  it("чужие строки voice_transcription не съедают лимит восстановления", async () => {
    const scope = clinicalScope;
    assert.ok(scope);
    const recordingId = `test-foreign-${randomUUID()}`;
    createdRecordingIds.push(recordingId);

    resetSpeechTranscriptionCacheForRestart();
    await recordSpeechTranscriptionChunk(buildChunkInput({ recordingId }));

    const [foreignJob] = await db
      .insert(aiJobs)
      .values({
        organizationId: scope.organizationId,
        kind: "voice_transcription",
        target: "visit_note",
        status: "needs_review",
        sourceLabel: "manual",
        inputText: "Распознавание, созданное через POST /api/ai/recognition-jobs.",
        resultText: "Распознавание, созданное через POST /api/ai/recognition-jobs.",
        confidence: 0.72,
        warnings: [],
        suggestedNextStep: "review_result"
      })
      .returning({ id: aiJobs.id });
    assert.ok(foreignJob, "не удалось создать чужую строку voice_transcription");
    createdForeignJobIds.push(foreignJob.id);

    await withEnv({ DENTAL_SPEECH_CACHED_RECORDINGS: "1" }, async () => {
      resetSpeechTranscriptionCacheForRestart();
      await ensureSpeechTranscriptionChunksRestored();
      assert.strictEqual(
        listSpeechTranscriptionChunks(recordingId).length,
        1,
        "лимит восстановления ушёл чужой строке ai_jobs, диктовка не вернулась в память"
      );
    });
  });

  it("поток диктовок одной клиники не вытесняет расшифровку другой", async () => {
    const scope = clinicalScope;
    const other = otherClinicScope;
    assert.ok(scope);
    assert.ok(other);
    const ownRecordingId = `test-org-own-${randomUUID()}`;
    const otherRecordingId = `test-org-other-${randomUUID()}`;
    createdRecordingIds.push(ownRecordingId, otherRecordingId);

    await withEnv({ DENTAL_SPEECH_CACHED_RECORDINGS: "1" }, async () => {
      resetSpeechTranscriptionCacheForRestart();
      await recordSpeechTranscriptionChunk(
        buildChunkInput({
          recordingId: otherRecordingId,
          patientId: other.patientId,
          visitId: null,
          transcript: "Соседняя клиника: жалобы на боль в зубе 36."
        })
      );
      await recordSpeechTranscriptionChunk(
        buildChunkInput({ recordingId: ownRecordingId, transcript: "Своя клиника: осмотр без особенностей." })
      );

      assert.strictEqual(
        listSpeechTranscriptionChunks(otherRecordingId).length,
        1,
        "запись другой клиники вытеснена из памяти общим на всю базу лимитом"
      );

      resetSpeechTranscriptionCacheForRestart();
      await ensureSpeechTranscriptionChunksRestored();
      assert.strictEqual(
        listSpeechTranscriptionChunks(otherRecordingId).length,
        1,
        "восстановление с общим лимитом не вернуло расшифровку второй клиники"
      );
      assert.strictEqual(listSpeechTranscriptionChunks(ownRecordingId).length, 1);
    });
  });

  /**
   * Обратная сторона запрета на уничтожение текста: фрагмент, который не прошёл
   * в базу, остаётся в памяти сверх лимита. Здесь запись в ai_jobs валится по
   * внешнему ключу visit_id (приема с таким id нет), а чтения работают — именно
   * так выглядит частичный отказ базы, а не полная её недоступность.
   */
  it("несохранённый фрагмент остаётся в памяти сверх лимита и несёт предупреждение", async () => {
    const scope = clinicalScope;
    assert.ok(scope);
    const recordingId = `test-undurable-${randomUUID()}`;
    createdRecordingIds.push(recordingId);
    const missingVisitId = randomUUID();

    await withEnv({ DENTAL_SPEECH_CACHED_CHUNKS_PER_RECORDING: "1" }, async () => {
      resetSpeechTranscriptionCacheForRestart();
      const first = await recordSpeechTranscriptionChunk(
        buildChunkInput({
          recordingId,
          visitId: missingVisitId,
          patientId: scope.patientId,
          transcript: "Фрагмент, который база не приняла."
        })
      );
      assert.ok(
        first.warnings.some((warning) => warning.includes("не сохранен в базу")),
        "провал записи в базу не отражён в предупреждениях фрагмента"
      );

      await recordSpeechTranscriptionChunk(
        buildChunkInput({
          recordingId,
          chunkIndex: 1,
          visitId: missingVisitId,
          patientId: scope.patientId,
          transcript: "Второй фрагмент, который база тоже не приняла."
        })
      );

      assert.strictEqual(
        listSpeechTranscriptionChunks(recordingId).length,
        2,
        "вытеснение выбросило фрагмент, которого нет в базе: это потеря медицинского текста"
      );

      const [row] = await db
        .select({ id: aiJobs.id })
        .from(aiJobs)
        .where(durableRowFilter(recordingId, scope.organizationId))
        .limit(1);
      assert.strictEqual(row, undefined, "строка ai_jobs не должна была появиться при отказе записи");
    });
  });

  /**
   * ai_jobs.confidence — real NOT NULL DEFAULT 0, «неизвестно» колонка хранить не
   * умеет. Пока значение просто опускали, ноль появлялся из DEFAULT молча, и
   * GET /api/ai/recognition-jobs показывал неизвестную уверенность как 0 %.
   */
  it("неизвестная уверенность распознавания не выдаётся молча за нулевую", async () => {
    const scope = clinicalScope;
    assert.ok(scope);
    const recordingId = `test-confidence-${randomUUID()}`;
    createdRecordingIds.push(recordingId);

    resetSpeechTranscriptionCacheForRestart();
    const base = buildChunkInput({ recordingId, transcript: "Локальный текст браузера без оценки уверенности." });
    await recordSpeechTranscriptionChunk({
      ...base,
      confidence: null,
      quality: { ...base.quality, confidence: null }
    });

    const [row] = await db
      .select({ confidence: aiJobs.confidence, warnings: aiJobs.warnings })
      .from(aiJobs)
      .where(durableRowFilter(recordingId, scope.organizationId))
      .limit(1);
    assert.ok(row, "строка расшифровки не найдена в ai_jobs");
    assert.strictEqual(row.confidence, 0, "колонка NOT NULL DEFAULT 0 не умеет хранить «неизвестно»");
    assert.ok(
      (row.warnings ?? []).some((warning) => warning.includes("не сообщена")),
      "строка не объявляет, что уверенность неизвестна: ноль читается как оценка качества"
    );
  });
});
