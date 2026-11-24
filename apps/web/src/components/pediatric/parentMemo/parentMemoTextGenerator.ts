import {
	type FranklRating,
	generatePediatricParentRecommendations,
} from "@dental/shared";

export interface GenerateParentMemoTextParams {
	readonly patientName: string;
	readonly patientAgeYears: number;
	readonly clinicName: string;
	readonly doctorName: string;
	readonly frankl: FranklRating;
	readonly hasPulpotomy: boolean;
	readonly pulpotomyTooth: number;
	readonly hasFissureSealing: boolean;
	readonly parsedFissureTeeth: readonly number[];
	readonly hasSilvering: boolean;
	readonly parsedSilveringTeeth: readonly number[];
	readonly hasTrauma?: boolean | undefined;
	readonly hasSpaceMaintainer?: boolean | undefined;
	readonly customNotes: string;
	readonly hasAnesthesia: boolean;
}

export function buildParentMemoText({
	patientName,
	patientAgeYears,
	clinicName,
	doctorName,
	frankl,
	hasPulpotomy,
	pulpotomyTooth,
	hasFissureSealing,
	parsedFissureTeeth,
	hasSilvering,
	parsedSilveringTeeth,
	hasTrauma = false,
	hasSpaceMaintainer = false,
	customNotes,
	hasAnesthesia,
}: GenerateParentMemoTextParams): string {
	const baseText = generatePediatricParentRecommendations({
		patientName,
		patientAgeYears,
		clinicName,
		doctorName,
		franklRating: frankl,
		pulpotomy: hasPulpotomy ? { toothNumber: pulpotomyTooth } : undefined,
		fissureSealing: hasFissureSealing
			? { teethNumbers: parsedFissureTeeth.length > 0 ? (parsedFissureTeeth as number[]) : [16, 26, 36, 46] }
			: undefined,
		silvering: hasSilvering
			? { teethNumbers: parsedSilveringTeeth.length > 0 ? (parsedSilveringTeeth as number[]) : [51, 52, 61, 62] }
			: undefined,
		traumaIadt: hasTrauma ? { notes: "Шинирование и стабилизация зуба" } : undefined,
		spaceMaintainer: hasSpaceMaintainer ? { notes: "Кольцо-петля" } : undefined,
		customNotes: customNotes.trim() || undefined,
	});

	const cleanedBaseText = baseText
		.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{FE0F}]/gu, "")
		.replace(/  +/g, " ");

	if (!hasAnesthesia) return cleanedBaseText;

	const anesthesiaSection = [
		"",
		"───────────────────────────────────────────────────────────────",
		"Внимание родителям: памятка после местной анестезии:",
		"• Онемение губы, щеки и языка сохраняется в течение 2–3 часов после лечения.",
		"• Категорически запрещено: давать ребенку прикусывать, жевать или тереть онемевшую губу!",
		"  Из-за отсутствия болевой чувствительности ребенок может сильно травмировать мягкие ткани.",
		"• Питание: не кормить ребенка твердой и горячей пищей до полного восстановления чувствительности.",
		"  Разрешено только теплое питье через трубочку, бульон или мягкий йогурт.",
		"• Обезболивание: при возникновении ноющего дискомфорта после отхода заморозки дайте детский",
		"  обезболивающий препарат (Ибупрофен / Парацетамол) строго по весу ребенка.",
	].join("\n");

	return `${cleanedBaseText}\n${anesthesiaSection}`;
}
