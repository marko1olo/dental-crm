export interface BlankContractPatientInfo {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
	birthDate?: string | null | undefined;
	administrativeProfile?: {
		identityDocument?: string | null | undefined;
		registrationAddress?: string | null | undefined;
		residentialAddress?: string | null | undefined;
		taxpayerInn?: string | null | undefined;
		snils?: string | null | undefined;
		insurancePolicyNumber?: string | null | undefined;
		email?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
		legalRepresentativeRelationship?: string | null | undefined;
		legalRepresentativeIdentityDocument?: string | null | undefined;
		legalRepresentativePhone?: string | null | undefined;
	} | null | undefined;
}

export interface BlankContractOptions {
	doctorName?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicOgrn?: string | null | undefined;
	clinicInn?: string | null | undefined;
	clinicKpp?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	clinicWebsite?: string | null | undefined;
	medicalLicenseNumber?: string | null | undefined;
	medicalLicenseDate?: string | null | undefined;
	medicalLicenseIssuer?: string | null | undefined;
	contractNumber?: string | null | undefined;
	contractDate?: string | null | undefined;
}
