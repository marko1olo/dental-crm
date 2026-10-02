/**
 * scheduleConflictService.ts — Single Source of Truth (SSOT) для проверки конфликтов расписания,
 * пересечений слотов приема врачей и занятости кресел (МАНДАТЫ 8b, 8e, 8n).
 */

import { and, eq, gte, lte, lt, gt, ne, notInArray, or, type SQL } from "drizzle-orm";
import { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import { appointments } from "../../db/schema.js";

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
 */
export function hasTimeOverlap(
	startA: Date | number,
	endA: Date | number,
	startB: Date | number,
	endB: Date | number,
): boolean {
	const sA = typeof startA === "number" ? startA : startA.getTime();
	const eA = typeof endA === "number" ? endA : endA.getTime();
	const sB = typeof startB === "number" ? startB : startB.getTime();
	const eB = typeof endB === "number" ? endB : endB.getTime();
	return sA < eB && eA > sB;
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
 */
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

		const dayStart = new Date(reqStart);
		dayStart.setUTCHours(0, 0, 0, 0);
		const dayEnd = new Date(reqStart);
		dayEnd.setUTCHours(23, 59, 59, 999);

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
			const hh = String(d.getUTCHours()).padStart(2, "0");
			const mm = String(d.getUTCMinutes()).padStart(2, "0");
			return `${hh}:${mm}`;
		};

		const suggested: string[] = [];
		const stepMs = 30 * 60 * 1000;

		for (let offset = stepMs; offset <= 5 * 60 * 60 * 1000; offset += stepMs) {
			const candStart = new Date(reqStart.getTime() + offset);
			const candEnd = new Date(candStart.getTime() + durationMs);

			if (candStart.getUTCDate() !== reqStart.getUTCDate()) break;

			const candHour = candStart.getUTCHours();
			if (candHour >= 21 || candHour < 8) continue;

			const hasOverlap = activeAppts.some((a) => {
				const aStart = new Date(a.startsAt).getTime();
				const aEnd = new Date(a.endsAt).getTime();
				const cStart = candStart.getTime();
				const cEnd = candEnd.getTime();

				const timeOverlaps = cStart < aEnd && cEnd > aStart;
				if (!timeOverlaps) return false;

				const doctorMatches =
					params.doctorUserId && a.doctorUserId === params.doctorUserId;
				const chairMatches =
					params.chairId && a.chairId === params.chairId;
				return doctorMatches || chairMatches;
			});

			if (!hasOverlap) {
				suggested.push(formatTime(candStart));
				if (suggested.length >= 3) break;
			}
		}

		if (suggested.length === 0) {
			const s1 = new Date(reqStart.getTime() + stepMs);
			const s2 = new Date(reqStart.getTime() + 2 * stepMs);
			if (s1.getUTCDate() === reqStart.getUTCDate() && s1.getUTCHours() < 21) {
				suggested.push(formatTime(s1));
			}
			if (s2.getUTCDate() === reqStart.getUTCDate() && s2.getUTCHours() < 21) {
				suggested.push(formatTime(s2));
			}
			if (suggested.length === 0) {
				suggested.push("10:00", "11:00");
			}
			return suggested;
		}

		return suggested;
	} catch {
		const reqStart = new Date(params.startsAt);
		const s1 = new Date(reqStart.getTime() + 30 * 60 * 1000);
		const s2 = new Date(reqStart.getTime() + 60 * 60 * 1000);
		const formatTime = (d: Date) =>
			`${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
		return [formatTime(s1), formatTime(s2)];
	}
}
