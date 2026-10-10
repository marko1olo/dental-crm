/**
 * DENTE Dental CRM — Appointment & Chair Roster Conflict Detection Engine (conflictDetector.ts)
 *
 * Principles & Compliance:
 * - Mandate 8e: Doctor & Staff Autonomy (non-blocking conflict warnings, 0 disabled buttons)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import {
	areIntervalsOverlapping,
	calculateOverlapDurationMinutes,
} from "@dental/shared";
import type {
	DoctorShift,
	AppointmentCollisionDetail,
	AppointmentCollisionDetectionResult,
	ShiftMinutesOptionResult,
} from "./types";

/**
 * Non-blocking conflict check (Mandate 8e).
 * Returns soft warnings if two doctors are assigned to the same chair at overlapping times.
 * Never disables buttons or prevents saving!
 */
export function detectDoctorChairConflicts(
	shifts: DoctorShift[],
): Array<{ chairId: string; dateIso: string; message: string }> {
	const conflicts: Array<{ chairId: string; dateIso: string; message: string }> = [];
	const groupedByChairAndDate = new Map<string, DoctorShift[]>();

	for (const s of shifts) {
		if (s.status === "cancelled") continue;
		const key = `${s.chairId}_${s.dateIso}`;
		const arr = groupedByChairAndDate.get(key) || [];
		arr.push(s);
		groupedByChairAndDate.set(key, arr);
	}

	for (const [key, chairShifts] of groupedByChairAndDate.entries()) {
		if (chairShifts.length > 1) {
			chairShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
			for (let i = 0; i < chairShifts.length - 1; i++) {
				const current = chairShifts[i]!;
				const next = chairShifts[i + 1]!;
				if (current.endTime > next.startTime && current.doctorId !== next.doctorId) {
					const [chairId, dateIso] = key.split("_");
					conflicts.push({
						chairId: chairId || "",
						dateIso: dateIso || "",
						message: `Пересечение смен: ${current.doctorName} (${current.startTime}–${current.endTime}) и ${next.doctorName} (${next.startTime}–${next.endTime})`,
					});
				}
			}
		}
	}

	return conflicts;
}

/**
 * Detects collisions for a prospective appointment against existing appointments:
 * 1. Chair collision: same chair at overlapping times.
 * 2. Doctor double-booking: same doctor at overlapping times across ANY chair/cabinet
 *    (a doctor cannot conduct two invasive clinical treatments simultaneously).
 * 3. Patient collision: same patient booked with different doctors at overlapping times.
 */
export function detectAppointmentCollisions(params: {
	candidate: {
		id?: string;
		doctorId?: string | null;
		chairId?: string | null;
		patientId?: string | null;
		startsAt: string;
		endsAt?: string | null;
		durationMinutes?: number;
		isCito?: boolean;
	};
	existingAppointments: Array<{
		id: string;
		startsAt: string;
		endsAt?: string | null;
		doctorUserId?: string | null;
		chairId?: string | null;
		patientId?: string | null;
		status?: string | null;
		durationMinutes?: number;
	}>;
	chairs?: Array<{ id: string; name: string; active?: boolean }>;
	staff?: Array<{ id: string; fullName?: string; name?: string }>;
	patients?: Array<{ id: string; fullName?: string; name?: string }>;
}): AppointmentCollisionDetectionResult {
	const { candidate, existingAppointments = [], chairs = [], staff = [], patients = [] } = params;

	const candStartMs = Date.parse(candidate.startsAt);
	const fallbackDuration = Number(candidate.durationMinutes) || 30;
	const candEndMs =
		candidate.endsAt && !Number.isNaN(Date.parse(candidate.endsAt))
			? Date.parse(candidate.endsAt)
			: candStartMs + fallbackDuration * 60000;

	if (Number.isNaN(candStartMs) || Number.isNaN(candEndMs) || candEndMs <= candStartMs) {
		return {
			hasCollision: false,
			primaryConflictType: null,
			collisions: [],
			message: "",
		};
	}

	const collisions: AppointmentCollisionDetail[] = [];

	const chairNameMap = new Map(chairs.map((c) => [c.id, c.name]));
	const staffNameMap = new Map(staff.map((s) => [s.id, s.fullName || s.name || "Врач"]));
	const patientNameMap = new Map(patients.map((p) => [p.id, p.fullName || p.name || "Пациент"]));

	for (const a of existingAppointments) {
		// Ignore cancelled, no-show, or self
		const s = String(a.status || "").toLowerCase();
		if (s === "cancelled" || s === "no_show" || s === "canceled") continue;
		if (candidate.id && a.id === candidate.id) continue;

		const aStartMs = Date.parse(a.startsAt);
		const aDuration = Number(a.durationMinutes) || 30;
		const aEndMs =
			a.endsAt && !Number.isNaN(Date.parse(a.endsAt))
				? Date.parse(a.endsAt)
				: aStartMs + aDuration * 60000;

		if (Number.isNaN(aStartMs) || Number.isNaN(aEndMs)) continue;

		// Overlap interval check via SSOT engine
		const isOverlapping = areIntervalsOverlapping(candStartMs, candEndMs, aStartMs, aEndMs);
		if (!isOverlapping) continue;

		const overlapMinutes = calculateOverlapDurationMinutes(candStartMs, candEndMs, aStartMs, aEndMs);

		const docName = a.doctorUserId ? staffNameMap.get(a.doctorUserId) || "Врач" : null;
		const chairName = a.chairId ? chairNameMap.get(a.chairId) || "Кресло" : null;
		const patName = a.patientId ? patientNameMap.get(a.patientId) || "Пациент" : null;

		// 1. Chair collision
		if (candidate.chairId && a.chairId && candidate.chairId === a.chairId) {
			collisions.push({
				type: "chair",
				conflictingAppointmentId: a.id,
				conflictingStartsAt: a.startsAt,
				conflictingEndsAt: a.endsAt || new Date(aEndMs).toISOString(),
				conflictingDoctorId: a.doctorUserId ?? null,
				conflictingDoctorName: docName,
				conflictingChairId: a.chairId ?? null,
				conflictingChairName: chairName,
				conflictingPatientName: patName,
				message: `Кресло «${chairName || candidate.chairId}» уже занято другим приёмом (${overlapMinutes} мин наложения).`,
				overlapMinutes,
			});
		}

		// 2. Doctor double-booking collision (even in different chairs!)
		if (candidate.doctorId && a.doctorUserId && candidate.doctorId === a.doctorUserId) {
			collisions.push({
				type: "doctor",
				conflictingAppointmentId: a.id,
				conflictingStartsAt: a.startsAt,
				conflictingEndsAt: a.endsAt || new Date(aEndMs).toISOString(),
				conflictingDoctorId: a.doctorUserId ?? null,
				conflictingDoctorName: docName,
				conflictingChairId: a.chairId ?? null,
				conflictingChairName: chairName,
				conflictingPatientName: patName,
				message: `Врач «${docName || candidate.doctorId}» уже ведёт приём в это время в «${chairName || "другом кабинете"}» (${overlapMinutes} мин наложения). Одновременный приём запрещён.`,
				overlapMinutes,
			});
		}

		// 3. Patient collision
		if (candidate.patientId && a.patientId && candidate.patientId === a.patientId) {
			collisions.push({
				type: "patient",
				conflictingAppointmentId: a.id,
				conflictingStartsAt: a.startsAt,
				conflictingEndsAt: a.endsAt || new Date(aEndMs).toISOString(),
				conflictingDoctorId: a.doctorUserId ?? null,
				conflictingDoctorName: docName,
				conflictingChairId: a.chairId ?? null,
				conflictingChairName: chairName,
				conflictingPatientName: patName,
				message: `Пациент «${patName || candidate.patientId}» уже записан к врачу «${docName || "клиники"}» на это время.`,
				overlapMinutes,
			});
		}
	}

	const hasCollision = collisions.length > 0;
	let primaryConflictType: "chair" | "doctor" | "patient" | null = null;
	if (hasCollision) {
		if (collisions.some((c) => c.type === "doctor")) {
			primaryConflictType = "doctor";
		} else if (collisions.some((c) => c.type === "chair")) {
			primaryConflictType = "chair";
		} else {
			primaryConflictType = "patient";
		}
	}

	const message = collisions.map((c) => c.message).join(" ");

	return {
		hasCollision,
		primaryConflictType,
		collisions,
		message,
	};
}

/**
 * Finds alternative chairs that are completely free during candidate appointment time.
 */
export function findAlternativeChairsForSlot(params: {
	startsAt: string;
	endsAt?: string | null;
	durationMinutes?: number;
	currentChairId?: string | null;
	chairs: Array<{ id: string; name: string; active?: boolean }>;
	existingAppointments: Array<{
		id: string;
		startsAt: string;
		endsAt?: string | null;
		chairId?: string | null;
		status?: string | null;
		durationMinutes?: number;
	}>;
}): Array<{ id: string; name: string }> {
	const {
		startsAt,
		endsAt,
		durationMinutes = 30,
		currentChairId,
		chairs = [],
		existingAppointments = [],
	} = params;

	const startMs = Date.parse(startsAt);
	const endMs =
		endsAt && !Number.isNaN(Date.parse(endsAt))
			? Date.parse(endsAt)
			: startMs + durationMinutes * 60000;

	if (Number.isNaN(startMs) || Number.isNaN(endMs)) return [];

	const activeChairs = chairs.filter((c) => c.active !== false && c.id !== currentChairId);

	return activeChairs.filter((chair) => {
		const hasConflict = existingAppointments.some((a) => {
			const s = String(a.status || "").toLowerCase();
			if (s === "cancelled" || s === "no_show" || s === "canceled") return false;
			if (a.chairId !== chair.id) return false;

			const aStartMs = Date.parse(a.startsAt);
			const aDuration = Number(a.durationMinutes) || 30;
			const aEndMs =
				a.endsAt && !Number.isNaN(Date.parse(a.endsAt))
					? Date.parse(a.endsAt)
					: aStartMs + aDuration * 60000;

			return areIntervalsOverlapping(startMs, endMs, aStartMs, aEndMs);
		});

		return !hasConflict;
	});
}

/**
 * Calculates shift proposals (+15, +30, +45, +60 min) and evaluates whether they are free.
 */
export function findShiftMinutesOptions(params: {
	startsAt: string;
	durationMinutes?: number;
	chairId?: string | null;
	doctorId?: string | null;
	shiftMinutes?: readonly number[];
	existingAppointments: Array<{
		id: string;
		startsAt: string;
		endsAt?: string | null;
		chairId?: string | null;
		doctorUserId?: string | null;
		status?: string | null;
		durationMinutes?: number;
	}>;
}): ShiftMinutesOptionResult[] {
	const {
		startsAt,
		durationMinutes = 30,
		chairId,
		doctorId,
		shiftMinutes = [15, 30, 45, 60],
		existingAppointments = [],
	} = params;

	const baseStartMs = Date.parse(startsAt);
	if (Number.isNaN(baseStartMs)) return [];

	return shiftMinutes.map((shift) => {
		const newStartMs = baseStartMs + shift * 60000;
		const newEndMs = newStartMs + durationMinutes * 60000;
		const newStartsAt = new Date(newStartMs).toISOString();
		const newEndsAt = new Date(newEndMs).toISOString();

		const hasConflict = existingAppointments.some((a) => {
			const s = String(a.status || "").toLowerCase();
			if (s === "cancelled" || s === "no_show" || s === "canceled") return false;

			const matchesChair = chairId && a.chairId === chairId;
			const matchesDoc = doctorId && a.doctorUserId === doctorId;
			if (!matchesChair && !matchesDoc) return false;

			const aStartMs = Date.parse(a.startsAt);
			const aDuration = Number(a.durationMinutes) || 30;
			const aEndMs =
				a.endsAt && !Number.isNaN(Date.parse(a.endsAt))
					? Date.parse(a.endsAt)
					: aStartMs + aDuration * 60000;

			return areIntervalsOverlapping(newStartMs, newEndMs, aStartMs, aEndMs);
		});

		return {
			minutes: shift,
			label: `+${shift} мин`,
			newStartsAt,
			newEndsAt,
			isFree: !hasConflict,
		};
	});
}
