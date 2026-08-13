/**
 * CDA R2 author-side participations + encounter linkage.
 * All organization shells are FLAT (id -> name -> telecom -> addr).
 * NEVER emit asOrganizationPartOf / wholeOrganization / asEmployee recursion.
 */

import type { CdaContext } from "./util.js";
import {
	clinicAddrXml,
	clinicTelecomXml,
	doctorCodeXml,
	doctorIdXml,
	doctorNameXml,
	doctorTelecomXml,
	EGISZ_OIDS,
	escapeXml,
	flatAssignedEntity,
	flatRepresentedOrganization,
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
		? `<id root="${clinicOidEscaped}" extension="${clinicOidEscaped}"/>`
		: `<id nullFlavor="NI"/>`;

	const signatureCode = `<signatureCode code="S"/>`;

	const ambCode = `<code code="AMB" codeSystem="${EGISZ_OIDS.MEDICAL_CARE_TYPE}" codeSystemName="Виды медицинской помощи" displayName="Амбулаторная помощь"/>`;

	const _loincExam = `<code code="74208-1" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Протокол стоматологического осмотра"/>`;

	const _assignedEntity = flatAssignedEntity(ctx);
	const clinicName = escapeXml(params.clinicName);
	const middleGiven = params.doctorName.middle
		? `\n\t\t\t\t\t\t\t<given>${escapeXml(params.doctorName.middle)}</given>`
		: "";
	const encExt = escapeXml(encounterExtension);

	return `
	<author>
		<time value="${effectiveTime}"/>
		<assignedAuthor>
			${doctorIdXml(ctx)}
			${doctorCodeXml(ctx)}
			${clinicAddrXml(ctx)}
			${doctorTelecomXml(ctx)}
			<assignedPerson>
				${doctorNameXml(ctx)}
			</assignedPerson>
			${flatRepresentedOrganization(ctx)}
		</assignedAuthor>
	</author>

	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				${orgIdXml(ctx)}
				<name>${clinicName}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>

	<informationRecipient>
		<intendedRecipient>
			<receivedOrganization>
				${orgIdXml(ctx)}
				<name>${clinicName}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</receivedOrganization>
		</intendedRecipient>
	</informationRecipient>

	<legalAuthenticator>
		<time value="${effectiveTime}"/>
		${signatureCode}
		<assignedEntity>
			${doctorIdXml(ctx)}
			${doctorCodeXml(ctx)}
			${clinicAddrXml(ctx)}
			${doctorTelecomXml(ctx)}
			<assignedPerson>
				${doctorNameXml(ctx)}
			</assignedPerson>
			<representedOrganization>
				${orgIdXml(ctx)}
				<name>${clinicName}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>

	<authenticator>
		<time value="${effectiveTime}"/>
		${signatureCode}
		<assignedEntity>
			${doctorIdXml(ctx)}
			${doctorCodeXml(ctx)}
			${clinicAddrXml(ctx)}
			${doctorTelecomXml(ctx)}
			<assignedPerson>
				${doctorNameXml(ctx)}
			</assignedPerson>
			<representedOrganization>
				${orgIdXml(ctx)}
				<name>${clinicName}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</representedOrganization>
		</assignedEntity>
	</authenticator>

	<documentationOf>
		<serviceEvent classCode="PCPR">
			<effectiveTime value="${visitTime}"/>
			<performer typeCode="PRF">
				<assignedEntity>
					${doctorIdXml(ctx)}
					${doctorCodeXml(ctx)}
					${clinicAddrXml(ctx)}
					${doctorTelecomXml(ctx)}
					<assignedPerson>
						<name>
							<family>${escapeXml(params.doctorName.last)}</family>
							<given>${escapeXml(params.doctorName.first)}</given>${middleGiven}
						</name>
					</assignedPerson>
					<representedOrganization>
						${orgIdXml(ctx)}
						<name>${clinicName}</name>
						${clinicTelecomXml(ctx)}
						${clinicAddrXml(ctx)}
					</representedOrganization>
				</assignedEntity>
			</performer>
		</serviceEvent>
	</documentationOf>

	<componentOf>
		<encompassingEncounter>
			<id root="${docIdRoot}" extension="${encExt}"/>
			${ambCode}
			<effectiveTime value="${visitTime}"/>
			<responsibleParty>
				<assignedEntity>
					${doctorIdXml(ctx)}
					${doctorCodeXml(ctx)}
					${clinicAddrXml(ctx)}
					${doctorTelecomXml(ctx)}
					<assignedPerson>
						${doctorNameXml(ctx)}
					</assignedPerson>
					${flatRepresentedOrganization(ctx)}
				</assignedEntity>
			</responsibleParty>
			<location>
				<healthCareFacility>
					${facilityId}
					<location>
						<name>${clinicName}</name>
						${clinicAddrXml(ctx)}
					</location>
					<serviceProviderOrganization>
						${orgIdXml(ctx)}
						<name>${clinicName}</name>
						${clinicTelecomXml(ctx)}
						${clinicAddrXml(ctx)}
					</serviceProviderOrganization>
				</healthCareFacility>
			</location>
		</encompassingEncounter>
	</componentOf>`;
}
