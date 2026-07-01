import { isFuzzyMatch, containsAnyFuzzyRoot, textToNumbers } from "./stringUtils";

export interface ParsedScheduleData {
  intent: "CREATE" | "CANCEL" | "RESCHEDULE";
  timeStr: string | null; // e.g. "12:30"
  dateStr: string | null; // e.g. "YYYY-MM-DD"
  patientName: string | null;
  service: string | null;
}

export function parseScheduleDictationLocal(input: string): ParsedScheduleData {
  const result: ParsedScheduleData = {
    intent: "CREATE",
    timeStr: null,
    dateStr: null,
    patientName: null,
    service: null
  };
  
  const normalizedInput = textToNumbers(input);
  let remaining = " " + normalizedInput.toLowerCase() + " ";

  // 0. Detect intent
  // "удаление" is a dental service, so "удали/удалить" means cancel, not "удал[а-я]*"
  // Negative lookahead: "удалить" is cancel, UNLESS it's "удалить зуб/восьмерку/и т.д."
  const cancelRegex = /\b(отмен[а-я]*|удали(?!\w)|удалите(?!\w)|удалить(?!\s+(?:зуб|восьмерк|семерк|шестерк|пятерк|четверк|тройк|двойк|единичк|корень|кист|имплант|нерв|капюшон))|убери|сними(?!\w)|снимите(?!\w))\b/i;
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
  const timeRegexSpace = /(?:^|\s)(?:в|на)?\s*([0-1]?[0-9]|2[0-3])\s+([0-5][0-9])(?=\s|$)/; // catches "3 30" (три тридцать)
  const hourRegex = /(?:^|\s)(?:в|на)\s+([0-1]?[0-9]|2[0-3])\s*(часов|часа|ч)?(?=\s|$)/;
  
  const timeMatch = remaining.match(timeRegex);
  const timeMatchSpace = remaining.match(timeRegexSpace);
  const hourMatch = remaining.match(hourRegex);
  
  if (timeMatch && timeMatch[1] && timeMatch[2]) {
    result.timeStr = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    remaining = remaining.replace(timeMatch[0], ' ');
  } else if (timeMatchSpace && timeMatchSpace[1] && timeMatchSpace[2]) {
    result.timeStr = `${timeMatchSpace[1].padStart(2, '0')}:${timeMatchSpace[2]}`;
    remaining = remaining.replace(timeMatchSpace[0], ' ');
  } else if (hourMatch && hourMatch[1]) {
    result.timeStr = `${hourMatch[1].padStart(2, '0')}:00`;
    remaining = remaining.replace(hourMatch[0], ' ');
  }

  // 2. Date extraction (Relative and absolute)
  const today = new Date();
  const getOffsetDate = (days: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0] ?? "";
  };

  const MONTHS: Record<string, number> = {
    "янв": 0, "фев": 1, "мар": 2, "апр": 3, "мая": 4, "май": 4,
    "июн": 5, "июл": 6, "авг": 7, "сен": 8, "окт": 9, "ноя": 10, "дек": 11
  };

  if (containsAnyFuzzyRoot(remaining, ["послезавтра"])) {
    result.dateStr = getOffsetDate(2);
    remaining = remaining.replace(/(послезавтра)\S*/ig, " ");
  } else if (containsAnyFuzzyRoot(remaining, ["завтра"])) {
    result.dateStr = getOffsetDate(1);
    remaining = remaining.replace(/(завтра)\S*/ig, " ");
  } else if (containsAnyFuzzyRoot(remaining, ["сегодня", "щас", "сейчас"])) {
    result.dateStr = getOffsetDate(0);
    remaining = remaining.replace(/(сегодня|щас|сейчас)\S*/ig, " ");
  } else {
    // Check explicit date "15 мая"
    const explicitDateMatch = remaining.match(/([1-9]|[12][0-9]|3[01])\s+([а-я]{3,8})/i);
    let dateFound = false;
    
    if (explicitDateMatch) {
      const day = parseInt(explicitDateMatch[1]!, 10);
      const monthStr = explicitDateMatch[2]!.slice(0, 3).toLowerCase();
      if (MONTHS[monthStr] !== undefined) {
        const targetDate = new Date(today);
        targetDate.setMonth(MONTHS[monthStr]!);
        targetDate.setDate(day);
        if (targetDate.getTime() < today.getTime() - 86400000) {
          targetDate.setFullYear(today.getFullYear() + 1);
        }
        result.dateStr = targetDate.toISOString().split('T')[0] ?? "";
        remaining = remaining.replace(explicitDateMatch[0], ' ');
        dateFound = true;
      }
    }
    
    if (!dateFound) {
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
