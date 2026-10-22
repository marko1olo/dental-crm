import type { ToothData } from "../../../odontogram/ToothChart";
import { generate3TierPlanComparison, generateTreatmentPlanStages } from "../../treatmentPlanStagesEngine";

export const sampleTeeth3Tier: ToothData[] = [
	{ id: 16, state: "caries", systemicNotes: "Глубокий кариес" } as any,
	{ id: 36, state: "missing", systemicNotes: "Отсутствует зуб, показана имплантация" } as any,
];

export const sampleTiers3Tier = generate3TierPlanComparison(sampleTeeth3Tier);
export const sampleStages3Tier = generateTreatmentPlanStages(sampleTeeth3Tier);
