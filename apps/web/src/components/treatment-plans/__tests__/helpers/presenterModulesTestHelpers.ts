import type { ToothData } from "../../../odontogram/ToothChart";
import { generate3TierPlanComparison } from "../../treatmentPlanStagesEngine";

export const mockSampleTeethPresenter: ToothData[] = [
	{ id: 16, toothNumber: 16, state: "Caries", notes: "Глубокий кариес жевательной поверхности" } as any,
	{ id: 36, toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация Astra Tech)" } as any,
	{ id: 46, toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 корневых канала)" } as any,
	{ id: 11, toothNumber: 11, state: "Crown", notes: "Эстетическая реставрация / коронка e.max" } as any,
];

export const mockTiersPresenter = generate3TierPlanComparison(mockSampleTeethPresenter, undefined, 0, 0, { isDemoMode: true });
export const mockStandardTierPresenter = mockTiersPresenter.find((t) => t.tierId === "standard") || mockTiersPresenter[0]!;
