/**
 * apps/web/src/components/emr/outpatientRecordExportEngines.ts
 *
 * Канонические движки экспорта амбулаторной медицинской карты пациента (Мандат 8ap, 8x).
 * Единый доменный язык DENTE без бюрократических номеров приказов.
 */

export { escapeXml, generate043XmlCda as generateOutpatientRecordXmlCda } from "./export/recordExportXml";
export {
	generate043JsonExport as generateOutpatientRecordJsonExport,
	generate043PlainText as generateOutpatientRecordPlainText,
} from "./export/recordExportJsonText";

// Алиасы для обратной совместимости
export { generate043XmlCda } from "./export/recordExportXml";
export { generate043JsonExport, generate043PlainText } from "./export/recordExportJsonText";
