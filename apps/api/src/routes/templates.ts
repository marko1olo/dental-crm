import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import {
  requireClinicalMutationAccess,
  requireClinicalReadAccess,
  resolveOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { visitTemplates } from "../db/schema.js";
import { ensureClinicalTemplatesSeeded } from "../scripts/seedTemplates.js";
import { clinicNotIdentifiedMessage } from "../utils/clinicSessionRefusal.js";

/**
 * ПРОТОКОЛЫ ПРИЁМА ОТКАЗЫВАЛИ КОДОМ, А НЕ ПРИЧИНОЙ.
 *
 * ЧТО БЫЛО. Доказано запросом в процессе (`app.inject`, не дев-сервер): пять
 * ветвей этого файла отвечали телом без поля `message` —
 * `{"error":"OrgRequired"}` (список, один протокол, создание, удаление,
 * переустановка), `{"error":"NotFound"}`, `{"error":"Title required"}` и
 * `{"error":"CannotDeleteBuiltIn"}`. Две последние строки вдобавок написаны
 * латиницей: клиент гасит текст без русских букв целиком
 * (`AppHelpers.tsx`, `operatorReadableErrorDetail`), так что даже поставь их в
 * `message` — человек не увидел бы ничего.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Список «Клинический шаблон» открывается на КАЖДОМ
 * приёме: это первое, что делает врач, садясь заполнять дневник. Отказ без
 * причины здесь неотличим от «протоколов в этой клинике нет» — тот же дефект,
 * который уже починен в этом файле для провала установки (503 ниже). Разница
 * между «войдите в кабинет заново» и «звоните администратору» — это разница
 * между десятью секундами и потерянным приёмом.
 *
 * ПОПРАВКА К РАЗБОРУ УЧАСТКА. План писал про эти строки: «там сервер причины и
 * не знает; сочинять её нельзя». Это неверно, и проверено чтением обеих ветвей:
 * причина у сервера установлена точно в каждой из четырёх — кабинет клиники не
 * определён, протокола с таким номером в этой клинике нет, у протокола нет
 * названия, протокол встроенный. Сочинять ничего не пришлось.
 *
 * Коды ответа и значения поля `error` сохранены дословно. Текст состояния «нет
 * кабинета» берётся из общего дома `utils/clinicSessionRefusal.ts`.
 */
const TEMPLATES_CLINIC_UNKNOWN_LIST_MESSAGE = clinicNotIdentifiedMessage(
  "список протоколов приёма не открыть",
);
const TEMPLATES_CLINIC_UNKNOWN_ONE_MESSAGE = clinicNotIdentifiedMessage(
  "протокол приёма не открыть",
);
const TEMPLATES_CLINIC_UNKNOWN_CREATE_MESSAGE = clinicNotIdentifiedMessage(
  "новый протокол приёма не сохранить",
  "заполненная форма остаётся на экране",
);
const TEMPLATES_CLINIC_UNKNOWN_DELETE_MESSAGE = clinicNotIdentifiedMessage(
  "удалить протокол приёма нельзя",
);
const TEMPLATES_CLINIC_UNKNOWN_SEED_MESSAGE = clinicNotIdentifiedMessage(
  "встроенные протоколы приёма не установить",
);

/**
 * «Протокола нет». Причина установлена точно: строки с таким номером в этой
 * клинике не существует. Прежний голый 404 клиент превращал в «сервер не знает
 * такого раздела — скорее всего программа клиники обновлена не полностью,
 * сообщите администратору» — ложное указание, потому что маршрут работает.
 */
const TEMPLATE_NOT_FOUND_MESSAGE =
  "Этот протокол приёма не найден в вашей клинике. Так бывает, если его удалили, пока список был открыт на экране. Обновите список протоколов и выберите протокол заново.";

/**
 * «У протокола нет названия». Поле названо русской подписью с экрана, а не
 * именем колонки: по названию врач и выбирает протокол в списке на приёме, и это
 * же объясняет, зачем оно обязательно.
 */
const TEMPLATE_TITLE_REQUIRED_MESSAGE =
  "Протокол приёма не сохранён, потому что у него не заполнено название. Именно по названию врач выбирает протокол в списке на приёме, поэтому пустым оно быть не может. Впишите название и сохраните снова.";

/**
 * «Встроенный протокол удалить нельзя».
 *
 * Обходной путь назван ровно тот, который в продукте есть: своих протоколов
 * можно создать сколько угодно. Признака «снять с использования» у протокола НЕТ
 * — в `visit_templates` нет колонки активности (проверено чтением
 * `db/schema.ts`), — поэтому предлагать «отключите его» значило бы отправить
 * администратора к кнопке, которой не существует.
 */
const TEMPLATE_BUILT_IN_MESSAGE =
  "Это встроенный протокол приёма, он поставляется вместе с программой и удалить его нельзя. Если он вам не подходит, создайте свой протокол приёма и выбирайте на приёме его — встроенный останется в списке, но пользоваться им никто не обязан.";


/**
 * POST /api/templates: тело раньше — bare cast `req.body as { title: string; … }`.
 * null/array → TypeError на body.title (500). Zod safeParse после AUTH/org → 400.
 */
const templateCreateBodySchema = z.object({
  title: z.unknown().optional(),
  category: z.unknown().optional(),
  specialty: z.unknown().optional(),
  prefilledAnamnesis: z.unknown().optional(),
  prefilledObjective: z.unknown().optional(),
  prefilledTreatment: z.unknown().optional(),
  defaultIcd10: z.unknown().optional(),
  defaultIcd10Label: z.unknown().optional(),
  suggestedProcedureIds: z.unknown().optional(),
});

export default async function registerTemplateRoutes(app: FastifyInstance) {
  app.get("/api/templates", async (req, reply) => {
    if (!(await requireClinicalReadAccess(req, reply, "read templates")))
      return;
    const orgId = await resolveOrganizationId(req);
    if (!orgId)
      return reply.code(403).send({
        error: "OrgRequired",
        message: TEMPLATES_CLINIC_UNKNOWN_LIST_MESSAGE,
      });

    // Auto-seed built-in templates if none exist
    const existing = await db
      .select()
      .from(visitTemplates)
      .where(eq(visitTemplates.organizationId, orgId));
    /*
     * ЧТО БЫЛО СЛОМАНО. Провал установки встроенных протоколов приёма
     * записывался в журнал сервера и наружу уходил безусловный
     * `200 {"templates":[]}`. Для врача «протоколов в этой клинике нет» и
     * «протоколы не поставились» выглядели одинаково — пустым выпадающим
     * списком «Клинический шаблон», — а разница между ними это разница между
     * «набираю дневник руками» и «звоню администратору». Отказа не было
     * вообще: человек не знал, что что-то сломалось, и делал вывод, что
     * готовых протоколов в его клинике не бывает. Дневник приёма заполняется
     * на каждом приёме, поэтому вывод закреплялся навсегда.
     *
     * Ошибка запоминается, а не гасится: ответ решается ПОСЛЕ повторного
     * чтения списка. Посев идёт вставками в цикле без транзакции
     * (scripts/seedTemplates.ts), поэтому сбой посередине оставляет часть
     * протоколов в базе — и отказ вместо них отнял бы у врача то, что уже
     * годится к работе.
     */
    let seedFailure: unknown = null;
    if (existing.length === 0) {
      try {
        await ensureClinicalTemplatesSeeded(orgId);
      } catch (err) {
        seedFailure = err;
        // error, а не warn: пустой список протоколов у клиники — это поломка
        // установки, и в журнале она обязана лежать как поломка.
        app.log.error(
          `[Templates] Установка встроенных протоколов провалилась для организации ${orgId}: ${String(err)}`,
        );
      }
    }

    const templates = await db
      .select()
      .from(visitTemplates)
      .where(eq(visitTemplates.organizationId, orgId));

    if (seedFailure && templates.length === 0) {
      // 503, а не 200: список пуст не потому, что протоколов нет, а потому
      // что их не удалось установить. Причина у сервера установлена только
      // такая — сама установка не прошла; ЧТО именно отказало (база, права,
      // связь), сервер здесь не знает и не сочиняет: подробности ушли в
      // журнал строкой выше.
      return reply.code(503).send({
        error: "ClinicalTemplatesSeedFailed",
        message:
          "Встроенные клинические протоколы не установились в этой клинике, поэтому список пуст — это сбой установки, а не отсутствие протоколов. Дневник приёма пока заполните вручную и передайте это сообщение администратору клиники: установку нужно повторить.",
      });
    }

    return reply.send({ templates });
  });

  app.get("/api/templates/:id", async (req, reply) => {
    if (!(await requireClinicalReadAccess(req, reply, "read template"))) return;
    const { id } = req.params as { id: string };
    const orgId = await resolveOrganizationId(req);
    if (!orgId)
      return reply.code(403).send({
        error: "OrgRequired",
        message: TEMPLATES_CLINIC_UNKNOWN_ONE_MESSAGE,
      });

    const [template] = await db
      .select()
      .from(visitTemplates)
      .where(
        and(
          eq(visitTemplates.id, id),
          eq(visitTemplates.organizationId, orgId),
        ),
      );

    if (!template)
      return reply
        .code(404)
        .send({ error: "NotFound", message: TEMPLATE_NOT_FOUND_MESSAGE });
    return reply.send({ template });
  });

  app.post("/api/templates", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "create template")))
      return;
    const orgId = await resolveOrganizationId(req);
    if (!orgId)
      return reply.code(403).send({
        error: "OrgRequired",
        message: TEMPLATES_CLINIC_UNKNOWN_CREATE_MESSAGE,
      });

    const parsedBody = templateCreateBodySchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return reply.code(400).send({
        error: "Title required",
        message: TEMPLATE_TITLE_REQUIRED_MESSAGE,
      });
    }
    const titleRaw = parsedBody.data.title;
    const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
    if (!title) {
      return reply.code(400).send({
        error: "Title required",
        message: TEMPLATE_TITLE_REQUIRED_MESSAGE,
      });
    }
    const str = (v: unknown): string | undefined =>
      typeof v === "string" ? v : undefined;
    const suggestedRaw = parsedBody.data.suggestedProcedureIds;
    const suggestedProcedureIds = Array.isArray(suggestedRaw)
      ? suggestedRaw.filter((x): x is string => typeof x === "string")
      : [];

    const [inserted] = await db
      .insert(visitTemplates)
      .values({
        organizationId: orgId,
        title,
        category: str(parsedBody.data.category),
        specialty: str(parsedBody.data.specialty),
        prefilledAnamnesis: str(parsedBody.data.prefilledAnamnesis),
        prefilledObjective: str(parsedBody.data.prefilledObjective),
        prefilledTreatment: str(parsedBody.data.prefilledTreatment),
        defaultIcd10: str(parsedBody.data.defaultIcd10),
        defaultIcd10Label: str(parsedBody.data.defaultIcd10Label),
        suggestedProcedureIds,
        isBuiltIn: false,
      })
      .returning();

    return reply.code(201).send({ template: inserted });
  });

  app.delete("/api/templates/:id", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "delete template")))
      return;
    const { id } = req.params as { id: string };
    const orgId = await resolveOrganizationId(req);
    if (!orgId)
      return reply.code(403).send({
        error: "OrgRequired",
        message: TEMPLATES_CLINIC_UNKNOWN_DELETE_MESSAGE,
      });

    const [template] = await db
      .select()
      .from(visitTemplates)
      .where(
        and(
          eq(visitTemplates.id, id),
          eq(visitTemplates.organizationId, orgId),
        ),
      );

    if (!template)
      return reply
        .code(404)
        .send({ error: "NotFound", message: TEMPLATE_NOT_FOUND_MESSAGE });
    if (template.isBuiltIn)
      return reply.code(403).send({
        error: "CannotDeleteBuiltIn",
        message: TEMPLATE_BUILT_IN_MESSAGE,
      });

    await db
      .delete(visitTemplates)
      .where(
        and(
          eq(visitTemplates.id, id),
          eq(visitTemplates.organizationId, orgId),
        ),
      );
    return reply.send({ success: true });
  });

  app.post("/api/templates/seed", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "seed templates")))
      return;
    const orgId = await resolveOrganizationId(req);
    if (!orgId)
      return reply.code(403).send({
        error: "OrgRequired",
        message: TEMPLATES_CLINIC_UNKNOWN_SEED_MESSAGE,
      });

    await ensureClinicalTemplatesSeeded(orgId);
    const templates = await db
      .select()
      .from(visitTemplates)
      .where(eq(visitTemplates.organizationId, orgId));
    return reply.send({ success: true, count: templates.length });
  });
}
