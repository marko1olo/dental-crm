import type { ClinicalEstimateItem } from "./clinicalWorkflowTypes";
import { CLINICAL_STANDARD_PRICE_CATALOG } from "./clinicalStandardCatalog";

export function extractSurgeryAndDiagnosticsHeuristics(
	treatmentText: string,
	statusText: string,
	diagText: string,
	toothNumber?: number | undefined,
): ClinicalEstimateItem[] {
	const items: ClinicalEstimateItem[] = [];

	// 5. Хирургическое удаление зуба
	if (
		diagText.startsWith("K08.1") ||
		diagText.startsWith("K01") ||
		diagText.startsWith("K08") ||
		treatmentText.includes("удаление") ||
		treatmentText.includes("элевация") ||
		treatmentText.includes("люксация") ||
		treatmentText.includes("лунки")
	) {
		const cat = CLINICAL_STANDARD_PRICE_CATALOG.extraction_simple;
		items.push({
			id: `est-surg-${Date.now()}-5`,
			code: cat.code,
			name: cat.name,
			quantity: 1,
			priceRub: cat.priceRub,
			totalRub: cat.priceRub,
			category: "surgery",
			toothNumber,
		});
	}

	// 6. Профессиональная гигиена
	if (
		diagText.startsWith("K05") ||
		diagText.startsWith("K03.6") ||
		treatmentText.includes("гигиена") ||
		treatmentText.includes("air-flow") ||
		treatmentText.includes("скейлинг") ||
		treatmentText.includes("ультразвук")
	) {
		const cat = CLINICAL_STANDARD_PRICE_CATALOG.hygiene_complex;
		items.push({
			id: `est-hyg-${Date.now()}-6`,
			code: cat.code,
			name: cat.name,
			quantity: 1,
			priceRub: cat.priceRub,
			totalRub: cat.priceRub,
			category: "hygiene",
			toothNumber,
		});
	}

	// 7. Рентген / Визиография
	if (
		treatmentText.includes("визиография") ||
		treatmentText.includes("снимок") ||
		treatmentText.includes("рентген") ||
		statusText.includes("на снимке") ||
		statusText.includes("визиограф")
	) {
		const cat = CLINICAL_STANDARD_PRICE_CATALOG.radiovisiography;
		items.push({
			id: `est-rad-${Date.now()}-7`,
			code: cat.code,
			name: cat.name,
			quantity: 1,
			priceRub: cat.priceRub,
			totalRub: cat.priceRub,
			category: "diagnostics",
			toothNumber,
		});
	}

	return items;
}
