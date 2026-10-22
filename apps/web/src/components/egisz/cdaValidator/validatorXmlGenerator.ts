/**
 * validatorXmlGenerator.ts — Assembles full HL7 CDA R2 XML for SEMD Validator
 */

import { escapeXml, formatHl7DateTime } from "@dental/shared/cda";
import { buildCdaParticipantsXml } from "./cdaXmlHeaderParticipant";
import { buildDentalFormulaXml, buildProceduresXml } from "./cdaXmlProceduresAndFormula";
import { type CdaExportData, EGISZ_SEMD_DOC_TYPES, EGISZ_STANDARD_OIDS } from "./validatorTypes";

export function buildCdaXml(data: CdaExportData): string {
	const docDef = EGISZ_SEMD_DOC_TYPES[data.docTypeCode] || EGISZ_SEMD_DOC_TYPES["302"];
	const now = new Date();
	const effectiveTime = formatHl7DateTime(now, true);
	const encounterDate = data.encounterDate instanceof Date
		? data.encounterDate
		: data.encounterDate ? new Date(data.encounterDate) : now;
	const visitTime = formatHl7DateTime(encounterDate, true);

	const birthDateParsed = data.patientBirthDate ? new Date(data.patientBirthDate) : null;
	const birthTime = birthDateParsed && !Number.isNaN(birthDateParsed.getTime())
		? formatHl7DateTime(birthDateParsed, false) : "19800101";

	const genderCode = data.patientGender === "male" ? "1" : data.patientGender === "female" ? "2" : "0";
	const genderLabel = genderCode === "1" ? "Мужской" : genderCode === "2" ? "Женский" : "Не указан";
	const docId = data.documentId || (data.visitId ? `${data.visitId}-v${data.documentVersion || 1}` : `DOC-${Date.now()}`);
	const docRoot = data.clinicOid || EGISZ_STANDARD_OIDS.FRMO_MO_ROOT;

	const [patientLast = "Пациент", patientFirst = "", patientMiddle = ""] = (data.patientFullName || "Пациент").trim().split(/\s+/);
	const [doctorLast = "Врач", doctorFirst = "", doctorMiddle = ""] = (data.doctorFullName || "Врач").trim().split(/\s+/);
	const doctorPos = data.doctorPosition || "Врач-стоматолог";
	const doctorPosCode = data.doctorPositionCode || "15";

	const icd10 = data.icd10Code || "K02.1";
	const diagnosis = data.diagnosisText || "Кариес дентина";
	const tooth = data.diagnosisTooth ? String(data.diagnosisTooth).trim() : "";

	const dentalFormulaXml = buildDentalFormulaXml(data);
	const proceduresXml = buildProceduresXml(data, visitTime);

	const participantsXml = buildCdaParticipantsXml(data, {
		effectiveTime, visitTime, birthTime, genderCode, genderLabel, docId, docRoot,
		patientLast, patientFirst, patientMiddle, doctorLast, doctorFirst, doctorMiddle,
		doctorPos, doctorPosCode,
	});

	return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:identity="urn:hl7-ru:identity" xmlns:address="urn:hl7-ru:address" xmlns:fias="urn:hl7-ru:fias">
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="${docDef.templateRoot}"/>
	<id root="${escapeXml(docRoot)}" extension="${escapeXml(docId)}"/>
	<code code="${docDef.loincCode}" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="${escapeXml(docDef.loincDisplayName)}"/>
	<title>${escapeXml(docDef.title)} (СЭМД ${docDef.code})</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="${EGISZ_STANDARD_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="обычный"/>
	<languageCode code="ru-RU"/>
	<setId root="${escapeXml(docRoot)}" extension="${escapeXml(data.visitId || docId)}"/>
	<versionNumber value="${data.documentVersion || 1}"/>
${participantsXml}
	<component>
		<structuredBody>
			<component>
				<section>
					<code code="29548-5" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Основной клинический диагноз</title>
					<text><paragraph>${escapeXml(diagnosis)} (МКБ-10: ${escapeXml(icd10)})${tooth ? ` · зуб ${escapeXml(tooth)}` : ""}</paragraph></text>
					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="29308-4" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" displayName="Диагноз"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(icd10)}" codeSystem="${EGISZ_STANDARD_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(diagnosis)}"/>
							${tooth ? `<targetSiteCode code="${escapeXml(tooth)}" codeSystem="${EGISZ_STANDARD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(tooth)}"/>` : ""}
						</observation>
					</entry>
				</section>
			</component>
			${data.anamnesis ? `
			<component>
				<section>
					<code code="10164-2" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Анамнез"/>
					<title>Анамнез заболевания и жизни</title>
					<text><paragraph>${escapeXml(data.anamnesis)}</paragraph></text>
				</section>
			</component>` : ""}
			${data.objectiveStatus ? `
			<component>
				<section>
					<code code="29545-1" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Physical findings"/>
					<title>Объективный статус полости рта</title>
					<text><paragraph>${escapeXml(data.objectiveStatus)}</paragraph></text>
				</section>
			</component>` : ""}
${dentalFormulaXml}
${proceduresXml}
			${data.instrumentTrayBarcode ? `
			<component>
				<section>
					<code code="46264-8" codeSystem="${EGISZ_STANDARD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Medical device identifier"/>
					<title>Стерилизационный лоток</title>
					<text><paragraph>Штрихкод лотка ЦСО: ${escapeXml(data.instrumentTrayBarcode)}</paragraph></text>
				</section>
			</component>` : ""}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
