/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION SAMPLE PRESETS — DENTE DENTAL CRM
 * Static presets for UI testing, development previews and validation fixtures
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	SAMPLE_043U_PATIENT_PRESET,
} from "./remdXml/egiszRemdPresets";

import type {
	EgiszDentalCdaPayload,
	FnsTaxCertificatePayload,
} from "./cdaR2XmlBuilder";

export const SAMPLE_DENTAL_SEMD_105_PRESET: EgiszDentalCdaPayload = {
	docTypeCode: "105",
	documentUuid: "DOC-105-2026-08419",
	documentVersion: 1,
	encounterDate: "2026-08-28T10:30:00+03:00",
	clinic: DEFAULT_EGISZ_CLINIC_PRESET,
	doctor: DEFAULT_EGISZ_DOCTOR_PRESET,
	patient: SAMPLE_043U_PATIENT_PRESET,
	complaints: "Жалобы на кратковременные боли от холодного и кислого в зубе 46, застревание волокнистой пищи.",
	anamnesisMorbi: "Появление болей отмечает около двух недель назад. Ранее зуб 46 не лечился.",
	anamnesisVitae: "Соматический анамнез не отягощен. Аллергия на медикаменты отрицается.",
	toothStates: {
		18: "Healthy",
		17: "Healthy",
		16: "Filling",
		15: "Healthy",
		14: "Healthy",
		13: "Healthy",
		12: "Healthy",
		11: "Healthy",
		21: "Healthy",
		22: "Healthy",
		23: "Healthy",
		24: "Healthy",
		25: "Healthy",
		26: "Crown",
		27: "Healthy",
		28: "Healthy",
		48: "Healthy",
		47: "Healthy",
		46: "Caries",
		45: "Healthy",
		44: "Healthy",
		43: "Healthy",
		42: "Healthy",
		41: "Healthy",
		31: "Healthy",
		32: "Healthy",
		33: "Healthy",
		34: "Healthy",
		35: "Healthy",
		36: "Filling",
		37: "Healthy",
		38: "Healthy",
	},
	toothSurfaces: {
		46: ["O", "D"],
		16: ["O"],
		36: ["O", "M"],
	},
	diagnoses: [
		{
			icd10Code: "K02.1",
			icd10Name: "Кариес дентина (глубокий кариес)",
			isPrimary: true,
			tooth: 46,
			surfaces: ["O", "D"],
			clinicalDescription: "Кариозная полость средней глубины на жевательно-дистальной поверхности зуба 46, зондирование болезненно по эмалево-дентинной границе.",
		},
	],
	procedures: [
		{
			code: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			tooth: 46,
			quantity: 1,
		},
		{
			code: "A16.07.002.002",
			name: "Восстановление зуба пломбой II класс по Блэку с использованием светоотверждаемых композитов",
			tooth: 46,
			surfaces: ["O", "D"],
			quantity: 1,
		},
	],
	treatmentProtocolDescription: "Проведена инфильтрационная анестезия Sol. Ultracaini DS Forte 1.7 ml. Препарирование кариозной полости зуба 46, медикаментозная обработка 2% р-ром хлоргексидина. Наложение изолирующей прокладки, адгезивный протокол Single Bond Universal, послойная реставрация Filtek Ultimate (A3/A3.5), полировка Enhance + Prisma Gloss.",
	recommendations: "Соблюдение гигиены полости рта, щадящий режим жевания на зубе 46 в течение 2 часов. Контрольный осмотр через 6 месяцев.",
	nextVisitDate: "2027-02-28",
};

export const SAMPLE_FNS_TAX_1151156_PRESET: FnsTaxCertificatePayload = {
	documentNumber: "СПР-2026/0412",
	documentDate: "2026-08-28",
	taxYear: 2026,
	clinic: {
		name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		inn: "7701234560",
		kpp: "770101001",
		ogrn: "1157746123457",
		phone: "+7 (495) 789-45-60",
		email: "buh@dente-clinic.ru",
	},
	taxpayer: {
		fullName: "Соколов Владимир Николаевич",
		inn: "772412345678",
		snils: "123-456-789 64",
		birthDate: "1985-04-12",
		docTypeCode: "21",
		docSeriesNumber: "4515 892341",
	},
	patient: {
		fullName: "Соколова Анна Владимировна",
		snils: "123-456-789 64",
		birthDate: "2010-06-14",
		relationshipCode: "4",
		relationshipName: "Ребенок / Подопечный",
	},
	payments: [
		{
			id: "PAY-01",
			date: "2026-03-15",
			serviceCode: "1",
			serviceDescription: "Терапевтическое лечение кариеса зуба 46 и профгигиена",
			amountKopecks: 1250000, // 12 500.00 руб.
		},
		{
			id: "PAY-02",
			date: "2026-06-20",
			serviceCode: "2",
			serviceDescription: "Ортодонтическое лечение и установка брекет-системы (дорогостоящее)",
			amountKopecks: 8500050, // 85 000.50 руб.
		},
	],
	signer: {
		fullName: "Смирнова Елена Викторовна",
		position: "Главный врач",
		snils: "123-456-789 64",
	},
};
