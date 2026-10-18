import type { ClinicalEstimateItem } from "./clinicalWorkflowTypes";
import { extractTherapyAndEndoHeuristics } from "./diaryParserHeuristicsTherapy";
import { extractSurgeryAndDiagnosticsHeuristics } from "./diaryParserHeuristicsSurgery";

export function extractFromDiaryHeuristics(
	treatmentText: string,
	statusText: string,
	diagText: string,
	toothNumber?: number | undefined,
): ClinicalEstimateItem[] {
	const therapyItems = extractTherapyAndEndoHeuristics(treatmentText, diagText, toothNumber);
	const surgeryItems = extractSurgeryAndDiagnosticsHeuristics(treatmentText, statusText, diagText, toothNumber);
	return [...therapyItems, ...surgeryItems];
}
