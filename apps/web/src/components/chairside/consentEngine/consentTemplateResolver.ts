/**
 * apps/web/src/components/chairside/consentEngine/consentTemplateResolver.ts
 *
 * Канонический фасад резолвера согласий и юридического щита клиники (SSOT).
 * Декомпозирован на sweet-spot модули по Мандату 8b/8zi.
 * 100% обратная совместимость всех типов и публичных функций.
 */

export {
	calculateItemTotalKopecks,
	calculateEstimateTotalKopecks,
	formatKopecksToRubles,
} from "./resolver/consentFinancialMath.js";

export {
	kopecksToRussianWords,
	declineRussianWord,
} from "./resolver/numberToRussianWords.js";

export {
	generateIds1051nDocument,
	generatePersonalDataConsentDocument,
	generatePdn152fzDocument,
	generateEstimateDocument,
	createChairsideConsentPackage,
	renderChairsidePackageHtml,
} from "./resolver/consentHtmlTemplates.js";
