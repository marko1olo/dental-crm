/**
 * Печатные формы и методы пакетной и одиночной печати ИДС
 */
export { generateConsentPackagePrintHtml } from "./packagePrintHtml";
export { generateSingleConsentTemplatePrintHtml } from "./singleTemplatePrintHtml";
export {
	printBlankConsentPackage,
	printFilledConsentPackage,
	printBlankConsentTemplate,
	printFilledConsentTemplate,
} from "./packagePrintActions";
