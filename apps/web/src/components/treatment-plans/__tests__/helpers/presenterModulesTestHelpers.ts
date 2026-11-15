import type { ToothData } from "../../../odontogram/ToothChart";
import { generate3TierPlanComparison } from "../../treatmentPlanStagesEngine";

export const mockSampleTeethPresenter: ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес жевательной поверхности" },
	{ toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация Astra Tech)" },
	{ toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 корневых канала)" },
	{ toothNumber: 11, state: "Crown", notes: "Эстетическая реставрация / коронка e.max" },
];

export const mockTiersPresenter = generate3TierPlanComparison(mockSampleTeethPresenter, undefined, 0, 0, { isDemoMode: true });
export const mockStandardTierPresenter = mockTiersPresenter.find((t) => t.tierId === "standard") || mockTiersPresenter[0]!;
