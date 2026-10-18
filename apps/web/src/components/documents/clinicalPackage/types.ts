export interface ClinicalPackagePrintOptions {
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
	} | null | undefined;
	doctorFullName?: string | null | undefined;
	treatmentDetails?: {
		diagnosisIcd10?: string | null | undefined;
		toothNumbers?: string | number | null | undefined;
		anestheticName?: string | null | undefined;
		treatmentType?: string | null | undefined;
	} | null | undefined;
}

export interface ClinicalRequisitesContext {
	todayFormatted: string;
	clinicName: string;
	clinicAddress: string;
	clinicInn: string;
	clinicOgrn: string;
	clinicLicense: string;
	clinicPhone: string;
	ptName: string;
	ptBirthDate: string;
	ptPhone: string;
	ptAddress: string;
	ptPassport: string;
	docDoctorName: string;
	toothInfo: string;
	icdDiagnosis: string;
	anesName: string;
	opType: string;
	opTooth: string;
}
