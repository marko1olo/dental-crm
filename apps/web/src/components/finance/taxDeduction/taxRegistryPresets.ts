import type { TaxDeductionCertificateParams } from "../taxDeductionEngine";

export type TaxCertificateStatus = "ISSUED" | "SENT_TO_FNS" | "DRAFT";

export interface TaxCertificateRegistryItem {
	readonly id: string;
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly taxYear: number;
	readonly patientName: string;
	readonly patientInn?: string | undefined;
	readonly taxpayerName: string;
	readonly taxpayerInn?: string | undefined;
	readonly relationshipRu: string;
	readonly relationshipCode: "1" | "2" | "3" | "4";
	readonly code01Rub: number;
	readonly code02Rub: number;
	readonly totalRub: number;
	readonly refund13Rub: number;
	readonly status: TaxCertificateStatus;
	readonly receiptsCount: number;
	readonly rawParams?: TaxDeductionCertificateParams | undefined;
}

export const DEMO_REGISTRY_ITEMS: readonly TaxCertificateRegistryItem[] = [
	{
		id: "tax-reg-1",
		certificateNumber: "104",
		issueDateIso: "2025-03-15T10:30:00Z",
		taxYear: 2025,
		patientName: "Иванов Иван Иванович",
		patientInn: "772819283746",
		taxpayerName: "Иванов Иван Иванович",
		taxpayerInn: "772819283746",
		relationshipRu: "Пациент (лично)",
		relationshipCode: "1",
		code01Rub: 21000,
		code02Rub: 85000,
		totalRub: 106000,
		refund13Rub: 13780,
		status: "ISSUED",
		receiptsCount: 2,
		rawParams: {
			certificateNumber: "104",
			issueDateIso: "2025-03-15T10:30:00Z",
			taxYear: 2025,
			taxOfficeCode: "7701",
			clinic: {
				legalName: "ООО «ДЕНТЕ КЛИНИК»",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
			},
			payer: {
				fullName: "Иванов Иван Иванович",
				inn: "772819283746",
				birthDate: "12.04.1982",
				relationship: "patient",
			},
			patient: {
				fullName: "Иванов Иван Иванович",
				inn: "772819283746",
				birthDate: "12.04.1982",
			},
			payments: [
				{
					id: "p1",
					dateIso: "2025-03-15T10:30:00Z",
					receiptNumber: "ЧЕК-104-1",
					fiscalDocumentNumber: "10401",
					fiscalSign: "389210921",
					serviceName: "Терапевтическое лечение зубов (Код 01)",
					amountRub: 21000,
					taxCode: "1",
				},
				{
					id: "p2",
					dateIso: "2025-03-15T10:35:00Z",
					receiptNumber: "ЧЕК-104-2",
					fiscalDocumentNumber: "10402",
					fiscalSign: "389210922",
					serviceName: "Дентальная имплантация (Код 02)",
					amountRub: 85000,
					taxCode: "2",
				},
			],
		},
	},
	{
		id: "tax-reg-2",
		certificateNumber: "105",
		issueDateIso: "2025-04-18T14:15:00Z",
		taxYear: 2025,
		patientName: "Иванова Мария Ивановна",
		patientInn: "",
		taxpayerName: "Иванов Иван Иванович",
		taxpayerInn: "772819283746",
		relationshipRu: "Отец за ребенка",
		relationshipCode: "4",
		code01Rub: 14500,
		code02Rub: 0,
		totalRub: 14500,
		refund13Rub: 1885,
		status: "SENT_TO_FNS",
		receiptsCount: 1,
		rawParams: {
			certificateNumber: "105",
			issueDateIso: "2025-04-18T14:15:00Z",
			taxYear: 2025,
			taxOfficeCode: "7701",
			clinic: {
				legalName: "ООО «ДЕНТЕ КЛИНИК»",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
			},
			payer: {
				fullName: "Иванов Иван Иванович",
				inn: "772819283746",
				birthDate: "12.04.1982",
				relationship: "child",
			},
			patient: {
				fullName: "Иванова Мария Ивановна",
				inn: "",
				birthDate: "15.08.2014",
			},
			payments: [
				{
					id: "p3",
					dateIso: "2025-04-18T14:15:00Z",
					receiptNumber: "ЧЕК-105-1",
					fiscalDocumentNumber: "10501",
					fiscalSign: "389210931",
					serviceName: "Детская терапевтическая стоматология (Код 01)",
					amountRub: 14500,
					taxCode: "1",
				},
			],
		},
	},
	{
		id: "tax-reg-3",
		certificateNumber: "106",
		issueDateIso: "2025-06-02T11:45:00Z",
		taxYear: 2025,
		patientName: "Иванова Анна Петровна",
		patientInn: "772345678901",
		taxpayerName: "Иванов Иван Иванович",
		taxpayerInn: "772819283746",
		relationshipRu: "Супруг за супругу",
		relationshipCode: "2",
		code01Rub: 42000,
		code02Rub: 120000,
		totalRub: 162000,
		refund13Rub: 21060,
		status: "ISSUED",
		receiptsCount: 2,
		rawParams: {
			certificateNumber: "106",
			issueDateIso: "2025-06-02T11:45:00Z",
			taxYear: 2025,
			taxOfficeCode: "7701",
			clinic: {
				legalName: "ООО «ДЕНТЕ КЛИНИК»",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
			},
			payer: {
				fullName: "Иванов Иван Иванович",
				inn: "772819283746",
				birthDate: "12.04.1982",
				relationship: "spouse",
			},
			patient: {
				fullName: "Иванова Анна Петровна",
				inn: "772345678901",
				birthDate: "24.11.1985",
			},
			payments: [
				{
					id: "p4",
					dateIso: "2025-06-02T11:45:00Z",
					receiptNumber: "ЧЕК-106-1",
					fiscalDocumentNumber: "10601",
					fiscalSign: "389210941",
					serviceName: "Ортопедическое лечение (Код 01)",
					amountRub: 42000,
					taxCode: "1",
				},
				{
					id: "p5",
					dateIso: "2025-06-02T11:50:00Z",
					receiptNumber: "ЧЕК-106-2",
					fiscalDocumentNumber: "10602",
					fiscalSign: "389210942",
					serviceName: "Сложное хирургическое лечение (Код 02)",
					amountRub: 120000,
					taxCode: "2",
				},
			],
		},
	},
	{
		id: "tax-reg-4",
		certificateNumber: "107",
		issueDateIso: "2024-11-20T09:00:00Z",
		taxYear: 2024,
		patientName: "Кузнецов Дмитрий Владимирович",
		patientInn: "771982736451",
		taxpayerName: "Кузнецов Дмитрий Владимирович",
		taxpayerInn: "771982736451",
		relationshipRu: "Пациент (лично)",
		relationshipCode: "1",
		code01Rub: 56000,
		code02Rub: 0,
		totalRub: 56000,
		refund13Rub: 7280,
		status: "SENT_TO_FNS",
		receiptsCount: 1,
		rawParams: {
			certificateNumber: "107",
			issueDateIso: "2024-11-20T09:00:00Z",
			taxYear: 2024,
			taxOfficeCode: "7701",
			clinic: {
				legalName: "ООО «ДЕНТЕ КЛИНИК»",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
			},
			payer: {
				fullName: "Кузнецов Дмитрий Владимирович",
				inn: "771982736451",
				birthDate: "03.07.1979",
				relationship: "patient",
			},
			patient: {
				fullName: "Кузнецов Дмитрий Владимирович",
				inn: "771982736451",
				birthDate: "03.07.1979",
			},
			payments: [
				{
					id: "p6",
					dateIso: "2024-11-20T09:00:00Z",
					receiptNumber: "ЧЕК-107-1",
					fiscalDocumentNumber: "10701",
					fiscalSign: "389210951",
					serviceName: "Эндодонтическое и восстановительное лечение (Код 01)",
					amountRub: 56000,
					taxCode: "1",
				},
			],
		},
	},
	{
		id: "tax-reg-5",
		certificateNumber: "108",
		issueDateIso: "2025-09-12T16:20:00Z",
		taxYear: 2025,
		patientName: "Петров Алексей Сергеевич",
		patientInn: "770483920194",
		taxpayerName: "Петров Сергей Николаевич",
		taxpayerInn: "770412345678",
		relationshipRu: "Родитель за совершеннолетнего учащегося",
		relationshipCode: "3",
		code01Rub: 8000,
		code02Rub: 0,
		totalRub: 8000,
		refund13Rub: 1040,
		status: "DRAFT",
		receiptsCount: 1,
		rawParams: {
			certificateNumber: "108",
			issueDateIso: "2025-09-12T16:20:00Z",
			taxYear: 2025,
			taxOfficeCode: "7701",
			clinic: {
				legalName: "ООО «ДЕНТЕ КЛИНИК»",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
			},
			payer: {
				fullName: "Петров Сергей Николаевич",
				inn: "770412345678",
				birthDate: "18.01.1975",
				relationship: "parent",
			},
			patient: {
				fullName: "Петров Алексей Сергеевич",
				inn: "770483920194",
				birthDate: "09.09.2003",
			},
			payments: [
				{
					id: "p7",
					dateIso: "2025-09-12T16:20:00Z",
					receiptNumber: "ЧЕК-108-1",
					fiscalDocumentNumber: "10801",
					fiscalSign: "389210961",
					serviceName: "Профессиональная гигиена полости рта (Код 01)",
					amountRub: 8000,
					taxCode: "1",
				},
			],
		},
	},
];
