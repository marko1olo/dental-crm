/**
 * perioPsrEngine.ts — Фасад расчетного движка PSR пародонтологии (Мандат 8b, < 40 строк).
 * Реэкспортирует канонический SSOT perioCatalogData.ts.
 */

export {
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyPsrSextantCode,
	generatePsrDiaryProtocol,
	getPsrMaxCode,
	hasPsrAsterisk,
} from "./perioCatalogData";
