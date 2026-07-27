import type {
  MigrationEntityBreakdown,
  MigrationEntityKind,
  MigrationReconciliationCheck,
  MigrationReconciliationReport
} from "@dental/shared";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { migrationQuarantineRecords, migrationReconciliations, migrationStagingRecords } from "../db/schema.js";

/**
 * Сверка переноса: доказательство того, что не потерялось ничего.
 *
 * ЧТО ЗДЕСЬ ДОКАЗЫВАЕТСЯ
 * Утверждение «перенесено всё» нельзя подтвердить словами «загружено 1043
 * пациента»: неизвестно, сколько их было. Доказательство — это замкнутый
 * баланс, где каждая исходная строка учтена ровно один раз в одном из исходов:
 *
 *     строк в источнике = создано + обновлено + дублей + в карантине + пропущено
 *
 * Если равенство не выполняется, строки где-то потерялись, и перенос НЕЛЬЗЯ
 * объявлять завершённым, каким бы удачным он ни выглядел по счётчикам.
 *
 * Отдельно и обязательно сверяются деньги. Строки могут сойтись, а сумма
 * платежей — нет: например, часть сумм не разобралась и записалась нулями.
 * Поэтому сумма источника считается независимо, прямо из сохранённых исходных
 * значений в стейджинге, а не из счётчиков загрузчика.
 *
 * Сверка читает СТЕЙДЖИНГ, а не отчёт загрузчика. Это принципиально: если бы
 * она проверяла числа, которые сама же загрузка и посчитала, она подтверждала
 * бы не перенос, а внутреннюю непротиворечивость собственной арифметики.
 */

export interface ReconcileInput {
  runId: string;
  organizationId: string;
  /** Число строк, прочитанных из источника разбором. Внешняя точка отсчёта. */
  sourceRowsParsed: number;
  /** Суммы платежей, посчитанные разбором источника до загрузки. */
  sourceMoneyTotalRub: number | null;
  dryRun: boolean;
}

interface StatusTally {
  loaded: number;
  updated: number;
  duplicate: number;
  quarantined: number;
  skipped: number;
  ready: number;
  pending: number;
  other: number;
  total: number;
}

async function tallyByStatus(runId: string): Promise<Map<MigrationEntityKind, StatusTally>> {
  const rows = await db
    .select({
      entityKind: migrationStagingRecords.entityKind,
      status: migrationStagingRecords.status,
      rows: count()
    })
    .from(migrationStagingRecords)
    .where(eq(migrationStagingRecords.runId, runId))
    .groupBy(migrationStagingRecords.entityKind, migrationStagingRecords.status);

  const result = new Map<MigrationEntityKind, StatusTally>();
  for (const row of rows) {
    const tally =
      result.get(row.entityKind) ??
      ({
        loaded: 0,
        updated: 0,
        duplicate: 0,
        quarantined: 0,
        skipped: 0,
        ready: 0,
        pending: 0,
        other: 0,
        total: 0
      } satisfies StatusTally);

    const amount = Number(row.rows);
    switch (row.status) {
      case "loaded":
        tally.loaded += amount;
        break;
      case "updated":
        tally.updated += amount;
        break;
      case "duplicate":
        tally.duplicate += amount;
        break;
      case "quarantined":
        tally.quarantined += amount;
        break;
      case "skipped":
        tally.skipped += amount;
        break;
      case "ready":
        tally.ready += amount;
        break;
      case "pending":
      case "normalized":
      case "mapped":
        tally.pending += amount;
        break;
      default:
        tally.other += amount;
        break;
    }
    tally.total += amount;
    result.set(row.entityKind, tally);
  }
  return result;
}

/**
 * Сумма денег в источнике по данным стейджинга.
 *
 * Читается normalized_json, а не счётчик загрузчика: если разбор суммы дал
 * null, слагаемое отсутствует, и расхождение с независимо посчитанной суммой
 * источника это обнаружит.
 */
async function moneyTotals(runId: string): Promise<{ loaded: number; quarantined: number; staged: number }> {
  const [row] = await db
    .select({
      staged: sql<string>`coalesce(sum((${migrationStagingRecords.normalizedJson} ->> 'amountRub')::numeric), 0)`,
      loaded: sql<string>`coalesce(sum(case when ${migrationStagingRecords.status} in ('loaded','updated') then (${migrationStagingRecords.normalizedJson} ->> 'amountRub')::numeric else 0 end), 0)`,
      quarantined: sql<string>`coalesce(sum(case when ${migrationStagingRecords.status} = 'quarantined' then (${migrationStagingRecords.normalizedJson} ->> 'amountRub')::numeric else 0 end), 0)`
    })
    .from(migrationStagingRecords)
    .where(and(eq(migrationStagingRecords.runId, runId), eq(migrationStagingRecords.entityKind, "payment")));

  return {
    staged: Math.round(Number(row?.staged ?? 0)),
    loaded: Math.round(Number(row?.loaded ?? 0)),
    quarantined: Math.round(Number(row?.quarantined ?? 0))
  };
}

export async function reconcileRun(input: ReconcileInput): Promise<MigrationReconciliationReport> {
  const byEntity = await tallyByStatus(input.runId);
  const checks: MigrationReconciliationCheck[] = [];

  const totals = {
    staged: 0,
    loaded: 0,
    updated: 0,
    duplicate: 0,
    quarantined: 0,
    skipped: 0,
    unresolved: 0
  };

  const entityBreakdown: MigrationEntityBreakdown[] = [];
  for (const [entityKind, tally] of byEntity) {
    totals.staged += tally.total;
    totals.loaded += tally.loaded;
    totals.updated += tally.updated;
    totals.duplicate += tally.duplicate;
    totals.quarantined += tally.quarantined;
    totals.skipped += tally.skipped;
    // ready/pending после загрузки — это НЕ учтённые строки: их не загрузили и
    // не изолировали. Именно они и означают потерю.
    totals.unresolved += tally.ready + tally.pending + tally.other;

    entityBreakdown.push({
      entityKind,
      sourceRows: tally.total,
      created: tally.loaded,
      updated: tally.updated,
      duplicates: tally.duplicate,
      quarantined: tally.quarantined,
      skipped: tally.skipped
    });
  }

  // ------------------------------------------------------------------
  // Проверка 1: все прочитанные строки уложены в стейджинг.
  // ------------------------------------------------------------------
  checks.push({
    code: "staging_completeness",
    title: "Все строки источника уложены в стейджинг",
    expected: input.sourceRowsParsed,
    actual: totals.staged,
    passed: totals.staged === input.sourceRowsParsed,
    detail:
      totals.staged === input.sourceRowsParsed
        ? `Разбор прочитал ${input.sourceRowsParsed} строк(и), в стейджинге столько же.`
        : `Разбор прочитал ${input.sourceRowsParsed} строк(и), а в стейджинге ${totals.staged}. Расхождение означает, что часть строк не сохранена и перенос неполон.`
  });

  // ------------------------------------------------------------------
  // Проверка 2: баланс исходов. Главная проверка отчёта.
  // ------------------------------------------------------------------
  const accountedFor = totals.loaded + totals.updated + totals.duplicate + totals.quarantined + totals.skipped;
  const rowConservationPassed = input.dryRun
    ? // В сухом прогоне загрузки не было, поэтому «учтено» — это всё, кроме
      // строк, по которым даже решение не принято.
      totals.unresolved + accountedFor === totals.staged
    : accountedFor === totals.staged;

  checks.push({
    code: "row_conservation",
    title: "Каждая строка учтена ровно в одном исходе",
    expected: totals.staged,
    actual: input.dryRun ? totals.unresolved + accountedFor : accountedFor,
    passed: rowConservationPassed,
    detail: rowConservationPassed
      ? `${totals.staged} строк(и) распределены: создано ${totals.loaded}, обновлено ${totals.updated}, дублей ${totals.duplicate}, в карантине ${totals.quarantined}, пропущено ${totals.skipped}.`
      : `Не сходится баланс: из ${totals.staged} строк учтено ${accountedFor}, без определённого исхода осталось ${totals.unresolved}. Перенос нельзя считать завершённым.`
  });

  // ------------------------------------------------------------------
  // Проверка 3: нет строк без исхода после загрузки.
  // ------------------------------------------------------------------
  if (!input.dryRun) {
    checks.push({
      code: "no_unresolved_rows",
      title: "Не осталось строк без решения",
      expected: 0,
      actual: totals.unresolved,
      passed: totals.unresolved === 0,
      detail:
        totals.unresolved === 0
          ? "Все строки либо загружены, либо изолированы, либо признаны дублями."
          : `${totals.unresolved} строк(и) остались в состоянии готовности к загрузке — загрузка до них не дошла. Повторите загрузку: уже перенесённое не продублируется.`
    });
  }

  // ------------------------------------------------------------------
  // Проверка 4: у каждой загруженной строки есть созданная сущность.
  // ------------------------------------------------------------------
  const [orphan] = await db
    .select({ rows: count() })
    .from(migrationStagingRecords)
    .where(
      and(
        eq(migrationStagingRecords.runId, input.runId),
        sql`${migrationStagingRecords.status} in ('loaded','updated')`,
        sql`${migrationStagingRecords.targetEntityId} is null`
      )
    );
  const orphanCount = Number(orphan?.rows ?? 0);
  checks.push({
    code: "loaded_rows_have_target",
    title: "Каждая загруженная строка указывает на созданную запись",
    expected: 0,
    actual: orphanCount,
    passed: orphanCount === 0,
    detail:
      orphanCount === 0
        ? "Происхождение прослеживается для всех загруженных строк."
        : `${orphanCount} строк(и) помечены загруженными, но не ссылаются на созданную запись. Откат и проверка происхождения для них невозможны.`
  });

  // ------------------------------------------------------------------
  // Проверка 5: деньги. Отдельно от строк.
  // ------------------------------------------------------------------
  const money = await moneyTotals(input.runId);
  const paymentTally = byEntity.get("payment");

  if (paymentTally && paymentTally.total > 0) {
    if (input.sourceMoneyTotalRub !== null) {
      checks.push({
        code: "money_parse_completeness",
        title: "Сумма разобранных платежей совпадает с суммой источника",
        expected: input.sourceMoneyTotalRub,
        actual: money.staged,
        passed: money.staged === input.sourceMoneyTotalRub,
        detail:
          money.staged === input.sourceMoneyTotalRub
            ? `Сумма платежей источника ${input.sourceMoneyTotalRub} руб. разобрана полностью.`
            : `Сумма платежей источника ${input.sourceMoneyTotalRub} руб., а в стейджинге ${money.staged} руб. Разница ${
                input.sourceMoneyTotalRub - money.staged
              } руб. — часть сумм не разобралась.`
      });
    }

    const moneyAccounted = money.loaded + money.quarantined;
    checks.push({
      code: "money_conservation",
      title: "Сумма загруженных и изолированных платежей равна сумме в стейджинге",
      expected: money.staged,
      actual: input.dryRun ? money.staged : moneyAccounted,
      passed: input.dryRun ? true : moneyAccounted === money.staged,
      detail: input.dryRun
        ? `Сухой прогон: к загрузке подготовлено ${money.staged} руб.`
        : moneyAccounted === money.staged
          ? `${money.staged} руб. распределены: загружено ${money.loaded} руб., в карантине ${money.quarantined} руб.`
          : `Деньги не сходятся: в стейджинге ${money.staged} руб., учтено ${moneyAccounted} руб. Потеряно из вида ${
              money.staged - moneyAccounted
            } руб.`
    });
  }

  // ------------------------------------------------------------------
  // Проверка 6: карантин соответствует изолированным строкам.
  // ------------------------------------------------------------------
  const [quarantineRows] = await db
    .select({ rows: sql<string>`count(distinct ${migrationQuarantineRecords.stagingRecordId})` })
    .from(migrationQuarantineRecords)
    .where(and(eq(migrationQuarantineRecords.runId, input.runId), eq(migrationQuarantineRecords.blocking, true)));
  const quarantineDistinct = Number(quarantineRows?.rows ?? 0);

  checks.push({
    code: "quarantine_has_reason",
    title: "У каждой изолированной строки есть причина в карантине",
    expected: totals.quarantined,
    actual: quarantineDistinct,
    // Причин может быть больше, чем строк (несколько проблем в одной строке),
    // но не меньше: строка без причины — это изоляция без объяснения.
    passed: quarantineDistinct >= totals.quarantined,
    detail:
      quarantineDistinct >= totals.quarantined
        ? `${totals.quarantined} изолированных строк(и) имеют объяснённые причины.`
        : `${totals.quarantined} строк(и) изолированы, но причина записана лишь для ${quarantineDistinct}. Оператор не сможет разобрать остальные.`
  });

  const balanced = checks.every((check) => check.passed);

  const report: MigrationReconciliationReport = {
    runId: input.runId,
    generatedAt: new Date().toISOString(),
    balanced,
    checks,
    entityBreakdown,
    sourceMoneyTotalRub: input.sourceMoneyTotalRub,
    loadedMoneyTotalRub: paymentTally && paymentTally.total > 0 ? money.loaded : null,
    quarantinedMoneyTotalRub: paymentTally && paymentTally.total > 0 ? money.quarantined : null
  };

  /**
   * Отчёт сохраняется целиком, а не пересчитывается по требованию: доказательство
   * переноса должно быть воспроизводимым спустя год, когда содержимое боевых
   * таблиц уже изменилось работой клиники.
   */
  await db.insert(migrationReconciliations).values({
    runId: input.runId,
    organizationId: input.organizationId,
    balanced,
    checksJson: checks,
    entityBreakdownJson: entityBreakdown,
    sourceMoneyTotalRub: report.sourceMoneyTotalRub,
    loadedMoneyTotalRub: report.loadedMoneyTotalRub,
    quarantinedMoneyTotalRub: report.quarantinedMoneyTotalRub
  });

  return report;
}

/**
 * Отчёт сверки в CSV — для передачи клинике вместе с актом о переносе.
 *
 * Разделитель «точка с запятой»: русский Excel открывает CSV с запятой одной
 * колонкой, и отчёт, который нельзя прочитать, доказательством не является.
 */
export function reconciliationReportCsv(report: MigrationReconciliationReport): string {
  const cell = (value: string | number | boolean | null): string => {
    if (value === null) return "";
    const text = String(value).replace(/\s+/g, " ").trim();
    return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines: string[] = [];
  lines.push(`Отчёт сверки переноса;${cell(report.runId)}`);
  lines.push(`Сформирован;${cell(report.generatedAt)}`);
  lines.push(`Итог;${report.balanced ? "СОШЛОСЬ" : "НЕ СОШЛОСЬ — перенос неполон"}`);
  lines.push("");
  lines.push("Проверка;Ожидалось;Получено;Результат;Пояснение");
  for (const check of report.checks) {
    lines.push(
      [check.title, check.expected, check.actual, check.passed ? "пройдена" : "НЕ ПРОЙДЕНА", check.detail]
        .map(cell)
        .join(";")
    );
  }
  lines.push("");
  lines.push("Сущность;Строк в источнике;Создано;Обновлено;Дублей;В карантине;Пропущено");
  for (const entity of report.entityBreakdown) {
    lines.push(
      [
        entity.entityKind,
        entity.sourceRows,
        entity.created,
        entity.updated,
        entity.duplicates,
        entity.quarantined,
        entity.skipped
      ]
        .map(cell)
        .join(";")
    );
  }
  if (report.sourceMoneyTotalRub !== null) {
    lines.push("");
    lines.push("Деньги, руб.;Значение");
    lines.push(`Сумма в источнике;${cell(report.sourceMoneyTotalRub)}`);
    lines.push(`Загружено;${cell(report.loadedMoneyTotalRub)}`);
    lines.push(`В карантине;${cell(report.quarantinedMoneyTotalRub)}`);
  }

  return lines.join("\r\n");
}
