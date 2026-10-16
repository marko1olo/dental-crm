/**
 * STATUTORY ELN XML & JSON PAYLOAD GENERATOR
 */

import {
	INCAPACITY_REASON_CODES,
	SICK_LEAVE_CLOSING_CODES,
	REGIME_VIOLATION_CODES,
} from "../sickLeaveElnPresets.js";
import { isDemoShowcaseMode } from "../../../../utils/demoModeEngine.js";
import type { SickLeavePatientData, SickLeaveFormState } from "./types.js";
import {
	DEFAULT_CLINIC_OGRN,
	DEFAULT_CLINIC_NAME,
	DEFAULT_CLINIC_ADDRESS,
	DEFAULT_CLINIC_LICENCE,
	calculateDaysBetween,
} from "./dentalIcd10DurationNorms.js";

export function escapeXml(unsafe: string): string {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function generateElnXmlPayload(
	form: SickLeaveFormState,
	patient: SickLeavePatientData,
): string {
	const totalDays = form.periods.reduce(
		(acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo),
		0,
	);

	const periodsXml = form.periods
		.map((p, idx) => {
			const days = calculateDaysBetween(p.dateFrom, p.dateTo);
			return `    <eln:IncapacityRow Id="${idx + 1}">
      <eln:DateFrom>${p.dateFrom}</eln:DateFrom>
      <eln:DateTo>${p.dateTo}</eln:DateTo>
      <eln:DaysCount>${days}</eln:DaysCount>
      <eln:DoctorRole>${p.doctorRole}</eln:DoctorRole>
      <eln:DoctorSpecialty>${escapeXml(p.doctorSpecialty)}</eln:DoctorSpecialty>
      <eln:DoctorFio>${escapeXml(p.doctorFio)}</eln:DoctorFio>
      <eln:DoctorSnils>${escapeXml(p.doctorSnils)}</eln:DoctorSnils>
      ${
				p.vkChairpersonFio
					? `<eln:VkChairpersonFio>${escapeXml(p.vkChairpersonFio)}</eln:VkChairpersonFio>
      <eln:VkChairpersonSnils>${escapeXml(p.vkChairpersonSnils || "")}</eln:VkChairpersonSnils>
      <eln:VkProtocolNumber>${escapeXml(p.vkProtocolNumber || "")}</eln:VkProtocolNumber>
      <eln:VkProtocolDate>${escapeXml(p.vkProtocolDate || "")}</eln:VkProtocolDate>`
					: ""
			}
    </eln:IncapacityRow>`;
		})
		.join("\n");

	const vkXml =
		form.isVkRequired && form.vkProtocol
			? `  <eln:MedicalCommissionProtocol>
    <eln:ProtocolNumber>${escapeXml(form.vkProtocol.protocolNumber)}</eln:ProtocolNumber>
    <eln:ProtocolDate>${form.vkProtocol.protocolDate}</eln:ProtocolDate>
    <eln:ChairpersonFio>${escapeXml(form.vkProtocol.chairpersonFio)}</eln:ChairpersonFio>
    <eln:ChairpersonSnils>${escapeXml(form.vkProtocol.chairpersonSnils)}</eln:ChairpersonSnils>
    <eln:AttendingDoctorFio>${escapeXml(form.vkProtocol.attendingDoctorFio)}</eln:AttendingDoctorFio>
    <eln:ClinicalSubstantiation>${escapeXml(form.vkProtocol.clinicalSubstantiation)}</eln:ClinicalSubstantiation>
    <eln:ExpertDecision>${escapeXml(form.vkProtocol.expertDecision)}</eln:ExpertDecision>
    <eln:CommissionMembers>
${form.vkProtocol.memberFios.map((m) => `      <eln:MemberFio>${escapeXml(m)}</eln:MemberFio>`).join("\n")}
    </eln:CommissionMembers>
  </eln:MedicalCommissionProtocol>`
			: "";

	const violationXml =
		form.violationCode && form.violationDate
			? `  <eln:RegimeViolation>
    <eln:ViolationCode>${form.violationCode}</eln:ViolationCode>
    <eln:ViolationDate>${form.violationDate}</eln:ViolationDate>
  </eln:RegimeViolation>`
			: "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<eln:SickLeaveDocument xmlns:eln="http://www.fss.ru/eln/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="2.0" MinzdravOrder="1089n">
  <eln:Header>
    <eln:ElnNumber>${escapeXml(form.elnNumber)}</eln:ElnNumber>
    <eln:IssueDate>${form.issueDate}</eln:IssueDate>
    <eln:IsDuplicate>${form.isDuplicate}</eln:IsDuplicate>
    ${form.prevElnNumber ? `<eln:PrevElnNumber>${escapeXml(form.prevElnNumber)}</eln:PrevElnNumber>` : ""}
    <eln:ReasonCode>${form.reasonCode}</eln:ReasonCode>
    ${form.additionalReasonCode ? `<eln:AdditionalReasonCode>${form.additionalReasonCode}</eln:AdditionalReasonCode>` : ""}
    <eln:RegimeType>${form.regimeType}</eln:RegimeType>
    <eln:Icd10Code>${escapeXml(form.icd10Code)}</eln:Icd10Code>
    <eln:DiagnosisDescription>${escapeXml(form.diagnosisText)}</eln:DiagnosisDescription>
  </eln:Header>
  <eln:MedicalOrganization>
    <eln:Ogrn>${escapeXml(form.organizationOgrn || (isDemoShowcaseMode() ? DEFAULT_CLINIC_OGRN : ""))}</eln:Ogrn>
    <eln:Name>${escapeXml(form.organizationName || (isDemoShowcaseMode() ? DEFAULT_CLINIC_NAME : ""))}</eln:Name>
    <eln:Address>${escapeXml(form.organizationAddress || (isDemoShowcaseMode() ? DEFAULT_CLINIC_ADDRESS : ""))}</eln:Address>
    <eln:LicenceNumber>${escapeXml(form.medicalLicenceNumber || (isDemoShowcaseMode() ? DEFAULT_CLINIC_LICENCE : ""))}</eln:LicenceNumber>
  </eln:MedicalOrganization>
  <eln:Patient>
    <eln:Fio>${escapeXml(patient.patientFio)}</eln:Fio>
    <eln:BirthDate>${patient.patientBirthDate}</eln:BirthDate>
    <eln:Gender>${patient.patientGender}</eln:Gender>
    <eln:Snils>${escapeXml(patient.patientSnils)}</eln:Snils>
    ${patient.patientOmsNumber ? `<eln:OmsNumber>${escapeXml(patient.patientOmsNumber)}</eln:OmsNumber>` : ""}
    <eln:EmployerName>${escapeXml(patient.employerName)}</eln:EmployerName>
    <eln:IsPrimaryWorkplace>${patient.isPrimaryWorkplace}</eln:IsPrimaryWorkplace>
  </eln:Patient>
  <eln:IncapacityPeriods TotalDays="${totalDays}">
${periodsXml}
  </eln:IncapacityPeriods>
${vkXml}
${violationXml}
  <eln:ClosingStatus>
    <eln:ClosingCode>${form.closingCode}</eln:ClosingCode>
    ${form.workResumeDate ? `<eln:WorkResumeDate>${form.workResumeDate}</eln:WorkResumeDate>` : ""}
    ${form.nextElnNumber ? `<eln:NextElnNumber>${escapeXml(form.nextElnNumber)}</eln:NextElnNumber>` : ""}
  </eln:ClosingStatus>
  <eln:DigitalSignatures>
    <eln:Signature Role="AttendingDoctor" SignStatus="Valid" />
    ${form.isVkRequired ? '<eln:Signature Role="VkChairperson" SignStatus="Valid" />' : ""}
    <eln:Signature Role="MedicalOrgUkep" SignStatus="Valid" />
  </eln:DigitalSignatures>
</eln:SickLeaveDocument>`;
}

export function generateElnJsonPayload(
	form: SickLeaveFormState,
	patient: SickLeavePatientData,
) {
	const totalDays = form.periods.reduce(
		(acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo),
		0,
	);
	return {
		schemaVersion: "2.0-1089n",
		elnNumber: form.elnNumber,
		issueDate: form.issueDate,
		isDuplicate: form.isDuplicate,
		prevElnNumber: form.prevElnNumber || null,
		medicalOrganization: {
			name: form.organizationName || (isDemoShowcaseMode() ? DEFAULT_CLINIC_NAME : ""),
			ogrn: form.organizationOgrn || (isDemoShowcaseMode() ? DEFAULT_CLINIC_OGRN : ""),
			address: form.organizationAddress || (isDemoShowcaseMode() ? DEFAULT_CLINIC_ADDRESS : ""),
			licence: form.medicalLicenceNumber || (isDemoShowcaseMode() ? DEFAULT_CLINIC_LICENCE : ""),
		},
		patient: {
			fio: patient.patientFio,
			birthDate: patient.patientBirthDate,
			gender: patient.patientGender,
			snils: patient.patientSnils,
			omsNumber: patient.patientOmsNumber || null,
			employer: patient.employerName,
			isPrimaryWorkplace: patient.isPrimaryWorkplace,
		},
		clinicalData: {
			reasonCode: form.reasonCode,
			reasonTitle: INCAPACITY_REASON_CODES[form.reasonCode]?.titleRu || "",
			regimeType: form.regimeType,
			icd10Code: form.icd10Code,
			diagnosisText: form.diagnosisText,
			totalIncapacityDays: totalDays,
		},
		periods: form.periods.map((p, idx) => ({
			index: idx + 1,
			dateFrom: p.dateFrom,
			dateTo: p.dateTo,
			days: calculateDaysBetween(p.dateFrom, p.dateTo),
			doctorRole: p.doctorRole,
			doctorFio: p.doctorFio,
			doctorSpecialty: p.doctorSpecialty,
			doctorSnils: p.doctorSnils,
			vkChairpersonFio: p.vkChairpersonFio || null,
			vkChairpersonSnils: p.vkChairpersonSnils || null,
			vkProtocolNumber: p.vkProtocolNumber || null,
		})),
		medicalCommission:
			form.isVkRequired && form.vkProtocol
				? {
						protocolNumber: form.vkProtocol.protocolNumber,
						protocolDate: form.vkProtocol.protocolDate,
						chairpersonFio: form.vkProtocol.chairpersonFio,
						chairpersonSnils: form.vkProtocol.chairpersonSnils,
						substantiation: form.vkProtocol.clinicalSubstantiation,
						expertDecision: form.vkProtocol.expertDecision,
						members: form.vkProtocol.memberFios,
					}
				: null,
		regimeViolation:
			form.violationCode && form.violationDate
				? {
						code: form.violationCode,
						description: REGIME_VIOLATION_CODES[form.violationCode]?.titleRu || "",
						date: form.violationDate,
					}
				: null,
		closing: {
			code: form.closingCode,
			title: SICK_LEAVE_CLOSING_CODES[form.closingCode]?.titleRu || "",
			workResumeDate: form.workResumeDate || null,
			nextElnNumber: form.nextElnNumber || null,
		},
	};
}
