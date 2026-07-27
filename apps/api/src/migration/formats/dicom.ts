import { open } from "node:fs/promises";
import { TextDecoder } from "node:util";

/**
 * Чтение метаданных DICOM.
 *
 * ЧТО БЫЛО ЗДЕСЬ РАНЬШЕ
 * services/ingestion/DicomVacuum.ts объявлял себя сканером каталога снимков и
 * возвращал один захардкоженный объект: пациент «IVANOV^IVAN^IVANOVICH», дата
 * рождения 19800101, аппарат Sirona. Каталог не открывался вовсе. Метод
 * generatePreviewSlide возвращал строку с путём, не создавая файла. При переносе
 * это означало бы, что все снимки клиники приписаны одному выдуманному пациенту.
 *
 * ЧТО ЗДЕСЬ СЕЙЧАС
 * Настоящий разбор формата DICOM Part 10: префикс, мета-группа, определение
 * синтаксиса передачи, обход элементов данных с учётом явной и неявной записи
 * VR и порядка байт. Читаются только метаданные — до пиксельных данных разбор не
 * доходит и не должен: для переноса нужны пациент, исследование и модальность, а
 * не сами изображения, которые весят гигабайты.
 *
 * ПОЧЕМУ БЕЗ БИБЛИОТЕКИ
 * dcmjs и dicom-parser тянут за собой разбор пикселей, кодеки и десятки
 * мегабайт зависимостей. Для чтения десятка тегов это несоразмерно, а формат
 * заголовка стабилен с 1993 года и описан открыто.
 */

/** Теги, нужные для привязки снимка к пациенту и исследованию. */
const TAGS = {
  transferSyntaxUid: "0002,0010",
  patientName: "0010,0010",
  patientId: "0010,0020",
  patientBirthDate: "0010,0030",
  patientSex: "0010,0040",
  studyInstanceUid: "0020,000D",
  seriesInstanceUid: "0020,000E",
  sopInstanceUid: "0008,0018",
  studyDate: "0008,0020",
  seriesDate: "0008,0021",
  acquisitionDate: "0008,0022",
  studyTime: "0008,0030",
  modality: "0008,0060",
  manufacturer: "0008,0070",
  institutionName: "0008,0080",
  studyDescription: "0008,1030",
  seriesDescription: "0008,103E",
  bodyPartExamined: "0018,0015",
  sliceThickness: "0018,0050",
  pixelSpacing: "0028,0030",
  specificCharacterSet: "0008,0005",
  referringPhysician: "0008,0090",
  accessionNumber: "0008,0050"
} as const;

export interface DicomMetadata {
  /** ФИО пациента, приведённое из формы «Фамилия^Имя^Отчество». */
  patientName: string | null;
  /** Идентификатор пациента в системе, записавшей снимок. */
  patientId: string | null;
  /** Дата рождения в ISO, если она была в снимке. */
  patientBirthDate: string | null;
  patientSex: "male" | "female" | null;
  studyInstanceUid: string | null;
  seriesInstanceUid: string | null;
  sopInstanceUid: string | null;
  /** Дата исследования в ISO. */
  studyDate: string | null;
  studyTime: string | null;
  modality: string | null;
  manufacturer: string | null;
  institutionName: string | null;
  studyDescription: string | null;
  seriesDescription: string | null;
  bodyPartExamined: string | null;
  sliceThickness: string | null;
  pixelSpacing: string | null;
  /** Кодировка текстовых полей, объявленная в самом снимке. */
  characterSet: string | null;
  transferSyntaxUid: string | null;
  warnings: string[];
}

/**
 * Кодовые страницы DICOM (тег 0008,0005) в имена, понятные TextDecoder.
 *
 * Российские аппараты пишут ISO_IR 144 (кириллица ISO-8859-5), реже
 * ISO_IR 192 (UTF-8). Без учёта этого тега ФИО «Иванов» превращается в мусор:
 * байты кириллицы ISO-8859-5 не совпадают ни с UTF-8, ни с cp1251.
 */
const CHARACTER_SETS: Record<string, string> = {
  "": "latin1",
  "ISO_IR 6": "latin1",
  "ISO_IR 100": "latin1",
  "ISO_IR 101": "iso-8859-2",
  "ISO_IR 144": "iso-8859-5",
  "ISO_IR 148": "iso-8859-9",
  "ISO_IR 192": "utf-8",
  "ISO 2022 IR 6": "latin1",
  "ISO 2022 IR 144": "iso-8859-5",
  GB18030: "gb18030",
  GBK: "gbk"
};

/** VR с 32-битной длиной: у них после кода VR идут два резервных байта. */
const LONG_LENGTH_VRS = new Set(["OB", "OW", "OF", "OD", "OL", "OV", "SQ", "UT", "UC", "UR", "UN"]);

/** VR, значение которых — двоичное, а не текст. */
const BINARY_VRS = new Set(["OB", "OW", "OF", "OD", "OL", "OV", "UN", "FL", "FD", "SL", "SS", "UL", "US", "AT"]);

interface ParsedElement {
  tag: string;
  vr: string;
  value: string;
}

function tagKey(group: number, element: number): string {
  return `${group.toString(16).padStart(4, "0").toUpperCase()},${element.toString(16).padStart(4, "0").toUpperCase()}`;
}

/**
 * Обходит элементы данных.
 *
 * Явная запись VR (explicit) содержит код типа в самих данных; неявная
 * (implicit) — нет, и длина всегда 32-битная. Синтаксис передачи объявлен в
 * мета-группе, которая ВСЕГДА пишется явно с прямым порядком байт, — поэтому
 * сначала читается она, а уже потом основной набор в объявленном синтаксисе.
 */
function readElements(
  buffer: Buffer,
  start: number,
  end: number,
  explicitVr: boolean,
  littleEndian: boolean,
  decoder: TextDecoder,
  limit: number
): { elements: Map<string, ParsedElement>; nextOffset: number } {
  const elements = new Map<string, ParsedElement>();
  let offset = start;
  let read = 0;

  const readUInt16 = (position: number): number =>
    littleEndian ? buffer.readUInt16LE(position) : buffer.readUInt16BE(position);
  const readUInt32 = (position: number): number =>
    littleEndian ? buffer.readUInt32LE(position) : buffer.readUInt32BE(position);

  while (offset + 8 <= end && read < limit) {
    const group = readUInt16(offset);
    const element = readUInt16(offset + 2);
    offset += 4;

    let vr = "";
    let length = 0;

    if (explicitVr) {
      vr = buffer.subarray(offset, offset + 2).toString("latin1");
      offset += 2;
      if (LONG_LENGTH_VRS.has(vr)) {
        // Два резервных байта, затем 32-битная длина.
        offset += 2;
        if (offset + 4 > end) break;
        length = readUInt32(offset);
        offset += 4;
      } else {
        if (offset + 2 > end) break;
        length = readUInt16(offset);
        offset += 2;
      }
    } else {
      if (offset + 4 > end) break;
      length = readUInt32(offset);
      offset += 4;
      vr = "UN";
    }

    const key = tagKey(group, element);

    /**
     * Длина 0xFFFFFFFF означает элемент неопределённой длины: последовательность
     * или пиксельные данные с фрагментами. Разбирать их для метаданных не нужно,
     * а идти дальше по буферу вслепую нельзя — выходим.
     */
    if (length === 0xffffffff) break;

    // Пиксельные данные — дальше метаданных нет, читать гигабайты незачем.
    if (key === "7FE0,0010") break;

    if (offset + length > end) break;

    const raw = buffer.subarray(offset, offset + length);
    offset += length;
    read += 1;

    if (BINARY_VRS.has(vr) && vr !== "UN") {
      // Двоичное значение: в метаданных переноса оно не нужно.
      continue;
    }

    /**
     * Значения выравниваются до чётной длины пробелом или нулевым байтом —
     * их надо убрать, иначе ФИО приедет с хвостом.
     */
    const text = decoder.decode(raw).replace(/\0+$/g, "").trim();
    elements.set(key, { tag: key, vr, value: text });
  }

  return { elements, nextOffset: offset };
}

/** «Иванов^Иван^Иванович^^» → «Иванов Иван Иванович». */
function normalizeDicomName(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const parts = raw
    .split("^")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" ");
}

/** «19800101» → «1980-01-01». Нулевая дата означает отсутствие. */
function normalizeDicomDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8 || digits === "00000000") return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (year < 1850 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** «143000.000» → «14:30:00». */
function normalizeDicomTime(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return null;
  const hours = digits.slice(0, 2);
  const minutes = digits.slice(2, 4);
  const seconds = digits.length >= 6 ? digits.slice(4, 6) : "00";
  if (Number(hours) > 23 || Number(minutes) > 59) return null;
  return `${hours}:${minutes}:${seconds}`;
}

/** Сколько байт читать: метаданные умещаются в начале файла. */
const DICOM_HEADER_BYTES = 256 * 1024;

/** Признак файла DICOM: префикс 128 байт и магическая строка. */
export function looksLikeDicom(head: Buffer): boolean {
  return head.length > 132 && head.subarray(128, 132).toString("latin1") === "DICM";
}

/**
 * Читает метаданные одного снимка.
 *
 * Читается только начало файла, поэтому вызов дешёвый: каталог из десяти тысяч
 * снимков КТ на сотни гигабайт обходится за секунды, потому что от каждого файла
 * берётся четверть мегабайта.
 */
export async function readDicomMetadata(filePath: string): Promise<DicomMetadata> {
  const warnings: string[] = [];
  const handle = await open(filePath, "r");

  let buffer: Buffer;
  try {
    const size = (await handle.stat()).size;
    buffer = Buffer.alloc(Math.min(DICOM_HEADER_BYTES, size));
    await handle.read(buffer, 0, buffer.length, 0);
  } finally {
    await handle.close();
  }

  if (!looksLikeDicom(buffer)) {
    throw new Error("Файл не является снимком DICOM: отсутствует магическая метка DICM после префикса в 128 байт.");
  }

  /**
   * Мета-группа (0002,xxxx) всегда записана явно и с прямым порядком байт —
   * это требование стандарта, и именно поэтому её можно прочитать, ещё не зная
   * синтаксиса передачи остального файла.
   *
   * ГРАНИЦА ГРУППЫ ЗАДАНА ЯВНО. Первый элемент (0002,0000) содержит длину
   * оставшейся части группы в байтах. Читать мета-группу «до конца буфера»
   * нельзя: она поглотит весь основной набор, и разбор вернёт пустые поля,
   * потому что дальше читать будет уже нечего. Ровно на этом разбор и молчал,
   * возвращая null по каждому тегу при полностью корректном снимке.
   */
  const latin = new TextDecoder("latin1");

  /**
   * Элемент (0002,0000) читается вручную, а не общим обходчиком: его тип UL —
   * двоичный, и обходчик такие значения намеренно пропускает, потому что в
   * метаданных переноса они не нужны. Здесь же нужно именно число.
   *
   * Раскладка фиксирована стандартом: группа, элемент, «UL», длина 4, значение.
   */
  let metaStart = 132;
  let metaEnd = buffer.length;

  if (
    buffer.length >= 144 &&
    buffer.readUInt16LE(132) === 0x0002 &&
    buffer.readUInt16LE(134) === 0x0000 &&
    buffer.subarray(136, 138).toString("latin1") === "UL"
  ) {
    const declaredGroupLength = buffer.readUInt32LE(140);
    metaStart = 144;
    if (declaredGroupLength > 0 && metaStart + declaredGroupLength <= buffer.length) {
      metaEnd = metaStart + declaredGroupLength;
    } else {
      warnings.push(
        "Длина мета-группы в снимке выходит за границы прочитанного куска; заголовок разобран целиком, возможны пропуски."
      );
    }
  } else {
    warnings.push("В снимке нет элемента длины мета-группы (0002,0000); граница определена по содержимому.");
  }

  const meta = readElements(buffer, metaStart, metaEnd, true, true, latin, 64);
  const datasetStart = metaEnd;

  const transferSyntaxUid = meta.elements.get(TAGS.transferSyntaxUid)?.value ?? null;

  /**
   * Синтаксис передачи задаёт две вещи: явная или неявная запись VR и порядок
   * байт. Значения по спецификации:
   *   1.2.840.10008.1.2      — неявная VR, прямой порядок;
   *   1.2.840.10008.1.2.1    — явная VR, прямой порядок;
   *   1.2.840.10008.1.2.2    — явная VR, обратный порядок;
   *   всё остальное (.4.xx, .5) — сжатые пиксели, но заголовок явный прямой.
   */
  const implicitVr = transferSyntaxUid === "1.2.840.10008.1.2";
  const bigEndian = transferSyntaxUid === "1.2.840.10008.1.2.2";
  if (!transferSyntaxUid) {
    warnings.push("В снимке не объявлен синтаксис передачи; заголовок прочитан как явный с прямым порядком байт.");
  }

  // Первый проход основного набора нужен, чтобы узнать объявленную кодировку.
  const probe = readElements(buffer, datasetStart, buffer.length, !implicitVr, !bigEndian, latin, 200);
  const declaredCharset = probe.elements.get(TAGS.specificCharacterSet)?.value?.split("\\")[0]?.trim() ?? "";
  const encodingName = CHARACTER_SETS[declaredCharset] ?? "latin1";

  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(encodingName);
  } catch {
    warnings.push(`Кодировка «${declaredCharset}» не поддерживается средой; текст прочитан как latin1.`);
    decoder = latin;
  }

  if (declaredCharset && !CHARACTER_SETS[declaredCharset]) {
    warnings.push(
      `Снимок объявляет кодировку «${declaredCharset}», которой нет в таблице соответствий. ФИО может быть прочитано неверно — проверьте в предпросмотре.`
    );
  }

  // Второй проход — уже правильной кодировкой.
  const data = readElements(buffer, datasetStart, buffer.length, !implicitVr, !bigEndian, decoder, 400);
  const value = (tag: string): string | undefined => data.elements.get(tag)?.value || undefined;

  const sexRaw = value(TAGS.patientSex)?.toUpperCase();

  const metadata: DicomMetadata = {
    patientName: normalizeDicomName(value(TAGS.patientName)),
    patientId: value(TAGS.patientId) ?? null,
    patientBirthDate: normalizeDicomDate(value(TAGS.patientBirthDate)),
    patientSex: sexRaw === "M" ? "male" : sexRaw === "F" ? "female" : null,
    studyInstanceUid: value(TAGS.studyInstanceUid) ?? null,
    seriesInstanceUid: value(TAGS.seriesInstanceUid) ?? null,
    sopInstanceUid: value(TAGS.sopInstanceUid) ?? null,
    // Дата исследования, а при её отсутствии — серии либо получения.
    studyDate:
      normalizeDicomDate(value(TAGS.studyDate)) ??
      normalizeDicomDate(value(TAGS.seriesDate)) ??
      normalizeDicomDate(value(TAGS.acquisitionDate)),
    studyTime: normalizeDicomTime(value(TAGS.studyTime)),
    modality: value(TAGS.modality) ?? null,
    manufacturer: value(TAGS.manufacturer) ?? null,
    institutionName: value(TAGS.institutionName) ?? null,
    studyDescription: value(TAGS.studyDescription) ?? null,
    seriesDescription: value(TAGS.seriesDescription) ?? null,
    bodyPartExamined: value(TAGS.bodyPartExamined) ?? null,
    sliceThickness: value(TAGS.sliceThickness) ?? null,
    pixelSpacing: value(TAGS.pixelSpacing) ?? null,
    characterSet: declaredCharset || null,
    transferSyntaxUid,
    warnings
  };

  if (!metadata.patientName && !metadata.patientId) {
    warnings.push(
      "В снимке нет ни ФИО, ни идентификатора пациента: привязать его к карточке автоматически не получится. Обычно так выглядят обезличенные снимки."
    );
  }

  return metadata;
}

/**
 * Признак того, что имя файла может быть снимком.
 *
 * Расширение у DICOM часто отсутствует вовсе: аппараты пишут файлы вида
 * «IM000001» или «1.2.840.113619.2.55.3.2831178355.8.1». Поэтому список
 * расширений — только подсказка для быстрого прохода, а решение принимает
 * looksLikeDicom по содержимому.
 */
export function mayBeDicomFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".dcm") || lower.endsWith(".dicom") || lower.endsWith(".ima")) return true;
  // Без расширения либо числовое имя из точек — типично для выгрузок аппаратов.
  if (!lower.includes(".")) return true;
  if (/^[\d.]+$/.test(lower)) return true;
  if (/^(im|ct|mr|pa|cr|dx)[\d_-]*$/i.test(lower)) return true;
  return false;
}
