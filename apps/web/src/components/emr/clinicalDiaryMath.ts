/**
 * apps/web/src/components/emr/clinicalDiaryMath.ts
 *
 * Единый канонический SSOT-модуль клинических расчетов, индексов (КПУ, CPITN, OHI-S),
 * валидации полноты и печати медицинской карты приёма DENTE CRM.
 * Мандаты 8e (Автономия врача), 8n (Соло-врач), 8x/8ap (Единый предметный язык).
 */

export * from "./math/recordMathFormatting.js";
export * from "./math/recordMathIndices.js";
export * from "./math/recordMathValidation.js";
export * from "./math/recordMathStamps.js";

export { renderFdiFormulaTableHtml } from "./record/html/recordHtmlFdiTable.js";
export { generateMedicalRecordPrintHtml } from "./record/html/recordHtmlGenerator.js";

export { escapeXml, generateMedicalRecordXmlCda, generate043XmlCda } from "./export/recordExportXml.js";
export {
	generateMedicalRecordJsonExport,
	generateMedicalRecordPlainText,
	generate043JsonExport,
	generate043PlainText,
} from "./export/recordExportJsonText.js";

import {
	type OutpatientProtocolTemplate,
	type StomxOutpatientTemplateMetadata,
	buildAuthenticProtocolTemplate,
} from "@dental/shared";

export const resolvedProtocolsCache = new Map<number, OutpatientProtocolTemplate>();

/**
 * Преобразует шаблон из каталога 448 клинических шаблонов в протокол медицинской карты (SOAP).
 * Результат кэшируется в RAM для мгновенного доступа без нагрузки на CPU.
 */
export function resolveProtocolFromTemplate(
	tpl: StomxOutpatientTemplateMetadata,
): OutpatientProtocolTemplate {
	const cached = resolvedProtocolsCache.get(tpl.id);
	if (cached) {
		return cached;
	}

	const resolved = buildAuthenticProtocolTemplate(tpl);
	resolvedProtocolsCache.set(tpl.id, resolved);
	return resolved;
}
