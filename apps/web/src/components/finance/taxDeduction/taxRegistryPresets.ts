import type { TaxDeductionCertificateParams } from "../taxDeductionEngine";

export type TaxCertificateStatus = "ISSUED" | "SENT_TO_FNS" | "DRAFT";

export interface TaxCertificateRegistryItem {
	readonly id: string;
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly taxYear: number;
	readonly patientName: string;
	readonly patientInn?: string;
	readonly taxpayerName: string;
	readonly taxpayerInn?: string;
	readonly relationshipRu: string;
	readonly relationshipCode: "1" | "2" | "3" | "4";
	readonly code01Rub: number;
	readonly code02Rub: number;
	readonly totalRub: number;
	readonly refund13Rub: number;
	readonly status: TaxCertificateStatus;
	readonly receiptsCount: number;
	readonly rawParams?: TaxDeductionCertificateParams;
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
		receiptsCount: 3,
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
		receiptsCount: 2,
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
		receiptsCount: 4,
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
		receiptsCount: 5,
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
	},
];
