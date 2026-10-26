import type { VisitCriticalBadge } from "../visitCriticalBadges";

export const ALLERGY_BADGE_IDS = new Set(["allergy", "lidocaine", "articaine", "penicillin"]);

export const SOMATIC_BADGE_IDS = new Set([
	"hypertension",
	"pacemaker",
	"asthma",
	"anticoagulant",
	"diabetes",
	"pregnancy",
	"bisphosphonates",
]);

export interface PatientAllergyData {
	allergies?: string | readonly string[] | null | undefined;
}

/**
 * Формирует суверенный текст плашки аллергии: ТОЛЬКО реальные аллергены.
 * Категорически запрещено добавлять соматические патологии (АГ, ССЗ, ЭКС, СД).
 */
export function buildConsolidatedAllergyChip(
	activePatient?: PatientAllergyData | null,
	activePatientCriticalBadges?: readonly VisitCriticalBadge[] | null,
): string | null {
	const rawAllergies = activePatient?.allergies;
	const allergyStr = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies || "");
	const parts: string[] = [];

	if (
		allergyStr.trim() &&
		!allergyStr.toLowerCase().includes("не выявлен") &&
		!allergyStr.toLowerCase().includes("нет аллерг")
	) {
		const cleaned = allergyStr
			.trim()
			.replace(/^аллерги[яи][: \t-]*/i, "")
			.replace(/^на\s+/i, "")
			.replace(/\s*\([^)]*\)/g, "")
			.trim();
		if (cleaned) parts.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
	}

	if (activePatientCriticalBadges) {
		for (const b of activePatientCriticalBadges) {
			if (b.id !== "allergy" && ALLERGY_BADGE_IDS.has(b.id)) {
				const short = b.shortLabel ? b.shortLabel.replace(/[\u26a0\ufe0f!]/gu, "").trim() : "";
				if (short && !parts.some((p) => p.toLowerCase().includes(short.toLowerCase()))) {
					const formatted = short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
					parts.push(formatted);
				}
			}
		}
	}

	if (parts.length === 0) {
		const hasAllergyBadge = activePatientCriticalBadges?.some((b) => ALLERGY_BADGE_IDS.has(b.id));
		if (hasAllergyBadge) return "Аллергия: Отягощен";
		return null;
	}

	return `Аллергия: ${parts.join(", ")}`;
}

/**
 * Формирует суверенный текст плашки соматического риска (АГ, ССЗ, ЭКС, СД, Астма и др.).
 */
export function buildConsolidatedSomaticChip(
	activePatientCriticalBadges?: readonly VisitCriticalBadge[] | null,
): string | null {
	if (!activePatientCriticalBadges || activePatientCriticalBadges.length === 0) return null;

	const parts: string[] = [];
	for (const b of activePatientCriticalBadges) {
		if (SOMATIC_BADGE_IDS.has(b.id)) {
			const short = b.shortLabel ? b.shortLabel.replace(/[\u26a0\ufe0f!]/gu, "").trim() : "";
			if (short && !parts.some((p) => p.toLowerCase().includes(short.toLowerCase()))) {
				let formatted = short;
				if (/^(АГ|ССЗ|ЭКС|СД)/i.test(short)) {
					formatted = short.toUpperCase();
				} else if (/^астма/i.test(short)) {
					formatted = "Астма";
				} else if (/^антикоаг/i.test(short)) {
					formatted = "Антикоаг.";
				} else if (/^беремен/i.test(short)) {
					formatted = "Беременность";
				} else if (/^бисфосф/i.test(short)) {
					formatted = "Бисфосф.";
				} else {
					formatted = short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
				}
				parts.push(formatted);
			}
		}
	}

	if (parts.length === 0) return null;
	return `Риск: ${parts.join(", ")}`;
}
