/**
 * apps/web/src/components/visit/clinicalProcedureCatalogService.ts
 *
 * Каталог клинических процедур и автоматическое сопоставление состояния зуба с прейскурантом услуг.
 * Чистая доменная логика стоматологических манипуляций без бюрократических шифров в интерфейсе.
 */

export interface ClinicalProcedureService {
	id: string;
	title: string;
	code: string;
	/** Алиас обратной совместимости для старых тестов и внутренних модулей */
	code804n: string;
	priceRub: number;
}

// Для обратной совместимости типов
export type Inferred804nService = ClinicalProcedureService;

/**
 * Сопоставляет клиническую отметку (штамп зуба) с процедурой из каталога услуг клиники.
 */
export function inferProcedureServiceFromStamp(
	stamp: string,
	toothNumber: number,
): ClinicalProcedureService | null {
	const s = String(stamp || "").trim().toLowerCase();
	switch (s) {
		case "caries":
			return {
				id: `srv-caries-${toothNumber}`,
				title: `Лечение кариеса зуба ${toothNumber} со световой пломбой`,
				code: "A16.07.002",
				code804n: "A16.07.002",
				priceRub: 4500,
			};
		case "pulpitis":
			return {
				id: `srv-pulpitis-${toothNumber}`,
				title: `Эндодонтическое лечение пульпита зуба ${toothNumber}`,
				code: "A16.07.030",
				code804n: "A16.07.030",
				priceRub: 6500,
			};
		case "treatment":
		case "periodontitis":
			return {
				id: `srv-perio-${toothNumber}`,
				title: `Лечение периодонтита зуба ${toothNumber}`,
				code: "A16.07.008",
				code804n: "A16.07.008",
				priceRub: 7500,
			};
		case "done":
		case "fill":
		case "filling":
			return {
				id: `srv-fill-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} пломбой из фотокомпозита`,
				code: "A16.07.002.011",
				code804n: "A16.07.002.011",
				priceRub: 4000,
			};
		case "crown":
			return {
				id: `srv-crown-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} коронкой`,
				code: "A16.07.004",
				code804n: "A16.07.004",
				priceRub: 18000,
			};
		case "missing":
		case "extracted":
			return {
				id: `srv-extract-${toothNumber}`,
				title: `Удаление зуба ${toothNumber}`,
				code: "A16.07.001",
				code804n: "A16.07.001",
				priceRub: 3500,
			};
		case "implant":
		case "planned":
			return {
				id: `srv-implant-${toothNumber}`,
				title: `Внутрикостная дентальная имплантация в области зуба ${toothNumber}`,
				code: "A16.07.054",
				code804n: "A16.07.054",
				priceRub: 35000,
			};
		default:
			return null;
	}
}

/**
 * Алиас обратной совместимости
 */
export const infer804nServiceFromStamp = inferProcedureServiceFromStamp;
