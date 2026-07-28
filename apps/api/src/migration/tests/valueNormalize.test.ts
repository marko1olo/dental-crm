import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  combineNameParts,
  dateOnlyPart,
  detectDateOrder,
  fixNameCase,
  formatNormalizedDateTime,
  isNullToken,
  normalizeBooleanValue,
  normalizeDateTimeValue,
  normalizeDateValue,
  normalizeEmailValue,
  normalizeEnumValue,
  normalizeGenderValue,
  normalizeMoneyRubles,
  normalizeMoneyValue,
  normalizeNameValue,
  normalizePhoneValue,
  normalizeText,
  normalizeToothCode,
  storedDateTimeToUtc
} from "../valueNormalize.js";

describe("признак пустого значения", () => {
  test("обозначения пустоты из чужих систем не попадают в базу как текст", () => {
    for (const token of ["", "-", "—", "н/д", "не указан", "не помнит", "NULL", "00.00.0000", "01.01.1900"]) {
      assert.equal(isNullToken(token), true, `«${token}» должно считаться пустым`);
    }
  });

  test("значения ошибок Excel не переносятся как текст", () => {
    // Русская и английская локали Excel пишут ошибки формул по-разному.
    for (const token of ["#Н/Д", "#ЗНАЧ!", "#ДЕЛ/0!", "#ССЫЛКА!", "#N/A", "#VALUE!", "#REF!"]) {
      assert.equal(isNullToken(token), true, `«${token}» должно считаться пустым`);
      // Для денежных полей тоже: «#ЗНАЧ!» — это не сумма.
      assert.equal(isNullToken(token, false), true, `«${token}» должно считаться пустым и для денег`);
    }
  });

  test("ноль пустой для ссылок, но значимый для денег", () => {
    assert.equal(isNullToken("0"), true);
    // Для денежных полей ноль — это настоящая сумма, а не отсутствие данных.
    assert.equal(isNullToken("0", false), false);
  });

  test("настоящее значение пустым не считается", () => {
    assert.equal(isNullToken("Иванов"), false);
    assert.equal(isNullToken("89001234567"), false);
  });
});

describe("даты", () => {
  test("порядок компонентов определяется по всей колонке, а не по одному значению", () => {
    // «Свидетель» dmy: первое число больше 12.
    const ru = detectDateOrder(["01.02.2020", "17.03.1985", "28.12.1999"]);
    assert.equal(ru.order, "dmy");
    // «Свидетель» mdy: второе число больше 12.
    const us = detectDateOrder(["01/02/2020", "03/17/1985", "12/28/1999"]);
    assert.equal(us.order, "mdy");
    // Год впереди.
    assert.equal(detectDateOrder(["2020-02-01", "1985-03-17"]).order, "ymd");
  });

  test("одно и то же значение разбирается по-разному в зависимости от колонки", () => {
    const ru = detectDateOrder(["01.02.2020", "17.03.1985"]);
    const us = detectDateOrder(["01/02/2020", "03/17/1985"]);
    // Именно ради этого подсказка считается по колонке: значение неоднозначно.
    assert.equal(normalizeDateValue("03.04.2020", ru).value, "2020-04-03");
    assert.equal(normalizeDateValue("03/04/2020", us).value, "2020-03-04");
  });

  test("колонка со смешанным порядком помечается, а значения не выдумываются", () => {
    const mixed = detectDateOrder(["17.03.1985", "03/17/1985"]);
    assert.equal(mixed.order, "unknown");
    // Разбор продолжается, но уверенность падает — строка попадёт под проверку.
    const parsed = normalizeDateValue("05.06.1990", mixed);
    assert.equal(parsed.value, "1990-06-05");
    assert.ok(parsed.confidence < 0.7, `уверенность должна быть низкой, получено ${parsed.confidence}`);
  });

  test("форматы старых систем читаются без настройки", () => {
    const hint = detectDateOrder(["01.02.2020"]);
    // DBF и многие выгрузки: сплошные восемь цифр.
    assert.equal(normalizeDateValue("19850317", hint).value, "1985-03-17");
    // Excel: число дней от 30.12.1899.
    assert.equal(normalizeDateValue("33678", hint).value, "1992-03-15");
    // Время отрезается, дата остаётся.
    assert.equal(normalizeDateValue("12.03.2019 14:30:00", hint).value, "2019-03-12");
    assert.equal(normalizeDateValue("2019-03-12T14:30:00Z", hint).value, "2019-03-12");
    // Unix-время в секундах.
    assert.equal(normalizeDateValue("1552348800", hint).value, "2019-03-12");
  });

  test("двузначный год разворачивается в прошлое, а не в будущее", () => {
    const hint = detectDateOrder(["01.02.2020"]);
    // Пациент 1965 года, а не нерождённый 2065-го.
    assert.equal(normalizeDateValue("30.12.65", hint).value, "1965-12-30");
    assert.equal(normalizeDateValue("01.01.05", hint).value, "2005-01-01");
  });

  test("несуществующая дата уходит в отказ, а не записывается как есть", () => {
    const hint = detectDateOrder(["01.02.2020"]);
    const feb31 = normalizeDateValue("31.02.2019", hint);
    assert.equal(feb31.value, null);
    assert.ok(feb31.issue?.includes("не существует"));

    // Год за пределами человеческого срока жизни.
    assert.equal(normalizeDateValue("01.01.1780", hint).value, null);
    assert.equal(normalizeDateValue("01.01.2400", hint).value, null);
  });

  test("нераспознанный текст НЕ протекает в поле даты", () => {
    const hint = detectDateOrder(["01.02.2020"]);
    const parsed = normalizeDateValue("примерно в мае", hint);
    // Это главное отличие от shared/utils/dates.ts, который вернул бы саму строку.
    assert.equal(parsed.value, null);
    assert.ok(parsed.issue !== null);
  });

  test("пустое значение — это пустота, а не ошибка", () => {
    const hint = detectDateOrder(["01.02.2020"]);
    const parsed = normalizeDateValue("00.00.0000", hint);
    assert.equal(parsed.value, null);
    assert.equal(parsed.issue, null);
  });
});

describe("дата со временем", () => {
  const hint = detectDateOrder(["12.03.2019 14:30", "17.03.2019 09:15"]);

  test("время суток сохраняется, а не отбрасывается", () => {
    /**
     * Именно этот случай раньше терялся: normalizeDateValue отрезает время
     * (и правильно делает для даты рождения), а загрузчик расписания ставил всем
     * приёмам девять утра. Перенос выглядел успешным и был бесполезен.
     */
    const parsed = normalizeDateTimeValue("12.03.2019 14:30", hint);
    assert.equal(parsed.value?.date, "2019-03-12");
    assert.equal(parsed.value?.timeMinutes, 14 * 60 + 30);
    assert.equal(parsed.value?.absolute, false);
    assert.equal(formatNormalizedDateTime(parsed.value!), "2019-03-12T14:30:00");
  });

  test("секунды сохраняются, если были в источнике", () => {
    const parsed = normalizeDateTimeValue("12.03.2019 14:30:45", hint);
    assert.equal(parsed.value?.seconds, 45);
    assert.equal(formatNormalizedDateTime(parsed.value!), "2019-03-12T14:30:45");
  });

  test("явный часовой пояс делает значение абсолютным", () => {
    const parsed = normalizeDateTimeValue("2019-03-12T14:30:00Z", hint);
    assert.equal(parsed.value?.absolute, true);
    assert.equal(formatNormalizedDateTime(parsed.value!), "2019-03-12T14:30:00Z");
  });

  test("отсутствие времени отличается от полуночи", () => {
    const parsed = normalizeDateTimeValue("12.03.2019", hint);
    assert.equal(parsed.value?.timeMinutes, null);
    // Без времени формат остаётся датой — загрузчик подставит осмысленное время.
    assert.equal(formatNormalizedDateTime(parsed.value!), "2019-03-12");
  });

  test("нераспознанная дата остаётся нераспознанной и со временем", () => {
    assert.equal(normalizeDateTimeValue("31.02.2019 14:30", hint).value, null);
    assert.equal(normalizeDateTimeValue("когда-то в марте", hint).value, null);
  });

  test("формат хранения сортируется лексикографически", () => {
    const values = ["2019-03-12T14:30:00", "2019-03-12T09:15:00", "2019-03-13T09:00:00", "2019-03-12"];
    assert.deepEqual([...values].sort(), [
      "2019-03-12",
      "2019-03-12T09:15:00",
      "2019-03-12T14:30:00",
      "2019-03-13T09:00:00"
    ]);
  });
});

describe("перевод местного времени клиники в абсолютное", () => {
  test("местное время не сдвигается: 14:30 в Москве это 11:30 UTC", () => {
    const utc = storedDateTimeToUtc("2019-03-12T14:30:00", "Europe/Moscow");
    assert.equal(utc?.toISOString(), "2019-03-12T11:30:00.000Z");
  });

  test("значение с явным поясом не пересчитывается второй раз", () => {
    const utc = storedDateTimeToUtc("2019-03-12T14:30:00Z", "Europe/Moscow");
    assert.equal(utc?.toISOString(), "2019-03-12T14:30:00.000Z");
  });

  test("исторический переход на летнее время учитывается", () => {
    /**
     * Россия отменила летнее время в 2014-м. До отмены смещение Москвы летом
     * было +4, зимой +3. Константа «+3» сдвинула бы летние приёмы 2010 года на
     * час, поэтому смещение берётся из Intl для конкретного момента.
     */
    const winter2010 = storedDateTimeToUtc("2010-01-15T12:00:00", "Europe/Moscow");
    const summer2010 = storedDateTimeToUtc("2010-07-15T12:00:00", "Europe/Moscow");
    assert.equal(winter2010?.toISOString(), "2010-01-15T09:00:00.000Z");
    // Летом 2010 Москва была UTC+4, поэтому полдень местного — 08:00 UTC.
    assert.equal(summer2010?.toISOString(), "2010-07-15T08:00:00.000Z");
  });

  test("другой часовой пояс клиники учитывается", () => {
    // Владивосток UTC+10.
    const utc = storedDateTimeToUtc("2019-03-12T14:30:00", "Asia/Vladivostok");
    assert.equal(utc?.toISOString(), "2019-03-12T04:30:00.000Z");
  });

  test("дата без времени получает переданное время по умолчанию", () => {
    const nineAm = storedDateTimeToUtc("2019-03-12", "Europe/Moscow", 9 * 60);
    assert.equal(nineAm?.toISOString(), "2019-03-12T06:00:00.000Z");
  });

  test("неизвестное имя пояса не роняет разбор", () => {
    const utc = storedDateTimeToUtc("2019-03-12T14:30:00", "Нет/Такого");
    assert.ok(utc !== null);
  });

  test("календарная часть отделяется от времени", () => {
    assert.equal(dateOnlyPart("2019-03-12T14:30:00"), "2019-03-12");
    assert.equal(dateOnlyPart("2019-03-12"), "2019-03-12");
  });
});

describe("телефоны", () => {
  test("российские записи приводятся к E.164", () => {
    for (const input of ["8 (900) 123-45-67", "+7 900 123 45 67", "9001234567", "+7(900)123-45-67", "8-900-123-45-67"]) {
      assert.equal(normalizePhoneValue(input).value?.e164, "+79001234567", `не разобрано: ${input}`);
    }
  });

  test("городской номер переносится, но помечается как немобильный", () => {
    const parsed = normalizePhoneValue("8 495 777 88 99");
    assert.equal(parsed.value?.e164, "+74957778899");
    // Система напоминаний должна знать, что SMS сюда не уйдёт.
    assert.equal(parsed.value?.mobile, false);
    assert.ok(parsed.confidence < 0.9);
  });

  test("добавочный номер отделяется, а не приклеивается к номеру", () => {
    const parsed = normalizePhoneValue("+7 495 777 88 99 доб. 205");
    assert.equal(parsed.value?.e164, "+74957778899");
    assert.equal(parsed.value?.extension, "205");
  });

  test("несколько номеров в ячейке: берётся первый, факт отмечается", () => {
    const parsed = normalizePhoneValue("8-900-111-22-33, 495-000-11-22");
    assert.equal(parsed.value?.e164, "+79001112233");
    assert.ok(parsed.transforms.includes("multiple-numbers-first-taken"));
  });

  test("нерабочие номера отклоняются с указанием причины", () => {
    const short = normalizePhoneValue("12345");
    assert.equal(short.value, null);
    assert.ok(short.issue?.includes("цифр"));

    // Кода региона, начинающегося на 0 или 1, не существует.
    assert.equal(normalizePhoneValue("0001234567").value, null);
    assert.equal(normalizePhoneValue("нет телефона").value, null);
  });

  test("иностранный номер не переделывается в российский", () => {
    const parsed = normalizePhoneValue("+380 44 123 4567");
    assert.equal(parsed.value?.e164, "+380441234567");
    assert.ok(parsed.transforms.includes("foreign-number-as-is"));
  });
});

describe("имена", () => {
  test("верхний регистр из DOS-систем приводится к обычному", () => {
    assert.equal(normalizeNameValue("ИВАНОВ ИВАН ИВАНОВИЧ").value?.fullName, "Иванов Иван Иванович");
    assert.equal(normalizeNameValue("петрова мария сергеевна").value?.fullName, "Петрова Мария Сергеевна");
  });

  test("смешанный регистр не ломается", () => {
    // «МакДональд» уже написан правильно — трогать его нельзя.
    assert.equal(fixNameCase("МакДональд").changed, false);
    assert.equal(normalizeNameValue("МакДональд Джон").value?.fullName, "МакДональд Джон");
  });

  test("двойная фамилия через дефис сохраняет обе заглавные", () => {
    assert.equal(normalizeNameValue("ИВАНОВА-ПЕТРОВА АННА").value?.fullName, "Иванова-Петрова Анна");
  });

  test("частицы фамилий остаются со строчной", () => {
    assert.equal(normalizeNameValue("ВАН ДЕР БЕРГ ЯН").value?.fullName, "ван дер Берг Ян");
  });

  test("формат DICOM с разделителем ^ разбирается", () => {
    const parsed = normalizeNameValue("IVANOV^IVAN^IVANOVICH");
    assert.equal(parsed.value?.lastName, "Ivanov");
    assert.equal(parsed.value?.firstName, "Ivan");
    assert.equal(parsed.value?.middleName, "Ivanovich");
  });

  test("фамилия через запятую разбирается правильно", () => {
    const parsed = normalizeNameValue("Иванов, Иван Иванович");
    assert.equal(parsed.value?.lastName, "Иванов");
    assert.equal(parsed.value?.firstName, "Иван");
  });

  test("одно слово переносится, но с пониженной уверенностью", () => {
    const parsed = normalizeNameValue("Иванов");
    assert.equal(parsed.value?.fullName, "Иванов");
    assert.ok(parsed.confidence < 0.7);
  });

  test("мусор вместо ФИО отклоняется", () => {
    assert.equal(normalizeNameValue("1").value, null);
    assert.equal(normalizeNameValue("---").value, null);
  });

  test("раздельные колонки фамилии, имени и отчества собираются", () => {
    const parsed = combineNameParts("ИВАНОВ", "Иван", "Иванович");
    assert.equal(parsed.value?.fullName, "Иванов Иван Иванович");
    assert.equal(parsed.value?.lastName, "Иванов");
    // Отсутствующее отчество не превращается в пустое слово.
    assert.equal(combineNameParts("Иванов", "Иван", null).value?.fullName, "Иванов Иван");
  });
});

describe("деньги", () => {
  test("российская запись с разрядами и валютой разбирается в копейки", () => {
    assert.equal(normalizeMoneyValue("1 500,00 руб.").value, 150000);
    assert.equal(normalizeMoneyValue("2500₽").value, 250000);
    assert.equal(normalizeMoneyValue("15 000").value, 1500000);
  });

  test("копейки сохраняются точно, без плавающей точки", () => {
    // Ради этого функция и считает копейки регулярным выражением, а не parseFloat.
    assert.equal(normalizeMoneyValue("23 400,50").value, 2340050);
    assert.equal(normalizeMoneyValue("0,01").value, 1);
    assert.equal(normalizeMoneyValue("1500,5").value, 150050);
  });

  test("американская запись с точкой как дробной частью", () => {
    assert.equal(normalizeMoneyValue("1,500.00").value, 150000);
    assert.equal(normalizeMoneyValue("1500.50").value, 150050);
  });

  test("отрицательная сумма в скобках — бухгалтерская запись", () => {
    assert.equal(normalizeMoneyValue("(1 500,00)").value, -150000);
    assert.equal(normalizeMoneyValue("-1500").value, -150000);
  });

  test("ноль — это сумма, а не пустота", () => {
    const parsed = normalizeMoneyValue("0");
    assert.equal(parsed.value, 0);
    assert.equal(parsed.issue, null);
  });

  test("рубли для колонки numeric(12,2): копейки доходят до колонки, а не округляются", () => {
    // БЫЛО: этот тест утверждал обратное — что «23 400,50» превращается в 23401,
    // и требовал пометку «round-kopecks-to-rubles» в происхождении поля. Он
    // закреплял потерю копеек на КАЖДОМ перенесённом платеже, обоснованную
    // мёртвым утверждением, будто payments.amount_rub — колонка integer.
    const whole = normalizeMoneyRubles("1500,00");
    assert.equal(whole.value, 1500);

    const withKopecks = normalizeMoneyRubles("23 400,50");
    assert.equal(withKopecks.value, 23400.5);
    assert.ok(!withKopecks.transforms.includes("round-kopecks-to-rubles"));

    // Одна копейка — минимальная сумма, которая обязана выжить.
    assert.equal(normalizeMoneyRubles("0,01").value, 0.01);
    assert.equal(normalizeMoneyRubles("(1 500,55)").value, -1500.55);
  });

  test("неправдоподобная и нечисловая сумма отклоняются", () => {
    assert.equal(normalizeMoneyValue("бесплатно").value, null);
    assert.equal(normalizeMoneyValue("99999999999").value, null);
    assert.equal(normalizeMoneyRubles("бесплатно").value, null);
  });
});

describe("перечисления, пол, флаги", () => {
  test("пол распознаётся во всех встречающихся написаниях", () => {
    for (const male of ["М", "м", "муж", "мужской", "M", "male", "1"]) {
      assert.equal(normalizeGenderValue(male).value, "male", `не распознано: ${male}`);
    }
    for (const female of ["Ж", "жен", "женский", "F", "female", "2"]) {
      assert.equal(normalizeGenderValue(female).value, "female", `не распознано: ${female}`);
    }
    assert.equal(normalizeGenderValue("непонятно").value, null);
  });

  test("флаги да/нет распознаются, мусор отклоняется", () => {
    assert.equal(normalizeBooleanValue("да").value, true);
    assert.equal(normalizeBooleanValue("0").value, false);
    assert.equal(normalizeBooleanValue("возможно").value, null);
  });

  test("статус сопоставляется по словарю, включая частичное совпадение", () => {
    const synonyms = { завершён: "completed", отменена: "cancelled", запланирован: "planned" } as const;
    assert.equal(normalizeEnumValue("Завершён", synonyms).value, "completed");
    // Частичное совпадение: «отменена пациентом» → отменена.
    const partial = normalizeEnumValue("отменена пациентом", synonyms);
    assert.equal(partial.value, "cancelled");
    assert.ok(partial.confidence < 0.9);
    // Без значения по умолчанию непонятный статус отклоняется.
    assert.equal(normalizeEnumValue("что-то своё", synonyms).value, null);
    // Со значением по умолчанию — принимается, но уверенность низкая.
    const fallback = normalizeEnumValue("что-то своё", synonyms, "planned");
    assert.equal(fallback.value, "planned");
    assert.ok(fallback.confidence < 0.5);
  });
});

describe("зубная формула и почта", () => {
  test("номера зубов приводятся к FDI", () => {
    assert.equal(normalizeToothCode("16").value, "16");
    assert.equal(normalizeToothCode("1.6").value, "16");
    // Молочные зубы 51–85.
    assert.equal(normalizeToothCode("55").value, "55");
    // Несуществующий номер отклоняется, а не записывается.
    assert.equal(normalizeToothCode("19").value, null);
    assert.equal(normalizeToothCode("99").value, null);
  });

  test("нотация Universal переводится в FDI с пониженной уверенностью", () => {
    // Universal 3 — это верхний правый первый моляр, в FDI 16.
    const parsed = normalizeToothCode("3");
    assert.equal(parsed.value, "16");
    // Однозначного признака нотации у одиночного значения нет.
    assert.ok(parsed.confidence < 0.7);
  });

  test("почта проверяется, из нескольких адресов берётся первый", () => {
    assert.equal(normalizeEmailValue("Ivanov@Example.COM").value, "ivanov@example.com");
    assert.equal(normalizeEmailValue("a@b.ru, c@d.ru").value, "a@b.ru");
    assert.equal(normalizeEmailValue("нет почты").value, null);
    assert.equal(normalizeEmailValue("ivanov@").value, null);
  });
});

describe("текст", () => {
  test("лишние пробелы сжимаются, повреждение кодировки отклоняется", () => {
    assert.equal(normalizeText("  Жалобы   на    боль  ").value, "Жалобы на боль");
    const damaged = normalizeText("Жалобы на бол�");
    assert.equal(damaged.value, null);
    assert.ok(damaged.issue?.includes("кодировка"));
  });

  test("значение сверх предела поля отклоняется как признак склейки строк", () => {
    const parsed = normalizeText("а".repeat(9000));
    assert.equal(parsed.value, null);
    assert.ok(parsed.issue?.includes("превышает предел"));
  });
});
