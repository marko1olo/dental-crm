import { and, asc, eq, gt, lt, ne } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	doctorShiftRosters,
	scheduleTimeReservations,
	users,
} from "../../db/schema.js";
import { DEFAULT_CLINIC_TIME_ZONE } from "../../services/reports/managerReports/timezone.js";

const nextFreeSlotsQuerySchema = z
	.object({
		doctorId: z.string().uuid("Некорректный идентификатор врача (ожидается UUID)"),
		offsetsDays: z.string().trim().optional().default("5,7,14,180"),
		durationMinutes: z.coerce.number().int().min(10).max(480).default(30),
	})
	.strict();

export interface NextFreeSlotCandidate {
	offsetDays: number;
	targetDate: string;
	actualDate: string;
	startsAt: string;
	endsAt: string;
	localTime: string;
	durationMinutes: number;
	chairId: string | null;
	chairName: string | null;
	doctorId: string;
	doctorName: string;
}

function resolveSafeTimeZone(rawTimeZone: string | null | undefined): string {
	const candidate = (rawTimeZone || "").trim() || DEFAULT_CLINIC_TIME_ZONE;
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: candidate });
		return candidate;
	} catch {
		return DEFAULT_CLINIC_TIME_ZONE;
	}
}

function formatCalendarDateInZone(date: Date, timeZone: string): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

function zonedWallClockToUtc(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	timeZone: string,
): Date {
	const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
	const dtf = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	const getOffsetMs = (ms: number): number => {
		const parts = dtf.formatToParts(new Date(ms));
		const map: Record<string, number> = {};
		for (const part of parts) {
			if (part.type !== "literal") {
				map[part.type] = Number.parseInt(part.value, 10);
			}
		}
		const h = map.hour === 24 ? 0 : (map.hour ?? 0);
		const wallMs = Date.UTC(
			map.year ?? year,
			(map.month ?? month) - 1,
			map.day ?? day,
			h,
			map.minute ?? minute,
			map.second ?? 0,
		);
		return wallMs - ms;
	};
	const offset1 = getOffsetMs(utcGuessMs);
	const offset2 = getOffsetMs(utcGuessMs - offset1);
	return new Date(utcGuessMs - offset2);
}

function parseHhMmToMinutes(value: string | null | undefined): number | null {
	if (!value || typeof value !== "string") return null;
	const parts = value.split(":").map(Number);
	const h = parts[0];
	const m = parts[1];
	if (
		h === undefined ||
		m === undefined ||
		!Number.isFinite(h) ||
		!Number.isFinite(m) ||
		h < 0 ||
		h > 23 ||
		m < 0 ||
		m > 59
	) {
		return null;
	}
	return h * 60 + m;
}

function parseOffsetsList(raw: string): number[] | null {
	const tokens = raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	if (tokens.length === 0) return [5, 7, 14, 180];
	const result: number[] = [];
	for (const token of tokens.slice(0, 6)) {
		if (!/^\d+$/.test(token)) return null;
		const parsed = Number.parseInt(token, 10);
		if (!Number.isFinite(parsed) || parsed < 0 || parsed > 365) return null;
		if (!result.includes(parsed)) {
			result.push(parsed);
		}
	}
	return result;
}

function doesReservationMatchChair(
	reservationChairName: string,
	chair: { id: string; name: string } | null,
): boolean {
	const normalized = reservationChairName.trim().toLowerCase();
	if (
		!normalized ||
		normalized === "*" ||
		normalized === "all" ||
		normalized === "все кресла"
	) {
		return true;
	}
	if (!chair) return false;
	return (
		normalized === chair.name.trim().toLowerCase() ||
		normalized === chair.id.trim().toLowerCase()
	);
}

/**
 * GET /api/appointments/next-free-slots
 * Подбор 3–4 реальных ближайших свободных окон врача на горизонте offsetsDays
 * с учётом графика врача, занятых приёмов и технологических резервов scheduleTimeReservations.
 */
export async function handleGetNextFreeSlots(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalReadContext(
		request,
		reply,
		"appointments next-free-slots",
	);
	if (!context) return reply;
	const orgId = context.organizationId;

	const parsedQuery = nextFreeSlotsQuerySchema.safeParse(request.query ?? {});
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				parsedQuery.error.issues[0]?.message ??
				"Некорректные параметры поиска свободных окон врача.",
			issues: parsedQuery.error.issues,
		});
	}

	const { doctorId, offsetsDays: offsetsRaw, durationMinutes } = parsedQuery.data;
	const offsets = parseOffsetsList(offsetsRaw);
	if (!offsets) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				"Параметр offsetsDays должен содержать целые числа от 0 до 365 через запятую.",
		});
	}

	const outcome = await withTenantCtx(orgId, async (tx) => {
		const [doctor] = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				workingHours: users.workingHours,
				isActive: users.isActive,
			})
			.from(users)
			.where(and(eq(users.organizationId, orgId), eq(users.id, doctorId)))
			.limit(1);

		if (!doctor) {
			return { kind: "doctor_not_found" as const };
		}

		const [clinic] = await tx
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, orgId))
			.limit(1);
		const clinicTimeZone = resolveSafeTimeZone(clinic?.timezone);

		const activeChairs = await tx
			.select({ id: chairs.id, name: chairs.name })
			.from(chairs)
			.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
			.orderBy(asc(chairs.name));

		const rosters = await tx
			.select({
				dateIso: doctorShiftRosters.dateIso,
				startTime: doctorShiftRosters.startTime,
				endTime: doctorShiftRosters.endTime,
				chairId: doctorShiftRosters.chairId,
			})
			.from(doctorShiftRosters)
			.where(
				and(
					eq(doctorShiftRosters.organizationId, orgId),
					eq(doctorShiftRosters.doctorId, doctorId),
				),
			);

		const rosterByDate = new Map<
			string,
			Array<{ startMin: number; endMin: number; chairId: string | null }>
		>();
		for (const r of rosters) {
			const sMin = parseHhMmToMinutes(r.startTime);
			const eMin = parseHhMmToMinutes(r.endTime);
			if (sMin === null || eMin === null || eMin <= sMin) continue;
			const list = rosterByDate.get(r.dateIso) ?? [];
			list.push({ startMin: sMin, endMin: eMin, chairId: r.chairId ?? null });
			rosterByDate.set(r.dateIso, list);
		}

		const reservations = await tx
			.select()
			.from(scheduleTimeReservations)
			.where(
				and(
					eq(scheduleTimeReservations.organizationId, orgId),
					eq(scheduleTimeReservations.bookingLocked, true),
				),
			);

		const now = new Date();
		const todayClinicStr = formatCalendarDateInZone(now, clinicTimeZone);
		const todayParts = todayClinicStr.split("-").map(Number);
		const baseUtcDay = new Date(
			Date.UTC(todayParts[0] ?? 2026, (todayParts[1] ?? 1) - 1, todayParts[2] ?? 1),
		);

		const minOffset = Math.min(...offsets);
		const maxOffset = Math.max(...offsets) + 7;
		const scanRangeStart = new Date(baseUtcDay.getTime() + minOffset * 86_400_000 - 86_400_000);
		const scanRangeEnd = new Date(baseUtcDay.getTime() + (maxOffset + 2) * 86_400_000);

		const existingAppts = await tx
			.select({
				id: appointments.id,
				doctorUserId: appointments.doctorUserId,
				chairId: appointments.chairId,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, orgId),
					ne(appointments.status, "cancelled"),
					ne(appointments.status, "no_show"),
					lt(appointments.startsAt, scanRangeEnd),
					gt(appointments.endsAt, scanRangeStart),
				),
			);

		const resolveDoctorIntervalsForDate = (
			dateIso: string,
			dayOfWeek: number,
		): Array<{ startMin: number; endMin: number; preferredChairId: string | null }> => {
			const dayRoster = rosterByDate.get(dateIso);
			if (dayRoster && dayRoster.length > 0) {
				return dayRoster.map((item) => ({
					startMin: item.startMin,
					endMin: item.endMin,
					preferredChairId: item.chairId,
				}));
			}

			if (Array.isArray(doctor.workingHours)) {
				interface WorkingHourItem {
					weekday?: number;
					enabled?: boolean;
					start?: string;
					end?: string;
				}
				const dayConf = (doctor.workingHours as WorkingHourItem[]).find(
					(d) => d && typeof d === "object" && d.weekday === dayOfWeek,
				);
				if (dayConf) {
					if (!dayConf.enabled) return [];
					const sMin = parseHhMmToMinutes(dayConf.start) ?? 9 * 60;
					const eMin = parseHhMmToMinutes(dayConf.end) ?? 20 * 60;
					return eMin > sMin ? [{ startMin: sMin, endMin: eMin, preferredChairId: null }] : [];
				}
			}

			if (dayOfWeek === 6) {
				return [{ startMin: 10 * 60, endMin: 18 * 60, preferredChairId: null }];
			}
			if (dayOfWeek === 7) {
				return [{ startMin: 10 * 60, endMin: 16 * 60, preferredChairId: null }];
			}
			return [{ startMin: 9 * 60, endMin: 20 * 60, preferredChairId: null }];
		};

		const foundSlots: NextFreeSlotCandidate[] = [];
		const minLeadTimeMs = now.getTime() + 15 * 60_000;
		const stepMinutes = 30;

		for (const offsetDays of offsets) {
			if (foundSlots.length >= 4) break;
			const targetDateObj = new Date(baseUtcDay.getTime() + offsetDays * 86_400_000);
			const targetDateStr = targetDateObj.toISOString().slice(0, 10);

			let matchedSlot: NextFreeSlotCandidate | null = null;

			for (let lookahead = 0; lookahead <= 7 && !matchedSlot; lookahead++) {
				const candidateDay = new Date(targetDateObj.getTime() + lookahead * 86_400_000);
				const year = candidateDay.getUTCFullYear();
				const month = candidateDay.getUTCMonth() + 1;
				const day = candidateDay.getUTCDate();
				const actualDateStr = candidateDay.toISOString().slice(0, 10);
				const dayOfWeek = candidateDay.getUTCDay() === 0 ? 7 : candidateDay.getUTCDay();

				const intervals = resolveDoctorIntervalsForDate(actualDateStr, dayOfWeek);
				for (const interval of intervals) {
					if (matchedSlot) break;
					for (
						let slotMin = interval.startMin;
						slotMin + durationMinutes <= interval.endMin;
						slotMin += stepMinutes
					) {
						const slotStart = zonedWallClockToUtc(
							year,
							month,
							day,
							Math.floor(slotMin / 60),
							slotMin % 60,
							clinicTimeZone,
						);
						const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

						if (slotStart.getTime() < minLeadTimeMs) continue;

						// Проверка занятости врача приёмами
						const doctorBusy = existingAppts.some(
							(a) =>
								a.doctorUserId === doctorId &&
								a.startsAt < slotEnd &&
								a.endsAt > slotStart,
						);
						if (doctorBusy) continue;

						// Проверка доступного кресла и отсутствия блокировок scheduleTimeReservations
						let chosenChair: { id: string; name: string } | null = null;

						if (activeChairs.length > 0) {
							const orderedChairs = interval.preferredChairId
								? [
										...activeChairs.filter((c) => c.id === interval.preferredChairId),
										...activeChairs.filter((c) => c.id !== interval.preferredChairId),
									]
								: activeChairs;

							const freeChair = orderedChairs.find((ch) => {
								const chairBusyByAppt = existingAppts.some(
									(a) =>
										a.chairId === ch.id &&
										a.startsAt < slotEnd &&
										a.endsAt > slotStart,
								);
								if (chairBusyByAppt) return false;

								const chairLockedByReservation = reservations.some((r) => {
									if (!doesReservationMatchChair(r.chairName, ch)) return false;
									const rStart = Date.parse(r.startTime);
									const rEnd = Date.parse(r.endTime);
									if (!Number.isFinite(rStart) || !Number.isFinite(rEnd)) return false;
									return rStart < slotEnd.getTime() && rEnd > slotStart.getTime();
								});
								return !chairLockedByReservation;
							});

							if (!freeChair) continue;
							chosenChair = freeChair;
						} else {
							const generalLocked = reservations.some((r) => {
								if (!doesReservationMatchChair(r.chairName, null)) return false;
								const rStart = Date.parse(r.startTime);
								const rEnd = Date.parse(r.endTime);
								if (!Number.isFinite(rStart) || !Number.isFinite(rEnd)) return false;
								return rStart < slotEnd.getTime() && rEnd > slotStart.getTime();
							});
							if (generalLocked) continue;
						}

						const hh = String(Math.floor(slotMin / 60)).padStart(2, "0");
						const mm = String(slotMin % 60).padStart(2, "0");
						matchedSlot = {
							offsetDays,
							targetDate: targetDateStr,
							actualDate: actualDateStr,
							startsAt: slotStart.toISOString(),
							endsAt: slotEnd.toISOString(),
							localTime: `${hh}:${mm}`,
							durationMinutes,
							chairId: chosenChair?.id ?? null,
							chairName: chosenChair?.name ?? null,
							doctorId: doctor.id,
							doctorName: doctor.fullName,
						};
						break;
					}
				}
			}

			if (matchedSlot) {
				foundSlots.push(matchedSlot);
			}
		}

		return {
			kind: "ok" as const,
			doctorName: doctor.fullName,
			slots: foundSlots,
		};
	});

	if (outcome.kind === "doctor_not_found") {
		return reply.code(404).send({
			error: "DoctorNotFound",
			message: "Врач не найден в текущей клинике.",
		});
	}

	return reply.code(200).send({
		success: true,
		doctorId,
		doctorName: outcome.doctorName,
		durationMinutes,
		data: outcome.slots,
		slots: outcome.slots,
	});
}
