import { countStagingByStatus, claimNextRun, heartbeat, releaseOwnRuns, updateRun, WORKER_ID } from "./runStore.js";
import { executeRunPhase, finishRunPhase, MigrationPhaseError, stageRunPhase } from "./phases.js";
import { cleanupExpiredUploads, deleteUpload } from "./uploadStore.js";

/**
 * Фоновый исполнитель переноса.
 *
 * ПОЧЕМУ БЕЗ REDIS И BULL
 * Очередь здесь нужна ровно для одного: не держать HTTP-запрос открытым, пока
 * грузятся сто тысяч строк. Задач в ней единицы в день, а не тысячи в секунду.
 * Тащить ради этого внешний брокер значит добавить в развёртывание клиники ещё
 * один сервис, который надо ставить, обновлять и который умеет падать отдельно
 * от базы. При этом надёжность не выросла бы: состояние всё равно обязано лежать
 * в PostgreSQL, потому что только там оно транзакционно согласовано с самими
 * переносимыми данными.
 *
 * Роль очереди играет таблица migration_runs. Захват задачи — атомарный UPDATE с
 * FOR UPDATE SKIP LOCKED, то есть та же техника, что применяют брокеры, только
 * без второго хранилища.
 *
 * ЧТО БУДЕТ, ЕСЛИ ПРОЦЕСС УМРЁТ ПОСРЕДИНЕ
 * Прогон останется в статусе loading с отметкой живучести в прошлом. Любой
 * работающий процесс — этот же после перезапуска или второй экземпляр
 * приложения — подберёт его и продолжит с тех строк стейджинга, которые ещё
 * ready. Уже загруженные помечены loaded и повторно не создаются; страховкой
 * служит уникальность в migration_entity_links.
 */

/** Пауза между опросами очереди, когда работы нет. */
const IDLE_POLL_MS = 5_000;

/** Пауза после ошибки: не молотить базу в цикле, если что-то системно не так. */
const ERROR_BACKOFF_MS = 15_000;

/** Как часто убирать просроченные залитые файлы. */
const UPLOAD_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

interface WorkerState {
  running: boolean;
  timer: NodeJS.Timeout | null;
  cleanupTimer: NodeJS.Timeout | null;
  /** Текущий прогон, чтобы не брать второй одновременно в одном процессе. */
  activeRunId: string | null;
  processed: number;
  failed: number;
}

const state: WorkerState = {
  running: false,
  timer: null,
  cleanupTimer: null,
  activeRunId: null,
  processed: 0,
  failed: 0
};

/** Отчёт о состоянии воркера — для системного маршрута и диагностики. */
export function migrationWorkerStatus(): {
  running: boolean;
  workerId: string;
  activeRunId: string | null;
  processed: number;
  failed: number;
} {
  return {
    running: state.running,
    workerId: WORKER_ID,
    activeRunId: state.activeRunId,
    processed: state.processed,
    failed: state.failed
  };
}

/**
 * Выполняет один прогон целиком: укладка при необходимости, загрузка, сверка.
 *
 * Укладка вызывается только если стейджинг пуст. Это и есть возобновление: после
 * падения на середине загрузки строки уже уложены, и повторно читать файл не
 * нужно — воркер сразу переходит к загрузке остатка.
 */
async function processRun(run: Awaited<ReturnType<typeof claimNextRun>>): Promise<void> {
  if (!run) return;
  state.activeRunId = run.id;

  const context = {
    runId: run.id,
    organizationId: run.organizationId,
    allowLlm: false,
    sourceSystem: run.vendorProfile ?? "legacy",
    mappingOverrides: [] as Array<never>
  };

  try {
    const counts = await countStagingByStatus(run.id);

    if (counts.total === 0) {
      // Строк нет вовсе — значит укладка ещё не выполнялась.
      await heartbeat(run.id, "Укладка строк источника");
      await stageRunPhase({ ...context, mappingOverrides: [] });
      await updateRun(run.id, { status: "loading" });
    } else if (run.resumeCount > 0) {
      await heartbeat(
        run.id,
        `Возобновление после перезапуска: осталось загрузить ${counts.ready} из ${counts.total} строк`
      );
    }

    const executed = await executeRunPhase({
      ...context,
      mappingOverrides: [],
      dryRun: run.dryRun,
      sourceName: run.sourceName
    });

    const reconciliation = await finishRunPhase({
      runId: run.id,
      organizationId: run.organizationId,
      dryRun: run.dryRun
    });

    state.processed += 1;
    console.info(
      `[migration worker] прогон ${run.id} завершён: создано ${executed.created}, обновлено ${executed.updated}, ` +
        `дублей ${executed.duplicates}, отказов ${executed.failed}, сверка ${reconciliation.balanced ? "сошлась" : "НЕ сошлась"}`
    );

    /**
     * Файл источника удаляется сразу после успешного переноса, а не по сроку
     * хранения: это персональные данные пациентов в открытом виде на диске.
     * Исходные строки остаются в стейджинге, под теми же правами, что
     * медицинские данные, поэтому доказательная база не теряется.
     */
    if (!run.dryRun && reconciliation.balanced) {
      await deleteUpload(run.uploadPath);
      await updateRun(run.id, { uploadPath: null });
    }
  } catch (error) {
    state.failed += 1;
    const isPhaseError = error instanceof MigrationPhaseError;
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[migration worker] прогон ${run.id} упал: ${message}`);

    /**
     * Прогон помечается неудачным, владелец снимается. Стейджинг НЕ удаляется:
     * уже уложенные строки — единственное, что позволит продолжить без повторной
     * выгрузки из старой системы. Оператор может исправить причину и запустить
     * выполнение заново.
     */
    await updateRun(run.id, {
      status: "failed",
      phase: "Прервано ошибкой",
      workerId: null,
      heartbeatAt: null,
      finishedAt: new Date(),
      errorClass: isPhaseError ? (error as MigrationPhaseError).code : error instanceof Error ? error.constructor.name : "UnknownError",
      errorMessage: message.slice(0, 2000)
    }).catch((updateError: unknown) => {
      // Если и запись об ошибке не удалась, прогон останется loading с
      // устаревшей отметкой и будет подобран заново — это верное поведение.
      console.error(`[migration worker] не удалось записать ошибку прогона ${run.id}:`, updateError);
    });
  } finally {
    state.activeRunId = null;
  }
}

/** Один оборот цикла: взять задачу, если есть. Возвращает true, если работал. */
async function tick(): Promise<boolean> {
  if (state.activeRunId !== null) return false;
  const run = await claimNextRun();
  if (!run) return false;
  console.info(
    `[migration worker] взят прогон ${run.id} (${run.sourceName})${run.resumeCount > 0 ? `, возобновление #${run.resumeCount}` : ""}`
  );
  await processRun(run);
  return true;
}

/** Планирует следующий оборот. Задержка нулевая, если работа была. */
function schedule(delayMs: number): void {
  if (!state.running) return;
  state.timer = setTimeout(() => {
    void loop();
  }, delayMs);
  // Таймер не должен держать процесс живым при завершении приложения.
  state.timer.unref();
}

async function loop(): Promise<void> {
  if (!state.running) return;
  try {
    const worked = await tick();
    // Если работа была, сразу пробуем следующую: очередь могла накопиться.
    schedule(worked ? 0 : IDLE_POLL_MS);
  } catch (error) {
    console.error("[migration worker] ошибка цикла:", error);
    schedule(ERROR_BACKOFF_MS);
  }
}

/**
 * Запускает воркер.
 *
 * На старте освобождает прогоны, помеченные этим же worker_id: после
 * перезапуска процесса с тем же хостом и pid (в контейнере это обычно pid 1)
 * прогон иначе ждал бы истечения окна живучести, хотя владельца уже нет.
 */
export async function startMigrationWorker(): Promise<void> {
  if (state.running) return;
  state.running = true;

  const released = await releaseOwnRuns().catch((error: unknown) => {
    console.error("[migration worker] не удалось освободить свои прогоны:", error);
    return 0;
  });
  if (released > 0) {
    console.info(`[migration worker] освобождено прогонов после перезапуска: ${released}`);
  }

  // Уборка просроченных файлов: персональные данные не должны лежать на диске
  // дольше необходимого.
  const cleanup = async (): Promise<void> => {
    const removed = await cleanupExpiredUploads().catch(() => 0);
    if (removed > 0) console.info(`[migration worker] удалено просроченных файлов выгрузок: ${removed}`);
  };
  void cleanup();
  state.cleanupTimer = setInterval(() => void cleanup(), UPLOAD_CLEANUP_INTERVAL_MS);
  state.cleanupTimer.unref();

  console.info(`[migration worker] запущен, идентификатор ${WORKER_ID}`);
  schedule(0);
}

export function stopMigrationWorker(): void {
  state.running = false;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  if (state.cleanupTimer) {
    clearInterval(state.cleanupTimer);
    state.cleanupTimer = null;
  }
}

/**
 * Прогоняет очередь до пустоты и возвращает число выполненных прогонов.
 *
 * Нужно тестам и скриптам проверки: они обязаны дождаться результата, а не
 * угадывать длительность паузы. Ограничение по числу оборотов защищает от
 * бесконечного цикла, если задача возвращается в очередь.
 */
export async function drainMigrationQueue(maxRuns = 50): Promise<number> {
  const wasRunning = state.running;
  state.running = true;
  let processed = 0;
  try {
    for (let attempt = 0; attempt < maxRuns; attempt += 1) {
      const worked = await tick();
      if (!worked) break;
      processed += 1;
    }
  } finally {
    state.running = wasRunning;
  }
  return processed;
}
