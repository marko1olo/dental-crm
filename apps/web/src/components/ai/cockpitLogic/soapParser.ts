/**
 * soapParser.ts — Pure SOAP section parser from clinical text
 */

export function isClinicalProtocol(text: string): boolean {
	const lower = text.toLowerCase();
	return (
		(lower.includes("жалоб") ||
			lower.includes("анамнез") ||
			lower.includes("объективн") ||
			lower.includes("диагноз") ||
			lower.includes("лечени") ||
			lower.includes("протокол") ||
			lower.includes("043/у")) &&
		text.length > 50
	);
}

export function parseSoapSectionsFromText(text: string): Record<string, string> {
	const patch: Record<string, string> = {};

	const complaintMatch = text.match(
		/(?:Жалобы|Subjective|S:?)[:\s]+([\s\S]*?)(?=(?:Анамнез|Объективно|Диагноз|Лечение|План|Рекомендации|Objective|Assessment|Plan|O:|A:|P:|$))/i,
	);
	if (complaintMatch?.[1]?.trim()) patch.complaint = complaintMatch[1].trim();

	const anamnesisMatch = text.match(
		/(?:Анамнез|История заболевания)[:\s]+([\s\S]*?)(?=(?:Объективно|Диагноз|Лечение|План|Рекомендации|Objective|Assessment|Plan|O:|A:|P:|$))/i,
	);
	if (anamnesisMatch?.[1]?.trim()) patch.anamnesis = anamnesisMatch[1].trim();

	const objectiveMatch = text.match(
		/(?:Объективно|Объективный статус|Objective|O:?)[:\s]+([\s\S]*?)(?=(?:Диагноз|Лечение|План|Рекомендации|Assessment|Plan|A:|P:|$))/i,
	);
	if (objectiveMatch?.[1]?.trim())
		patch.objectiveStatus = objectiveMatch[1].trim();

	const diagnosisMatch = text.match(
		/(?:Диагноз|МКБ(?:-10)?|Assessment|A:?)[:\s]+([\s\S]*?)(?=(?:Лечение|План|Рекомендации|Plan|P:|$))/i,
	);
	if (diagnosisMatch?.[1]?.trim()) patch.diagnosis = diagnosisMatch[1].trim();

	const treatmentMatch = text.match(
		/(?:Лечение|План лечения|Протокол лечения|Plan|P:?)[:\s]+([\s\S]*?)(?=(?:Рекомендации|$))/i,
	);
	if (treatmentMatch?.[1]?.trim())
		patch.treatmentPlan = treatmentMatch[1].trim();

	const recommendationsMatch = text.match(
		/(?:Рекомендации|Назначения)[:\s]+([\s\S]*?)$/i,
	);
	if (recommendationsMatch?.[1]?.trim())
		patch.recommendations = recommendationsMatch[1].trim();

	if (!patch.complaint && !patch.objectiveStatus && !patch.treatmentPlan) {
		patch.objectiveStatus = text.trim();
	}

	return patch;
}
