/**
 * apps/web/src/components/emr/clinicalDiaryMath.ts
 *
 * Единый канонический SSOT-модуль клинических расчетов, индексов (КПУ, CPITN, OHI-S),
 * валидации полноты и печати медицинской карты приёма DENTE CRM.
 * Мандаты 8e (Автономия врача), 8n (Соло-врач), 8x/8ap (Единый предметный язык).
 */

export * from "./math/recordMathFormatting";
export * from "./math/recordMathIndices";
export * from "./math/recordMathValidation";
export * from "./math/recordMathStamps";

export { renderFdiFormulaTableHtml } from "./record/html/recordHtmlFdiTable";
export { generateMedicalRecordPrintHtml } from "./record/html/recordHtmlGenerator";

export { escapeXml, generate043XmlCda } from "./export/recordExportXml";
export { generate043JsonExport, generate043PlainText } from "./export/recordExportJsonText";

// Канонические доменные алиасы
export { generate043XmlCda as generateMedicalRecordXmlCda } from "./export/recordExportXml";
export {
	generate043JsonExport as generateMedicalRecordJsonExport,
	generate043PlainText as generateMedicalRecordPlainText,
} from "./export/recordExportJsonText";
