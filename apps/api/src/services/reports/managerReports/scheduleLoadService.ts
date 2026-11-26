import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import { appointments } from "../../../db/schema.js";
import { inClinicZone, postgresKnowsTimeZone } from "./timezone.js";
import type { ReportScope, ScheduleLoadCell, ScheduleLoadReport } from "./types.js";

/**
 * Загрузка по дням недели и часам (Мандат 8ap).
 * Приведение делается только к поясу, который PostgreSQL знает: иначе `AT TIME ZONE` бросает 22023.
 */
export async function scheduleLoad(
	scope: ReportScope,
	executor?: TenantDb,
): Promise<ScheduleLoadReport> {
	const runQuery = async (tx: TenantDb): Promise<ScheduleLoadReport> => {
		const zone = await postgresKnowsTimeZone(scope.timeZone, tx);
		const localStart = inClinicZone(appointments.startsAt, zone);
		const rows = await tx
			.select({
				weekday: sql<number>`extract(isodow from ${localStart})::int`,
				hour: sql<number>`extract(hour from ${localStart})::int`,
				appointments: sql<number>`count(*)::int`,
				bookedMinutes: sql<number>`coalesce(sum(extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60), 0)::int`,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, scope.organizationId),
					ne(appointments.status, "cancelled"),
					gte(appointments.startsAt, scope.from),
					lte(appointments.startsAt, scope.to),
				),
			)
			.groupBy(
				sql`extract(isodow from ${localStart})`,
				sql`extract(hour from ${localStart})`,
			);

		const cells: ScheduleLoadCell[] = rows
			.map((row) => ({
				weekday: Number(row.weekday),
				hour: Number(row.hour),
				appointments: Number(row.appointments),
				bookedMinutes: Number(row.bookedMinutes),
			}))
			.sort(
				(left, right) => left.weekday - right.weekday || left.hour - right.hour,
			);

		const byWeekday = new Map<number, number>();
		const byHour = new Map<number, number>();
		for (const cell of cells) {
			byWeekday.set(
				cell.weekday,
				(byWeekday.get(cell.weekday) ?? 0) + cell.bookedMinutes,
			);
			byHour.set(cell.hour, (byHour.get(cell.hour) ?? 0) + cell.bookedMinutes);
		}

		const peak = (source: Map<number, number>): number | null => {
			let best: number | null = null;
			let bestValue = -1;
			for (const [key, value] of source) {
				if (value > bestValue) {
					best = key;
					bestValue = value;
				}
			}
			return best;
		};

		return {
			cells,
			busiestWeekday: peak(byWeekday),
			busiestHour: peak(byHour),
			isEmpty: cells.length === 0,
		};
	};

	if (executor) return runQuery(executor);
	return withTenantCtx(scope.organizationId, runQuery);
}
