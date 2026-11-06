import type { Patient } from "@dental/shared";

export function buildA4TodayRu(): string {
	const d = new Date();
	const day = String(d.getDate()).padStart(2, "0");
	const months = [
		"января",
		"февраля",
		"марта",
		"апреля",
		"мая",
		"июня",
		"июля",
		"августа",
		"сентября",
		"октября",
		"ноября",
		"декабря",
	];
	const month = months[d.getMonth()];
	const year = d.getFullYear();
	return `${day} ${month} ${year}`;
}

// biome-ignore lint/suspicious/noExplicitAny: clinic profile draft
export function buildA4ClinicRequisites(clinicProfileDraft: any) {
	const draft = clinicProfileDraft || {};
	return {
		name:
			draft.clinicName ||
			draft.name ||
			'ООО "Стоматологическая клиника"',
		legalName:
			draft.legalName ||
			draft.clinicName ||
			'ООО "Стоматологическая клиника"',
		shortName: draft.shortName || draft.clinicName || 'ООО "Стоматологическая клиника"',
		address:
			draft.legalAddress ||
			draft.address ||
			"________________________________________________________",
		actualAddress:
			draft.actualAddress ||
			draft.address ||
			"________________________________________________________",
		inn: draft.inn || "____________",
		kpp: draft.kpp || "_________",
		ogrn: draft.ogrn || "_____________",
		licenseNumber:
			draft.medicalLicenseNumber ||
			draft.licenseNumber ||
			"ЛО-___-______",
		licenseDate:
			draft.medicalLicenseIssuedAt || draft.licenseDate || "«___» _________ _____ г.",
		licenseIssuer:
			draft.medicalLicenseIssuer || "________________________________________________",
		phone: draft.phone || "+7 (___) ___-__-__",
		email: draft.email || "info@clinic.ru",
		bankName: draft.bankName || "________________________",
		bik: draft.bik || "_________",
		checkingAccount: draft.checkingAccount || "____________________",
		correspondentAccount: draft.correspondentAccount || "____________________",
		directorTitle: draft.directorTitle || "Руководитель",
		directorFullName: draft.directorFullName || "____________________________________",
		city: draft.city || "г. ____________",
	};
}

export function buildA4PatientRequisites(patient?: Patient | null) {
	// biome-ignore lint/suspicious/noExplicitAny: patient profile
	const pAny = (patient || {}) as any;
	const admin = pAny.administrativeProfile || {};
	const pass = admin.passport || {};
	return {
		fullName: patient?.fullName || "________________________________________",
		birthDate: patient?.birthDate
			? new Date(patient.birthDate).toLocaleDateString("ru-RU")
			: "«___» _________ _____ г.",
		gender: (patient?.gender as "male" | "female") || "male",
		phone: patient?.phone || "+7 (___) ___-__-__",
		passportSeries: pass.series || "____",
		passportNumber: pass.number || "______",
		passportIssuedBy: pass.issuedBy || "________________________________________________",
		passportIssuedDate: pass.issuedDate
			? new Date(pass.issuedDate).toLocaleDateString("ru-RU")
			: "«___» _________ _____ г.",
		passportDepartmentCode: pass.departmentCode || "___-___",
		address:
			pAny.address ||
			admin.registrationAddress ||
			"________________________________________________________",
		registrationAddress:
			admin.registrationAddress ||
			pAny.address ||
			"________________________________________________________",
		snils: pAny.snils || admin.snils || "___-___-___ __",
		omsPolis: pAny.omsPolis || admin.omsPolicyNumber || "____________________",
		cardNumber: pAny.medicalCardNumber || pAny.cardNumber || "МК-________",
	};
}
