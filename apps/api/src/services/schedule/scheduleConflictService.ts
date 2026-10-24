/**
 * scheduleConflictService.ts — Single Source of Truth (SSOT) для проверки конфликтов расписания,
 * пересечений слотов приема врачей и занятости кресел (МАНДАТЫ 8b, 8e, 8n).
 */

import { and, eq, gte, lte, lt, gt, ne, notInArray, or, type SQL } from "drizzle-orm";
import { clinicScheduleDefaultsSchema } from "@dental/shared";
import { areIntervalsOverlapping } from "@dental/shared";
import { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import { appointments, clinics, organizations } from "../../db/schema.js";

export type DbClientOrTx = typeof db | TenantDb;

export const FREED_APPOINTMENT_STATUSES = ["cancelled", "no_show"] as const;

export type FreedAppointmentStatus = (typeof FREED_APPOINTMENT_STATUSES)[number];

export interface CheckConflictParams {
	readonly organizationId: string;
	readonly startsAt: Date;
	readonly endsAt: Date;
	readonly doctorUserId?: string | null | undefined;
	readonly chairId?: string | null | undefined;
	readonly excludeAppointmentId?: string | null | undefined;
}

export interface AppointmentConflictResult {
	readonly hasConflict: boolean;
	readonly conflictType?: "doctor" | "chair" | "both" | undefined;
	readonly conflictingAppointmentId?: string | undefined;
	readonly conflictingDoctorUserId?: string | null | undefined;
	readonly conflictingChairId?: string | null | undefined;
}

/**
 * Проверка пересечения временных интервалов [startA, endA) и [startB, endB).
 * Делегирует в канонический SSOT areIntervalsOverlapping из @dental/shared.
 */
export function hasTimeOverlap(
	startA: Date | number,
	endA: Date | number,
	startB: Date | number,
	endB: Date | number,
): boolean {
	return areIntervalsOverlapping(startA, endA, startB, endB);
}

/**
 * Проверка пересечения временного интервала с существующими активными приемами в БД.
 * Интервал: [startsAt, endsAt)
 * Условие пересечения: appointment.startsAt < reqEnd AND appointment.endsAt > reqStart
 */
export async function checkAppointmentConflict(
	executor: DbClientOrTx,
	params: CheckConflictParams,
): Promise<AppointmentConflictResult> {
	const {
		organizationId,
		startsAt,
		endsAt,
		doctorUserId,
		chairId,
		excludeAppointmentId,
	} = params;

	// Если не указан ни врач, ни кресло — пересечения по ресурсам быть не может
	if (!doctorUserId && !chairId) {
		return { hasConflict: false };
	}

	const resourceConditions: SQL[] = [];
	if (doctorUserId) {
		resourceConditions.push(eq(appointments.doctorUserId, doctorUserId));
	}
	if (chairId) {
		resourceConditions.push(eq(appointments.chairId, chairId));
	}

	const filterConditions = [
		eq(appointments.organizationId, organizationId),
		lt(appointments.startsAt, endsAt),
		gt(appointments.endsAt, startsAt),
		notInArray(appointments.status, [...FREED_APPOINTMENT_STATUSES]),
		or(...resourceConditions)!,
	];

	if (excludeAppointmentId) {
		filterConditions.push(ne(appointments.id, excludeAppointmentId));
	}

	const [conflicting] = await executor
		.select({
			id: appointments.id,
			doctorUserId: appointments.doctorUserId,
			chairId: appointments.chairId,
		})
		.from(appointments)
		.where(and(...filterConditions))
		.limit(1);

	if (!conflicting) {
		return { hasConflict: false };
	}

	const isDoctorConflict = Boolean(
		doctorUserId && conflicting.doctorUserId === doctorUserId,
	);
	const isChairConflict = Boolean(chairId && conflicting.chairId === chairId);

	const conflictType: "doctor" | "chair" | "both" =
		isDoctorConflict && isChairConflict
			? "both"
			: isDoctorConflict
				? "doctor"
				: "chair";

	return {
		hasConflict: true,
		conflictType,
		conflictingAppointmentId: conflicting.id,
		conflictingDoctorUserId: conflicting.doctorUserId,
		conflictingChairId: conflicting.chairId,
	};
}

/**
 * Поиск рекомендованных свободных слотов в расписании на тот же рабочий день при отказе по конфликту.
 *
 * Рабочее окно и часовой пояс читаются из реальной клиники в БД
 * (organizations.clinic_schedule и clinics.timezone). Прежняя версия
 * фильтровала кандидатов захардкоженным окном 08:00–21:00 по UTC и
 * форматировала подсказки через getUTCHours — в клиниках Москвы (UTC+3)
 * подсказки либо пропадали утром, либо показывали смещённое на 3 часа время.
 */
const FALLBACK_WORKDAY_WINDOW = { startHour: 8, endHour: 20 } as const;
const FALLBACK_CLINIC_TIMEZONE = "Europe/Samara";

export interface ClinicWorkdayWindow {
	readonly startHour: number;
	readonly endHour: number;
	readonly timeZone: string;
}

function clockToHour(value: string | undefined): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? "").trim());
	if (!match) return null;
	const hour = Number(match[1]);
	return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

export async function readClinicWorkdayWindow(
	orgId: string,
): Promise<ClinicWorkdayWindow> {
	try {
		const [orgRow] = await db
			.select({ clinicSchedule: organizations.clinicSchedule })
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);
		const [clinicRow] = await db
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, orgId))
			.limit(1);

		const parsed = clinicScheduleDefaultsSchema.safeParse(
			(orgRow?.clinicSchedule as Record<string, unknown> | null) ?? {},
		);
		const startHour = clockToHour(parsed.success ? parsed.data.workdayStart : undefined);
		const endHour = clockToHour(parsed.success ? parsed.data.workdayEnd : undefined);
		const timeZone =
			typeof clinicRow?.timezone === "string" && clinicRow.timezone.trim()
				? clinicRow.timezone.trim()
				: FALLBACK_CLINIC_TIMEZONE;
		return {
			startHour: startHour ?? FALLBACK_WORKDAY_WINDOW.startHour,
			endHour: endHour ?? FALLBACK_WORKDAY_WINDOW.endHour,
			timeZone,
		};
	} catch {
		// Мягкий фолбэк на общесистемное окно клиники: подсказки честнее
		// показывать по системному умолчанию, чем молча пропадать.
		return { ...FALLBACK_WORKDAY_WINDOW, timeZone: FALLBACK_CLINIC_TIMEZONE };
	}
}

function localDatePartsInTimeZone(
	instant: Date,
	timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(instant);
	const read = (type: Intl.DateTimeFormatPart["type"]): number => {
		const raw = parts.find((p) => p.type === type)?.value ?? "0";
		const value = Number(raw);
		return Number.isFinite(value) ? value : 0;
	};
	const hour = read("hour");
	return {
		year: read("year"),
		month: read("month"),
		day: read("day"),
		hour: hour === 24 ? 0 : hour,
		minute: read("minute"),
	};
}

export async function findSuggestedAvailableSlots(
	orgId: string,
	params: {
		doctorUserId?: string | null | undefined;
		chairId?: string | null | undefined;
		startsAt: Date | string;
		endsAt?: Date | string | null | undefined;
	},
): Promise<string[]> {
	try {
		const reqStart = new Date(params.startsAt);
		const reqEnd = params.endsAt
			? new Date(params.endsAt)
			: new Date(reqStart.getTime() + 30 * 60 * 1000);
		const durationMs = Math.max(
			reqEnd.getTime() - reqStart.getTime(),
			15 * 60 * 1000,
		);

		const { startHour, endHour, timeZone } = await readClinicWorkdayWindow(orgId);
		const reqLocal = localDatePartsInTimeZone(reqStart, timeZone);
		const sameLocalDay = (instant: Date): boolean => {
			const local = localDatePartsInTimeZone(instant, timeZone);
			return (
				local.year === reqLocal.year &&
				local.month === reqLocal.month &&
				local.day === reqLocal.day
			);
		};

		// Окно выборки шире суток в обе стороны: перекрывающие день приёмы,
		// начавшиеся прошлым вечером, тоже занимают кресло и врача.
		const dayStart = new Date(reqStart.getTime() - 36 * 60 * 60 * 1000);
		const dayEnd = new Date(reqEnd.getTime() + 36 * 60 * 60 * 1000);

		const dayAppointments = await db
			.select({
				id: appointments.id,
				doctorUserId: appointments.doctorUserId,
				chairId: appointments.chairId,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, orgId),
					gte(appointments.startsAt, dayStart),
					lte(appointments.startsAt, dayEnd),
				),
			);

		const activeAppts = dayAppointments.filter(
			(a) => a.status !== "cancelled" && a.status !== "no_show",
		);

		const formatTime = (d: Date): string => {
			const local = localDatePartsInTimeZone(d, timeZone);
			const hh = String(local.hour).padStart(2, "0");
			const mm = String(local.minute).padStart(2, "0");
			return `${hh}:${mm}`;
		};

		const suggested: string[] = [];
		const stepMs = 30 * 60 * 1000;

		for (let offset = stepMs; offset <= 5 * 60 * 60 * 1000; offset += stepMs) {
			const candStart = new Date(reqStart.getTime() + offset);
			const candEnd = new Date(candStart.getTime() + durationMs);

			if (!sameLocalDay(candStart)) break;

			const candLocal = localDatePartsInTimeZone(candStart, timeZone);
			if (candLocal.hour < startHour || candLocal.hour >= endHour) continue;

			const hasOverlap = activeAppts.some((a) => {
				const timeOverlaps = areIntervalsOverlapping(
					candStart,
					candEnd,
					a.startsAt,
					a.endsAt,
				);
				if (!timeOverlaps) return false;

				const doctorMatches =
					params.doctorUserId && a.doctorUserId === params.doctorUserId;
				const chairMatches =
					params.chairId && a.chairId === params.chairId;
				return Boolean(doctorMatches || chairMatches);
			});

			if (!hasOverlap) {
				suggested.push(formatTime(candStart));
				if (suggested.length >= 3) break;
			}
		}

		return suggested;
	} catch (error) {
		console.error("findSuggestedAvailableSlots error:", error);
		return [];
	}
}
