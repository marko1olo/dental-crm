import { eq, and, desc, sql, isNull, or, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { clinics, denteTelegramChatLinks } from "../db/schema.js";
import {
  denteTelegramChatLinkListResponseSchema,
  denteTelegramChatLinkPublicSchema,
  type DenteTelegramChatLink,
  type DenteTelegramChatLinkListResponse,
  type DenteTelegramChatLinkStatus,
  type DenteTelegramSubjectType
} from "@dental/shared";

/**
 * СВЯЗКИ TELEGRAM-ЧАТОВ ЖИВУТ В POSTGRES, А НЕ В МАССИВЕ ПРОЦЕССА.
 *
 * Связка чата — это то, чем пациент привязал свой Telegram к клинике. Пока она
 * лежала только в оперативной памяти (`sampleData.ts`, массив
 * `denteTelegramChatLinks`), два ЖИВЫХ отправителя искали её в таблице
 * `dente_telegram_chat_links` и не находили никогда:
 *   • `services/notificationWorker.ts:55` — кому вообще отправлять;
 *   • `services/communications/channelRouter.ts:128` — берёт `chatTransportRef`,
 *     то есть адрес чата, без которого сообщение физически не уходит.
 * Пациент привязывал Telegram, видел «готово», и оставался невидимым для обоих.
 *
 * Отбор по `organizationId` обязателен в КАЖДОМ запросе этого модуля: у
 * telegram-маршрутов общий секрет периметра, арендатор приходит данными клиента,
 * и единственное, что не даёт прочитать чужие связки, — условие в SQL.
 */

/** Область видимости: клиника, её филиал и конкретная конфигурация бота. */
export type DenteTelegramChatLinkScope = {
  organizationId: string;
  clinicId?: string | null;
  botConfigId?: string | null;
};

export type BuildDenteTelegramChatLinkListInput = DenteTelegramChatLinkScope & {
  limit?: number;
  cursor?: string | null;
  status?: DenteTelegramChatLinkStatus | "all";
  subjectType?: DenteTelegramSubjectType | "all";
  subjectId?: string | null;
};

export type UpsertDenteTelegramChatLinkInput = DenteTelegramChatLinkScope & {
  subjectType: DenteTelegramSubjectType;
  subjectId: string;
  chatFingerprint: string;
  chatTransportRef?: string | null;
  chatIdLast4?: string | null;
};

type ChatLinkRow = typeof denteTelegramChatLinks.$inferSelect;

/**
 * Филиал разбирается так же, как в снятой с эксплуатации синхронной версии:
 * связка без филиала видна всей клинике, связка с филиалом — только своему.
 * Пустой `clinicId` в области видимости снимает условие, а не подставляет NULL.
 */
function chatLinkClinicVisibility(clinicId: string | null | undefined): SQL | undefined {
  const scoped = clinicId?.trim();
  if (!scoped) return undefined;
  return or(eq(denteTelegramChatLinks.clinicId, scoped), isNull(denteTelegramChatLinks.clinicId));
}

function chatLinkVisibilityConditions(scope: DenteTelegramChatLinkScope): SQL[] {
  // Арендатор — первое и безусловное условие. Всё остальное только сужает.
  const conditions: SQL[] = [eq(denteTelegramChatLinks.organizationId, scope.organizationId)];
  const botConfigId = scope.botConfigId?.trim();
  if (botConfigId) conditions.push(eq(denteTelegramChatLinks.botConfigId, botConfigId));
  const clinicCondition = chatLinkClinicVisibility(scope.clinicId);
  if (clinicCondition) conditions.push(clinicCondition);
  return conditions;
}

/**
 * `clinicId` переносится из строки, а не подставляется `null`. Раньше здесь
 * стояла константа `null`: отозванная связка возвращалась «без филиала», и отбор
 * по филиалу в списке терял смысл — колонка в таблице есть и заполняется.
 */
function toDenteTelegramChatLink(row: ChatLinkRow): DenteTelegramChatLink {
  return {
    id: row.id,
    organizationId: row.organizationId,
    clinicId: row.clinicId,
    botConfigId: row.botConfigId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    chatFingerprint: row.chatFingerprint,
    chatTransportRef: row.chatTransportRef,
    chatIdLast4: row.chatIdLast4,
    status: row.status,
    linkedAt: row.linkedAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    lastUpdateAt: row.lastUpdateAt.toISOString()
  };
}

/*
 * КОНТЕКСТ АРЕНДАТОРА ПРИНАДЛЕЖИТ ЭТИМ ФУНКЦИЯМ, А НЕ ИХ ВЫЗЫВАЮЩИМ.
 *
 * Область (`scope`) всегда несёт `organizationId` — то есть арендатор известен
 * здесь ВСЕГДА, и ставить контекст выше по стеку незачем. Это важно потому, что
 * вызывающих три и контекст есть только у одного:
 *   • вебхук Telegram — сам открывает `withTenantCtx` (routes/telegram.ts:2490);
 *   • маршруты панели управления — пускают по заголовку `x-dente-admin-secret`,
 *     который `security/identity.ts` не читает, поэтому `request.tenantId` не
 *     выставляется и глобальная обёртка server.ts их НЕ оборачивает;
 *   • тесты и служебные вызовы.
 * Под FORCE RLS второй случай ломался молча и по-разному: счётчик активных
 * привязок на панели статуса всегда показывал 0, список привязок всегда был
 * пуст, а отзыв привязки затрагивал ноль строк и отвечал «связка не найдена» —
 * то есть клиника не могла отвязать чат пациента вообще никак.
 *
 * Вложенный вызов бесплатен: `withTenantCtx` переиспользует уже открытую
 * транзакцию и не берёт второго соединения из пула (db/rls.ts, REENTRANCY).
 */
export async function listDenteTelegramChatLinks(
  scope: DenteTelegramChatLinkScope,
  limit: number = 50
): Promise<DenteTelegramChatLink[]> {
  const boundedLimit = Math.max(1, Math.min(200, Math.trunc(limit) || 50));
  const links = await withTenantCtx(scope.organizationId, async (tx) =>
    tx
      .select()
      .from(denteTelegramChatLinks)
      .where(and(...chatLinkVisibilityConditions(scope)))
      .orderBy(desc(denteTelegramChatLinks.lastUpdateAt))
      .limit(boundedLimit)
  );

  return links.map(toDenteTelegramChatLink);
}

/**
 * Число активных связок. Отдельный запрос, а не длина страницы: панель статуса
 * раньше брала первые 100 связок и считала активные среди них, поэтому у клиники
 * с бОльшим числом привязок число застывало и выглядело правдоподобно.
 */
export async function countActiveDenteTelegramChatLinks(
  scope: DenteTelegramChatLinkScope
): Promise<number> {
  const [row] = await withTenantCtx(scope.organizationId, async (tx) =>
    tx
      .select({ activeCount: sql<number>`count(*)::int` })
      .from(denteTelegramChatLinks)
      .where(and(...chatLinkVisibilityConditions(scope), eq(denteTelegramChatLinks.status, "active")))
  );
  return row?.activeCount ?? 0;
}

export async function revokeDenteTelegramChatLink(
  scope: DenteTelegramChatLinkScope,
  linkId: string
): Promise<DenteTelegramChatLink | null> {
  const [updated] = await withTenantCtx(scope.organizationId, async (tx) =>
    tx
      .update(denteTelegramChatLinks)
      .set({
        status: "revoked",
        revokedAt: sql`CURRENT_TIMESTAMP`,
        lastUpdateAt: sql`CURRENT_TIMESTAMP`
      })
      .where(
        and(
          ...chatLinkVisibilityConditions(scope),
          eq(denteTelegramChatLinks.id, linkId),
          eq(denteTelegramChatLinks.status, "active")
        )
      )
      .returning()
  );

  if (!updated) return null;
  return toDenteTelegramChatLink(updated);
}

/**
 * Кладёт связку чата в базу и снимает прежние активные связки того же субъекта.
 *
 * Ключ конфликта — `(organization_id, bot_config_id, chat_fingerprint)`, то есть
 * ровно уникальный индекс таблицы: повторный `/start` из того же чата обновляет
 * строку, а не плодит вторую. Возврат к активному состоянию тоже здесь: пациент,
 * отозвавший привязку и привязавшийся заново, получает `revoked_at = NULL`.
 */
/**
 * ФИЛИАЛ ЗАПИСЫВАЕТСЯ ТОЛЬКО ЕСЛИ ОН СУЩЕСТВУЕТ КАК ФИЛИАЛ.
 *
 * `clinic_id` в этой таблице ссылается на `clinics.id`, а telegram-путь
 * подставляет туда идентификатор ОРГАНИЗАЦИИ: `resolveDenteTelegramClinicId`
 * (`sampleData.ts`) при совпадении области возвращает `clinicProfile.organizationId`.
 * Пока в `clinics` нет строки с тем же uuid, вставка нарушает внешний ключ — и
 * связка чата не сохраняется ВООБЩЕ, то есть пациент снова невидим для
 * отправителей.
 *
 * Из двух исходов правильный — потерять область филиала, а не связку: строка с
 * `clinic_id = NULL` видна всей клинике, а отсутствие строки означает, что
 * сообщения не уйдут никому. Само смешение «филиал = организация» лечится в
 * telegram-пути, а не здесь.
 */
async function persistableClinicId(
  organizationId: string,
  clinicId: string | null
): Promise<string | null> {
  if (!clinicId) return null;
  const [existing] = await db
    .select({ id: clinics.id })
    .from(clinics)
    .where(and(eq(clinics.id, clinicId), eq(clinics.organizationId, organizationId)))
    .limit(1);
  return existing ? existing.id : null;
}

export async function upsertDenteTelegramChatLink(
  input: UpsertDenteTelegramChatLinkInput
): Promise<DenteTelegramChatLink> {
  const botConfigId = input.botConfigId?.trim() || "default";
  // Контекст ставится один раз на всю операцию: и проверка филиала, и вставка,
  // и снятие прежней активной связки идут под одним арендатором.
  return withTenantCtx(input.organizationId, async (tx) => {
    const clinicId = await persistableClinicId(input.organizationId, input.clinicId?.trim() || null);

    /**
     * В `set` попадают только те поля, для которых пришло значение. Раньше здесь
     * был `coalesce(параметр, колонка)`, но параметр NULL заставляет Postgres
     * выводить тип из соседнего аргумента, и это ровно тот запрос, который падает
     * не на первом прогоне. Пустое значение и так не должно затирать колонку —
     * значит и в запросе ему делать нечего.
     */
    const conflictUpdate: Record<string, unknown> = {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      status: "active",
      revokedAt: null,
      lastUpdateAt: sql`CURRENT_TIMESTAMP`
    };
    if (clinicId) conflictUpdate.clinicId = clinicId;
    if (input.chatTransportRef) conflictUpdate.chatTransportRef = input.chatTransportRef;
    if (input.chatIdLast4) conflictUpdate.chatIdLast4 = input.chatIdLast4;

    const [saved] = await tx
      .insert(denteTelegramChatLinks)
      .values({
        organizationId: input.organizationId,
        clinicId,
        botConfigId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        chatFingerprint: input.chatFingerprint,
        chatTransportRef: input.chatTransportRef ?? null,
        chatIdLast4: input.chatIdLast4 ?? null,
        status: "active",
        revokedAt: null
      })
      .onConflictDoUpdate({
        target: [
          denteTelegramChatLinks.organizationId,
          denteTelegramChatLinks.botConfigId,
          denteTelegramChatLinks.chatFingerprint
        ],
        set: conflictUpdate
      })
      .returning();

    // Один субъект — один активный чат. Прежний чат того же пациента снимается
    // ПОСЛЕ вставки: иначе только что записанная строка снялась бы сама.
    await tx
      .update(denteTelegramChatLinks)
      .set({
        status: "revoked",
        revokedAt: sql`CURRENT_TIMESTAMP`,
        lastUpdateAt: sql`CURRENT_TIMESTAMP`
      })
      .where(
        and(
          eq(denteTelegramChatLinks.organizationId, input.organizationId),
          eq(denteTelegramChatLinks.botConfigId, botConfigId),
          eq(denteTelegramChatLinks.subjectType, input.subjectType),
          eq(denteTelegramChatLinks.subjectId, input.subjectId),
          eq(denteTelegramChatLinks.status, "active"),
          sql`${denteTelegramChatLinks.id} <> ${saved!.id}`
        )
      );

    return toDenteTelegramChatLink(saved!);
  });
}

/**
 * Список для панели управления: та же оболочка ответа, что отдавала версия в
 * памяти, но счётчики и страница считаются запросами к базе, а не проходом по
 * массиву процесса. Три запроса вместо чтения всей таблицы в память.
 */
export async function buildDenteTelegramChatLinkList(
  input: BuildDenteTelegramChatLinkListInput
): Promise<DenteTelegramChatLinkListResponse> {
  const parsedLimit = Number(input.limit ?? 50);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(200, Math.trunc(parsedLimit))) : 50;
  const parsedCursor = Number.parseInt(input.cursor ?? "0", 10);
  const start = Math.max(0, Number.isFinite(parsedCursor) ? parsedCursor : 0);
  const status = input.status ?? "all";
  const subjectType = input.subjectType ?? "all";
  const subjectId = input.subjectId?.trim() || null;

  const visibility = chatLinkVisibilityConditions(input);

  const filters: SQL[] = [...visibility];
  if (status !== "all") filters.push(eq(denteTelegramChatLinks.status, status));
  if (subjectType !== "all") filters.push(eq(denteTelegramChatLinks.subjectType, subjectType));
  if (subjectId) filters.push(eq(denteTelegramChatLinks.subjectId, subjectId));

  // Три запроса одной страницы — под одним контекстом арендатора, названным в
  // самой области видимости. Без него панель управления (её пускают по
  // `x-dente-admin-secret`, а он `request.tenantId` не выставляет) показывала
  // пустой список и нули во всех счётчиках.
  const { totals, filtered, rows } = await withTenantCtx(input.organizationId, async (tx) => {
    const [totalsRow] = await tx
      .select({
        totalCount: sql<number>`count(*)::int`,
        activeCount: sql<number>`count(*) filter (where ${denteTelegramChatLinks.status} = 'active')::int`,
        revokedCount: sql<number>`count(*) filter (where ${denteTelegramChatLinks.status} = 'revoked')::int`
      })
      .from(denteTelegramChatLinks)
      .where(and(...visibility));

    const [filteredRow] = await tx
      .select({ filteredCount: sql<number>`count(*)::int` })
      .from(denteTelegramChatLinks)
      .where(and(...filters));

    const pageRows = await tx
      .select()
      .from(denteTelegramChatLinks)
      .where(and(...filters))
      // Порядок обязан быть устойчивым: без него страница по offset может
      // показать одну связку дважды и потерять другую.
      .orderBy(desc(denteTelegramChatLinks.lastUpdateAt), desc(denteTelegramChatLinks.id))
      .limit(limit)
      .offset(start);

    return { totals: totalsRow, filtered: filteredRow, rows: pageRows };
  });

  const filteredCount = filtered?.filteredCount ?? 0;
  const nextOffset = start + rows.length;

  return denteTelegramChatLinkListResponseSchema.parse({
    totalCount: totals?.totalCount ?? 0,
    filteredCount,
    limit,
    cursor: start === 0 ? null : String(start),
    nextCursor: nextOffset < filteredCount ? String(nextOffset) : null,
    activeCount: totals?.activeCount ?? 0,
    revokedCount: totals?.revokedCount ?? 0,
    chatLinks: rows.map((row) => denteTelegramChatLinkPublicSchema.parse(toDenteTelegramChatLink(row)))
  });
}
