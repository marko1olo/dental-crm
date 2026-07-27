import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { detectEncoding, decodeSourceBuffer, hasEncodingDamage } from "../encoding.js";
import { parseDelimited, detectDelimiter } from "../parsers/delimited.js";
import { looksLikeDbf, parseDbf } from "../parsers/dbf.js";
import { parseXlsx, columnLettersToIndex } from "../parsers/spreadsheet.js";
import { parseJsonSource, parseXmlSource } from "../parsers/structured.js";
import { parseSource } from "../parsers/index.js";
import { buildDbfFile, buildXlsxFile, encodeSingleByte, type DbfFixtureField } from "./fixtures.js";

/** Выгрузка пациентов, на которой проверяются все форматы. */
const PATIENT_TEXT = `ФИО;Телефон;Дата рождения;Комментарий
Иванов Иван Иванович;+7 (900) 123-45-67;01.01.1980;Жалобы на боль в области верхней челюсти
Петрова Мария Сергеевна;89161112233;15.03.1992;Плановый осмотр, беспокоит чувствительность
Сидоров Алексей Николаевич;8 495 777 88 99;22.11.1975;Повторный приём после лечения канала
Кузнецова Ольга Владимировна;+79031234567;07.07.1988;Требуется консультация ортодонта`;

describe("определение кодировки", () => {
  test("BOM UTF-8 распознаётся явно и без потерь", () => {
    const buffer = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(PATIENT_TEXT, "utf8")]);
    const decoded = decodeSourceBuffer(buffer);
    assert.equal(decoded.encoding, "utf-8");
    assert.equal(decoded.explicit, true);
    assert.equal(decoded.replacementCharCount, 0);
    // BOM не должен приклеиться к имени первой колонки.
    assert.ok(decoded.text.startsWith("ФИО;"));
  });

  test("windows-1251 без признаков в файле определяется по частотности русских букв", () => {
    const buffer = encodeSingleByte(PATIENT_TEXT, "windows-1251");
    const detection = detectEncoding(buffer);
    assert.equal(detection.encoding, "windows-1251");
    assert.ok(detection.confidence > 0.8, `уверенность ${detection.confidence}`);
    const decoded = decodeSourceBuffer(buffer);
    assert.ok(decoded.text.includes("Иванов Иван Иванович"));
  });

  test("cp866 из DOS-эпохи не путается с windows-1251", () => {
    const decoded = decodeSourceBuffer(encodeSingleByte(PATIENT_TEXT, "ibm866"));
    assert.equal(decoded.encoding, "ibm866");
    assert.ok(decoded.text.includes("Кузнецова Ольга Владимировна"));
  });

  test("koi8-r определяется отдельно от остальных кириллических кодировок", () => {
    const decoded = decodeSourceBuffer(encodeSingleByte(PATIENT_TEXT, "koi8-r"));
    assert.equal(decoded.encoding, "koi8-r");
    assert.ok(decoded.text.includes("Петрова Мария Сергеевна"));
  });

  test("двойное кодирование UTF-8 через windows-1251 восстанавливается", () => {
    // Так портится текст, когда UTF-8 прочитали как cp1251 и сохранили снова.
    const damaged = new TextDecoder("windows-1251").decode(Buffer.from(PATIENT_TEXT, "utf8"));
    const decoded = decodeSourceBuffer(Buffer.from(damaged, "utf8"));
    assert.ok(
      decoded.text.includes("Иванов Иван Иванович"),
      `восстановление не сработало: ${decoded.text.slice(0, 80)}`
    );
  });

  test("чистый ASCII не признаётся повреждённым", () => {
    const decoded = decodeSourceBuffer(Buffer.from("id;name;phone\n1;John Smith;+15551234567", "utf8"));
    assert.equal(decoded.replacementCharCount, 0);
    assert.ok(decoded.text.includes("John Smith"));
  });

  test("повреждение значения опознаётся отдельно от кодировки файла", () => {
    assert.equal(hasEncodingDamage("Иванов"), false);
    assert.equal(hasEncodingDamage("Ива�нов"), true);
    assert.equal(hasEncodingDamage(""), false);
  });
});

describe("разбор таблиц с разделителем", () => {
  test("значение с переводом строки внутри кавычек не разрывает запись", () => {
    const csv = `ФИО;Телефон;Комментарий
Иванов Иван;89001234567;"Жалобы: боль в 16.
Направлен на снимок"
Петрова М.;89161112233;Обычный комментарий`;
    const parsed = parseDelimited(csv);
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]![2], "Жалобы: боль в 16.\nНаправлен на снимок");
  });

  test("удвоенные кавычки внутри значения сохраняются как одна", () => {
    const csv = `Плательщик;Сумма\n"ООО ""Ромашка"", договор 12";15000`;
    const parsed = parseDelimited(csv);
    assert.equal(parsed.rows[0]![0], 'ООО "Ромашка", договор 12');
  });

  test("кавычка в середине незакавыченного значения — это данные, а не цитата", () => {
    const csv = `Услуга;Размер\nБор 6";10`;
    const parsed = parseDelimited(csv);
    assert.equal(parsed.rows[0]![0], 'Бор 6"');
  });

  test("разделитель выбирается по прямоугольности таблицы, а не по заголовку", () => {
    const tricky = `ФИО, полностью;Телефон;Дата
Иванов Иван Иванович;89001234567;01.01.1980
Петрова Мария;89161112233;15.03.1992`;
    assert.equal(detectDelimiter(tricky).delimiter, ";");
    assert.equal(parseDelimited(tricky).columns.length, 3);
  });

  test("таблица без заголовка не теряет первую строку данных", () => {
    const parsed = parseDelimited(`Иванов Иван;89001234567;01.01.1980\nПетрова Мария;89161112233;15.03.1992`);
    assert.equal(parsed.hasHeader, false);
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]![0], "Иванов Иван");
  });

  test("строка с лишним разделителем не отбрасывается, а помечается", () => {
    const parsed = parseDelimited(`ФИО;Телефон;Комментарий
Иванов;89001234567;коммент;хвост после лишней точки с запятой
Петрова;89161112233`);
    assert.equal(parsed.rows.length, 2);
    assert.deepEqual(parsed.raggedRowNumbers, [2, 3]);
    // Хвост склеен в последнюю колонку — текст не потерян.
    assert.equal(parsed.rows[0]![2], "коммент;хвост после лишней точки с запятой");
    // Недостающая ячейка дополнена пустой, а не сдвинула колонки.
    assert.equal(parsed.rows[1]![2], "");
  });

  test("повторяющиеся имена колонок разводятся, а безымянные получают номер", () => {
    const parsed = parseDelimited(`Телефон;Телефон;\n89001234567;89161112233;примечание`);
    assert.deepEqual(parsed.columns, ["Телефон", "Телефон (2)", "Колонка 3"]);
  });

  test("пустые строки в конце выгрузки не превращаются в пустых пациентов", () => {
    const parsed = parseDelimited(`ФИО;Телефон\nИванов;89001234567\n\n;\n\n`);
    assert.equal(parsed.rows.length, 1);
  });
});

describe("чтение таблиц dBASE/FoxPro", () => {
  const fields: DbfFixtureField[] = [
    { name: "PATID", type: "I", length: 4 },
    { name: "FIO", type: "C", length: 40 },
    { name: "TELEFON", type: "C", length: 20 },
    { name: "DATAROJD", type: "D", length: 8 },
    { name: "POL", type: "C", length: 1 },
    { name: "SUMMA", type: "N", length: 10, decimals: 2 },
    { name: "AKTIV", type: "L", length: 1 },
    { name: "CENA", type: "Y", length: 8 }
  ];
  const records = [
    ["1", "Иванов Иван Иванович", "89001234567", "19800101", "М", "1500.00", "T", "1500.5"],
    ["2", "Петрова Мария Сергеевна", "+79161112233", "19920315", "Ж", "23400.50", "T", "23400.75"],
    ["3", "Сидоров Алексей Николаевич", "84957778899", "19751122", "М", "0.00", "F", "0"],
    ["4", "Кузнецова Ольга Владимировна", "9031234567", "19880707", "Ж", "7800.00", "T", "7800"]
  ];

  test("кодовая страница берётся из байта 29 заголовка, а не угадывается", () => {
    const dos = parseDbf(buildDbfFile(fields, records, { languageDriver: 0x65, encoding: "ibm866" }));
    assert.equal(dos.encoding, "ibm866");
    assert.equal(dos.encodingFromHeader, true);
    assert.equal(dos.rows[0]![1], "Иванов Иван Иванович");

    const windows = parseDbf(buildDbfFile(fields, records, { languageDriver: 0xc9, encoding: "windows-1251" }));
    assert.equal(windows.encoding, "windows-1251");
    assert.equal(windows.rows[3]![1], "Кузнецова Ольга Владимировна");
  });

  test("типы полей читаются по спецификации, а не как текст", () => {
    const result = parseDbf(buildDbfFile(fields, records, { languageDriver: 0xc9, encoding: "windows-1251" }));
    // Integer — 4 байта little-endian.
    assert.equal(result.rows[1]![0], "2");
    // Date — YYYYMMDD.
    assert.equal(result.rows[1]![3], "19920315");
    // Logical.
    assert.equal(result.rows[1]![6], "1");
    assert.equal(result.rows[2]![6], "0");
    // Numeric сохраняет дробную часть.
    assert.equal(result.rows[1]![5], "23400.50");
    // Currency — восемь байт целого с четырьмя знаками, через BigInt без потери точности.
    assert.equal(result.rows[1]![7], "23400.7500");
  });

  test("записи, помеченные удалёнными, по умолчанию не переносятся, но пересчитываются", () => {
    const file = buildDbfFile(fields, records, {
      languageDriver: 0xc9,
      encoding: "windows-1251",
      deletedIndexes: [2]
    });
    const skipped = parseDbf(file);
    assert.equal(skipped.rows.length, 3);
    assert.equal(skipped.deletedRowCount, 1);
    assert.deepEqual(skipped.rows.map((row) => row[0]), ["1", "2", "4"]);
    assert.ok(skipped.warnings.some((warning) => warning.includes("удалённые")));

    // Оператор может затребовать удалённые — тогда они читаются полностью.
    const included = parseDbf(file, { includeDeleted: true });
    assert.equal(included.rows.length, 4);
    assert.equal(included.rows[2]![1], "Сидоров Алексей Николаевич");
  });

  test("отсутствие кодовой страницы в заголовке приводит к предупреждению, а не к тихой порче", () => {
    const result = parseDbf(buildDbfFile(fields, records, { languageDriver: 0x00, encoding: "windows-1251" }));
    assert.equal(result.encodingFromHeader, false);
    assert.ok(result.warnings.some((warning) => warning.includes("не указана кодовая страница")));
  });

  test("повреждённый файл отклоняется с внятной причиной", () => {
    assert.throws(() => parseDbf(Buffer.alloc(10)), /короче заголовка/);
    // Заголовок объявляет больше записей, чем есть байт.
    const truncated = buildDbfFile(fields, records, { languageDriver: 0xc9, encoding: "windows-1251" }).subarray(0, 400);
    const result = parseDbf(truncated);
    assert.ok(result.warnings.some((warning) => warning.includes("обрезан")));
  });

  test("опознание DBF не срабатывает на CSV и наоборот", () => {
    assert.equal(looksLikeDbf(Buffer.from(PATIENT_TEXT, "utf8")), false);
    assert.equal(looksLikeDbf(buildDbfFile(fields, records, { languageDriver: 0xc9, encoding: "windows-1251" })), true);
  });

  test("пустая дата в DBF читается как пустое значение, а не как нули", () => {
    const withBlankDate = parseDbf(
      buildDbfFile(fields, [["5", "Орлов Пётр", "89001112233", "00000000", "М", "0.00", "T", "0"]], {
        languageDriver: 0xc9,
        encoding: "windows-1251"
      })
    );
    assert.equal(withBlankDate.rows[0]![3], "");
  });
});

describe("чтение книг Excel", () => {
  test("адреса ячеек соблюдаются: пустая ячейка не сдвигает следующие колонки", () => {
    /**
     * Главная проверка модуля. В формате OpenXML пустая ячейка не записывается,
     * поэтому у второй строки нет ячейки B. Разбор по порядку тегов поставил бы
     * телефон в колонку даты рождения — молча и во всех последующих колонках.
     */
    const file = buildXlsxFile("Пациенты", [
      { ref: "A1", value: "ФИО" },
      { ref: "B1", value: "Дата рождения" },
      { ref: "C1", value: "Телефон" },
      { ref: "A2", value: "Иванов Иван" },
      { ref: "B2", value: "01.01.1980" },
      { ref: "C2", value: "89001234567" },
      // У Петровой дата рождения неизвестна — ячейки B3 в файле нет вовсе.
      { ref: "A3", value: "Петрова Мария" },
      { ref: "C3", value: "89161112233" }
    ]);
    const result = parseXlsx(file);
    assert.equal(result.sheets.length, 1);
    assert.equal(result.sheets[0]!.name, "Пациенты");

    const rows = result.sheets[0]!.rows;
    assert.deepEqual(rows[0], ["ФИО", "Дата рождения", "Телефон"]);
    assert.deepEqual(rows[1], ["Иванов Иван", "01.01.1980", "89001234567"]);
    // Телефон обязан остаться в третьей колонке, а вторая — пустой.
    assert.deepEqual(rows[2], ["Петрова Мария", "", "89161112233"]);
  });

  test("дата, сохранённая числом со стилем даты, превращается в дату, а не в серийный номер", () => {
    const file = buildXlsxFile("Лист1", [
      { ref: "A1", value: "ФИО" },
      { ref: "B1", value: "Дата рождения" },
      { ref: "A2", value: "Иванов Иван" },
      // 33678 — 15.03.1992 в системе Excel (дней от 30.12.1899).
      { ref: "B2", value: "33678", type: "date" }
    ]);
    const rows = parseXlsx(file).sheets[0]!.rows;
    assert.equal(rows[1]![1], "1992-03-15");
  });

  test("число без формата даты остаётся числом", () => {
    const file = buildXlsxFile("Лист1", [
      { ref: "A1", value: "Услуга" },
      { ref: "B1", value: "Цена" },
      { ref: "A2", value: "Пломба" },
      { ref: "B2", value: "4500", type: "n" }
    ]);
    assert.equal(parseXlsx(file).sheets[0]!.rows[1]![1], "4500");
  });

  test("пропущенная строка не сдвигает нумерацию", () => {
    const file = buildXlsxFile("Лист1", [
      { ref: "A1", value: "ФИО" },
      { ref: "A2", value: "Иванов" },
      // Строки 3 нет; следующая — 4.
      { ref: "A4", value: "Петрова" }
    ]);
    const rows = parseXlsx(file).sheets[0]!.rows;
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((row) => row[0]), ["ФИО", "Иванов", "Петрова"]);
  });

  test("буквенные адреса колонок переводятся в номера", () => {
    assert.equal(columnLettersToIndex("A"), 0);
    assert.equal(columnLettersToIndex("Z"), 25);
    assert.equal(columnLettersToIndex("AA"), 26);
    assert.equal(columnLettersToIndex("BC"), 54);
  });
});

describe("разбор структурированных выгрузок", () => {
  test("массив записей находится внутри обёртки ответа API", () => {
    const json = JSON.stringify({
      status: "ok",
      meta: { page: 1 },
      data: {
        patients: [
          { id: 1, fio: "Иванов Иван", contacts: { phone: "89001234567" } },
          { id: 2, fio: "Петрова Мария", contacts: { phone: "89161112233" } }
        ]
      }
    });
    const result = parseJsonSource(json);
    assert.equal(result.recordPath, "data.patients");
    assert.equal(result.rows.length, 2);
    // Вложенность разворачивается в путь, пригодный для сопоставления полей.
    assert.ok(result.columns.includes("contacts.phone"));
    assert.equal(result.rows[0]![result.columns.indexOf("contacts.phone")], "89001234567");
  });

  test("записи с разным набором ключей объединяются без сдвига колонок", () => {
    const result = parseJsonSource(
      JSON.stringify([
        { fio: "Иванов", phone: "89001234567" },
        { fio: "Петрова", email: "m@example.com" }
      ])
    );
    assert.deepEqual(result.columns, ["fio", "phone", "email"]);
    assert.deepEqual(result.rows[1], ["Петрова", "", "m@example.com"]);
  });

  test("массив простых значений склеивается, массив объектов сохраняется целиком", () => {
    const result = parseJsonSource(
      JSON.stringify([{ fio: "Иванов", phones: ["89001234567", "89161112233"], visits: [{ date: "2020-01-01" }] }])
    );
    assert.equal(result.rows[0]![result.columns.indexOf("phones")], "89001234567; 89161112233");
    assert.ok(result.rows[0]![result.columns.indexOf("visits")]!.startsWith("[{"));
  });

  test("одна битая строка JSONL не роняет разбор остальных", () => {
    const jsonl = [
      '{"fio":"Иванов","phone":"89001234567"}',
      "{битая строка}",
      '{"fio":"Петрова","phone":"89161112233"}'
    ].join("\n");
    const result = parseJsonSource(jsonl);
    assert.equal(result.rows.length, 2);
    assert.ok(result.warnings.some((warning) => warning.includes("не разобраны")));
  });

  test("обрезанный JSON отклоняется с внятной причиной", () => {
    assert.throws(() => parseJsonSource('{"patients":[{"fio":"Иванов"'), /JSON не разобран/);
  });

  test("повторяющийся элемент XML распознаётся как запись", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<export>
  <patients>
    <patient id="1"><fio>Иванов Иван</fio><phone>89001234567</phone></patient>
    <patient id="2"><fio>Петрова Мария</fio><phone>89161112233</phone></patient>
  </patients>
</export>`;
    const result = parseXmlSource(xml);
    assert.equal(result.rows.length, 2);
    assert.ok(result.columns.includes("@id"));
    assert.ok(result.columns.includes("fio"));
    assert.equal(result.rows[0]![result.columns.indexOf("fio")], "Иванов Иван");
    assert.equal(result.rows[1]![result.columns.indexOf("@id")], "2");
  });

  test("CDATA читается как текст, а внешние сущности не обрабатываются", () => {
    const xml = `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<rows>
  <row><note><![CDATA[Жалобы: боль <при накусывании>]]></note></row>
  <row><note>Второй</note></row>
</rows>`;
    const result = parseXmlSource(xml);
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0]![result.columns.indexOf("note")], "Жалобы: боль <при накусывании>");
    assert.ok(result.warnings.some((warning) => warning.includes("внешние сущности")));
  });
});

describe("выбор разбора по содержимому источника", () => {
  test("DBF опознаётся по содержимому, даже если файл назван .txt", () => {
    const dbf = buildDbfFile(
      [
        { name: "FIO", type: "C", length: 30 },
        { name: "TEL", type: "C", length: 20 }
      ],
      [["Иванов Иван", "89001234567"]],
      { languageDriver: 0xc9, encoding: "windows-1251" }
    );
    const parsed = parseSource({ sourceName: "patients.txt", content: dbf });
    assert.equal(parsed.sourceKind, "dbf");
    assert.equal(parsed.detectedEncoding, "windows-1251");
    assert.equal(parsed.tables[0]!.rows[0]![0], "Иванов Иван");
  });

  test("CSV в windows-1251 читается через определение кодировки", () => {
    const parsed = parseSource({
      sourceName: "patients.csv",
      content: encodeSingleByte(PATIENT_TEXT, "windows-1251")
    });
    assert.equal(parsed.sourceKind, "delimited");
    assert.equal(parsed.detectedEncoding, "windows-1251");
    assert.equal(parsed.totalRows, 4);
    assert.deepEqual(parsed.tables[0]!.columns, ["ФИО", "Телефон", "Дата рождения", "Комментарий"]);
  });

  test("вставка из буфера обмена помечается своим видом источника", () => {
    const parsed = parseSource({ sourceName: "Вставка", rawText: PATIENT_TEXT });
    assert.equal(parsed.sourceKind, "clipboard");
    assert.equal(parsed.totalRows, 4);
  });

  test("свободный текст не разбирается как таблица", () => {
    const parsed = parseSource({
      sourceName: "Журнал",
      rawText: "Иванов Иван Иванович 89001234567 01.01.1980 боль\nПетрова Мария 89161112233 плановый осмотр"
    });
    assert.equal(parsed.sourceKind, "free_text");
    assert.deepEqual(parsed.tables[0]!.columns, ["Строка"]);
    assert.equal(parsed.totalRows, 2);
  });

  test("дамп SQL опознаётся и отклоняется, а не разбирается вслепую", () => {
    assert.throws(
      () =>
        parseSource({
          sourceName: "backup.sql",
          rawText: "-- MySQL dump\nCREATE TABLE patients (id int);\nINSERT INTO patients VALUES (1,'Иванов');"
        }),
      /дамп базы данных/
    );
  });

  test("книга Excel разбирается по листам с сохранением позиций колонок", () => {
    const parsed = parseSource({
      sourceName: "База.xlsx",
      content: buildXlsxFile("Пациенты", [
        { ref: "A1", value: "ФИО" },
        { ref: "B1", value: "Дата рождения" },
        { ref: "C1", value: "Телефон" },
        { ref: "A2", value: "Иванов Иван" },
        { ref: "C2", value: "89001234567" }
      ])
    });
    assert.equal(parsed.sourceKind, "spreadsheet");
    assert.equal(parsed.tables[0]!.name, "Пациенты");
    assert.deepEqual(parsed.tables[0]!.rows[0], ["Иванов Иван", "", "89001234567"]);
  });

  test("пустой источник не роняет разбор", () => {
    const parsed = parseSource({ sourceName: "empty.csv" });
    assert.equal(parsed.totalRows, 0);
    assert.ok(parsed.warnings.some((warning) => warning.includes("пуст")));
  });
});
