export interface ParsedDictation {
  complaints: string[];
  anamnesis: string[];
  objective: string[];
  diagnosis: string[];
  treatmentPlan: string[];
  toothNumbers: string[];
  hasMedicalTerms: boolean;
}

const terms = {
  complaints: ["болит", "боль", "жалоб", "ноет", "чувствительность", "реакция", "откололась", "выпала"],
  anamnesis: ["давно", "месяц", "неделю", "вчера", "ранее лечен", "не обращался"],
  objective: ["кариозная полость", "разрушен", "гиперемия", "отек", "перкуссия", "зондирование", "налет"],
  diagnosis: ["кариес", "пульпит", "периодонтит", "гингивит", "удаление"],
  treatmentPlan: ["анестезия", "препарирование", "пломба", "некрэктомия", "эндодонтия", "кт", "снимок", "профгигиена"]
};

const toothRegex = /\b([1-4][1-8]|[5-8][1-5])\b(?!\s*[:.\-]\s*\d+)(?!\s*(?:часов|часа|ч|утра|дня|вечера|мин|минут|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|руб|рублей|тыс))/gi;

export function parseDictation(text: string): ParsedDictation {
  const result: ParsedDictation = {
    complaints: [],
    anamnesis: [],
    objective: [],
    diagnosis: [],
    treatmentPlan: [],
    toothNumbers: [],
    hasMedicalTerms: false
  };

  const lowerText = text.toLowerCase();
  
  // Find teeth
  const teeth = text.match(toothRegex);
  if (teeth) {
    result.toothNumbers = Array.from(new Set(teeth));
  }

  // Very naive sentence extraction for MVP
  const sentences = text.split(/[.?!]/).map(s => s.trim()).filter(Boolean);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    let categorized = false;

    if (terms.complaints.some(t => lower.includes(t))) {
      result.complaints.push(sentence);
      categorized = true;
    }
    if (terms.anamnesis.some(t => lower.includes(t))) {
      result.anamnesis.push(sentence);
      categorized = true;
    }
    if (terms.objective.some(t => lower.includes(t))) {
      result.objective.push(sentence);
      categorized = true;
    }
    if (terms.diagnosis.some(t => lower.includes(t))) {
      result.diagnosis.push(sentence);
      categorized = true;
    }
    if (terms.treatmentPlan.some(t => lower.includes(t))) {
      result.treatmentPlan.push(sentence);
      categorized = true;
    }
    
    // If we matched any medical term
    if (categorized) {
      result.hasMedicalTerms = true;
    }
  }

  return result;
}
