import type { Appointment, AppointmentLabStatusInfo } from "@dental/shared";
import type { ClinicalBadgeItem, PatientBadgeData } from "./types";
import { resolveBadgesPart1 } from "./clinicalBadgeRulesPart1";
import { resolveBadgesPart2 } from "./clinicalBadgeRulesPart2";
import { resolveBadgesPart3 } from "./clinicalBadgeRulesPart3";

/**
 * Resolves canonical DENTE clinical badges (schi-1 .. schi-17).
 */
export function resolveAppointmentClinicalBadges(
	appointment?: Appointment | null,
	patient?: PatientBadgeData | null,
	balance?: number | null,
	allergyAlert?: string | null,
	explicitLabOrder?: AppointmentLabStatusInfo | Record<string, unknown> | null,
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
