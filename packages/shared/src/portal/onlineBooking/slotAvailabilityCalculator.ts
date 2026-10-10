/**
 * slotAvailabilityCalculator.ts — Free Slots Discovery, Collision Filtering, Shift Bounds & Soft-Lock Checks.
 */

import type { DoctorShiftSchedule, ScheduledAppointment } from "../../schedule/shiftCollisionEngine.js";
import type {
	BookingDoctorProfile,
	DoctorAvailableSlotsGroup,
	FindBookingSlotsOptions,
	FreeBookingSlot,
	SlotSoftLock,
} from "./types.js";

/**
 * Checks if a slot is currently soft-locked by any patient.
 */
export function isSlotSoftLocked(
	activeLocks: readonly SlotSoftLock[],
	doctorId: string,
	startTime: string,
	endTime: string,
	options: {
		excludeLockId?: string | undefined;
		excludePatientId?: string | undefined;
		now?: Date | undefined;
	} = {},
): boolean {
	const now = options.now ?? new Date();
	const nowMs = now.getTime();
	const targetStart = new Date(startTime).getTime();
	const targetEnd = new Date(endTime).getTime();

	if (targetEnd <= targetStart) return false;

	for (const lock of activeLocks) {
		if (lock.isReleased || lock.releasedAtIso) continue;
		if (options.excludeLockId && lock.id === options.excludeLockId) continue;
		if (options.excludePatientId && lock.patientId === options.excludePatientId) continue;

		// Expiry check
		const lockExpiryMs = new Date(lock.expiresAtIso).getTime();
		if (nowMs >= lockExpiryMs) continue;

		if (lock.doctorId !== doctorId) continue;

		const lockStart = new Date(lock.startTime).getTime();
		const lockEnd = new Date(lock.endTime).getTime();

		if (Math.max(targetStart, lockStart) < Math.min(targetEnd, lockEnd)) {
			return true;
		}
	}

	return false;
}

/**
 * Prunes expired or released soft-locks from active locks array.
 */
export function pruneExpiredSoftLocks(
	activeLocks: readonly SlotSoftLock[],
	nowInput?: Date,
): SlotSoftLock[] {
	const now = nowInput ?? new Date();
	const nowMs = now.getTime();

	return activeLocks.filter((lock) => {
		if (lock.isReleased || lock.releasedAtIso) return false;
		const expiryMs = new Date(lock.expiresAtIso).getTime();
		return expiryMs > nowMs;
	});
}

const RU_MONTHS = [
	"января",
	"февраля",
	"марта",
	"апреля",
	"мая",
	"июня",
	"июля",
	"августа",
	"сентября",
	"октября",
	"ноября",
	"декабря",
];
const RU_WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function formatSlotDateRu(date: Date): string {
	const day = date.getDate();
	const month = RU_MONTHS[date.getMonth()];
	const year = date.getFullYear();
	const weekday = RU_WEEKDAYS[date.getDay()];
	return `${day} ${month} ${year}, ${weekday}`;
}

export function formatSlotTimeRu(date: Date): string {
	const h = String(date.getHours()).padStart(2, "0");
	const m = String(date.getMinutes()).padStart(2, "0");
	return `${h}:${m}`;
}

/**
 * Finds all available online booking slots across doctor shifts and branches.
 */
export function findAvailableDoctorBookingSlots(
	doctors: readonly BookingDoctorProfile[],
	shifts: readonly DoctorShiftSchedule[],
	appointments: readonly ScheduledAppointment[],
	activeLocks: readonly SlotSoftLock[] = [],
	options: FindBookingSlotsOptions = {},
): FreeBookingSlot[] {
	const now = options.now ?? new Date();
	const nowMs = now.getTime();
	const targetDuration = options.targetDurationMinutes ?? 30;
	const excludeEmergency = options.excludeEmergencyReserves ?? true;

	const doctorMap = new Map<string, BookingDoctorProfile>();
	for (const doc of doctors) {
		if (doc.isOnlineBookingAvailable) {
			doctorMap.set(doc.id, doc);
		}
	}

	const unexpiredLocks = pruneExpiredSoftLocks(activeLocks, now);
	const results: FreeBookingSlot[] = [];

	for (const shift of shifts) {
		const doctor = doctorMap.get(shift.doctorId);
		if (!doctor) continue;

		if (options.doctorId && doctor.id !== options.doctorId) continue;
		if (options.branchId && doctor.branchId !== options.branchId) continue;
		if (
			options.specialtyCategory &&
			options.specialtyCategory !== "all" &&
			doctor.specialtyCategory !== options.specialtyCategory
		) {
			continue;
		}

		const shiftStartMs = new Date(shift.startTime).getTime();
		const shiftEndMs = new Date(shift.endTime).getTime();

		if (Number.isNaN(shiftStartMs) || Number.isNaN(shiftEndMs) || shiftEndMs <= shiftStartMs) {
			continue;
		}

		// Filter shift by date bounds
		if (options.startDate) {
			const startBound = new Date(options.startDate).getTime();
			if (shiftEndMs < startBound) continue;
		}
		if (options.endDate) {
			const endBound = new Date(options.endDate).getTime();
			if (shiftStartMs > endBound) continue;
		}

		// Collect blocked spans
		interface BlockedSpan {
			start: number;
			end: number;
		}
		const busy: BlockedSpan[] = [];

		// 1. Shift break
		if (shift.breakStartTime && shift.breakEndTime) {
			const bStart = new Date(shift.breakStartTime).getTime();
			const bEnd = new Date(shift.breakEndTime).getTime();
			if (bEnd > bStart) {
				busy.push({ start: bStart, end: bEnd });
			}
		}

		// 2. Existing appointments
		for (const apt of appointments) {
			if (apt.status === "cancelled" || apt.status === "no_show") continue;
			if (apt.doctorId !== doctor.id) continue;

			const aStart = new Date(apt.startTime).getTime();
			const aEnd = new Date(apt.endTime).getTime();
			const cStart = Math.max(shiftStartMs, aStart);
			const cEnd = Math.min(shiftEndMs, aEnd);

			if (cEnd > cStart) {
				busy.push({ start: cStart, end: cEnd });
			}
		}

		// 3. Active unexpired soft-locks for other patients
		for (const lock of unexpiredLocks) {
			if (lock.doctorId !== doctor.id) continue;
			if (options.requestingPatientId && lock.patientId === options.requestingPatientId) {
				continue; // Requesting patient sees their own held slot
			}

			const lStart = new Date(lock.startTime).getTime();
			const lEnd = new Date(lock.endTime).getTime();
			const cStart = Math.max(shiftStartMs, lStart);
			const cEnd = Math.min(shiftEndMs, lEnd);

			if (cEnd > cStart) {
				busy.push({ start: cStart, end: cEnd });
			}
		}

		// 4. Emergency reserve buffer at end of shift (e.g. 30 min)
		const reserveMin = shift.emergencyReserveMinutes ?? 30;
		if (excludeEmergency && shift.isEmergencyReserveEnabled && reserveMin > 0) {
			const rMs = reserveMin * 60000;
			const rStart = Math.max(shiftStartMs, shiftEndMs - rMs);
			busy.push({ start: rStart, end: shiftEndMs });
		}

		// Merge busy intervals
		busy.sort((a, b) => a.start - b.start);
		const mergedBusy: BlockedSpan[] = [];
		if (busy.length > 0) {
			let cur = { ...busy[0]! };
			for (let i = 1; i < busy.length; i++) {
				const next = busy[i]!;
				if (next.start <= cur.end) {
					cur.end = Math.max(cur.end, next.end);
				} else {
					mergedBusy.push(cur);
					cur = { ...next };
				}
			}
			mergedBusy.push(cur);
		}

		// Compute available free spans
		const freeSpans: BlockedSpan[] = [];
		let cursor = shiftStartMs;

		for (const b of mergedBusy) {
			if (b.start > cursor) {
				freeSpans.push({ start: cursor, end: b.start });
			}
			cursor = Math.max(cursor, b.end);
		}
		if (cursor < shiftEndMs) {
			freeSpans.push({ start: cursor, end: shiftEndMs });
		}

		// Discretize each free span into targetDuration slots
		const slotDurationMs = targetDuration * 60000;

		for (const span of freeSpans) {
			let slotStart = span.start;

			while (slotStart + slotDurationMs <= span.end) {
				const slotEnd = slotStart + slotDurationMs;

				// Skip past slots
				if (slotStart > nowMs) {
					const startDate = new Date(slotStart);
					const isLocked = isSlotSoftLocked(unexpiredLocks, doctor.id, startDate.toISOString(), new Date(slotEnd).toISOString(), {
						excludePatientId: options.requestingPatientId,
						now,
					});

					results.push({
						slotId: `slot-${doctor.id}-${slotStart}`,
						doctorId: doctor.id,
						doctorFullName: doctor.fullName,
						specialty: doctor.specialty,
						specialtyCategory: doctor.specialtyCategory,
						branchId: doctor.branchId,
						cabinetId: shift.cabinetId ?? doctor.cabinetId ?? null,
						cabinetName: doctor.cabinetName ?? null,
						startTime: startDate.toISOString(),
						endTime: new Date(slotEnd).toISOString(),
						durationMinutes: targetDuration,
						displayDateRu: formatSlotDateRu(startDate),
						displayTimeRu: formatSlotTimeRu(startDate),
						isEmergencyBuffer: false,
						isSoftLocked: isLocked,
					});
				}

				slotStart += slotDurationMs;
			}
		}
	}

	// Sort chronologically
	results.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
	return results;
}

/**
 * Groups available slots by doctor for user-friendly UI presentation.
 */
export function groupAvailableSlotsByDoctor(
	slots: readonly FreeBookingSlot[],
	doctors: readonly BookingDoctorProfile[],
): DoctorAvailableSlotsGroup[] {
	const docMap = new Map<string, BookingDoctorProfile>();
	for (const d of doctors) docMap.set(d.id, d);

	const grouped = new Map<string, FreeBookingSlot[]>();
	for (const slot of slots) {
		let list = grouped.get(slot.doctorId);
		if (!list) {
			list = [];
			grouped.set(slot.doctorId, list);
		}
		list.push(slot);
	}

	const result: DoctorAvailableSlotsGroup[] = [];

	for (const doctor of doctors) {
		const docSlots = grouped.get(doctor.id) ?? [];
		if (docSlots.length === 0 && !doctor.isOnlineBookingAvailable) continue;

		const slotsByDate: Record<string, FreeBookingSlot[]> = {};
		for (const slot of docSlots) {
			const dateKey = slot.startTime.slice(0, 10);
			if (!slotsByDate[dateKey]) {
				slotsByDate[dateKey] = [];
			}
			slotsByDate[dateKey]!.push(slot);
		}

		result.push({
			doctor,
			totalAvailableSlots: docSlots.length,
			earliestAvailableSlot: docSlots[0] ?? null,
			slotsByDate,
		});
	}

	// Sort doctors with available slots first, then by earliest slot
	result.sort((a, b) => {
		if (a.totalAvailableSlots > 0 && b.totalAvailableSlots === 0) return -1;
		if (a.totalAvailableSlots === 0 && b.totalAvailableSlots > 0) return 1;
		if (a.earliestAvailableSlot && b.earliestAvailableSlot) {
			return (
				new Date(a.earliestAvailableSlot.startTime).getTime() -
				new Date(b.earliestAvailableSlot.startTime).getTime()
			);
		}
		return a.doctor.fullName.localeCompare(b.doctor.fullName);
	});

	return result;
}
