/**
 * SICK LEAVE DATA EXPORT PAYLOAD BUILDER
 * Generates structured export data without synthetic signatures
 */

import {
	INCAPACITY_REASON_CODES,
	SICK_LEAVE_CLOSING_CODES,
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
	return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function generateElnXmlPayload(
	form: SickLeaveFormState,
	patient: SickLeavePatientData,
): string {
	const totalDays = form.periods.reduce((acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo), 0);
	const periodsXml = form.periods.map((p, idx) => `    <eln:IncapacityRow Id="${idx + 1}">
      <eln:DateFrom>${p.dateFrom}</eln:DateFrom>
      <eln:DateTo>${p.dateTo}</eln:DateTo>
      <eln:DaysCount>${calculateDaysBetween(p.dateFrom, p.dateTo)}</eln:DaysCount>
      <eln:DoctorRole>${p.doctorRole}</eln:DoctorRole>
      <eln:DoctorSpecialty>${escapeXml(p.doctorSpecialty)}</eln:DoctorSpecialty>
      <eln:DoctorFio>${escapeXml(p.doctorFio)}</eln:DoctorFio>
      <eln:DoctorSnils>${escapeXml(p.doctorSnils)}</eln:DoctorSnils>
    </eln:IncapacityRow>`).join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<eln:SickLeaveDocument xmlns:eln="http://www.fss.ru/eln/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="2.0">
  <eln:Header>
    <eln:ElnNumber>${escapeXml(form.elnNumber)}</eln:ElnNumber>
    <eln:IssueDate>${form.issueDate}</eln:IssueDate>
    <eln:IsDuplicate>${form.isDuplicate}</eln:IsDuplicate>
    <eln:ReasonCode>${form.reasonCode}</eln:ReasonCode>
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
    <eln:EmployerName>${escapeXml(patient.employerName)}</eln:EmployerName>
    <eln:IsPrimaryWorkplace>${patient.isPrimaryWorkplace}</eln:IsPrimaryWorkplace>
  </eln:Patient>
  <eln:IncapacityPeriods TotalDays="${totalDays}">
${periodsXml}
  </eln:IncapacityPeriods>
  <eln:ClosingStatus>
    <eln:ClosingCode>${form.closingCode}</eln:ClosingCode>
    ${form.workResumeDate ? `<eln:WorkResumeDate>${form.workResumeDate}</eln:WorkResumeDate>` : ""}
  </eln:ClosingStatus>
</eln:SickLeaveDocument>`;
}

export function generateElnJsonPayload(form: SickLeaveFormState, patient: SickLeavePatientData) {
	const totalDays = form.periods.reduce((acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo), 0);
	return {
		schemaVersion: "2.0",
		elnNumber: form.elnNumber,
		issueDate: form.issueDate,
		isDuplicate: form.isDuplicate,
		medicalOrganization: {
			name: form.organizationName || (isDemoShowcaseMode() ? DEFAULT_CLINIC_NAME : ""),
			ogrn: form.organizationOgrn || (isDemoShowcaseMode() ? DEFAULT_CLINIC_OGRN : ""),
		},
		patient: {
			fio: patient.patientFio,
			birthDate: patient.patientBirthDate,
			gender: patient.patientGender,
			snils: patient.patientSnils,
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
		})),
		closing: {
			code: form.closingCode,
			title: SICK_LEAVE_CLOSING_CODES[form.closingCode]?.titleRu || "",
			workResumeDate: form.workResumeDate || null,
		},
	};
}
