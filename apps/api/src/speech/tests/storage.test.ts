import { after, before, describe, it } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { db, pool } from "../../db/client.js";
import { aiJobs, organizations, patients, visits } from "../../db/schema.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../../tests/support/fixtureOrganizations.js";
import {
  acquireSpeechDurableTestLock,
  type SpeechDurableTestLock
} from "../../tests/support/speechDurableTestLock.js";
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
 * обратно из базы.
 *
 * ПОЧЕМУ КЛИНИКИ ЗДЕСЬ СВОИ, А НЕ «ПЕРВЫЙ ПРИЕМ ИЗ БАЗЫ».
 *
 * Прежде этот файл начинал с `.from(visits).limit(1)` и брал вторую клинику как
 * «пациент любой другой организации». Точно так же поступали
 * `storageRestoreCeiling.test.ts` и `storageIdentity.test.ts`, то есть все три
 * получали ОДНУ И ТУ ЖЕ пару клиник, а `node --test` гоняет файлы параллельными
 * процессами против одной живой базы. Восстановление ранжирует записи
 * `row_number() OVER (PARTITION BY organization_id ORDER BY updated_at DESC)` и
 * берёт первые `DENTAL_SPEECH_CACHED_RECORDINGS` в каждой клинике. Тест ниже
 * ставит этот предел равным ОДНОЙ записи и требует, чтобы этой одной была его
 * собственная; сосед ставил две и требовал своих двух. Кто засеял свежее — тот и
 * вытеснил соседа, поэтому набор упавших тестов плавал от прогона к прогону:
 * `listSpeechTranscriptionChunks(...).length` давал 0 вместо 1, и выглядело это
 * как дефект восстановления, которого нет.
 *
 * Своя пара клиник выводится из ИМЕНИ ФАЙЛА (`fixtureUuid`, разбор — в
 * `tests/support/fixtureOrganizations.ts`), поэтому выдать один блок двум файлам
 * нельзя: для этого им пришлось бы совпасть именем. Ранг записи внутри своей
 * клиники теперь зависит только от порядка тестов ЭТОГО файла.
 *
 * Вторым слоем берётся консультационная блокировка PostgreSQL
 * (`acquireSpeechDurableTestLock`): над рангом по клинике стоит общий на всю базу
 * предел восстановления, и его измеряет `storageRestoreCeiling.test.ts`. Свежие
 * строки, которые пишет этот файл, забирали бы тот предел себе, поэтому файлы,
 * пишущие долговременные записи диктовки, проходят по одному. Разбор — в
 * `tests/support/speechDurableTestLock.ts`.
 *
 * Утверждения тестов не ослаблены: та же граница перезапуска, тот же запрет на
 * съедание лимита чужими строками `voice_transcription`, та же межклиничная
 * граница кэша. Изменилось только то, чьи строки лежат в базе в момент замера.
 */

const dictationText = "Жалобы на боль в зубе 26 при накусывании. Перкуссия слабоположительная.";
const durableRecordingPathPrefix = "speech-recording://";

type SpeechChunkInput = Omit<SpeechTranscriptionChunk, "id" | "organizationId" | "createdAt">;

const FIXTURE = "speechStorage";
const ORG_MAIN = fixtureUuid(FIXTURE, 1);
/**
 * Вторая клиника нужна для проверки, что бюджет кэша принадлежит клинике, а не
 * всей базе. Приема у неё нет намеренно: клиника фрагмента определяется и по
 * пациенту.
 */
const ORG_OTHER = fixtureUuid(FIXTURE, 2);
const PATIENT_MAIN = fixtureUuid(FIXTURE, 3);
const VISIT_MAIN = fixtureUuid(FIXTURE, 4);
const PATIENT_OTHER = fixtureUuid(FIXTURE, 5);

const clinicalScope = { visitId: VISIT_MAIN, patientId: PATIENT_MAIN, organizationId: ORG_MAIN };
const otherClinicScope = { patientId: PATIENT_OTHER, organizationId: ORG_OTHER };

let durableLock: SpeechDurableTestLock | null = null;

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
    patientId: clinicalScope.patientId,
    visitId: clinicalScope.visitId,
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
  // Блокировка берётся ПЕРВОЙ, до любой записи в базу: свежие строки этого файла
  // видны общему пределу восстановления, который измеряет соседний файл.
  durableLock = await acquireSpeechDurableTestLock();

  // Уборка НА ВХОДЕ: прогон, убитый снаружи (Ctrl+C, закрытая труба), до after не
  // доходит и оставляет свои клиники в живой базе. Наследовать оттуда записи
  // диктовки нельзя — они сдвинули бы ранг записи внутри клиники.
  await purgeFixtureOrganizations([ORG_MAIN, ORG_OTHER]);
  await db.insert(organizations).values([
    { id: ORG_MAIN, name: "Клиника хранения диктовки" },
    { id: ORG_OTHER, name: "Соседняя клиника хранения диктовки" }
  ]);
  // Без onConflictDoNothing: он молча оставил бы чужую строку с тем же первичным
  // ключом, и тест пошёл бы по данным соседнего файла.
  await db.insert(patients).values([
    { id: PATIENT_MAIN, organizationId: ORG_MAIN, fullName: "Тарасова Инна Петровна", birthDate: "1979-05-12" },
    { id: PATIENT_OTHER, organizationId: ORG_OTHER, fullName: "Крылов Артём Игоревич", birthDate: "1985-11-03" }
  ]);
  await db
    .insert(visits)
    .values({ id: VISIT_MAIN, organizationId: ORG_MAIN, patientId: PATIENT_MAIN, status: "draft" });
});

after(async () => {
  // Каталожная уборка снимает и записи диктовки, и чужую строку
  // voice_transcription, вставленную ниже: она выводит порядок удаления из ссылок
  // в information_schema, а поимённый список таблиц устаревал бы при появлении
  // любой новой таблицы со ссылкой на организацию.
  await purgeFixtureOrganizations([ORG_MAIN, ORG_OTHER]);
  resetSpeechTranscriptionCacheForRestart();
  // Сначала блокировка, потом пул: pool.end() ждёт возврата всех выданных
  // клиентов и на удержанном соединении блокировки не завершился бы.
  await durableLock?.release();
  await pool.end();
});

describe("хранение расшифровок диктовки", () => {
  it("текст переживает перезапуск процесса и читается из PostgreSQL", async () => {
    const scope = clinicalScope;
    const recordingId = `test-restart-${randomUUID()}`;

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
    const recordingId = `test-sql-${randomUUID()}`;

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
    const recordingId = `test-single-row-${randomUUID()}`;

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
    const recordingId = `test-merge-${randomUUID()}`;
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
    const recordingId = `test-foreign-${randomUUID()}`;

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
    const other = otherClinicScope;
    const ownRecordingId = `test-org-own-${randomUUID()}`;
    const otherRecordingId = `test-org-other-${randomUUID()}`;

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
    const recordingId = `test-undurable-${randomUUID()}`;
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
    const recordingId = `test-confidence-${randomUUID()}`;

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
