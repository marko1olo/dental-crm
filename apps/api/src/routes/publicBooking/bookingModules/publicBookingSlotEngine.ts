import { and, eq, gt, inArray, isNotNull, lt, notInArray } from "drizzle-orm";
import type { FastifyReply } from "fastify";
import {
	isReservationMatchingChair,
	parseReservationInstant,
} from "../../../db/appointmentsQueryModules/scheduleReservationLockHelpers.js";
import { withTenantReadCtx, type TenantDb } from "../../../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	doctorShiftRosters,
	organizations,
	scheduleSlotLeases,
	scheduleTimeReservations,
	users,
} from "../../../db/schema.js";
import { FREED_APPOINTMENT_STATUSES } from "../../appointmentErrors.js";
import {
	type PublicSlotDto,
	CLINIC_LINK_DEAD_MESSAGE,
	DEFAULT_SLOT_MINUTES,
	DEFAULT_TIMEZONE,
	dateSchema,
	organizationIdSchema,
} from "./publicBookingSchemas.js";
import {
	type ChairOccupiedInterval,
	intersectWorkingWindows,
	isAnyChairAvailable,
	localWallTimeToUtc,
	resolveDaySchedule,
	resolveDoctorDaySchedule,
} from "../slotAvailabilityEngine.js";

const BOOKABLE_CLINICAL_ROLES = [
	"doctor",
	"owner",
	"head_doctor",
	"chief_doctor",
] as const;

function isBookableClinician(
	role: string | null | undefined,
	clinicMode: string | null | undefined,
	specialties: unknown,
): boolean {
	if (role === "doctor" || role === "head_doctor" || role === "chief_doctor") {
		return true;
	}
	if (role === "owner") {
		if (clinicMode === "solo_doctor" || clinicMode === "one_chair") {
			return true;
		}
		return Array.isArray(specialties) && specialties.length > 0;
	}
	return false;
}

function parseHhMm(value: string | null | undefined): number | null {
	if (!value) return null;
	const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
	if (!m) return null;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	if (hh < 0 || hh > 24 || mm < 0 || mm > 59) return null;
	const total = hh * 60 + mm;
	return total <= 24 * 60 ? total : null;
}

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
 * Enforces clinic schedule, doctor shift rosters & schedule windows, slot leases,
 * double-booking guard, and timezone offsets.
 */
export async function calculateAvailableSlots(
	tx: DatabaseTransaction,
	options: SlotCalculationOptions,
): Promise<SlotCalculationResult> {
	const { organizationId, date, requestedDoctorId } = options;

	const [org] = await tx
		.select({
			clinicSchedule: organizations.clinicSchedule,
			clinicMode: organizations.clinicMode,
		})
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

	// Load target clinical doctors (including solo_doctor owner)
	const doctorConditions = [
		eq(users.organizationId, organizationId),
		inArray(users.role, [...BOOKABLE_CLINICAL_ROLES]),
		eq(users.isActive, true),
	];
	if (requestedDoctorId) {
		doctorConditions.push(eq(users.id, requestedDoctorId));
	}

	const rawDoctors = await tx
		.select({
			id: users.id,
			fullName: users.fullName,
			role: users.role,
			specialties: users.specialties,
			workingHours: users.workingHours,
		})
		.from(users)
		.where(and(...doctorConditions));

	const targetDoctors = rawDoctors.filter((doc) =>
		isBookableClinician(doc.role, org.clinicMode, doc.specialties),
	);

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

	// Load active physical clinic chairs to prevent chair double-booking 409 collisions
	const activeChairs = await tx
		.select({ id: chairs.id, name: chairs.name })
		.from(chairs)
		.where(
			and(
				eq(chairs.organizationId, organizationId),
				eq(chairs.isActive, true),
			),
		);
	const activeChairIds = activeChairs.map((c) => c.id);

	const lockedReservations = await tx
		.select({
			chairName: scheduleTimeReservations.chairName,
			startTime: scheduleTimeReservations.startTime,
			endTime: scheduleTimeReservations.endTime,
		})
		.from(scheduleTimeReservations)
		.where(
			and(
				eq(scheduleTimeReservations.organizationId, organizationId),
				eq(scheduleTimeReservations.bookingLocked, true),
			),
		);

	// Load explicit doctor shift rosters for the target date
	const doctorIds = targetDoctors.map((d) => d.id);
	const dateRosters = await tx
		.select({
			doctorId: doctorShiftRosters.doctorId,
			startTime: doctorShiftRosters.startTime,
			endTime: doctorShiftRosters.endTime,
		})
		.from(doctorShiftRosters)
		.where(
			and(
				eq(doctorShiftRosters.organizationId, organizationId),
				eq(doctorShiftRosters.dateIso, date),
				inArray(doctorShiftRosters.doctorId, doctorIds),
			),
		);

	const rosterIntervalsByDoctor = new Map<
		string,
		Array<{ startMinute: number; endMinute: number }>
	>();
	for (const row of dateRosters) {
		const sMin = parseHhMm(row.startTime);
		const eMin = parseHhMm(row.endTime);
		if (sMin === null || eMin === null || eMin <= sMin) continue;
		const list = rosterIntervalsByDoctor.get(row.doctorId) ?? [];
		list.push({ startMinute: sMin, endMinute: eMin });
		rosterIntervalsByDoctor.set(row.doctorId, list);
	}

	// Load appointments and active slot leases on this date
	const dayStartUtc = localWallTimeToUtc(date, 0, timeZone);
	const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60_000);
	const nowDate = new Date();

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

	const activeLeases = await tx
		.select({
			doctorUserId: scheduleSlotLeases.doctorUserId,
			chairId: scheduleSlotLeases.chairId,
			startsAt: scheduleSlotLeases.startsAt,
			endsAt: scheduleSlotLeases.endsAt,
		})
		.from(scheduleSlotLeases)
		.where(
			and(
				eq(scheduleSlotLeases.organizationId, organizationId),
				gt(scheduleSlotLeases.expiresAt, nowDate),
				lt(scheduleSlotLeases.startsAt, dayEndUtc),
				gt(scheduleSlotLeases.endsAt, dayStartUtc),
			),
		);

	const chairAppointments =
		activeChairIds.length > 0
			? await tx
					.select({
						chairId: appointments.chairId,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							isNotNull(appointments.chairId),
							lt(appointments.startsAt, dayEndUtc),
							gt(appointments.endsAt, dayStartUtc),
							notInArray(appointments.status, [
								...FREED_APPOINTMENT_STATUSES,
							]),
						),
					)
			: [];

	const occupiedChairIntervals: ChairOccupiedInterval[] = chairAppointments
		.filter((a): a is { chairId: string; startsAt: Date; endsAt: Date } => Boolean(a.chairId))
		.map((a) => ({
			chairId: a.chairId,
			startMs: new Date(a.startsAt).getTime(),
			endMs: new Date(a.endsAt).getTime(),
		}));

	for (const lease of activeLeases) {
		if (lease.chairId) {
			occupiedChairIntervals.push({
				chairId: lease.chairId,
				startMs: new Date(lease.startsAt).getTime(),
				endMs: new Date(lease.endsAt).getTime(),
			});
		}
	}

	const globalReservedIntervals: Array<{ startMs: number; endMs: number }> = [];
	for (const res of lockedReservations) {
		const rStartMs = parseReservationInstant(res.startTime, timeZone);
		const rEndMs = parseReservationInstant(res.endTime, timeZone);
		if (rStartMs === null || rEndMs === null || rEndMs <= rStartMs) continue;
		if (rStartMs >= dayEndUtc.getTime() || rEndMs <= dayStartUtc.getTime()) continue;
		if (activeChairs.length === 0) {
			if (isReservationMatchingChair(res.chairName, null)) {
				globalReservedIntervals.push({ startMs: rStartMs, endMs: rEndMs });
			}
		} else {
			for (const ch of activeChairs) {
				if (isReservationMatchingChair(res.chairName, ch.name)) {
					occupiedChairIntervals.push({
						chairId: ch.id,
						startMs: rStartMs,
						endMs: rEndMs,
					});
				}
			}
		}
	}

	const nowMs = Date.now();
	const slotUnionMap = new Map<
		string,
		{ time: string; startsAt: string; endsAt: string; doctorIds: Set<string> }
	>();

	let totalDoctorWindows = 0;

	for (const doctor of targetDoctors) {
		const rosterWindows = rosterIntervalsByDoctor.get(doctor.id);
		const candidateWindows =
			rosterWindows && rosterWindows.length > 0
				? rosterWindows.map((rw) =>
						intersectWorkingWindows(
							clinicDaySchedule,
							{
								isWorking: true,
								startMinute: rw.startMinute,
								endMinute: rw.endMinute,
							},
							slotMinutes,
						),
					)
				: [
						intersectWorkingWindows(
							clinicDaySchedule,
							resolveDoctorDaySchedule(
								doctor.workingHours,
								calendarWeekday,
								clinicDaySchedule,
							),
							slotMinutes,
						),
					];

		const workingWindows = candidateWindows.filter((w) => w.isWorking);
		if (workingWindows.length === 0) {
			continue;
		}

		totalDoctorWindows += 1;
		const doctorApps = existingApps.filter((a) => a.doctorUserId === doctor.id);
		const doctorLeases = activeLeases.filter((l) => l.doctorUserId === doctor.id);

		for (const effectiveWindow of workingWindows) {
			for (
				let minute = effectiveWindow.startMinute;
				minute + slotMinutes <= effectiveWindow.endMinute;
				minute += slotMinutes
			) {
				const slotStart = localWallTimeToUtc(date, minute, timeZone);
				const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);
				const slotStartMs = slotStart.getTime();
				const slotEndMs = slotEnd.getTime();

				if (slotStartMs <= nowMs) continue;

				const globalBlocked = globalReservedIntervals.some(
					(iv) => slotStartMs < iv.endMs && slotEndMs > iv.startMs,
				);
				if (globalBlocked) continue;

				const chairAvailable = isAnyChairAvailable(
					activeChairIds,
					occupiedChairIntervals,
					slotStartMs,
					slotEndMs,
				);
				if (!chairAvailable) {
					continue;
				}

				const isTakenByAppt = doctorApps.some((app) => {
					const appStart = new Date(app.startsAt).getTime();
					const appEnd = new Date(app.endsAt).getTime();
					return slotStartMs < appEnd && slotEndMs > appStart;
				});
				if (isTakenByAppt) continue;

				const isTakenByLease = doctorLeases.some((lease) => {
					const leaseStart = new Date(lease.startsAt).getTime();
					const leaseEnd = new Date(lease.endsAt).getTime();
					return slotStartMs < leaseEnd && slotEndMs > leaseStart;
				});
				if (isTakenByLease) continue;

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
		return { success: true, slots: [] };
	}

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

	return withTenantReadCtx(organizationId, async (tx) => {
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

	return withTenantReadCtx(organizationId, async (tx) => {
		const [organization] = await tx
			.select({
				id: organizations.id,
				clinicMode: organizations.clinicMode,
			})
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);
		if (!organization) {
			return reply.status(404).send({
				error: "ClinicNotFound",
				message: CLINIC_LINK_DEAD_MESSAGE,
			});
		}

		const rawDoctors = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				specialties: users.specialties,
				role: users.role,
			})
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					inArray(users.role, [...BOOKABLE_CLINICAL_ROLES]),
					eq(users.isActive, true),
				),
			)
			.limit(50);

		const doctorsList = rawDoctors
			.filter((doc) =>
				isBookableClinician(doc.role, organization.clinicMode, doc.specialties),
			)
			.map(({ id, fullName, specialties }) => ({
				id,
				fullName,
				specialties,
			}));

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

