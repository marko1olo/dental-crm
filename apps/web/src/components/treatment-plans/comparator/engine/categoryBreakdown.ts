import type {
	ClinicalCategoryCode,
	ComprehensivePlanVariant,
} from "../planPresentationPresets.js";
import type { CategoryFinancialItem, PlanCategoryBreakdown } from "./comparatorTypes.js";

const CATEGORY_NAMES_RU: Record<ClinicalCategoryCode, string> = {
	surgery_implant: "Хирургия и имплантация",
	orthopedics_prosthetics: "Ортопедия и протезирование",
	therapy_endo: "Терапия и эндодонтия",
	hygiene_perio: "Гигиена и пародонтология",
};

export function getPlanCategoryBreakdown(plan: ComprehensivePlanVariant): PlanCategoryBreakdown {
	let surgeryRub = 0;
	let orthoRub = 0;
	let therapyRub = 0;
	let hygieneRub = 0;

	const counts: Record<ClinicalCategoryCode, number> = {
		surgery_implant: 0,
		orthopedics_prosthetics: 0,
		therapy_endo: 0,
		hygiene_perio: 0,
	};

	for (const proc of plan.procedures) {
		counts[proc.category] = (counts[proc.category] || 0) + proc.quantity;
		switch (proc.category) {
			case "surgery_implant":
				surgeryRub += proc.totalCostRub;
				break;
			case "orthopedics_prosthetics":
				orthoRub += proc.totalCostRub;
				break;
			case "therapy_endo":
				therapyRub += proc.totalCostRub;
				break;
			case "hygiene_perio":
				hygieneRub += proc.totalCostRub;
				break;
		}
	}

	const totalRub = surgeryRub + orthoRub + therapyRub + hygieneRub;
	const safeTotal = totalRub > 0 ? totalRub : plan.totalCostRub;

	const categories: CategoryFinancialItem[] = [
		{
			category: "surgery_implant",
			categoryNameRu: CATEGORY_NAMES_RU.surgery_implant,
			totalRub: surgeryRub,
			sharePercent: safeTotal > 0 ? Math.round((surgeryRub / safeTotal) * 100) : 0,
			proceduresCount: counts.surgery_implant,
		},
		{
			category: "orthopedics_prosthetics",
			categoryNameRu: CATEGORY_NAMES_RU.orthopedics_prosthetics,
			totalRub: orthoRub,
			sharePercent: safeTotal > 0 ? Math.round((orthoRub / safeTotal) * 100) : 0,
			proceduresCount: counts.orthopedics_prosthetics,
		},
		{
			category: "therapy_endo",
			categoryNameRu: CATEGORY_NAMES_RU.therapy_endo,
			totalRub: therapyRub,
			sharePercent: safeTotal > 0 ? Math.round((therapyRub / safeTotal) * 100) : 0,
			proceduresCount: counts.therapy_endo,
		},
		{
			category: "hygiene_perio",
			categoryNameRu: CATEGORY_NAMES_RU.hygiene_perio,
			totalRub: hygieneRub,
			sharePercent: safeTotal > 0 ? Math.round((hygieneRub / safeTotal) * 100) : 0,
			proceduresCount: counts.hygiene_perio,
		},
	];

	return {
		surgeryImplantRub: surgeryRub,
		orthopedicsProstheticsRub: orthoRub,
		therapyEndoRub: therapyRub,
		hygienePerioRub: hygieneRub,
		totalRub: safeTotal,
		categories,
	};
}
