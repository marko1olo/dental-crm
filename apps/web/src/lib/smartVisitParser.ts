import { textToNumbers, normalizeDentalSlang } from "./stringUtils";

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
  let normalizedInput = textToNumbers(input);
  normalizedInput = normalizeDentalSlang(normalizedInput);
  
  // Normalize "1.1", "1 1" or "1,1" to "11" for teeth [1-4].[1-8]
  normalizedInput = normalizedInput.replace(/(?:^|[^0-9])([1-4])\s*[.,]\s*([1-8])(?:[^0-9]|$)/g, ' $1$2 ');
  const lower = normalizedInput.toLowerCase();
  
  // Clause-based tooth extraction
  const clauses = normalizedInput.split(/[.,;!?]/).map(c => c.trim()).filter(Boolean);
  
  for (const clause of clauses) {
    const clauseLower = clause.toLowerCase();
    
    // Erase pressure, pulse, temp BEFORE tooth matching to avoid false positives
    let safeClause = clause.replace(/(?:^|[^а-яёa-z])(давление|ад)\s*\d+\s*(?:на|[\/])\s*\d+/ig, ' ');
    safeClause = safeClause.replace(/(?:^|[^а-яёa-z])(пульс|температура|т|t)\s*\d+(?:[.,]\d+)?/ig, ' ');
    
    // Stricter matching for teeth
    const teethRegex = /(?:^|[^0-9])([1-4][1-8]|[5-8][1-5])(?:[^0-9]|$)(?!\s*[:.\-]\s*\d+)(?!\s*(?:часов|часа|ч|утра|дня|вечера|мин|минут|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|руб|рублей|тыс|лет|года|год|числа|число|триместр))/gi;
    const teethMatches: string[] = [];
    let match;
    while ((match = teethRegex.exec(safeClause)) !== null) {
      if (match[1]) teethMatches.push(match[1]);
    }
    
    const teeth = Array.from(new Set(teethMatches));
    
    if (teeth.length > 0) {
      let state = "planned";
      if (/(удален|рвать|удалил|экстракц|отсутствует)/i.test(clauseLower)) state = "missing";
      else if (/(кариес|дырк|полост|клиновид|пломб|лечени|реставрац|восстанов|препарир|вылечен|пролечен|сделан)/i.test(clauseLower)) state = "treatment";
      else if (/(пульпит|нерв|эндо|канал|периодонтит|кист|гранулем)/i.test(clauseLower)) state = "treatment";
      else if (/(коронк|протез|ортопеди|винир|вкладк)/i.test(clauseLower)) state = "prosthetics";
      else if (/(имплант|хирурги|синус|остеопласт)/i.test(clauseLower)) state = "implant";
      else if (/(наблюд|осмотр)/i.test(clauseLower)) state = "watch";
      
      teeth.forEach(t => result.toothUpdates.push({ code: t, state }));
    }
  }

  /* Один зуб — одна запись.
     Дедупликация была только внутри фразы, поэтому упомянутый дважды зуб
     давал две записи, и они могли противоречить друг другу:
     «36 зуб кариес, удалили 36 зуб» -> [{36,treatment},{36,missing}].
     Дальше обе записи применяются по очереди, и итог формулы зависит от
     порядка обхода. Оставляем последнее упоминание: в диктовке врач
     заканчивает тем, что стало с зубом на самом деле. */
  if (result.toothUpdates.length > 1) {
    const lastByTooth = new Map<string, string>();
    for (const update of result.toothUpdates) lastByTooth.set(update.code, update.state);
    result.toothUpdates = [...lastByTooth].map(([code, state]) => ({ code, state }));
  }

  // Tokenized State-Machine for EMK (to handle unpunctuated STT output)
  const tokens = input.split(/\s+/).filter(Boolean);
  
  let currentSection = "";
  
  for (const token of tokens) {
    const tl = token.toLowerCase();
    const cleanToken = tl.replace(/[.,;!?:]/g, '');
    
    // Switch state based on explicit keywords
    /* БЫЛО: /^(жалоб)/ — только существительное «жалоба», «жалобы».
       Врач диктует естественно: «жалуется на выпавшую пломбу». Слово
       «жалуется» под этот шаблон не подходило, раздел не открывался, и весь
       текст до следующего опознанного слова просто выбрасывался. Проверено
       на живом парсере: из фразы «Иванов пришел, жалуется на выпавшую
       пломбу. 11 зуб кариес...» жалоба пациента не попадала в ЭМК вообще —
       в результате оставался только диагноз. Потеря жалобы в медкарте —
       потеря юридически значимой записи. */
    if (/^жал(об|уе|ую)/.test(cleanToken)) currentSection = "complaint";
    else if (/^(анамнез)/.test(cleanToken)) currentSection = "anamnesis";
    else if (/^(объективно|статус)/.test(cleanToken)) currentSection = "objectiveStatus";
    else if (/^(диагноз)/.test(cleanToken)) currentSection = "diagnosis";
    /* «сделано» опознавалось, а «сделал» и «сделали» — нет, хотя диктуют
       именно так. Добавлены и «выполн», «провед»: «проведена анестезия». */
    else if (/^(лечени|план|сделан|сделал|выполн|провед)/.test(cleanToken)) currentSection = "treatmentPlan";

    // Hard implicit triggers (switch even if currently in another section)
    else if (/^(аллерг|беремен)/.test(cleanToken)) currentSection = "anamnesis";

    // Soft implicit triggers (only switch if no explicit section is active)
    else {
      if (!currentSection) {
        if (/(болит|ноет|реакци)/.test(cleanToken)) currentSection = "complaint";
        else if (/(кариес|пульпит|периодонтит)/.test(cleanToken)) currentSection = "diagnosis";
        else if (/(кт|сним|рентген|налет|полост|перкусс|слизист)/.test(cleanToken)) currentSection = "objectiveStatus";
        /* Диктовка о вмешательстве без слов-разделов пропадала целиком:
           «удалил 38 зуб. экстракция прошла успешно. анестезия» давала
           пустой emkUpdates — менялось только состояние зуба, а запись о
           лечении не сохранялась нигде. Ни одно из этих слов не может
           относиться к жалобе или диагнозу, поэтому направляем их в план
           лечения. */
        else if (/(удал|экстракц|анестез|пломбир|коффердам|имплантац)/.test(cleanToken)) currentSection = "treatmentPlan";
      }
    }
    
    // Append to current section
    if (currentSection) {
      if (!result.emkUpdates[currentSection as keyof typeof result.emkUpdates]) {
        result.emkUpdates[currentSection as keyof typeof result.emkUpdates] = "";
      }
      result.emkUpdates[currentSection as keyof typeof result.emkUpdates] += (result.emkUpdates[currentSection as keyof typeof result.emkUpdates] ? " " : "") + token;
    }
  }

  // Cleanup prefixes and capitalize
  if (result.emkUpdates.complaint) {
    // Срезаем и существительное, и глагольные формы: раздел теперь
    // открывается по «жалуется», значит и начинаться текст может с него.
    let clean = result.emkUpdates.complaint.replace(/^жал(?:обы|оба|уется|уются|уюсь)\s*(?:на)?\s*[:\-]*\s*/i, '').trim();
    if (clean) result.emkUpdates.complaint = clean.charAt(0).toUpperCase() + clean.slice(1) + (clean.endsWith('.') ? '' : '.');
    else delete result.emkUpdates.complaint;
  }
  if (result.emkUpdates.anamnesis) {
    let clean = result.emkUpdates.anamnesis.replace(/^анамнез\s*[:\-]*\s*/i, '').trim();
    if (clean) result.emkUpdates.anamnesis = clean.charAt(0).toUpperCase() + clean.slice(1) + (clean.endsWith('.') ? '' : '.');
    else delete result.emkUpdates.anamnesis;
  }
  if (result.emkUpdates.objectiveStatus) {
    let clean = result.emkUpdates.objectiveStatus.replace(/^(объективно|статус)\s*[:\-]*\s*/i, '').trim();
    if (clean) result.emkUpdates.objectiveStatus = clean.charAt(0).toUpperCase() + clean.slice(1) + (clean.endsWith('.') ? '' : '.');
    else delete result.emkUpdates.objectiveStatus;
  }
  if (result.emkUpdates.diagnosis) {
    let clean = result.emkUpdates.diagnosis.replace(/^диагноз\s*[:\-]*\s*/i, '').trim();
    if (clean) result.emkUpdates.diagnosis = clean.charAt(0).toUpperCase() + clean.slice(1) + (clean.endsWith('.') ? '' : '.');
    else delete result.emkUpdates.diagnosis;
  }
  if (result.emkUpdates.treatmentPlan) {
    let clean = result.emkUpdates.treatmentPlan.replace(/^(?:план\s*)?лечени[ея]\s*[:\-]*\s*/i, '').trim();
    if (clean) result.emkUpdates.treatmentPlan = clean.charAt(0).toUpperCase() + clean.slice(1) + (clean.endsWith('.') ? '' : '.');
    else delete result.emkUpdates.treatmentPlan;
  }

  return result;
}
