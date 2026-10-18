export interface PrimaryIntakePackagePrintOptions {
	patient: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		phone?: string | null | undefined;
		passport?: string | null | undefined;
		passportSeries?: string | null | undefined;
		passportNumber?: string | null | undefined;
		passportIssuedBy?: string | null | undefined;
		passportIssuedDate?: string | null | undefined;
		passportDepartmentCode?: string | null | undefined;
		snils?: string | null | undefined;
		address?: string | null | undefined;
		registrationAddress?: string | null | undefined;
		cardNumber?: string | null | undefined;
		gender?: string | null | undefined;
	} | null | undefined;
	representative?: {
		fullName?: string | null | undefined;
		relationship?: string | null | undefined;
		phone?: string | null | undefined;
		passport?: string | null | undefined;
		passportSeries?: string | null | undefined;
		passportNumber?: string | null | undefined;
		passportIssuedBy?: string | null | undefined;
		passportIssuedDate?: string | null | undefined;
		passportDepartmentCode?: string | null | undefined;
		basisDocument?: string | null | undefined;
	} | null | undefined;
	clinic?: {
		legalName?: string | null | undefined;
		clinicName?: string | null | undefined;
		fullName?: string | null | undefined;
		shortName?: string | null | undefined;
		inn?: string | null | undefined;
		kpp?: string | null | undefined;
		ogrn?: string | null | undefined;
		address?: string | null | undefined;
		actualAddress?: string | null | undefined;
		licenseNumber?: string | null | undefined;
		licenseDate?: string | null | undefined;
		phone?: string | null | undefined;
		bankName?: string | null | undefined;
		bik?: string | null | undefined;
		checkingAccount?: string | null | undefined;
		corrAccount?: string | null | undefined;
		directorTitle?: string | null | undefined;
		directorFullName?: string | null | undefined;
		city?: string | null | undefined;
		website?: string | null | undefined;
	} | null | undefined;
	doctorFullName?: string | null | undefined;
	intakeNormApplied?: boolean | undefined;
	questionnaireAnswers?: {
		complaint?: string | null | undefined;
		allergies?: string | null | undefined;
		medications?: string | null | undefined;
		chronic?: string | null | undefined;
		anticoagulants?: string | null | undefined;
		infections?: string | null | undefined;
		cardioEndocrine?: string | null | undefined;
		pregnancy?: string | null | undefined;
	} | null | undefined;
}

export interface IntakeRequisitesContext {
	todayFormatted: string;
	clinicName: string;
	clinicAddress: string;
	clinicCity: string;
	clinicWebsite: string;
	clinicInn: string;
	clinicKpp: string;
	clinicOgrn: string;
	clinicLicense: string;
	clinicPhone: string;
	clinicDirector: string;
	clinicDirectorDecoding: string;
	clinicDirectorTitle: string;
	hasRep: boolean;
	repFullName: string;
	repRelation: string;
	repBasis: string;
	repPhone: string;
	repPassport: string;
	ptName: string;
	ptSignatureDecoding: string;
	ptBirthDate: string;
	ptPhone: string;
	ptAddress: string;
	ptSnils: string;
	ptPassport: string;
	docDoctorName: string;
	patientCardNumber: string;
}
