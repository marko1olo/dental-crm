import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	type PatientClinicalSafetyProfile,
	parseSafetyProfileFromText,
} from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";

export function mapPatientToGeneralInfo(raw: any): PatientGeneralInfo {
	if (!raw || typeof raw !== "object") return {};
	const admin = raw.administrativeProfile && typeof raw.administrativeProfile === "object"
		? raw.administrativeProfile
		: {};

	let passportSeries = raw.passportSeries ?? "";
	let passportNumber = raw.passportNumber ?? "";
	const rawIdentityDoc = typeof admin.identityDocument === "string" ? admin.identityDocument.trim() : "";
	if ((!passportSeries || !passportNumber) && rawIdentityDoc) {
		const digitsOnly = rawIdentityDoc.replace(/\D/g, "");
		if (digitsOnly.length >= 10) {
			if (!passportSeries) passportSeries = digitsOnly.slice(0, 4);
			if (!passportNumber) passportNumber = digitsOnly.slice(4, 10);
		} else {
			const parts = rawIdentityDoc.split(/\s+/);
			if (parts.length >= 2) {
				if (!passportSeries) passportSeries = parts[0] ?? "";
				if (!passportNumber) passportNumber = parts.slice(1).join(" ");
			} else if (!passportNumber) {
				passportNumber = rawIdentityDoc;
			}
		}
	}

	const repDoc = raw.representativeDoc ?? admin.legalRepresentativeIdentityDocument ?? "";

	return {
		...raw,
		passportSeries,
		passportNumber,
		snils: raw.snils ?? admin.snils ?? "",
		inn: raw.inn ?? admin.taxpayerInn ?? "",
		omsPolicyNumber: raw.omsPolicyNumber ?? admin.insurancePolicyNumber ?? "",
		dmsInsuranceCompany: raw.dmsInsuranceCompany ?? admin.dmsInsuranceCompany ?? "",
		dmsPolicyNumber: raw.dmsPolicyNumber ?? admin.dmsPolicyNumber ?? "",
		dmsGuaranteeLetterNumber: raw.dmsGuaranteeLetterNumber ?? admin.dmsGuaranteeLetterNumber ?? "",
		dmsCoverageLimitRub: raw.dmsCoverageLimitRub ?? admin.dmsCoverageLimitRub ?? (admin.dmsCoverageLimitKopecks ? admin.dmsCoverageLimitKopecks / 100 : undefined),
		dmsCoverageLimitKopecks: raw.dmsCoverageLimitKopecks ?? admin.dmsCoverageLimitKopecks ?? undefined,
		registrationAddress: raw.registrationAddress ?? admin.registrationAddress ?? "",
		residentialAddress: raw.residentialAddress ?? admin.residentialAddress ?? "",
		representativeFullName: raw.representativeFullName ?? admin.legalRepresentativeFullName ?? "",
		representativeType: raw.representativeType ?? admin.legalRepresentativeRelationship ?? "",
		representativePhone: raw.representativePhone ?? admin.legalRepresentativePhone ?? "",
		representativeDoc: repDoc,
		representativePassportDetails: raw.representativePassportDetails ?? admin.legalRepresentativeIdentityDocument ?? "",
		preferredDocumentRecipient: raw.preferredDocumentRecipient ?? admin.preferredDocumentRecipient ?? "",
		dataProcessingBasisNote: raw.dataProcessingBasisNote ?? admin.dataProcessingBasisNote ?? "",
		patientBalanceRub: typeof raw.patientBalanceRub === "number" ? raw.patientBalanceRub : (typeof raw.balanceRub === "number" ? raw.balanceRub : 0),
		doctorClinicalNotes: raw.doctorClinicalNotes ?? raw.notes ?? "",
		acquisitionSource: raw.acquisitionSource ?? (typeof admin.preferredAppointmentNote === "string" && admin.preferredAppointmentNote.startsWith("src:") ? admin.preferredAppointmentNote.slice(4) : ""),
	};
}

export function resolveInitialSafetyProfile(
	rawPatient: any,
	explicitSafety?: Partial<PatientClinicalSafetyProfile> | null,
): PatientClinicalSafetyProfile {
	const fromNotes = parseSafetyProfileFromText(rawPatient?.notes ?? rawPatient?.doctorClinicalNotes ?? "");
	const fromAdmin = rawPatient?.administrativeProfile?.clinicalSafetyProfile ?? null;
	const merged: Record<string, unknown> = {
		...DEFAULT_SOMATIC_HEALTHY_NORM,
		...fromNotes,
		...(fromAdmin && typeof fromAdmin === "object" ? fromAdmin : {}),
		...(explicitSafety ?? {}),
	};
	for (const key of Object.keys(fromNotes)) {
		if ((fromNotes as unknown as Record<string, unknown>)[key] === true && !explicitSafety) {
			merged[key] = true;
		}
	}
	if (merged.hasArticaineAllergy || merged.hasLidocaineAllergy || merged.hasMepivacaineAllergy || merged.hasEsterAnestheticsAllergy) {
		merged.hasAnestheticAllergy = true;
	}
	if (merged.takesAnticoagulants) merged.hasAnticoagulantTherapy = true;
	if (merged.hasAnticoagulantTherapy) merged.takesAnticoagulants = true;
	if (merged.takesBisphosphonates) merged.hasBisphosphonateTherapy = true;
	if (merged.hasBisphosphonateTherapy) merged.takesBisphosphonates = true;
	return merged as unknown as PatientClinicalSafetyProfile;
}
