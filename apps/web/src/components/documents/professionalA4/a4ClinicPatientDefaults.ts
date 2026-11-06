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
			'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
		legalName:
			draft.legalName ||
			draft.clinicName ||
			'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
		shortName: draft.shortName || 'ООО "ДЕНТЕ Премиум"',
		address:
			draft.legalAddress ||
			draft.address ||
			"127006, г. Москва, ул. Тверская, д. 12, стр. 2",
		actualAddress:
			draft.actualAddress ||
			draft.address ||
			"127006, г. Москва, ул. Тверская, д. 12, стр. 2",
		inn: draft.inn || "7710984521",
		kpp: draft.kpp || "771001001",
		ogrn: draft.ogrn || "1217700456123",
		licenseNumber:
			draft.medicalLicenseNumber ||
			draft.licenseNumber ||
			"ЛО41-01137-77/00645892",
		licenseDate:
			draft.medicalLicenseIssuedAt || draft.licenseDate || "15.04.2022",
		licenseIssuer:
			draft.medicalLicenseIssuer || "Департамент здравоохранения города Москвы",
		phone: draft.phone || "+7 (495) 123-45-67",
		email: draft.email || "info@dente-clinic.ru",
		bankName: draft.bankName || 'ПАО "Сбербанк"',
		bik: draft.bik || "044525225",
		checkingAccount: draft.checkingAccount || "40702810938000123456",
		correspondentAccount: draft.correspondentAccount || "30101810400000000225",
		directorTitle: draft.directorTitle || "Генеральный директор",
		directorFullName: draft.directorFullName || "Воронов Алексей Владимирович",
		city: draft.city || "г. Москва",
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
