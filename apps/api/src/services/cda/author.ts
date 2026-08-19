/**
 * CDA R2 author-side participations + encounter linkage.
 * All organization shells are FLAT (id -> name -> telecom -> addr).
 * Conforms to HL7 CDA R2 and Minzdrav EGISZ REMD specifications.
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

function legalAuthenticatorXml(ctx: CdaContext): string {
	const { params, legalAuthTime } = ctx;
	const auth = params.legalAuthenticator;
	const clinicName = escapeXml(params.clinicName);

	if (auth && (auth.name || auth.snils || auth.positionCode || auth.position)) {
		const authSnils = auth.snils ? auth.snils.trim() : "";
		const authIdXml = authSnils
			? `<id root="${EGISZ_OIDS.SNILS}" extension="${escapeXml(authSnils)}"/>`
			: `<id nullFlavor="NI"/>`;

		const posCode = auth.positionCode ? auth.positionCode.trim() : "4";
		const posName = auth.position ? auth.position.trim() : "главный врач";
		const codeXml = `<code code="${escapeXml(posCode)}" codeSystem="${EGISZ_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медицинских работников" displayName="${escapeXml(posName)}"/>`;

		const authName = auth.name || params.doctorName;
		const middleGiven = authName.middle
			? `\n\t\t\t\t\t<given>${escapeXml(authName.middle)}</given>`
			: "";
		const nameXml = `<name>
					<family>${escapeXml(authName.last)}</family>
					<given>${escapeXml(authName.first)}</given>${middleGiven}
				</name>`;

		return `
	<legalAuthenticator>
		<time value="${legalAuthTime}"/>
		<signatureCode code="S"/>
		<assignedEntity>
			${authIdXml}
			${codeXml}
			${clinicAddrXml(ctx)}
			${clinicTelecomXml(ctx)}
			<assignedPerson>
				${nameXml}
			</assignedPerson>
			<representedOrganization>
				${orgIdXml(ctx)}
				<name>${clinicName}</name>
				${clinicTelecomXml(ctx)}
				${clinicAddrXml(ctx)}
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>`;
	}

	return `
	<legalAuthenticator>
		<time value="${legalAuthTime}"/>
		<signatureCode code="S"/>
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
	</legalAuthenticator>`;
}

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
${legalAuthenticatorXml(ctx)}

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
