import { after, before, describe, it } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { eq, ne } from "drizzle-orm";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { db, pool } from "../../db/client.js";
import { aiJobs, patients, visits } from "../../db/schema.js";
import {
  assembleSpeechRecording,
  ensureSpeechTranscriptionChunksRestored,
  listSpeechTranscriptionChunks,
  recordSpeechTranscriptionChunk,
  resetSpeechTranscriptionCacheForRestart,
  speechDurableRestoreState
} from "../storage.js";

/**
 * Потолок памяти восстановления расшифровок, на настоящей PostgreSQL.
 *
 * ЧТО ЗДЕСЬ ЗАКРЫВАЕТСЯ. Восстановление ранжирует записи
 * row_number() OVER (PARTITION BY organization_id) и берёт первые
 * DENTAL_SPEECH_CACHED_RECORDINGS в КАЖДОЙ организации. Внешнего LIMIT у запроса
 * не было, поэтому число поднятых в память записей равнялось
 * (предел клиники) x (число клиник) — то есть занятая при старте память росла с
 * каждым новым арендатором, и ни одного измеримого предела у неё не было.
 * Ни один тест этого не ловил: все проверки границы перезапуска работали с
 * одной-двумя записями, где разница между общим и поклиничным пределом не видна.
 *
 * ПОЧЕМУ ПРОВЕРЯЕТСЯ ИМЕННО ТАК. Сначала измеряется прежнее поведение — с
 * заведомо огромным общим пределом восстановление поднимает ВСЕ четыре записи
 * двух клиник. Потом тот же набор данных восстанавливается с общим пределом в
 * две записи. Без первого замера утверждение «предел работает» было бы
 * непроверяемым: две записи могли бы означать, что в базе их всего две.
 *
 * Идентификаторы клиник, приемов и пациентов берутся запросом к базе, а не
 * прописываются в коде.
 */

const durableRecordingPathPrefix = "speech-recording://";
const budgetWarningMarker = "общего предела памяти сервера";

type SpeechChunkInput = Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">;

let ownScope: { visitId: string; patientId: string; organizationId: string } | null = null;
let otherScope: { patientId: string; organizationId: string } | null = null;
const createdRecordingIds: string[] = [];

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

function buildChunkInput(overrides: Partial<SpeechChunkInput> & { recordingId: string }): SpeechChunkInput {
  const transcript = overrides.transcript ?? "Осмотр: жалоб нет, слизистая без изменений.";
  return {
    chunkIndex: 0,
    source: "visit",
    patientId: ownScope?.patientId ?? null,
    visitId: ownScope?.visitId ?? null,
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
      wordCount: 6,
      charCount: transcript.length,
      durationMs: 4000,
      bytesPerSecond: 512,
      providerWarnings: [],
      signals: ["unit_test"],
      nextAction: "Проверьте текст перед подписанием приема."
    },
    warnings: [],
    clientRecordedAt: new Date().toISOString(),
    ...overrides,
    transcript
  };
}

/** Одна запись диктовки в указанной клинике; возвращает её recordingId. */
async function seedRecording(
  label: string,
  scope: { patientId: string; visitId: string | null },
  transcripts: string[]
): Promise<string> {
  const recordingId = `test-ceiling-${label}-${randomUUID()}`;
  createdRecordingIds.push(recordingId);
  for (const [chunkIndex, transcript] of transcripts.entries()) {
    await recordSpeechTranscriptionChunk(
      buildChunkInput({
        recordingId,
        chunkIndex,
        transcript,
        patientId: scope.patientId,
        visitId: scope.visitId
      })
    );
  }
  return recordingId;
}

before(async () => {
  const [visit] = await db
    .select({ id: visits.id, patientId: visits.patientId, organizationId: visits.organizationId })
    .from(visits)
    .limit(1);
  assert.ok(visit, "в базе нет ни одного приема: потолок восстановления не на чем измерить");
  ownScope = { visitId: visit.id, patientId: visit.patientId, organizationId: visit.organizationId };

  const [otherPatient] = await db
    .select({ id: patients.id, organizationId: patients.organizationId })
    .from(patients)
    .where(ne(patients.organizationId, visit.organizationId))
    .limit(1);
  assert.ok(
    otherPatient,
    "в базе только одна организация: рост памяти по числу арендаторов проверить нечем"
  );
  otherScope = { patientId: otherPatient.id, organizationId: otherPatient.organizationId };
});

after(async () => {
  for (const recordingId of createdRecordingIds) {
    await db.delete(aiJobs).where(eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`));
  }
  resetSpeechTranscriptionCacheForRestart();
  await pool.end();
});

describe("потолок памяти восстановления расшифровок", () => {
  it("общее число поднятых записей не растёт с числом клиник", async () => {
    const own = ownScope;
    const other = otherScope;
    assert.ok(own);
    assert.ok(other);

    resetSpeechTranscriptionCacheForRestart();
    const ownFirst = await seedRecording("own-1", { patientId: own.patientId, visitId: own.visitId }, [
      "Первая запись своей клиники."
    ]);
    const otherFirst = await seedRecording("other-1", { patientId: other.patientId, visitId: null }, [
      "Первая запись соседней клиники."
    ]);
    const ownSecond = await seedRecording("own-2", { patientId: own.patientId, visitId: own.visitId }, [
      "Вторая запись своей клиники."
    ]);
    const otherSecond = await seedRecording("other-2", { patientId: other.patientId, visitId: null }, [
      "Вторая запись соседней клиники."
    ]);
    const seeded = [ownFirst, otherFirst, ownSecond, otherSecond];

    // Прежнее поведение: предел на клинику x две клиники = четыре записи, и
    // никакого общего предела над этим произведением.
    await withEnv(
      {
        DENTAL_SPEECH_CACHED_RECORDINGS: "2",
        DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL: "1000",
        DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL: "1000",
        DENTAL_SPEECH_RESTORED_CHARS_TOTAL: "1000000"
      },
      async () => {
        resetSpeechTranscriptionCacheForRestart();
        await ensureSpeechTranscriptionChunksRestored();
        for (const recordingId of seeded) {
          assert.strictEqual(
            listSpeechTranscriptionChunks(recordingId).length,
            1,
            `без общего предела должны подниматься все записи обеих клиник, не поднялась ${recordingId}`
          );
        }
        assert.ok(
          speechDurableRestoreState().loadedRecordings >= 4,
          "замер прежнего поведения не состоялся: четыре записи двух клиник не поднялись"
        );
      }
    );

    // Тот же набор данных с общим пределом в две записи.
    await withEnv(
      {
        DENTAL_SPEECH_CACHED_RECORDINGS: "2",
        DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL: "2",
        DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL: "1000",
        DENTAL_SPEECH_RESTORED_CHARS_TOTAL: "1000000"
      },
      async () => {
        resetSpeechTranscriptionCacheForRestart();
        await ensureSpeechTranscriptionChunksRestored();
        const state = speechDurableRestoreState();
        assert.strictEqual(
          state.loadedRecordings,
          2,
          "общий предел восстановления не применён: поднято не две записи"
        );

        const liveSeeded = seeded.filter((recordingId) => listSpeechTranscriptionChunks(recordingId).length > 0);
        assert.ok(
          liveSeeded.length <= 2,
          `общий предел пробит: в памяти ${liveSeeded.length} из четырёх засеянных записей`
        );

        // Справедливость сохранена: под общим пределом первыми идут самые свежие
        // записи КАЖДОЙ клиники, а не две записи одной. Иначе общий предел вернул
        // бы ту несправедливость, ради которой появилось ранжирование по клинике.
        const organizations = new Set(
          seeded
            .flatMap((recordingId) => listSpeechTranscriptionChunks(recordingId))
            .map((chunk) => chunk.organizationId)
        );
        assert.strictEqual(
          organizations.size,
          2,
          "общий предел забрала одна клиника: под потолком должны быть записи обеих"
        );
      }
    );
  });

  it("запись, не влезающая в бюджет фрагментов, не поднимается половиной и не теряет текст", async () => {
    const own = ownScope;
    assert.ok(own);

    resetSpeechTranscriptionCacheForRestart();
    const lines = ["Жалобы: боль зуб 36.", "Диагноз K04.0 пульпит.", "План: эндодонтическое лечение."];
    const recordingId = await seedRecording(
      "chunk-budget",
      { patientId: own.patientId, visitId: own.visitId },
      lines
    );

    await withEnv(
      {
        DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL: "1000",
        DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL: "2",
        DENTAL_SPEECH_RESTORED_CHARS_TOTAL: "1000000"
      },
      async () => {
        resetSpeechTranscriptionCacheForRestart();
        await ensureSpeechTranscriptionChunksRestored();

        assert.strictEqual(
          listSpeechTranscriptionChunks(recordingId).length,
          0,
          "запись поднята частично: половина записи выглядит как запись с дырами в нумерации"
        );
        assert.ok(
          speechDurableRestoreState().skippedRecordings >= 1,
          "пропуск записи не посчитан: потолок стал бы неизмеримым"
        );
        assert.ok(
          assembleSpeechRecording(recordingId).warnings.some((warning) => warning.includes(budgetWarningMarker)),
          "пропуск по бюджету не объявлен в предупреждениях сборки записи"
        );

        // Пропуск не теряет текст: строка в базе цела, и очередной фрагмент той
        // же записи сливается с сохранённым конвертом, а не с пустым кэшем.
        const [rowBefore] = await db
          .select({ resultText: aiJobs.resultText })
          .from(aiJobs)
          .where(eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`))
          .limit(1);
        assert.ok(rowBefore, "строка расшифровки исчезла из ai_jobs");
        assert.strictEqual(
          rowBefore.resultText,
          lines.join("\n"),
          "текст пропущенной записи изменился в базе"
        );

        const fourthLine = "Контроль через семь дней.";
        await recordSpeechTranscriptionChunk(
          buildChunkInput({
            recordingId,
            chunkIndex: lines.length,
            transcript: fourthLine,
            patientId: own.patientId,
            visitId: own.visitId
          })
        );

        const [rowAfter] = await db
          .select({ resultText: aiJobs.resultText })
          .from(aiJobs)
          .where(eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`))
          .limit(1);
        assert.ok(rowAfter, "строка расшифровки исчезла из ai_jobs после дозаписи");
        assert.strictEqual(
          rowAfter.resultText,
          [...lines, fourthLine].join("\n"),
          "не поднятый в память текст затёрт следующим фрагментом: усечение восстановления потеряло текст"
        );
      }
    );
  });

  it("символьный бюджет отказывает длинной записи и оставляет её в базе целой", async () => {
    const own = ownScope;
    assert.ok(own);

    resetSpeechTranscriptionCacheForRestart();
    const longTranscript = "Развернутый протокол осмотра и лечения. ".repeat(120);
    const recordingId = await seedRecording(
      "char-budget",
      { patientId: own.patientId, visitId: own.visitId },
      [longTranscript]
    );

    await withEnv(
      {
        DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL: "1000",
        DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL: "1000",
        DENTAL_SPEECH_RESTORED_CHARS_TOTAL: String(longTranscript.length - 1)
      },
      async () => {
        resetSpeechTranscriptionCacheForRestart();
        await ensureSpeechTranscriptionChunksRestored();

        assert.strictEqual(
          listSpeechTranscriptionChunks(recordingId).length,
          0,
          "запись длиннее символьного бюджета всё равно поднята в память"
        );
        const state = speechDurableRestoreState();
        assert.ok(
          state.skippedRecordings >= 1,
          "отказ по символьному бюджету не посчитан"
        );
        assert.ok(
          state.cachedChars <= longTranscript.length - 1,
          `символьный бюджет пробит: в памяти ${state.cachedChars} символов при пределе ${longTranscript.length - 1}`
        );

        const [row] = await db
          .select({ resultText: aiJobs.resultText })
          .from(aiJobs)
          .where(eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`))
          .limit(1);
        assert.ok(row, "строка длинной расшифровки исчезла из ai_jobs");
        // result_text собирается через chunk.transcript.trim(), поэтому в базе
        // лежит текст без хвостового пробела; в конверте и в бюджете участвует
        // исходная длина фрагмента.
        assert.strictEqual(row.resultText, longTranscript.trim(), "текст длинной записи изменился в базе");
      }
    );
  });
});
