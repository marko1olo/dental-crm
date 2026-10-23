import type { LegalRepresentativeData, PediatricSomaticStatus } from "../PediatricSomaticAndLegalRep";
import type { PediatricAnesthesiaCalculationResult } from "../PediatricAnesthesiaCalculator";
import { generatePresetTreatment } from "./presetTreatmentGenerators";
import {
	buildFullClinicalNoteText,
	buildPhysiologicalNormClinicalNoteText,
	buildAdaptationVisitClinicalNoteText,
	buildPhysiologicalNorm043Text,
	buildAdaptationVisit043Text,
} from "./clinicalNoteFormatters";
import type { FranklExpressItem, PediatricProtocolDefinition, PediatricProtocolId, PediatricSedationState, PediatricServiceItem } from "./types";

export {
	buildPhysiologicalNormClinicalNoteText,
	buildAdaptationVisitClinicalNoteText,
	buildPhysiologicalNorm043Text,
	buildAdaptationVisit043Text,
};

export interface ClinicalCalculationParams {
	readonly currentTooth: number;
	readonly activePreset: PediatricProtocolDefinition;
	readonly activePresetId: PediatricProtocolId;
	readonly selectedSurfaces: readonly string[];
	readonly selectedMaterial: string;
	readonly anesthesiaCalculation: PediatricAnesthesiaCalculationResult | null;
	readonly anesthesiaText: string;
	readonly sedation: PediatricSedationState;
	readonly representative: LegalRepresentativeData;
	readonly representativeText: string;
	readonly somaticStatus: PediatricSomaticStatus;
	readonly somaticText: string;
	readonly activeFrankl: FranklExpressItem;
	readonly orthoFrenulumNormal: boolean;
	readonly orthoNasalBreathing: boolean;
	readonly orthoNoHarmfulHabits: boolean;
}

export interface ClinicalCalculationResult {
	readonly diagnosisIcd10: string;
	readonly diagnosisNameRu: string;
	readonly statusLocalis: string;
	readonly treatmentDescription: string;
	readonly recommendations: string;
	readonly services804n: readonly PediatricServiceItem[];
	readonly fullClinicalNoteText: string;
	/** @deprecated Использовать fullClinicalNoteText (Мандат 8x: искоренение советских шифров) */
	readonly fullProtocolText043: string;
	readonly toothFindingState: "Filled" | "EndoTreated" | "Watch" | "Healthy" | "Extracted" | "Crown";
}

export function calculateClinicalProtocol(params: ClinicalCalculationParams): ClinicalCalculationResult {
	const surfacesStr = params.selectedSurfaces.join(", ") || "O";
	const presetResult = generatePresetTreatment(params.activePresetId, params.currentTooth, surfacesStr, params.selectedMaterial);
	const services: PediatricServiceItem[] = [{ code: params.activePreset.serviceCode804n, nameRu: params.activePreset.serviceName804n }, ...presetResult.extraServices];
	let treatmentDescription = presetResult.treatmentDescription;

	if (params.anesthesiaCalculation && params.anesthesiaCalculation.carpulesAdministered > 0) {
		services.push({ code: "B01.003.004.004", nameRu: `Местная анестезия (${params.anesthesiaCalculation.drug.nameRu}): ${params.anesthesiaCalculation.carpulesAdministered} карп. (${params.anesthesiaCalculation.totalDoseAdministeredMg} мг)` });
		const anesthNote = params.anesthesiaCalculation.formattedClinicalNote;
		treatmentDescription += `\nМестная анестезия: ${anesthNote}`;
	} else if (params.anesthesiaText) {
		treatmentDescription += `\nМестная анестезия: ${params.anesthesiaText}`;
	}

	if (params.sedation.enabled) {
		services.push({ code: "B01.003.004.005", nameRu: `Ингаляционная седация закисью азота-кислородом (ЗАКС): N2O ${params.sedation.gasRatioN2O}%, ${params.sedation.durationMinutes} мин` });
		treatmentDescription += `\nСедация ЗАКС: подача смеси ${params.sedation.gasRatioN2O}% N2O / ${params.sedation.gasRatioO2}% O2 (${params.sedation.durationMinutes} мин). Оксигенация 100% O2 (${params.sedation.postOxygenationMinutes} мин). SpO2 ${params.sedation.spO2Percent}%, ЧСС ${params.sedation.pulseBpm} уд/мин.`;
	}

	const repLine = params.representativeText || `Родитель: ${params.representative.role === "Мать" ? "Мама" : params.representative.role === "Отец" ? "Папа" : params.representative.role}${params.representative.fullName ? ` (${params.representative.fullName}${params.representative.phone ? `, ${params.representative.phone}` : ""})` : ""}. Согласие получено.`;
	const somaticLine = params.somaticText || `Соматический статус ребенка: физиологическая норма (соматически здоров).\n   • Развитие: ${params.somaticStatus.physicalDevelopmentRu}.\n   • Аллергии: ${params.somaticStatus.allergiesRu}.\n   • Хронические: ${params.somaticStatus.chronicDiseasesRu}.`;

	const fullClinicalNoteText = buildFullClinicalNoteText({
		repLine,
		activeFrankl: params.activeFrankl,
		somaticLine,
		orthoFrenulumNormal: params.orthoFrenulumNormal,
		orthoNasalBreathing: params.orthoNasalBreathing,
		orthoNoHarmfulHabits: params.orthoNoHarmfulHabits,
		currentTooth: params.currentTooth,
		diagnosisIcd10: params.activePreset.diagnosisIcd10,
		diagnosisNameRu: params.activePreset.diagnosisNameRu,
		services,
		statusLocalis: presetResult.statusLocalis,
		treatmentDescription,
		recommendations: presetResult.recommendations,
	});

	return {
		diagnosisIcd10: params.activePreset.diagnosisIcd10,
		diagnosisNameRu: params.activePreset.diagnosisNameRu,
		statusLocalis: presetResult.statusLocalis,
		treatmentDescription,
		recommendations: presetResult.recommendations,
		services804n: services,
		fullClinicalNoteText,
		fullProtocolText043: fullClinicalNoteText,
		toothFindingState: params.activePreset.defaultToothFindingState,
	};
}
