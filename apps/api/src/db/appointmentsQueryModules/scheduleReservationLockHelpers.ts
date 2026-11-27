import { and, eq, sql } from "drizzle-orm";
import * as schema from "../schema.js";
import type { DbClientOrTransaction } from "./appointmentValidationHelpers.js";
import { normalizeIsoDateTimeString } from "../../routes/appointments/appointmentsHelpers.js";
import {
	clinicTimeZone,
	DEFAULT_CLINIC_TIME_ZONE,
} from "../../services/reports/managerReports/timezone.js";

/**
 * Каноническая advisory-блокировка ресурсов расписания (Chair -> Doctor).
 * Используется синхронно в slotLeaseRoutes, appointmentsCreateQuery,
 * appointmentsUpdateQuery и publicBooking/bookingMutationService для
 * предотвращения гонок lease vs appointment и дедлоков 40P01.
 */
export async function acquireCanonicalScheduleAdvisoryLocks(
	executor: DbClientOrTransaction,
	organizationId: string,
	resources: {
		chairId?: string | null | undefined;
		chairIds?: readonly (string | null | undefined)[];
		doctorUserId?: string | null | undefined;
		doctorIds?: readonly (string | null | undefined)[];
	},
): Promise<void> {
	if (process.env.DENTAL_STATE_PERSISTENCE === "off") return;

	const chairKeys = Array.from(
		new Set(
			[...(resources.chairIds ?? []), resources.chairId]
				.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
				.map((id) => `chair:${id.trim()}`),
		),
	).sort();

	const doctorKeys = Array.from(
		new Set(
			[...(resources.doctorIds ?? []), resources.doctorUserId]
				.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
				.map((id) => `doctor:${id.trim()}`),
		),
	).sort();

	const lockKeys = [...chairKeys, ...doctorKeys];
	if (lockKeys.length === 0) {
		lockKeys.push("slot-lease");
	}

	for (const lockKey of lockKeys) {
		await executor.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${lockKey}))`,
		);
	}
}

/**
 * Проверяет, относится ли технологический резерв к указанному креслу.
 * Пустое значение, "*", "ALL" и "Все кресла" блокируют все кресла клиники.
 */
export function isReservationMatchingChair(
	reservationChairName: string | null | undefined,
	targetChairName: string | null | undefined,
): boolean {
	const raw = (reservationChairName ?? "").trim();
	if (
		!raw ||
		raw === "*" ||
		raw.toUpperCase() === "ALL" ||
		raw.toLowerCase() === "все кресла"
	) {
		return true;
	}
	if (!targetChairName) {
		return false;
	}
	return raw.toLowerCase() === targetChairName.trim().toLowerCase();
}

export function parseReservationInstant(
	rawTime: string,
	timeZone: string,
): number | null {
	const trimmed = rawTime.trim();
	if (!trimmed) return null;
	const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
	const normalized = hasOffset
		? trimmed
		: normalizeIsoDateTimeString(trimmed, timeZone);
	const ms = Date.parse(normalized);
	return Number.isFinite(ms) ? ms : null;
}

export interface TimeReservationConflict {
	readonly id: string;
	readonly chairName: string;
	readonly note: string;
	readonly startTime: string;
	readonly endTime: string;
}

export async function findConflictingTimeReservation(
	executor: DbClientOrTransaction,
	organizationId: string,
	candidate: {
		startsAt: Date;
		endsAt: Date;
		chairId?: string | null | undefined;
		chairName?: string | null | undefined;
		timeZone?: string | null | undefined;
	},
): Promise<TimeReservationConflict | null> {
	const startMs = candidate.startsAt.getTime();
	const endMs = candidate.endsAt.getTime();
	if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
		return null;
	}

	const rows = await executor
		.select({
			id: schema.scheduleTimeReservations.id,
			chairName: schema.scheduleTimeReservations.chairName,
			startTime: schema.scheduleTimeReservations.startTime,
			endTime: schema.scheduleTimeReservations.endTime,
			bookingLocked: schema.scheduleTimeReservations.bookingLocked,
			note: schema.scheduleTimeReservations.note,
		})
		.from(schema.scheduleTimeReservations)
		.where(
			and(
				eq(schema.scheduleTimeReservations.organizationId, organizationId),
				eq(schema.scheduleTimeReservations.bookingLocked, true),
			),
		);

	if (rows.length === 0) return null;

	let resolvedChairName = candidate.chairName ?? null;
	if (!resolvedChairName && candidate.chairId) {
		const [chairRow] = await executor
			.select({ name: schema.chairs.name })
			.from(schema.chairs)
			.where(
				and(
					eq(schema.chairs.organizationId, organizationId),
					eq(schema.chairs.id, candidate.chairId),
				),
			)
			.limit(1);
		resolvedChairName = chairRow?.name ?? null;
	}

	const zone =
		candidate.timeZone?.trim() ||
		(await clinicTimeZone(organizationId, executor)) ||
		DEFAULT_CLINIC_TIME_ZONE;

	for (const r of rows) {
		if (!isReservationMatchingChair(r.chairName, resolvedChairName)) {
			continue;
		}
		const rStartMs = parseReservationInstant(r.startTime, zone);
		const rEndMs = parseReservationInstant(r.endTime, zone);
		if (rStartMs === null || rEndMs === null) continue;
		if (rStartMs < endMs && rEndMs > startMs) {
			return {
				id: r.id,
				chairName: r.chairName,
				note: r.note,
				startTime: r.startTime,
				endTime: r.endTime,
			};
		}
	}

	return null;
}

export async function assertNoTimeReservationOverlap(
	executor: DbClientOrTransaction,
	organizationId: string,
	candidate: {
		startsAt: Date;
		endsAt: Date;
		chairId?: string | null | undefined;
		chairName?: string | null | undefined;
		timeZone?: string | null | undefined;
	},
): Promise<void> {
	const conflict = await findConflictingTimeReservation(
		executor,
		organizationId,
		candidate,
	);
	if (!conflict) return;

	const reasonSuffix = conflict.note ? ` (${conflict.note})` : "";
	throw new Error(
		`Время уже занято технологическим резервом${reasonSuffix}`,
	);
}
