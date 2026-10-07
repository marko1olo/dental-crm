/**
 * apps/web/src/components/visit/infer804nService.ts
 *
 * Maps tooth condition or stamp to Order 804n nomenclature clinical service.
 * Pure domain logic decoupled from UI and CSS.
 */

export interface Inferred804nService {
	id: string;
	title: string;
	code804n: string;
	priceRub: number;
}

/**
 * Maps tooth condition or stamp to Order 804n nomenclature clinical service.
 */
export function infer804nServiceFromStamp(
	stamp: string,
	toothNumber: number,
): Inferred804nService | null {
	const s = String(stamp || "").trim().toLowerCase();
	switch (s) {
		case "caries":
			return {
				id: `srv-caries-${toothNumber}`,
				title: `Лечение кариеса зуба ${toothNumber} со световой пломбой`,
				code804n: "A16.07.002",
				priceRub: 4500,
			};
		case "pulpitis":
			return {
				id: `srv-pulpitis-${toothNumber}`,
				title: `Эндодонтическое лечение пульпита зуба ${toothNumber}`,
				code804n: "A16.07.030",
				priceRub: 6500,
			};
		case "treatment":
		case "periodontitis":
			return {
				id: `srv-perio-${toothNumber}`,
				title: `Лечение периодонтита зуба ${toothNumber}`,
				code804n: "A16.07.008",
				priceRub: 7500,
			};
		case "done":
		case "fill":
		case "filling":
			return {
				id: `srv-fill-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} пломбой из фотокомпозита`,
				code804n: "A16.07.002.011",
				priceRub: 4000,
			};
		case "crown":
			return {
				id: `srv-crown-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} коронкой`,
				code804n: "A16.07.004",
				priceRub: 18000,
			};
		case "missing":
		case "extracted":
			return {
				id: `srv-extract-${toothNumber}`,
				title: `Удаление зуба ${toothNumber}`,
				code804n: "A16.07.001",
				priceRub: 3500,
			};
		case "implant":
		case "planned":
			return {
				id: `srv-implant-${toothNumber}`,
				title: `Внутрикостная дентальная имплантация в области зуба ${toothNumber}`,
				code804n: "A16.07.054",
				priceRub: 35000,
			};
		default:
			return null;
	}
}
