import type { Appointment } from "@dental/shared";
import { calculateConsecutiveNoShows } from "./patientReliabilityStreak";
import type {
	PatientVisitHistoryStats,
	ReliabilityCalculationOptions,
} from "./patientReliabilityTypes";

export function calculateAppointmentLatenessMinutes(
	appt: Appointment | Record<string, unknown> | null | undefined,
): number | null {
	if (!appt || typeof appt !== "object") return null;
	const record = appt as Record<string, unknown>;
	const rawActual = record.actualStartTime ?? record.actualStartsAt;
	const rawPlanned = record.startTime ?? (record as { startsAt?: unknown }).startsAt;
	if (!rawActual || !rawPlanned) return null;

	const actualMs = typeof rawActual === "number" ? rawActual : Date.parse(String(rawActual));
	const plannedMs = typeof rawPlanned === "number" ? rawPlanned : Date.parse(String(rawPlanned));
	if (Number.isNaN(actualMs) || Number.isNaN(plannedMs)) return null;

	const diffMinutes = Math.round((actualMs - plannedMs) / 60_000);
	return diffMinutes > 0 ? diffMinutes : 0;
}

export function isAppointmentFinalizedOrPast(
	appointment: Appointment,
	referenceTimeMs: number,
): boolean {
	const status = appointment.status;
	if (status === "completed" || status === "no_show" || status === "arrived" || status === "in_treatment") {
		return true;
	}
	if (status === "cancelled") return true;

	if (appointment.startsAt) {
		const startMs = Date.parse(appointment.startsAt);
		if (!Number.isNaN(startMs) && startMs < referenceTimeMs) return true;
	}
	return false;
}

export function isUnexcusedNoShow(appt: Appointment): boolean {
	return appt.status === "no_show";
}

export function computePatientVisitStats(
	patientId: string,
	appointments: readonly Appointment[],
	options?: ReliabilityCalculationOptions,
): PatientVisitHistoryStats {
	const refMs = options?.referenceTimeIso ? Date.parse(options.referenceTimeIso) : Date.now();
	const latenessThreshold = options?.latenessThresholdMinutes ?? 15;
	const patientAppts = patientId
		? appointments.filter((a) => a.patientId === patientId && isAppointmentFinalizedOrPast(a, refMs))
		: [];

	const sortedAppts = [...patientAppts].sort((a, b) => {
		const timeA = a.startsAt ? Date.parse(a.startsAt) : 0;
		const timeB = b.startsAt ? Date.parse(b.startsAt) : 0;
		return timeA - timeB;
	});

	let completedCount = 0;
	let noShowCount = 0;
	let cancelledCount = 0;
	let lateCount = 0;

	for (const appt of sortedAppts) {
		const st = appt.status;
		if (st === "completed" || st === "arrived" || st === "in_treatment") {
			completedCount++;
			const latenessMin = calculateAppointmentLatenessMinutes(appt);
			if (latenessMin !== null && latenessMin >= latenessThreshold) {
				lateCount++;
			}
		} else if (isUnexcusedNoShow(appt)) {
			noShowCount++;
		} else if (st === "cancelled") {
			cancelledCount++;
		}
	}

	const totalAppointments = sortedAppts.length;
	const totalFinished = completedCount + noShowCount + cancelledCount;
	const { currentStreak: consecutiveNoShows, maxStreak: maxConsecutiveNoShows } = patientId
		? calculateConsecutiveNoShows(appointments, patientId, options?.referenceTimeIso)
		: { currentStreak: 0, maxStreak: 0 };

	const attendanceRatePercent = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100;
	const onTimeCount = Math.max(0, completedCount - lateCount);
	const onTimeRatePercent = totalFinished > 0 ? Math.round((onTimeCount / totalFinished) * 100) : 100;

	return {
		totalAppointments,
		completedCount,
		noShowCount,
		cancelledCount,
		lateCount,
		consecutiveNoShows,
		maxConsecutiveNoShows,
		onTimeRatePercent,
		attendanceRatePercent,
	};
}
