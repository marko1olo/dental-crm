/**
 * chairDutyConflictChecker.ts — Layer 1: Doctor Shift Overlap & Chair Duty Conflict Verification.
 *
 * Implements Mandate 8b & 8e:
 * - Checks overlapping appointments for the doctor within tenant boundary (RLS).
 * - Checks chair occupancy collisions and duty intervals.
 * - Zero logic mutation: exact error message formatting preserved.
 */

import { and, eq, gte, lte, or, ne } from "drizzle-orm";
import { appointments } from "../../../../db/schema.js";
import type { ConflictCheckParams, ConflictCheckResult } from "./types.js";

/**
 * Checks if a doctor already has an overlapping active ("planned") appointment.
 */
export async function checkDoctorOverlaps(
	tx: any,
	orgId: string,
	doctorUserId: string,
	startDate: Date,
	endDate: Date,
	excludeAppointmentId?: string,
): Promise<ConflictCheckResult> {
	const conditions = [
		eq(appointments.organizationId, orgId),
		eq(appointments.doctorUserId, doctorUserId),
		eq(appointments.status, "planned"),
		or(
			and(gte(appointments.startsAt, startDate), lte(appointments.startsAt, endDate)),
			and(gte(appointments.endsAt, startDate), lte(appointments.endsAt, endDate)),
		),
	];

	if (excludeAppointmentId) {
		conditions.push(ne(appointments.id, excludeAppointmentId));
	}

	const overlaps = await tx
		.select({ id: appointments.id })
		.from(appointments)
		.where(and(...conditions))
		.limit(1);

	if (overlaps.length > 0) {
		return {
			hasConflict: true,
			conflictType: "doctor_overlap",
			message: `Врач уже занят в интервале с ${startDate.toISOString().slice(11, 16)} до ${endDate.toISOString().slice(11, 16)}. Выберите другой слот.`,
		};
	}

	return { hasConflict: false };
}

/**
 * Checks if a specific dental chair is occupied during the given interval.
 */
export async function checkChairDutyConflict(
	tx: any,
	orgId: string,
	chairId: string | null | undefined,
	startDate: Date,
	endDate: Date,
	excludeAppointmentId?: string,
): Promise<ConflictCheckResult> {
	if (!chairId) {
		return { hasConflict: false };
	}

	const conditions = [
		eq(appointments.organizationId, orgId),
		eq(appointments.chairId, chairId),
		eq(appointments.status, "planned"),
		or(
			and(gte(appointments.startsAt, startDate), lte(appointments.startsAt, endDate)),
			and(gte(appointments.endsAt, startDate), lte(appointments.endsAt, endDate)),
		),
	];

	if (excludeAppointmentId) {
		conditions.push(ne(appointments.id, excludeAppointmentId));
	}

	const overlaps = await tx
		.select({ id: appointments.id })
		.from(appointments)
		.where(and(...conditions))
		.limit(1);

	if (overlaps.length > 0) {
		return {
			hasConflict: true,
			conflictType: "chair_conflict",
			message: `Кресло ${chairId} уже занято в интервале с ${startDate.toISOString().slice(11, 16)} до ${endDate.toISOString().slice(11, 16)}.`,
		};
	}

	return { hasConflict: false };
}

/**
 * Unified schedule conflict verification. Throws exact error on doctor collision.
 */
export async function assertScheduleBookingNoConflict(
	tx: any,
	params: ConflictCheckParams,
): Promise<void> {
	const doctorResult = await checkDoctorOverlaps(
		tx,
		params.organizationId,
		params.doctorUserId,
		params.startsAt,
		params.endsAt,
		params.excludeAppointmentId,
	);

	if (doctorResult.hasConflict && doctorResult.message) {
		throw new Error(doctorResult.message);
	}

	if (params.chairId) {
		const chairResult = await checkChairDutyConflict(
			tx,
			params.organizationId,
			params.chairId,
			params.startsAt,
			params.endsAt,
			params.excludeAppointmentId,
		);
		if (chairResult.hasConflict && chairResult.message) {
			throw new Error(chairResult.message);
		}
	}
}
