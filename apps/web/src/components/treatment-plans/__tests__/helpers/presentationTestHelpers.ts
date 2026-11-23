import { parseKopecks, kopecksToRubles, type Kopecks } from "@dental/shared";
import type { ToothData } from "../../../odontogram/ToothChart";

export const sampleTeethPresentation: ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес жевательной поверхности" },
	{ toothNumber: 21, state: "Defective_Restoration", notes: "Скол коронковой части зуба" },
	{ toothNumber: 36, state: "Missing", notes: "Адентия 36, показана имплантация" },
];

export function createPlanItem(
	code804n: string,
	name: string,
	toothNumber: number,
	quantity: number,
	priceRub: number,
	discountRub: number,
	materials: string,
) {
	const unitPriceKopecks = parseKopecks(priceRub);
	const discountKopecksPerUnit = parseKopecks(discountRub);
	const finalUnitPriceKopecks = Math.max(0, unitPriceKopecks - discountKopecksPerUnit) as Kopecks;
	const totalKopecks = (finalUnitPriceKopecks * quantity) as Kopecks;
	const totalDiscountKopecks = (discountKopecksPerUnit * quantity) as Kopecks;
	return {
		code804n,
		name,
		toothNumber,
		quantity,
		unitPriceKopecks,
		discountKopecksPerUnit,
		finalUnitPriceKopecks,
		totalKopecks,
		totalDiscountKopecks,
		priceRub: Math.round(kopecksToRubles(finalUnitPriceKopecks)),
		materials,
	};
}
