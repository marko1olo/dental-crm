/**
 * CDA R2 ClinicalDocument header (realm through versionNumber / relatedDocument).
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
			<code code="74208-1" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Протокол стоматологического осмотра"/>
			<setId root="${docIdRoot}" extension="${escapeXml(setIdExtension)}"/>
			<versionNumber value="${Math.max(1, documentVersion - 1)}"/>
		</parentDocument>
	</relatedDocument>`
		: "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<!-- DEFECT #76: realmCode required by HL7 CDA R2 / EGISZ SEMD header profile (RU) -->
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="${EGISZ_OIDS.SEMD_TEMPLATE_CONSULTATION}"/>
	<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}"/>
	<code code="74208-1" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Протокол стоматологического осмотра"/>
	<title>Протокол стоматологического осмотра</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="${EGISZ_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="обычный"/>
	<languageCode code="ru-RU"/>
	<!-- DEFECT #88: setId = document SET (stable); id above = this version -->
	<setId root="${docIdRoot}" extension="${escapeXml(setIdExtension)}"/>
	<versionNumber value="${documentVersion}"/>
	${relatedDocumentXml}`;
}
