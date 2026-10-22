/**
 * sampleFnsTaxPreset.ts — Sample fixture for FNS Tax Deduction (КНД 1151156)
 */

import type { FnsTaxCertificatePayload } from "./cdaR2XmlBuilder";

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
			amountKopecks: 1250000,
		},
		{
			id: "PAY-02",
			date: "2026-06-20",
			serviceCode: "2",
			serviceDescription: "Ортодонтическое лечение и установка брекет-системы (дорогостоящее)",
			amountKopecks: 8500050,
		},
	],
	signer: {
		fullName: "Смирнова Елена Викторовна",
		position: "Главный врач",
		snils: "123-456-789 64",
	},
};
