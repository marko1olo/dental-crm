import type { ClinicalEstimateItem } from "./clinicalWorkflowTypes";
import { CLINICAL_STANDARD_PRICE_CATALOG } from "./clinicalStandardCatalog";

export function extractTherapyAndEndoHeuristics(
	treatmentText: string,
	diagText: string,
	toothNumber?: number | undefined,
): ClinicalEstimateItem[] {
	const items: ClinicalEstimateItem[] = [];

	// 1. Анестезия
	if (
		treatmentText.includes("анестезия") ||
		treatmentText.includes("ультракаин") ||
		treatmentText.includes("скандонест") ||
		treatmentText.includes("септанест") ||
		treatmentText.includes("лидокаин") ||
		treatmentText.includes("артикаин")
	) {
		const cat = CLINICAL_STANDARD_PRICE_CATALOG.anesthesia_infiltration;
		items.push({
			id: `est-anes-${Date.now()}-1`,
			code: cat.code,
			name: cat.name,
			quantity: 1,
			priceRub: cat.priceRub,
			totalRub: cat.priceRub,
			category: "anesthesia",
			toothNumber,
		});
	}

	// 2. Коффердам / изоляция
	if (
		treatmentText.includes("коффердам") ||
		treatmentText.includes("рабердам") ||
		treatmentText.includes("раббердам") ||
		treatmentText.includes("изоляция")
	) {
		const cat = CLINICAL_STANDARD_PRICE_CATALOG.cofferdam_isolation;
		items.push({
			id: `est-coff-${Date.now()}-2`,
			code: cat.code,
			name: cat.name,
			quantity: 1,
			priceRub: cat.priceRub,
			totalRub: cat.priceRub,
			category: "isolation",
			toothNumber,
		});
	}

	// 3. Эндодонтия
	if (
		diagText.startsWith("K04") ||
		treatmentText.includes("экстирпация") ||
		treatmentText.includes("апекслокатор") ||
		treatmentText.includes("гуттаперча") ||
		treatmentText.includes("обтурация") ||
		treatmentText.includes("эндодонтическ") ||
		treatmentText.includes("корневых каналов")
	) {
		const cat = CLINICAL_STANDARD_PRICE_CATALOG.endo_treatment;
		items.push({
			id: `est-endo-${Date.now()}-3`,
			code: cat.code,
			name: cat.name,
			quantity: 1,
			priceRub: cat.priceRub,
			totalRub: cat.priceRub,
			category: "endodontics",
			toothNumber,
		});
	} else if (
		// 4. Терапия / Пломбирование кариеса
		diagText.startsWith("K02") ||
		treatmentText.includes("пломбирование") ||
		treatmentText.includes("estelite") ||
		treatmentText.includes("filtek") ||
		treatmentText.includes("композит") ||
		treatmentText.includes("реставрация") ||
		treatmentText.includes("препарирование")
	) {
		const cat = CLINICAL_STANDARD_PRICE_CATALOG.caries_composite;
		items.push({
			id: `est-caries-${Date.now()}-4`,
			code: cat.code,
			name: cat.name,
			quantity: 1,
			priceRub: cat.priceRub,
			totalRub: cat.priceRub,
			category: "therapy",
			toothNumber,
		});
	}

	return items;
}
