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
/*
 * Перевод слов разборщика в слова человека — ОДИН на весь сервер, рядом с домом
 * текстов отказа по кабинету клиники (utils/clinicSessionRefusal.ts).
 */
import { schemaIssueWords } from "../utils/schemaRefusalWords.js";

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
 * Отметка «изменён» шаблона. Укрепление, а НЕ починка дефекта — и это важно
 * назвать точно, потому что в очередь пункт попал как дефект, а замер его снял.
 *
 * ЧТО ЗДЕСЬ БЫЛО. `(row.updatedAt ?? new Date()).toISOString()` с комментарием
 * «момент записи известен здесь, поэтому подставляется он». Комментарий
 * формулировал неверно: `projectRow` разбирает строку, УЖЕ лежащую в базе,
 * значит подставился бы момент чтения, а не записи.
 *
 * НО ПОДСТАВИТЬСЯ ОН НЕ МОГ, и это проверено, а не предположено:
 *
 *  • `protocol_templates.updated_at` в живой базе — `NOT NULL DEFAULT now()`
 *    (`information_schema.columns`), то есть NULL там невозможен;
 *  • создание (`createProtocolTemplateInDb`) и правка (`updateProtocolTemplateInDb`)
 *    задают `updatedAt: new Date()` явно;
 *  • `projectRow` вызывается ТОЛЬКО после записи — из создания, правки и
 *    удаления. Списка шаблонов через него не читают вовсе.
 *
 * Значит ветка `??` была недостижима по всем трём путям. Утверждение «шаблон
 * отчитывается изменённым при каждом открытии экрана» было бы ложной тревогой:
 * открытие экрана сюда не приходит.
 *
 * ЗАЧЕМ ТОГДА ПРАВКА. Осталась одна настоящая опасность, и она не про NULL:
 * PostgreSQL законно хранит в `timestamptz` то, чего в JS `Date` нет —
 * `infinity` и год 294276. На таком значении `.toISOString()` БРОСАЕТ
 * `RangeError`, и отказ выглядел бы как поломка приложения, а не как одна кривая
 * строка. Такие значения не пишет ни один путь приложения (замерено соседним
 * разбором по 12 колонкам гидратации), но их приносит восстановление дампа чужой
 * системы или правка SQL руками.
 *
 * Метка «времени нет» — начало эпохи: `Date.parse` от неё 0, то есть «самый
 * старый». Контракт требует строку, `.nullable()` в общем пакете пока нет —
 * записанный долг. Молчания нет: причина идёт в лог с идентификатором строки.
 */
const TEMPLATE_TIME_UNKNOWN = new Date(0).toISOString();

function templateUpdatedAt(row: ProtocolTemplateRow): string {
	const value = row.updatedAt;
	// Колонка NOT NULL, поэтому это не «на всякий случай», а честная
	// невозможность: если NULL всё же придёт, значит схема разошлась с кодом, и
	// об этом надо узнать из лога, а не получить время чтения в ответе.
	if (value === null || value === undefined) {
		console.error(
			`[ProtocolTemplateQuery] У шаблона ${row.id} пустая отметка «изменён», хотя колонка объявлена NOT NULL: ` +
				"схема базы разошлась с кодом. Отдана метка «времени нет», время чтения не подставлено.",
		);
		return TEMPLATE_TIME_UNKNOWN;
	}
	const millis = value.getTime();
	if (!Number.isFinite(millis)) {
		console.error(
			`[ProtocolTemplateQuery] У шаблона ${row.id} отметка «изменён» не читается как дата ` +
				`(protocol_templates.updated_at = ${String(value)}). Отдана метка «времени нет»: прежний код ` +
				"бросал здесь RangeError, и одна кривая строка роняла чтение ВСЕХ шаблонов протоколов.",
		);
		return TEMPLATE_TIME_UNKNOWN;
	}
	return value.toISOString();
}

/**
 * Русские подписи полей шаблона протокола: ключ контракта → подпись из формы
 * «Настройки → Протоколы».
 *
 * Без словаря причина отказа называла поле латинским ключом, а латинское слово
 * из шести и более знаков гасит всю фразу фильтром клиента.
 */
const protocolTemplateFieldLabels: Record<string, string> = {
	id: "опознавательный номер шаблона",
	organizationId: "клиника шаблона",
	specialty: "специальность врача",
	title: "название шаблона",
	visitReason: "причина визита",
	defaultDurationMinutes: "длительность приёма в минутах",
	complaintPrompt: "заготовка жалоб",
	objectiveTemplate: "заготовка объективного статуса",
	diagnosisHints: "подсказки по диагнозу",
	treatmentPlanTemplate: "заготовка плана лечения",
	requiredDocuments: "обязательные документы",
	suggestedImaging: "нужные снимки",
	safetyWarnings: "предупреждения по безопасности",
	updatedAt: "отметка «изменён»",
};

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
    updatedAt: templateUpdatedAt(row)
  });
  if (parsed.success) return parsed.data;
  /*
   * ПРИЧИНА НАЗЫВАЕТСЯ ПО-РУССКИ, включая имя поля.
   *
   * БЫЛО: `поле «${field}»: ${issue.message}` — латинский ключ контракта плюс
   * слово разборщика, например «поле «requiredDocuments»: Required». Эта ошибка
   * доходит до администратора через общий разборщик ответов сервера, а он гасит
   * фразу с латинским словом из шести и более знаков ЦЕЛИКОМ
   * (`apps/web/src/AppHelpers.tsx`, `technicalWorkflowFailurePattern` под флагом
   * `/i`; `requiredDocuments` — 17 знаков). Администратор жал «Сохранить»,
   * получал отказ без причины и не знал, какое из десяти полей формы поправить —
   * то есть повторялся ровно тот дефект, из-за которого этот файл и появился.
   *
   * Перевод машинных слов берётся из общего дома `utils/schemaRefusalWords.ts`.
   */
  const issue = parsed.error.issues[0];
  if (!issue) {
    throw new Error(
      "Шаблон сохранён в базу, но не проходит контракт протокола: строка не соответствует контракту шаблона. " +
        "Откройте шаблон в настройках протоколов, заполните поля заново и сохраните его."
    );
  }
  const words = schemaIssueWords(issue, protocolTemplateFieldLabels);
  throw new Error(
    `Шаблон сохранён в базу, но не проходит контракт протокола: ${words.cause} — ${words.action} в настройках протоколов.`
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
