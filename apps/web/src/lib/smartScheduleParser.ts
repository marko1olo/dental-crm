import { isFuzzyMatch, containsAnyFuzzyRoot } from "./stringUtils";

export interface ParsedScheduleData {
  intent: "CREATE" | "CANCEL" | "RESCHEDULE";
  timeStr: string | null; // e.g. "12:30"
  dateStr: string | null; // e.g. "YYYY-MM-DD"
  patientName: string | null;
  service: string | null;
}

export function parseScheduleDictationLocal(input: string): ParsedScheduleData {
  const result: ParsedScheduleData = { intent: "CREATE", timeStr: null, dateStr: null, patientName: null, service: null };
  let remaining = input.toLowerCase();

  // 0. Detect intent
  // "удаление" is a dental service, so "удали/удалить" means cancel, not "удал[а-я]*"
  // "снимок" is a service, so "сними/снимите" means cancel, not "сним[а-я]*"
  const cancelRegex = /\b(отмен[а-я]*|удали|удалите|удалить запись|убери|сними|снимите)\b/i;
  const rescheduleRegex = /\b(перенес[а-я]*|двин[а-я]*|сдвин[а-я]*)\b/i;
  
  if (cancelRegex.test(remaining)) {
    result.intent = "CANCEL";
    remaining = remaining.replace(cancelRegex, ' ');
  } else if (rescheduleRegex.test(remaining)) {
    result.intent = "RESCHEDULE";
    remaining = remaining.replace(rescheduleRegex, ' ');
  } else {
    // If we see "запиш" it's create, but we default to CREATE anyway
    remaining = remaining.replace(/\b(запиш[а-я]*|созда[а-я]*|добав[а-я]*)\b/ig, ' ');
  }

  // 1. Time extraction
  const timeRegex = /(?:^|\s)([0-1]?[0-9]|2[0-3])[\-:\.]([0-5][0-9])(?=\s|$)/;
  const timeMatch = remaining.match(timeRegex);
  if (timeMatch && timeMatch[1] && timeMatch[2]) {
    result.timeStr = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    remaining = remaining.replace(timeMatch[0], ' ');
  } else {
    const hourRegex = /(?:^|\s)(?:в|на)\s+([0-1]?[0-9]|2[0-3])\s*(часов|часа|ч)?(?=\s|$)/;
    const hourMatch = remaining.match(hourRegex);
    if (hourMatch && hourMatch[1]) {
      result.timeStr = `${hourMatch[1].padStart(2, '0')}:00`;
      remaining = remaining.replace(hourMatch[0], ' ');
    }
  }

  // 2. Date extraction (Relative and absolute)
  const today = new Date();
  const getOffsetDate = (days: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0] ?? "";
  };

  if (containsAnyFuzzyRoot(remaining, ["послезавтра"])) {
    result.dateStr = getOffsetDate(2);
    // remove the matched word (naive approach, assume it's there)
    remaining = remaining.replace(/(послезавтра)\S*/ig, " ");
  } else if (containsAnyFuzzyRoot(remaining, ["завтра"])) {
    result.dateStr = getOffsetDate(1);
    remaining = remaining.replace(/(завтра)\S*/ig, " ");
  } else if (containsAnyFuzzyRoot(remaining, ["сегодня", "щас", "сейчас"])) {
    result.dateStr = getOffsetDate(0);
    remaining = remaining.replace(/(сегодня|щас|сейчас)\S*/ig, " ");
  } else {
    // Check days of week
    const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "сред", "четверг", "пятниц", "суббот"];
    const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];
    
    for (let i = 0; i < WEEKDAYS.length; i++) {
      const day = WEEKDAYS[i] as string;
      if (containsAnyFuzzyRoot(remaining, [day])) {
        const targetIdx = WEEKDAY_INDEXES[i] as number;
        const currentIdx = today.getDay();
        let diff = targetIdx - currentIdx;
        if (diff <= 0) diff += 7;
        result.dateStr = getOffsetDate(diff);
        remaining = remaining.replace(new RegExp(`(?:^|\\s)(?:в|на|во)?\\s*${day}\\S*`, 'ig'), ' ');
        break;
      }
    }
  }

  // 3. Service extraction
  const SERVICES = [
    { key: "чистк", name: "Профессиональная гигиена" },
    { key: "гигиен", name: "Профессиональная гигиена" },
    { key: "air flow", name: "Профессиональная гигиена" },
    { key: "кариес", name: "Лечение кариеса" },
    { key: "пульпит", name: "Лечение пульпита" },
    { key: "периодонтит", name: "Лечение периодонтита" },
    { key: "удален", name: "Удаление зуба" },
    { key: "восьмерк", name: "Удаление зуба" },
    { key: "имплант", name: "Имплантация" },
    { key: "синус", name: "Синус-лифтинг" },
    { key: "коронк", name: "Коронка" },
    { key: "протез", name: "Протезирование" },
    { key: "винир", name: "Виниры" },
    { key: "брекет", name: "Брекеты" },
    { key: "элайнер", name: "Элайнеры" },
    { key: "ортодонт", name: "Ортодонтия" },
    { key: "консультаци", name: "Консультация" },
    { key: "осмотр", name: "Осмотр" },
    { key: "кт", name: "КЛКТ" },
    { key: "оптг", name: "ОПТГ" },
    { key: "снимок", name: "Диагностика (снимки)" },
    { key: "швы", name: "Снятие швов" }
  ];

  let foundService = false;
  for (const s of SERVICES) {
    if (containsAnyFuzzyRoot(remaining, [s.key])) {
      result.service = s.name;
      // remove the matched word
      const words = remaining.split(' ');
      remaining = words.filter(w => !w.toLowerCase().includes(s.key)).join(' ');
      foundService = true;
      break;
    }
  }

  // 4. Aggressive cleanup for patient name
  const stopWords = /\b(на|в|с|к|доктору|врачу|пациента|пациентка|пациент|ребенка|мальчика|девочку|прием|часов|часа|ч|пожалуйста|срочно|запись|ааа|эээ|короче|блин|типа|дня|утра|вечера|ночи|зуба|зуб)\b/gi;
  remaining = remaining.replace(stopWords, ' ');
  remaining = remaining.replace(/\s+/g, ' ').trim();
  
  if (remaining.length > 2) {
    result.patientName = remaining.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return result;
}
