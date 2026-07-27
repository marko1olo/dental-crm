import {
  migrationTargetFieldSchema,
  type MigrationColumnMapping,
  type MigrationEntityKind,
  type MigrationTargetField
} from "@dental/shared";
import { describeColumnForModel, type ColumnProfile } from "./columnProfile.js";
import { isLlmAvailable, requestLlmJson } from "./llmClient.js";

/**
 * Сопоставление колонок полями с участием языковой модели.
 *
 * ГДЕ ГРАНИЦА МЕЖДУ АЛГОРИТМОМ И МОДЕЛЬЮ
 * Модель вызывается только для колонок, которые не разобрал алгоритмический
 * слой: имя не нашлось в словарях, содержимое не опознано однозначно. Это,
 * например, «F7», «PRIM2», «Доп. инфо», «Kod_L» — то, где нужно понимание
 * смысла, а не таблица синонимов.
 *
 * ЧЕМ СДЕРЖИВАЮТСЯ ГАЛЛЮЦИНАЦИИ
 * Пять ограничений, каждое из которых работает независимо от остальных:
 *
 *  1. Модель НЕ ВИДИТ значений. В запрос уходит статистический портрет колонки
 *     и маски вида «99.99.9999». Значит, модель физически не может вернуть
 *     выдуманное ФИО или подставить чужой телефон: она не знает ни одного.
 *     Это же закрывает и вопрос врачебной тайны.
 *
 *  2. Модель НЕ ЗАПОЛНЯЕТ ДАННЫЕ, а только называет поле для колонки. Все
 *     значения в базу пишут нормализаторы из detерминированного слоя. Худшее,
 *     что может сделать ошибающаяся модель, — предложить неверное поле, и это
 *     ловится проверкой ниже.
 *
 *  3. Замкнутый список. Ответ обязан быть одним из значений
 *     migrationTargetFieldSchema. Любое другое имя поля — отказ, который
 *     считается в migration_runs.llm_rejected_suggestions.
 *
 *  4. Проверка содержимым. Предложение «эта колонка — дата рождения»
 *     принимается, только если значения колонки действительно разбираются как
 *     даты. Уверенный, но неверный ответ отсекается арифметикой, а не доверием.
 *
 *  5. Потолок уверенности. Решение модели никогда не получает уверенность выше
 *     решения правила, поэтому при конфликте правило всегда побеждает, и
 *     появление модели не может ухудшить то, что работало без неё.
 */

/** Уверенность решения модели не поднимается выше этого значения — см. пункт 5. */
const LLM_CONFIDENCE_CEILING = 0.8;

/**
 * Минимальная доля разбора для принятия предложения модели. Строже, чем для
 * правил (0.6): у правила есть внешнее подтверждение в виде совпадения имени,
 * у модели — только её собственное мнение.
 */
const LLM_VALIDATION_MIN_RATE = 0.75;

/** Ограничение размера запроса: больше 60 колонок за раз не бывает осмысленно. */
const MAX_COLUMNS_PER_REQUEST = 60;

/** Какому нормализатору должно подчиняться значение поля — для проверки пункта 4. */
const FIELD_CHECK: Partial<Record<MigrationTargetField, keyof ColumnProfile["parseRates"]>> = {
  "patient.birthDate": "date",
  "patient.createdAt": "date",
  "patient.phone": "phone",
  "patient.secondaryPhone": "phone",
  "patient.email": "email",
  "patient.gender": "gender",
  "patient.fullName": "personName",
  "doctor.fullName": "personName",
  "doctor.phone": "phone",
  "doctor.email": "email",
  "service.priceRub": "money",
  "appointment.startsAt": "date",
  "appointment.endsAt": "date",
  "appointment.durationMinutes": "integer",
  "visit.date": "date",
  "payment.amountRub": "money",
  "payment.paidAt": "date",
  "toothState.toothCode": "toothCode"
};

const CHECK_TITLES: Record<string, string> = {
  date: "дата",
  phone: "телефон",
  money: "сумма",
  email: "адрес почты",
  personName: "ФИО",
  gender: "обозначение пола",
  toothCode: "номер зуба",
  integer: "целое число"
};

interface LlmSuggestion {
  sourceColumn: string;
  targetField: MigrationTargetField;
  confidence: number;
  rationale: string;
}

export interface LlmMappingResult {
  /** Принятые предложения, готовые к добавлению в карту соответствия. */
  accepted: MigrationColumnMapping[];
  /** Колонки, по которым модель не дала пригодного ответа. */
  stillUnmapped: string[];
  calls: number;
  /** Число отвергнутых предложений — попадает в отчёт как мера галлюцинаций. */
  rejected: number;
  warnings: string[];
  model: string | null;
}

function buildSystemPrompt(entityKind: MigrationEntityKind, allowedFields: MigrationTargetField[]): string {
  return `Вы разбираете выгрузку из стоматологической CRM для переноса в другую систему.

ЗАДАЧА: для каждой колонки источника указать, какому полю целевой модели она соответствует.

СУЩНОСТЬ ИСТОЧНИКА: ${entityKind}

ДОПУСТИМЫЕ ЗНАЧЕНИЯ targetField — ТОЛЬКО из этого списка:
${allowedFields.join(", ")}

Если колонка не соответствует ни одному полю, верните для неё targetField "ignore".

ВАЖНЫЕ ОГРАНИЧЕНИЯ:
- Вы НЕ видите значений колонок и не должны их предполагать. Вам дан статистический портрет: доля значений, разобравшихся как дата/телефон/сумма/ФИО, длины, число различных значений и МАСКИ формата (цифра обозначена "9", строчная кириллица "а", прописная "А", латиница "a"/"A").
- Не придумывайте имён полей. Значение вне списка будет отброшено.
- Не придумывайте имён колонок. Возвращайте ровно те sourceColumn, что переданы.
- Опирайтесь на портрет, а не только на имя колонки. Если имя намекает на дату, но доля разбора date низкая, это не дата.
- confidence — ваша уверенность от 0 до 1. Ставьте ниже 0.5, если решение основано на догадке.

ОТВЕТ строго в формате JSON:
{"mappings":[{"sourceColumn":"...","targetField":"...","confidence":0.9,"rationale":"краткое обоснование на русском"}]}`;
}

function buildUserPrompt(profiles: ColumnProfile[]): string {
  const lines = profiles.map((profile, index) => `${index + 1}. ${describeColumnForModel(profile)}`);
  return `Колонки источника (${profiles.length} шт.):\n${lines.join("\n")}`;
}

/**
 * Поля, доступные модели для данной сущности. Список сужается намеренно: давать
 * модели поля платежей при разборе таблицы пациентов — приглашение к ошибке.
 */
function allowedFieldsFor(entityKind: MigrationEntityKind): MigrationTargetField[] {
  const all = migrationTargetFieldSchema.options;
  const prefixByEntity: Partial<Record<MigrationEntityKind, string[]>> = {
    patient: ["patient."],
    doctor: ["doctor."],
    service: ["service."],
    appointment: ["appointment."],
    visit: ["visit."],
    payment: ["payment."],
    tooth_state: ["toothState."],
    treatment_plan: ["visit.", "service."],
    document: ["patient."],
    unknown: ["patient.", "doctor.", "service.", "appointment.", "visit.", "payment.", "toothState."]
  };
  const prefixes = prefixByEntity[entityKind] ?? prefixByEntity.unknown!;
  return [...all.filter((field) => prefixes.some((prefix) => field.startsWith(prefix))), "ignore"];
}

export interface LlmMappingInput {
  entityKind: MigrationEntityKind;
  /** Колонки, не разобранные алгоритмическим слоем. */
  profiles: ColumnProfile[];
  /** Поля, уже занятые решениями правил: модель не должна их переназначать. */
  takenFields: Set<MigrationTargetField>;
}

export async function mapColumnsWithLlm(input: LlmMappingInput): Promise<LlmMappingResult> {
  const result: LlmMappingResult = {
    accepted: [],
    stillUnmapped: input.profiles.map((profile) => profile.name),
    calls: 0,
    rejected: 0,
    warnings: [],
    model: null
  };

  if (input.profiles.length === 0) return result;

  if (!isLlmAvailable()) {
    result.warnings.push(
      `Языковая модель не настроена: ${input.profiles.length} колонок(а) остались без сопоставления и будут сохранены в исходном виде без записи в поля. Настройте DENTAL_SPEECH_POLISH_* либо сопоставьте их вручную.`
    );
    return result;
  }

  const profiles = input.profiles.slice(0, MAX_COLUMNS_PER_REQUEST);
  if (profiles.length < input.profiles.length) {
    result.warnings.push(
      `Модели отправлены первые ${MAX_COLUMNS_PER_REQUEST} нераспознанных колонок из ${input.profiles.length}; остальные требуют ручного сопоставления.`
    );
  }

  const allowedFields = allowedFieldsFor(input.entityKind);
  const knownColumnNames = new Set(profiles.map((profile) => profile.name));
  const profileByName = new Map(profiles.map((profile) => [profile.name, profile]));

  const response = await requestLlmJson<LlmSuggestion[]>({
    system: buildSystemPrompt(input.entityKind, allowedFields),
    user: buildUserPrompt(profiles),
    temperature: 0,
    validate: (raw) => {
      if (typeof raw !== "object" || raw === null) {
        return { ok: false, reason: "Ответ не является объектом." };
      }
      const mappings = (raw as { mappings?: unknown }).mappings;
      if (!Array.isArray(mappings)) {
        return { ok: false, reason: "В ответе нет массива mappings." };
      }

      const suggestions: LlmSuggestion[] = [];
      for (const item of mappings) {
        if (typeof item !== "object" || item === null) continue;
        const entry = item as Record<string, unknown>;
        const sourceColumn = typeof entry.sourceColumn === "string" ? entry.sourceColumn : null;
        const targetFieldRaw = typeof entry.targetField === "string" ? entry.targetField : null;
        if (!sourceColumn || !targetFieldRaw) continue;

        // Ограничение 3: замкнутый список полей.
        const parsedField = migrationTargetFieldSchema.safeParse(targetFieldRaw);
        if (!parsedField.success) continue;
        // Ограничение: колонка обязана быть из запроса, а не выдуманной.
        if (!knownColumnNames.has(sourceColumn)) continue;

        const confidence = typeof entry.confidence === "number" ? Math.max(0, Math.min(1, entry.confidence)) : 0.5;
        const rationale = typeof entry.rationale === "string" ? entry.rationale.slice(0, 300) : "Предложено языковой моделью.";
        suggestions.push({ sourceColumn, targetField: parsedField.data, confidence, rationale });
      }

      if (suggestions.length === 0) {
        return { ok: false, reason: "Ни одно предложение не прошло проверку списка полей и имён колонок." };
      }
      return { ok: true, value: suggestions };
    }
  });

  result.calls = response.calls;
  result.rejected = response.rejected;
  result.model = response.model;
  result.warnings.push(...response.failures.map((failure) => `Языковая модель: ${failure}`));

  if (!response.value) {
    result.warnings.push(
      "Языковая модель не дала пригодного ответа. Нераспознанные колонки сохранены в исходном виде; данные не потеряны, но в поля не записаны."
    );
    return result;
  }

  // ------------------------------------------------------------------
  // Проверка предложений содержимым и разрешение конфликтов.
  // ------------------------------------------------------------------
  const taken = new Set(input.takenFields);
  const mapped = new Set<string>();

  // Сначала более уверенные: при конфликте поле достаётся лучшему предложению.
  const ordered = [...response.value].sort((left, right) => right.confidence - left.confidence);

  for (const suggestion of ordered) {
    if (suggestion.targetField === "ignore") continue;
    const profile = profileByName.get(suggestion.sourceColumn);
    if (!profile) continue;
    if (mapped.has(suggestion.sourceColumn)) continue;

    // Поле уже занято решением правила — оно надёжнее, модель отклоняется.
    if (taken.has(suggestion.targetField)) {
      result.rejected += 1;
      result.warnings.push(
        `Предложение модели «${suggestion.sourceColumn}» → «${suggestion.targetField}» отклонено: поле уже занято решением правила.`
      );
      continue;
    }

    // Ограничение 4: проверка содержимым.
    const check = FIELD_CHECK[suggestion.targetField];
    if (check && profile.nonEmptyCount > 0) {
      const rate = profile.parseRates[check];
      if (rate < LLM_VALIDATION_MIN_RATE) {
        result.rejected += 1;
        result.warnings.push(
          `Предложение модели «${suggestion.sourceColumn}» → «${suggestion.targetField}» отклонено проверкой данных: как ${
            CHECK_TITLES[check] ?? check
          } разбирается лишь ${Math.round(rate * 100)}% значений.`
        );
        continue;
      }
    }

    taken.add(suggestion.targetField);
    mapped.add(suggestion.sourceColumn);
    result.accepted.push({
      sourceColumn: suggestion.sourceColumn,
      targetField: suggestion.targetField,
      decidedBy: "llm",
      // Ограничение 5: потолок уверенности.
      confidence: Math.min(suggestion.confidence, LLM_CONFIDENCE_CEILING),
      rationale: `Языковая модель: ${suggestion.rationale}`,
      // В отчёт уходят маски, не значения.
      sampleValues: profile.valueShapes.slice(0, 3)
    });
  }

  result.stillUnmapped = profiles.filter((profile) => !mapped.has(profile.name)).map((profile) => profile.name);

  if (result.accepted.length > 0) {
    result.warnings.push(
      `Языковая модель сопоставила ${result.accepted.length} колонок(у) из ${profiles.length} нераспознанных; отклонено предложений: ${result.rejected}.`
    );
  }

  return result;
}
