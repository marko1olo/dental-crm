/**
 * cdaHeaderBuilder.ts — Builds author, custodian, legalAuthenticator and componentOf CDA R2 XML
 */

import { escapeXml } from "@dental/shared/cda";
import { EGISZ_REMD_OIDS } from "../remdXml/egiszRemdPresets";
import type { EgiszDentalCdaPayload } from "./cdaTypes";

export interface CdaHeaderContext {
	clinicOid: string;
	effectiveTime: string;
	visitTime: string;
	docUuid: string;
	docFamily: string;
	docGiven: string;
	docPatronymic: string;
	cleanDocSnils: string;
	chiefFamily: string;
	chiefGiven: string;
	chiefPatronymic: string;
}

export function buildCdaHeaderXml(payload: EgiszDentalCdaPayload, ctx: CdaHeaderContext): string {
	const clinic = payload.clinic || ({} as Partial<EgiszDentalCdaPayload["clinic"]>);
	const doctor = payload.doctor || ({} as Partial<EgiszDentalCdaPayload["doctor"]>);

	return `	<author>
		<time value="${ctx.visitTime}"/>
		<assignedAuthor>
			<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml(ctx.cleanDocSnils)}"/>
			<code code="${escapeXml(doctor.doctorPositionCode || "71")}" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медработников" displayName="${escapeXml(doctor.doctorPosition || "Врач-стоматолог-терапевт")}"/>
			${doctor.doctorPhone ? `<telecom value="tel:${escapeXml(doctor.doctorPhone.replace(/[^\d+]/g, ""))}" use="WP"/>` : ""}
			<assignedPerson>
				<name>
					<family>${escapeXml(ctx.docFamily)}</family>
					${ctx.docGiven ? `<given>${escapeXml(ctx.docGiven)}</given>` : `<given nullFlavor="NI"/>`}
					${ctx.docPatronymic ? `<identity:Patronymic>${escapeXml(ctx.docPatronymic)}</identity:Patronymic>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(ctx.clinicOid)}"/>
				<id root="${EGISZ_REMD_OIDS.OGRN_LEGAL}" extension="${escapeXml((clinic.clinicOgrn || "").replace(/\D/g, ""))}"/>
				<id root="${EGISZ_REMD_OIDS.INN}" extension="${escapeXml((clinic.clinicInn || "").replace(/\D/g, ""))}"/>
				<name>${escapeXml(clinic.clinicName || "")}</name>
				<telecom value="tel:${escapeXml((clinic.clinicPhone || "").replace(/[^\d+]/g, ""))}" use="WP"/>
				<addr><streetAddressLine>${escapeXml(clinic.clinicAddress || "")}</streetAddressLine></addr>
			</representedOrganization>
		</assignedAuthor>
	</author>
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(ctx.clinicOid)}"/>
				<id root="${EGISZ_REMD_OIDS.OGRN_LEGAL}" extension="${escapeXml((clinic.clinicOgrn || "").replace(/\D/g, ""))}"/>
				<name>${escapeXml(clinic.clinicName || "")}</name>
				<telecom value="tel:${escapeXml((clinic.clinicPhone || "").replace(/[^\d+]/g, ""))}" use="WP"/>
				<addr><streetAddressLine>${escapeXml(clinic.clinicAddress || "")}</streetAddressLine></addr>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>
	<legalAuthenticator>
		<time value="${ctx.effectiveTime}"/>
		<signatureCode code="S"/>
		<assignedEntity>
			<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml((clinic.chiefDoctorSnils || doctor.doctorSnils || "").replace(/\D/g, ""))}"/>
			<code code="15" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_POSITIONS}" displayName="Главный врач"/>
			<assignedPerson>
				<name>
					<family>${escapeXml(ctx.chiefFamily)}</family>
					${ctx.chiefGiven ? `<given>${escapeXml(ctx.chiefGiven)}</given>` : `<given nullFlavor="NI"/>`}
					${ctx.chiefPatronymic ? `<identity:Patronymic>${escapeXml(ctx.chiefPatronymic)}</identity:Patronymic>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(ctx.clinicOid)}"/>
				<name>${escapeXml(clinic.clinicName || "")}</name>
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>
	<componentOf>
		<encompassingEncounter>
			<id root="${escapeXml(ctx.clinicOid)}.100.1.3" extension="${escapeXml(payload.patient?.cardNumber || ctx.docUuid)}"/>
			<code code="1" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_CARE_TYPE}" displayName="Первичная медико-санитарная помощь"/>
			<effectiveTime><low value="${ctx.visitTime}"/><high value="${ctx.effectiveTime}"/></effectiveTime>
		</encompassingEncounter>
	</componentOf>`;
}
