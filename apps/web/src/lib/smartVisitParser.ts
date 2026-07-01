import { containsAnyFuzzyRoot, textToNumbers } from "./stringUtils";

export interface ParsedVisitData {
  toothUpdates: { code: string; state: string }[];
  emkUpdates: {
    complaint?: string;
    anamnesis?: string;
    objectiveStatus?: string;
    diagnosis?: string;
    treatmentPlan?: string;
  };
}

export function parseVisitDictationLocal(input: string): ParsedVisitData {
  const result: ParsedVisitData = { toothUpdates: [], emkUpdates: {} };
  const normalizedInput = textToNumbers(input);
  const lower = normalizedInput.toLowerCase();

  // Extract teeth (2-digit numbers starting with 1-4 or 5-8 for kids)
  // Negative lookahead prevents matching "15 мая", "12 часов", "14:30", "15 руб"
  const teethMatches = input.match(/\b([1-4][1-8]|[5-8][1-5])\b(?!\s*[:.\-]\s*\d+)(?!\s*(?:часов|часа|ч|утра|дня|вечера|мин|минут|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|руб|рублей|тыс|лет|года|год))/gi);
  const teeth = teethMatches ? Array.from(new Set(teethMatches)) : [];

  // Keywords and patterns
  // Keywords and patterns
  const isCaries = containsAnyFuzzyRoot(lower, ["кариес", "дырк", "полост", "клиновид"]);
  const isPulpitis = containsAnyFuzzyRoot(lower, ["пульпит", "нерв", "эндо", "канал"]);
  const isPeriodontitis = containsAnyFuzzyRoot(lower, ["периодонтит", "кист", "гранулем"]);
  const isExtraction = containsAnyFuzzyRoot(lower, ["удален", "рвать", "удалил", "экстракц", "восьмерк"]);
  const isHygiene = containsAnyFuzzyRoot(lower, ["гигиен", "чистк", "air flow", "камн", "налет"]);
  const isImplant = containsAnyFuzzyRoot(lower, ["имплант", "хирурги", "синус", "нктр", "остеопласт"]);
  const isCrown = containsAnyFuzzyRoot(lower, ["коронк", "протез", "ортопеди", "винир", "вкладк"]);

  if (teeth.length > 0) {
    let state = "planned";
    if (isExtraction || isCaries || isPulpitis || isPeriodontitis) state = "treatment";
    if (containsAnyFuzzyRoot(lower, ["канал", "эндо"])) state = "treatment";
    if (containsAnyFuzzyRoot(lower, ["наблюд"])) state = "watch";
    if (isCrown) state = "prosthetics";
    if (isImplant) state = "implant";
    if (containsAnyFuzzyRoot(lower, ["готов", "заверш", "вылечил", "поставил"])) state = "done";
    if (isExtraction && containsAnyFuzzyRoot(lower, ["удалил"])) state = "missing";
    
    teeth.forEach(t => result.toothUpdates.push({ code: t, state }));
  } else if (lower.match(/\b(вч|верхняя челюсть|на верхней)\b/)) {
     // If jaw is specified but no tooth, we could apply to a region, but for now just tag it.
  }

  // Pre-fill based on inferred conditions
  if (isPulpitis) {
    result.emkUpdates.diagnosis = "К04.0 Острый пульпит (или обострение хронического)";
    result.emkUpdates.complaint = "Самопроизвольные, ночные боли, сильные боли от температурных раздражителей.";
    result.emkUpdates.objectiveStatus = "Глубокая кариозная полость, сообщающаяся с полостью зуба, зондирование резко болезненно. Перкуссия безболезненна.";
    result.emkUpdates.treatmentPlan = "Анестезия, изоляция (коффердам), экстирпация пульпы, механическая и медикаментозная обработка корневых каналов, временная/постоянная обтурация.";
  } else if (isPeriodontitis) {
    result.emkUpdates.diagnosis = "К04.5 Хронический апикальный периодонтит";
    result.emkUpdates.complaint = "Боли при накусывании, чувство «выросшего зуба».";
    result.emkUpdates.objectiveStatus = "Зуб изменен в цвете, кариозная полость глубокая, зондирование безболезненно. Перкуссия болезненна. На рентгенограмме разряжение костной ткани в области апекса.";
    result.emkUpdates.treatmentPlan = "Анестезия, изоляция (коффердам), раскрытие полости зуба, медикаментозная обработка каналов, временное пломбирование пастой на основе гидроксида кальция.";
  } else if (isExtraction) {
    result.emkUpdates.diagnosis = "К04.5 Хронический апикальный периодонтит (показание к удалению)";
    result.emkUpdates.complaint = "Разрушение зуба, боли, невозможность восстановления.";
    result.emkUpdates.objectiveStatus = "Коронковая часть зуба разрушена более чем на 2/3, подвижность, перкуссия болезненна.";
    result.emkUpdates.treatmentPlan = "Анестезия, атравматичное удаление зуба, кюретаж лунки, гемостаз, швы, рекомендации.";
  } else if (isCaries) {
    result.emkUpdates.diagnosis = "К02.1 Кариес дентина";
    result.emkUpdates.complaint = "Застревание пищи, кратковременные боли от сладкого и холодного.";
    result.emkUpdates.objectiveStatus = "Глубокая кариозная полость в пределах плащевого/околопульпарного дентина, зондирование болезненно по эмалево-дентинной границе.";
    result.emkUpdates.treatmentPlan = "Анестезия, изоляция (коффердам), препарирование, медикаментозная обработка, адгезивный протокол, реставрация композитным материалом, шлифовка, полировка.";
  } else if (isHygiene) {
    result.emkUpdates.diagnosis = "К05.1 Хронический гингивит";
    result.emkUpdates.complaint = "Кровоточивость десен при чистке зубов, наличие налета.";
    result.emkUpdates.objectiveStatus = "Над- и поддесневые зубные отложения, пигментированный налет, маргинальная десна отечна, гиперемирована, кровоточивость при зондировании.";
    result.emkUpdates.treatmentPlan = "Аппликационная анестезия, ультразвуковой скейлинг, Air Flow, полировка пастами, фторирование, обучение индивидуальной гигиене полости рта.";
  } else if (isCrown) {
    result.emkUpdates.diagnosis = "К08.3 Разрушение зуба (показание к протезированию)";
    result.emkUpdates.complaint = "Эстетический/функциональный дефект, разрушение коронковой части зуба.";
    result.emkUpdates.objectiveStatus = "Коронковая часть зуба разрушена. Зуб ранее депульпирован. Корневые каналы обтурированы плотно до верхушки.";
    result.emkUpdates.treatmentPlan = "Снятие оттисков, регистрация прикуса. Препарирование зуба. Фиксация временной коронки. Изготовление и фиксация постоянной ортопедической конструкции.";
  } else if (isImplant) {
    result.emkUpdates.diagnosis = "К08.1 Частичная потеря зубов";
    result.emkUpdates.complaint = "Отсутствие зуба, нарушение функции жевания.";
    result.emkUpdates.objectiveStatus = "Отсутствие зуба в зубном ряду. Атрофия альвеолярного гребня в пределах нормы. Слизистая без патологических изменений. По данным КЛКТ объем костной ткани достаточный.";
    result.emkUpdates.treatmentPlan = "Анестезия, разрез, отслаивание лоскута. Формирование ложа под имплантат. Установка дентального имплантата. Установка заглушки/формирователя десны. Ушивание раны.";
  }

  // Very naive NLP sentence extraction to override/append to defaults
  const sentences = normalizedInput.split(/[.?!;]/).map(s => s.trim()).filter(Boolean);
  let customComplaints: string[] = [];
  let customObjective: string[] = [];
  let customTreatment: string[] = [];
  
  for (const sentence of sentences) {
    const sl = sentence.toLowerCase();
    if (containsAnyFuzzyRoot(sl, ["жалоб", "болит", "ноет", "реакция на", "чувствительн", "отколол"])) {
      customComplaints.push(sentence);
    } else if (containsAnyFuzzyRoot(sl, ["объективно", "статус", "налет", "полость", "перкуссия", "слизист", "кт", "сним"])) {
      customObjective.push(sentence);
    } else if (containsAnyFuzzyRoot(sl, ["лечени", "план", "анестез", "удалил", "поставил", "рекоменд", "препарир", "пломб"])) {
      customTreatment.push(sentence);
    } else if (containsAnyFuzzyRoot(sl, ["диагноз"])) {
      const d = sentence.replace(/диагноз\s*[:\-]*\s*/i, '').trim();
      if (d.length > 3) result.emkUpdates.diagnosis = d.charAt(0).toUpperCase() + d.slice(1);
    }
  }

  if (customComplaints.length > 0) {
    const combined = customComplaints.map(s => s.replace(/жалобы\s*[:\-]*\s*/i, '')).join(". ");
    result.emkUpdates.complaint = combined.charAt(0).toUpperCase() + combined.slice(1) + ".";
  }

  if (customObjective.length > 0) {
    const combined = customObjective.map(s => s.replace(/объективно\s*[:\-]*\s*/i, '')).join(". ");
    // Append rather than replace if we have a strong template, but for now replace to favor real dictation
    result.emkUpdates.objectiveStatus = combined.charAt(0).toUpperCase() + combined.slice(1) + ".";
  }

  if (customTreatment.length > 0) {
    const combined = customTreatment.map(s => s.replace(/лечение\s*[:\-]*\s*/i, '')).join(". ");
    result.emkUpdates.treatmentPlan = combined.charAt(0).toUpperCase() + combined.slice(1) + ".";
  }

  // Fallback for simple pain without "жалобы" keyword if still empty
  if (!result.emkUpdates.complaint && containsAnyFuzzyRoot(lower, ["болит", "ноет"])) {
    const painMatch = normalizedInput.match(/([^.,;]*?(?:болит|ноет)[^.,;]*)/i);
    if (painMatch && painMatch[1]) {
      result.emkUpdates.complaint = painMatch[1].trim();
    }
  }

  return result;
}
