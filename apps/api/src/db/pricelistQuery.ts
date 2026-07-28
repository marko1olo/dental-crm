/**
 * pricelistQuery.ts — ЕДИНСТВЕННАЯ проекция строки прайса в доменную услугу.
 *
 * ЧТО БЫЛО НЕ ТАК
 *
 * У прайса было два независимых чтения одной и той же таблицы
 * service_catalog_items, и они расходились:
 *
 *   • здесь (для документов) строка отдавалась как есть: цена и длительность без
 *     проверки, контракт услуги не применялся вовсе;
 *   • в db/domainStateHydration.ts (для экранов) та же строка проходила через
 *     Math.max-подрезку и проверку serviceCatalogItemSchema, а не прошедшие
 *     проверку строки МОЛЧА выбрасывались.
 *
 * Одна и та же услуга могла попасть в договор и не попасть на экран, а цена с
 * подрезкой на экране отличалась от цены в договоре. Для денег и юридических
 * документов это недопустимо (.agents/AGENTS.md §8b: суммы точны до копейки).
 *
 * ЧТО СТАЛО
 *
 * Проекция ровно одна — projectServiceCatalogRows(). И экран, и договор, и
 * анализ прайса (routes/pricelist.ts) вызывают её, поэтому расхождение цен
 * между поверхностями стало структурно невозможным, а не «проверенным глазами».
 *
 * ПОЧЕМУ ОТКАЗ, А НЕ ПОДРЕЗКА
 *
 * Подрезка Math.max(0, price) превращает битую цену в БЕСПЛАТНУЮ услугу в
 * договоре, а Math.max(1, duration) выдумывает длительность. Придуманное число
 * в юридическом документе хуже отсутствующей строки: пациент увидит сумму,
 * которой клиника не выставляла. Поэтому строка, не прошедшая контракт,
 * отклоняется целиком и попадает в список rejected — с кодом, названием и
 * человеческой причиной, чтобы администратор понял, что именно поправить.
 */

import { eq } from "drizzle-orm";
import { serviceCatalogItemSchema, type ServiceCatalogItem } from "@dental/shared";
import { db } from "./client.js";
import * as schema from "./schema.js";

/** Строка прайса ровно в той форме, в которой её отдаёт база. */
export type ServiceCatalogRow = typeof schema.serviceCatalogItems.$inferSelect;

/** Услуга, которую не удалось принять, и причина — человеческими словами. */
export interface RejectedServiceCatalogRow {
  code: string;
  title: string;
  reason: string;
}

export interface ServiceCatalogProjection {
  items: ServiceCatalogItem[];
  rejected: RejectedServiceCatalogRow[];
}

/**
 * Текст для пустого прайса. Живёт здесь, а не у каждого вызывающего, чтобы на
 * всех поверхностях звучала одна и та же фраза.
 */
export const SERVICE_CATALOG_EMPTY_MESSAGE =
  "Прайс-лист пуст: в справочнике услуг клиники нет ни одной позиции. " +
  "Заполните прайс в настройках — иначе договор, счёт и чек не смогут посчитать сумму, " +
  "а справка для налогового вычета уйдёт с нулём.";

function useInMemory() {
  return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

/**
 * Числовое значение денежной колонки.
 *
 * numeric(12,2) с mode "number" обычно уже приходит числом, но драйвер отдаёт
 * numeric строкой, если разбор типов не зарегистрирован (см. moneyTypeParsers.ts).
 * Поэтому приведение остаётся. Возврат null вместо нуля — принципиален:
 * подставить 0 значило бы объявить услугу бесплатной.
 */
function readMoneyRub(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readDurationMinutes(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstIssueMessage(issues: readonly { path: (string | number)[]; message: string }[]): string {
  const issue = issues[0];
  if (!issue) return "строка не соответствует контракту услуги";
  const field = issue.path.join(".");
  return field ? `поле «${field}»: ${issue.message}` : issue.message;
}

/**
 * Единая проекция строк прайса. Вызывается и путём экранов
 * (db/domainStateHydration.ts), и путём документов (db/documentQuery.ts через
 * getServiceCatalogForOrganization), и анализом прайса (routes/pricelist.ts).
 */
export function projectServiceCatalogRows(
  rows: readonly ServiceCatalogRow[]
): ServiceCatalogProjection {
  const items: ServiceCatalogItem[] = [];
  const rejected: RejectedServiceCatalogRow[] = [];

  for (const row of rows) {
    const basePriceRub = readMoneyRub(row.basePriceRub);
    if (basePriceRub === null) {
      rejected.push({
        code: row.code,
        title: row.title,
        reason: "цена в базе не читается как число, поэтому услугу нельзя посчитать ни в счёте, ни в договоре"
      });
      continue;
    }
    const durationMinutes = readDurationMinutes(row.durationMinutes);
    if (durationMinutes === null) {
      rejected.push({
        code: row.code,
        title: row.title,
        reason: "длительность в базе не читается как число, поэтому услугу нельзя поставить в расписание"
      });
      continue;
    }

    const parsed = serviceCatalogItemSchema.safeParse({
      id: row.id,
      organizationId: row.organizationId,
      code: row.code,
      title: row.title,
      /*
       * Синонимов у услуги в таблице нет — колонки под них не существует.
       * Пустой массив здесь не заглушка, а честное «синонимы не заведены»:
       * контракт объявляет aliases обязательным полем со значением по умолчанию.
       */
      aliases: [],
      category: row.category,
      specialty: row.specialty,
      basePriceRub,
      durationMinutes,
      taxDeductible: row.taxDeductible,
      active: row.isActive
    });

    if (!parsed.success) {
      rejected.push({
        code: row.code,
        title: row.title,
        reason: firstIssueMessage(parsed.error.issues)
      });
      continue;
    }

    items.push(parsed.data);
  }

  return { items, rejected };
}

export async function getDefaultOrganizationId(): Promise<string | null> {
  if (useInMemory()) {
    return "00000000-0000-0000-0000-000000000001";
  }
  try {
    const [org] = await db.select().from(schema.organizations).limit(1);
    return org?.id || "00000000-0000-0000-0000-000000000001";
  } catch {
    return "00000000-0000-0000-0000-000000000001";
  }
}

/** Прайс организации для документов и анализа прайса. */
export async function getServiceCatalogForOrganization(
  organizationId: string
): Promise<ServiceCatalogItem[]> {
  const rows = await db
    .select()
    .from(schema.serviceCatalogItems)
    .where(eq(schema.serviceCatalogItems.organizationId, organizationId));
  return projectServiceCatalogRows(rows).items;
}
