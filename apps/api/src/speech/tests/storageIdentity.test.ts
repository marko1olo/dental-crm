import { after, before, describe, it } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { db, pool } from "../../db/client.js";
import { aiJobs, visits } from "../../db/schema.js";
import {
  SpeechChunkIdentityConflictError,
  listSpeechTranscriptionChunks,
  recordSpeechTranscriptionChunk,
  resetSpeechTranscriptionCacheForRestart
} from "../storage.js";

/**
 * Личность записи диктовки на настоящей PostgreSQL.
 *
 * Воспроизводится PROBE 2 ревьюера пакета R1: два приема одной клиники, горячий
 * кэш записи пуст, второй фрагмент несёт ЧУЖОЙ прием и ЧУЖОГО пациента.
 * Ревьюер получил одну строку ai_jobs с текстом обоих приемов под пациентом
 * первого:
 *   result_text: "VISIT-A DICTATION: patient A complaint.\nVISIT-B DICTATION: patient B complaint."
 *   envelope chunk visitIds: ["…400", "…401"]   patient_id: …101
 * Проверка личности жила только в горячем кэше, поэтому после вытеснения записи
 * из памяти она молча перестала работать, а слияние с сохранённым конвертом
 * личность не перепроверяло.
 *
 * Приемы и пациенты берутся запросом к базе, а не прописываются в коде.
 */

const durableRecordingPathPrefix = "speech-recording://";
const visitAText = "Прием А: жалобы на боль в зубе 26 при накусывании.";
const visitASecondText = "Прием А: диагноз K04.0, план эндодонтического лечения.";
const visitBText = "Прием Б: жалобы на скол пломбы в зубе 37.";

type SpeechChunkInput = Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">;

type ClinicalPair = {
  organizationId: string;
  visitA: string;
  patientA: string;
  visitB: string;
  patientB: string;
};

let clinicalPair: ClinicalPair | null = null;
const createdRecordingIds: string[] = [];

/**
 * Лимиты кэша читаются из окружения на каждом вызове, поэтому границу вытеснения
 * проходим без ожидания 80 записей. Значения возвращаются обратно.
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

function buildChunkInput(
  overrides: Partial<SpeechChunkInput> & { recordingId: string; visitId: string; patientId: string; transcript: string }
): SpeechChunkInput {
  return {
    chunkIndex: 0,
    source: "visit",
    providerId: "none",
    providerLabel: "Локальный текст браузера",
    mimeType: "audio/webm",
    byteLength: 2048,
    durationMs: 4000,
    language: "ru",
    confidence: 0.9,
    status: "transcribed",
    quality: {
      level: "clear",
      confidence: 0.9,
      wordCount: 8,
      charCount: overrides.transcript.length,
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

async function readDurableRow(recordingId: string, organizationId: string) {
  const [row] = await db
    .select({
      visitId: aiJobs.visitId,
      patientId: aiJobs.patientId,
      resultText: aiJobs.resultText,
      inputText: aiJobs.inputText
    })
    .from(aiJobs)
    .where(durableRowFilter(recordingId, organizationId))
    .limit(1);
  return row;
}

function envelopeIdentities(inputText: string | null): { visitIds: string[]; patientIds: string[] } {
  const parsed = JSON.parse(inputText ?? "{}") as { chunks?: Array<{ visitId?: string | null; patientId?: string | null }> };
  const chunks = parsed.chunks ?? [];
  return {
    visitIds: [...new Set(chunks.map((chunk) => chunk.visitId ?? "null"))].sort(),
    patientIds: [...new Set(chunks.map((chunk) => chunk.patientId ?? "null"))].sort()
  };
}

before(async () => {
  const rows = await db
    .select({ id: visits.id, patientId: visits.patientId, organizationId: visits.organizationId })
    .from(visits)
    .limit(200);
  const first = rows[0];
  assert.ok(first, "в базе нет ни одного приема: сценарий двух приемов нечем воспроизвести");
  const second = rows.find(
    (row) => row.organizationId === first.organizationId && row.patientId !== first.patientId
  );
  assert.ok(
    second,
    "в клинике нет двух приемов разных пациентов: межпациентное слияние нечем воспроизвести"
  );
  clinicalPair = {
    organizationId: first.organizationId,
    visitA: first.id,
    patientA: first.patientId,
    visitB: second.id,
    patientB: second.patientId
  };
});

after(async () => {
  for (const recordingId of createdRecordingIds) {
    await db.delete(aiJobs).where(eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`));
  }
  resetSpeechTranscriptionCacheForRestart();
  await pool.end();
});

describe("личность записи диктовки", () => {
  it("после вытеснения из кэша фрагмент чужого приема отклоняется, а не сливается в одну запись", async () => {
    const pair = clinicalPair;
    assert.ok(pair);
    const recordingId = `test-identity-${randomUUID()}`;
    const decoyRecordingId = `test-identity-decoy-${randomUUID()}`;
    createdRecordingIds.push(recordingId, decoyRecordingId);

    await withEnv({ DENTAL_SPEECH_CACHED_RECORDINGS: "1" }, async () => {
      resetSpeechTranscriptionCacheForRestart();
      await recordSpeechTranscriptionChunk(
        buildChunkInput({
          recordingId,
          chunkIndex: 0,
          visitId: pair.visitA,
          patientId: pair.patientA,
          transcript: visitAText
        })
      );

      /**
       * Вытеснение, а НЕ сброс кэша. Бюджет клиники — одна запись, поэтому
       * фрагменты первой записи выбрасываются из памяти: они уже в базе.
       * Сброс кэша тут не годится — после него восстановление вернуло бы конверт
       * в память, сработала бы старая проверка по кэшу и сценарий ревьюера не
       * воспроизвёлся бы.
       */
      await recordSpeechTranscriptionChunk(
        buildChunkInput({
          recordingId: decoyRecordingId,
          chunkIndex: 0,
          visitId: pair.visitA,
          patientId: pair.patientA,
          transcript: "Другая запись той же клиники, занимающая бюджет кэша."
        })
      );
      assert.strictEqual(
        listSpeechTranscriptionChunks(recordingId).length,
        0,
        "запись не вытеснена из памяти: сценарий проверки личности по базе не воспроизводится"
      );

      let rejection: unknown = null;
      try {
        await recordSpeechTranscriptionChunk(
          buildChunkInput({
            recordingId,
            chunkIndex: 1,
            visitId: pair.visitB,
            patientId: pair.patientB,
            transcript: visitBText
          })
        );
      } catch (error) {
        rejection = error;
      }

      // Сначала состояние строки: при провале видно ровно то, что получил ревьюер.
      const row = await readDurableRow(recordingId, pair.organizationId);
      assert.ok(row, "строка расшифровки не найдена в ai_jobs");
      assert.strictEqual(
        row.resultText,
        visitAText,
        "в одной строке ai_jobs собран текст двух приемов: это чужая медицинская запись"
      );
      assert.strictEqual(row.visitId, pair.visitA, "строка перестала принадлежать своему приему");
      assert.strictEqual(row.patientId, pair.patientA, "строка перестала принадлежать своему пациенту");
      assert.deepStrictEqual(
        envelopeIdentities(row.inputText),
        { visitIds: [pair.visitA], patientIds: [pair.patientA] },
        "в конверте записи оказались фрагменты двух приемов"
      );

      // Затем отказ: он обязан быть явным, с кодом 409, а не тихим приёмом текста.
      assert.ok(
        rejection instanceof SpeechChunkIdentityConflictError,
        `фрагмент чужого приема принят без отказа: ${String(rejection)}`
      );
      assert.strictEqual(rejection.statusCode, 409);

      // Отклонённый фрагмент не остаётся в памяти: иначе вытеснение выбросит его
      // молча по общему ключу recordingId#chunkIndex.
      assert.deepStrictEqual(
        listSpeechTranscriptionChunks(recordingId).map((chunk) => chunk.visitId),
        [],
        "отклонённый фрагмент остался в горячем кэше"
      );

      // Своя диктовка после отказа продолжает сохраняться: запрет не должен
      // ломать долговременное хранение для законного приема.
      await recordSpeechTranscriptionChunk(
        buildChunkInput({
          recordingId,
          chunkIndex: 1,
          visitId: pair.visitA,
          patientId: pair.patientA,
          transcript: visitASecondText
        })
      );
      const ownRow = await readDurableRow(recordingId, pair.organizationId);
      assert.ok(ownRow);
      assert.strictEqual(
        ownRow.resultText,
        `${visitAText}\n${visitASecondText}`,
        "после отказа чужому фрагменту перестала сохраняться своя диктовка"
      );
    });
  });

  /**
   * Второй путь к той же строке: два одновременных фрагмента разных приемов с
   * одной recordingId. Горячий кэш здесь ни при чём — на момент проверки в нём
   * ещё нет ни одного фрагмента записи, поэтому проверка по памяти пропускает
   * оба, а очередь записи по recordingId сливает их в одну строку.
   */
  it("одновременные фрагменты двух приемов не собираются в одну строку", async () => {
    const pair = clinicalPair;
    assert.ok(pair);
    const recordingId = `test-identity-race-${randomUUID()}`;
    createdRecordingIds.push(recordingId);

    const results = await Promise.allSettled([
      recordSpeechTranscriptionChunk(
        buildChunkInput({
          recordingId,
          chunkIndex: 0,
          visitId: pair.visitA,
          patientId: pair.patientA,
          transcript: visitAText
        })
      ),
      recordSpeechTranscriptionChunk(
        buildChunkInput({
          recordingId,
          chunkIndex: 1,
          visitId: pair.visitB,
          patientId: pair.patientB,
          transcript: visitBText
        })
      )
    ]);

    const row = await readDurableRow(recordingId, pair.organizationId);
    assert.ok(row, "строка расшифровки не найдена в ai_jobs");
    const holdsVisitA = (row.resultText ?? "").includes(visitAText);
    const holdsVisitB = (row.resultText ?? "").includes(visitBText);
    assert.ok(
      holdsVisitA !== holdsVisitB,
      `в одной строке ai_jobs текст двух приемов: ${JSON.stringify(row.resultText)}`
    );
    const identities = envelopeIdentities(row.inputText);
    assert.strictEqual(identities.visitIds.length, 1, `конверт держит два приема: ${JSON.stringify(identities)}`);
    assert.strictEqual(identities.patientIds.length, 1, `конверт держит двух пациентов: ${JSON.stringify(identities)}`);

    const rejections = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    assert.strictEqual(rejections.length, 1, "фрагмент чужого приема принят без отказа");
    assert.ok(
      rejections[0]?.reason instanceof SpeechChunkIdentityConflictError,
      `отказ пришёл не как конфликт личности записи: ${String(rejections[0]?.reason)}`
    );
  });

  /**
   * Аудит всей таблицы: ни одна строка диктовки не держит текст двух приемов или
   * двух пациентов. Запрос умышленно не сужен по клинике — смысл аудита в том,
   * чтобы увидеть такие строки везде, где они есть.
   */
  it("в базе нет строки диктовки с фрагментами двух приемов или двух пациентов", async () => {
    const rows = await db
      .select({ id: aiJobs.id, organizationId: aiJobs.organizationId, inputText: aiJobs.inputText })
      .from(aiJobs)
      .where(and(eq(aiJobs.kind, "voice_transcription"), like(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}%`)));

    const mixed = rows
      .map((row) => ({ id: row.id, organizationId: row.organizationId, ...envelopeIdentities(row.inputText) }))
      .filter((row) => row.visitIds.length > 1 || row.patientIds.length > 1);

    console.log(`SPEECH ROWS SCANNED: ${rows.length}`);
    assert.deepStrictEqual(mixed, [], "в базе есть строки диктовки с текстом двух приемов");
  });
});
