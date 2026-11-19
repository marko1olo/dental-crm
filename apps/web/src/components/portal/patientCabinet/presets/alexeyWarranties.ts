import type { PatientWarrantyCard } from "../patientCabinetEngine";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";

const DEMO_ALEXEY_WARRANTIES: readonly PatientWarrantyCard[] = [
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
		verificationUrl: "https://dente-clinic.ru/portal/warranty?cert=WAR-2026-8842-01&card=К-8842",
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
		verificationUrl: "https://dente-clinic.ru/portal/warranty?cert=WAR-2026-8842-02&card=К-8842",
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

export const ALEXEY_WARRANTIES: readonly PatientWarrantyCard[] = isDemoShowcaseMode()
	? DEMO_ALEXEY_WARRANTIES
	: [];

export async function fetchPatientWarranties(patientId: string): Promise<PatientWarrantyCard[]> {
	if (!patientId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
		return [];
	}
	try {
		const res = await fetch(`/api/warranty/patient/${patientId}`);
		if (!res.ok) return [];
		const json = (await res.json()) as { success?: boolean; certificates?: Array<Record<string, unknown>> };
		if (!json?.certificates || !Array.isArray(json.certificates)) return [];
		return json.certificates.map((c) => {
			const issueDateIso = c.issuedAt ? String(c.issuedAt).slice(0, 10) : new Date().toISOString().slice(0, 10);
			const expirationDateIso = c.expiresAt ? String(c.expiresAt).slice(0, 10) : issueDateIso;
			const nextCheckupDueDateIso = c.nextRecallDate ? String(c.nextRecallDate).slice(0, 10) : issueDateIso;
			const rawStatus = String(c.status || "active");
			const status: "active" | "at_risk" | "expired" =
				rawStatus === "expired" || rawStatus === "voided"
					? "expired"
					: rawStatus === "at_risk" || rawStatus === "conditional"
						? "at_risk"
						: "active";

			return {
				certificateId: (c.certificateNumber as string) || (c.id as string) || "WAR-001",
				issueDateIso,
				expirationDateIso,
				adjustedWarrantyMonths: Number(c.warrantyMonths || 12),
				doctorName:
					typeof c.notes === "string" && c.notes.includes("Врач:")
						? c.notes.split("Врач:")[1]?.split(".")[0]?.trim() || "Лечащий врач"
						: "Лечащий врач",
				status,
				nextCheckupDueDateIso,
				checkupIntervalMonths: 6,
				checkupScheduleCount: 4,
				verificationUrl: `https://dente-clinic.ru/portal/warranty?cert=${c.certificateNumber || c.id}`,
				items: Array.isArray(c.itemsJson)
					? (c.itemsJson as Array<Record<string, unknown>>).map((it) => ({
							toothFdi: (it.toothNumber as string) || "—",
							workTitleRu: (it.clinicalWorkTitle as string) || (it.workTitle as string) || "Стоматологическая работа",
							materialName: (it.materialName as string) || "Стоматологический материал",
							manufacturer: (it.manufacturer as string) || "Сертифицированный производитель",
							lotNumber: (it.lotNumber as string) || undefined,
						}))
					: [],
			};
		});
	} catch {
		return [];
	}
}
