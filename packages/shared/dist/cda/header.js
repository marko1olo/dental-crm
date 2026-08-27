/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CDA R2 CLINICAL DOCUMENT HEADER & PARTICIPANTS BUILDER (МИНЗДРАВ РФ)
 * Compliant with HL7 CDA R2 (POCD_MT000040.xsd) and EGISZ REMD profile.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { EGISZ_OIDS, IDENTITY_DOCUMENT_TYPES } from "./oids.js";
import { escapeXml, formatHl7DateTime } from "./c14n.js";
export function buildCdaRecordTarget(patient, clinicOid) {
    const mrnRoot = clinicOid || EGISZ_OIDS.FRMO_MO_ROOT;
    const mrnIdXml = patient.patientId
        ? `<id root="${escapeXml(mrnRoot)}" extension="${escapeXml(patient.patientId)}"/>`
        : `<id nullFlavor="NI"/>`;
    const snilsClean = patient.snils ? patient.snils.replace(/\D/g, "") : "";
    const snilsIdXml = snilsClean
        ? `<id root="${EGISZ_OIDS.SNILS}" extension="${escapeXml(snilsClean)}"/>`
        : "";
    const polisOmsClean = patient.polisOms ? patient.polisOms.replace(/\s+/g, "") : "";
    const polisOmsIdXml = polisOmsClean
        ? `<id root="${EGISZ_OIDS.POLIS_OMS}" extension="${escapeXml(polisOmsClean)}"/>`
        : "";
    const polisDmsClean = patient.polisDms ? patient.polisDms.replace(/\s+/g, "") : "";
    const polisDmsIdXml = polisDmsClean
        ? `<id root="${EGISZ_OIDS.POLIS_DMS}" extension="${escapeXml(polisDmsClean)}"/>`
        : "";
    let identityDocXml = "";
    if (patient.identityDoc && patient.identityDoc.number) {
        const docType = patient.identityDoc.typeCode || (patient.isForeignCitizen ? "10" : "1");
        const docTypeName = IDENTITY_DOCUMENT_TYPES[docType]?.nameRu || "Документ, удостоверяющий личность";
        const seriesAttr = patient.identityDoc.series ? ` series="${escapeXml(patient.identityDoc.series)}"` : "";
        const numberVal = escapeXml(patient.identityDoc.number);
        identityDocXml = `<id root="${EGISZ_OIDS.IDENTITY_DOC_TYPE}.${docType}" extension="${numberVal}"${seriesAttr} assigningAuthorityName="${escapeXml(docTypeName)}"/>`;
    }
    const ids = [mrnIdXml, snilsIdXml, polisOmsIdXml, polisDmsIdXml, identityDocXml]
        .filter(Boolean)
        .join("\n\t\t\t");
    const addrXml = patient.address
        ? `<addr><streetAddressLine>${escapeXml(patient.address)}</streetAddressLine></addr>`
        : `<addr nullFlavor="NI"/>`;
    const telecoms = [];
    if (patient.phone) {
        telecoms.push(`<telecom value="tel:${escapeXml(patient.phone.replace(/[^\d+]/g, ""))}" use="MC"/>`);
    }
    if (patient.email) {
        telecoms.push(`<telecom value="mailto:${escapeXml(patient.email)}" use="WP"/>`);
    }
    const telecomXml = telecoms.length > 0 ? telecoms.join("\n\t\t\t") : `<telecom nullFlavor="NI"/>`;
    const middleGiven = patient.name.middle
        ? `\n\t\t\t\t\t<given>${escapeXml(patient.name.middle)}</given>`
        : "";
    const genderCode = patient.gender === "male" ? "1" : patient.gender === "female" ? "2" : "0";
    const genderLabel = genderCode === "1" ? "Мужской" : genderCode === "2" ? "Женский" : "Не указан";
    const genderXml = genderCode !== "0"
        ? `<administrativeGenderCode code="${genderCode}" codeSystem="${EGISZ_OIDS.GENDER}" codeSystemName="Пол пациента" displayName="${genderLabel}"/>`
        : `<administrativeGenderCode nullFlavor="UNK"/>`;
    const birthDateRaw = patient.birthDate ? new Date(patient.birthDate) : null;
    const birthTime = birthDateRaw && !Number.isNaN(birthDateRaw.getTime())
        ? formatHl7DateTime(birthDateRaw, false)
        : "19800101";
    return `
	<recordTarget>
		<patientRole>
			${ids}
			${addrXml}
			${telecomXml}
			<patient>
				<name>
					<family>${escapeXml(patient.name.last)}</family>
					<given>${escapeXml(patient.name.first)}</given>${middleGiven}
				</name>
				${genderXml}
				<birthTime value="${birthTime}"/>
				<languageCommunication>
					<languageCode code="ru-RU"/>
					<preferenceInd value="true"/>
				</languageCommunication>
			</patient>
		</patientRole>
	</recordTarget>`;
}
export function buildCdaClinicOrganization(clinic) {
    const clinicOid = clinic.oid || EGISZ_OIDS.FRMO_MO_ROOT;
    const clinicName = escapeXml(clinic.name);
    const ids = [
        `<id root="${EGISZ_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(clinicOid)}"/>`,
    ];
    if (clinic.ogrn) {
        const ogrnRoot = clinic.ogrn.length === 15 ? EGISZ_OIDS.OGRN_IP : EGISZ_OIDS.OGRN_LEGAL;
        ids.push(`<id root="${ogrnRoot}" extension="${escapeXml(clinic.ogrn)}"/>`);
    }
    if (clinic.inn) {
        ids.push(`<id root="${EGISZ_OIDS.INN}" extension="${escapeXml(clinic.inn)}"/>`);
    }
    if (clinic.kpp) {
        ids.push(`<id root="${EGISZ_OIDS.KPP}" extension="${escapeXml(clinic.kpp)}"/>`);
    }
    if (clinic.licenseNumber) {
        ids.push(`<id root="${EGISZ_OIDS.MEDICAL_LICENSE}" extension="${escapeXml(clinic.licenseNumber)}"/>`);
    }
    const telecoms = [];
    if (clinic.phone) {
        telecoms.push(`<telecom value="tel:${escapeXml(clinic.phone.replace(/[^\d+]/g, ""))}" use="WP"/>`);
    }
    if (clinic.email) {
        telecoms.push(`<telecom value="mailto:${escapeXml(clinic.email)}" use="WP"/>`);
    }
    const telecomXml = telecoms.length > 0 ? telecoms.join("\n\t\t\t\t") : `<telecom nullFlavor="NI"/>`;
    const addressVal = clinic.address || clinic.legalAddress || "Адрес МО";
    const addrXml = `<addr><streetAddressLine>${escapeXml(addressVal)}</streetAddressLine></addr>`;
    return `<representedOrganization>
				${ids.join("\n\t\t\t\t")}
				<name>${clinicName}</name>
				${telecomXml}
				${addrXml}
			</representedOrganization>`;
}
export function buildCdaAuthor(doctor, clinic, effectiveTime) {
    const docSnilsClean = doctor.snils ? doctor.snils.replace(/\D/g, "") : "";
    const docIdXml = docSnilsClean
        ? `<id root="${EGISZ_OIDS.SNILS}" extension="${escapeXml(docSnilsClean)}"/>`
        : `<id nullFlavor="NI"/>`;
    const posCode = doctor.positionCode || "71";
    const posName = doctor.position || "Врач-стоматолог-терапевт";
    const posXml = `<code code="${escapeXml(posCode)}" codeSystem="${EGISZ_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медицинских работников" displayName="${escapeXml(posName)}"/>`;
    const telecoms = [];
    if (doctor.phone) {
        telecoms.push(`<telecom value="tel:${escapeXml(doctor.phone.replace(/[^\d+]/g, ""))}" use="WP"/>`);
    }
    if (doctor.email) {
        telecoms.push(`<telecom value="mailto:${escapeXml(doctor.email)}" use="WP"/>`);
    }
    const telecomXml = telecoms.length > 0 ? telecoms.join("\n\t\t\t") : `<telecom nullFlavor="NI"/>`;
    const middleGiven = doctor.name.middle
        ? `\n\t\t\t\t\t<given>${escapeXml(doctor.name.middle)}</given>`
        : "";
    return `
	<author>
		<time value="${effectiveTime}"/>
		<assignedAuthor>
			${docIdXml}
			${posXml}
			${telecomXml}
			<assignedPerson>
				<name>
					<family>${escapeXml(doctor.name.last)}</family>
					<given>${escapeXml(doctor.name.first)}</given>${middleGiven}
				</name>
			</assignedPerson>
			${buildCdaClinicOrganization(clinic)}
		</assignedAuthor>
	</author>`;
}
export function buildCdaCustodian(clinic) {
    const clinicOid = clinic.oid || EGISZ_OIDS.FRMO_MO_ROOT;
    const clinicName = escapeXml(clinic.name);
    const telecoms = [];
    if (clinic.phone) {
        telecoms.push(`<telecom value="tel:${escapeXml(clinic.phone.replace(/[^\d+]/g, ""))}" use="WP"/>`);
    }
    const telecomXml = telecoms.length > 0 ? telecoms.join("\n\t\t\t\t") : `<telecom nullFlavor="NI"/>`;
    const addressVal = clinic.address || clinic.legalAddress || "Адрес МО";
    return `
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="${EGISZ_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(clinicOid)}"/>
				<name>${clinicName}</name>
				${telecomXml}
				<addr><streetAddressLine>${escapeXml(addressVal)}</streetAddressLine></addr>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>`;
}
export function buildCdaLegalAuthenticator(legalAuth, doctor, clinic, effectiveTime) {
    const authTime = legalAuth?.time ? formatHl7DateTime(legalAuth.time, true) : effectiveTime;
    const authName = legalAuth?.name || doctor.name;
    const authSnilsClean = legalAuth?.snils ? legalAuth.snils.replace(/\D/g, "") : doctor.snils ? doctor.snils.replace(/\D/g, "") : "";
    const authIdXml = authSnilsClean
        ? `<id root="${EGISZ_OIDS.SNILS}" extension="${escapeXml(authSnilsClean)}"/>`
        : `<id nullFlavor="NI"/>`;
    const posCode = legalAuth?.positionCode || "15";
    const posName = legalAuth?.position || "Главный врач";
    const codeXml = `<code code="${escapeXml(posCode)}" codeSystem="${EGISZ_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медицинских работников" displayName="${escapeXml(posName)}"/>`;
    const middleGiven = authName.middle
        ? `\n\t\t\t\t\t<given>${escapeXml(authName.middle)}</given>`
        : "";
    return `
	<legalAuthenticator>
		<time value="${authTime}"/>
		<signatureCode code="S"/>
		<assignedEntity>
			${authIdXml}
			${codeXml}
			<assignedPerson>
				<name>
					<family>${escapeXml(authName.last)}</family>
					<given>${escapeXml(authName.first)}</given>${middleGiven}
				</name>
			</assignedPerson>
			${buildCdaClinicOrganization(clinic)}
		</assignedEntity>
	</legalAuthenticator>`;
}
export function generateClinicalDocumentHeader(opts) {
    const { docTypeNsiCode, docTitle, templateOids, documentId, documentVersion = 1, documentTime, visitDate, encounterId, documentSetId, replacesDocumentId, patient, doctor, clinic, legalAuthenticator, } = opts;
    const now = new Date();
    const docClock = documentTime || now;
    const effectiveTime = formatHl7DateTime(docClock, true);
    const visitTime = formatHl7DateTime(visitDate, true);
    const clinicOid = clinic.oid || EGISZ_OIDS.FRMO_MO_ROOT;
    const docIdRoot = `${clinicOid}.100.1.1`;
    const setIdRoot = `${clinicOid}.100.1.2`;
    const encExtension = encounterId || documentId;
    const setExtension = documentSetId || documentId;
    const templateElements = templateOids
        .map((oid) => `<templateId root="${escapeXml(oid)}"/>`)
        .join("\n\t");
    const replacesXml = replacesDocumentId
        ? `
	<relatedDocument typeCode="RPLC">
		<parentDocument>
			<id root="${escapeXml(docIdRoot)}" extension="${escapeXml(replacesDocumentId)}"/>
			<code code="${escapeXml(docTypeNsiCode)}" codeSystem="${EGISZ_OIDS.DOC_TYPE_NSI}" displayName="${escapeXml(docTitle)}"/>
			<setId root="${escapeXml(setIdRoot)}" extension="${escapeXml(setExtension)}"/>
			<versionNumber value="${Math.max(1, documentVersion - 1)}"/>
		</parentDocument>
	</relatedDocument>`
        : "";
    return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:identity="urn:hl7-ru:identity" xmlns:address="urn:hl7-ru:address" xmlns:fias="urn:hl7-ru:fias">
	<realmCode code="RU"/>
	<typeId root="${EGISZ_OIDS.HL7_CDA_R2_TYPE_ROOT}" extension="POCD_HD000040"/>
	${templateElements}
	<id root="${escapeXml(docIdRoot)}" extension="${escapeXml(documentId)}"/>
	<code code="${escapeXml(docTypeNsiCode)}" codeSystem="${EGISZ_OIDS.DOC_TYPE_NSI}" codeSystemName="Виды медицинской документации" displayName="${escapeXml(docTitle)}"/>
	<title>${escapeXml(docTitle)}</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="${EGISZ_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="обычный"/>
	<languageCode code="ru-RU"/>
	<setId root="${escapeXml(setIdRoot)}" extension="${escapeXml(setExtension)}"/>
	<versionNumber value="${documentVersion}"/>
	${replacesXml}
${buildCdaRecordTarget(patient, clinicOid)}
${buildCdaAuthor(doctor, clinic, effectiveTime)}
${buildCdaCustodian(clinic)}
${buildCdaLegalAuthenticator(legalAuthenticator, doctor, clinic, effectiveTime)}

	<documentationOf>
		<serviceEvent classCode="PCPR">
			<effectiveTime value="${visitTime}"/>
			<performer typeCode="PRF">
				<assignedEntity>
					${doctor.snils ? `<id root="${EGISZ_OIDS.SNILS}" extension="${escapeXml(doctor.snils.replace(/\D/g, ""))}"/>` : `<id nullFlavor="NI"/>`}
					<code code="${escapeXml(doctor.positionCode || "71")}" codeSystem="${EGISZ_OIDS.MEDICAL_POSITIONS}" displayName="${escapeXml(doctor.position || "Врач-стоматолог")}"/>
					<assignedPerson>
						<name>
							<family>${escapeXml(doctor.name.last)}</family>
							<given>${escapeXml(doctor.name.first)}</given>
							${doctor.name.middle ? `<given>${escapeXml(doctor.name.middle)}</given>` : ""}
						</name>
					</assignedPerson>
					${buildCdaClinicOrganization(clinic)}
				</assignedEntity>
			</performer>
		</serviceEvent>
	</documentationOf>

	<componentOf>
		<encompassingEncounter>
			<id root="${escapeXml(docIdRoot)}" extension="${escapeXml(encExtension)}"/>
			<code code="AMB" codeSystem="${EGISZ_OIDS.MEDICAL_CARE_TYPE}" codeSystemName="Виды медицинской помощи" displayName="Амбулаторная помощь"/>
			<effectiveTime value="${visitTime}"/>
		</encompassingEncounter>
	</componentOf>`;
}
