import type {
	PatientLastVisitSummary,
	TelephonyPatientCategory,
} from "./types.js";
import type {
	TelephonyPatientInsightLike,
	TelephonyPatientLike,
} from "./resolverTypes.js";

/**
 * Resolves patient category ("VIP" | "Постоянный" | "Первичный")
 */
export function resolvePatientCategory(
	patient: TelephonyPatientLike | null | undefined,
	lastVisitSummary?: PatientLastVisitSummary | null | undefined,
	insight?: TelephonyPatientInsightLike | null | undefined,
): TelephonyPatientCategory {
	if (!patient) return "Первичный";

	const anyPatient = patient as any;
	if (anyPatient.isVip === true || anyPatient.category === "VIP") return "VIP";
	if (anyPatient.administrativeProfile?.loyaltyTier === "vip" || anyPatient.loyaltyTier === "vip") return "VIP";
	if (Array.isArray(anyPatient.tags) && anyPatient.tags.some((t: unknown) => typeof t === "string" && t.trim().toLowerCase() === "vip")) {
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
