import type { ToothData } from "../../../odontogram/ToothChart";
import { generate3TierPlanComparison } from "../../treatmentPlanStagesEngine";

export const sampleTeethSsot: ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес" },
	{ toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация)" },
	{ toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 канала)" },
	{ toothNumber: 11, state: "Crown", notes: "Коронка e.max" },
	{ toothNumber: 24, state: "Caries", notes: "Кариес" },
];

export const sampleTiersSsot = generate3TierPlanComparison(sampleTeethSsot, undefined, 0, 0, { isDemoMode: true });
export const standardTierSsot = sampleTiersSsot.find((t) => t.tierId === "standard") || sampleTiersSsot[0]!;
