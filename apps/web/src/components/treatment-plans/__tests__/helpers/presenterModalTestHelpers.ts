import type { ToothData } from "../../../odontogram/ToothChart";
import { generate3TierPlanComparison } from "../../treatmentPlanStagesEngine";

export const sampleTeeth: ToothData[] = [
	{
		toothNumber: 16,
		state: "Caries",
		notes: "Глубокий кариес",
	},
	{
		toothNumber: 36,
		state: "Missing",
		notes: "Отсутствует зуб, показана имплантация",
	},
	{
		toothNumber: 46,
		state: "Pulpitis",
		notes: "Острый пульпит",
	},
];

export const sampleTiers = generate3TierPlanComparison(sampleTeeth);
