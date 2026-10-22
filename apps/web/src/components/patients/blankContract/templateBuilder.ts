/**
 * apps/web/src/components/patients/blankContract/templateBuilder.ts
 *
 * Тонкий фасад сборщика печатных бланков договоров и ИДС.
 * Единый канонический источник правды (SSOT): paidContract/blankContract.ts (Мандат 8e / 8n).
 */

export {
	generateBlankContractFallbackHtml,
	generateBlankConsentFallbackHtml,
} from "../../documents/paidContract/blankContract";
