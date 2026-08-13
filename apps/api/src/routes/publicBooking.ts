import { and, eq, gte, ilike, inArray, lt, notInArray, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	appointments,
	clinics,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import {
	schemaIssuePhrase,
	schemaRefusalMessage,
} from "../utils/schemaRefusalWords.js";

/**
 * Статусы записей, которые НЕ занимают время в расписании.
 */
const FREED_APPOINTMENT_STATUSES = ["cancelled", "no_show"] as const;

// --- Abuse protection for the public (unauthenticated) booking surface ---
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
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

const organizationIdSchema = z.string().uuid("Некорректный ID клиники");
const optionalDoctorIdSchema = z.string().uuid("Некорректный ID врача").optional();

const CLINIC_LINK_DEAD_MESSAGE =
	"Клиника по этой ссылке не найдена: ссылка на онлайн-запись устарела или скопирована не полностью. Откройте запись заново с сайта клиники или позвоните в клинику, чтобы записаться.";

const DEFAULT_TIMEZONE = "Europe/Samara";
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

export interface DaySchedule {
	isWorking: boolean;
	openMinute: number;
	closeMinute: number;
}

export interface DoctorScheduleWindow {
	isWorking: boolean;
	startMinute: number;
	endMinute: number;
}

export interface PublicSlotDto {
	time: string;
	startsAt: string;
	endsAt: string;
	availableDoctorIds: string[];
}

export function clockToMinutes(value: unknown): number | null {
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
 * from the organization clinicSchedule blob.
 */
export function resolveDaySchedule(
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
		const workdayOpen = clockToMinutes(schedule?.workdayStart);
		const workdayClose = clockToMinutes(schedule?.workdayEnd);
		if (
			workdayOpen !== null &&
			workdayClose !== null &&
			workdayClose > workdayOpen
		) {
			const settingsWorkingDays = Array.isArray(schedule?.workingDays)
				? (schedule.workingDays as unknown[]).map((value) => Number(value))
				: null;
			return {
				isWorking:
					settingsWorkingDays && settingsWorkingDays.length > 0
						? settingsWorkingDays.includes(weekday)
						: weekday !== 0,
				openMinute: workdayOpen,
				closeMinute: workdayClose,
			};
		}

		const workHours = schedule?.workHours;
		if (Array.isArray(workHours) && workHours.length === 2) {
			const openHour = Number(workHours[0]);
			const closeHour = Number(workHours[1]);
			const workingDays = Array.isArray(schedule?.workingDays)
				? (schedule.workingDays as unknown[]).map((value) => Number(value))
				: null;
			if (
				Number.isFinite(openHour) &&
				Number.isFinite(closeHour) &&
				closeHour > openHour
			) {
				return {
					isWorking: workingDays
						? workingDays.includes(weekday)
						: weekday !== 0,
					openMinute: Math.round(openHour * 60),
					closeMinute: Math.round(closeHour * 60),
				};
			}
		}

		return {
			isWorking: weekday !== 0,
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

/**
 * Parses a doctor's users.workingHours JSONB blob for a specific weekday.
 *
 * Contract:
 * - If workingHours is null/undefined/empty: doctor defaults to working the clinic's hours.
 * - If workingHours is an array: matches the item where item.weekday === calendarWeekday.
 *   - If item.enabled is false or no entry exists for this weekday -> isWorking = false.
 *   - If item.enabled is true -> isWorking = true, startMinute/endMinute from item.start/item.end.
 */
export function resolveDoctorDaySchedule(
	workingHoursRaw: unknown,
	weekday: number,
	clinicDay: DaySchedule,
): DoctorScheduleWindow {
	if (!clinicDay.isWorking) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	if (!Array.isArray(workingHoursRaw) || workingHoursRaw.length === 0) {
		// Inherit clinic schedule defaults
		return {
			isWorking: true,
			startMinute: clinicDay.openMinute,
			endMinute: clinicDay.closeMinute,
		};
	}

	const entry = workingHoursRaw.find(
		(item) => typeof item === "object" && item !== null && Number(item.weekday) === weekday,
	);

	if (!entry || entry.enabled === false) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	const startMinute = clockToMinutes(entry.start) ?? clinicDay.openMinute;
	const endMinute = clockToMinutes(entry.end) ?? clinicDay.closeMinute;

	if (endMinute <= startMinute) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	return {
		isWorking: true,
		startMinute,
		endMinute,
	};
}

/**
 * Calculates the exact interval intersection between clinic schedule and doctor hours:
 * I_effective = I_clinic ∩ I_doctor
 */
export function intersectWorkingWindows(
	clinicSchedule: DaySchedule,
	doctorWindow: DoctorScheduleWindow,
	slotMinutes: number,
): { isWorking: boolean; startMinute: number; endMinute: number } {
	if (!clinicSchedule.isWorking || !doctorWindow.isWorking) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	const effectiveStart = Math.max(clinicSchedule.openMinute, doctorWindow.startMinute);
	const effectiveEnd = Math.min(clinicSchedule.closeMinute, doctorWindow.endMinute);

	if (effectiveEnd - effectiveStart < slotMinutes) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	return {
		isWorking: true,
		startMinute: effectiveStart,
		endMinute: effectiveEnd,
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

export function timezoneOffsetMinutes(instant: Date, timeZone: string): number {
	try {
		const parts = getOffsetFormatter(timeZone).formatToParts(instant);
		const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
		const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
		if (!match) return 0;
		const sign = match[1] === "-" ? -1 : 1;
		const hours = Number.parseInt(match[2] as string, 10);
		const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
		return sign * (hours * 60 + minutes);
	} catch (err) {
		console.error("[Dente] timezoneOffsetMinutes failed:", err);
		return 0;
	}
}

export function utcToLocalWallTime(
	instant: Date,
	timeZone: string,
): { weekday: number; hours: number; minutes: number } {
	const offset = timezoneOffsetMinutes(instant, timeZone);
	const shifted = new Date(instant.getTime() + offset * 60_000);
	return {
		weekday: shifted.getUTCDay(),
		hours: shifted.getUTCHours(),
		minutes: shifted.getUTCMinutes(),
	};
}

export function localWallTimeToUtc(
	date: string,
	minuteOfDay: number,
	timeZone: string,
): Date {
	const [year, month, day] = date.split("-").map((n) => Number.parseInt(n, 10));
	const hour = Math.floor(minuteOfDay / 60);
	const minute = minuteOfDay % 60;
	const naiveUtc = Date.UTC(
		year as number,
		(month as number) - 1,
		day as number,
		hour,
		minute,
	);
	let offset = timezoneOffsetMinutes(new Date(naiveUtc), timeZone);
	let corrected = naiveUtc - offset * 60_000;
	const refinedOffset = timezoneOffsetMinutes(new Date(corrected), timeZone);
	if (refinedOffset !== offset) {
		offset = refinedOffset;
		corrected = naiveUtc - offset * 60_000;
	}
	return new Date(corrected);
}

function normalizePhoneDigits(phone: string): string {
	const digits = String(phone ?? "").replace(/\D/g, "");
	const national =
		digits.startsWith("8") && digits.length === 11
			? `7${digits.slice(1)}`
			: digits;
	return national.length > 10 ? national.slice(-10) : national;
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

const publicBookingFieldLabels: Record<string, string> = {
	doctorId: "врач",
	startsAt: "начало приёма",
	endsAt: "окончание приёма",
	patientName: "имя пациента",
	patientPhone: "телефон",
	comment: "комментарий",
};

export const registerPublicBookingRoutes = async (server: FastifyInstance) => {
	// 1. Get doctors for an organization
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/doctors",
		async (request, reply) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const { organizationId } = request.params;
			if (!organizationIdSchema.safeParse(organizationId).success) {
				return reply.status(404).send({
					error: "ClinicLinkInvalid",
					message: CLINIC_LINK_DEAD_MESSAGE,
				});
			}

			return withTenantCtx(organizationId, async () => {
				const [organization] = await db
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
		},
	);

	/**
	 * Core Slot Generation Handler:
	 * Supports both single-doctor queries and multi-doctor union aggregation.
	 */
	const handleSlotsQuery = async (
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
				message: "Дату приёма сервер не разобрал. Выберите корректную дату в формате YYYY-MM-DD.",
			});
		}

		return withTenantCtx(organizationId, async (tx) => {
			const [org] = await tx
				.select({ clinicSchedule: organizations.clinicSchedule })
				.from(organizations)
				.where(eq(organizations.id, organizationId))
				.limit(1);

			if (!org) {
				return reply
					.status(404)
					.send({ error: "ClinicNotFound", message: CLINIC_LINK_DEAD_MESSAGE });
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
				return reply.status(409).send({
					error: "ClinicClosedThatDay",
					message: "В этот день клиника не работает. Выберите другую дату.",
				});
			}
			if (clinicDaySchedule.closeMinute <= clinicDaySchedule.openMinute) {
				return reply.status(409).send({
					error: "ClinicHoursMisconfigured",
					message: "Часы приёма на этот день у клиники заданы неверно. Выберите другую дату или позвоните в клинику.",
				});
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
					return reply.status(404).send({
						error: "DoctorNotFound",
						message: "Выбранный врач не найден или не принимает в этой клинике.",
					});
				}
				return [];
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
						gte(appointments.startsAt, dayStartUtc),
						lt(appointments.startsAt, dayEndUtc),
						notInArray(appointments.status, [...FREED_APPOINTMENT_STATUSES]),
					),
				);

			const nowMs = Date.now();
			const slotUnionMap = new Map<string, { time: string; startsAt: string; endsAt: string; doctorIds: Set<string> }>();

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
				return [];
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

			return sortedSlots;
		});
	};

	// 2a. Unified slots endpoint: GET /api/public/booking/:organizationId/slots?date=YYYY-MM-DD[&doctorId=UUID]
	server.get<{
		Params: { organizationId: string };
		Querystring: { date: string; doctorId?: string };
	}>("/:organizationId/slots", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId } = request.params;
		const { date, doctorId } = request.query;

		if (!date) {
			return reply.status(400).send({
				error: "BookingDateMissing",
				message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
			});
		}
		if (doctorId && !optionalDoctorIdSchema.safeParse(doctorId).success) {
			return reply.status(400).send({
				error: "DoctorIdInvalid",
				message: "Некорректный идентификатор врача.",
			});
		}

		return handleSlotsQuery(organizationId, date, doctorId, reply);
	});

	// 2b. Backward-compatible param endpoint: GET /api/public/booking/:organizationId/slots/:doctorId?date=YYYY-MM-DD
	server.get<{
		Params: { organizationId: string; doctorId: string };
		Querystring: { date: string };
	}>("/:organizationId/slots/:doctorId", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId, doctorId } = request.params;
		const { date } = request.query;

		if (!date) {
			return reply.status(400).send({
				error: "BookingDateMissing",
				message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
			});
		}

		return handleSlotsQuery(organizationId, date, doctorId, reply);
	});

	// 3. Book an appointment with strict working hour & collision enforcement
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
		if (!organizationIdSchema.safeParse(organizationId).success) {
			return reply.status(404).send({
				error: "ClinicLinkInvalid",
				message: CLINIC_LINK_DEAD_MESSAGE,
			});
		}

		const parsed = bookingRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректные данные записи",
				message: schemaRefusalMessage({
					issues: parsed.error.issues,
					fieldLabels: publicBookingFieldLabels,
					retryAction: "запись на приём",
					fallbackMessage:
						"Форма записи заполнена не полностью. Заполните врача, дату, время, имя и телефон и повторите запись на приём.",
				}),
				details: parsed.error.issues.map((issue) =>
					schemaIssuePhrase(issue, publicBookingFieldLabels),
				),
			});
		}
		const { doctorId, startsAt, endsAt, patientName, patientPhone, comment } =
			parsed.data;

		const startDate = new Date(startsAt);
		const endDate = new Date(endsAt);

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

		return withTenantCtx(organizationId, async (tenantTx) => {
			const [doctor] = await tenantTx
				.select({
					id: users.id,
					workingHours: users.workingHours,
				})
				.from(users)
				.where(
					and(
						eq(users.id, doctorId),
						eq(users.organizationId, organizationId),
						eq(users.role, "doctor"),
						eq(users.isActive, true),
					),
				)
				.limit(1);

			if (!doctor) {
				return reply.status(404).send({ error: "Врач не найден" });
			}

			// ── Check Clinic & Doctor Working Hours Intersection ──
			const [clinicRow] = await tenantTx
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, organizationId))
				.limit(1);
			const [bookingOrg] = await tenantTx
				.select({ clinicSchedule: organizations.clinicSchedule })
				.from(organizations)
				.where(eq(organizations.id, organizationId))
				.limit(1);

			const bookingTimeZone = clinicRow?.timezone || DEFAULT_TIMEZONE;
			const localDate = utcToLocalWallTime(startDate, bookingTimeZone);
			const bookingDaySchedule = resolveDaySchedule(
				bookingOrg?.clinicSchedule as unknown,
				localDate.weekday,
			);

			if (!bookingDaySchedule.isWorking) {
				return reply.status(409).send({
					error: "В этот день клиника не работает. Выберите другую дату.",
				});
			}

			const doctorWindow = resolveDoctorDaySchedule(
				doctor.workingHours,
				localDate.weekday,
				bookingDaySchedule,
			);

			const effectiveWindow = intersectWorkingWindows(
				bookingDaySchedule,
				doctorWindow,
				1,
			);

			if (!effectiveWindow.isWorking) {
				return reply.status(409).send({
					error: "В этот день выбранный врач не принимает. Выберите другую дату или другого специалиста.",
				});
			}

			const localEnd = utcToLocalWallTime(endDate, bookingTimeZone);
			const startMinute = localDate.hours * 60 + localDate.minutes;
			const endMinute = localEnd.hours * 60 + localEnd.minutes;

			if (
				startMinute < effectiveWindow.startMinute ||
				endMinute > effectiveWindow.endMinute ||
				endMinute <= startMinute
			) {
				return reply.status(409).send({
					error: "Выбранное время вне часов приёма врача. Обновите список слотов.",
				});
			}

			// ── Atomic Collision Check & Appointment Creation ──
			try {
				const result = await tenantTx.transaction(async (tx) => {
					await tx
						.select({ id: users.id })
						.from(users)
						.where(eq(users.id, doctorId))
						.limit(1)
						.for("update");

					const sameDayApps = await tx
						.select({
							startsAt: appointments.startsAt,
							endsAt: appointments.endsAt,
						})
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
								notInArray(appointments.status, [
									...FREED_APPOINTMENT_STATUSES,
								]),
							),
						);

					const hasConflict = sameDayApps.some((app) => {
						const appStart = new Date(app.startsAt).getTime();
						const appEnd = new Date(app.endsAt).getTime();
						return startDate.getTime() < appEnd && endDate.getTime() > appStart;
					});
					if (hasConflict) return { conflict: true as const };

					const phoneDigits = normalizePhoneDigits(patientPhone);
					const [existingByPhone] = await tx
						.select({ id: patients.id })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, organizationId),
								or(
									eq(patients.phone, patientPhone),
									eq(patients.phone, phoneDigits),
								),
							),
						)
						.limit(1);

					let patientId = existingByPhone?.id;

					if (!patientId) {
						const last10 = phoneDigits.slice(-10);
						if (last10.length === 10) {
							const candidates = await tx
								.select({ id: patients.id, phone: patients.phone })
								.from(patients)
								.where(
									and(
										eq(patients.organizationId, organizationId),
										ilike(patients.phone, `%${last10}%`),
									),
								)
								.limit(10);

							const matched = candidates.find(
								(candidate) =>
									normalizePhoneDigits(candidate.phone ?? "") === phoneDigits,
							);
							if (matched) {
								patientId = matched.id;
							}
						}
					}

					if (!patientId) {
						const [createdPatient] = await tx
							.insert(patients)
							.values({
								organizationId,
								fullName: patientName,
								phone: patientPhone,
								status: "active",
							})
							.returning({ id: patients.id });
						if (!createdPatient) throw new Error("patient_insert_failed");
						patientId = createdPatient.id;
					}

					const [created] = await tx
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
					if (!created) throw new Error("appointment_insert_failed");
					return { conflict: false as const, appointment: created };
				});

				if (result.conflict) {
					return reply.status(409).send({
						error: "Выбранное время уже занято. Обновите список слотов.",
					});
				}
				return { success: true, appointment: result.appointment };
			} catch (error) {
				request.log.error(
					{ err: error },
					"[publicBooking] Не удалось создать запись",
				);
				return reply
					.status(500)
					.send({ error: "Не удалось создать запись. Повторите попытку." });
			}
		});
	});
};
