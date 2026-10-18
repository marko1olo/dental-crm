import type { ToothData } from "../../../odontogram/ToothChart";
import type { TreatmentPlanTierId } from "../../types";
import { formatChairsidePrice } from "../../treatmentPlanMath";

export const DEFAULT_SAMPLE_TEETH: ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес" },
	{ toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация)" },
	{ toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 канала)" },
	{ toothNumber: 11, state: "Crown", notes: "Коронка / винир" },
	{ toothNumber: 24, state: "Caries", notes: "Кариес" },
];

export const getTierLetter = (tierId: TreatmentPlanTierId): string => {
	switch (tierId) {
		case "economy":
			return "Вариант А: Базовый (Эконом)";
		case "standard":
			return "Вариант Б: Оптимум (Оптимальный)";
		case "optimum":
			return "Вариант В: Премиум";
		default:
			return "Вариант";
	}
};

export const formatRubles = (amount: number | undefined | null): string => {
	return formatChairsidePrice(amount);
};
