/**
 * protocolTemplateQuery.ts — запись шаблонов протоколов приёма.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. У таблицы protocol_templates не было ни одного писателя.
 * Чтение работало (db/domainStateHydration.ts, поле dashboard.protocolTemplates),
 * контракт был (protocolTemplateSchema), вкладка «Настройки → Протоколы» была
 * написана целиком вместе с формой на десять полей — а адресов
 * POST/PUT/DELETE /api/settings/protocols на сервере не существовало, и Fastify
 * отвечал «Route POST:/api/settings/protocols not found». Администратор клиники
 * заполнял форму, жал «Сохранить» и читал отказ; ни завести свой протокол, ни
 * исправить чужой было нельзя.
 *
 * Шаблон протокола подставляет врачу на приёме причину визита, длительность,
 * заготовку жалоб, объективного статуса и плана лечения, список обязательных
 * документов и нужных снимков (VisitView.tsx, useAppLogic.tsx:6914).
 *
 * ПОЧЕМУ ПЕРЕЧИСЛЕНИЯ ПРОВЕРЯЮТСЯ НА ЗАПИСИ. Чтение прогоняет строку через
 * protocolTemplateSchema и МОЛЧА выбрасывает не прошедшую (collect() в
 * domainStateHydration.ts). requiredDocuments и suggestedImaging проверяются там
 * перечислениями documentKindSchema и imagingStudyKindSchema. Значит шаблон с
 * незнакомым видом документа записался бы в базу и исчез с экрана без следа:
 * оператор увидел бы «сохранено» и пустое место. Поэтому те же перечисления
 * применяются на входе, а отказ называет причину.
 *
 * ПОЧЕМУ УДАЛЕНИЕ ЗДЕСЬ НАСТОЯЩЕЕ, а в прайсе — отключение. На
 * protocol_templates.id не ссылается ни одна таблица и ни одно поле кода
 * (проверено: protocol_template_id в apps/api/src и packages/shared не
 * встречается). Удалять нечего рвать — истории лечения за шаблоном не стоит, в
 * отличие от услуги прайса, на которую ссылаются позиции лечения и счёта.
 */

import { and, eq } from "drizzle-orm";
import { protocolTemplateSchema, type ProtocolTemplate } from "@dental/shared";
import { db } from "./client.js";
import * as schema from "./schema.js";

/** Строка шаблона ровно в той форме, в которой её отдаёт база. */
export type ProtocolTemplateRow = typeof schema.protocolTemplates.$inferSelect;

/** Поля шаблона, которые задаёт администратор клиники. */
export interface ProtocolTemplateInput {
  readonly specialty: ProtocolTemplate["specialty"];
  readonly title: string;
  readonly visitReason: string;
  readonly defaultDurationMinutes: number;
  readonly complaintPrompt: string;
  readonly objectiveTemplate: string;
  readonly treatmentPlanTemplate: string;
  readonly diagnosisHints: readonly string[];
  readonly requiredDocuments: readonly ProtocolTemplate["requiredDocuments"][number][];
  readonly suggestedImaging: readonly ProtocolTemplate["suggestedImaging"][number][];
  readonly safetyWarnings: readonly string[];
}

/**
 * Частичная правка. Поля объявлены как `?: T | undefined`, а не через Partial<>:
 * при exactOptionalPropertyTypes Partial<> запрещает передавать поле со значением
 * undefined, а разбор zod-схемы с optional() возвращает именно такой объект.
 */
export type ProtocolTemplatePatch = {
  readonly [Field in keyof ProtocolTemplateInput]?: ProtocolTemplateInput[Field] | undefined;
};

function useInMemory() {
  return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

/**
 * Отказ хранилища. Отдельный класс, чтобы маршрут ответил 503 «писать некуда», а
 * не 409 «проверьте поля»: при DENTAL_STATE_PERSISTENCE=off ошибка не в вводе
 * администратора, и посылать его искать опечатку было бы ложью.
 */
export class ProtocolTemplateStorageDisabledError extends Error {
  constructor() {
    super(
      "Шаблон не сохранён: хранение состояния отключено (DENTAL_STATE_PERSISTENCE=off), " +
        "поэтому шаблоны существуют только в памяти процесса и записать их некуда."
    );
    this.name = "ProtocolTemplateStorageDisabledError";
  }
}

/** Шаблон не найден в этой клинике. Текст разбирает маршрут. */
export class ProtocolTemplateNotFoundError extends Error {
  constructor() {
    super("Шаблон не найден.");
    this.name = "ProtocolTemplateNotFoundError";
  }
}

/**
 * Строка → доменный шаблон ТЕМ ЖЕ контрактом, что и чтение экранов.
 *
 * Если записанная строка контракт не проходит, наружу идёт причина, а не
 * «сохранено»: шаблон, которого не будет на экране, — это не успех. Ровно так же
 * поступает проекция прайса (db/pricelistQuery.ts).
 */
function projectRow(row: ProtocolTemplateRow): ProtocolTemplate {
  const parsed = protocolTemplateSchema.safeParse({
    id: row.id,
    organizationId: row.organizationId,
    specialty: row.specialty,
    title: row.title,
    visitReason: row.visitReason,
    defaultDurationMinutes: row.defaultDurationMinutes,
    complaintPrompt: row.complaintPrompt,
    objectiveTemplate: row.objectiveTemplate,
    diagnosisHints: row.diagnosisHints ?? [],
    treatmentPlanTemplate: row.treatmentPlanTemplate,
    requiredDocuments: row.requiredDocuments ?? [],
    suggestedImaging: row.suggestedImaging ?? [],
    safetyWarnings: row.safetyWarnings ?? [],
    // Колонка обнуляемая, а контракт требует строку. Момент записи известен
    // здесь, поэтому подставляется он, а не выдуманная дата.
    updatedAt: (row.updatedAt ?? new Date()).toISOString()
  });
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const field = issue?.path.join(".") ?? "";
  const message = issue?.message ?? "строка не соответствует контракту шаблона";
  throw new Error(
    `Шаблон сохранён в базу, но не проходит контракт протокола: ${field ? `поле «${field}»: ` : ""}${message}`
  );
}

/**
 * Шаблон по идентификатору, обязательно в пределах своей клиники. Фильтр по
 * organizationId стоит в том же условии, что и по id: без него по прямой ссылке
 * правился бы протокол чужой клиники.
 */
async function selectOwnedRow(
  organizationId: string,
  templateId: string
): Promise<ProtocolTemplateRow | null> {
  const [row] = await db
    .select()
    .from(schema.protocolTemplates)
    .where(
      and(
        eq(schema.protocolTemplates.id, templateId),
        eq(schema.protocolTemplates.organizationId, organizationId)
      )
    )
    .limit(1);
  return row ?? null;
}

/** Новый шаблон протокола. */
export async function createProtocolTemplateInDb(
  organizationId: string,
  input: ProtocolTemplateInput
): Promise<ProtocolTemplate> {
  if (useInMemory()) throw new ProtocolTemplateStorageDisabledError();
  const [row] = await db
    .insert(schema.protocolTemplates)
    .values({
      organizationId,
      specialty: input.specialty,
      title: input.title,
      visitReason: input.visitReason,
      defaultDurationMinutes: input.defaultDurationMinutes,
      complaintPrompt: input.complaintPrompt,
      objectiveTemplate: input.objectiveTemplate,
      treatmentPlanTemplate: input.treatmentPlanTemplate,
      diagnosisHints: [...input.diagnosisHints],
      requiredDocuments: [...input.requiredDocuments],
      suggestedImaging: [...input.suggestedImaging],
      safetyWarnings: [...input.safetyWarnings],
      updatedAt: new Date()
    })
    .returning();
  if (!row) throw new Error("Шаблон не создан: база не вернула ни одной строки.");
  return projectRow(row);
}

/** Правка шаблона. Меняются только переданные поля. */
export async function updateProtocolTemplateInDb(
  organizationId: string,
  templateId: string,
  patch: ProtocolTemplatePatch
): Promise<ProtocolTemplate> {
  if (useInMemory()) throw new ProtocolTemplateStorageDisabledError();
  // Существование проверяется ДО обновления: drizzle на несовпавшем условии
  // вернёт пустой массив, и «не найдено» стало бы неотличимо от «не изменилось».
  const existing = await selectOwnedRow(organizationId, templateId);
  if (!existing) throw new ProtocolTemplateNotFoundError();

  const updates: Partial<typeof schema.protocolTemplates.$inferInsert> = {
    // Дата правки обновляется всегда: шаблон меняет заполнение карты приёма, и
    // «когда это стало таким» — часть ответа на вопрос, почему приём выглядит так.
    updatedAt: new Date()
  };
  if (patch.specialty !== undefined) updates.specialty = patch.specialty;
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.visitReason !== undefined) updates.visitReason = patch.visitReason;
  if (patch.defaultDurationMinutes !== undefined) {
    updates.defaultDurationMinutes = patch.defaultDurationMinutes;
  }
  if (patch.complaintPrompt !== undefined) updates.complaintPrompt = patch.complaintPrompt;
  if (patch.objectiveTemplate !== undefined) updates.objectiveTemplate = patch.objectiveTemplate;
  if (patch.treatmentPlanTemplate !== undefined) {
    updates.treatmentPlanTemplate = patch.treatmentPlanTemplate;
  }
  if (patch.diagnosisHints !== undefined) updates.diagnosisHints = [...patch.diagnosisHints];
  if (patch.requiredDocuments !== undefined) {
    updates.requiredDocuments = [...patch.requiredDocuments];
  }
  if (patch.suggestedImaging !== undefined) updates.suggestedImaging = [...patch.suggestedImaging];
  if (patch.safetyWarnings !== undefined) updates.safetyWarnings = [...patch.safetyWarnings];

  const [row] = await db
    .update(schema.protocolTemplates)
    .set(updates)
    .where(
      and(
        eq(schema.protocolTemplates.id, templateId),
        eq(schema.protocolTemplates.organizationId, organizationId)
      )
    )
    .returning();
  if (!row) throw new ProtocolTemplateNotFoundError();
  return projectRow(row);
}

/**
 * Удаление шаблона. Настоящее, а не отключение: на protocol_templates.id не
 * ссылается ни одна таблица, признака активности у шаблона нет, и экран обещает
 * оператору именно удаление. Возвращается удалённая строка — интерфейсу нужно
 * знать, что именно ушло.
 */
export async function deleteProtocolTemplateInDb(
  organizationId: string,
  templateId: string
): Promise<ProtocolTemplate> {
  if (useInMemory()) throw new ProtocolTemplateStorageDisabledError();
  const existing = await selectOwnedRow(organizationId, templateId);
  if (!existing) throw new ProtocolTemplateNotFoundError();
  const [row] = await db
    .delete(schema.protocolTemplates)
    .where(
      and(
        eq(schema.protocolTemplates.id, templateId),
        eq(schema.protocolTemplates.organizationId, organizationId)
      )
    )
    .returning();
  if (!row) throw new ProtocolTemplateNotFoundError();
  return projectRow(row);
}
