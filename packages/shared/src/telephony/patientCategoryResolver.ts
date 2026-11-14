import type {
	PatientLastVisitSummary,
	TelephonyPatientCategory,
} from "./types.js";
import type {
	TelephonyPatientInsightLike,
	TelephonyPatientLike,
} from "./resolverTypes.js";

export interface TelephonyVipCheckablePatient extends TelephonyPatientLike {
	isVip?: boolean | null | undefined;
	category?: string | null | undefined;
	loyaltyTier?: string | null | undefined;
	tags?: readonly string[] | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		insurancePolicyNumber?: string | null | undefined;
		loyaltyTier?: string | null | undefined;
	} | null | undefined;
}

/**
 * Resolves patient category ("VIP" | "Постоянный" | "Первичный")
 */
export function resolvePatientCategory(
	patient: TelephonyVipCheckablePatient | TelephonyPatientLike | null | undefined,
	lastVisitSummary?: PatientLastVisitSummary | null | undefined,
	insight?: TelephonyPatientInsightLike | null | undefined,
): TelephonyPatientCategory {
	if (!patient) return "Первичный";

	const p = patient as TelephonyVipCheckablePatient;
	if (p.isVip === true || p.category === "VIP") return "VIP";
	if (p.administrativeProfile?.loyaltyTier === "vip" || p.loyaltyTier === "vip") return "VIP";
	if (Array.isArray(p.tags) && p.tags.some((t: unknown) => typeof t === "string" && t.trim().toLowerCase() === "vip")) {
		return "VIP";
	}
	if (patient.notes && /(^|[^a-zA-Zа-яА-ЯёЁ0-9])(vip|вип)($|[^a-zA-Zа-яА-ЯёЁ0-9])/iu.test(patient.notes)) return "VIP";
	if (insight?.clinicalFlags?.some((f) => /(^|[^a-zA-Zа-яА-ЯёЁ0-9])(vip|вип)($|[^a-zA-Zа-яА-ЯёЁ0-9])/iu.test(f))) return "VIP";
	if (insight?.riskReasons?.some((r) => /(^|[^a-zA-Zа-яА-ЯёЁ0-9])(vip|вип)($|[^a-zA-Zа-яА-ЯёЁ0-9])/iu.test(r))) return "VIP";

	if (lastVisitSummary) {
		if (lastVisitSummary.isNewPatient || !lastVisitSummary.lastVisitDate) return "Первичный";
		return "Постоянный";
	}

	if (patient.notes && /первичн/iu.test(patient.notes)) return "Первичный";
	return "Постоянный";
}
