/**
 * patientOnlineBookingEngine.ts — Patient Online Booking, Free Slots Discovery & Anti-Collision Soft-Lock Engine.
 *
 * Capabilities:
 * 1. Multi-Branch & Multi-Doctor Free Slots Search:
 *    - Search and filter by doctor clinical specialty (Therapy, Orthopedics, Surgery, Orthodontics, Periodontics, Pediatric, Hygiene).
 *    - Branch/cabinet filtering, doctor schedule shifts, breaks and emergency reserve buffer respect.
 * 2. Anti-Collision Slot Soft-Lock Engine (10-Minute Hold):
 *    - Temporary 10-minute hold on selected slot during patient checkout/booking flow.
 *    - Prevents double-booking race conditions between simultaneous mobile portal users and reception staff.
 *    - Automatic expiration, extension, and release lifecycle.
 * 3. CRM Booking Creation & Source Attribution:
 *    - Automatic appointment creation with mandatory source attribution tag `ONLINE_PORTAL`.
 *    - Formatted omnichannel push notification payload for the patient.
 *    - Real-time CRM administrative alert for reception/registry staff.
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
	areIntervalsOverlapping,
	calculateOverlapDurationMinutes,
	type DoctorShiftSchedule,
	type ScheduledAppointment,
} from "../schedule/shiftCollisionEngine.js";

// ─── 1. SPECIALTY & BRANCH SCHEMAS ───────────────────────────────────────────

export const DOCTOR_SPECIALTY_CATEGORIES = [
	"therapy",
	"orthopedics",
	"surgery",
	"orthodontics",
	"periodontics",
	"pediatric",
	"hygiene",
	"all",
] as const;
export type DoctorSpecialtyCategory = (typeof DOCTOR_SPECIALTY_CATEGORIES)[number];
export const doctorSpecialtyCategorySchema = z.enum(DOCTOR_SPECIALTY_CATEGORIES);

export interface SpecialtyMetadata {
	category: DoctorSpecialtyCategory;
	titleRu: string;
	shortTitleRu: string;
	descriptionRu: string;
	defaultSlotDurationMinutes: number;
}

export const SPECIALTY_METADATA_REGISTRY: Record<DoctorSpecialtyCategory, SpecialtyMetadata> = {
	therapy: {
		category: "therapy",
		titleRu: "Терапевтическая стоматология (Лечение кариеса и каналов)",
		shortTitleRu: "Терапевт",
		descriptionRu: "Лечение кариеса, пульпита, периодонтита, эстетическая реставрация зубов.",
		defaultSlotDurationMinutes: 45,
	},
	orthopedics: {
		category: "orthopedics",
		titleRu: "Ортопедическая стоматология (Коронки, виниры, протезы)",
		shortTitleRu: "Ортопед",
		descriptionRu: "Керамические виниры e.max, коронки из диоксида циркония, мостовидные и съемные протезы.",
		defaultSlotDurationMinutes: 60,
	},
	surgery: {
		category: "surgery",
		titleRu: "Хирургическая стоматология и имплантация",
		shortTitleRu: "Хирург-имплантолог",
		descriptionRu: "Атравматичное удаление зубов, установка дентальных имплантатов, синус-лифтинг и костная пластика.",
		defaultSlotDurationMinutes: 60,
	},
	orthodontics: {
		category: "orthodontics",
		titleRu: "Ортодонтия (Брекеты и элайнеры)",
		shortTitleRu: "Ортодонт",
		descriptionRu: "Исправление прикуса у детей и взрослых, установка брекет-систем, прозрачные элайнеры.",
		defaultSlotDurationMinutes: 30,
	},
	periodontics: {
		category: "periodontics",
		titleRu: "Пародонтология (Лечение дёсен)",
		shortTitleRu: "Пародонтолог",
		descriptionRu: "Лечение гингивита и пародонтита, вектор-терапия, закрытый кюретаж пародонтальных карманов.",
		defaultSlotDurationMinutes: 45,
	},
	pediatric: {
		category: "pediatric",
		titleRu: "Детская стоматология",
		shortTitleRu: "Детский стоматолог",
		descriptionRu: "Адаптационный прием детей, лечение молочных и постоянных зубов, цветные пломбы, седация.",
		defaultSlotDurationMinutes: 30,
	},
	hygiene: {
		category: "hygiene",
		titleRu: "Профессиональная гигиена и профилактика",
		shortTitleRu: "Гигиенист",
		descriptionRu: "Комплексная чистка Air-Flow, ультразвуковое снятие камня, глубокое фторирование и отбеливание.",
		defaultSlotDurationMinutes: 45,
	},
	all: {
		category: "all",
		titleRu: "Все стоматологические направления",
		shortTitleRu: "Все врачи",
		descriptionRu: "Полный каталог специалистов клиники.",
		defaultSlotDurationMinutes: 30,
	},
};

export const clinicBranchSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	name: z.string().min(1),
	address: z.string().min(1),
	city: z.string().default("Москва"),
	phone: z.string().min(10),
	workingHours: z.string().default("Пн-Вс 09:00 - 21:00"),
	timezone: z.string().default("Europe/Moscow"),
});
export type ClinicBranch = z.infer<typeof clinicBranchSchema>;

export const bookingDoctorProfileSchema = z.object({
	id: z.string().min(1),
	fullName: z.string().min(1),
	specialty: z.string().min(1),
	specialtyCategory: doctorSpecialtyCategorySchema,
	branchId: z.string().min(1),
	branchName: z.string().optional(),
	cabinetId: z.string().optional().nullable(),
	cabinetName: z.string().optional().nullable(),
	rating: z.number().min(0).max(5).default(5.0),
	reviewsCount: z.number().int().min(0).default(0),
	experienceYears: z.number().int().min(0).default(5),
	photoUrl: z.string().optional().nullable(),
	isOnlineBookingAvailable: z.boolean().default(true),
	defaultSlotDurationMinutes: z.number().int().positive().default(30),
});
export type BookingDoctorProfile = z.infer<typeof bookingDoctorProfileSchema>;

// ─── 2. ANTI-COLLISION SOFT-LOCK ENGINE (10-MIN HOLD) ────────────────────────

export const SOFT_LOCK_DEFAULT_TTL_MINUTES = 10; // 10 minutes hold during booking flow

export const slotSoftLockSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	branchId: z.string().min(1),
	doctorId: z.string().min(1),
	cabinetId: z.string().optional().nullable(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	durationMinutes: z.number().int().positive(),
	patientId: z.string().min(1), // Patient ID or temporary mobile session ID
	patientPhone: z.string().min(10),
	acquiredAtIso: z.string().datetime(),
	expiresAtIso: z.string().datetime(),
	isReleased: z.boolean().default(false),
	releasedAtIso: z.string().datetime().optional().nullable(),
});
export type SlotSoftLock = z.infer<typeof slotSoftLockSchema>;

export interface AcquireSoftLockRequest {
	organizationId: string;
	branchId: string;
	doctorId: string;
	cabinetId?: string | null | undefined;
	startTime: string; // ISO datetime
	endTime: string; // ISO datetime
	patientId: string;
	patientPhone: string;
	lockTtlMinutes?: number | undefined;
}

export type AcquireSoftLockResult =
	| {
			success: true;
			lock: SlotSoftLock;
			updatedLocks: SlotSoftLock[];
	  }
	| {
			success: false;
			reason: "SLOT_IN_PAST" | "SLOT_ALREADY_BOOKED" | "SLOT_ALREADY_LOCKED" | "INVALID_INTERVAL";
			descriptionRu: string;
			conflictAppointmentId?: string | undefined;
			conflictLockId?: string | undefined;
	  };

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

/**
 * Acquires a 10-minute anti-collision soft-lock on a specific doctor time slot.
 */
export function acquireSlotSoftLock(
	activeLocks: readonly SlotSoftLock[],
	request: AcquireSoftLockRequest,
	existingAppointments: readonly ScheduledAppointment[] = [],
	nowInput?: Date,
): AcquireSoftLockResult {
	const now = nowInput ?? new Date();
	const nowMs = now.getTime();
	const startMs = new Date(request.startTime).getTime();
	const endMs = new Date(request.endTime).getTime();

	if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
		return {
			success: false,
			reason: "INVALID_INTERVAL",
			descriptionRu: "Время окончания слота должно быть строго позже времени начала.",
		};
	}

	if (startMs < nowMs) {
		return {
			success: false,
			reason: "SLOT_IN_PAST",
			descriptionRu: "Невозможно заблокировать слот в прошлом времени.",
		};
	}

	// 1. Check against existing booked appointments
	for (const apt of existingAppointments) {
		if (apt.status === "cancelled" || apt.status === "no_show") continue;
		if (apt.doctorId !== request.doctorId) continue;

		const aptStart = new Date(apt.startTime).getTime();
		const aptEnd = new Date(apt.endTime).getTime();

		if (Math.max(startMs, aptStart) < Math.min(endMs, aptEnd)) {
			return {
				success: false,
				reason: "SLOT_ALREADY_BOOKED",
				descriptionRu: "Слот уже занят другой подтверждённой записью в клинике.",
				conflictAppointmentId: apt.id,
			};
		}
	}

	// 2. Check against unexpired soft-locks for other patients
	const unexpiredLocks = pruneExpiredSoftLocks(activeLocks, now);

	for (const lock of unexpiredLocks) {
		if (lock.doctorId !== request.doctorId) continue;
		if (lock.patientId === request.patientId) continue; // Same patient can re-lock / refresh

		const lockStart = new Date(lock.startTime).getTime();
		const lockEnd = new Date(lock.endTime).getTime();

		if (Math.max(startMs, lockStart) < Math.min(endMs, lockEnd)) {
			return {
				success: false,
				reason: "SLOT_ALREADY_LOCKED",
				descriptionRu: "Слот временно удерживается другим пациентом на время оформления записи.",
				conflictLockId: lock.id,
			};
		}
	}

	// 3. Create fresh soft-lock
	const ttlMinutes = request.lockTtlMinutes ?? SOFT_LOCK_DEFAULT_TTL_MINUTES;
	const durationMinutes = Math.round((endMs - startMs) / 60000);
	const lockId = `lock-${randomUUID()}`;
	const acquiredAtIso = now.toISOString();
	const expiresAtIso = new Date(nowMs + ttlMinutes * 60 * 1000).toISOString();

	const newLock: SlotSoftLock = {
		id: lockId,
		organizationId: request.organizationId,
		branchId: request.branchId,
		doctorId: request.doctorId,
		cabinetId: request.cabinetId ?? null,
		startTime: new Date(startMs).toISOString(),
		endTime: new Date(endMs).toISOString(),
		durationMinutes,
		patientId: request.patientId,
		patientPhone: request.patientPhone,
		acquiredAtIso,
		expiresAtIso,
		isReleased: false,
		releasedAtIso: null,
	};

	// Replace existing locks by the same patient for this doctor or append
	const updatedLocks = unexpiredLocks.filter(
		(l) => !(l.patientId === request.patientId && l.doctorId === request.doctorId),
	);
	updatedLocks.push(newLock);

	return {
		success: true,
		lock: newLock,
		updatedLocks,
	};
}

/**
 * Releases a soft-lock (e.g. when patient cancels or completes booking).
 */
export function releaseSlotSoftLock(
	activeLocks: readonly SlotSoftLock[],
	lockId: string,
	patientIdentifier: string,
	nowInput?: Date,
): { success: boolean; releasedLockId?: string; updatedLocks: SlotSoftLock[] } {
	const now = nowInput ?? new Date();
	const updated = activeLocks.map((lock) => {
		if (lock.id === lockId && (lock.patientId === patientIdentifier || lock.patientPhone === patientIdentifier)) {
			return {
				...lock,
				isReleased: true,
				releasedAtIso: now.toISOString(),
			};
		}
		return lock;
	});

	return {
		success: true,
		releasedLockId: lockId,
		updatedLocks: pruneExpiredSoftLocks(updated, now),
	};
}

/**
 * Extends an existing soft-lock by additional minutes.
 */
export function extendSlotSoftLock(
	activeLocks: readonly SlotSoftLock[],
	lockId: string,
	patientIdentifier: string,
	additionalMinutes = 5,
	nowInput?: Date,
): { success: boolean; lock?: SlotSoftLock; updatedLocks: SlotSoftLock[] } {
	const now = nowInput ?? new Date();
	let foundLock: SlotSoftLock | undefined;

	const updated = activeLocks.map((lock) => {
		if (lock.id === lockId && (lock.patientId === patientIdentifier || lock.patientPhone === patientIdentifier)) {
			const currentExpMs = new Date(lock.expiresAtIso).getTime();
			const newExpMs = Math.max(now.getTime(), currentExpMs) + additionalMinutes * 60 * 1000;
			foundLock = {
				...lock,
				expiresAtIso: new Date(newExpMs).toISOString(),
			};
			return foundLock;
		}
		return lock;
	});

	return {
		success: Boolean(foundLock),
		...(foundLock ? { lock: foundLock } : {}),
		updatedLocks: pruneExpiredSoftLocks(updated, now),
	};
}

// ─── 3. FREE SLOTS DISCOVERY & AGGREGATION ────────────────────────────────────

export interface FreeBookingSlot {
	slotId: string;
	doctorId: string;
	doctorFullName: string;
	specialty: string;
	specialtyCategory: DoctorSpecialtyCategory;
	branchId: string;
	cabinetId?: string | null | undefined;
	cabinetName?: string | null | undefined;
	startTime: string; // ISO
	endTime: string; // ISO
	durationMinutes: number;
	displayDateRu: string; // "29 августа 2026, Сб"
	displayTimeRu: string; // "14:30"
	isEmergencyBuffer: boolean;
	isSoftLocked: boolean;
}

export interface DoctorAvailableSlotsGroup {
	doctor: BookingDoctorProfile;
	totalAvailableSlots: number;
	earliestAvailableSlot: FreeBookingSlot | null;
	slotsByDate: Record<string, FreeBookingSlot[]>; // YYYY-MM-DD -> slots
}

export interface FindBookingSlotsOptions {
	branchId?: string | undefined;
	specialtyCategory?: DoctorSpecialtyCategory | undefined;
	doctorId?: string | undefined;
	startDate?: string | undefined; // YYYY-MM-DD or ISO
	endDate?: string | undefined; // YYYY-MM-DD or ISO
	targetDurationMinutes?: number | undefined; // 30, 45, 60
	excludeEmergencyReserves?: boolean | undefined;
	requestingPatientId?: string | undefined;
	now?: Date | undefined;
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

// ─── 4. CRM BOOKING CREATION & PUSH NOTIFICATION ENGINE ───────────────────────

export const createOnlineBookingInputSchema = z.object({
	organizationId: z.string().min(1),
	branchId: z.string().min(1),
	doctorId: z.string().min(1),
	cabinetId: z.string().optional().nullable(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	patientPhone: z.string().min(10),
	serviceCategory: doctorSpecialtyCategorySchema.default("therapy"),
	serviceName: z.string().default("Первичный приём и консультация стоматолога"),
	patientNotes: z.string().max(1000).optional().nullable(),
	lockId: z.string().optional().nullable(),
	channel: z.enum(["mobile_portal", "web_portal", "widget"]).default("mobile_portal"),
	clientIp: z.string().default("127.0.0.1"),
	userAgent: z.string().default("patient_mobile_portal"),
});
export type CreateOnlineBookingInput = z.input<typeof createOnlineBookingInputSchema>;
export type CreateOnlineBookingOutput = z.output<typeof createOnlineBookingInputSchema>;

export const portalBookingPushNotificationSchema = z.object({
	recipientPatientId: z.string().min(1),
	recipientPhone: z.string().min(10),
	title: z.string().min(1),
	body: z.string().min(1),
	data: z.object({
		appointmentId: z.string().min(1),
		doctorId: z.string().min(1),
		startTime: z.string().datetime(),
		endTime: z.string().datetime(),
		branchAddress: z.string().min(1),
		source: z.enum(["ONLINE_PORTAL", "ONLINE_BOOKING"]).default("ONLINE_BOOKING"),
		actionUrl: z.string().url(),
	}),
});
export type PortalBookingPushNotification = z.infer<typeof portalBookingPushNotificationSchema>;

export const adminNewBookingAlertSchema = z.object({
	alertId: z.string().uuid(),
	organizationId: z.string().min(1),
	branchId: z.string().min(1),
	appointmentId: z.string().min(1),
	title: z.string().min(1),
	message: z.string().min(1),
	patientFullName: z.string().min(1),
	patientPhone: z.string().min(10),
	doctorFullName: z.string().min(1),
	appointmentStartTime: z.string().datetime(),
	source: z.enum(["ONLINE_PORTAL", "ONLINE_BOOKING"]).default("ONLINE_BOOKING"),
	createdAtIso: z.string().datetime(),
});
export type AdminNewBookingAlert = z.infer<typeof adminNewBookingAlertSchema>;

export const onlinePortalBookingResultSchema = z.object({
	appointment: z.object({
		id: z.string().uuid(),
		clinicId: z.string().min(1),
		doctorId: z.string().min(1),
		cabinetId: z.string().optional().nullable(),
		patientId: z.string().min(1),
		patientFullName: z.string().min(1),
		startTime: z.string().datetime(),
		endTime: z.string().datetime(),
		status: z.enum(["planned", "ONLINE_BOOKING", "confirmed"]).default("ONLINE_BOOKING"),
		isEmergency: z.boolean().default(false),
		notes: z.string().nullable().optional(),
		source: z.enum(["ONLINE_PORTAL", "ONLINE_BOOKING"]).default("ONLINE_BOOKING"),
		sourceMetadata: z.object({
			channel: z.string(),
			bookedAtIso: z.string().datetime(),
			lockId: z.string().nullable().optional(),
			clientIp: z.string(),
			userAgent: z.string(),
			serviceCategory: z.string(),
			serviceName: z.string(),
		}),
	}),
	pushNotification: portalBookingPushNotificationSchema,
	adminAlert: adminNewBookingAlertSchema,
});
export type OnlinePortalBookingResult = z.infer<typeof onlinePortalBookingResultSchema>;

/**
 * Builds formatted push notification payload for the patient.
 */
export function buildBookingPushNotification(
	bookingInput: CreateOnlineBookingInput,
	appointmentId: string,
	doctor: BookingDoctorProfile,
	branch: ClinicBranch,
): PortalBookingPushNotification {
	const startDate = new Date(bookingInput.startTime);
	const dateRu = formatSlotDateRu(startDate);
	const timeRu = formatSlotTimeRu(startDate);

	const title = "Вы записаны на приём в DENTE";
	const body = `Врач: ${doctor.fullName} (${doctor.specialty})\nДата и время: ${dateRu} в ${timeRu}\nАдрес: ${branch.address}`;

	return {
		recipientPatientId: bookingInput.patientId,
		recipientPhone: bookingInput.patientPhone,
		title,
		body,
		data: {
			appointmentId,
			doctorId: doctor.id,
			startTime: bookingInput.startTime,
			endTime: bookingInput.endTime,
			branchAddress: branch.address,
			source: "ONLINE_BOOKING",
			actionUrl: `https://portal.dente.clinic/appointments/${appointmentId}`,
		},
	};
}

/**
 * Builds real-time alert for CRM reception/administrator panel.
 */
export function buildAdminNewBookingAlert(
	bookingInput: CreateOnlineBookingInput,
	appointmentId: string,
	doctor: BookingDoctorProfile,
	now?: Date,
): AdminNewBookingAlert {
	const startDate = new Date(bookingInput.startTime);
	const dateRu = formatSlotDateRu(startDate);
	const timeRu = formatSlotTimeRu(startDate);

	return {
		alertId: randomUUID(),
		organizationId: bookingInput.organizationId,
		branchId: bookingInput.branchId,
		appointmentId,
		title: "🔔 Новая онлайн-запись через портал",
		message: `Пациент ${bookingInput.patientFullName} (${bookingInput.patientPhone}) оформил запись к ${doctor.fullName} на ${dateRu} в ${timeRu}. Услуга: ${bookingInput.serviceName ?? "Первичный приём и консультация стоматолога"}.`,
		patientFullName: bookingInput.patientFullName,
		patientPhone: bookingInput.patientPhone,
		doctorFullName: doctor.fullName,
		appointmentStartTime: bookingInput.startTime,
		source: "ONLINE_BOOKING",
		createdAtIso: (now ?? new Date()).toISOString(),
	};
}

/**
 * Creates a complete online booking in CRM with soft-lock release and notifications.
 */
export function createOnlinePortalBooking(params: {
	bookingInput: CreateOnlineBookingInput;
	activeLocks: readonly SlotSoftLock[];
	existingAppointments: readonly ScheduledAppointment[];
	doctor: BookingDoctorProfile;
	branch: ClinicBranch;
	now?: Date;
}):
	| {
			success: true;
			result: OnlinePortalBookingResult;
			updatedLocks: SlotSoftLock[];
	  }
	| {
			success: false;
			error: "COLLISION_DETECTED" | "LOCK_EXPIRED_OR_INVALID" | "SLOT_IN_PAST";
			descriptionRu: string;
	  } {
	const now = params.now ?? new Date();
	const input = createOnlineBookingInputSchema.parse(params.bookingInput);
	const startMs = new Date(input.startTime).getTime();
	const endMs = new Date(input.endTime).getTime();

	if (startMs < now.getTime()) {
		return {
			success: false,
			error: "SLOT_IN_PAST",
			descriptionRu: "Невозможно записаться на прошедшее время.",
		};
	}

	// Check if conflicting with any existing non-cancelled appointment
	for (const apt of params.existingAppointments) {
		if (apt.status === "cancelled" || apt.status === "no_show") continue;
		if (apt.doctorId !== input.doctorId) continue;

		const aStart = new Date(apt.startTime).getTime();
		const aEnd = new Date(apt.endTime).getTime();

		if (Math.max(startMs, aStart) < Math.min(endMs, aEnd)) {
			return {
				success: false,
				error: "COLLISION_DETECTED",
				descriptionRu: "На выбранное время уже существует подтверждённая запись к врачу.",
			};
		}
	}

	// Check if another patient has active unexpired soft-lock
	if (
		isSlotSoftLocked(params.activeLocks, input.doctorId, input.startTime, input.endTime, {
			excludePatientId: input.patientId,
			excludeLockId: input.lockId ?? undefined,
			now,
		})
	) {
		return {
			success: false,
			error: "COLLISION_DETECTED",
			descriptionRu: "Слот удерживается другим пациентом. Пожалуйста, выберите другое время.",
		};
	}

	const appointmentId = randomUUID();
	const bookedAtIso = now.toISOString();

	// Release soft-locks held by this patient
	let updatedLocks = [...params.activeLocks];
	if (input.lockId) {
		const releaseResult = releaseSlotSoftLock(updatedLocks, input.lockId, input.patientId, now);
		updatedLocks = releaseResult.updatedLocks;
	} else {
		updatedLocks = pruneExpiredSoftLocks(
			updatedLocks.filter((l) => !(l.patientId === input.patientId && l.doctorId === input.doctorId)),
			now,
		);
	}

	const appointment = {
		id: appointmentId,
		clinicId: input.organizationId,
		doctorId: input.doctorId,
		cabinetId: input.cabinetId ?? params.doctor.cabinetId ?? null,
		patientId: input.patientId,
		patientFullName: input.patientFullName,
		startTime: input.startTime,
		endTime: input.endTime,
		status: "ONLINE_BOOKING" as const,
		isEmergency: false,
		notes: input.patientNotes ?? null,
		source: "ONLINE_BOOKING" as const,
		sourceMetadata: {
			channel: input.channel,
			bookedAtIso,
			lockId: input.lockId ?? null,
			clientIp: input.clientIp,
			userAgent: input.userAgent,
			serviceCategory: input.serviceCategory,
			serviceName: input.serviceName,
		},
	};

	const pushNotification = buildBookingPushNotification(input, appointmentId, params.doctor, params.branch);
	const adminAlert = buildAdminNewBookingAlert(input, appointmentId, params.doctor, now);

	return {
		success: true,
		result: {
			appointment,
			pushNotification,
			adminAlert,
		},
		updatedLocks,
	};
}
