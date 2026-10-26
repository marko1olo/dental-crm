/**
 * paidContract/contractPartyTypes.ts
 * Party and customer requisites for medical services contract (Mandate 8b <= 120 lines)
 */

export interface PaidContractClinicRequisites {
	fullName: string;
	shortName: string;
	brandName?: string | undefined;
	legalAddress: string;
	actualAddress: string;
	inn: string;
	kpp: string;
	ogrn: string;
	licenseNumber: string;
	licenseDate: string;
	licenseIssuer: string;
	bankName: string;
	bik: string;
	checkingAccount: string;
	bankAccount?: string | undefined;
	correspondentAccount: string;
	phone: string;
	email: string;
	website?: string | undefined;
	directorTitle: string;
	directorFullName: string;
	actingOnBasis: string;
}

export interface PaidContractPatientRequisites {
	fullName: string;
	birthDate: string;
	gender?: string | undefined;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	snils: string;
	registrationAddress: string;
	actualAddress?: string | undefined;
	phone: string;
	email?: string | undefined;
	cardNumber?: string | undefined;
}

export interface PaidContractCustomerRequisites {
	isDifferentFromPatient: boolean;
	fullName: string;
	birthDate?: string | undefined;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	snils?: string | undefined;
	registrationAddress: string;
	actualAddress?: string | undefined;
	phone: string;
	email?: string | undefined;
}

export interface PaidContractRepresentativeRequisites {
	hasRepresentative: boolean;
	fullName: string;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	basisDocument: string;
	phone: string;
}
