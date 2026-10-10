/**
 * bookingReservationCore.ts — Idempotent Slot Reservation, Soft-Lock Lifecycle & CRM Appointment Creation.
 */

import { generateUuidV7 } from "../../sync/hashing.js";
import type { ScheduledAppointment } from "../../schedule/shiftCollisionEngine.js";
import {
	formatSlotDateRu,
	formatSlotTimeRu,
	isSlotSoftLocked,
	pruneExpiredSoftLocks,
} from "./slotAvailabilityCalculator.js";
import {
	SOFT_LOCK_DEFAULT_TTL_MINUTES,
	createOnlineBookingInputSchema,
	type AcquireSoftLockRequest,
	type AcquireSoftLockResult,
	type AdminNewBookingAlert,
	type BookingDoctorProfile,
	type ClinicBranch,
	type CreateOnlineBookingInput,
	type OnlinePortalBookingResult,
	type PortalBookingPushNotification,
	type SlotSoftLock,
} from "./types.js";

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
	const lockId = `lock-${generateUuidV7()}`;
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
		alertId: generateUuidV7(),
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

	const appointmentId = generateUuidV7();
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
