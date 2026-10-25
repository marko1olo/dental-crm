import { IDENTITY_DOCUMENT_TYPES } from "./constants";
import type { PatientGeneralInfo } from "./types";

export function computePassportSummary(patient?: PatientGeneralInfo | null): string {
	const hasDoc = Boolean(patient?.passportNumber || patient?.passportSeries);
	const hasAddr = Boolean(patient?.registrationAddress || patient?.address || patient?.residentialAddress);
	if (!hasDoc && !hasAddr) return "Не заполнено";
	const docTypeName = IDENTITY_DOCUMENT_TYPES.find((d) => d.code === (patient?.docType || "passport_rf"))?.labelRu || "Паспорт РФ";
	const docText = hasDoc ? `${docTypeName} ${patient?.passportSeries ? patient.passportSeries + " " : ""}${patient?.passportNumber ?? ""}`.trim() : "";
	const addrText = hasAddr ? (patient?.registrationAddress || patient?.address || patient?.residentialAddress || "") : "";
	if (docText && addrText) return `${docText} • ${addrText}`;
	return docText || addrText || "Не заполнено";
}

export function computeInsuranceSummary(patient?: PatientGeneralInfo | null): string {
	const parts: string[] = [];
	if (patient?.snils) parts.push("СНИЛС указан");
	if (patient?.inn) parts.push("ИНН");
	if (patient?.omsPolicyNumber) parts.push("ОМС");
	if (patient?.dmsInsuranceCompany || patient?.dmsPolicyNumber) {
		parts.push(`ДМС ${patient?.dmsInsuranceCompany || ""}`.trim());
	}
	return parts.length > 0 ? parts.join(" / ") : "Не заполнено";
}

export function computeNotesSummary(patient?: PatientGeneralInfo | null): string {
	const tagsCount = Array.isArray(patient?.serviceAlertTags) ? patient.serviceAlertTags.length : 0;
	const hasRegistryNote = Boolean((patient?.registryNotes || patient?.notes)?.trim());
	const hasDoctorNote = Boolean(patient?.doctorClinicalNotes?.trim());
	const hasMarketing = Boolean(patient?.acquisitionSource?.trim());
	const parts: string[] = [];
	if (tagsCount > 0) parts.push(`${tagsCount} тег(а/ов)`);
	if (hasRegistryNote) parts.push("Заметка регистратуры");
	if (hasDoctorNote) parts.push("Заметка врача");
	if (hasMarketing) parts.push(patient?.acquisitionSource || "");
	return parts.length > 0 ? parts.join(" • ") : "Заметок нет";
}
