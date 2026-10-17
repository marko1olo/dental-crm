import type { Appointment } from "@dental/shared";
import type { ClinicalBadgeItem } from "./types";
import { resolveBadgesPart1 } from "./clinicalBadgeRulesPart1";
import { resolveBadgesPart2 } from "./clinicalBadgeRulesPart2";
import { resolveBadgesPart3 } from "./clinicalBadgeRulesPart3";

/**
 * Resolves canonical clinical badges from DentalPRO expo26 (schi-1 .. schi-17).
 */
export function resolveAppointmentClinicalBadges(
	appointment?: Appointment | null,
	// biome-ignore lint/suspicious/noExplicitAny: patient payload
	patient?: any,
	balance?: number | null,
	allergyAlert?: string | null,
	// biome-ignore lint/suspicious/noExplicitAny: lab order payload
	explicitLabOrder?: any,
): ClinicalBadgeItem[] {
	if (!appointment) return [];
	const part1 = resolveBadgesPart1(
		appointment,
		patient,
		balance,
		allergyAlert,
		explicitLabOrder,
	);
	const part2 = resolveBadgesPart2(appointment, patient);
	const part3 = resolveBadgesPart3(appointment, patient);
	return [...part1, ...part2, ...part3];
}
