import type { Patient } from "@dental/shared";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "../safetyMath";
import type { SomaticBadgeInfo } from "./types";

export function getSomaticBadge(p: Patient): SomaticBadgeInfo | null {
	const raw = (p as any).allergies;
	if (raw && typeof raw === "string" && raw.trim() && !isNegativeAllergyStatement(raw)) {
		return { label: raw.trim(), isCritical: true };
	}
	const profile = (p as any).clinicalSafetyProfile;
	if (profile) {
		const evaluated = evaluatePatientSafetyFlags(profile);
		const first = evaluated.activeFlags[0];
		if (evaluated.hasCriticalStopFlags && first) {
			return { label: first.shortBadge, isCritical: true };
		}
		if (evaluated.hasHighRiskFlags && first) {
			return { label: first.shortBadge, isCritical: false };
		}
	}
	return null;
}
