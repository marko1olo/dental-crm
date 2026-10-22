import type { TreatmentPlanItem } from "../../types";

export const sampleItemMissingPrice: TreatmentPlanItem = {
	id: "item-custom-01",
	toothNumber: 16,
	code804n: "A16.07.002.099",
	name: "Индивидуальная реставрация зуба композитом повышенной эстетики",
	category: "Терапия",
	priceRub: 0,
	unitPriceRub: 0,
	discountRub: 0,
	quantity: 1,
	phase: 1,
	stageKind: "stage_1_therapy",
	requiresManualPricing: true,
};

export const sampleItemPriced: TreatmentPlanItem = {
	id: "item-priced-02",
	toothNumber: 21,
	code804n: "A16.07.002.001",
	name: "Лечение кариеса эмали",
	category: "Терапия",
	priceRub: 4500,
	unitPriceRub: 4500,
	discountRub: 0,
	quantity: 1,
	phase: 1,
	stageKind: "stage_1_therapy",
	requiresManualPricing: false,
};
