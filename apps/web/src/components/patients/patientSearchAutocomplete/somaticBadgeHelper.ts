import type { Patient } from "@dental/shared";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "../safetyMath";
import type { SomaticBadgeInfo } from "./types";

function extractPatientAllergies(p: Patient): string | null {
	if ("allergies" in p && typeof (p as { allergies?: unknown }).allergies === "string") {
		return (p as { allergies: string }).allergies;
	}
	return null;
}

function extractClinicalSafetyProfile(p: Patient): Record<string, unknown> | null {
	if (p.administrativeProfile?.clinicalSafetyProfile && typeof p.administrativeProfile.clinicalSafetyProfile === "object") {
		return p.administrativeProfile.clinicalSafetyProfile as Record<string, unknown>;
	}
	if (
		"clinicalSafetyProfile" in p &&
		typeof (p as { clinicalSafetyProfile?: unknown }).clinicalSafetyProfile === "object" &&
		(p as { clinicalSafetyProfile?: unknown }).clinicalSafetyProfile !== null
	) {
		return (p as { clinicalSafetyProfile: Record<string, unknown> }).clinicalSafetyProfile;
	}
	return null;
}

export function getSomaticBadge(p: Patient): SomaticBadgeInfo | null {
	const raw = extractPatientAllergies(p);
	if (raw && raw.trim() && !isNegativeAllergyStatement(raw)) {
		return { label: raw.trim(), isCritical: true };
	}
	const profile = extractClinicalSafetyProfile(p);
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
