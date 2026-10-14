import { and, eq, gt, inArray, lt, notInArray } from "drizzle-orm";
import type { FastifyReply } from "fastify";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	appointments,
	clinics,
	organizations,
	users,
} from "../../../db/schema.js";
import { FREED_APPOINTMENT_STATUSES } from "../../../services/schedule/scheduleConflictService.js";
import {
	type PublicSlotDto,
	CLINIC_LINK_DEAD_MESSAGE,
	DEFAULT_SLOT_MINUTES,
	DEFAULT_TIMEZONE,
	dateSchema,
	organizationIdSchema,
} from "./publicBookingSchemas.js";
import {
	intersectWorkingWindows,
	localWallTimeToUtc,
	resolveDaySchedule,
	resolveDoctorDaySchedule,
} from "../slotAvailabilityEngine.js";

export type DatabaseTransaction = TenantDb;

export interface SlotCalculationOptions {
	organizationId: string;
	date: string;
	requestedDoctorId?: string | undefined;
}

export type SlotCalculationResult =
	| {
			success: true;
			slots: PublicSlotDto[];
	  }
	| {
			success: false;
			statusCode: number;
			error: string;
			message: string;
	  };

/**
 * Pure Slot Engine: calculates available schedule slots for an organization and date.
 * Enforces clinic schedule, doctor schedule windows, double-booking guard, and timezone offsets.
 */
export async function calculateAvailableSlots(
	tx: DatabaseTransaction,
	options: SlotCalculationOptions,
): Promise<SlotCalculationResult> {
	const { organizationId, date, requestedDoctorId } = options;

	const [org] = await tx
		.select({ clinicSchedule: organizations.clinicSchedule })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);

	if (!org) {
		return {
			success: false,
			statusCode: 404,
			error: "ClinicNotFound",
			message: CLINIC_LINK_DEAD_MESSAGE,
		};
	}

	const [clinic] = await tx
		.select({ timezone: clinics.timezone })
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);

	const timeZone = clinic?.timezone || DEFAULT_TIMEZONE;
	const schedule = org.clinicSchedule as unknown;
	const slotMinutes = (() => {
		const raw = (schedule as Record<string, unknown> | null)?.defaultVisitMinutes;
		return typeof raw === "number" && raw >= 5 && raw <= 240
			? raw
			: DEFAULT_SLOT_MINUTES;
	})();

	const [wy, wm, wd] = date
		.split("-")
		.map((n) => Number.parseInt(n, 10)) as [number, number, number];
	const calendarWeekday = new Date(Date.UTC(wy, wm - 1, wd)).getUTCDay();
	const clinicDaySchedule = resolveDaySchedule(schedule, calendarWeekday);

	if (!clinicDaySchedule.isWorking) {
		return {
			success: false,
			statusCode: 409,
			error: "ClinicClosedThatDay",
			message: "В этот день клиника не работает. Выберите другую дату.",
		};
	}
	if (clinicDaySchedule.closeMinute <= clinicDaySchedule.openMinute) {
		return {
			success: false,
			statusCode: 409,
			error: "ClinicHoursMisconfigured",
			message:
				"Часы приёма на этот день у клиники заданы неверно. Выберите другую дату или позвоните в клинику.",
		};
	}

	// Load target doctors
	const doctorConditions = [
		eq(users.organizationId, organizationId),
		eq(users.role, "doctor"),
		eq(users.isActive, true),
	];
	if (requestedDoctorId) {
		doctorConditions.push(eq(users.id, requestedDoctorId));
	}

	const targetDoctors = await tx
		.select({
			id: users.id,
			fullName: users.fullName,
			workingHours: users.workingHours,
		})
		.from(users)
		.where(and(...doctorConditions));

	if (targetDoctors.length === 0) {
		if (requestedDoctorId) {
			return {
				success: false,
				statusCode: 404,
				error: "DoctorNotFound",
				message: "Выбранный врач не найден или не принимает в этой клинике.",
			};
		}
		return { success: true, slots: [] };
	}

	// Load appointments on this date
	const dayStartUtc = localWallTimeToUtc(date, 0, timeZone);
	const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60_000);

	const doctorIds = targetDoctors.map((d) => d.id);
	const existingApps = await tx
		.select({
			doctorUserId: appointments.doctorUserId,
			startsAt: appointments.startsAt,
			endsAt: appointments.endsAt,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, organizationId),
				inArray(appointments.doctorUserId, doctorIds),
				lt(appointments.startsAt, dayEndUtc),
				gt(appointments.endsAt, dayStartUtc),
				notInArray(appointments.status, [...FREED_APPOINTMENT_STATUSES]),
			),
		);

	const nowMs = Date.now();
	const slotUnionMap = new Map<
		string,
		{ time: string; startsAt: string; endsAt: string; doctorIds: Set<string> }
	>();

	let totalDoctorWindows = 0;

	for (const doctor of targetDoctors) {
		const doctorWindow = resolveDoctorDaySchedule(
			doctor.workingHours,
			calendarWeekday,
			clinicDaySchedule,
		);

		const effectiveWindow = intersectWorkingWindows(
			clinicDaySchedule,
			doctorWindow,
			slotMinutes,
		);

		if (!effectiveWindow.isWorking) {
			// Doctor is off on this weekday (enabled: false) or intersection is empty -> 0 slots for this doctor
			continue;
		}

		totalDoctorWindows += 1;
		const doctorApps = existingApps.filter((a) => a.doctorUserId === doctor.id);

		for (
			let minute = effectiveWindow.startMinute;
			minute + slotMinutes <= effectiveWindow.endMinute;
			minute += slotMinutes
		) {
			const slotStart = localWallTimeToUtc(date, minute, timeZone);
			const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);

			if (slotStart.getTime() <= nowMs) continue;

			const isTaken = doctorApps.some((app) => {
				const appStart = new Date(app.startsAt).getTime();
				const appEnd = new Date(app.endsAt).getTime();
				return slotStart.getTime() < appEnd && slotEnd.getTime() > appStart;
			});

			if (!isTaken) {
				const startsAtIso = slotStart.toISOString();
				const existingSlot = slotUnionMap.get(startsAtIso);
				if (existingSlot) {
					existingSlot.doctorIds.add(doctor.id);
				} else {
					const hh = Math.floor(minute / 60).toString().padStart(2, "0");
					const mm = (minute % 60).toString().padStart(2, "0");
					slotUnionMap.set(startsAtIso, {
						time: `${hh}:${mm}`,
						startsAt: startsAtIso,
						endsAt: slotEnd.toISOString(),
						doctorIds: new Set([doctor.id]),
					});
				}
			}
		}
	}

	if (requestedDoctorId && totalDoctorWindows === 0) {
		// The requested doctor does not work on this weekday
		return { success: true, slots: [] };
	}

	// Sort chronologically and format
	const sortedSlots: PublicSlotDto[] = Array.from(slotUnionMap.values())
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
		.map((s) => ({
			time: s.time,
			startsAt: s.startsAt,
			endsAt: s.endsAt,
			availableDoctorIds: Array.from(s.doctorIds),
		}));

	return { success: true, slots: sortedSlots };
}

/**
 * Core Slot Generation Handler:
 * Supports both single-doctor queries and multi-doctor union aggregation.
 */
export const handleSlotsQuery = async (
	organizationId: string,
	date: string,
	requestedDoctorId: string | undefined,
	reply: FastifyReply,
) => {
	if (!organizationIdSchema.safeParse(organizationId).success) {
		return reply.status(404).send({
			error: "ClinicLinkInvalid",
			message: CLINIC_LINK_DEAD_MESSAGE,
		});
	}
	if (!dateSchema.safeParse(date).success) {
		return reply.status(400).send({
			error: "BookingDateInvalid",
			message:
				"Дату приёма сервер не разобрал. Выберите корректную дату в формате YYYY-MM-DD.",
		});
	}

	return withTenantCtx(organizationId, async (tx) => {
		const result = await calculateAvailableSlots(tx, {
			organizationId,
			date,
			requestedDoctorId,
		});

		if (!result.success) {
			return reply
				.status(result.statusCode)
				.send({ error: result.error, message: result.message });
		}

		return result.slots;
	});
};

/**
 * Loads bookable doctors for an organization.
 */
export async function handleDoctorList(
	organizationId: string,
	reply: FastifyReply,
) {
	if (!organizationIdSchema.safeParse(organizationId).success) {
		return reply.status(404).send({
			error: "ClinicLinkInvalid",
			message: CLINIC_LINK_DEAD_MESSAGE,
		});
	}

	return withTenantCtx(organizationId, async (tx) => {
		const [organization] = await tx
			.select({ id: organizations.id })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);
		if (!organization) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: CLINIC_LINK_DEAD_MESSAGE,
			});
		}

		const doctorsList = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				specialties: users.specialties,
			})
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(users.role, "doctor"),
					eq(users.isActive, true),
				),
			)
			.limit(50);

		if (doctorsList.length === 0) {
			return reply.status(503).send({
				error: "NoBookableDoctors",
				message:
					"В этой клинике пока нет ни одного врача, открытого для записи через сайт. Позвоните в клинику — там запишут на приём.",
			});
		}

		return doctorsList;
	});
}

