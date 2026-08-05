/**
 * Рассылки: составление, предпросмотр, запуск, остановка.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ
 * Отправить сообщение группе пациентов было нельзя. Колонка campaign_id в
 * очереди существовала как метка, а самой кампании не было; «Рассылки» из
 * перечня возможностей конкурентов закрывались виджетами, которые читали
 * пустые таблицы и подставляли выдуманные записи.
 *
 * ЧТО ЗДЕСЬ ВАЖНО
 *
 * 1. Запуск идёт через ту же очередь, что и всё остальное. Значит рассылка
 *    подчиняется тем же правилам: тихие часы, суточный предел на пациента,
 *    согласия, повторы только для преходящих ошибок. Отдельного «быстрого
 *    пути» для массовой отправки нет — именно он и приводит к ночным SMS.
 *
 * 2. Снимок аудитории сохраняется в момент запуска. Пересчитать «кому мы это
 *    отправляли» через месяц невозможно: пациенты успеют прийти на приём,
 *    оплатить долг и отозвать согласие. Для разбора жалобы нужен ответ на
 *    момент отправки.
 *
 * 3. Ключ дубля — `campaign:<кампания>:<пациент>`. Повторный запуск той же
 *    кампании не отправляет второе сообщение тем, кто его уже получил.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  withSuperuserBypass,
  withTenantCtx,
  type TenantDb,
} from "../../db/rls.js";
import { communicationCampaigns } from "../../db/communicationsSchema.js";
import {
  communicationOutbox,
  communicationTemplates,
} from "../../db/schema.js";
import {
  describeCriteria,
  estimateAudienceCost,
  resolveAudience,
  type AudienceCostEstimate,
  type AudienceCriteria,
  type AudiencePreview,
} from "./audience.js";
import type {
  CommunicationChannelCode,
  CommunicationConsentScope,
} from "./channelRouter.js";
import { isMachineDeliverableChannel } from "./channelRouter.js";
import { enqueueMessage, type CommunicationIntentCode } from "./dispatcher.js";
import { checkChannelFit, renderTemplate } from "./templateRenderer.js";

export type CampaignRow = typeof communicationCampaigns.$inferSelect;

export function parseAudienceCriteria(raw: string): AudienceCriteria {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as AudienceCriteria)
      : {};
  } catch {
    return {};
  }
}

export type CampaignPreview = {
  readonly campaign: CampaignRow;
  readonly criteria: string[];
  readonly audience: AudiencePreview;
  readonly cost: AudienceCostEstimate;
  /** Текст, который увидит пациент: шаблон с подставленными примерами. */
  readonly sampleText: string | null;
  readonly problems: string[];
};

/**
 * Текст рассылки. У массовой отправки нет данных конкретного приёма, поэтому
 * шаблон обязан обходиться переменными, известными по карточке пациента.
 * Остальные подставить нечем — и это отказ, а не пустое место в сообщении.
 */
const CAMPAIGN_SAFE_VARIABLES = new Set([
  "patient",
  "patientFullName",
  "clinic",
  "clinicPhone",
  "clinicAddress",
  "link",
  "reviewLink",
]);

export function campaignTemplateProblems(
  body: string,
  variables: string[],
): string[] {
  const unsupported = variables.filter(
    (key) => !CAMPAIGN_SAFE_VARIABLES.has(key),
  );
  if (unsupported.length === 0) return [];
  return [
    `Для рассылки нельзя использовать переменные ${unsupported.map((key) => `{${key}}`).join(", ")}: ` +
      "у массовой отправки нет данных конкретного приёма, подставить их нечем.",
  ];
}

export type CreateCampaignInput = {
  readonly organizationId: string;
  readonly clinicId?: string | null;
  readonly title: string;
  readonly templateId: string;
  readonly scope?: CommunicationConsentScope;
  readonly criteria: AudienceCriteria;
  readonly scheduledAt?: Date | null;
  readonly createdByUserId?: string | null;
};

export type CreateCampaignResult =
  | { readonly ok: true; readonly campaign: CampaignRow }
  | { readonly ok: false; readonly reason: string };

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<CreateCampaignResult> {
  const [template] = await db
    .select()
    .from(communicationTemplates)
    .where(
      and(
        eq(communicationTemplates.id, input.templateId),
        eq(communicationTemplates.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!template)
    return { ok: false, reason: "Шаблон не найден в этой клинике." };
  if (!template.isActive)
    return {
      ok: false,
      reason: "Шаблон отключён и не может использоваться для рассылки.",
    };
  if (!isMachineDeliverableChannel(template.channel)) {
    return {
      ok: false,
      reason: `Канал «${template.channel}» не отправляется автоматически — рассылку по нему сделать нельзя.`,
    };
  }

  const variables = parseVariables(template.variablesJson);
  const problems = campaignTemplateProblems(template.body, variables);
  if (problems.length > 0) return { ok: false, reason: problems.join(" ") };

  const fit = checkChannelFit(template.channel, template.body);
  if (!fit.ok) return { ok: false, reason: fit.problems.join(" ") };

  const [created] = await db
    .insert(communicationCampaigns)
    .values({
      organizationId: input.organizationId,
      clinicId: input.clinicId ?? null,
      title: input.title,
      templateId: template.id,
      channel: template.channel,
      scope: input.scope ?? "marketing",
      status: input.scheduledAt ? "scheduled" : "draft",
      audienceJson: JSON.stringify(input.criteria),
      scheduledAt: input.scheduledAt ?? null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning();

  if (!created) return { ok: false, reason: "Не удалось создать рассылку." };
  return { ok: true, campaign: created };
}

function parseVariables(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Предпросмотр перед запуском: сколько подошло, сколько получит, сколько это
 * будет стоить и как будет выглядеть сообщение. Кампания не должна запускаться
 * вслепую — «отправлено 12 из 400» выясняется иначе уже после отправки.
 */
export async function previewCampaign(
  organizationId: string,
  campaignId: string,
  options: { readonly sampleLimit?: number; readonly now?: Date } = {},
): Promise<CampaignPreview | null> {
  const [campaign] = await db
    .select()
    .from(communicationCampaigns)
    .where(
      and(
        eq(communicationCampaigns.id, campaignId),
        eq(communicationCampaigns.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!campaign) return null;

  const criteria = parseAudienceCriteria(campaign.audienceJson);
  const audience = await resolveAudience({
    organizationId,
    channel: campaign.channel as CommunicationChannelCode,
    scope: campaign.scope as CommunicationConsentScope,
    criteria,
    ...(options.now ? { now: options.now } : {}),
  });

  const problems: string[] = [];
  let sampleText: string | null = null;

  if (campaign.templateId) {
    const [template] = await db
      .select()
      .from(communicationTemplates)
      .where(eq(communicationTemplates.id, campaign.templateId))
      .limit(1);
    if (!template) {
      problems.push("Шаблон рассылки удалён.");
    } else {
      problems.push(
        ...campaignTemplateProblems(
          template.body,
          parseVariables(template.variablesJson),
        ),
      );
      const rendered = renderTemplate(
        template.body,
        {},
        { allowPhi: true, allowEmptyValues: true },
      );
      if (rendered.ok) sampleText = rendered.text;
    }
  } else {
    problems.push("У рассылки не выбран шаблон.");
  }

  if (audience.deliverable === 0) {
    problems.push(
      "Получателей нет: проверьте условия отбора, контакты пациентов и согласия.",
    );
  }

  return {
    campaign,
    criteria: describeCriteria(criteria),
    audience: {
      ...audience,
      // В предпросмотре достаточно короткого списка: администратору нужны
      // не все 400 фамилий, а понимание, что отбор попал в цель.
      candidates: audience.candidates.slice(
        0,
        Math.max(1, Math.min(50, options.sampleLimit ?? 10)),
      ),
    },
    cost: estimateAudienceCost({
      channel: campaign.channel as CommunicationChannelCode,
      recipients: audience.deliverable,
      body: sampleText ?? "",
    }),
    sampleText,
    problems,
  };
}

export type LaunchCampaignResult =
  | {
      readonly ok: true;
      readonly queued: number;
      readonly alreadyQueued: number;
      readonly skipped: number;
      readonly matched: number;
    }
  | { readonly ok: false; readonly reason: string };

/**
 * Запуск: получатели ставятся в общую очередь, снимок аудитории сохраняется.
 * Повторный запуск безопасен — ключ дубля не даст отправить второе сообщение
 * тем, кто уже получил.
 */
export async function launchCampaign(input: {
  readonly organizationId: string;
  readonly campaignId: string;
  readonly launchedByUserId?: string | null;
  readonly now?: Date;
  readonly intent?: CommunicationIntentCode;
}): Promise<LaunchCampaignResult> {
  const now = input.now ?? new Date();

  const [campaign] = await db
    .select()
    .from(communicationCampaigns)
    .where(
      and(
        eq(communicationCampaigns.id, input.campaignId),
        eq(communicationCampaigns.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!campaign)
    return { ok: false, reason: "Рассылка не найдена в этой клинике." };
  if (campaign.status === "cancelled")
    return { ok: false, reason: "Отменённую рассылку запустить нельзя." };
  if (campaign.status === "completed")
    return { ok: false, reason: "Рассылка уже завершена." };
  /*
   * Повторный запуск уже идущей рассылки. Двойных сообщений пациентам он не
   * даёт — ключ повтора `campaign:<рассылка>:<пациент>` второе не пустит, — но
   * заново снимает аудиторию и переписывает счётчики и время запуска, то есть
   * портит журнал: по нему потом нельзя ответить, скольким и когда ушло.
   * Найдено просмотром снимка экрана: у рассылки в состоянии «Выполняется»
   * кнопка «Запустить» была самой заметной в строке.
   */
  if (campaign.status === "running") {
    return {
      ok: false,
      reason: "Рассылка уже выполняется. Дождитесь окончания или отмените её.",
    };
  }
  if (!campaign.templateId)
    return { ok: false, reason: "У рассылки не выбран шаблон." };

  const [template] = await db
    .select()
    .from(communicationTemplates)
    .where(eq(communicationTemplates.id, campaign.templateId))
    .limit(1);
  if (!template) return { ok: false, reason: "Шаблон рассылки удалён." };
  if (!template.isActive)
    return { ok: false, reason: "Шаблон рассылки отключён." };

  const channel = campaign.channel as CommunicationChannelCode;
  const scope = campaign.scope as CommunicationConsentScope;
  const criteria = parseAudienceCriteria(campaign.audienceJson);
  const audience = await resolveAudience({
    organizationId: input.organizationId,
    channel,
    scope,
    criteria,
    now,
  });

  if (audience.deliverable === 0) {
    return {
      ok: false,
      reason:
        "Получателей нет: проверьте условия отбора, контакты пациентов и согласия.",
    };
  }

  let queued = 0;
  let alreadyQueued = 0;
  let skipped = 0;

  for (const candidate of audience.candidates) {
    // Каждому подставляется своё имя: рассылка «Здравствуйте!» без имени
    // выглядит как спам и читается хуже.
    const rendered = renderTemplate(
      template.body,
      {
        patient: firstNameAndPatronymic(candidate.fullName),
        patientFullName: candidate.fullName,
      },
      { allowPhi: true, allowEmptyValues: true },
    );
    if (!rendered.ok) {
      skipped += 1;
      continue;
    }

    const result = await enqueueMessage({
      organizationId: input.organizationId,
      clinicId: campaign.clinicId,
      patientId: candidate.patientId,
      templateId: template.id,
      campaignId: campaign.id,
      channel,
      intent: input.intent ?? "general",
      scope,
      recipientAddress: candidate.recipientAddress,
      subject: template.title,
      body: rendered.text,
      dedupeKey: `campaign:${campaign.id}:${candidate.patientId}`,
    });

    if (!result.ok) skipped += 1;
    else if (result.duplicate) alreadyQueued += 1;
    else queued += 1;
  }

  // БЫЛО: UPDATE статуса/снимка аудитории только по campaign.id после SELECT с org.
  // СТАЛО: organizationId в WHERE + RETURNING; 0 строк — отказ, не ok:true с очередью.
  const [launched] = await db
    .update(communicationCampaigns)
    .set({
      status: "running",
      launchedAt: campaign.launchedAt ?? now,
      launchedByUserId: input.launchedByUserId ?? campaign.launchedByUserId,
      // Снимок именно на момент запуска: позже эти числа не воспроизвести.
      audienceSnapshotJson: JSON.stringify({
        takenAt: now.toISOString(),
        criteria: describeCriteria(criteria),
        matched: audience.matched,
        deliverable: audience.deliverable,
        excluded: audience.excluded,
        queued,
        alreadyQueued,
        skipped,
      }),
      updatedAt: now,
    })
    .where(
      and(
        eq(communicationCampaigns.id, campaign.id),
        eq(communicationCampaigns.organizationId, input.organizationId),
      ),
    )
    .returning({ id: communicationCampaigns.id });

  if (!launched) {
    return {
      ok: false,
      reason: "Не удалось зафиксировать запуск рассылки. Повторите попытку.",
    };
  }

  return {
    ok: true,
    queued,
    alreadyQueued,
    skipped,
    matched: audience.matched,
  };
}

/** «Орлова Марина Петровна» → «Марина Петровна». */
function firstNameAndPatronymic(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) return `${parts[1]} ${parts[2]}`;
  if (parts.length === 2) return parts[1] ?? fullName.trim();
  return fullName.trim();
}

/**
 * Отмена: неотправленное снимается с очереди. Уже ушедшее не трогается — в
 * журнале это должно остаться как есть.
 */
export async function cancelCampaign(
  organizationId: string,
  campaignId: string,
  now = new Date(),
): Promise<{ ok: boolean; cancelledMessages: number }> {
  const [campaign] = await db
    .select({ id: communicationCampaigns.id })
    .from(communicationCampaigns)
    .where(
      and(
        eq(communicationCampaigns.id, campaignId),
        eq(communicationCampaigns.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!campaign) return { ok: false, cancelledMessages: 0 };

  const cancelled = await db
    .update(communicationOutbox)
    .set({
      status: "cancelled",
      lockedAt: null,
      lockedBy: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(communicationOutbox.organizationId, organizationId),
        eq(communicationOutbox.campaignId, campaignId),
        inArray(communicationOutbox.status, ["queued", "sending"]),
      ),
    )
    .returning({ id: communicationOutbox.id });

  // БЫЛО: UPDATE cancelled только по id после SELECT с org.
  // СТАЛО: and(id, organizationId) + RETURNING; 0 строк — ok:false.
  const [cancelledCampaign] = await db
    .update(communicationCampaigns)
    .set({ status: "cancelled", completedAt: now, updatedAt: now })
    .where(
      and(
        eq(communicationCampaigns.id, campaignId),
        eq(communicationCampaigns.organizationId, organizationId),
      ),
    )
    .returning({ id: communicationCampaigns.id });

  if (!cancelledCampaign) return { ok: false, cancelledMessages: cancelled.length };

  return { ok: true, cancelledMessages: cancelled.length };
}

export type CampaignProgress = {
  readonly campaign: CampaignRow;
  readonly byStatus: Readonly<Record<string, number>>;
  readonly total: number;
  readonly snapshot: unknown;
};

export async function campaignProgress(
  organizationId: string,
  campaignId: string,
): Promise<CampaignProgress | null> {
  const [campaign] = await db
    .select()
    .from(communicationCampaigns)
    .where(
      and(
        eq(communicationCampaigns.id, campaignId),
        eq(communicationCampaigns.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!campaign) return null;

  const rows = await db
    .select({
      status: communicationOutbox.status,
      total: sql<number>`count(*)::int`,
    })
    .from(communicationOutbox)
    .where(
      and(
        eq(communicationOutbox.organizationId, organizationId),
        eq(communicationOutbox.campaignId, campaignId),
      ),
    )
    .groupBy(communicationOutbox.status);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    byStatus[row.status] = Number(row.total);
    total += Number(row.total);
  }

  let snapshot: unknown = null;
  if (campaign.audienceSnapshotJson) {
    try {
      snapshot = JSON.parse(campaign.audienceSnapshotJson);
    } catch {
      snapshot = null;
    }
  }

  return { campaign, byStatus, total, snapshot };
}

/**
 * Пометить как завершённую те запущенные рассылки, у которых в очереди больше
 * ничего не ждёт отправки. Без этого «выполняется» остаётся навсегда, и по
 * списку нельзя понять, что закончилось.
 *
 * ДВА РЕЖИМА, И У НИХ РАЗНЫЕ ИСТОЧНИКИ АРЕНДАТОРА. С `organizationId` функцию
 * зовёт маршрут — клиника названа. Без него зовёт фоновый цикл, и тогда это
 * обход по ВСЕМ клиникам: список берётся под обходом одним запросом, а закрытие
 * каждой рассылки идёт под контекстом её собственной клиники. Без контекста оба
 * запроса возвращали ноль строк молча, и ни одна рассылка не закрывалась.
 */
export async function completeFinishedCampaigns(
  organizationId?: string | null,
  now = new Date(),
): Promise<number> {
  const scope = [eq(communicationCampaigns.status, "running" as const)];
  if (organizationId)
    scope.push(eq(communicationCampaigns.organizationId, organizationId));

  const readRunning = async (tx: TenantDb) =>
    tx
      .select({
        id: communicationCampaigns.id,
        organizationId: communicationCampaigns.organizationId,
      })
      .from(communicationCampaigns)
      .where(and(...scope));
  const running = organizationId
    ? await withTenantCtx(organizationId, readRunning)
    : await withSuperuserBypass(readRunning);
  if (running.length === 0) return 0;

  // Рассылки группируются по клинике: и остаток очереди, и закрытие выполняются
  // внутри контекста той клиники, которой рассылка принадлежит.
  const byOrganization = new Map<string, string[]>();
  for (const campaign of running) {
    const list = byOrganization.get(campaign.organizationId) ?? [];
    list.push(campaign.id);
    byOrganization.set(campaign.organizationId, list);
  }

  let completedTotal = 0;
  for (const [tenantId, runningIds] of byOrganization) {
    completedTotal += await withTenantCtx(tenantId, async (tx) => {
      const pendingCounts = await tx
        .select({
          campaignId: communicationOutbox.campaignId,
          total: sql<number>`count(*)::int`,
        })
        .from(communicationOutbox)
        .where(
          and(
            inArray(communicationOutbox.campaignId, runningIds),
            inArray(communicationOutbox.status, ["queued", "sending"]),
          ),
        )
        .groupBy(communicationOutbox.campaignId);

      const pendingByCampaign = new Map(
        pendingCounts.map((row) => [row.campaignId, Number(row.total)]),
      );

      const completedIds = runningIds.filter(
        (id) => !pendingByCampaign.get(id),
      );

      if (completedIds.length > 0) {
        await tx
          .update(communicationCampaigns)
          .set({ status: "completed", completedAt: now, updatedAt: now })
          .where(inArray(communicationCampaigns.id, completedIds));
      }

      return completedIds.length;
    });
  }

  return completedTotal;
}

/**
 * Запуск отложенных рассылок, у которых пришло время. Вызывается фоновым
 * обработчиком вместе с разбором очереди.
 *
 * Перечисление созревших рассылок — единственное место, где арендатор
 * неизвестен: обработчик по замыслу смотрит все клиники сразу. Обход накрывает
 * ровно этот SELECT двух колонок; сам запуск идёт под контекстом клиники,
 * названной в найденной строке. Без контекста запрос отдавал ноль строк, и ни
 * одна отложенная рассылка не стартовала — она вечно висела «запланирована».
 */
export async function launchScheduledCampaigns(
  now = new Date(),
): Promise<{ launched: number; problems: string[] }> {
  const due = await withSuperuserBypass(async (tx) =>
    tx
      .select({
        id: communicationCampaigns.id,
        organizationId: communicationCampaigns.organizationId,
      })
      .from(communicationCampaigns)
      .where(
        and(
          eq(communicationCampaigns.status, "scheduled"),
          sql`${communicationCampaigns.scheduledAt} <= ${now}`,
        ),
      ),
  );

  let launched = 0;
  const problems: string[] = [];
  for (const campaign of due) {
    const result = await withTenantCtx(campaign.organizationId, () =>
      launchCampaign({
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        now,
      }),
    );
    if (result.ok) launched += 1;
    else problems.push(`Рассылка ${campaign.id}: ${result.reason}`);
  }
  return { launched, problems };
}
