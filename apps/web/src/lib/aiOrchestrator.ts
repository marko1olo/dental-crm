import { smartBookingParser } from './smartBookingParser';
import { parseVisitDictationLocal } from './smartVisitParser';
import { parsePatientDictationLocal } from './smartPatientParser';

export type AiIntent = 
  | "schedule_appointment"
  | "fill_emk"
  | "parse_patient_document"
  | "clinical_audit"
  | "patient_communication"
  | "unknown";

// Full set of prompts for the AI Assistant as requested
export const AI_PROMPTS = {
  SCHEDULE_APPOINTMENT: `Ты медицинский регистратор. Вытащи из текста: имя пациента, врача, процедуру, дату и время. Верни строго JSON.`,
  FILL_EMK: `Ты стоматолог. На основе диктовки сформируй профессиональные медицинские записи: Жалобы, Анамнез, Объективно, Диагноз (МКБ-10), План лечения. Верни JSON.`,
  PARSE_PATIENT_DOCUMENT: `Ты администратор клиники. Проанализируй паспорт или анкету. Вытащи: ФИО, дату рождения, паспортные данные, телефон. Верни JSON.`,
  CLINICAL_AUDIT: `Ты главный врач. Проверь медицинскую карту пациента на наличие несоответствий диагноза и плана лечения. Выдели риски и ошибки. Верни JSON с полем 'issues'.`,
  PATIENT_COMMUNICATION: `Ты заботливый администратор. Сгенерируй вежливое сообщение пациенту (напоминание о приеме, запрос самочувствия после удаления и т.д.).`
};

export interface AiRouterResult<T> {
  source: "local_algorithm" | "llm_required";
  data?: T;
  suggestedPrompt?: string;
}

/**
 * AI Orchestrator: Smartly routes tasks between fast local parsing and heavy LLM usage.
 * Saves LLM tokens for simple requests, and provides full prompts for complex ones.
 */
export class AiOrchestrator {
  
  /**
   * Determine the intent of the text
   */
  static detectIntent(input: string): AiIntent {
    const lower = input.toLowerCase();
    if (lower.includes("запиши") || lower.includes("прием") || lower.includes("на завтра")) return "schedule_appointment";
    if (lower.includes("жалобы") || lower.includes("диагноз") || lower.includes("кариес") || lower.includes("зуб")) return "fill_emk";
    if (lower.includes("паспорт") || lower.includes("выдан") || lower.includes("телефон")) return "parse_patient_document";
    if (lower.includes("проверь карту") || lower.includes("аудит")) return "clinical_audit";
    if (lower.includes("напиши пациенту") || lower.includes("напомни")) return "patient_communication";
    return "unknown";
  }

  /**
   * Route EMK Dictation
   * Tries local algorithm first. If it finds enough data, returns it. 
   * Otherwise, routes to LLM.
   */
  static processEmkDictation(input: string): AiRouterResult<ReturnType<typeof parseVisitDictationLocal>> {
    const localResult = parseVisitDictationLocal(input);
    
    // Heuristic: if local parser found at least a diagnosis and a tooth, it's successful enough.
    const hasTooth = localResult.toothUpdates.length > 0;
    const hasDiagnosis = !!localResult.emkUpdates.diagnosis;
    
    if (hasTooth && hasDiagnosis) {
      return { source: "local_algorithm", data: localResult };
    }

    return { 
      source: "llm_required", 
      suggestedPrompt: `${AI_PROMPTS.FILL_EMK}\n\nТекст диктовки:\n${input}`
    };
  }

  /**
   * Route Schedule Booking
   */
  static processScheduleBooking(input: string, dashboard: any): AiRouterResult<ReturnType<typeof smartBookingParser>> {
    const localResult = smartBookingParser(input, dashboard);
    
    // If local parser confidently found a patient ID, use it.
    if (localResult.patientId) {
      return { source: "local_algorithm", data: localResult };
    }

    return {
      source: "llm_required",
      suggestedPrompt: `${AI_PROMPTS.SCHEDULE_APPOINTMENT}\n\nТекст диктовки:\n${input}`
    };
  }

  /**
   * Route Patient Info Extraction
   */
  static processPatientInfo(input: string): AiRouterResult<ReturnType<typeof parsePatientDictationLocal>> {
    const localResult = parsePatientDictationLocal(input);
    
    if (localResult.fullName || localResult.phone) {
      return { source: "local_algorithm", data: localResult };
    }

    return {
      source: "llm_required",
      suggestedPrompt: `${AI_PROMPTS.PARSE_PATIENT_DOCUMENT}\n\nТекст документа:\n${input}`
    };
  }
}
