/**
 * apps/api/src/services/cda/header.ts
 *
 * Facade delegating CDA R2 header generation to canonical @dental/shared/cda per Mandate 8s.
 */

export * from "@dental/shared/cda";
import { EGISZ_OIDS, escapeXml } from "@dental/shared/cda";
import type { CdaContext } from "./util.js";

export function generateCdaHeader(ctx: CdaContext): string {
	const { params, effectiveTime, setIdExtension, replacesId, docIdRoot, documentVersion } = ctx;
	const rplc = replacesId
		? `\n\t<relatedDocument typeCode="RPLC">\n\t\t<parentDocument>\n\t\t\t<id root="${docIdRoot}" extension="${escapeXml(replacesId)}"/>\n\t\t\t<code code="108" codeSystem="${EGISZ_OIDS.DOC_TYPE_NSI}" codeSystemName="Виды медицинской документации" displayName="Протокол консультации (стоматология)"/>\n\t\t\t<setId root="${docIdRoot}" extension="${escapeXml(setIdExtension)}"/>\n\t\t\t<versionNumber value="${Math.max(1, documentVersion - 1)}"/>\n\t\t</parentDocument>\n\t</relatedDocument>`
		: "";
	return `<?xml version="1.0" encoding="UTF-8"?>\n<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n\t<realmCode code="RU"/>\n\t<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>\n\t<templateId root="${EGISZ_OIDS.SEMD_TEMPLATE_DENTAL_108}"/>\n\t<templateId root="${EGISZ_OIDS.SEMD_TEMPLATE_CONSULTATION}"/>\n\t<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}"/>\n\t<code code="108" codeSystem="${EGISZ_OIDS.DOC_TYPE_NSI}" codeSystemName="Виды медицинской документации" displayName="Протокол консультации (стоматология)"/>\n\t<title>Протокол стоматологического осмотра (консультации)</title>\n\t<effectiveTime value="${effectiveTime}"/>\n\t<confidentialityCode code="N" codeSystem="${EGISZ_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="обычный"/>\n\t<languageCode code="ru-RU"/>\n\t<setId root="${docIdRoot}" extension="${escapeXml(setIdExtension)}"/>\n\t<versionNumber value="${documentVersion}"/>${rplc}`;
}
