import type { PatientWarrantyCard } from "../patientCabinetEngine";

export const ALEXEY_WARRANTIES: readonly PatientWarrantyCard[] = [
	{
		certificateId: "WAR-2026-8842-01",
		issueDateIso: "2026-06-25",
		expirationDateIso: "2031-06-25",
		adjustedWarrantyMonths: 60,
		doctorName: "Д-р Смирнов А. В.",
		status: "active",
		nextCheckupDueDateIso: "2026-10-05",
		checkupIntervalMonths: 6,
		checkupScheduleCount: 10,
		verificationUrl: "https://dente-clinic.ru/portal/warranty?cert=WAR-2026-8842-01&card=043-8842",
		items: [
			{
				toothFdi: "1.6",
				workTitleRu: "Дентальный имплантат Osstem TS III SA с формирователем десны",
				materialName: "Титан Grade 4 (Osstem Implant)",
				manufacturer: "Osstem Implant Co., Ltd (Южная Корея)",
				lotNumber: "LOT #OSS-883419",
			},
			{
				toothFdi: "2.6",
				workTitleRu: "Дентальный имплантат Osstem TS III SA с формирователем десны",
				materialName: "Титан Grade 4 (Osstem Implant)",
				manufacturer: "Osstem Implant Co., Ltd (Южная Корея)",
				lotNumber: "LOT #OSS-883420",
			},
		],
	},
	{
		certificateId: "WAR-2026-8842-02",
		issueDateIso: "2026-08-10",
		expirationDateIso: "2028-08-10",
		adjustedWarrantyMonths: 24,
		doctorName: "Д-р Смирнов А. В.",
		status: "active",
		nextCheckupDueDateIso: "2026-10-05",
		checkupIntervalMonths: 6,
		checkupScheduleCount: 4,
		verificationUrl: "https://dente-clinic.ru/portal/warranty?cert=WAR-2026-8842-02&card=043-8842",
		items: [
			{
				toothFdi: "1.1, 1.2, 2.1, 2.2",
				workTitleRu: "Керамические виниры IPS e.max Press",
				materialName: "Дисиликат лития IPS e.max",
				manufacturer: "Ivoclar Vivadent (Лихтенштейн)",
				vitaShade: "A1",
				lotNumber: "LOT #EMX-4410",
			},
			{
				toothFdi: "1.6",
				workTitleRu: "Коронка из диоксида циркония Katana ML на имплантат",
				materialName: "Высокотранслюцентный диоксид циркония Katana",
				manufacturer: "Kuraray Noritake Dental (Япония)",
				vitaShade: "A2",
				lotNumber: "LOT #KTN-9912",
			},
		],
	},
];
