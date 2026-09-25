import { normalizeSnils } from "../../utils/snils.js";

/**
 * DEFECT #58: RU specialty label for CDA assignedAuthor (mirrors diary #41).
 * users.specialties jsonb string[]; prefer non-universal codes.
 */
export const EGISZ_DENTAL_SPECIALTY_LABELS: Record<string, string> = {
	therapist: "врач-стоматолог-терапевт",
	orthopedist: "врач-стоматолог-ортопед",
	surgeon: "врач-стоматолог-хирург",
	orthodontist: "врач-ортодонт",
	periodontist: "врач-стоматолог-пародонтолог",
	hygienist: "гигиенист стоматологический",
	pediatric: "врач-стоматолог детский",
	implantologist: "врач-стоматолог-хирург (имплантология)",
	radiologist: "врач-рентгенолог",
	universal: "врач-стоматолог",
};

export const EGISZ_DENTAL_SPECIALTY_NSI_CODES: Record<string, string> = {
	therapist: "18",
	orthopedist: "17",
	surgeon: "19",
	orthodontist: "93",
	periodontist: "18",
	hygienist: "281",
	pediatric: "16",
	implantologist: "19",
	radiologist: "118",
	universal: "15",
};

export function formatDoctorSpecialtyLabelForCda(raw: unknown): string | null {
	const codes: string[] = Array.isArray(raw)
		? raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
		: typeof raw === "string" && raw.trim()
			? [raw.trim()]
			: [];
	if (codes.length === 0) return null;
	const meaningful = codes.filter((c) => c !== "universal");
	const list = meaningful.length > 0 ? meaningful : codes;
	const labels = list.map((c) => EGISZ_DENTAL_SPECIALTY_LABELS[c] ?? c);
	const joined = labels.join(", ").trim();
	return joined.length > 0 ? joined : null;
}

export function formatDoctorSpecialtyNsiCodeForCda(raw: unknown): string | null {
	const codes: string[] = Array.isArray(raw)
		? raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
		: typeof raw === "string" && raw.trim()
			? [raw.trim()]
			: [];
	if (codes.length === 0) return null;
	const meaningful = codes.filter((c) => c !== "universal");
	const primary = meaningful[0] ?? codes[0];
	return primary ? (EGISZ_DENTAL_SPECIALTY_NSI_CODES[primary] ?? null) : null;
}

/** «Иванов Иван Иванович» → { last, first, middle }. */
export function splitFullName(fullName: string): {
	first: string;
	last: string;
	middle?: string;
} {
	const parts = fullName.trim().split(/\s+/);
	const middle = parts[2];
	return {
		last: parts[0] ?? "",
		first: parts[1] ?? "",
		...(middle ? { middle } : {}),
	};
}

export function readSnilsFromProfile(profile: unknown): string {
	if (profile && typeof profile === "object" && "snils" in profile) {
		const value = (profile as { snils?: unknown }).snils;
		if (typeof value === "string") return normalizeSnils(value);
	}
	return "";
}

export function readGenderFromProfile(
	profile: unknown,
): "male" | "female" | "other" | null {
	if (profile && typeof profile === "object" && "gender" in profile) {
		const value = (profile as { gender?: unknown }).gender;
		if (value === "male" || value === "female" || value === "other")
			return value;
	}
	return null;
}

/**
 * Достаёт код МКБ-10 из текста диагноза («K02.1 Кариес дентина» → «K02.1»).
 */
export function extractIcd10(diagnosis: string): string {
	const trimmed = diagnosis.trim();
	if (!trimmed) return "";
	const match = trimmed.match(/\b([A-TV-Za-tv-z]\d{2}(?:\.\d{1,4})?)\b/);
	return match?.[1] ? match[1].toUpperCase() : "";
}

export interface EgiszGatewayConfig {
	baseUrl: string | null;
	guid: string | null;
	lpuId: string | null;
	frmoId: string | null;
	clinicOid: string | null;
}

export function readGatewayConfig(): EgiszGatewayConfig {
	const pick = (name: string) => {
		const raw = process.env[name];
		return raw && raw.trim().length > 0 ? raw.trim() : null;
	};
	return {
		baseUrl: pick("EGISZ_N3_BASE_URL"),
		guid: pick("EGISZ_N3_GUID"),
		lpuId: pick("EGISZ_N3_LPU_ID"),
		frmoId: pick("EGISZ_FRMO_ID"),
		clinicOid: pick("EGISZ_CLINIC_OID"),
	};
}
