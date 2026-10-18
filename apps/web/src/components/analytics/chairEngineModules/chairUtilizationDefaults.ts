import type { ChairDefinition } from "./chairUtilizationTypes";

export const DEFAULT_CLINIC_CHAIRS: readonly ChairDefinition[] = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		cabinet: "Кабинет №1",
		workingHoursPerDay: 12,
		sanitationMinutesPerVisit: 15,
		isActive: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Ортопедия)",
		cabinet: "Кабинет №2",
		workingHoursPerDay: 12,
		sanitationMinutesPerVisit: 15,
		isActive: true,
	},
	{
		id: "chair-surg",
		name: "Хирургический кабинет",
		cabinet: "Операционная",
		workingHoursPerDay: 12,
		sanitationMinutesPerVisit: 20,
		isActive: true,
	},
];

export function getAppointmentDurationMinutes(startsAt: string | Date, endsAt: string | Date): number {
	const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
	const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;

	const startMs = start.getTime();
	const endMs = end.getTime();

	if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
		return 30;
	}

	const diffMinutes = Math.round((endMs - startMs) / (1000 * 60));
	return Math.max(5, Math.min(720, diffMinutes));
}
