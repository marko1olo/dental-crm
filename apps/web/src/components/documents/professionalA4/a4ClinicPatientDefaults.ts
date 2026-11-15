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

export interface A4ClinicRequisites {
	name: string;
	legalName: string;
	shortName: string;
	address: string;
	actualAddress: string;
	inn: string;
	kpp: string;
	ogrn: string;
	licenseNumber: string;
	licenseDate: string;
	licenseIssuer: string;
	phone: string;
	email: string;
	bankName: string;
	bik: string;
	checkingAccount: string;
	correspondentAccount: string;
	directorTitle: string;
	directorFullName: string;
	city: string;
}

export interface A4PatientRequisites {
	fullName: string;
	birthDate: string;
	gender: "male" | "female";
	phone: string;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	address: string;
	registrationAddress: string;
	snils: string;
	omsPolis: string;
	cardNumber: string;
}

export function buildA4ClinicRequisites(
	clinicProfileDraft?: Partial<A4ClinicRequisites> | Record<string, unknown> | null,
): A4ClinicRequisites {
	const draft = clinicProfileDraft || {};
	const getString = (key: string): string => {
		const val = draft[key];
		return typeof val === "string" ? val : "";
	};

	const clinicName =
		getString("clinicName") ||
		getString("name") ||
		'ООО "Стоматологическая клиника"';
	const legalName =
		getString("legalName") ||
		clinicName;
	const shortName = getString("shortName") || clinicName;

	return {
		name: clinicName,
		legalName,
		shortName,
		address:
			getString("legalAddress") ||
			getString("address") ||
			"________________________________________________________",
		actualAddress:
			getString("actualAddress") ||
			getString("address") ||
			"________________________________________________________",
		inn: getString("inn") || "____________",
		kpp: getString("kpp") || "_________",
		ogrn: getString("ogrn") || "_____________",
		licenseNumber:
			getString("medicalLicenseNumber") ||
			getString("licenseNumber") ||
			"ЛО-___-______",
		licenseDate:
			getString("medicalLicenseIssuedAt") || getString("licenseDate") || "«___» _________ _____ г.",
		licenseIssuer:
			getString("medicalLicenseIssuer") || "________________________________________________",
		phone: getString("phone") || "+7 (___) ___-__-__",
		email: getString("email") || "info@clinic.ru",
		bankName: getString("bankName") || "________________________",
		bik: getString("bik") || "_________",
		checkingAccount: getString("checkingAccount") || "____________________",
		correspondentAccount: getString("correspondentAccount") || "____________________",
		directorTitle: getString("directorTitle") || "Руководитель",
		directorFullName: getString("directorFullName") || "____________________________________",
		city: getString("city") || "г. ____________",
	};
}

export function buildA4PatientRequisites(patient?: Patient | null): A4PatientRequisites {
	const admin = patient?.administrativeProfile;
	const pObj = (patient ?? {}) as Record<string, unknown>;
	const getPString = (key: string): string => {
		const val = pObj[key];
		return typeof val === "string" ? val : "";
	};

	let passportSeries = "____";
	let passportNumber = "______";
	let passportIssuedBy = "________________________________________________";
	let passportIssuedDate = "«___» _________ _____ г.";
	let passportDepartmentCode = "___-___";

	if (admin && typeof admin === "object") {
		const adminObj = admin as Record<string, unknown>;
		const pass = adminObj.passport;
		if (pass && typeof pass === "object") {
			const passObj = pass as Record<string, unknown>;
			if (typeof passObj.series === "string" && passObj.series) passportSeries = passObj.series;
			if (typeof passObj.number === "string" && passObj.number) passportNumber = passObj.number;
			if (typeof passObj.issuedBy === "string" && passObj.issuedBy) passportIssuedBy = passObj.issuedBy;
			if (typeof passObj.issuedDate === "string" && passObj.issuedDate) {
				passportIssuedDate = new Date(passObj.issuedDate).toLocaleDateString("ru-RU");
			}
			if (typeof passObj.departmentCode === "string" && passObj.departmentCode) passportDepartmentCode = passObj.departmentCode;
		}
	}

	const regAddr =
		(admin && typeof admin === "object" && typeof (admin as Record<string, unknown>).registrationAddress === "string"
			? ((admin as Record<string, unknown>).registrationAddress as string)
			: "") ||
		getPString("address") ||
		"________________________________________________________";

	const snilsVal =
		(admin && typeof admin === "object" && typeof (admin as Record<string, unknown>).snils === "string"
			? ((admin as Record<string, unknown>).snils as string)
			: "") ||
		getPString("snils") ||
		"___-___-___ __";

	const omsVal =
		(admin && typeof admin === "object" && typeof (admin as Record<string, unknown>).insurancePolicyNumber === "string"
			? ((admin as Record<string, unknown>).insurancePolicyNumber as string)
			: "") ||
		getPString("omsPolis") ||
		"____________________";

	const cardNum = getPString("medicalCardNumber") || getPString("cardNumber") || "МК-________";

	return {
		fullName: patient?.fullName || "________________________________________",
		birthDate: patient?.birthDate
			? new Date(patient.birthDate).toLocaleDateString("ru-RU")
			: "«___» _________ _____ г.",
		gender: patient?.gender === "female" ? "female" : "male",
		phone: patient?.phone || "+7 (___) ___-__-__",
		passportSeries,
		passportNumber,
		passportIssuedBy,
		passportIssuedDate,
		passportDepartmentCode,
		address: getPString("address") || regAddr,
		registrationAddress: regAddr,
		snils: snilsVal,
		omsPolis: omsVal,
		cardNumber: cardNum,
	};
}
