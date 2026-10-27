/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Clinical Diary Procedure Extractor
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Автоматический анализ дневника приёма и извлечение фактически проведенных
 * процедур по клиническому прейскуранту со стандартным прайс-листом.
 */

import type {
	ClinicalEstimateItem,
	ClinicalVisitCompletionInput,
} from "./clinicalWorkflowTypes";
import { CLINICAL_STANDARD_PRICE_CATALOG } from "./clinicalStandardCatalog";
import {
	extractFromOrderServices,
	extractFromTreatmentLines,
} from "./diaryParserPriorities";
import { extractFromDiaryHeuristics } from "./diaryParserHeuristics";

export { CLINICAL_STANDARD_PRICE_CATALOG } from "./clinicalStandardCatalog";

/**
 * Автоматический анализ дневника приёма и извлечение фактически проведенных процедур.
 */
export function extractProceduresFromDiary(
	diary: ClinicalVisitCompletionInput["diary"],
): ClinicalEstimateItem[] {
	const toothMatch = (diary.diagnosisTooth ?? "").match(/\b\d{2}\b/)?.[0];
	const toothNumber = toothMatch ? parseInt(toothMatch, 10) : undefined;

	// ПРИОРИТЕТ 1: Явно переданные структурированные услуги 804н из протокола приёма
	const rawOrderServices = (diary as { order804nServices?: readonly any[] }).order804nServices;
	const protocolItems = extractFromOrderServices(rawOrderServices, toothNumber);
	if (protocolItems) return protocolItems;

	// ПРИОРИТЕТ 2: Разбор структурированных строк из treatmentDescription
	const treatmentRaw = diary.treatmentDescription ?? "";
	const linesItems = extractFromTreatmentLines(treatmentRaw, toothNumber);
	if (linesItems) return linesItems;

	// ПРИОРИТЕТ 3: Разбор по ключевым словам и МКБ-10
	const treatmentText = treatmentRaw.toLowerCase();
	const statusText = (diary.statusLocalis ?? "").toLowerCase();
	const diagText = (diary.diagnosisIcd10 ?? "").toUpperCase();

	return extractFromDiaryHeuristics(treatmentText, statusText, diagText, toothNumber);
}
