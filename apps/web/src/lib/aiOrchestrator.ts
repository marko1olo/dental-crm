import { smartBookingParser } from './smartBookingParser';
import { parseVisitDictationLocal } from './smartVisitParser';
import { parsePatientDictationLocal } from './smartPatientParser';
import { Prompts } from './aiPromptRouter';

import { parsePriceDictationLocal } from './smartPriceParser';

export function parsePaymentDictationLocal(input: string): { amount: string, method: string | null, taxDeductionCode: string | null } {
  const lower = input.toLowerCase();
  
  // Extract amount
  let amount = "";
  const thousandsMatch = lower.match(/(\d+)[\s]*(тыс|тысяч|т\.р\.|тр)/i);
  if (thousandsMatch && thousandsMatch[1]) {
    amount = String(parseInt(thousandsMatch[1], 10) * 1000);
  } else {
    const match = input.replace(/\s+/g, '').match(/\d{2,7}/);
    if (match) amount = match[0];
  }
  
  // Extract method
  let method: string | null = null;
  if (/(карт|терминал|безнал)/i.test(lower)) method = "card";
  else if (/(налич|нал)/i.test(lower)) method = "cash";
  else if (/(сбп|перевод|банк|qr)/i.test(lower)) method = "bank_transfer";
  else if (/(онлайн|ссылк)/i.test(lower)) method = "online";
  
  // Extract tax deduction
  let taxDeductionCode: string | null = null;
  if (/(вычет|код 1|налог)/i.test(lower)) taxDeductionCode = "1";
  else if (/(код 2)/i.test(lower)) taxDeductionCode = "2";
  
  return { amount, method, taxDeductionCode };
}
export type AiIntent = 
  | "schedule_appointment"
  | "fill_emk"
  | "parse_patient_document"
  | "manage_prices"
  | "clinical_audit"
  | "imaging_analysis"
  | "patient_communication"
  | "unknown";

export interface AiRouterResult<T> {
  source: "local_algorithm" | "llm_required";
  data?: T;
  suggestedPrompt?: string;
  systemPrompt?: string;
}

/**
 * AI Orchestrator: Smartly routes tasks between fast local parsing and heavy LLM usage.
 * Protects API limits (Local First pattern) and provides rich prompts when LLM is needed.
 */
export class AiOrchestrator {
  
  /**
   * Determine the intent of the text (NLP Routing)
   */
  static detectIntent(input: string): AiIntent {
    const lower = input.toLowerCase();
    
    // 0. Check for Price management
    if (/(добавь.*в прайс|услугу|цена|стоимость.*руб|прайс)/i.test(lower) && /\d/.test(lower)) {
      return "manage_prices";
    }

    // 1. Check for strong temporal markers and booking actions (Schedule Priority)
    const isSchedule = /(запиш|прием|расписан|на завтра|перенес|отмен|запись|в \d{2}:\d{2}|сдвинь|следующ|через неделю)/i.test(lower);
    if (isSchedule) return "schedule_appointment";
    
    // 2. Check for clinical / medical record keywords (EMK)
    const isEmk = /(первичный осмотр|создай карту|жалоб|диагноз|объективно|лечение|боль|пульпит|кариес|периодонтит|зуб|экстирпац|пломб|эндо|канал|вскрыл|рентген)/i.test(lower);
    // Note: If they mention imaging but it's clearly an EMK dictation, EMK wins unless they explicitly ask for imaging analysis
    const isImagingOnly = /(клкт|рентген|панорам|снимок|кист|к\/т|ретенц|мрт)/i.test(lower) && !/(жалоб|диагноз|объективно|лечение|боль|пульпит|кариес|периодонтит|экстирпац|пломб)/i.test(lower);
    
    if (isImagingOnly) return "imaging_analysis";
    if (isEmk) return "fill_emk";
    
    // 3. Clinical Audit 
    if (/(проверь карту|аудит|юридическ|косяк|документ|согласи|ошибк|прошлый месяц)/i.test(lower)) return "clinical_audit";
    
    // 4. Patient Communication
    if (/(напиши|напомни|отзыв|телеграм|сообщен|смс|whatsapp|позвони)/i.test(lower)) return "patient_communication";
    
    // 5. Patient Document Extraction
    if (/(паспорт|анкет|выдан|телефон|дата рожден|снилс|инн|фио|полис)/i.test(lower)) return "parse_patient_document";
    
    return "unknown";
  }

  /**
   * Route EMK Dictation
   * Local algorithm first. If it finds tooth or any field, it succeeds. Otherwise fallback to LLM.
   */
  static processEmkDictation(input: string): AiRouterResult<ReturnType<typeof parseVisitDictationLocal>> {
    const localResult = parseVisitDictationLocal(input);
    const hasTooth = localResult.toothUpdates.length > 0;
    const hasEmkFields = !!(localResult.emkUpdates.complaint || localResult.emkUpdates.objectiveStatus || localResult.emkUpdates.treatmentPlan || localResult.emkUpdates.diagnosis);
    
    if (hasTooth || hasEmkFields) {
      return { source: "local_algorithm", data: localResult };
    }

    return { 
      source: "llm_required", 
      systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
      suggestedPrompt: Prompts.Medical.StructureEmk(input)
    };
  }

  /**
   * Route Schedule Booking
   */
  static processScheduleBooking(input: string, dashboard: any): AiRouterResult<ReturnType<typeof smartBookingParser>> {
    const localResult = smartBookingParser(input, dashboard);
    
    // Confident match requires finding an existing patient, a new patient name, OR at least time/date + reason
    if (localResult.patientId || localResult.patientName || (localResult.startsAt && localResult.reason)) {
      return { source: "local_algorithm", data: localResult };
    }

    return {
      source: "llm_required",
      systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
      suggestedPrompt: Prompts.Schedule.AnalyzeNote(input)
    };
  }

  /**
   * Route Patient Info Extraction
   */
  static processPatientInfo(input: string): AiRouterResult<ReturnType<typeof parsePatientDictationLocal>> {
    const localResult = parsePatientDictationLocal(input);
    
    if (localResult.fullName || localResult.phone || localResult.birthDate) {
      return { source: "local_algorithm", data: localResult };
    }

    return {
      source: "llm_required",
      systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
      suggestedPrompt: Prompts.Patient.ExtractDetails(input)
    };
  }

  /**
   * Route Price Management Dictation
   */
  static processPriceDictation(input: string): AiRouterResult<ReturnType<typeof parsePriceDictationLocal>> {
    const localResult = parsePriceDictationLocal(input);
    
    // Confident match requires finding a service name and a price
    if (localResult.serviceName && localResult.price) {
      return { source: "local_algorithm", data: localResult };
    }

    return {
      source: "llm_required",
      systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
      suggestedPrompt: "Extract serviceName, price (number), and category from: " + input
    };
  }

  /**
   * Route Clinical Audit (Pure AI Task)
   */
  static processClinicalAudit(input: string): AiRouterResult<null> {
    return {
      source: "llm_required",
      systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
      suggestedPrompt: Prompts.Medical.ClinicalAudit(input)
    };
  }

  /**
   * Route Imaging Report Analysis (Pure AI Task)
   */
  static processImagingAnalysis(input: string): AiRouterResult<null> {
    return {
      source: "llm_required",
      systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
      suggestedPrompt: Prompts.Imaging.AnalyzeCTReport(input)
    };
  }

  /**
   * Route Patient Communication (Pure AI Task)
   */
  static processPatientCommunication(patientName: string, recentProcedure: string): AiRouterResult<null> {
    return {
      source: "llm_required",
      systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
      suggestedPrompt: Prompts.Marketing.PatientFollowUp(patientName, recentProcedure)
    };
  }


  /**
   * Route Marketing Review Generation (Pure AI Task)
   */
  static processMarketingReview(reviewText: string, tone: string, clinicName: string, seoKeys: string[]): AiRouterResult<null> {
    return {
      source: "llm_required",
      systemPrompt: `${Prompts.System.Base}\n${Prompts.System.StrictJSON}`,
      suggestedPrompt: Prompts.Marketing.GenerateReviewReply(reviewText, tone, clinicName, seoKeys)
    };
  }


  /**
   * Route Payment / Finance Dictation
   */
  static processPaymentDictation(input: string): AiRouterResult<ReturnType<typeof parsePaymentDictationLocal>> {
    const localResult = parsePaymentDictationLocal(input);
    return {
      source: "local_algorithm",
      data: localResult
    };
  }
}
