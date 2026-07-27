import { TextDecoder } from "node:util";

/**
 * Чтение таблиц dBASE/FoxPro (.dbf).
 *
 * ЗАЧЕМ ЭТО НУЖНО
 * ingestion/documentExtractor.ts относит .dbf к «legacy database» и на этом
 * останавливается: файл опознан, но ни одна строка из него не прочитана. При
 * этом DBF — основной формат хранения у российских стоматологических систем
 * первого поколения и у всего, что выросло из FoxPro и Clipper. Отправить
 * клиента «выгрузите в CSV» часто невозможно: программа не запускается на
 * современной Windows, а данные нужны.
 *
 * Отдельно важен байт 29 заголовка — идентификатор кодовой страницы. Файл сам
 * сообщает, в какой кодировке в нём лежит текст (0x65 = cp866, 0xC9 = cp1251).
 * Обычные читалки этот байт игнорируют и портят кириллицу; здесь он читается
 * первым делом, и угадывание кодировки не требуется вовсе.
 *
 * Формат: спецификация dBASE III/IV/5 и Visual FoxPro. Реализованы типы полей,
 * реально встречающиеся в медицинских выгрузках; неизвестный тип не роняет
 * чтение, а возвращается как сырая строка.
 */

export interface DbfField {
  name: string;
  /** Односимвольный код типа: C, N, F, D, L, M, T, I, B, Y, @, +, O, G, P, V. */
  type: string;
  length: number;
  decimals: number;
}

export interface DbfParseResult {
  fields: DbfField[];
  columns: string[];
  /** Значения строк как текст: приведение к типам делает слой нормализации. */
  rows: string[][];
  /** Записи, помеченные в DBF как удалённые. Не смешиваются с живыми. */
  deletedRowCount: number;
  encoding: string;
  /** Кодировка взята из заголовка файла, а не угадана. */
  encodingFromHeader: boolean;
  dbfVersion: number;
  versionLabel: string;
  recordCount: number;
  warnings: string[];
}

/**
 * Байт 29 заголовка → кодовая страница.
 *
 * Таблица из спецификации dBASE (Language driver ID). Перечислены значения,
 * которые встречаются на практике; для прочих остаётся определение по содержимому.
 */
const LANGUAGE_DRIVER_ENCODINGS: Record<number, string> = {
  0x01: "ibm437",       // US MS-DOS
  0x02: "ibm850",       // International MS-DOS
  0x03: "windows-1252", // Windows ANSI
  0x08: "ibm865",       // Danish OEM
  0x09: "ibm437",
  0x0a: "ibm850",
  0x0b: "ibm437",
  0x64: "ibm852",       // Eastern European MS-DOS
  0x65: "ibm866",       // Russian MS-DOS — типично для DOS-эпохи
  0x66: "ibm865",
  0x67: "ibm861",
  0x6a: "ibm737",
  0x6b: "ibm857",
  0x78: "big5",
  0x79: "euc-kr",
  0x7a: "gbk",
  0x7b: "shift_jis",
  0x7c: "windows-874",
  0x7d: "windows-1255",
  0x7e: "windows-1256",
  0xc8: "windows-1250", // Eastern European Windows
  0xc9: "windows-1251", // Russian Windows — типично для 2000-х
  0xca: "windows-1254",
  0xcb: "windows-1253",
  0x87: "ibm852",
  0x88: "windows-1250"
};

const DBF_VERSION_LABELS: Record<number, string> = {
  0x02: "FoxBASE",
  0x03: "dBASE III+ без memo",
  0x04: "dBASE IV без memo",
  0x05: "dBASE 5 без memo",
  0x30: "Visual FoxPro",
  0x31: "Visual FoxPro с автоинкрементом",
  0x32: "Visual FoxPro с полем Varchar",
  0x43: "dBASE IV SQL-таблица",
  0x7b: "dBASE IV с memo",
  0x83: "dBASE III+ с memo",
  0x8b: "dBASE IV с memo",
  0x8e: "dBASE IV SQL-система",
  0xf5: "FoxPro 2.x с memo",
  0xfb: "FoxPro без memo"
};

const HEADER_SIZE = 32;
const FIELD_DESCRIPTOR_SIZE = 32;
const FIELD_TERMINATOR = 0x0d;
const RECORD_ACTIVE = 0x20;
const RECORD_DELETED = 0x2a;

/** Быстрая проверка, что буфер вообще похож на DBF, — до попытки разбора. */
export function looksLikeDbf(buffer: Buffer): boolean {
  if (buffer.length < HEADER_SIZE + 1) return false;
  const version = buffer[0]!;
  if (!(version in DBF_VERSION_LABELS)) return false;

  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  if (headerLength < HEADER_SIZE + FIELD_DESCRIPTOR_SIZE || headerLength > buffer.length) return false;
  if (recordLength === 0) return false;

  // Месяц и день последнего изменения обязаны быть календарными.
  const month = buffer[2]!;
  const day = buffer[3]!;
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function decodeFixed(buffer: Buffer, decoder: TextDecoder): string {
  // Поля дополнены пробелами справа; в старых файлах встречается и \0.
  return decoder.decode(buffer).replace(/\0/g, "").trim();
}

/**
 * Значение поля в текстовом виде.
 *
 * Приведение к типам здесь НЕ делается намеренно: слой нормализации умеет
 * разбирать даты, деньги и телефоны с учётом контекста колонки и записывает
 * происхождение. Задача этой функции — не потерять и не исказить содержимое.
 */
function decodeFieldValue(raw: Buffer, field: DbfField, decoder: TextDecoder): string {
  switch (field.type) {
    case "C": // Character
    case "M": // Memo (ссылка на блок в .dbt/.fpt)
    case "G": // General/OLE
    case "P": // Picture
      return decodeFixed(raw, decoder);

    case "N": // Numeric — хранится текстом, дополнен пробелами слева
    case "F": // Float
      return decodeFixed(raw, decoder);

    case "D": {
      // Date — ровно 8 символов YYYYMMDD. Незаполненная дата — пробелы или нули.
      const text = decodeFixed(raw, decoder);
      if (!/^\d{8}$/.test(text) || text === "00000000") return "";
      return text;
    }

    case "L": {
      // Logical — один символ.
      const char = String.fromCharCode(raw[0] ?? 0x20).toUpperCase();
      if (char === "T" || char === "Y") return "1";
      if (char === "F" || char === "N") return "0";
      return "";
    }

    case "I": // Integer — 4 байта little-endian со знаком
      return raw.length >= 4 ? String(raw.readInt32LE(0)) : "";

    case "B": // Double (Visual FoxPro) — 8 байт IEEE 754
    case "O": // Double
      return raw.length >= 8 ? String(raw.readDoubleLE(0)) : "";

    case "Y": {
      /**
       * Currency — 8 байт целое, подразумевается 4 знака после запятой.
       * BigInt обязателен: значение не помещается в double без потери точности,
       * а это деньги.
       */
      if (raw.length < 8) return "";
      const scaled = raw.readBigInt64LE(0);
      const negative = scaled < 0n;
      const absolute = negative ? -scaled : scaled;
      const whole = absolute / 10000n;
      const fraction = (absolute % 10000n).toString().padStart(4, "0");
      return `${negative ? "-" : ""}${whole}.${fraction}`;
    }

    case "T":
    case "@": {
      /**
       * DateTime — 8 байт: юлианский день + миллисекунды от полуночи.
       * Юлианский день 2440588 соответствует 1970-01-01.
       */
      if (raw.length < 8) return "";
      const julianDay = raw.readInt32LE(0);
      const millisOfDay = raw.readInt32LE(4);
      if (julianDay === 0) return "";
      const epochMillis = (julianDay - 2440588) * 86_400_000 + millisOfDay;
      const date = new Date(epochMillis);
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString().replace(".000Z", "Z");
    }

    case "+": // Autoincrement (Visual FoxPro)
      return raw.length >= 4 ? String(raw.readUInt32LE(0)) : "";

    case "V": // Varchar (Visual FoxPro)
      return decodeFixed(raw, decoder);

    default:
      // Неизвестный тип: отдаём как текст, чтобы данные не пропали.
      return decodeFixed(raw, decoder);
  }
}

export interface DbfParseOptions {
  /**
   * Читать ли записи, помеченные удалёнными. По умолчанию нет: в DBF удаление
   * ленивое, и файл может содержать десятилетия вычеркнутых записей, которые
   * клиника удалила сознательно. Их перенос — сюрприз, а не услуга.
   */
  includeDeleted?: boolean;
  /** Принудительная кодировка, если оператор знает лучше заголовка. */
  forcedEncoding?: string;
  /** Предел числа строк за один разбор. */
  maxRows?: number;
}

export function parseDbf(buffer: Buffer, options: DbfParseOptions = {}): DbfParseResult {
  const warnings: string[] = [];

  if (buffer.length < HEADER_SIZE) {
    throw new Error("Файл короче заголовка DBF — вероятно, он повреждён или загружен не полностью.");
  }

  const version = buffer[0]!;
  const versionLabel = DBF_VERSION_LABELS[version] ?? `неизвестная версия 0x${version.toString(16)}`;
  const declaredRecordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const languageDriver = buffer[29]!;

  if (headerLength < HEADER_SIZE + FIELD_DESCRIPTOR_SIZE || headerLength > buffer.length) {
    throw new Error(
      `Заголовок DBF объявляет длину ${headerLength} байт, что не согласуется с размером файла ${buffer.length} байт.`
    );
  }
  if (recordLength === 0) {
    throw new Error("Заголовок DBF объявляет нулевую длину записи — файл повреждён.");
  }

  // ------------------------------------------------------------------
  // Кодировка: сначала заголовок файла, и только при его молчании — угадывание.
  // ------------------------------------------------------------------
  let encoding = options.forcedEncoding ?? LANGUAGE_DRIVER_ENCODINGS[languageDriver] ?? "";
  const encodingFromHeader = !options.forcedEncoding && Boolean(LANGUAGE_DRIVER_ENCODINGS[languageDriver]);
  if (!encoding) {
    encoding = "windows-1251";
    warnings.push(
      `В заголовке файла не указана кодовая страница (байт 29 = 0x${languageDriver.toString(16)}). Текст прочитан как windows-1251 — проверьте ФИО в предпросмотре.`
    );
  }

  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(encoding);
  } catch {
    warnings.push(`Кодировка «${encoding}» не поддерживается средой; текст прочитан как windows-1251.`);
    encoding = "windows-1251";
    decoder = new TextDecoder(encoding);
  }
  // Имена полей всегда ASCII — отдельный декодер не требуется.
  const asciiDecoder = new TextDecoder("ascii");

  // ------------------------------------------------------------------
  // Описатели полей
  // ------------------------------------------------------------------
  const fields: DbfField[] = [];
  let offset = HEADER_SIZE;
  while (offset + FIELD_DESCRIPTOR_SIZE <= headerLength) {
    if (buffer[offset] === FIELD_TERMINATOR) break;
    const descriptor = buffer.subarray(offset, offset + FIELD_DESCRIPTOR_SIZE);
    const name = asciiDecoder.decode(descriptor.subarray(0, 11)).replace(/\0.*$/, "").trim();
    const type = String.fromCharCode(descriptor[11] ?? 0x43);
    const length = descriptor[16]!;
    const decimals = descriptor[17]!;
    if (name === "") {
      offset += FIELD_DESCRIPTOR_SIZE;
      continue;
    }
    fields.push({ name, type, length, decimals });
    offset += FIELD_DESCRIPTOR_SIZE;
  }

  if (fields.length === 0) {
    throw new Error("В заголовке DBF не найдено ни одного описания поля.");
  }

  const memoFields = fields.filter((field) => field.type === "M");
  if (memoFields.length > 0) {
    warnings.push(
      `Поля ${memoFields.map((field) => field.name).join(", ")} хранят текст в отдельном файле (.dbt/.fpt). Без него перенесётся только номер блока. Загрузите memo-файл вместе с таблицей, если эти поля нужны.`
    );
  }

  const declaredWidth = fields.reduce((sum, field) => sum + field.length, 0) + 1;
  if (declaredWidth !== recordLength) {
    warnings.push(
      `Сумма длин полей (${declaredWidth}) не совпадает с объявленной длиной записи (${recordLength}); чтение идёт по объявленной длине.`
    );
  }

  // ------------------------------------------------------------------
  // Записи
  // ------------------------------------------------------------------
  const availableBytes = buffer.length - headerLength;
  const availableRecords = Math.floor(availableBytes / recordLength);
  if (availableRecords < declaredRecordCount) {
    warnings.push(
      `Заголовок объявляет ${declaredRecordCount} записей, а в файле помещается ${availableRecords}. Файл обрезан; прочитано ${availableRecords}.`
    );
  }

  const limit = Math.min(
    declaredRecordCount === 0 ? availableRecords : Math.min(declaredRecordCount, availableRecords),
    options.maxRows ?? Number.MAX_SAFE_INTEGER
  );
  if (limit < Math.min(declaredRecordCount, availableRecords)) {
    warnings.push(`Прочитаны первые ${limit} записей из ${Math.min(declaredRecordCount, availableRecords)} — сработал предел разбора.`);
  }

  const rows: string[][] = [];
  let deletedRowCount = 0;

  for (let index = 0; index < limit; index += 1) {
    const start = headerLength + index * recordLength;
    const record = buffer.subarray(start, start + recordLength);
    if (record.length < recordLength) break;

    const flag = record[0]!;
    if (flag === RECORD_DELETED) {
      deletedRowCount += 1;
      if (!options.includeDeleted) continue;
    } else if (flag !== RECORD_ACTIVE) {
      /**
       * Байт 0x1A — маркер конца файла в старых DBF. Всё после него — мусор,
       * а не записи, и читать его дальше нельзя.
       */
      if (flag === 0x1a) break;
      // Неизвестный флаг: запись читаем, но помечаем в предупреждениях.
      if (!warnings.some((warning) => warning.startsWith("Встречены записи с неизвестным"))) {
        warnings.push("Встречены записи с неизвестным флагом удаления; они прочитаны как действующие.");
      }
    }

    const values: string[] = [];
    let fieldOffset = 1;
    for (const field of fields) {
      const raw = record.subarray(fieldOffset, fieldOffset + field.length);
      values.push(decodeFieldValue(raw, field, decoder));
      fieldOffset += field.length;
    }
    rows.push(values);
  }

  if (deletedRowCount > 0 && !options.includeDeleted) {
    warnings.push(
      `${deletedRowCount} запис(ей) помечены в файле как удалённые и пропущены. Если их нужно перенести, включите чтение удалённых записей.`
    );
  }

  return {
    fields,
    columns: fields.map((field) => field.name),
    rows,
    deletedRowCount,
    encoding,
    encodingFromHeader,
    dbfVersion: version,
    versionLabel,
    recordCount: rows.length,
    warnings
  };
}
