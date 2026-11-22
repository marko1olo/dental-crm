import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments, chairs } from "../../db/schema.js";
import {
	type ClinicWorkingHoursSpec,
	calculateWorkingMinutesInPeriod,
} from "./executiveKpiDateUtils.js";

export interface ScheduleMetricsResult {
	readonly apptSummary: {
		readonly totalAppointments: number;
		readonly attendedCount: number;
		readonly completedCount: number;
		readonly cancelledCount: number;
		readonly noShowCount: number;
		readonly occupiedMinutes: number;
	};
	readonly totalChairs: number;
	readonly totalAvailableMinutes: number;
	readonly availableMinutesPerChair: number;
}

export async function queryScheduleMetrics(
	orgId: string,
	startDate: Date,
	endDate: Date,
	clinicScheduleSpec: ClinicWorkingHoursSpec,
): Promise<ScheduleMetricsResult> {
	const [apptSummaryRow] = await db
		.select({
			totalAppointments: sql<number>`count(*)::int`,
			attendedCount: sql<number>`coalesce(sum(case when ${appointments.status} in ('completed', 'arrived', 'in_treatment') then 1 else 0 end), 0)::int`,
			completedCount: sql<number>`coalesce(sum(case when ${appointments.status} = 'completed' then 1 else 0 end), 0)::int`,
			cancelledCount: sql<number>`coalesce(sum(case when ${appointments.status} = 'cancelled' then 1 else 0 end), 0)::int`,
			noShowCount: sql<number>`coalesce(sum(case when ${appointments.status} = 'no_show' then 1 else 0 end), 0)::int`,
			occupiedMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, orgId),
				gte(appointments.startsAt, startDate),
				lte(appointments.startsAt, endDate),
			),
		);

	const [chairCountRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(chairs)
		.where(eq(chairs.organizationId, orgId));

	const totalChairs = Math.max(1, Number(chairCountRow?.count || 1));
	const { availableMinutesPerChair } = calculateWorkingMinutesInPeriod(startDate, endDate, clinicScheduleSpec);
	const totalAvailableMinutes = totalChairs * availableMinutesPerChair;

	return {
		apptSummary: {
			totalAppointments: Number(apptSummaryRow?.totalAppointments || 0),
			attendedCount: Number(apptSummaryRow?.attendedCount || 0),
			completedCount: Number(apptSummaryRow?.completedCount || 0),
			cancelledCount: Number(apptSummaryRow?.cancelledCount || 0),
			noShowCount: Number(apptSummaryRow?.noShowCount || 0),
			occupiedMinutes: Number(apptSummaryRow?.occupiedMinutes || 0),
		},
		totalChairs,
		totalAvailableMinutes,
		availableMinutesPerChair,
	};
}
