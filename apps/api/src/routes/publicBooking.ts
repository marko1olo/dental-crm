import { and, eq, gte, lt } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import {
	appointments,
	clinics,
	organizations,
	patients,
	users,
} from "../db/schema.js";

// --- Abuse protection for the public (unauthenticated) booking surface ---
// These endpoints are reachable without any token, so they must be rate limited
// to prevent booking spam and unbounded patient/appointment row creation.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = ipRequestCounts.get(ip);
	if (!entry || now > entry.resetAt) {
		ipRequestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты: YYYY-MM-DD");

const DEFAULT_TIMEZONE = "Europe/Samara";
// Fallback working window when a clinic has no configured schedule for the day.
const DEFAULT_OPEN_MINUTE = 9 * 60;
const DEFAULT_CLOSE_MINUTE = 18 * 60;
const DEFAULT_SLOT_MINUTES = 30;

const weekdayKeys = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
] as const;

interface DaySchedule {
	isWorking: boolean;
	openMinute: number;
	closeMinute: number;
}

function clockToMinutes(value: unknown): number | null {
	if (typeof value !== "string") return null;
	const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match) return null;
	const hours = Number.parseInt(match[1] as string, 10);
	const minutes = Number.parseInt(match[2] as string, 10);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
	return hours * 60 + minutes;
}

/**
 * Resolves the working window (in local minutes-of-day) for a given weekday
 * from the org clinicSchedule blob, e.g.
 *   { monday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" }, ... }.
 * Falls back to a 09:00–18:00 open day when the schedule is missing/invalid.
 */
function resolveDaySchedule(
	clinicSchedule: unknown,
	weekday: number,
): DaySchedule {
	const key = weekdayKeys[weekday];
	const schedule =
		clinicSchedule && typeof clinicSchedule === "object"
			? (clinicSchedule as Record<string, unknown>)
			: null;
	const day =
		schedule && key && typeof schedule[key] === "object"
			? (schedule[key] as Record<string, unknown>)
			: null;

	if (!day) {
		return {
			isWorking: true,
			openMinute: DEFAULT_OPEN_MINUTE,
			closeMinute: DEFAULT_CLOSE_MINUTE,
		};
	}

	const openMinute = clockToMinutes(day.startsAt) ?? DEFAULT_OPEN_MINUTE;
	const closeMinute = clockToMinutes(day.endsAt) ?? DEFAULT_CLOSE_MINUTE;
	return {
		isWorking: day.isWorking !== false,
		openMinute,
		closeMinute,
	};
}

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
	const cached = offsetFormatters.get(timeZone);
	if (cached) return cached;
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		timeZoneName: "longOffset",
	});
	offsetFormatters.set(timeZone, formatter);
	return formatter;
}

/**
 * Returns the UTC offset (in minutes) that `timeZone` had at the given instant.
 * Handles DST by probing the actual instant rather than assuming a fixed offset.
 */
function timezoneOffsetMinutes(instant: Date, timeZone: string): number {
	try {
		const parts = getOffsetFormatter(timeZone).formatToParts(instant);
		const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
		const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
		if (!match) return 0;
		const sign = match[1] === "-" ? -1 : 1;
		const hours = Number.parseInt(match[2] as string, 10);
		const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
		return sign * (hours * 60 + minutes);
	} catch {
		return 0;
	}
}

/**
 * Converts a wall-clock time (date + minutes-of-day) in `timeZone` to the exact
 * UTC instant. Resolves the offset at the target instant so DST transitions are
 * respected (offset is re-derived from a first approximation).
 */
function localWallTimeToUtc(
	date: string,
	minuteOfDay: number,
	timeZone: string,
): Date {
	const [year, month, day] = date.split("-").map((n) => Number.parseInt(n, 10));
	const hour = Math.floor(minuteOfDay / 60);
	const minute = minuteOfDay % 60;
	// First approximation: treat the wall time as if it were UTC.
	const naiveUtc = Date.UTC(
		year as number,
		(month as number) - 1,
		day as number,
		hour,
		minute,
	);
	// Derive the offset at that instant, then correct. A second pass absorbs the
	// rare case where the first guess landed on the wrong side of a DST switch.
	let offset = timezoneOffsetMinutes(new Date(naiveUtc), timeZone);
	let corrected = naiveUtc - offset * 60_000;
	const refinedOffset = timezoneOffsetMinutes(new Date(corrected), timeZone);
	if (refinedOffset !== offset) {
		offset = refinedOffset;
		corrected = naiveUtc - offset * 60_000;
	}
	return new Date(corrected);
}

const bookingRequestSchema = z.object({
	doctorId: z.string().uuid("Некорректный идентификатор врача"),
	startsAt: z.string().datetime({ offset: true }),
	endsAt: z.string().datetime({ offset: true }),
	patientName: z.string().trim().min(2).max(120),
	patientPhone: z
		.string()
		.trim()
		.regex(/^\+?[0-9\s\-()]{7,20}$/, "Неверный формат номера телефона"),
	comment: z.string().trim().max(500).optional(),
});

export const registerPublicBookingRoutes = async (server: FastifyInstance) => {
	// 1. Get doctors for an organization
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/doctors",
		async (request, reply) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const { organizationId } = request.params;
			if (!organizationId)
				return reply.status(400).send({ error: "Missing organizationId" });

			const doctorsList = await db
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
					),
				)
				.limit(50);

			return doctorsList;
		},
	);

	// 2. Get available slots for a doctor on a specific date (YYYY-MM-DD)
	server.get<{
		Params: { organizationId: string; doctorId: string };
		Querystring: { date: string };
	}>("/:organizationId/slots/:doctorId", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId, doctorId } = request.params;
		const { date } = request.query;

		if (!organizationId || !doctorId || !date) {
			return reply.status(400).send({ error: "Missing params" });
		}
		if (!dateSchema.safeParse(date).success) {
			return reply.status(400).send({ error: "Формат даты: YYYY-MM-DD" });
		}

		// Resolve the clinic timezone + working schedule so slots reflect the
		// clinic's actual local hours, not a hardcoded UTC 09–18 window.
		const [org] = await db
			.select({ clinicSchedule: organizations.clinicSchedule })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org) {
			return reply.status(404).send({ error: "Организация не найдена" });
		}

		const [clinic] = await db
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);

		const timeZone = clinic?.timezone || DEFAULT_TIMEZONE;
		const schedule = org.clinicSchedule as unknown;
		const slotMinutes = (() => {
			const raw = (schedule as Record<string, unknown> | null)
				?.defaultVisitMinutes;
			return typeof raw === "number" && raw >= 5 && raw <= 240
				? raw
				: DEFAULT_SLOT_MINUTES;
		})();

		// `date` is already the clinic-local calendar date, so the weekday comes
		// straight from it (no timezone math needed for the day-of-week lookup).
		const [wy, wm, wd] = date.split("-").map((n) => Number.parseInt(n, 10)) as [
			number,
			number,
			number,
		];
		const calendarWeekday = new Date(Date.UTC(wy, wm - 1, wd)).getUTCDay();
		const daySchedule = resolveDaySchedule(schedule, calendarWeekday);

		if (
			!daySchedule.isWorking ||
			daySchedule.closeMinute <= daySchedule.openMinute
		) {
			// Clinic closed on this weekday — no slots.
			return [];
		}

		// The clinic day, expressed as a UTC instant range, for the appointment query.
		const dayStartUtc = localWallTimeToUtc(date, 0, timeZone);
		const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60_000);

		const existingApps = await db
			.select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.doctorUserId, doctorId),
					gte(appointments.startsAt, dayStartUtc),
					lt(appointments.startsAt, dayEndUtc),
				),
			);

		const nowMs = Date.now();
		const slots: { time: string; startsAt: string; endsAt: string }[] = [];

		for (
			let minute = daySchedule.openMinute;
			minute + slotMinutes <= daySchedule.closeMinute;
			minute += slotMinutes
		) {
			const slotStart = localWallTimeToUtc(date, minute, timeZone);
			const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);

			// Don't offer slots in the past.
			if (slotStart.getTime() <= nowMs) continue;

			const isTaken = existingApps.some((app) => {
				const appStart = new Date(app.startsAt).getTime();
				const appEnd = new Date(app.endsAt).getTime();
				return slotStart.getTime() < appEnd && slotEnd.getTime() > appStart;
			});

			if (!isTaken) {
				const hh = Math.floor(minute / 60)
					.toString()
					.padStart(2, "0");
				const mm = (minute % 60).toString().padStart(2, "0");
				slots.push({
					time: `${hh}:${mm}`,
					startsAt: slotStart.toISOString(),
					endsAt: slotEnd.toISOString(),
				});
			}
		}

		return slots;
	});

	// 3. Book an appointment
	server.post<{
		Params: { organizationId: string };
		Body: {
			doctorId: string;
			startsAt: string;
			endsAt: string;
			patientName: string;
			patientPhone: string;
			comment?: string;
		};
	}>("/:organizationId/book", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId } = request.params;
		if (!organizationId) {
			return reply.status(400).send({ error: "Missing organizationId" });
		}

		const parsed = bookingRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректные данные записи",
				details: parsed.error.issues.map((i) => i.message),
			});
		}
		const { doctorId, startsAt, endsAt, patientName, patientPhone, comment } =
			parsed.data;

		const startDate = new Date(startsAt);
		const endDate = new Date(endsAt);

		// Reject malformed / illogical time ranges before touching the database.
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			return reply.status(400).send({ error: "Некорректное время записи" });
		}
		if (endDate.getTime() <= startDate.getTime()) {
			return reply
				.status(400)
				.send({ error: "Время окончания должно быть позже начала" });
		}
		const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60_000;
		if (durationMinutes > 8 * 60) {
			return reply
				.status(400)
				.send({ error: "Слишком большая длительность записи" });
		}
		if (startDate.getTime() <= Date.now()) {
			return reply
				.status(400)
				.send({ error: "Нельзя записаться на прошедшее время" });
		}

		// The doctor must belong to this organization. Without this check the
		// public endpoint would let a caller attach appointments to any doctor
		// UUID across organizations.
		const [doctor] = await db
			.select({ id: users.id })
			.from(users)
			.where(
				and(
					eq(users.id, doctorId),
					eq(users.organizationId, organizationId),
					eq(users.role, "doctor"),
				),
			)
			.limit(1);
		if (!doctor) {
			return reply.status(404).send({ error: "Врач не найден" });
		}

		// Reject overlaps with the doctor's existing appointments (double-booking).
		const sameDayApps = await db
			.select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.doctorUserId, doctorId),
					gte(
						appointments.startsAt,
						new Date(startDate.getTime() - 24 * 60 * 60_000),
					),
					lt(
						appointments.startsAt,
						new Date(startDate.getTime() + 24 * 60 * 60_000),
					),
				),
			);
		const hasConflict = sameDayApps.some((app) => {
			const appStart = new Date(app.startsAt).getTime();
			const appEnd = new Date(app.endsAt).getTime();
			return startDate.getTime() < appEnd && endDate.getTime() > appStart;
		});
		if (hasConflict) {
			return reply
				.status(409)
				.send({ error: "Выбранное время уже занято. Обновите список слотов." });
		}

		// Find or create patient
		let patientId: string;
		const existingPatients = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					eq(patients.phone, patientPhone),
				),
			)
			.limit(1);

		const existingPatient = existingPatients[0];
		if (existingPatient) {
			patientId = existingPatient.id;
		} else {
			const newPatient = await db
				.insert(patients)
				.values({
					organizationId,
					fullName: patientName,
					phone: patientPhone,
					status: "active",
				})
				.returning({ id: patients.id });

			const createdPatient = newPatient[0];
			if (!createdPatient) {
				return reply.status(500).send({ error: "Failed to create patient" });
			}
			patientId = createdPatient.id;
		}

		// Create appointment
		const newAppointment = await db
			.insert(appointments)
			.values({
				organizationId,
				patientId,
				doctorUserId: doctorId,
				status: "planned",
				startsAt: startDate,
				endsAt: endDate,
				comment: comment || "Запись через виджет на сайте",
			})
			.returning();

		const appt = newAppointment[0];
		if (!appt) {
			return reply.status(500).send({ error: "Failed to create appointment" });
		}
		return { success: true, appointment: appt };
	});
};
