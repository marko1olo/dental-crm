import { kopecksToRubles } from "@dental/shared";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	type PatientClinicalSafetyProfile,
	parseSafetyProfileFromText,
} from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";

export interface RawPatientAdministrativeProfile {
	identityDocument?: string | null | undefined;
	snils?: string | null | undefined;
	taxpayerInn?: string | null | undefined;
	insurancePolicyNumber?: string | null | undefined;
	dmsInsuranceCompany?: string | null | undefined;
	dmsPolicyNumber?: string | null | undefined;
	dmsGuaranteeLetterNumber?: string | null | undefined;
	dmsCoverageLimitRub?: number | string | null | undefined;
	dmsCoverageLimitKopecks?: number | null | undefined;
	registrationAddress?: string | null | undefined;
	residentialAddress?: string | null | undefined;
	legalRepresentativeFullName?: string | null | undefined;
	legalRepresentativeRelationship?: string | null | undefined;
	legalRepresentativePhone?: string | null | undefined;
	legalRepresentativeIdentityDocument?: string | null | undefined;
	preferredDocumentRecipient?: string | null | undefined;
	dataProcessingBasisNote?: string | null | undefined;
	preferredAppointmentNote?: string | null | undefined;
	clinicalSafetyProfile?: Record<string, unknown> | Partial<PatientClinicalSafetyProfile> | null | undefined;
}

export interface RawPatientInput {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	notes?: string | null | undefined;
	doctorClinicalNotes?: string | null | undefined;
	balanceRub?: number | string | null | undefined;
	patientBalanceRub?: number | string | null | undefined;
	passportSeries?: string | null | undefined;
	passportNumber?: string | null | undefined;
	snils?: string | null | undefined;
	inn?: string | null | undefined;
	omsPolicyNumber?: string | null | undefined;
	dmsInsuranceCompany?: string | null | undefined;
	dmsPolicyNumber?: string | null | undefined;
	dmsGuaranteeLetterNumber?: string | null | undefined;
	dmsCoverageLimitRub?: number | string | null | undefined;
	dmsCoverageLimitKopecks?: number | null | undefined;
	registrationAddress?: string | null | undefined;
	residentialAddress?: string | null | undefined;
	representativeFullName?: string | null | undefined;
	representativeType?: string | null | undefined;
	representativePhone?: string | null | undefined;
	representativeDoc?: string | null | undefined;
	representativePassportDetails?: string | null | undefined;
	preferredDocumentRecipient?: string | null | undefined;
	dataProcessingBasisNote?: string | null | undefined;
	acquisitionSource?: string | null | undefined;
	administrativeProfile?: RawPatientAdministrativeProfile | null | undefined;
}

export function mapPatientToGeneralInfo(raw: RawPatientInput | null | undefined): PatientGeneralInfo {
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
		dmsCoverageLimitRub: raw.dmsCoverageLimitRub ?? admin.dmsCoverageLimitRub ?? (admin.dmsCoverageLimitKopecks ? kopecksToRubles(admin.dmsCoverageLimitKopecks) : undefined),
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
	rawPatient: RawPatientInput | null | undefined,
	explicitSafety?: Partial<PatientClinicalSafetyProfile> | null,
): PatientClinicalSafetyProfile {
	const notesText = (typeof rawPatient?.notes === "string" ? rawPatient.notes : "") ||
		(typeof rawPatient?.doctorClinicalNotes === "string" ? rawPatient.doctorClinicalNotes : "");
	const fromNotes = parseSafetyProfileFromText(notesText);
	const fromAdmin = rawPatient?.administrativeProfile?.clinicalSafetyProfile ?? null;

	const base: PatientClinicalSafetyProfile = {
		...DEFAULT_SOMATIC_HEALTHY_NORM,
		...fromNotes,
		...(fromAdmin && typeof fromAdmin === "object" ? fromAdmin : {}),
		...(explicitSafety ?? {}),
	};

	const hasAnestheticAllergy = Boolean(
		base.hasAnestheticAllergy ||
		base.hasArticaineAllergy ||
		base.hasLidocaineAllergy ||
		base.hasMepivacaineAllergy ||
		base.hasEsterAnestheticsAllergy,
	);

	const takesAnticoagulants = Boolean(base.takesAnticoagulants || base.hasAnticoagulantTherapy);
	const takesBisphosphonates = Boolean(base.takesBisphosphonates || base.hasBisphosphonateTherapy);

	return {
		...base,
		hasAnestheticAllergy,
		takesAnticoagulants,
		hasAnticoagulantTherapy: takesAnticoagulants,
		takesBisphosphonates,
		hasBisphosphonateTherapy: takesBisphosphonates,
	};
}
