/**
 * CDA R2 ClinicalDocument header (realm through versionNumber / relatedDocument).
 */

import type { CdaContext } from "./util.js";
import { escapeXml } from "./util.js";

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
			<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u041f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043e\u0441\u043c\u043e\u0442\u0440\u0430"/>
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
	<templateId root="1.2.643.5.1.13.13.11.1527"/>
	<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}"/>
	<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u041f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043e\u0441\u043c\u043e\u0442\u0440\u0430"/>
	<title>\u041f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043e\u0441\u043c\u043e\u0442\u0440\u0430</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
	<languageCode code="ru-RU"/>
	<!-- DEFECT #88: setId = document SET (stable); id above = this version -->
	<setId root="${docIdRoot}" extension="${escapeXml(setIdExtension)}"/>

	<versionNumber value="${documentVersion}"/>
	${relatedDocumentXml}`;
}
