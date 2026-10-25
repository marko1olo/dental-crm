import type { Patient, A4DocumentMedicalCardData } from "@dental/shared";

export function buildDefaultClinic(clinicProfileDraft: any) {
	// Честные реквизиты: только данные профиля клиники из БД; при незаполненном
	// профиле — пустые строки для ручного заполнения, никаких выдуманных ИНН/лицензий.
	const draft = clinicProfileDraft || {};
	return {
		name: draft.clinicName || draft.name || "Стоматологическая клиника",
		legalName: draft.legalName || draft.clinicName || "",
		shortName: draft.clinicName || "",
		address: draft.legalAddress || draft.address || "",
		inn: draft.inn || "",
		kpp: draft.kpp || "",
		ogrn: draft.ogrn || "",
		licenseNumber: draft.medicalLicenseNumber || draft.licenseNumber || "",
		phone: draft.phone || "",
		directorFullName: draft.directorFullName || "",
	};
}

export function buildDefaultPatient(patient?: Patient | null) {
	const pAny = (patient || {}) as any;
	return {
		fullName: patient?.fullName || "",
		birthDate: patient?.birthDate
			? new Date(patient.birthDate).toLocaleDateString("ru-RU")
			: "",
		gender: (patient?.gender as "male" | "female") || "male",
		phone: patient?.phone || "",
		cardNumber: pAny.medicalCardNumber || pAny.cardNumber || "",
	};
}

export function getTodayRuFormatted(): string {
	const d = new Date();
	const day = String(d.getDate()).padStart(2, "0");
	const months = [
		"января", "февраля", "марта", "апреля", "мая", "июня",
		"июля", "августа", "сентября", "октября", "ноября", "декабря",
	];
	const month = months[d.getMonth()] || "января";
	const year = d.getFullYear();
	return `${day} ${month} ${year}`;
}

export function buildCompleteCardData(
	cl: ReturnType<typeof buildDefaultClinic>,
	pt: ReturnType<typeof buildDefaultPatient>,
	doctor: string,
	todayRu: string,
	customCardData?: Partial<A4DocumentMedicalCardData>,
): A4DocumentMedicalCardData {
	return {
		clinic: { ...cl },
		patient: { ...pt },
		cardNumber: pt.cardNumber,
		visitDate: todayRu,
		doctorFullName: doctor,
		doctorSpecialty: "Врач-стоматолог",
		allergyStatus: "",
		somaticStatus: "",
		complaints: "",
		anamnesisMorbi: "",
		statusLocalis: "",
		teethFormulaSummary: "",
		teethFormulaMap: {
			18: { state: "—" }, 17: { state: "—" }, 16: { state: "—" }, 15: { state: "—" },
			14: { state: "—" }, 13: { state: "—" }, 12: { state: "—" }, 11: { state: "—" },
			21: { state: "—" }, 22: { state: "—" }, 23: { state: "—" }, 24: { state: "—" },
			25: { state: "—" }, 26: { state: "—" }, 27: { state: "—" }, 28: { state: "—" },
			48: { state: "—" }, 47: { state: "—" }, 46: { state: "—" }, 45: { state: "—" },
			44: { state: "—" }, 43: { state: "—" }, 42: { state: "—" }, 41: { state: "—" },
			31: { state: "—" }, 32: { state: "—" }, 33: { state: "—" }, 34: { state: "—" },
			35: { state: "—" }, 36: { state: "—" }, 37: { state: "—" }, 38: { state: "—" },
		},
		diagnosisIcd10: "",
		diagnosisDescription: "",
		diagnosisTooth: "",
		treatmentProtocol: "",
		materialsUsed: "",
		recommendations: "",
		...customCardData,
	};
}
