import { formatTimerSeconds } from "../clinicalVisitWorkflow";

export function computeChairElapsed(startTimeIso: string | null | undefined): string {
	if (!startTimeIso || typeof startTimeIso !== "string") return "";
	const start = new Date(startTimeIso).getTime();
	if (!Number.isFinite(start) || Number.isNaN(start)) return "";
	const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
	return formatTimerSeconds(diffSec);
}

export function computeDoctorElapsed(
	isDoctorHere: boolean,
	doctorWorkSec: number,
	sliceStartMs: number,
): string {
	if (isDoctorHere) {
		const currentSliceSec = Math.max(0, Math.floor((Date.now() - sliceStartMs) / 1000));
		return formatTimerSeconds(doctorWorkSec + currentSliceSec);
	}
	return formatTimerSeconds(doctorWorkSec);
}

export function computeAnesthesiaCountdown(
	startedAtIso: string | null | undefined,
	durationMinutes: number,
): string | null {
	if (!startedAtIso) return null;
	const anesMs = new Date(startedAtIso).getTime();
	const targetSec = durationMinutes * 60;
	const anesElapsedSec = Math.max(0, Math.floor((Date.now() - anesMs) / 1000));
	const remSec = targetSec - anesElapsedSec;
	if (remSec > 0) {
		const remMin = Math.ceil(remSec / 60);
		return `${remMin} мин`;
	}
	return "Готово";
}
