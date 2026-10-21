import type { Chair, StaffMember } from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "../gridTypes";

export function resolveSuggestedDoctorForChair(
	targetChairId: string,
	effectiveChairs: Chair[],
	doctors: StaffMember[],
): StaffMember | null {
	if (doctors.length === 0) return null;
	const targetChair = effectiveChairs.find((c) => c.id === targetChairId);
	const defaultDocId = (targetChair as { defaultDoctorId?: string })?.defaultDoctorId;
	if (defaultDocId) {
		const defaultDoc = doctors.find((d) => d.id === defaultDocId);
		if (defaultDoc) return defaultDoc;
	}
	const chairSpec = (targetChair as { specialization?: string })?.specialization;
	if (chairSpec) {
		const matchingDoc = doctors.find(
			(d) =>
				d.specialties &&
				d.specialties.some((s) => s.toLowerCase() === chairSpec.toLowerCase()),
		);
		if (matchingDoc) return matchingDoc;
	}
	const chairIdx = effectiveChairs.findIndex((c) => c.id === targetChairId);
	if (chairIdx >= 0 && chairIdx < doctors.length) {
		return doctors[chairIdx] || doctors[0] || null;
	}
	return doctors[0] || null;
}

export function resolveDoctorForChairAndHour(
	targetChairId: string,
	hourStr: string,
	effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>,
): string | null {
	const assignment = effectiveChairAssignments[targetChairId];
	if (!assignment) return null;
	const hourNum = parseInt(hourStr.slice(0, 2), 10) || 8;

	if (
		(assignment.subShifts && assignment.subShifts.length > 1) ||
		assignment.shiftPreset === "two_shifts"
	) {
		const mornSub = assignment.subShifts?.[0];
		const eveSub = assignment.subShifts?.[1];
		const mornStart = mornSub?.startHour ?? 8;
		const eveEnd = eveSub?.endHour ?? 20;
		const splitHour = mornSub?.endHour ?? eveSub?.startHour ?? 14;
		if (hourNum < mornStart || (hourNum >= eveEnd && (eveEnd < 20 || hourNum > 20))) {
			return null;
		}
		const mornDocId = mornSub?.doctorId || assignment.doctorId;
		const eveDocId = eveSub?.doctorId || mornSub?.doctorId || assignment.doctorId;
		return hourNum < splitHour ? mornDocId || null : eveDocId || null;
	}

	if (assignment.subShifts && assignment.subShifts.length > 0) {
		const matching = assignment.subShifts.find(
			(s) =>
				hourNum >= s.startHour &&
				(hourNum < s.endHour || (s.endHour >= 20 && hourNum <= s.endHour)),
		);
		return matching ? matching.doctorId : null;
	}

	if (assignment.shiftPreset === "morning") {
		return hourNum >= 8 && hourNum < 14 ? assignment.doctorId || null : null;
	}
	if (assignment.shiftPreset === "morning_9") {
		return hourNum >= 9 && hourNum < 15 ? assignment.doctorId || null : null;
	}
	if (assignment.shiftPreset === "evening") {
		return hourNum >= 14 && hourNum <= 20 ? assignment.doctorId || null : null;
	}
	if (assignment.shiftPreset === "evening_15") {
		return hourNum >= 15 && hourNum <= 21 ? assignment.doctorId || null : null;
	}
	if (assignment.shiftPreset === "full_9_21") {
		return hourNum >= 9 && hourNum <= 21 ? assignment.doctorId || null : null;
	}

	if (assignment.startHour !== undefined && assignment.endHour !== undefined) {
		if (
			hourNum >= assignment.startHour &&
			(hourNum < assignment.endHour || (assignment.endHour >= 20 && hourNum <= assignment.endHour))
		) {
			return assignment.doctorId || null;
		}
		return null;
	}
	return assignment.doctorId || null;
}
