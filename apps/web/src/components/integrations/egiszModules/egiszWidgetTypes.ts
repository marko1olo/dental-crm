import type { EgiszEndpointOutcome, EgiszTone } from "../egiszAvailability";

export type DoctorSpecialtyCode =
	| "therapist"
	| "orthopedist"
	| "surgeon"
	| "orthodontist"
	| "periodontist"
	| "hygienist"
	| "pediatric"
	| "chief";

export interface DoctorSpecialtyMeta {
	readonly code: DoctorSpecialtyCode;
	readonly title: string;
	readonly defaultAllowedForms: readonly string[];
	readonly canSignDoctorUkep: boolean;
	readonly canSignClinicUkep: boolean;
}

export const DOCTOR_SPECIALTIES_REGISTRY: readonly DoctorSpecialtyMeta[] = [
	{
		code: "therapist",
		title: "Стоматолог-терапевт",
		defaultAllowedForms: ["043/у", "СЭМД-101", "СЭМД-108", "ИДС"],
		canSignDoctorUkep: true,
		canSignClinicUkep: false,
	},
	{
		code: "surgeon",
		title: "Стоматолог-хирург",
		defaultAllowedForms: ["043/у", "СЭМД-101", "СЭМД-108", "СЭМД-103", "ИДС"],
		canSignDoctorUkep: true,
		canSignClinicUkep: false,
	},
	{
		code: "orthopedist",
		title: "Стоматолог-ортопед",
		defaultAllowedForms: ["043/у", "СЭМД-101", "СЭМД-108", "ИДС"],
		canSignDoctorUkep: true,
		canSignClinicUkep: false,
	},
	{
		code: "orthodontist",
		title: "Врач-ортодонт",
		defaultAllowedForms: ["043/у", "СЭМД-101", "СЭМД-108", "СЭМД-103", "ИДС"],
		canSignDoctorUkep: true,
		canSignClinicUkep: false,
	},
	{
		code: "chief",
		title: "Главный врач клиники",
		defaultAllowedForms: ["043/у", "СЭМД-101", "СЭМД-108", "СЭМД-103", "ИДС", "Справка 1151156"],
		canSignDoctorUkep: true,
		canSignClinicUkep: true,
	},
] as const;

export interface EgiszPermissionItem {
	id: string;
	formCode: string;
	fieldName: string;
	isExportAllowed: boolean;
	patientOptOutRespect: boolean;
	requiredStaffRole?: string;
}

export interface EgiszAuditLogItem {
	id: string;
	timestamp: string;
	formTitle: string;
	patientName: string;
	doctorName: string;
	status: "Registered" | "Pending" | "Error" | "Sent";
	regNumber?: string;
	flkError?: string;
}

export const TONE_STYLES: Record<
	EgiszTone,
	{ readonly headline: string; readonly icon: string }
> = {
	neutral: {
		headline: "text-[var(--ink,#0f172a)]",
		icon: "text-[var(--muted,#64748b)]",
	},
	info: { headline: "text-[var(--ink,#0f172a)]", icon: "text-[var(--teal,#0d9488)]" },
	warning: {
		headline: "text-amber-800 dark:text-amber-300",
		icon: "text-amber-500",
	},
	danger: {
		headline: "text-rose-800 dark:text-rose-300",
		icon: "text-rose-500",
	},
	success: {
		headline: "text-emerald-800 dark:text-emerald-300",
		icon: "text-emerald-500",
	},
};

export function cleanBlankLabel(
	rawCode: string,
	rawField: string,
): { title: string; subtitle: string } {
	const code = rawCode.trim();
	const field = rawField.trim();

	let title = code;
	if (code.includes("043-1") || field.toLowerCase().includes("ортодонт")) {
		title = "Медицинская карта ортодонтического пациента (043-1/у)";
	} else if (code.includes("043")) {
		title = "Медицинская карта стоматологического больного (043/у)";
	} else if (code.includes("025")) {
		title = "Медицинская карта амбулаторного пациента (025/у)";
	} else if (code.includes("101") || field.toLowerCase().includes("консультац")) {
		title = "Протокол консультации и осмотра";
	} else if (
		code.includes("108") ||
		field.includes("КЛКТ") ||
		field.toLowerCase().includes("исследован")
	) {
		title = "Протокол КЛКТ 3D и рентген-снимков";
	} else if (code.includes("ИДС") || field.toLowerCase().includes("согласие")) {
		title = "Информированное добровольное согласие (ИДС)";
	} else if (
		code.includes("1151156") ||
		field.toLowerCase().includes("налогов") ||
		field.toLowerCase().includes("справка")
	) {
		title = "Справка об оплате медицинских услуг для налогового вычета";
	}

	const subtitle = field.length > 0 ? field : "Анамнез, дневник приёма и зубная формула";
	return { title, subtitle };
}

/**
 * Разбор ответа сервера по правилам выгрузки бланков.
 */
export function readBlankPermissions(
	raw: unknown,
): EgiszEndpointOutcome<readonly EgiszPermissionItem[]> {
	if (!Array.isArray(raw)) return { kind: "unreadable" };
	const rows: EgiszPermissionItem[] = [];
	for (const entry of raw) {
		if (!entry || typeof entry !== "object") continue;
		const row = entry as Record<string, unknown>;
		if (
			typeof row.id !== "string" ||
			typeof row.formCode !== "string" ||
			typeof row.fieldName !== "string"
		) {
			continue;
		}
		rows.push({
			id: row.id,
			formCode: row.formCode.trim(),
			fieldName: row.fieldName.trim(),
			isExportAllowed: row.isExportAllowed === true,
			patientOptOutRespect: row.patientOptOutRespect === true,
			requiredStaffRole:
				typeof row.requiredStaffRole === "string" &&
				row.requiredStaffRole.trim().length > 0
					? row.requiredStaffRole
					: "Врач-стоматолог / Главный врач",
		});
	}
	if (rows.length === 0 && raw.length > 0) return { kind: "unreadable" };
	return { kind: "ok", data: rows };
}
