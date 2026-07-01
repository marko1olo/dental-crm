import type { Dashboard, Appointment } from "@dental/shared";
import { isFuzzyMatch, containsAnyFuzzyRoot, textToNumbers } from "./stringUtils";

type AppointmentScheduleDraft = {
  patientId: string;
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
  "имплантаци": 120, "all-on-4": 240, "пульпит": 90, "периодонтит": 90,
  "кариес": 60, "удаление": 45, "восьмерк": 60, "гигиен": 45, "чистк": 45, 
  "профгигиен": 45, "ортодонт": 60, "брекет": 90, "элайнер": 60, "кт": 15, "клкт": 15, 
  "оптг": 15, "осмотр": 30, "консультаци": 30, "слепк": 30, "коронк": 60, "примерк": 30,
  "винир": 120, "синус": 120, "швы": 15, "снятие швов": 15
};

const REASON_NAMES: Record<string, string> = {
  "имплантаци": "Имплантация", "all-on-4": "All-on-4", "пульпит": "Пульпит", "периодонтит": "Периодонтит",
  "кариес": "Кариес", "удаление": "Удаление зуба", "восьмерк": "Удаление зуба мудрости", 
  "гигиен": "Профгигиена", "чистк": "Профгигиена", "профгигиен": "Профгигиена", 
  "ортодонт": "Ортодонтия", "брекет": "Брекеты", "элайнер": "Элайнеры",
  "кт": "КЛКТ", "клкт": "КЛКТ", "оптг": "ОПТГ", "осмотр": "Осмотр",
  "консультаци": "Консультация", "слепк": "Слепки", "коронк": "Коронка", "примерк": "Примерка",
  "винир": "Виниры", "синус": "Синус-лифтинг", "швы": "Снятие швов", "снятие швов": "Снятие швов"
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
  
  const doctors = dashboard.clinicSettings?.staff?.filter((u: any) => u.active && (u.role === "doctor" || u.role === "owner")) || [];
  const patients = dashboard.patients || [];

  const foundDocs: { id: string, index: number, score: number, word: string, matches: number }[] = [];
  const foundPats: { id: string, index: number, score: number, word: string, matches: number }[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    if (word.length < 3) continue;

    for (const doc of doctors) {
      const parts = doc.fullName.toLowerCase().split(' ');
      if (parts.some((p: string) => isFuzzyMatch(word, p))) {
        let score = 1;
        let matches = 1;
        if (i + 1 < words.length && parts.some((p: string) => isFuzzyMatch(words[i+1]!, p) && !isFuzzyMatch(word, p))) {
          score += 50;
          matches = 2;
        }
        
        const prev = i > 0 ? words[i-1] : "";
        if (prev && ["к", "ко", "врачу", "доктору", "док", "стоматологу"].includes(prev)) score += 10;
        
        const existing = foundDocs.find(d => d.id === doc.id);
        if (!existing || existing.score < score) {
          if (existing) foundDocs.splice(foundDocs.indexOf(existing), 1);
          foundDocs.push({ id: doc.id, index: i, score, word, matches });
        }
      }
    }

    for (const pat of patients) {
      const parts = pat.fullName.toLowerCase().split(' ');
      if (parts.some((p: string) => isFuzzyMatch(word, p))) {
        let score = 1;
        let matches = 1;
        if (i + 1 < words.length && parts.some((p: string) => isFuzzyMatch(words[i+1]!, p) && !isFuzzyMatch(word, p))) {
          score += 50;
          matches = 2;
        }

        const prev = i > 0 ? words[i-1] : "";
        if (prev && ["запиши", "записать", "пациент", "пациента", "ребенка", "мальчика", "девочку", "на"].includes(prev)) score += 10;
        
        const existing = foundPats.find(p => p.id === pat.id);
        if (!existing || existing.score < score) {
          if (existing) foundPats.splice(foundPats.indexOf(existing), 1);
          foundPats.push({ id: pat.id, index: i, score, word, matches });
        }
      }
    }
  }

  foundDocs.sort((a, b) => b.score - a.score);
  foundPats.sort((a, b) => b.score - a.score);

  if (foundDocs.length > 0 && foundPats.length > 0) {
    if (foundDocs[0]!.index === foundPats[0]!.index || (foundDocs[0]!.matches > 1 && foundDocs[0]!.index + 1 === foundPats[0]!.index)) {
      if (foundDocs[0]!.score > foundPats[0]!.score) {
        parsed.doctorUserId = foundDocs[0]!.id;
        const nextPat = foundPats.find(p => p.id !== foundDocs[0]!.id);
        if (nextPat) parsed.patientId = nextPat.id;
      } else {
        parsed.patientId = foundPats[0]!.id;
        const nextDoc = foundDocs.find(d => d.id !== foundPats[0]!.id);
        if (nextDoc) parsed.doctorUserId = nextDoc.id;
      }
    } else {
      parsed.doctorUserId = foundDocs[0]!.id;
      parsed.patientId = foundPats[0]!.id;
    }
  } else {
    if (foundDocs.length > 0) parsed.doctorUserId = foundDocs[0]!.id;
    if (foundPats.length > 0) parsed.patientId = foundPats[0]!.id;
  }
  
  if (parsed.doctorUserId) {
    const doc = doctors.find((d: any) => d.id === parsed.doctorUserId);
    if (doc) doc.fullName.split(' ').forEach((p: string) => remaining = remaining.replace(new RegExp(`\\b${p.substring(0, Math.max(3, p.length-2))}[а-я]*\\b`, 'ig'), ' '));
  }
  if (parsed.patientId) {
    const pat = patients.find((p: any) => p.id === parsed.patientId);
    if (pat) pat.fullName.split(' ').forEach((p: string) => remaining = remaining.replace(new RegExp(`\\b${p.substring(0, Math.max(3, p.length-2))}[а-я]*\\b`, 'ig'), ' '));
  }
  
  const cancelRegex = /\b(отмен[а-я]*|удали|удалите|удалить запись|убери|сними|снимите)\b/i;
  const isCancel = cancelRegex.test(remaining);
  if (isCancel) remaining = remaining.replace(cancelRegex, ' ');

  let durationMinutes = 60;
  let matchedReasonKey = "";

  if (!isCancel) {
    for (const [key, duration] of Object.entries(DURATION_MAP)) {
      if (containsAnyFuzzyRoot(remaining, [key])) {
        if (key.length > matchedReasonKey.length) {
          matchedReasonKey = key;
          durationMinutes = duration;
        }
      }
    }
  }

  if (matchedReasonKey && !isCancel) {
    parsed.reason = REASON_NAMES[matchedReasonKey] || (matchedReasonKey.charAt(0).toUpperCase() + matchedReasonKey.slice(1));
    remaining = remaining.replace(new RegExp(`\\b\\S*${matchedReasonKey}\\S*\\b`, 'ig'), ' ');
  }

  const now = new Date();
  let targetDate = new Date(now);
  let dateFound = false;

  if (!isCancel) {
    if (containsAnyFuzzyRoot(remaining, ["послезавтра"])) {
      targetDate.setDate(now.getDate() + 2);
      dateFound = true;
      remaining = remaining.replace(/(послезавтра)\S*/ig, ' ');
    } else if (containsAnyFuzzyRoot(remaining, ["завтра"])) {
      targetDate.setDate(now.getDate() + 1);
      dateFound = true;
      remaining = remaining.replace(/(завтра)\S*/ig, ' ');
    } else if (containsAnyFuzzyRoot(remaining, ["сегодня", "щас", "сейчас"])) {
      targetDate.setDate(now.getDate());
      dateFound = true;
      remaining = remaining.replace(/(сегодня|щас|сейчас)\S*/ig, ' ');
    } else {
      const explicitDateMatch = remaining.match(/([1-9]|[12][0-9]|3[01])\s+([а-я]{3,8})/i);
      if (explicitDateMatch) {
        const day = parseInt(explicitDateMatch[1]!, 10);
        const monthStr = explicitDateMatch[2]!.slice(0, 3);
        if (MONTHS[monthStr] !== undefined) {
          targetDate.setMonth(MONTHS[monthStr]!);
          targetDate.setDate(day);
          if (targetDate.getTime() < now.getTime() - 86400000) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
          dateFound = true;
          remaining = remaining.replace(explicitDateMatch[0], ' ');
        }
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
            remaining = remaining.replace(new RegExp(`(?:^|\\s)(?:в|на|во)?\\s*${dayName}(?=\\s|$)`, 'ig'), ' ');
            break;
          }
        }
      }
    }
  }

  let hours = 8;
  let minutes = 0;
  let timeFound = false;

  if (!isCancel) {
    const timeMatch = remaining.match(/(?:^|\s)([01]?[0-9]|2[0-3])[:\-]([0-5][0-9])(?=\s|$)/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]!, 10);
      minutes = parseInt(timeMatch[2]!, 10);
      timeFound = true;
      remaining = remaining.replace(timeMatch[0], ' ');
    } else {
      const hourMatch = remaining.match(/(?:в|на|к)\s+([01]?[0-9]|2[0-3])(?:\s*(часов|утра|вечера|дня|$|\s))/i);
      if (hourMatch) {
        hours = parseInt(hourMatch[1]!, 10);
        minutes = 0;
        timeFound = true;
        if (hourMatch[0].includes("вечера") && hours < 12) hours += 12;
        if (hourMatch[0].includes("дня") && hours < 12 && hours >= 1) hours += 12;
        if (hours >= 1 && hours <= 8 && !hourMatch[0].includes("утра")) hours += 12; 
        remaining = remaining.replace(hourMatch[0], ' ');
      }
    }
  }

  if (!isCancel && (dateFound || timeFound)) {
    targetDate.setHours(hours, minutes, 0, 0);
    parsed.startsAt = targetDate.toISOString();
    parsed.endsAt = new Date(targetDate.getTime() + durationMinutes * 60000).toISOString();
  }

  if (isCancel) {
    parsed.status = "cancelled";
  }

  // Cleanup remaining text for comment
  const stopWords = /\b(запиши|записать|пациент[ауоке]?|пожалуйста|доктору|врачу|прием|срочно|запись)\b/gi;
  remaining = remaining.replace(stopWords, ' ');
  remaining = remaining.replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (remaining.length > 0 && !isCancel) {
    parsed.comment = remaining.charAt(0).toUpperCase() + remaining.slice(1);
  }

  return parsed;
}
