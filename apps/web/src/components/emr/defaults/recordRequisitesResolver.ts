import type { ClinicRequisites043 } from "../emr043Types";
import { DEFAULT_043_DATA } from "./recordDefaultSchema";

export function resolveClinicRequisites(
	initialClinic?: Partial<ClinicRequisites043>,
	profile?: {
		clinicName?: string | null | undefined;
		legalName?: string | null | undefined;
		address?: string | null | undefined;
		phone?: string | null | undefined;
		ogrn?: string | null | undefined;
		inn?: string | null | undefined;
		kpp?: string | null | undefined;
		medicalLicenseNumber?: string | null | undefined;
		medicalLicenseIssuedAt?: string | null | undefined;
		medicalLicenseIssuer?: string | null | undefined;
		signatoryName?: string | null | undefined;
		[key: string]: unknown;
	} | null | undefined,
	staff?: { role?: string; specialties?: string[]; fullName?: string }[],
): ClinicRequisites043 {
	const resolvedChiefDoctor =
		staff?.find(
			(s) =>
				s.role === "owner" ||
				(s.specialties && s.specialties.some((sp) => sp.toLowerCase().includes("глав"))),
		)?.fullName ||
		profile?.signatoryName ||
		"";

	return {
		clinicName:
			initialClinic?.clinicName ||
			profile?.clinicName ||
			DEFAULT_043_DATA.clinic.clinicName,
		clinicLegalName:
			initialClinic?.clinicLegalName ||
			profile?.legalName ||
			profile?.clinicName ||
			DEFAULT_043_DATA.clinic.clinicLegalName,
		clinicAddress:
			initialClinic?.clinicAddress ||
			profile?.address ||
			"",
		clinicPhone:
			initialClinic?.clinicPhone ||
			profile?.phone ||
			"",
		clinicOgrn:
			initialClinic?.clinicOgrn ||
			profile?.ogrn ||
			"",
		clinicInn:
			initialClinic?.clinicInn ||
			profile?.inn ||
			"",
		clinicKpp:
			initialClinic?.clinicKpp ||
			profile?.kpp ||
			"",
		licenseNumber:
			initialClinic?.licenseNumber ||
			profile?.medicalLicenseNumber ||
			"",
		licenseDate:
			initialClinic?.licenseDate ||
			profile?.medicalLicenseIssuedAt ||
			"",
		licenseIssuer:
			initialClinic?.licenseIssuer ||
			profile?.medicalLicenseIssuer ||
			"",
		chiefDoctorFullName:
			initialClinic?.chiefDoctorFullName ||
			resolvedChiefDoctor ||
			"",
	};
}
