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
		fullName: patient?.fullName || "Ковалёв Роман Станиславович",
		birthDate: patient?.birthDate
			? new Date(patient.birthDate).toLocaleDateString("ru-RU")
			: "12.04.1988",
		gender: (patient?.gender as "male" | "female") || "male",
		phone: patient?.phone || "+7 (999) 888-77-66",
		passportSeries: pass.series || "4515",
		passportNumber: pass.number || "892341",
		passportIssuedBy: pass.issuedBy || "ОВД Тверского района города Москвы",
		passportIssuedDate: pass.issuedDate
			? new Date(pass.issuedDate).toLocaleDateString("ru-RU")
			: "20.05.2012",
		passportDepartmentCode: pass.departmentCode || "770-015",
		address:
			pAny.address ||
			admin.registrationAddress ||
			"г. Москва, ул. Новослободская, д. 14, кв. 82",
		registrationAddress:
			admin.registrationAddress ||
			pAny.address ||
			"г. Москва, ул. Новослободская, д. 14, кв. 82",
		snils: pAny.snils || admin.snils || "154-892-301 92",
		omsPolis: pAny.omsPolis || admin.omsPolicyNumber || "7700 8923 1204 9512",
		cardNumber: pAny.medicalCardNumber || pAny.cardNumber || "МК-2026/0418",
	};
}
