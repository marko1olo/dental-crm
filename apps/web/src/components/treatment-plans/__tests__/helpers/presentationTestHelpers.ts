import { parseKopecks, type Kopecks } from "@dental/shared";
import type { ToothData } from "../../../odontogram/ToothChart";

export const sampleTeethPresentation: ToothData[] = [
	{ id: 16, toothNumber: 16, state: "Caries", systemicNotes: "Глубокий кариес жевательной поверхности" } as any,
	{ id: 21, toothNumber: 21, state: "Fractured", systemicNotes: "Скол коронковой части зуба" } as any,
	{ id: 36, toothNumber: 36, state: "Missing", systemicNotes: "Адентия 36, показана имплантация" } as any,
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
		priceRub: Math.round(finalUnitPriceKopecks / 100),
		materials,
	};
}
