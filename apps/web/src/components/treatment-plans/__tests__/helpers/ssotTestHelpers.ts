import type { ToothData } from "../../../odontogram/ToothChart";
import { generate3TierPlanComparison } from "../../treatmentPlanStagesEngine";

export const sampleTeethSsot: ToothData[] = [
	{ id: 16, toothNumber: 16, state: "Caries", notes: "Глубокий кариес" } as any,
	{ id: 36, toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация)" } as any,
	{ id: 46, toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 канала)" } as any,
	{ id: 11, toothNumber: 11, state: "Crown", notes: "Коронка e.max" } as any,
	{ id: 24, toothNumber: 24, state: "Caries", notes: "Кариес" } as any,
];

export const sampleTiersSsot = generate3TierPlanComparison(sampleTeethSsot, undefined, 0, 0, { isDemoMode: true });
export const standardTierSsot = sampleTiersSsot.find((t) => t.tierId === "standard") || sampleTiersSsot[0]!;
