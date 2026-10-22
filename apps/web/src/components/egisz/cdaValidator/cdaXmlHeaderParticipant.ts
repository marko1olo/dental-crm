/**
 * cdaXmlHeaderParticipant.ts — Builds participant XML (recordTarget, author, custodian, legalAuthenticator)
 */

import { escapeXml, normalizeSnils } from "@dental/shared/cda";
import { type CdaExportData, EGISZ_STANDARD_OIDS } from "./validatorTypes";

export interface CdaParticipantContext {
	effectiveTime: string;
	visitTime: string;
	birthTime: string;
	genderCode: string;
	genderLabel: string;
	docId: string;
	docRoot: string;
	patientLast: string;
	patientFirst: string;
	patientMiddle: string;
	doctorLast: string;
	doctorFirst: string;
	doctorMiddle: string;
	doctorPos: string;
	doctorPosCode: string;
}

export function buildCdaParticipantsXml(data: CdaExportData, ctx: CdaParticipantContext): string {
	return `	<recordTarget>
		<patientRole>
			${data.patientSnils ? `<id root="${EGISZ_STANDARD_OIDS.SNILS}" extension="${escapeXml(normalizeSnils(data.patientSnils))}"/>` : `<id nullFlavor="NI"/>`}
			${data.patientPolisOms ? `<id root="1.2.643.5.1.13.13.11.1035" extension="${escapeXml(data.patientPolisOms)}"/>` : ""}
			<addr><streetAddressLine>${escapeXml(data.patientAddress || "г. Москва")}</streetAddressLine></addr>
			${data.patientPhone ? `<telecom value="tel:${escapeXml(data.patientPhone)}"/>` : `<telecom nullFlavor="NI"/>`}
			<patient>
				<name>
					<family>${escapeXml(ctx.patientLast)}</family>
					${ctx.patientFirst ? `<given>${escapeXml(ctx.patientFirst)}</given>` : `<given nullFlavor="NI"/>`}
					${ctx.patientMiddle ? `<identity:Patronymic>${escapeXml(ctx.patientMiddle)}</identity:Patronymic>` : ""}
				</name>
				<administrativeGenderCode code="${ctx.genderCode}" codeSystem="${EGISZ_STANDARD_OIDS.GENDER}" codeSystemName="Пол пациента" displayName="${escapeXml(ctx.genderLabel)}"/>
				<birthTime value="${ctx.birthTime}"/>
			</patient>
			<providerOrganization>
				<id root="${EGISZ_STANDARD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(ctx.docRoot)}"/>
				<name>${escapeXml(data.clinicName)}</name>
			</providerOrganization>
		</patientRole>
	</recordTarget>
	<author>
		<time value="${ctx.effectiveTime}"/>
		<assignedAuthor>
			${data.doctorSnils ? `<id root="${EGISZ_STANDARD_OIDS.SNILS}" extension="${escapeXml(normalizeSnils(data.doctorSnils))}"/>` : `<id nullFlavor="NI"/>`}
			<code code="${escapeXml(ctx.doctorPosCode)}" codeSystem="${EGISZ_STANDARD_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медработников" displayName="${escapeXml(ctx.doctorPos)}"/>
			${data.doctorPhone ? `<telecom value="tel:${escapeXml(data.doctorPhone)}"/>` : `<telecom nullFlavor="NI"/>`}
			<assignedPerson>
				<name>
					<family>${escapeXml(ctx.doctorLast)}</family>
					${ctx.doctorFirst ? `<given>${escapeXml(ctx.doctorFirst)}</given>` : `<given nullFlavor="NI"/>`}
					${ctx.doctorMiddle ? `<identity:Patronymic>${escapeXml(ctx.doctorMiddle)}</identity:Patronymic>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_STANDARD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(ctx.docRoot)}"/>
				${data.clinicOgrn ? `<id root="${data.clinicOgrn.length === 15 ? EGISZ_STANDARD_OIDS.OGRN_IP : EGISZ_STANDARD_OIDS.OGRN_LEGAL}" extension="${escapeXml(data.clinicOgrn)}"/>` : ""}
				${data.clinicInn ? `<id root="${EGISZ_STANDARD_OIDS.INN}" extension="${escapeXml(data.clinicInn)}"/>` : ""}
				<name>${escapeXml(data.clinicName)}</name>
				${data.clinicPhone ? `<telecom value="tel:${escapeXml(data.clinicPhone)}"/>` : `<telecom nullFlavor="NI"/>`}
				<addr><streetAddressLine>${escapeXml(data.clinicAddress || "Адрес МО")}</streetAddressLine></addr>
			</representedOrganization>
		</assignedAuthor>
	</author>
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="${EGISZ_STANDARD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(ctx.docRoot)}"/>
				<name>${escapeXml(data.clinicName)}</name>
				${data.clinicPhone ? `<telecom value="tel:${escapeXml(data.clinicPhone)}"/>` : `<telecom nullFlavor="NI"/>`}
				<addr><streetAddressLine>${escapeXml(data.clinicAddress || "Адрес МО")}</streetAddressLine></addr>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>
	<legalAuthenticator>
		<time value="${ctx.effectiveTime}"/>
		<signatureCode code="S"/>
		<assignedEntity>
			<id root="${EGISZ_STANDARD_OIDS.SNILS}" extension="${escapeXml(normalizeSnils(data.doctorSnils || "00000000000"))}"/>
			<code code="15" codeSystem="${EGISZ_STANDARD_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медработников" displayName="Главный врач"/>
			<assignedPerson>
				<name>
					<family>${escapeXml(ctx.doctorLast)}</family>
					${ctx.doctorFirst ? `<given>${escapeXml(ctx.doctorFirst)}</given>` : `<given nullFlavor="NI"/>`}
					${ctx.doctorMiddle ? `<identity:Patronymic>${escapeXml(ctx.doctorMiddle)}</identity:Patronymic>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_STANDARD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(ctx.docRoot)}"/>
				<name>${escapeXml(data.clinicName)}</name>
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>
	<componentOf>
		<encompassingEncounter>
			<id root="${escapeXml(ctx.docRoot)}" extension="${escapeXml(data.visitId || ctx.docId)}"/>
			<code code="AMB" codeSystem="${EGISZ_STANDARD_OIDS.MEDICAL_CARE_TYPE}" codeSystemName="Виды медицинской помощи" displayName="Амбулаторная помощь"/>
			<effectiveTime><low value="${ctx.visitTime}"/></effectiveTime>
		</encompassingEncounter>
	</componentOf>`;
}
