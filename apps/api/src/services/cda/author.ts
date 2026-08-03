/**
 * CDA R2 author-side participations + encounter linkage.
 * All organization shells are FLAT (id + addr/telecom NI + name).
 * NEVER emit asOrganizationPartOf / wholeOrganization / asEmployee recursion.
 */

import type { CdaContext } from "./util.js";
import {
	DEFAULT_MO_ROOT,
	doctorCodeXml,
	doctorIdXml,
	doctorNameXml,
	escapeXml,
	flatAssignedEntity,
	flatRepresentedOrganization,
	flatScopingOrganization,
	orgIdXml,
} from "./util.js";

export function generateCdaAuthorAndCustodian(ctx: CdaContext): string {
	const {
		params,
		effectiveTime,
		visitTime,
		encounterExtension,
		docIdRoot,
		clinicOidEscaped,
	} = ctx;

	const facilityId = clinicOidEscaped
		? `<id root="${DEFAULT_MO_ROOT}" extension="${clinicOidEscaped}"/>`
		: `<id nullFlavor="NI"/>`;

	const signatureCode =
		`<signatureCode code="S" codeSystem="2.16.840.1.113883.5.89" codeSystemName="ParticipationSignature" displayName="\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u043e"/>`;

	const ambCode =
		`<code code="AMB" codeSystem="1.2.643.5.1.13.13.11.1461" codeSystemName="\u0412\u0438\u0434\u044b \u043c\u0435\u0434\u0438\u0446\u0438\u043d\u0441\u043a\u043e\u0439 \u043f\u043e\u043c\u043e\u0449\u0438" displayName="\u0410\u043c\u0431\u0443\u043b\u0430\u0442\u043e\u0440\u043d\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c"/>`;

	const loincExam =
		`<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u041f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043e\u0441\u043c\u043e\u0442\u0440\u0430"/>`;

	const assignedEntity = flatAssignedEntity(ctx);
	const clinicName = escapeXml(params.clinicName);
	const encExt = escapeXml(encounterExtension);

	return `
	<author>
		<time value="${effectiveTime}"/>
		<assignedAuthor>
			${assignedEntity}
		</assignedAuthor>
	</author>
	<dataEnterer>
		<time value="${effectiveTime}"/>
		<assignedEntity>
			${assignedEntity}
		</assignedEntity>
	</dataEnterer>
	<informant>
		<time value="${effectiveTime}"/>
		<assignedEntity>
			${assignedEntity}
		</assignedEntity>
	</informant>
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				${orgIdXml(ctx)}
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${clinicName}</name>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>
	<informationRecipient>
		<intendedRecipient>
			<receivedOrganization>
				${orgIdXml(ctx)}
				<addr nullFlavor="NI"/>
				<telecom nullFlavor="NI"/>
				<name>${clinicName}</name>
			</receivedOrganization>
		</intendedRecipient>
	</informationRecipient>
	<legalAuthenticator>
		<time value="${effectiveTime}"/>
		${signatureCode}
		<assignedEntity>
			${assignedEntity}
		</assignedEntity>
	</legalAuthenticator>
	<authenticator>
		<time value="${effectiveTime}"/>
		${signatureCode}
		<assignedEntity>
			${assignedEntity}
		</assignedEntity>
	</authenticator>
	<documentationOf>
		<serviceEvent classCode="PCPR">
			<id root="${docIdRoot}" extension="${encExt}"/>
			${loincExam}
			<statusCode code="completed"/>
			<effectiveTime xsi:type="IVL_TS">
				<low value="${visitTime}"/>
			</effectiveTime>
			<performer typeCode="PRF">
				<time value="${visitTime}"/>
				<assignedEntity>
					${doctorIdXml(ctx)}
					${doctorCodeXml(ctx)}
					<addr nullFlavor="NI"/>
					<telecom nullFlavor="NI"/>
					<assignedPerson>
						${doctorNameXml(ctx)}
					</assignedPerson>
					${flatRepresentedOrganization(ctx)}
				</assignedEntity>
			</performer>
		</serviceEvent>
	</documentationOf>
	<inFulfillmentOf>
		<order>
			<id root="${docIdRoot}" extension="${encExt}"/>
			<code nullFlavor="NI"/>
			<statusCode code="completed"/>
		</order>
	</inFulfillmentOf>
	<participant typeCode="REF">
		<time value="${effectiveTime}"/>
		<associatedEntity classCode="PROV">
			${doctorIdXml(ctx)}
			${doctorCodeXml(ctx)}
			<addr nullFlavor="NI"/>
			<telecom nullFlavor="NI"/>
			<associatedPerson>
				${doctorNameXml(ctx)}
			</associatedPerson>
			${flatScopingOrganization(ctx)}
		</associatedEntity>
	</participant>
	<authorization>
		<consent>
			<id root="${docIdRoot}" extension="${escapeXml(params.documentId)}-consent"/>
			<code nullFlavor="NI"/>
			<statusCode code="completed"/>
			<effectiveTime value="${effectiveTime}"/>
		</consent>
	</authorization>
	<componentOf>
		<encompassingEncounter>
			<id root="${docIdRoot}" extension="${encExt}"/>
			${ambCode}
			<statusCode code="completed"/>
			<effectiveTime xsi:type="IVL_TS">
				<low value="${visitTime}"/>
			</effectiveTime>
			<responsibleParty>
				<assignedEntity>
					${doctorIdXml(ctx)}
					${doctorCodeXml(ctx)}
					<addr nullFlavor="NI"/>
					<telecom nullFlavor="NI"/>
					<assignedPerson>
						${doctorNameXml(ctx)}
					</assignedPerson>
					${flatRepresentedOrganization(ctx)}
				</assignedEntity>
			</responsibleParty>
			<location>
				<healthCareFacility>
					${facilityId}
					${ambCode}
					<location>
						<addr nullFlavor="NI"/>
						<name>${clinicName}</name>
					</location>
					<serviceProviderOrganization>
						${orgIdXml(ctx)}
						<addr nullFlavor="NI"/>
						<telecom nullFlavor="NI"/>
						<name>${clinicName}</name>
					</serviceProviderOrganization>
				</healthCareFacility>
			</location>
		</encompassingEncounter>
	</componentOf>`;
}
