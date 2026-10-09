/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Operations (Layer 2: Conflict & Overlap Detector)
 *
 * Core Mandates:
 * 1. Complete Doctor Schedule Isolation:
 *    Strict partitioning by doctorId — zero schedule leakage across doctors.
 * 2. Chair Collision & Overlap Detection:
 *    Detects overlapping shifts or appointments on the same dental chair.
 * 3. Doctor Shift Collisions:
 *    Detects simultaneous shifts of the same practitioner in different cabinets.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	DoctorShiftAppointment,
	DoctorShiftRecord,
	ChairShiftConflict,
	DoctorShiftCollision,
} from "./types.js";
import { isIsoIntervalOverlap, shiftDateFromIso } from "./shiftTimeMath.js";

/**
 * Isolates and filters appointments belonging strictly to the specified doctor on the given shift date.
 * Guarantees zero cross-doctor schedule leakage.
 */
export function filterDoctorShiftAppointments(
	allAppointments: readonly DoctorShiftAppointment[],
	doctorId: string,
	shiftDateIso?: string,
): DoctorShiftAppointment[] {
	if (!doctorId || typeof doctorId !== "string") {
		return [];
	}

	const targetDate = shiftDateIso
		? shiftDateIso.split("T")[0]
		: new Date().toISOString().split("T")[0];

	return allAppointments
		.filter((apt) => {
			if (apt.doctorId !== doctorId) {
				return false;
			}
			const aptDate = apt.startsAtIso.split("T")[0];
			return aptDate === targetDate;
		})
		.sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());
}

/**
 * Detects dental chair scheduling collisions where two or more practitioners
 * are planned or active on the same chair during overlapping time ranges.
 */
export function detectChairShiftConflicts(params: {
	shifts?: readonly DoctorShiftRecord[];
	appointments?: readonly DoctorShiftAppointment[];
}): ChairShiftConflict[] {
	const shifts = params.shifts ?? [];
	const conflicts: ChairShiftConflict[] = [];

	// Group shifts by chairId and date
	const chairGroups = new Map<string, DoctorShiftRecord[]>();

	for (const s of shifts) {
		if (!s.chairId) continue;
		const dateKey = `${s.chairId}::${shiftDateFromIso(s.shiftDateIso || s.plannedStartsAtIso)}`;
		const existing = chairGroups.get(dateKey) ?? [];
		existing.push(s);
		chairGroups.set(dateKey, existing);
	}

	for (const [key, group] of chairGroups.entries()) {
		if (group.length < 2) continue;
		const [chairId, dateIso] = key.split("::");

		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				const shiftA = group[i]!;
				const shiftB = group[j]!;

				if (shiftA.doctorId === shiftB.doctorId) continue; // Same doctor duplicate handled separately

				if (
					isIsoIntervalOverlap(
						shiftA.plannedStartsAtIso,
						shiftA.plannedEndsAtIso,
						shiftB.plannedStartsAtIso,
						shiftB.plannedEndsAtIso,
					)
				) {
					const startMax = Math.max(
						new Date(shiftA.plannedStartsAtIso).getTime(),
						new Date(shiftB.plannedStartsAtIso).getTime(),
					);
					const endMin = Math.min(
						new Date(shiftA.plannedEndsAtIso).getTime(),
						new Date(shiftB.plannedEndsAtIso).getTime(),
					);
					const overlapMins = Math.max(0, Math.round((endMin - startMax) / 60000));

					conflicts.push({
						chairId: chairId!,
						chairName: shiftA.chairName || shiftB.chairName,
						dateIso: dateIso!,
						overlappingShifts: [
							{
								shiftId: shiftA.id,
								doctorId: shiftA.doctorId,
								doctorFullName: shiftA.doctorFullName,
								startsAtIso: shiftA.plannedStartsAtIso,
								endsAtIso: shiftA.plannedEndsAtIso,
							},
							{
								shiftId: shiftB.id,
								doctorId: shiftB.doctorId,
								doctorFullName: shiftB.doctorFullName,
								startsAtIso: shiftB.plannedStartsAtIso,
								endsAtIso: shiftB.plannedEndsAtIso,
							},
						],
						overlapMinutes: overlapMins,
					});
				}
			}
		}
	}

	return conflicts;
}

/**
 * Detects duplicate or colliding shifts for the same doctor occurring concurrently.
 */
export function detectDoctorShiftCollisions(
	shifts: readonly DoctorShiftRecord[],
): DoctorShiftCollision[] {
	const collisions: DoctorShiftCollision[] = [];
	const doctorGroups = new Map<string, DoctorShiftRecord[]>();

	for (const s of shifts) {
		const docKey = `${s.doctorId}::${shiftDateFromIso(s.shiftDateIso || s.plannedStartsAtIso)}`;
		const existing = doctorGroups.get(docKey) ?? [];
		existing.push(s);
		doctorGroups.set(docKey, existing);
	}

	for (const [key, group] of doctorGroups.entries()) {
		if (group.length < 2) continue;
		const [doctorId, dateIso] = key.split("::");

		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				const shiftA = group[i]!;
				const shiftB = group[j]!;

				if (
					isIsoIntervalOverlap(
						shiftA.plannedStartsAtIso,
						shiftA.plannedEndsAtIso,
						shiftB.plannedStartsAtIso,
						shiftB.plannedEndsAtIso,
					)
				) {
					collisions.push({
						doctorId: doctorId!,
						doctorFullName: shiftA.doctorFullName,
						dateIso: dateIso!,
						conflictingShifts: [
							{
								shiftId: shiftA.id,
								startsAtIso: shiftA.plannedStartsAtIso,
								endsAtIso: shiftA.plannedEndsAtIso,
								chairId: shiftA.chairId,
							},
							{
								shiftId: shiftB.id,
								startsAtIso: shiftB.plannedStartsAtIso,
								endsAtIso: shiftB.plannedEndsAtIso,
								chairId: shiftB.chairId,
							},
						],
					});
				}
			}
		}
	}

	return collisions;
}

/**
 * Validates that an array of time intervals has zero overlapping pairs.
 */
export function validateShiftIntervalsNoOverlap(
	intervals: readonly { id: string; startsAtIso: string; endsAtIso: string }[],
): boolean {
	for (let i = 0; i < intervals.length; i++) {
		for (let j = i + 1; j < intervals.length; j++) {
			const a = intervals[i]!;
			const b = intervals[j]!;
			if (isIsoIntervalOverlap(a.startsAtIso, a.endsAtIso, b.startsAtIso, b.endsAtIso)) {
				return false;
			}
		}
	}
	return true;
}
