import type { ToothData } from "../../../odontogram/ToothChart";
import { generate3TierPlanComparison, generateTreatmentPlanStages } from "../../treatmentPlanStagesEngine";

export const sampleTeeth3Tier: ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес" },
	{ toothNumber: 36, state: "Missing", notes: "Отсутствует зуб, показана имплантация" },
];

export const sampleTiers3Tier = generate3TierPlanComparison(sampleTeeth3Tier);
export const sampleStages3Tier = generateTreatmentPlanStages(sampleTeeth3Tier);
