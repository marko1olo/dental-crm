import type { Patient, A4DocumentMedicalCardData } from "@dental/shared";

export function buildDefaultClinic(clinicProfileDraft: any) {
	const draft = clinicProfileDraft || {};
	return {
		name: draft.clinicName || draft.name || 'ООО "Стоматологическая клиника ДЕНТЕ"',
		legalName: draft.legalName || draft.clinicName || 'ООО "Стоматологическая клиника ДЕНТЕ"',
		shortName: draft.shortName || 'ООО "ДЕНТЕ"',
		address: draft.legalAddress || draft.address || "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
		inn: draft.inn || "7710984521",
		kpp: draft.kpp || "771001001",
		ogrn: draft.ogrn || "1217700456123",
		licenseNumber: draft.medicalLicenseNumber || draft.licenseNumber || "ЛО41-01137-77/00645892",
		phone: draft.phone || "+7 (495) 123-45-67",
		directorFullName: draft.directorFullName || "Воронов Алексей Владимирович",
	};
}

export function buildDefaultPatient(patient?: Patient | null) {
	const pAny = (patient || {}) as any;
	return {
		fullName: patient?.fullName || "Пациент клиники",
		birthDate: patient?.birthDate
			? new Date(patient.birthDate).toLocaleDateString("ru-RU")
			: "01.01.1990",
		gender: (patient?.gender as "male" | "female") || "male",
		phone: patient?.phone || "+7 (999) 000-00-00",
		cardNumber: pAny.medicalCardNumber || pAny.cardNumber || "МК-2026/001",
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
		allergyStatus: "Соматически сохранен. Лекарственные аллергии со слов пациента отрицает.",
		somaticStatus: "Соматически здоров. Физиологическая норма.",
		complaints: "Плановый осмотр и санация полости рта.",
		anamnesisMorbi: "Обратился в плановом порядке для стоматологического лечения.",
		statusLocalis: "Слизистая оболочка полости рта бледно-розовая, влажная. Прикус ортогнатический.",
		teethFormulaSummary: "Зубная формула санирована.",
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
		diagnosisIcd10: "K02.1",
		diagnosisDescription: "Кариес дентина",
		diagnosisTooth: "16",
		treatmentProtocol: "Проведено стоматологическое лечение по клиническому протоколу.",
		materialsUsed: "Стоматологические материалы по стандарту СтАР.",
		recommendations: "Соблюдать гигиену полости рта. Плановый контрольный осмотр через 6 месяцев.",
		...customCardData,
	};
}
