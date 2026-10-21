import type { Appointment } from "@dental/shared";
import { isAppointmentFinalizedOrPast, isUnexcusedNoShow } from "./patientReliabilityHistory";

/**
 * Computes the streak of consecutive trailing no-shows and the max historical streak.
 */
export function calculateConsecutiveNoShows(
	appointments: readonly Appointment[],
	patientId: string,
	referenceTimeIso?: string,
): { currentStreak: number; maxStreak: number } {
	const refMs = referenceTimeIso ? Date.parse(referenceTimeIso) : Date.now();

	const relevant = appointments
		.filter((a) => a.patientId === patientId && isAppointmentFinalizedOrPast(a, refMs))
		.sort((a, b) => {
			const timeA = a.startsAt ? Date.parse(a.startsAt) : 0;
			const timeB = b.startsAt ? Date.parse(b.startsAt) : 0;
			return timeA - timeB;
		});

	if (relevant.length === 0) return { currentStreak: 0, maxStreak: 0 };

	let currentStreak = 0;
	for (let i = relevant.length - 1; i >= 0; i--) {
		const appt = relevant[i];
		if (!appt) continue;
		if (isUnexcusedNoShow(appt)) {
			currentStreak++;
		} else if (appt.status === "completed" || appt.status === "arrived" || appt.status === "in_treatment") {
			break;
		}
	}

	let maxStreak = 0;
	let tempStreak = 0;
	for (const appt of relevant) {
		if (isUnexcusedNoShow(appt)) {
			tempStreak++;
			if (tempStreak > maxStreak) maxStreak = tempStreak;
		} else if (appt.status === "completed" || appt.status === "arrived" || appt.status === "in_treatment") {
			tempStreak = 0;
		}
	}

	return { currentStreak, maxStreak };
}

/**
 * Checks if the patient has a streak of consecutive unexcused no-shows meeting or exceeding threshold.
 */
export function hasConsecutiveNoShows(
	appointments: readonly Appointment[],
	patientId: string,
	threshold: number = 2,
	referenceTimeIso?: string,
): boolean {
	const { currentStreak, maxStreak } = calculateConsecutiveNoShows(appointments, patientId, referenceTimeIso);
	return currentStreak >= threshold || maxStreak >= threshold;
}
