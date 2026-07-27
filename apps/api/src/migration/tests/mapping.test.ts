import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { maskValueShape, profileTable } from "../columnProfile.js";
import { missingRequiredFields, resolveDeterministicMapping } from "../mapping.js";
import { canonicalColumnName, detectEntityKind, matchVendorProfile } from "../vendorProfiles.js";

function resolve(columns: string[], rows: string[][], options: Parameters<typeof resolveDeterministicMapping>[0] extends never ? never : Partial<Parameters<typeof resolveDeterministicMapping>[0]> = {}) {
  return resolveDeterministicMapping({
    columns,
    rows,
    profiles: profileTable(columns, rows),
    tableName: options.tableName ?? "источник",
    requestedEntityKind: options.requestedEntityKind,
    requestedVendorProfile: options.requestedVendorProfile,
    overrides: options.overrides
  });
}

function fieldFor(result: ReturnType<typeof resolve>, column: string): string | undefined {
  return result.columns.find((mapping) => mapping.sourceColumn === column)?.targetField;
}

describe("портрет колонки", () => {
  test("маска скрывает содержимое, сохраняя форму", () => {
    assert.equal(maskValueShape("Иванов Иван"), "Аааааа Аааа");
    assert.equal(maskValueShape("01.02.1980"), "99.99.9999");
    assert.equal(maskValueShape("+7 (900) 123-45-67"), "+9 (999) 999-99-99");
    assert.equal(maskValueShape("ivanov@example.com"), "aaaaaa@aaaaaaa.aaa");

    /**
     * Свойство, которое требуется от маски: из неё нельзя восстановить
     * значение. Цифра в маске всегда «9», буква всегда «а»/«А»/«a»/«A», поэтому
     * два разных телефона дают одну и ту же маску.
     */
    assert.equal(maskValueShape("89001234567"), maskValueShape("89991119999"));
    assert.equal(maskValueShape("Иванов"), maskValueShape("Петров"));
    // Ни одной настоящей цифры исходного значения в маске нет.
    assert.equal(maskValueShape("89001234567"), "99999999999");
  });

  test("доли разбора отражают настоящее содержимое колонки", () => {
    const profiles = profileTable(
      ["ФИО", "Телефон", "ДР", "Сумма"],
      [
        ["Иванов Иван Иванович", "89001234567", "01.01.1980", "1500"],
        ["Петрова Мария Сергеевна", "89161112233", "15.03.1992", "23400,50"],
        ["Сидоров Алексей Николаевич", "84957778899", "22.11.1975", "0"]
      ]
    );
    assert.ok(profiles[0]!.parseRates.personName > 0.9, "ФИО должно опознаваться как имена");
    assert.ok(profiles[1]!.parseRates.phone > 0.9, "телефоны должны разбираться");
    assert.ok(profiles[2]!.parseRates.date > 0.9, "даты должны разбираться");
    assert.ok(profiles[3]!.parseRates.money > 0.9, "суммы должны разбираться");
    // Колонка ФИО не должна выглядеть как телефон и наоборот.
    assert.ok(profiles[0]!.parseRates.phone < 0.2);
  });

  test("колонка целых уникальных чисел опознаётся как ключ", () => {
    const profiles = profileTable(["ID", "Значение"], [
      ["1", "10"],
      ["2", "10"],
      ["3", "10"],
      ["4", "10"],
      ["5", "10"]
    ]);
    assert.equal(profiles[0]!.looksLikePrimaryKey, true);
    // Повторяющееся значение — не ключ.
    assert.equal(profiles[1]!.looksLikePrimaryKey, false);
  });
});

describe("опознание системы-источника", () => {
  test("имена колонок сравниваются без регистра, пробелов и подчёркиваний", () => {
    assert.equal(canonicalColumnName("Дата_Рождения"), "датарождения");
    assert.equal(canonicalColumnName("  ДАТА РОЖДЕНИЯ  "), "датарождения");
    assert.equal(canonicalColumnName("@PatNum"), "patnum");
    // Ё приводится к Е: в выгрузках пишут и так и так.
    assert.equal(canonicalColumnName("Приём"), "прием");
  });

  test("Open Dental опознаётся по колонкам, а не по имени таблицы", () => {
    const match = matchVendorProfile(
      ["PatNum", "LName", "FName", "Birthdate", "HmPhone", "Email", "Gender"],
      "выгрузка_из_старой_системы.csv"
    );
    assert.equal(match.profile?.code, "opendental");
    assert.equal(match.entityKind, "patient");
    assert.ok(match.coverage > 0.9);
  });

  test("российская выгрузка не опознаётся как западная система", () => {
    const match = matchVendorProfile(["ФИО", "Телефон", "Дата рождения", "Комментарий"], "пациенты.csv");
    assert.notEqual(match.profile?.code, "opendental");
    assert.notEqual(match.profile?.code, "dentrix");
  });

  test("слабое совпадение не выдаётся за опознанную систему", () => {
    const match = matchVendorProfile(["F1", "F2", "F3", "F4", "F5", "PatNum"], "data.csv");
    assert.equal(match.profile, null);
    assert.ok(match.rationale.length > 0);
  });

  test("сущность определяется по ключевым колонкам, а не по общим", () => {
    // «Дата» есть у всех — решают жалобы и диагноз.
    assert.equal(detectEntityKind(["Дата", "Жалобы", "Диагноз", "Лечение"], "выгрузка").entityKind, "visit");
    assert.equal(detectEntityKind(["Дата", "Сумма", "Способ оплаты"], "выгрузка").entityKind, "payment");
    assert.equal(detectEntityKind(["ФИО", "Дата рождения", "Телефон"], "выгрузка").entityKind, "patient");
    assert.equal(detectEntityKind(["Услуга", "Цена", "Код услуги"], "выгрузка").entityKind, "service");
  });

  test("имя таблицы весит, но одной общей колонки для решения не хватает", () => {
    // «Сумма» бывает и у услуг; имя файла разрешает спор.
    assert.equal(detectEntityKind(["Наименование", "Сумма"], "оплаты_2019.xlsx").entityKind, "payment");
  });

  test("неопознаваемый набор колонок возвращает unknown с объяснением", () => {
    const detected = detectEntityKind(["A", "B", "C"], "data");
    assert.equal(detected.entityKind, "unknown");
    assert.ok(detected.rationale.includes("вручную"));
  });
});

describe("алгоритмическое сопоставление колонок", () => {
  const patientRows = [
    ["Иванов Иван Иванович", "89001234567", "01.01.1980", "Жалобы на боль"],
    ["Петрова Мария Сергеевна", "89161112233", "15.03.1992", "Плановый осмотр"],
    ["Сидоров Алексей Николаевич", "84957778899", "22.11.1975", "Повторный приём"]
  ];

  test("российские заголовки сопоставляются словарём", () => {
    const result = resolve(["ФИО", "Телефон", "Дата рождения", "Комментарий"], patientRows);
    assert.equal(result.entityKind, "patient");
    assert.equal(fieldFor(result, "ФИО"), "patient.fullName");
    assert.equal(fieldFor(result, "Телефон"), "patient.phone");
    assert.equal(fieldFor(result, "Дата рождения"), "patient.birthDate");
    assert.equal(fieldFor(result, "Комментарий"), "patient.notes");
    assert.equal(result.unmappedColumns.length, 0);
  });

  test("правило профиля системы важнее обобщённого словаря", () => {
    const result = resolve(
      ["PatNum", "LName", "FName", "Birthdate", "HmPhone", "WkPhone"],
      [
        ["1", "Ivanov", "Ivan", "1980-01-01", "89001234567", "84957778899"],
        ["2", "Petrova", "Maria", "1992-03-15", "89161112233", "84951112233"]
      ]
    );
    assert.equal(result.vendorProfile?.code, "opendental");
    assert.equal(fieldFor(result, "PatNum"), "patient.externalId");
    assert.equal(fieldFor(result, "LName"), "patient.lastName");
    assert.equal(fieldFor(result, "HmPhone"), "patient.phone");
    // Рабочий телефон не должен перетереть домашний.
    assert.equal(fieldFor(result, "WkPhone"), "patient.secondaryPhone");
    assert.equal(
      result.columns.find((mapping) => mapping.sourceColumn === "PatNum")?.decidedBy,
      "vendor_profile"
    );
  });

  test("КОЛОНКА С ОБМАНЧИВЫМ ИМЕНЕМ отклоняется содержимым", () => {
    /**
     * Ключевая проверка модуля. Колонка называется «Дата рождения», но внутри
     * лежат фамилии. Доверие имени записало бы фамилии в birth_date.
     */
    const result = resolve(
      ["ФИО", "Дата рождения"],
      [
        ["Иванов Иван Иванович", "Иванов"],
        ["Петрова Мария Сергеевна", "Петрова"],
        ["Сидоров Алексей Николаевич", "Сидоров"]
      ]
    );
    assert.notEqual(fieldFor(result, "Дата рождения"), "patient.birthDate");
    assert.ok(
      result.warnings.some((warning) => warning.includes("Дата рождения") && warning.includes("отклонено")),
      `ожидалось предупреждение об отклонении, получено: ${result.warnings.join(" | ")}`
    );
  });

  test("колонка с бессмысленным именем опознаётся по содержимому", () => {
    const result = resolve(
      ["F1", "F2", "F3"],
      [
        ["Иванов Иван Иванович", "89001234567", "ivanov@example.com"],
        ["Петрова Мария Сергеевна", "89161112233", "petrova@example.com"],
        ["Сидоров Алексей Николаевич", "89031234567", "sidorov@example.com"]
      ],
      { requestedEntityKind: "patient" }
    );
    assert.equal(fieldFor(result, "F1"), "patient.fullName");
    assert.equal(fieldFor(result, "F2"), "patient.phone");
    assert.equal(fieldFor(result, "F3"), "patient.email");
    for (const mapping of result.columns) {
      assert.equal(mapping.decidedBy, "inferred");
    }
  });

  test("раздельные фамилия, имя и отчество сопоставляются по отдельности", () => {
    const result = resolve(
      ["Фамилия", "Имя", "Отчество", "Телефон"],
      [
        ["Иванов", "Иван", "Иванович", "89001234567"],
        ["Петрова", "Мария", "Сергеевна", "89161112233"]
      ]
    );
    assert.equal(fieldFor(result, "Фамилия"), "patient.lastName");
    assert.equal(fieldFor(result, "Имя"), "patient.firstName");
    assert.equal(fieldFor(result, "Отчество"), "patient.middleName");
  });

  test("две колонки на одно поле: выигрывает более полная, вторая не теряется", () => {
    const result = resolve(
      ["Телефон", "Мобильный телефон"],
      [
        ["89001234567", "89161112233"],
        ["84957778899", "89031234567"],
        ["89052223344", "89091112233"]
      ],
      { requestedEntityKind: "patient" }
    );
    const targets = result.columns.map((mapping) => mapping.targetField);
    // Одна попадает в основной телефон, другая — в дополнительный.
    assert.ok(targets.includes("patient.phone"));
    assert.ok(targets.includes("patient.secondaryPhone"));
  });

  test("ручная поправка оператора имеет приоритет и не оспаривается данными", () => {
    const result = resolve(
      ["ФИО", "Прочее"],
      [
        ["Иванов Иван Иванович", "что-то невнятное"],
        ["Петрова Мария Сергеевна", "и ещё"]
      ],
      { overrides: [{ sourceColumn: "Прочее", targetField: "patient.notes" }] }
    );
    assert.equal(fieldFor(result, "Прочее"), "patient.notes");
    assert.equal(
      result.columns.find((mapping) => mapping.sourceColumn === "Прочее")?.decidedBy,
      "manual"
    );
  });

  test("нераспознанные непустые колонки предлагаются модели, пустые — нет", () => {
    const result = resolve(
      ["ФИО", "Kod_L", "Пустая"],
      [
        ["Иванов Иван Иванович", "АБВ-12", ""],
        ["Петрова Мария Сергеевна", "ГДЕ-34", ""]
      ],
      { requestedEntityKind: "patient" }
    );
    const names = result.candidatesForLlm.map((profile) => profile.name);
    assert.ok(names.includes("Kod_L"), "непустая нераспознанная колонка должна уйти модели");
    assert.ok(!names.includes("Пустая"), "пустую колонку модели показывать незачем");
    // Обе остаются в списке несопоставленных: их содержимое сохранится в raw_json.
    assert.ok(result.unmappedColumns.includes("Пустая"));
  });

  test("в карту соответствия попадают маски, а не значения пациентов", () => {
    /**
     * Карта соответствия уезжает в отчёты, в интерфейс и в журнал прогона.
     * Персональных данных в ней быть не должно: проверяем, что ни одно
     * настоящее значение из выгрузки в примерах не встречается.
     */
    const result = resolve(["ФИО", "Телефон", "Дата рождения"], patientRows);
    const realValues = patientRows.flat();
    assert.ok(result.columns.length >= 3);

    for (const mapping of result.columns) {
      assert.ok(mapping.sampleValues.length > 0, `у «${mapping.sourceColumn}» нет примеров формы`);
      for (const sample of mapping.sampleValues) {
        for (const real of realValues) {
          assert.notEqual(sample, real, `в примерах «${mapping.sourceColumn}» осталось настоящее значение`);
        }
        // Ни фрагментов ФИО, ни настоящих цифр телефона.
        assert.ok(!/[бвгдежзийклмнопрстуфхцчшщъыьэюя]/.test(sample.replace(/а/g, "")),
          `в примере «${sample}» осталась настоящая буква`);
        assert.ok(!/[0-8]/.test(sample), `в примере «${sample}» осталась настоящая цифра`);
      }
    }
  });

  test("платежи и приёмы сопоставляются своими полями", () => {
    const payments = resolve(
      ["Пациент", "Сумма", "Дата оплаты", "Способ оплаты"],
      [
        ["Иванов Иван Иванович", "1500", "01.02.2020", "карта"],
        ["Петрова Мария Сергеевна", "23400,50", "15.03.2020", "наличные"]
      ]
    );
    assert.equal(payments.entityKind, "payment");
    assert.equal(fieldFor(payments, "Сумма"), "payment.amountRub");
    assert.equal(fieldFor(payments, "Дата оплаты"), "payment.paidAt");
    assert.equal(fieldFor(payments, "Пациент"), "payment.patientRef");

    const visits = resolve(
      ["Пациент", "Дата", "Жалобы", "Диагноз", "План лечения"],
      [
        ["Иванов Иван Иванович", "01.02.2020", "боль", "K04.0", "лечение канала"],
        ["Петрова Мария Сергеевна", "15.03.2020", "осмотр", "K02.1", "пломба"]
      ]
    );
    assert.equal(visits.entityKind, "visit");
    assert.equal(fieldFor(visits, "Жалобы"), "visit.complaint");
    assert.equal(fieldFor(visits, "Диагноз"), "visit.diagnosis");
  });
});

describe("обязательные поля", () => {
  test("ФИО можно собрать либо целиком, либо из частей", () => {
    assert.deepEqual(missingRequiredFields("patient", ["patient.fullName"]), []);
    assert.deepEqual(missingRequiredFields("patient", ["patient.lastName", "patient.firstName"]), []);
    // Одной фамилии недостаточно.
    assert.deepEqual(missingRequiredFields("patient", ["patient.lastName"]), ["patient.fullName"]);
  });

  test("платёж без суммы или без пациента загружать нельзя", () => {
    assert.deepEqual(missingRequiredFields("payment", ["payment.patientRef"]), ["payment.amountRub"]);
    assert.deepEqual(missingRequiredFields("payment", ["payment.patientRef", "payment.amountRub"]), []);
  });

  test("запись в расписании требует пациента и времени начала", () => {
    assert.deepEqual(missingRequiredFields("appointment", ["appointment.patientRef"]), ["appointment.startsAt"]);
  });
});
