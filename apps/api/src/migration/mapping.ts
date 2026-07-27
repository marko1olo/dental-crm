import type {
  MigrationColumnMapping,
  MigrationDecisionSource,
  MigrationEntityKind,
  MigrationTargetField
} from "@dental/shared";
import type { ColumnProfile } from "./columnProfile.js";
import { maskValueShape } from "./columnProfile.js";
import {
  canonicalColumnName,
  detectEntityKind,
  matchVendorProfile,
  rulesForEntity,
  type VendorProfile
} from "./vendorProfiles.js";

/**
 * Сопоставление колонок источника полям нашей модели — алгоритмический слой.
 *
 * Работает в три приёма, в порядке убывания надёжности:
 *
 *   1. Имя колонки совпало с правилом профиля или обобщённым словарём.
 *   2. Имя ничего не дало, но содержимое однозначно: колонка, где 97% значений
 *      разбираются как мобильный номер, — телефон, как бы она ни называлась
 *      («F3», «Поле2», «DR»).
 *   3. Решение проверяется данными. Это ключевой шаг: колонка «Дата рождения»,
 *      в которой 4% значений похожи на дату, — не дата рождения, и доверять
 *      имени вопреки содержимому нельзя.
 *
 * Только то, что не разобралось здесь, уходит в языковую модель.
 */

/** Какому нормализатору должно подчиняться значение целевого поля. */
const FIELD_VALUE_KIND: Record<MigrationTargetField, keyof ColumnProfile["parseRates"] | "text" | "any"> = {
  "patient.externalId": "any",
  "patient.fullName": "personName",
  "patient.lastName": "text",
  "patient.firstName": "text",
  "patient.middleName": "text",
  "patient.birthDate": "date",
  "patient.phone": "phone",
  "patient.secondaryPhone": "phone",
  "patient.email": "email",
  "patient.gender": "gender",
  "patient.address": "text",
  "patient.notes": "text",
  "patient.status": "text",
  "patient.createdAt": "date",
  "doctor.externalId": "any",
  "doctor.fullName": "personName",
  "doctor.specialty": "text",
  "doctor.phone": "phone",
  "doctor.email": "email",
  "service.externalId": "any",
  "service.code": "any",
  "service.name": "text",
  "service.priceRub": "money",
  "appointment.externalId": "any",
  "appointment.patientRef": "any",
  "appointment.doctorRef": "any",
  "appointment.startsAt": "date",
  "appointment.endsAt": "date",
  "appointment.durationMinutes": "integer",
  "appointment.status": "text",
  "appointment.reason": "text",
  "appointment.comment": "text",
  "visit.externalId": "any",
  "visit.patientRef": "any",
  "visit.appointmentRef": "any",
  "visit.date": "date",
  "visit.complaint": "text",
  "visit.anamnesis": "text",
  "visit.objectiveStatus": "text",
  "visit.diagnosis": "text",
  "visit.treatmentPlan": "text",
  "visit.doctorSummary": "text",
  "payment.externalId": "any",
  "payment.patientRef": "any",
  "payment.visitRef": "any",
  "payment.amountRub": "money",
  "payment.method": "text",
  "payment.status": "text",
  "payment.paidAt": "date",
  "payment.note": "text",
  "toothState.patientRef": "any",
  "toothState.toothCode": "toothCode",
  "toothState.condition": "text",
  "toothState.note": "text",
  ignore: "any"
};

/**
 * Доля успешного разбора, ниже которой сопоставление считается опровергнутым
 * данными. Не 1.0 и не 0.9: в настоящей базе клиники телефон отсутствует у
 * части пациентов, а дата рождения бывает записана словами. Порог 0.6 отсекает
 * явно неверное сопоставление, не воюя с реальной неполнотой данных.
 */
const VALUE_KIND_MIN_RATE = 0.6;

/**
 * Порог для решения по содержимому, когда имя колонки не помогло. Здесь строже:
 * назначить полю смысл на основании одного содержимого можно только при
 * почти полном совпадении.
 */
const INFERENCE_MIN_RATE = 0.85;

export interface ResolvedMapping {
  entityKind: MigrationEntityKind;
  vendorProfile: VendorProfile | null;
  vendorRationale: string;
  columns: MigrationColumnMapping[];
  unmappedColumns: string[];
  warnings: string[];
  /** Колонки, по которым решение не принято и которые стоит отдать модели. */
  candidatesForLlm: ColumnProfile[];
}

interface Candidate {
  targetField: MigrationTargetField;
  decidedBy: MigrationDecisionSource;
  confidence: number;
  rationale: string;
}

/** Проверяет сопоставление содержимым колонки. */
function validateAgainstData(
  targetField: MigrationTargetField,
  profile: ColumnProfile
): { supported: boolean; rate: number; kind: string } {
  const kind = FIELD_VALUE_KIND[targetField];
  if (kind === "any" || kind === "text") {
    // Текст и идентификаторы проверить нечем: подойдёт любая строка.
    return { supported: true, rate: 1, kind };
  }
  // Пустая колонка не опровергает сопоставление — она просто пуста.
  if (profile.nonEmptyCount === 0) return { supported: true, rate: 1, kind };
  const rate = profile.parseRates[kind];
  return { supported: rate >= VALUE_KIND_MIN_RATE, rate, kind };
}

const VALUE_KIND_TITLES: Record<string, string> = {
  date: "дата",
  phone: "телефон",
  money: "сумма",
  email: "почта",
  personName: "ФИО",
  gender: "пол",
  toothCode: "номер зуба",
  integer: "целое число"
};

/** Сопоставление по имени колонки через правила профиля и обобщённый словарь. */
function candidateFromColumnName(
  profile: ColumnProfile,
  entityKind: MigrationEntityKind,
  vendorProfile: VendorProfile | null
): Candidate | null {
  const canonical = canonicalColumnName(profile.name);
  if (!canonical) return null;

  const rules = rulesForEntity(entityKind, vendorProfile);
  const fromVendorCount = vendorProfile?.rules[entityKind]?.length ?? 0;

  // Точное совпадение имени.
  for (const [ruleIndex, rule] of rules.entries()) {
    for (const column of rule.columns) {
      if (canonicalColumnName(column) === canonical) {
        const isVendorRule = ruleIndex < fromVendorCount;
        return {
          targetField: rule.targetField,
          decidedBy: isVendorRule ? "vendor_profile" : "deterministic",
          confidence: isVendorRule ? 0.99 : 0.96,
          rationale: isVendorRule
            ? `Колонка «${profile.name}» известна профилю «${vendorProfile?.title}».`
            : `Имя колонки «${profile.name}» совпало со словарём заголовков.`
        };
      }
    }
  }

  /**
   * Совпадение по вхождению: «телефонмобильный» содержит «телефон». Требуется
   * длина не меньше четырёх символов, иначе «id» находится в «идентификатор»,
   * «видоплаты» и половине русских слов.
   */
  let best: { rule: (typeof rules)[number]; length: number; isVendor: boolean } | null = null;
  for (const [ruleIndex, rule] of rules.entries()) {
    for (const column of rule.columns) {
      const candidate = canonicalColumnName(column);
      if (candidate.length < 4) continue;
      if (!canonical.includes(candidate)) continue;
      if (!best || candidate.length > best.length) {
        best = { rule, length: candidate.length, isVendor: ruleIndex < fromVendorCount };
      }
    }
  }

  if (best) {
    return {
      targetField: best.rule.targetField,
      decidedBy: best.isVendor ? "vendor_profile" : "deterministic",
      // Частичное совпадение слабее точного: имя могло значить другое.
      confidence: 0.85,
      rationale: `Имя колонки «${profile.name}» содержит известный признак поля.`
    };
  }

  return null;
}

/** Решение по содержимому, когда имя колонки ничего не дало. */
function candidateFromContent(profile: ColumnProfile, entityKind: MigrationEntityKind): Candidate | null {
  const rates = profile.parseRates;

  // Почта, телефон и пол опознаются по содержимому надёжнее всего.
  if (rates.email >= INFERENCE_MIN_RATE) {
    return {
      targetField: entityKind === "doctor" ? "doctor.email" : "patient.email",
      decidedBy: "inferred",
      confidence: 0.9,
      rationale: `${Math.round(rates.email * 100)}% значений колонки «${profile.name}» — адреса электронной почты.`
    };
  }
  if (rates.phone >= INFERENCE_MIN_RATE) {
    return {
      targetField: entityKind === "doctor" ? "doctor.phone" : "patient.phone",
      decidedBy: "inferred",
      confidence: 0.88,
      rationale: `${Math.round(rates.phone * 100)}% значений колонки «${profile.name}» — телефонные номера.`
    };
  }
  if (rates.gender >= INFERENCE_MIN_RATE && profile.distinctCount <= 4) {
    return {
      targetField: "patient.gender",
      decidedBy: "inferred",
      confidence: 0.85,
      rationale: `Колонка «${profile.name}» содержит ${profile.distinctCount} различных значений, все — обозначения пола.`
    };
  }
  if (rates.personName >= INFERENCE_MIN_RATE) {
    return {
      targetField: entityKind === "doctor" ? "doctor.fullName" : "patient.fullName",
      decidedBy: "inferred",
      confidence: 0.82,
      rationale: `${Math.round(rates.personName * 100)}% значений колонки «${profile.name}» выглядят как ФИО из двух-трёх слов.`
    };
  }

  /**
   * Дата по содержимому — только для сущностей, где дата одна. У приёма их
   * несколько (дата приёма, дата создания), и выбор между ними по содержимому
   * невозможен: это работа для модели или для оператора.
   */
  if (rates.date >= INFERENCE_MIN_RATE) {
    if (entityKind === "patient") {
      /**
       * У пациента две даты: рождения и создания карточки. Различаем по
       * содержимому: дата рождения не бывает в последние годы у взрослого
       * пациента, а дата создания карточки не бывает в 1950-х.
       */
      return {
        targetField: "patient.birthDate",
        decidedBy: "inferred",
        confidence: 0.7,
        rationale: `${Math.round(rates.date * 100)}% значений колонки «${profile.name}» — даты; для пациента принята дата рождения.`
      };
    }
    if (entityKind === "visit") {
      return {
        targetField: "visit.date",
        decidedBy: "inferred",
        confidence: 0.72,
        rationale: `${Math.round(rates.date * 100)}% значений колонки «${profile.name}» — даты.`
      };
    }
    if (entityKind === "payment") {
      return {
        targetField: "payment.paidAt",
        decidedBy: "inferred",
        confidence: 0.72,
        rationale: `${Math.round(rates.date * 100)}% значений колонки «${profile.name}» — даты.`
      };
    }
  }

  /**
   * Первичный ключ по содержимому. Только если имя колонки не занято ничем
   * другим: числовая колонка бывает и суммой, и номером зуба.
   */
  if (profile.looksLikePrimaryKey && profile.index === 0) {
    const field: MigrationTargetField =
      entityKind === "patient" ? "patient.externalId"
      : entityKind === "doctor" ? "doctor.externalId"
      : entityKind === "service" ? "service.externalId"
      : entityKind === "appointment" ? "appointment.externalId"
      : entityKind === "visit" ? "visit.externalId"
      : entityKind === "payment" ? "payment.externalId"
      : "ignore";
    if (field !== "ignore") {
      return {
        targetField: field,
        decidedBy: "inferred",
        confidence: 0.75,
        rationale: `Первая колонка «${profile.name}» содержит уникальные целые числа — принята за идентификатор записи в старой системе.`
      };
    }
  }

  return null;
}

/**
 * Поля, для которых существует «второй экземпляр»: если на одно поле метят две
 * колонки, вторая уходит сюда, а не выбрасывается. Телефонов у пациента обычно
 * два, и терять второй незачем.
 */
const OVERFLOW_FIELDS: Partial<Record<MigrationTargetField, MigrationTargetField>> = {
  "patient.phone": "patient.secondaryPhone",
  "patient.notes": "patient.notes"
};

/** Поля, куда допустимо писать из нескольких колонок (склейка через перевод строки). */
const MULTI_SOURCE_FIELDS = new Set<MigrationTargetField>([
  "patient.notes",
  "patient.address",
  "appointment.comment",
  "visit.complaint",
  "visit.anamnesis",
  "visit.objectiveStatus",
  "visit.diagnosis",
  "visit.treatmentPlan",
  "visit.doctorSummary",
  "payment.note",
  "toothState.note"
]);

export interface ResolveMappingInput {
  columns: string[];
  rows: string[][];
  profiles: ColumnProfile[];
  tableName: string;
  /** Сущность, заданная оператором. Отменяет определение по содержимому. */
  requestedEntityKind?: MigrationEntityKind | undefined;
  /** Код системы, заданный оператором. */
  requestedVendorProfile?: string | undefined;
  /** Ручные поправки оператора — высший приоритет, проверке данными не подлежат. */
  overrides?: Array<{ sourceColumn: string; targetField: MigrationTargetField }> | undefined;
}

export function resolveDeterministicMapping(input: ResolveMappingInput): ResolvedMapping {
  const warnings: string[] = [];

  const vendorMatch = matchVendorProfile(input.columns, input.tableName, input.requestedVendorProfile);
  const detected = input.requestedEntityKind
    ? { entityKind: input.requestedEntityKind, rationale: "Сущность указана оператором." }
    : vendorMatch.profile && vendorMatch.entityKind !== "unknown"
      ? { entityKind: vendorMatch.entityKind, rationale: vendorMatch.rationale }
      : detectEntityKind(input.columns, input.tableName);

  const entityKind = detected.entityKind;
  if (entityKind === "unknown") {
    warnings.push(detected.rationale);
  }

  const overrideByColumn = new Map(
    (input.overrides ?? []).map((override) => [canonicalColumnName(override.sourceColumn), override.targetField])
  );

  // ------------------------------------------------------------------
  // Шаг 1: кандидат для каждой колонки.
  // ------------------------------------------------------------------
  interface Slot {
    profile: ColumnProfile;
    candidate: Candidate | null;
    validation: { supported: boolean; rate: number; kind: string };
  }

  const slots: Slot[] = input.profiles.map((profile) => {
    const override = overrideByColumn.get(canonicalColumnName(profile.name));
    if (override) {
      return {
        profile,
        candidate: {
          targetField: override,
          decidedBy: "manual" as MigrationDecisionSource,
          confidence: 1,
          rationale: `Соответствие задано оператором вручную.`
        },
        // Ручное решение оператора не оспаривается содержимым: он видел данные.
        validation: { supported: true, rate: 1, kind: "manual" }
      };
    }

    let candidate = candidateFromColumnName(profile, entityKind, vendorMatch.profile);
    let validation = candidate
      ? validateAgainstData(candidate.targetField, profile)
      : { supported: true, rate: 1, kind: "none" };

    /**
     * Имя обещало одно, содержимое показывает другое. Доверяем содержимому:
     * колонка «Дата рождения», где даты разбираются в 4% строк, — это не даты,
     * и запись их в birth_date создала бы карточки с мусором.
     */
    if (candidate && !validation.supported) {
      warnings.push(
        `Колонка «${profile.name}» по имени похожа на «${candidate.targetField}», но только ${Math.round(
          validation.rate * 100
        )}% её значений разбираются как ${VALUE_KIND_TITLES[validation.kind] ?? validation.kind}. Сопоставление по имени отклонено.`
      );
      candidate = null;
      validation = { supported: true, rate: 1, kind: "none" };
    }

    if (!candidate) {
      candidate = candidateFromContent(profile, entityKind);
      if (candidate) validation = validateAgainstData(candidate.targetField, profile);
    }

    return { profile, candidate, validation };
  });

  // ------------------------------------------------------------------
  // Шаг 2: конфликты. Две колонки на одно поле — выбираем лучшую.
  // ------------------------------------------------------------------
  const byField = new Map<MigrationTargetField, Slot[]>();
  for (const slot of slots) {
    if (!slot.candidate) continue;
    const group = byField.get(slot.candidate.targetField) ?? [];
    group.push(slot);
    byField.set(slot.candidate.targetField, group);
  }

  for (const [field, group] of byField) {
    if (group.length < 2 || MULTI_SOURCE_FIELDS.has(field)) continue;

    /**
     * Победитель — тот, чьё содержимое лучше отвечает полю, а при равенстве
     * тот, у кого выше уверенность и больше заполненность. Заполненность важна:
     * из двух колонок «Телефон» и «Телефон2» настоящий телефон обычно в первой.
     */
    const ranked = [...group].sort((left, right) => {
      const byRate = right.validation.rate - left.validation.rate;
      if (Math.abs(byRate) > 0.05) return byRate;
      const byConfidence = (right.candidate?.confidence ?? 0) - (left.candidate?.confidence ?? 0);
      if (Math.abs(byConfidence) > 0.01) return byConfidence;
      return right.profile.nonEmptyCount - left.profile.nonEmptyCount;
    });

    const losers = ranked.slice(1);
    const overflow = OVERFLOW_FIELDS[field];

    for (const [index, loser] of losers.entries()) {
      if (overflow && overflow !== field && index === 0 && !byField.has(overflow)) {
        // Второй телефон — это данные, а не мусор.
        loser.candidate = {
          targetField: overflow,
          decidedBy: loser.candidate!.decidedBy,
          confidence: Math.min(loser.candidate!.confidence, 0.8),
          rationale: `Колонка «${loser.profile.name}» метила в то же поле, что «${ranked[0]!.profile.name}»; принята как дополнительное значение.`
        };
        loser.validation = validateAgainstData(overflow, loser.profile);
        continue;
      }
      warnings.push(
        `Колонки «${ranked[0]!.profile.name}» и «${loser.profile.name}» обе похожи на поле «${field}». Выбрана «${
          ranked[0]!.profile.name
        }»; вторая оставлена без сопоставления, её содержимое сохранено в исходном виде.`
      );
      loser.candidate = null;
    }
  }

  // ------------------------------------------------------------------
  // Шаг 3: результат.
  // ------------------------------------------------------------------
  const columns: MigrationColumnMapping[] = [];
  const unmappedColumns: string[] = [];
  const candidatesForLlm: ColumnProfile[] = [];

  for (const slot of slots) {
    if (!slot.candidate) {
      unmappedColumns.push(slot.profile.name);
      // Пустую колонку модели показывать незачем — в ней нет данных.
      if (slot.profile.nonEmptyCount > 0) candidatesForLlm.push(slot.profile);
      continue;
    }
    columns.push({
      sourceColumn: slot.profile.name,
      targetField: slot.candidate.targetField,
      decidedBy: slot.candidate.decidedBy,
      confidence: slot.candidate.confidence,
      rationale: slot.candidate.rationale,
      // В карту соответствия попадают МАСКИ, а не значения: карта уезжает
      // в отчёты и в интерфейс, и персональных данных в ней быть не должно.
      sampleValues: slot.profile.valueShapes.slice(0, 3)
    });
  }

  return {
    entityKind,
    vendorProfile: vendorMatch.profile,
    vendorRationale: vendorMatch.profile ? vendorMatch.rationale : detected.rationale,
    columns,
    unmappedColumns,
    warnings,
    candidatesForLlm
  };
}

/** Целевые поля, обязательные для загрузки сущности. */
export const REQUIRED_FIELDS: Partial<Record<MigrationEntityKind, MigrationTargetField[]>> = {
  patient: ["patient.fullName"],
  doctor: ["doctor.fullName"],
  service: ["service.name"],
  appointment: ["appointment.patientRef", "appointment.startsAt"],
  visit: ["visit.patientRef"],
  payment: ["payment.patientRef", "payment.amountRub"],
  tooth_state: ["toothState.patientRef", "toothState.toothCode"]
};

/**
 * Проверяет, хватает ли карты соответствия для загрузки.
 *
 * ФИО собирается либо из одной колонки, либо из фамилии, имени и отчества —
 * оба варианта считаются выполнением требования.
 */
export function missingRequiredFields(
  entityKind: MigrationEntityKind,
  mapped: MigrationTargetField[]
): MigrationTargetField[] {
  const present = new Set(mapped);
  const required = REQUIRED_FIELDS[entityKind] ?? [];

  return required.filter((field) => {
    if (present.has(field)) return false;
    if (field === "patient.fullName") {
      return !(present.has("patient.lastName") && present.has("patient.firstName"));
    }
    if (field === "doctor.fullName") {
      return !(present.has("doctor.fullName") || present.has("doctor.externalId"));
    }
    return true;
  });
}

/** Маска значения для отчётов — реэкспорт, чтобы вызывающему не тянуть профиль. */
export { maskValueShape };
