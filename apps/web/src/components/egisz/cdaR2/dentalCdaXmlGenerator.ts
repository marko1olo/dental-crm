/**
 * dentalCdaXmlGenerator.ts — Clinical CDA R2 XML Assembly (SEMD 101/102/105/302/303)
 */

import { escapeXml, formatHl7DateTime } from "@dental/shared/cda";
import { EGISZ_DENTAL_SEMD_TYPES, EGISZ_REMD_OIDS, type EgiszDentalSemdCode } from "../remdXml/egiszRemdPresets";
import { buildCdaHeaderXml } from "./cdaHeaderBuilder";
import type { EgiszDentalCdaPayload } from "./cdaTypes";
import {
	buildAnamnesisSection,
	buildComplaintsSection,
	buildDentalFormulaSection,
	buildDiagnosesSection,
	buildProceduresSection,
	buildRecommendationsSection,
} from "./dentalCdaSections";
import { canonicalizeCdaXml } from "./kopeckMath";

export function generateEgiszDentalCdaXml(payload: EgiszDentalCdaPayload): string {
	const docDef = EGISZ_DENTAL_SEMD_TYPES[payload.docTypeCode as EgiszDentalSemdCode] || {
		code: "105", nsiCode: "105", title: "Протокол консультации врача-стоматолога",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	};
	const patient = payload.patient || ({} as Partial<EgiszDentalCdaPayload["patient"]>);
	const clinic = payload.clinic || ({} as Partial<EgiszDentalCdaPayload["clinic"]>);
	const doctor = payload.doctor || ({} as Partial<EgiszDentalCdaPayload["doctor"]>);
	const now = new Date();
	const effectiveTime = formatHl7DateTime(now, true);
	const encounterDate = payload.encounterDate ? new Date(payload.encounterDate) : now;
	const visitTime = formatHl7DateTime(encounterDate, true);
	const birthTime = formatHl7DateTime(patient.patientBirthDate, false);
	const genderCode = patient.patientGender === "male" ? "1" : patient.patientGender === "female" ? "2" : "0";
	const genderLabel = genderCode === "1" ? "Мужской" : genderCode === "2" ? "Женский" : "Не указан";
	const docUuid = payload.documentUuid || `00000000-0000-4000-8000-${String(Date.now() % 1000000000000).padStart(12, "0")}`;
	const clinicOid = clinic.clinicOid || EGISZ_REMD_OIDS.FRMO_MO_ROOT;
	const [patFamily = "Пациент", patGiven = "", patPatronymic = ""] = (patient.patientFullName || "Пациент").trim().split(/\s+/);
	const [docFamily = "Врач", docGiven = "", docPatronymic = ""] = (doctor.doctorFullName || "Врач").trim().split(/\s+/);
	const [chiefFamily = docFamily, chiefGiven = docGiven, chiefPatronymic = docPatronymic] = (clinic.chiefDoctorName || "").trim().split(/\s+/);
	const cleanDocSnils = (doctor.doctorSnils || "").replace(/\D/g, "");
	const cleanPatSnils = (patient.patientSnils || "").replace(/\D/g, "");

	const complaintsSection = buildComplaintsSection(payload.complaints || "Жалобы отсутствуют (профилактический осмотр)");
	const anamnesisSection = buildAnamnesisSection(payload.anamnesisMorbi || "Развитие настоящего заболевания без особенностей.", payload.anamnesisVitae || "Аллергологический анамнез не отягощен, сопутствующие заболевания отрицает.");
	const dentalFormulaSection = buildDentalFormulaSection(payload.toothStates || {}, payload.toothSurfaces || {});
	const diagnosesSection = buildDiagnosesSection(payload.diagnoses?.length ? payload.diagnoses : [{ icd10Code: "Z01.2", icd10Name: "Стоматологическое обследование", isPrimary: true }]);
	const proceduresSection = buildProceduresSection(payload.procedures?.length ? payload.procedures : [{ code: "B01.065.001", name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный" }], visitTime, payload.treatmentProtocolDescription);
	const recommendationsSection = buildRecommendationsSection(payload.recommendations || "Соблюдение индивидуальной гигиены полости рта, контрольный осмотр через 6 месяцев.", payload.nextVisitDate);

	const headerXml = buildCdaHeaderXml(payload, {
		clinicOid, effectiveTime, visitTime, docUuid, docFamily, docGiven, docPatronymic, cleanDocSnils, chiefFamily, chiefGiven, chiefPatronymic,
	});

	const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:identity="urn:hl7-ru:identity" xmlns:address="urn:hl7-ru:address" xmlns:fias="urn:hl7-ru:fias">
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="${docDef.templateRoot}"/>
	<id root="${escapeXml(clinicOid)}.100.1.1" extension="${escapeXml(docUuid)}"/>
	<code code="${docDef.nsiCode}" codeSystem="${EGISZ_REMD_OIDS.NSI_SEMD_DOC_TYPES}" codeSystemName="Виды СЭМД ЕГИСЗ" displayName="${escapeXml(docDef.title)}"/>
	<title>${escapeXml(docDef.title)} (Электронная карта визита РЭМД)</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="${EGISZ_REMD_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="Обычный доступ"/>
	<languageCode code="ru-RU"/>
	<setId root="${escapeXml(clinicOid)}.100.1.2" extension="${escapeXml(patient.cardNumber || docUuid)}"/>
	<versionNumber value="${payload.documentVersion || 1}"/>
	<recordTarget>
		<patientRole>
			${cleanPatSnils ? `<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml(cleanPatSnils)}"/>` : ""}
			<id root="${escapeXml(clinicOid)}.100.2" extension="${escapeXml(patient.cardNumber || patient.patientId || docUuid)}"/>
			${patient.patientPolisOms ? `<id root="${EGISZ_REMD_OIDS.POLIS_OMS}" extension="${escapeXml(patient.patientPolisOms.replace(/\s+/g, ""))}"/>` : ""}
			${patient.patientPassport ? `<id root="${EGISZ_REMD_OIDS.IDENTITY_DOC_TYPE}" extension="${escapeXml(patient.patientPassport)}"/>` : ""}
			<addr><streetAddressLine>${escapeXml(patient.patientAddress || clinic.clinicAddress || "")}</streetAddressLine></addr>
			${patient.patientPhone ? `<telecom value="tel:${escapeXml(patient.patientPhone.replace(/[^\d+]/g, ""))}" use="MC"/>` : ""}
			${patient.patientEmail ? `<telecom value="mailto:${escapeXml(patient.patientEmail)}" use="WP"/>` : ""}
			<patient>
				<name>
					<family>${escapeXml(patFamily)}</family>
					${patGiven ? `<given>${escapeXml(patGiven)}</given>` : `<given nullFlavor="NI"/>`}
					${patPatronymic ? `<identity:Patronymic>${escapeXml(patPatronymic)}</identity:Patronymic>` : ""}
				</name>
				<administrativeGenderCode code="${genderCode}" codeSystem="${EGISZ_REMD_OIDS.GENDER}" codeSystemName="Пол" displayName="${escapeXml(genderLabel)}"/>
				<birthTime value="${birthTime}"/>
			</patient>
		</patientRole>
	</recordTarget>
${headerXml}
	<component>
		<structuredBody>${complaintsSection}${anamnesisSection}${dentalFormulaSection}${diagnosesSection}${proceduresSection}${recommendationsSection}</structuredBody>
	</component>
</ClinicalDocument>`;

	return canonicalizeCdaXml(rawXml);
}
