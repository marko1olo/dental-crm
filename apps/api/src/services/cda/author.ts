/**
 * CDA R2 author-side participations + encounter linkage.
 * All organization shells are FLAT (id + addr/telecom NI + name).
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

	const ambCode = `<code code="AMB" codeSystem="1.2.643.5.1.13.13.11.1461" codeSystemName="\u0412\u0438\u0434\u044b \u043c\u0435\u0434\u0438\u0446\u0438\u043d\u0441\u043a\u043e\u0439 \u043f\u043e\u043c\u043e\u0449\u0438" displayName="\u0410\u043c\u0431\u0443\u043b\u0430\u0442\u043e\u0440\u043d\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c"/>`;

	const _loincExam = `<code code="74208-1" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="\u041f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u0441\u0442\u043e\u043c\u0430\u0442\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043e\u0441\u043c\u043e\u0442\u0440\u0430"/>`;

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
			<!--
				DEFECT #99: assignedAuthor addr + telecom (HL7 CDA R2 / EGISZ SEMD).
				Real doctor/clinic contact is wired (users.phone/email for the
				physician, clinics.address/phone + organizations.legalAddress/email
				for the MO). We emit the real <addr>/<telecom> when present and
				nullFlavor="NI" only when the DB has no data (no invented values).
			-->
			${clinicAddrXml(ctx)}
			${doctorTelecomXml(ctx)}
			<assignedPerson>
				${doctorNameXml(ctx)}
			</assignedPerson>
			<representedOrganization>
				${clinicAddrXml(ctx)}
				${clinicTelecomXml(ctx)}
				<name>${clinicName}</name>
			</representedOrganization>
		</assignedAuthor>
	</author>


	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				${orgIdXml(ctx)}
				<!--
					DEFECT #102: custodian representedCustodianOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					Real MO contact is wired (clinics.address/phone +
					organizations.legalAddress/email); nullFlavor only when absent.
				-->
				${clinicAddrXml(ctx)}
				${clinicTelecomXml(ctx)}
				<name>${clinicName}</name>
			</representedCustodianOrganization>

		</assignedCustodian>
	</custodian>
	<!--
		DEFECT #96: informationRecipient (intended receiver of the SEMD).
		\u0411\u042b\u041b\u041e: CDA had author + custodian + legalAuthenticator + authenticator
		but no informationRecipient. HL7 CDA R2 and EGISZ REMD expect the
		intended recipient organization (clinic MO / REMD registry) so the
		document is addressed for registration, not an orphan payload.
		\u0421\u0422\u0410\u041b\u041e: informationRecipient/intendedRecipient/receivedOrganization
		with clinicOid (or default MO root) + clinicName \u2014 same identity
		scheme as custodian representedCustodianOrganization.
	-->
	<informationRecipient>
		<intendedRecipient>
			<receivedOrganization>
				${orgIdXml(ctx)}
				<!--
					DEFECT #103: informationRecipient receivedOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					Real MO contact is wired; nullFlavor only when absent.
				-->
				${clinicAddrXml(ctx)}
				${clinicTelecomXml(ctx)}
				<name>${clinicName}</name>
			</receivedOrganization>
		</intendedRecipient>
	</informationRecipient>


	<!--
		DEFECT #75: legalAuthenticator (who signed / locks Form 043/\u0443).

		\u0411\u042b\u041b\u041e: CDA had author + custodian only \u2014 no legalAuthenticator.
		EGISZ REMD / SEMD validators require the signing physician block;
		without it the document has no legal signature party distinct from
		author time. \u0421\u0422\u0410\u041b\u041e: legalAuthenticator mirrors doctorName (+ optional
		SNILS/position) with time = documentClock (lockedAt when provided).
	-->
	<legalAuthenticator>
		<time value="${effectiveTime}"/>
		${signatureCode}
		<assignedEntity>
			${doctorIdXml(ctx)}
			${doctorCodeXml(ctx)}
			<!--
				DEFECT #100: legalAuthenticator assignedEntity addr + telecom.
				Real doctor contact is wired (users.phone/email); clinic addr
				is used as the physician's work address. nullFlavor only when absent.
			-->
			${clinicAddrXml(ctx)}
			${doctorTelecomXml(ctx)}
			<assignedPerson>

				${doctorNameXml(ctx)}
			</assignedPerson>
			<representedOrganization>
				<!--
					DEFECT #107: legalAuthenticator representedOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					Real MO contact is wired; nullFlavor only when absent.
				-->
				${clinicAddrXml(ctx)}
				${clinicTelecomXml(ctx)}
				<name>${clinicName}</name>
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>
	<!--
		DEFECT #95: authenticator (who attested the clinical content).
		\u0411\u042b\u041b\u041e: legalAuthenticator (#75) only \u2014 HL7 CDA R2 also allows/expects
		authenticator for the clinician who authenticates the document content
		(distinct role from legal signature party). EGISZ SEMD validators that
		check both blocks reject documents with legalAuthenticator alone when
		the authoring physician is the same person who attests the SOAP text.
		\u0421\u0422\u0410\u041b\u041e: authenticator mirrors doctor identity + signatureCode S and
		time = documentClock (lockedAt), same scheme as legalAuthenticator.
	-->
	<authenticator>
		<time value="${effectiveTime}"/>
		${signatureCode}
		<assignedEntity>
			${doctorIdXml(ctx)}
			${doctorCodeXml(ctx)}
			<!--
				DEFECT #101: authenticator assignedEntity addr + telecom.
				Real doctor contact is wired; nullFlavor only when absent.
			-->
			${clinicAddrXml(ctx)}
			${doctorTelecomXml(ctx)}
			<assignedPerson>

				${doctorNameXml(ctx)}
			</assignedPerson>
			<representedOrganization>
				<!--
					DEFECT #108: authenticator representedOrganization
					addr + telecom (HL7 CDA R2 / EGISZ SEMD).
					Real MO contact is wired; nullFlavor only when absent.
				-->
				${clinicAddrXml(ctx)}
				${clinicTelecomXml(ctx)}
				<name>${clinicName}</name>
			</representedOrganization>
		</assignedEntity>
	</authenticator>
	<!-- DEFECT #55/#65: encounter datetime (params.visitDate / appointment.startsAt) -->

	<!--
		DEFECT #93: documentationOf/serviceEvent/performer (treating physician).
		\u0411\u042b\u041b\u041e: serviceEvent carried only effectiveTime \u2014 no performer. HL7 CDA R2
		and EGISZ SEMD expect the clinician who performed the care event under
		documentationOf (distinct from author/legalAuthenticator document roles
		and from encompassingEncounter/responsibleParty). Without performer,
		validators treat the care event as unattributed.
		\u0421\u0422\u0410\u041b\u041e: performer typeCode="PRF" with assignedEntity (doctor SNILS/name
		+ clinic), same identity scheme as assignedAuthor / responsibleParty.
	-->
	<documentationOf>
		<serviceEvent classCode="PCPR">
			<effectiveTime value="${visitTime}"/>
			<performer typeCode="PRF">
				<assignedEntity>
					${doctorIdXml(ctx)}
					${doctorCodeXml(ctx)}
										<!--
						DEFECT #104: documentationOf/serviceEvent/performer
						assignedEntity addr + telecom (HL7 CDA R2 / EGISZ SEMD).
						\u0411\u042b\u041b\u041e: performer assignedEntity had id/code/person/org
						only \u2014 no addr/telecom. SEMD validators expect contact
						under the care-event performer (mirror of
						legalAuthenticator #100 / authenticator #101 /
						assignedAuthor #99). We do not invent doctor/clinic
						street or phone.
						Real doctor contact is wired; nullFlavor only when absent.
					-->
					${clinicAddrXml(ctx)}
					${doctorTelecomXml(ctx)}
					<assignedPerson>
						<name>
							<family>${escapeXml(params.doctorName.last)}</family>
							<given>${escapeXml(params.doctorName.first)}</given>${middleGiven}
						</name>
					</assignedPerson>
					<representedOrganization>
						<!--
							DEFECT #109: documentationOf/serviceEvent/performer
							representedOrganization addr + telecom (HL7 CDA R2 / EGISZ SEMD).
							\u0411\u042b\u041b\u041e: representedOrganization had only name child \u2014 no
							addr/telecom. SEMD validators expect MO contact under
							performer org (mirror of authenticator org #108).
							We do not invent clinic street or phone.
							Real MO contact is wired; nullFlavor only when absent.
						-->
						${clinicAddrXml(ctx)}
						${clinicTelecomXml(ctx)}
						<name>${clinicName}</name>
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
						${clinicAddrXml(ctx)}
						<name>${clinicName}</name>
					</location>
					<serviceProviderOrganization>
						${clinicAddrXml(ctx)}
						${clinicTelecomXml(ctx)}
						<name>${clinicName}</name>
					</serviceProviderOrganization>
				</healthCareFacility>
			</location>
		</encompassingEncounter>
	</componentOf>`;
}
