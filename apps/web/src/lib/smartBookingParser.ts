import type { Dashboard, Appointment, StaffMember, Chair } from "@dental/shared";
import { isFuzzyMatch, isFuzzyRootMatch, containsAnyFuzzyRoot, textToNumbers } from "./stringUtils";
import { parsePatientDictationLocal } from "./smartPatientParser";

type AppointmentScheduleDraft = {
  action?: "create" | "cancel" | "reschedule";
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  doctorUserId: string;
  assistantUserId: string;
  chairId: string;
  status: Appointment["status"];
  startsAt: string;
  endsAt: string;
  reason: string;
  comment: string;
};

const DURATION_MAP: Record<string, number> = {
  "имплант": 120, "имплантаци": 120, "all-on-4": 240, "пульпит": 90, "периодонтит": 90,
  "кариес": 60, "удалени": 45, "восьмерк": 60, "гигиен": 45, "чистк": 45, 
  "профгигиен": 45, "ортодонт": 60, "брекет": 90, "элайнер": 60, "кт": 15, "клкт": 15, 
  "оптг": 15, "осмотр": 30, "консультаци": 30, "слепк": 30, "коронк": 60, "примерк": 30,
  "винир": 120, "синус": 120, "швы": 15, "снятие швов": 15, "лечени": 60, "лечение": 60,
  "терапи": 60, "отбеливани": 60, "пломб": 60
};

const REASON_NAMES: Record<string, string> = {
  "имплант": "Имплантация", "имплантаци": "Имплантация", "all-on-4": "All-on-4", "пульпит": "Пульпит", "периодонтит": "Периодонтит",
  "кариес": "Кариес", "удалени": "Удаление зуба", "восьмерк": "Удаление зуба мудрости", 
  "гигиен": "Профгигиена", "чистк": "Профгигиена", "профгигиен": "Профгигиена", 
  "ортодонт": "Ортодонтия", "брекет": "Брекеты", "элайнер": "Элайнеры",
  "кт": "КЛКТ", "клкт": "КЛКТ", "оптг": "ОПТГ", "осмотр": "Осмотр",
  "консультаци": "Консультация", "слепк": "Слепки", "коронк": "Коронка", "примерк": "Примерка",
  "винир": "Виниры", "синус": "Синус-лифтинг", "швы": "Снятие швов", "снятие швов": "Снятие швов",
  "лечени": "Лечение зуба", "лечение": "Лечение зуба", "терапи": "Терапия", "отбеливани": "Отбеливание",
  "пломб": "Установка пломбы"
};

const MONTHS: Record<string, number> = {
  "янв": 0, "фев": 1, "мар": 2, "апр": 3, "мая": 4, "май": 4,
  "июн": 5, "июл": 6, "авг": 7, "сен": 8, "окт": 9, "ноя": 10, "дек": 11
};

export function smartBookingParser(
  text: string,
  dashboard: Dashboard
): Partial<AppointmentScheduleDraft> {
  const normalizedInput = textToNumbers(text);
  const parsed: Partial<AppointmentScheduleDraft> = {};
  let remaining = " " + normalizedInput.toLowerCase().trim() + " ";
  
  const words = remaining.split(/[^а-яёa-z0-9]+/i).filter((w) => w.length > 0);
  
  const staff = dashboard.clinicSettings?.staff || [];
  const doctors = staff.filter((u: StaffMember) => u.active && (u.role === "doctor" || u.role === "owner"));
  const assistants = staff.filter((u: StaffMember) => u.active && u.role === "assistant");
  const patients = dashboard.patients || [];
  const chairs = dashboard.clinicSettings?.chairs || [];

  const foundDocs: { id: string, score: number, matches: number, indexes: number[] }[] = [];
  const foundPats: { id: string, score: number, matches: number, indexes: number[] }[] = [];
  const foundAssists: { id: string, score: number, matches: number, indexes: number[] }[] = [];
  const foundChairs: { id: string, score: number, indexes: number[] }[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    if (word.length < 3 && !/^\d$/.test(word)) continue;

    const prev = (i > 0 ? words[i-1] : "") ?? "";
    const prevPrev = (i > 1 ? words[i-2] : "") ?? "";

    // Match Doctors
    for (const doc of doctors) {
      const parts = doc.fullName.toLowerCase().split(' ');
      const specs = doc.specialties || [];
      const matchWords = [...parts, ...specs.flatMap((s: string) => s.toLowerCase().split(' '))];
      
      if (matchWords.some((p: string) => isFuzzyRootMatch(word, p))) {
        let score = 1;
        let matches = 1;
        const indexes = [i];
        if (i + 1 < words.length && matchWords.some((p: string) => isFuzzyRootMatch(words[i+1]!, p) && !isFuzzyRootMatch(word, p))) {
          score += 50;
          matches = 2;
          indexes.push(i+1);
        }
        
        // Context boosts for DOCTOR
        if (["к", "ко", "врачу", "доктору", "док", "стоматологу", "врач"].includes(prev) || ["к", "ко"].includes(prevPrev)) score += 200; 
        if (["пациент", "запиши", "записать"].includes(prev)) score -= 100; // Penalize if it's explicitly called a patient
        
        const existing = foundDocs.find(d => d.id === doc.id);
        if (!existing || existing.score < score) {
          if (existing) foundDocs.splice(foundDocs.indexOf(existing), 1);
          foundDocs.push({ id: doc.id, score, matches, indexes });
        }
      }
    }

    // Match Assistants
    for (const ast of assistants) {
      const parts = ast.fullName.toLowerCase().split(' ');
      if (parts.some((p: string) => isFuzzyMatch(word, p))) {
        let score = 1;
        let matches = 1;
        const indexes = [i];
        if (i + 1 < words.length && parts.some((p: string) => isFuzzyMatch(words[i+1]!, p) && !isFuzzyMatch(word, p))) {
          score += 50;
          matches = 2;
          indexes.push(i+1);
        }
        if (["ассистент", "медсестра", "с"].includes(prev)) score += 100;
        if (["пациент", "запиши", "записать", "к", "ко"].includes(prev)) score -= 100;
        
        const existing = foundAssists.find(d => d.id === ast.id);
        if (!existing || existing.score < score) {
          if (existing) foundAssists.splice(foundAssists.indexOf(existing), 1);
          foundAssists.push({ id: ast.id, score, matches, indexes });
        }
      }
    }

    // Match Patients
    for (const pat of patients) {
      const parts = pat.fullName.toLowerCase().split(' ');
      if (parts.some((p: string) => isFuzzyMatch(word, p))) {
        let score = 1;
        let matches = 1;
        const indexes = [i];
        if (i + 1 < words.length && parts.some((p: string) => isFuzzyMatch(words[i+1]!, p) && !isFuzzyMatch(word, p))) {
          score += 50;
          matches = 2;
          indexes.push(i+1);
        }
        if (["запиши", "записать", "пациент", "пациента", "ребенка", "мальчика", "девочку"].includes(prev)) score += 200;
        if (["отмени", "удали", "перенеси"].includes(prev)) score += 200; // Action target is usually patient
        if (["к", "ко"].includes(prev) || ["к", "ко"].includes(prevPrev)) score -= 200; // It's a doctor
        
        const existing = foundPats.find(p => p.id === pat.id);
        if (!existing || existing.score < score) {
          if (existing) foundPats.splice(foundPats.indexOf(existing), 1);
          foundPats.push({ id: pat.id, score, matches, indexes });
        }
      }
    }

    // Match Chairs
    for (const chair of chairs) {
      if (!chair.active) continue;
      const parts = chair.name.toLowerCase().split(' ');
      if (parts.some((p: string) => isFuzzyMatch(word, p))) {
        let score = 1;
        const indexes = [i];
        if (["кресло", "кабинет"].includes(prev)) score += 100;
        
        const existing = foundChairs.find(c => c.id === chair.id);
        if (!existing || existing.score < score) {
          if (existing) foundChairs.splice(foundChairs.indexOf(existing), 1);
          foundChairs.push({ id: chair.id, score, indexes });
        }
      }
    }
  }

  // Conflict resolution
  foundDocs.sort((a, b) => b.score - a.score);
  foundPats.sort((a, b) => b.score - a.score);
  foundAssists.sort((a, b) => b.score - a.score);
  foundChairs.sort((a, b) => b.score - a.score);

  const bestDoc = foundDocs[0];
  const bestPat = foundPats[0];
  
  // If they share indexes (same word parsed as both doc and pat)
  if (bestDoc && bestPat && bestDoc.indexes.some(idx => bestPat.indexes.includes(idx))) {
    if (bestDoc.score > bestPat.score) {
      parsed.doctorUserId = bestDoc.id;
      const otherPat = foundPats.find(p => !p.indexes.some(idx => bestDoc.indexes.includes(idx)));
      if (otherPat) parsed.patientId = otherPat.id;
    } else {
      parsed.patientId = bestPat.id;
      const otherDoc = foundDocs.find(d => !d.indexes.some(idx => bestPat.indexes.includes(idx)));
      if (otherDoc) parsed.doctorUserId = otherDoc.id;
    }
  } else {
    // If they don't overlap, use both
    if (bestDoc && bestDoc.score >= 0) parsed.doctorUserId = bestDoc.id;
    if (bestPat && bestPat.score >= 0) parsed.patientId = bestPat.id;
  }

  // Same for assistant vs patient
  const bestAssist = foundAssists[0];
  if (bestAssist && bestAssist.score >= 0) {
    // Prevent patient from overriding assistant
    if (!parsed.patientId || !bestAssist.indexes.some(idx => bestPat?.indexes.includes(idx) || false)) {
       parsed.assistantUserId = bestAssist.id;
    }
  }

  if (foundChairs.length > 0) parsed.chairId = foundChairs[0]!.id;

  // REMOVE EXTRACTED NAMES FROM REMAINING TO KEEP COMMENT CLEAN
  const removeWordsSafely = (wordsToRemove: string[]) => {
    wordsToRemove.forEach(p => {
      if (p.length > 3) {
        remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])${p.substring(0, Math.max(3, p.length-2))}[а-я]*`, 'ig'), ' ');
      } else {
        remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])${p}(?:[^а-яёa-z0-9]|$)`, 'ig'), ' ');
      }
    });
  };

  if (parsed.doctorUserId) {
    const doc = doctors.find((d: StaffMember) => d.id === parsed.doctorUserId);
    if (doc) removeWordsSafely([...doc.fullName.split(' '), ...(doc.specialties || [])]);
  }
  if (parsed.patientId) {
    const pat = patients.find((p: any) => p.id === parsed.patientId);
    if (pat) removeWordsSafely(pat.fullName.split(' '));
  }
  if (parsed.assistantUserId) {
    const ast = assistants.find((a: StaffMember) => a.id === parsed.assistantUserId);
    if (ast) removeWordsSafely([...ast.fullName.split(' '), ...(ast.specialties || [])]);
  }
  if (parsed.chairId) {
    const chair = chairs.find((c: Chair) => c.id === parsed.chairId);
    if (chair) removeWordsSafely(chair.name.split(' '));
  }

  // Extract Actions
  const cancelRegex = /(?:^|[^а-яёa-z0-9])(отмен[а-я]*|удали|удалите|удалить запись|убери|сними|снимите)(?:[^а-яёa-z0-9]|$)/i;
  const isCancel = cancelRegex.test(remaining);
  if (isCancel) {
    remaining = remaining.replace(cancelRegex, ' ');
    parsed.action = "cancel";
  }
  
  const rescheduleRegex = /(?:^|[^а-яёa-z0-9])(перенес[а-я]*|перезапиши|перезаписать|перекинь|сдвинь)(?:[^а-яёa-z0-9]|$)/i;
  const isReschedule = rescheduleRegex.test(remaining);
  if (isReschedule) {
    remaining = remaining.replace(rescheduleRegex, ' ');
    parsed.action = "reschedule";
  }

  if (!parsed.action) parsed.action = "create";

  let durationMinutes = 60;
  let explicitDurationFound = false;
  let matchedReasonKey = "";

  // Time range detection FIRST ("с 14:00 до 15:30")
  let rangeStartHour = -1, rangeStartMin = -1;
  let rangeEndHour = -1, rangeEndMin = -1;
  const rangeRegex = /(?:с|от)\s+([01]?[0-9]|2[0-3])[:\-\.]?([0-5][0-9])?\s+(?:до|по)\s+([01]?[0-9]|2[0-3])[:\-\.]?([0-5][0-9])?(?=\s|$|[^а-яёa-z0-9])/i;
  const rangeMatch = remaining.match(rangeRegex);

  if (rangeMatch && !isCancel) {
    rangeStartHour = parseInt(rangeMatch[1]!, 10);
    rangeStartMin = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
    rangeEndHour = parseInt(rangeMatch[3]!, 10);
    rangeEndMin = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0;
    
    let totalMins = (rangeEndHour * 60 + rangeEndMin) - (rangeStartHour * 60 + rangeStartMin);
    if (totalMins < 0) totalMins += 24 * 60; // crossed midnight
    durationMinutes = totalMins;
    explicitDurationFound = true;
    remaining = remaining.replace(rangeMatch[0], ' ');
  }

  if (!isCancel && !explicitDurationFound) {
    // Explicit duration parsing
    const minsMatch = remaining.match(/(?:^|[^а-яёa-z0-9])(на\s+)?([1-9][0-9]*)\s*(минут|мин)(?:[^а-яёa-z0-9]|$)/i);
    const hrsMatch = remaining.match(/(?:^|[^а-яёa-z0-9])(на\s+)?([1-9][0-9]?)\s*(час|часов|часа)(?:[^а-яёa-z0-9]|$)/i);
    
    if (containsAnyFuzzyRoot(remaining, ["на полчаса", "на пол часа", "полчаса"])) {
      durationMinutes = 30;
      explicitDurationFound = true;
      remaining = remaining.replace(/(?:^|[^а-яёa-z0-9])(на\s+)?(полчаса|пол часа)(?:[^а-яёa-z0-9]|$)/ig, ' ');
    } else if (containsAnyFuzzyRoot(remaining, ["на полтора часа", "полтора часа"])) {
      durationMinutes = 90;
      explicitDurationFound = true;
      remaining = remaining.replace(/(?:^|[^а-яёa-z0-9])(на\s+)?(полтора часа)(?:[^а-яёa-z0-9]|$)/ig, ' ');
    } else if (minsMatch) {
      durationMinutes = parseInt(minsMatch[2]!, 10);
      explicitDurationFound = true;
      remaining = remaining.replace(minsMatch[0], ' ');
    } else if (hrsMatch) {
      durationMinutes = parseInt(hrsMatch[2]!, 10) * 60;
      explicitDurationFound = true;
      remaining = remaining.replace(hrsMatch[0], ' ');
    } else if (containsAnyFuzzyRoot(remaining, ["на час"])) {
      durationMinutes = 60;
      explicitDurationFound = true;
      remaining = remaining.replace(/(?:^|[^а-яёa-z0-9])(на час)(?:[^а-яёa-z0-9]|$)/ig, ' ');
    }
  }

  if (!isCancel) {
    for (const [key, duration] of Object.entries(DURATION_MAP)) {
      if (containsAnyFuzzyRoot(remaining, [key])) {
        if (key.length > matchedReasonKey.length) {
          matchedReasonKey = key;
          if (!explicitDurationFound) durationMinutes = duration;
        }
      }
    }
  }

  if (matchedReasonKey && !isCancel) {
    parsed.reason = REASON_NAMES[matchedReasonKey] || (matchedReasonKey.charAt(0).toUpperCase() + matchedReasonKey.slice(1));
    remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])\\S*${matchedReasonKey}\\S*(?:[^а-яёa-z0-9]|$)`, 'ig'), ' ');
  }

  const now = new Date();
  let targetDate = new Date(now);
  let dateFound = false;

  const dateWords = [
    { word: "послезавтра", addDays: 2 },
    { word: "завтра", addDays: 1 },
    { word: "сегодня", addDays: 0 },
    { word: "щас", addDays: 0 },
    { word: "сейчас", addDays: 0 }
  ];

  for (const dw of dateWords) {
    if (containsAnyFuzzyRoot(remaining, [dw.word])) {
      targetDate.setDate(now.getDate() + dw.addDays);
      dateFound = true;
      remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])(${dw.word})(?:[^а-яёa-z0-9]|$)`, 'ig'), ' ');
      break;
    }
  }

  if (!dateFound) {
    const explicitDateMatch = remaining.match(/(?:на\s+)?([1-9]|[12][0-9]|3[01])\s+([а-я]{3,8})/i) || remaining.match(/(?:на\s+)?([1-9]|[12][0-9]|3[01])\s+число/i);
    if (explicitDateMatch) {
      const day = parseInt(explicitDateMatch[1]!, 10);
      const monthStr = explicitDateMatch[2] ? explicitDateMatch[2]!.slice(0, 3).toLowerCase() : undefined;
      
      if (monthStr && MONTHS[monthStr] !== undefined) {
        targetDate.setMonth(MONTHS[monthStr]!);
      }
      targetDate.setDate(day);
      
      if (targetDate.getTime() < now.getTime() - 86400000 && targetDate.getMonth() < now.getMonth()) {
        targetDate.setFullYear(now.getFullYear() + 1);
      }
      dateFound = true;
      remaining = remaining.replace(explicitDateMatch[0], ' ');
    } else {
      const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "сред", "четверг", "пятниц", "суббот"];
      const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];
      for (let i = 0; i < WEEKDAYS.length; i++) {
        const dayName = WEEKDAYS[i] as string;
        if (containsAnyFuzzyRoot(remaining, [dayName])) {
          const currentDay = targetDate.getDay();
          let diff = (WEEKDAY_INDEXES[i] as number) - currentDay;
          if (diff <= 0) diff += 7;
          targetDate.setDate(now.getDate() + diff);
          dateFound = true;
          remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])(?:в|на|во|со)?\\s*${dayName}(?:[^а-яёa-z0-9]|$)`, 'ig'), ' ');
          break;
        }
      }
    }
  }

  let hours = 8;
  let minutes = 0;
  let timeFound = false;

  if (rangeStartHour !== -1) {
    hours = rangeStartHour;
    minutes = rangeStartMin;
    timeFound = true;
  } else {
    const timeRegex = /(?:^|\s|\b)(?:в\s+)?([01]?[0-9]|2[0-3])[:\-\.]([0-5][0-9])(?=\s|$|\b)/i;
    const timeRegexSpace = /(?:^|\s)(?:в|на)?\s*([0-1]?[0-9]|2[0-3])\s+([0-5][0-9])(?=\s|$)/;
    const halfRegex = /(?:(?:в|на|к)\s+)?(?:пол[\s\-]*|в\s+половину\s+|половина\s+)([1-9]|1[0-2]|первого|второго|третьего|четвертого|пятого|шестого|седьмого|восьмого|девятого|десятого|одиннадцатого|двенадцатого)(?=\s|$|[^а-яё0-9])/i;
    const hourOnlyRegex = /(?:(?:в|на|к)\s+)?([01]?[0-9]|2[0-3])(?:\s*(часов|утра|вечера|вечером|дня))(?=\s|$)/i;
    const pureHourRegex = /(?:в\s+)([01]?[0-9]|2[0-3])(?=\s|$|[^а-яёa-z0-9])/i;

    const halfMatch = remaining.match(halfRegex);
    const timeMatch = remaining.match(timeRegex);
    const timeMatchSpace = remaining.match(timeRegexSpace);
    const hourMatch = remaining.match(hourOnlyRegex);
    const pureHourMatch = remaining.match(pureHourRegex);
    
    if (halfMatch) {
      const halfMap: Record<string, number> = {
        "1": 12, "первого": 12, "2": 13, "второго": 13, "3": 14, "третьего": 14, "4": 15, "четвертого": 15,
        "5": 16, "пятого": 16, "6": 17, "шестого": 17, "7": 18, "седьмого": 18, "8": 19, "восьмого": 19,
        "9": 9, "девятого": 9, "10": 10, "десятого": 10, "11": 11, "одиннадцатого": 11, "12": 12, "двенадцатого": 12
      };
      hours = halfMap[halfMatch[1]!.toLowerCase()] || 12;
      minutes = 30;
      timeFound = true;
      remaining = remaining.replace(halfMatch[0], ' ');
    } else if (timeMatch) {
      hours = parseInt(timeMatch[1]!, 10);
      minutes = parseInt(timeMatch[2]!, 10);
      timeFound = true;
      remaining = remaining.replace(timeMatch[0], ' ');
    } else if (timeMatchSpace) {
      hours = parseInt(timeMatchSpace[1]!, 10);
      minutes = parseInt(timeMatchSpace[2]!, 10);
      timeFound = true;
      remaining = remaining.replace(timeMatchSpace[0], ' ');
    } else if (hourMatch) {
      hours = parseInt(hourMatch[1]!, 10);
      minutes = 0;
      timeFound = true;
      if ((hourMatch[0].includes("вечера") || hourMatch[0].includes("вечером")) && hours < 12) hours += 12;
      if (hourMatch[0].includes("дня") && hours < 12 && hours >= 1) hours += 12;
      if (hours >= 1 && hours <= 8 && !hourMatch[0].includes("утра")) hours += 12; 
      remaining = remaining.replace(hourMatch[0], ' ');
    } else if (pureHourMatch) {
      hours = parseInt(pureHourMatch[1]!, 10);
      if (hours >= 1 && hours <= 8) hours += 12;
      minutes = 0;
      timeFound = true;
      remaining = remaining.replace(pureHourMatch[0], ' ');
    }
  }

  if (dateFound || timeFound) {
    targetDate.setHours(hours, minutes, 0, 0);
    parsed.startsAt = targetDate.toISOString();
    parsed.endsAt = new Date(targetDate.getTime() + durationMinutes * 60000).toISOString();
  }

  if (isCancel) parsed.status = "cancelled";

  remaining = remaining.replace(/[,;.!?]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const stopWords = /(?:^|[^а-яёa-z0-9])(нового|новому|зовут|новый|новая|запиши|записать|перенеси|перезапиши|отмени|пац(?:иент[ауоке]?)?|пожалуйста|доктору|врачу|врач|ассистент|медсестра|кресло|прием|срочно|запись|номер|в|на|к|ко|с|до|по|от|утра|дня|вечера|вечером|часов|минут|телефон|время|жалоба|после|обеда|хирург[уа]?|терапевт[уа]?|ортодонт[уа]?|ортопед[уа]?|имплантолог[уа]?)(?:[^а-яёa-z0-9]|$)/gi;
  remaining = remaining.replace(stopWords, ' ');
  remaining = remaining.replace(stopWords, ' ');

  if (!parsed.patientId && parsed.action !== "cancel") {
    const newPatient = parsePatientDictationLocal(remaining);
    if (newPatient.fullName) parsed.patientName = newPatient.fullName;
    if (newPatient.phone) parsed.patientPhone = newPatient.phone;
    if (parsed.patientName) {
      const npWords = parsed.patientName.toLowerCase().split(' ').filter(w => w.length > 2);
      npWords.forEach(w => { remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])${w}(?:[^а-яёa-z0-9]|$)`, 'ig'), ' '); });
    }
    if (parsed.patientPhone) {
      const rawPhone = parsed.patientPhone.replace(/\D/g, '');
      const last10 = rawPhone.slice(-10);
      remaining = remaining.replace(new RegExp(`(?:^|[^0-9])(?:8|\\+7)?\\s*${last10.substring(0,3)}[- ]?${last10.substring(3,6)}[- ]?${last10.substring(6,8)}[- ]?${last10.substring(8,10)}(?:[^0-9]|$)`, 'ig'), ' ');
      remaining = remaining.replace(new RegExp(last10, 'ig'), ' ');
    }
  }

  remaining = remaining.replace(/\s+/g, ' ').trim();
  
  if (remaining.length > 0 && !isCancel) {
    parsed.comment = remaining.charAt(0).toUpperCase() + remaining.slice(1);
  }

  return parsed;
}
