import { ParserContext } from "./dictationParser.js";

export interface ToothUpdate {
  code: string;
  state: "treatment" | "missing" | "watch" | "planned" | "done" | "prosthetics" | "implant";
}

export interface EmkUpdates {
  complaint?: string;
  anamnesis?: string;
  objectiveStatus?: string;
  diagnosis?: string;
  treatmentPlan?: string;
}

export interface LocalParseResult {
  toothUpdates?: ToothUpdate[];
  emkUpdates?: EmkUpdates;
}

export interface SmartAction {
  action: "update_tooth" | "schedule" | "open_card" | "add_implant" | "complex_llm_fallback";
  payload?: any;
}

const TOOTH_REGEX = /(?:^|[^0-9])([1-4][1-8]|[5-8][1-5])(?:[^0-9]|$)(?!\s*[:.\-]\s*\d+)/gi;

const STATE_MAPPING: Record<string, "treatment" | "missing" | "watch" | "planned" | "done" | "prosthetics" | "implant"> = {
  "кариес": "treatment",
  "пульпит": "treatment",
  "периодонтит": "treatment",
  "лечить": "treatment",
  "лечение": "treatment",
  "пломба": "treatment",
  "отсутствует": "missing",
  "удален": "missing",
  "удалили": "missing",
  "удалить": "missing",
  "нет": "missing",
  "план на имплантат": "planned",
  "наблюдать": "watch",
  "осмотр": "watch",
  "наблюдение": "watch",
  "вылечен": "done",
  "здоров": "done",
  "коронка": "prosthetics",
  "коронку": "prosthetics",
  "имплант": "implant",
  "имплантат": "implant",
};

/**
 * Attempts to parse the dictation locally without using the LLM.
 * Returns SmartAction or NULL if it fails (triggering LLM fallback).
 */
export function parseDictationLocally(transcript: string, context: ParserContext): SmartAction | null {
  const text = transcript.toLowerCase().trim();
  
  // 1. Check Scheduling
  if (context === "schedule") {
    const scheduleMatch = text.match(/(?:запиши|записать)\s+(.*?)\s+на\s+(завтра|сегодня)\s+(?:в|на)\s+(\d{1,2}[:\-]\d{2})/i);
    if (scheduleMatch) {
      return {
        action: "schedule",
        payload: {
          patientName: scheduleMatch[1]?.trim(),
          day: scheduleMatch[2],
          time: scheduleMatch[3]?.replace('-', ':')
        }
      };
    }
    return null; // Force LLM fallback for anything complex
  }

  // 2. Check Open Card
  const openCardMatch = text.match(/(?:открой карточку|карточка|открой)\s+(.*)/i);
  if (openCardMatch && (openCardMatch[1]?.length ?? 0) > 3) {
    return {
      action: "open_card",
      payload: {
        patientName: openCardMatch[1]?.trim()
      }
    };
  }

  // 3. Check Surgical Implant Command (e.g., "поставь имплант 4 на 10")
  const implantMatch = text.match(/(?:поставь|добавь)?\s*имплант(?:ат)?\s*(\d+[\.,]?\d*)\s*(?:на|x|х)\s*(\d+[\.,]?\d*)/i);
  if (implantMatch) {
    return {
      action: "add_implant",
      payload: {
        diameter: parseFloat(implantMatch[1]?.replace(',', '.') || "0"),
        length: parseFloat(implantMatch[2]?.replace(',', '.') || "0")
      }
    };
  }

  // 4. Dental Status (Teeth updates)
  if (context === "visit") {
    const teethMatches = [...text.matchAll(TOOTH_REGEX)];
    const teethCodes = teethMatches.map(m => m[1]);

    if (teethCodes.length > 0) {
      const clauses = text.split(/[.,;!?]/).filter(Boolean);
      const toothUpdates: ToothUpdate[] = [];
      const emkUpdates: EmkUpdates = {};
      let hasValidMatch = false;

      for (const clause of clauses) {
        const localTeeth = [...clause.matchAll(TOOTH_REGEX)].map(m => m[1]);
        if (localTeeth.length === 0) continue;

        let foundState: any = null;
        for (const [keyword, state] of Object.entries(STATE_MAPPING)) {
          if (clause.includes(keyword)) {
            foundState = state;
            if (!emkUpdates.complaint) emkUpdates.complaint = clause.trim();
            break;
          }
        }

        if (foundState) {
          hasValidMatch = true;
          localTeeth.forEach(code => toothUpdates.push({ code: code!, state: foundState }));
        }
      }

      if (hasValidMatch) {
        if (emkUpdates.complaint) {
          emkUpdates.complaint = emkUpdates.complaint.charAt(0).toUpperCase() + emkUpdates.complaint.slice(1);
        }
        return {
          action: "update_tooth",
          payload: {
            toothUpdates,
            emkUpdates
          }
        };
      }
    }
    
    return null; 
  }

  return null;
}
