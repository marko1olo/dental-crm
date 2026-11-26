import { and, eq, gte, lte, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import { appointments } from "../../../db/schema.js";
import type { AppointmentFunnelReport, ReportScope } from "./types.js";

/**
 * Воронка статусов приёмов (Мандат 8ap).
 */
export async function appointmentFunnel(
	scope: ReportScope,
	executor?: TenantDb,
): Promise<AppointmentFunnelReport> {
	const runQuery = async (tx: TenantDb): Promise<AppointmentFunnelReport> => {
		const rows = await tx
			.select({ status: appointments.status, total: sql<number>`count(*)::int` })
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, scope.organizationId),
					gte(appointments.startsAt, scope.from),
					lte(appointments.startsAt, scope.to),
				),
			)
			.groupBy(appointments.status);

		const byStatus: Record<string, number> = {};
		let total = 0;
		for (const row of rows) {
			byStatus[row.status] = Number(row.total);
			total += Number(row.total);
		}

		const share = (value: number) => (total > 0 ? value / total : null);
		const arrived =
			(byStatus.arrived ?? 0) +
			(byStatus.in_treatment ?? 0) +
			(byStatus.completed ?? 0);
		const cancelled = byStatus.cancelled ?? 0;
		const noShow = byStatus.no_show ?? 0;

		return {
			byStatus,
			total,
			arrivalRate: share(arrived),
			completionRate: share(byStatus.completed ?? 0),
			cancellationRate: share(cancelled),
			noShowRate: share(noShow),
			lostAppointments: cancelled + noShow,
			isEmpty: total === 0,
		};
	};

	if (executor) return runQuery(executor);
	return withTenantCtx(scope.organizationId, runQuery);
}
