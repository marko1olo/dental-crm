import type { ToothData } from "../../../odontogram/ToothChart";
import { generate3TierPlanComparison } from "../../treatmentPlanStagesEngine";

export const sampleTeeth: ToothData[] = [
	{
		id: 16,
		toothNumber: 16,
		state: "Caries",
		systemicNotes: "Глубокий кариес",
	} as any,
	{
		id: 36,
		toothNumber: 36,
		state: "Missing",
		systemicNotes: "Отсутствует зуб, показана имплантация",
	} as any,
	{
		id: 46,
		toothNumber: 46,
		state: "Pulpitis",
		systemicNotes: "Острый пульпит",
	} as any,
];

export const sampleTiers = generate3TierPlanComparison(sampleTeeth);
