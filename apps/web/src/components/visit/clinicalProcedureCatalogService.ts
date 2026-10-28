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
		case "defective_restoration":
		case "defective":
		case "defect":
			return {
				id: `srv-defective-restoration-${toothNumber}`,
				title: `Замена несостоятельной пломбы зуба ${toothNumber}`,
				code: "A16.07.002.011",
				code804n: "A16.07.002.011",
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
		case "periodontitis_mild":
		case "periodontitis_moderate":
		case "periodontitis_severe":
			return {
				id: `srv-perio-${toothNumber}`,
				title: `Лечение периодонтита зуба ${toothNumber}`,
				code: "A16.07.008",
				code804n: "A16.07.008",
				priceRub: 7500,
			};
		case "done":
		case "fill":
		case "filled":
		case "filling":
			return {
				id: `srv-fill-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} пломбой из фотокомпозита`,
				code: "A16.07.002.011",
				code804n: "A16.07.002.011",
				priceRub: 4000,
			};
		case "calculus":
			return {
				id: `srv-calculus-${toothNumber}`,
				title: `Удаление зубных отложений (скейлинг) в области зуба ${toothNumber}`,
				code: "A16.07.050.001",
				code804n: "A16.07.050.001",
				priceRub: 2500,
			};
		case "crown":
		case "planned_crown":
			return {
				id: `srv-crown-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} коронкой`,
				code: "A16.07.004",
				code804n: "A16.07.004",
				priceRub: 18000,
			};
		case "bridge":
		case "bridge_abutment":
			return {
				id: `srv-bridge-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} искусственным зубом (мостовидный протез)`,
				code: "A16.07.004.002",
				code804n: "A16.07.004.002",
				priceRub: 18500,
			};
		case "veneer":
			return {
				id: `srv-veneer-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} керамическим виниром`,
				code: "A16.07.003.001",
				code804n: "A16.07.003.001",
				priceRub: 22000,
			};
		case "inlay":
		case "onlay":
			return {
				id: `srv-inlay-${toothNumber}`,
				title: `Восстановление зуба ${toothNumber} керамической вкладкой`,
				code: "A16.07.003",
				code804n: "A16.07.003",
				priceRub: 16000,
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
		case "root":
			return {
				id: `srv-root-extract-${toothNumber}`,
				title: `Удаление корня зуба ${toothNumber}`,
				code: "A16.07.001.002",
				code804n: "A16.07.001.002",
				priceRub: 4000,
			};
		case "retained":
		case "impacted":
			return {
				id: `srv-retained-extract-${toothNumber}`,
				title: `Удаление ретинированного/дистопированного зуба ${toothNumber}`,
				code: "A16.07.001.003",
				code804n: "A16.07.001.003",
				priceRub: 6500,
			};
		case "implant":
		case "planned":
		case "planned_implant":
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
