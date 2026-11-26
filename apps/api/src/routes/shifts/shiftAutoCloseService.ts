/**
 * shiftAutoCloseService.ts — Automated Schedule & Duration Shift Closer (Mandates 8e, 8n).
 *
 * Clinical Invariant:
 * If a doctor leaves the clinic without pressing "Close Shift", the shift MUST
 * automatically close at schedule end (+ default 30 min buffer) or upon day rollover,
 * taking Z-report and releasing cashbox locks WITHOUT blocking next working day.
 */

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { kopecksToRub, rublesToKopecks } from "@dental/shared";
import type { TenantDb } from "../../db/rls.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
} from "../../db/schema.js";
import { reconcileSingleShift } from "../cashbox/cashboxShiftModules/shiftReconciliationEngine.js";
import {
	DEFAULT_CLINIC_TIME_ZONE,
	clinicTimeZone,
} from "../../services/reports/managerReports/timezone.js";
import { resolveScheduleDateBounds } from "../appointments/appointmentsQueryRoutes.js";

function formatShiftDateInTimeZone(date: Date, timeZone: string): string {
	try {
		return new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(date);
	} catch {
		return new Intl.DateTimeFormat("en-CA", {
			timeZone: DEFAULT_CLINIC_TIME_ZONE,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(date);
	}
}

export const DEFAULT_SHIFT_BUFFER_MINUTES = 30;
export const DEFAULT_MAX_SHIFT_HOURS = 12;

export interface AutoCloseExpiredShiftsOptions {
	maxHours?: number | undefined;
	bufferMinutesAfterSchedule?: number | undefined;
	now?: Date | undefined;
	force?: boolean | undefined;
}

export interface AutoClosedShiftSummary {
	shiftId: string;
	cashBoxId: string;
	shiftNumber: number;
	openedAt: Date;
	closedAt: Date;
	reason: "past_midnight" | "schedule_ended_with_buffer" | "max_duration_exceeded" | "force";
	zReportNumber: string;
}

/**
 * Checks all open shifts in the organization and automatically closes those
 * that have expired due to:
 * 1. Opened on a previous calendar day (past midnight rollover).
 * 2. Exceeded maximum allowed continuous duration (default: 12 hours).
 * 3. Working schedule has concluded + 30-minute grace buffer with no active patients.
 */
export async function checkAndAutoCloseExpiredShifts(
	tx: TenantDb,
	orgId: string,
	options: AutoCloseExpiredShiftsOptions = {},
): Promise<{
	closedShifts: AutoClosedShiftSummary[];
	hasExpiredShifts: boolean;
}> {
	const now = options.now ?? new Date();
	const maxHours = options.maxHours ?? DEFAULT_MAX_SHIFT_HOURS;
	const bufferMinutes = options.bufferMinutesAfterSchedule ?? DEFAULT_SHIFT_BUFFER_MINUTES;

	const openShifts = await tx
		.select()
		.from(cashBoxShifts)
		.where(
			and(
				eq(cashBoxShifts.organizationId, orgId),
				eq(cashBoxShifts.status, "open"),
			),
		)
		.for("update");

	if (openShifts.length === 0) {
		return { closedShifts: [], hasExpiredShifts: false };
	}

	const zone = (await clinicTimeZone(orgId, tx)) || DEFAULT_CLINIC_TIME_ZONE;
	const nowDateStr = formatShiftDateInTimeZone(now, zone);

	const boxIds = [...new Set(openShifts.map((s) => s.cashBoxId))];
	const boxes = boxIds.length > 0
		? await tx
				.select()
				.from(cashBoxes)
				.where(and(eq(cashBoxes.organizationId, orgId), inArray(cashBoxes.id, boxIds)))
		: [];
	const boxMap = new Map(boxes.map((b) => [b.id, b]));

	const closedSummaries: AutoClosedShiftSummary[] = [];

	for (const shift of openShifts) {
		const openedAt = new Date(shift.openedAt);
		const elapsedMs = now.getTime() - openedAt.getTime();
		const elapsedHours = elapsedMs / (1000 * 60 * 60);

		// Condition 1: Past midnight rollover (opened on a previous calendar day in clinic timezone)
		const shiftDateStr = formatShiftDateInTimeZone(openedAt, zone);
		const isPastMidnight = shiftDateStr < nowDateStr;

		// Condition 2: Max duration exceeded (>= 12 hours)
		const isMaxDurationExceeded = elapsedHours >= maxHours;

		// Condition 3: Schedule ended with buffer check
		let isScheduleEnded = false;
		if (!isPastMidnight && !isMaxDurationExceeded && elapsedHours >= 2) {
			// Query latest appointment on the shift's calendar day in clinic timezone
			const { dayStart: startOfDay, dayEnd: endOfDay } = resolveScheduleDateBounds(
				shiftDateStr,
				zone,
			);

			const dayAppointments = await tx
				.select({
					id: appointments.id,
					status: appointments.status,
					endsAt: appointments.endsAt,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, orgId),
						gte(appointments.startsAt, startOfDay),
						lte(appointments.startsAt, endOfDay),
					),
				)
				.orderBy(desc(appointments.endsAt))
				.limit(20);

			if (dayAppointments.length > 0) {
				const latestAppointment = dayAppointments[0];
				if (latestAppointment?.endsAt) {
					const latestEndMs = new Date(latestAppointment.endsAt).getTime();
					const graceThresholdMs = latestEndMs + bufferMinutes * 60 * 1000;
					// If current time is past the latest appointment + 30 min buffer
					if (now.getTime() >= graceThresholdMs) {
						isScheduleEnded = true;
					}
				}
			}
		}

		const shouldAutoClose =
			Boolean(options.force) ||
			isPastMidnight ||
			isMaxDurationExceeded ||
			isScheduleEnded;

		if (!shouldAutoClose) {
			continue;
		}

		const reason: AutoClosedShiftSummary["reason"] = options.force
			? "force"
			: isPastMidnight
				? "past_midnight"
				: isScheduleEnded
					? "schedule_ended_with_buffer"
					: "max_duration_exceeded";

		const box = boxMap.get(shift.cashBoxId);
		const reconciliationResult = await reconcileSingleShift(
			tx,
			orgId,
			shift,
			box,
			{
				countedCashRub: box?.type === "main" ? undefined : box?.balanceRub,
			},
			shift.openedByUserId,
			now,
		);

		const updatedZReportData = {
			...reconciliationResult.zReportData,
			autoClosedBySchedule: true,
			autoCloseReason: reason,
			autoClosedAt: now.toISOString(),
		};

		const closingBalKop =
			box?.balanceKopecks != null && (box.balanceKopecks !== 0 || Number(box.balanceRub || 0) === 0)
				? Number(box.balanceKopecks)
				: rublesToKopecks(Number(box?.balanceRub ?? 0));
		const incomeKop =
			shift.incomeTotalKopecks !== 0 || Number(shift.incomeTotalRub || 0) === 0
				? Number(shift.incomeTotalKopecks)
				: rublesToKopecks(Number(shift.incomeTotalRub || 0));
		const expenseKop =
			shift.expenseTotalKopecks !== 0 || Number(shift.expenseTotalRub || 0) === 0
				? Number(shift.expenseTotalKopecks)
				: rublesToKopecks(Number(shift.expenseTotalRub || 0));

		await tx
			.update(cashBoxShifts)
			.set({
				status: "closed",
				closedAt: now,
				closedByUserId: shift.openedByUserId,
				closingBalanceRub: kopecksToRub(closingBalKop),
				closingBalanceKopecks: closingBalKop,
				incomeTotalRub: kopecksToRub(incomeKop),
				incomeTotalKopecks: incomeKop,
				expenseTotalRub: kopecksToRub(expenseKop),
				expenseTotalKopecks: expenseKop,
				zReportNumber: reconciliationResult.zReportNumber,
				zReportData: updatedZReportData,
				updatedAt: now,
			})
			.where(
				and(
					eq(cashBoxShifts.id, shift.id),
					eq(cashBoxShifts.organizationId, orgId),
				),
			);

		closedSummaries.push({
			shiftId: shift.id,
			cashBoxId: shift.cashBoxId,
			shiftNumber: shift.shiftNumber,
			openedAt,
			closedAt: now,
			reason,
			zReportNumber: reconciliationResult.zReportNumber,
		});
	}

	if (closedSummaries.length > 0) {
		// Закрываем только реально истекшие приёмы (endsAt <= now), не затрагивая активные приёмы текущего часа
		await tx
			.update(appointments)
			.set({
				status: "completed",
			})
			.where(
				and(
					eq(appointments.organizationId, orgId),
					eq(appointments.status, "in_treatment"),
					lte(appointments.endsAt, now),
				),
			);
	}

	return {
		closedShifts: closedSummaries,
		hasExpiredShifts: closedSummaries.length > 0,
	};
}
