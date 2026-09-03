/**
 * CDA R2 ClinicalDocument header (realm through versionNumber / relatedDocument).
 * Aligned with Minzdrav SEMD 108 Template 1.2.643.5.1.13.13.11.108.
 */

import type { CdaContext } from "./util.js";
import { EGISZ_OIDS, escapeXml } from "./util.js";

export function generateCdaHeader(ctx: CdaContext): string {
	const {
		params,
		effectiveTime,
		setIdExtension,
		replacesId,
		docIdRoot,
		documentVersion,
	} = ctx;

	const relatedDocumentXml = replacesId
		? `
	<relatedDocument typeCode="RPLC">
		<parentDocument>
			<id root="${docIdRoot}" extension="${escapeXml(replacesId)}"/>
			<code code="108" codeSystem="${EGISZ_OIDS.DOC_TYPE_NSI}" codeSystemName="Виды медицинской документации" displayName="Протокол стоматологического осмотра"/>
			<setId root="${docIdRoot}" extension="${escapeXml(setIdExtension)}"/>
			<versionNumber value="${Math.max(1, documentVersion - 1)}"/>
		</parentDocument>
	</relatedDocument>`
		: "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="${EGISZ_OIDS.SEMD_TEMPLATE_DENTAL_108}"/>
	<templateId root="${EGISZ_OIDS.SEMD_TEMPLATE_CONSULTATION}"/>
	<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}"/>
	<code code="108" codeSystem="${EGISZ_OIDS.DOC_TYPE_NSI}" codeSystemName="Виды медицинской документации" displayName="Протокол стоматологического осмотра"/>
	<title>Протокол стоматологического осмотра (консультации)</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="${EGISZ_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="обычный"/>
	<languageCode code="ru-RU"/>
	<setId root="${docIdRoot}" extension="${escapeXml(setIdExtension)}"/>
	<versionNumber value="${documentVersion}"/>
	${relatedDocumentXml}`;
}
