import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import { appointments, chairs, organizations } from "../../../db/schema.js";
import {
	calculateWorkingMinutesInPeriod,
	resolveClinicScheduleWorkHours,
} from "../../../routes/analytics/executiveKpiDateUtils.js";
import type { ChairLoadReport, ChairLoadRow, ReportScope } from "./types.js";

/**
 * Занятость кресел (Мандат 8ap, 8n).
 * Считаются занятые минуты, а процент — от явно названной базы: рабочих дней в периоде на длину рабочего дня.
 */
export async function chairLoad(
	scope: ReportScope,
	options: {
		readonly minutesPerDay?: number;
		readonly workingDaysPerWeek?: number;
	} = {},
	executor?: TenantDb,
): Promise<ChairLoadReport> {
	const runQuery = async (tx: TenantDb): Promise<ChairLoadReport> => {
		let minutesPerDay: number;
		let workingDays: number;
		let totalMinutesPerChair: number;

		if (options.minutesPerDay !== undefined || options.workingDaysPerWeek !== undefined) {
			const mPerDay = Math.max(
				60,
				Math.min(24 * 60, options.minutesPerDay ?? 8 * 60),
			);
			const daysPerWeek = Math.max(
				1,
				Math.min(7, options.workingDaysPerWeek ?? 5),
			);
			const spanDays = Math.max(
				1,
				Math.ceil((scope.to.getTime() - scope.from.getTime()) / 86_400_000),
			);
			workingDays = Math.max(
				1,
				Math.round((spanDays * daysPerWeek) / 7),
			);
			minutesPerDay = mPerDay;
			totalMinutesPerChair = Math.max(60, workingDays * minutesPerDay);
		} else {
			// [ANL-04] Честный расчет от реального графика работы клиники из organizations.clinicSchedule (40ч/нед по умолчанию)
			const [org] = await tx
				.select({ clinicSchedule: organizations.clinicSchedule })
				.from(organizations)
				.where(eq(organizations.id, scope.organizationId));
			const spec = resolveClinicScheduleWorkHours(org?.clinicSchedule);
			const workingCalculation = calculateWorkingMinutesInPeriod(scope.from, scope.to, spec);
			workingDays = Math.max(1, workingCalculation.workingDays);
			totalMinutesPerChair = Math.max(60, workingCalculation.availableMinutesPerChair);
			minutesPerDay = Math.max(60, Math.round(totalMinutesPerChair / workingDays));
		}

		const allChairs = await tx
			.select({ id: chairs.id, name: chairs.name })
			.from(chairs)
			.where(
				and(
					eq(chairs.organizationId, scope.organizationId),
					ne(chairs.isActive, false),
				),
			);
		const chairNames = new Map(allChairs.map((row) => [row.id, row.name]));

		const appRows = await tx
			.select({
				chairId: appointments.chairId,
				appointments: sql<number>`count(*)::int`,
				bookedMinutes: sql<number>`coalesce(sum(extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60), 0)::int`,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, scope.organizationId),
					ne(appointments.status, "cancelled"),
					ne(appointments.status, "no_show"),
					gte(appointments.startsAt, scope.from),
					lte(appointments.startsAt, scope.to),
				),
			)
			.groupBy(appointments.chairId);

		const statsByChair = new Map<string | null, { appointments: number; bookedMinutes: number }>();
		for (const r of appRows) {
			statsByChair.set(r.chairId, {
				appointments: Number(r.appointments || 0),
				bookedMinutes: Number(r.bookedMinutes || 0),
			});
		}

		const result: ChairLoadRow[] = [];

		if (allChairs.length > 0) {
			for (const c of allChairs) {
				const stat = statsByChair.get(c.id) ?? { appointments: 0, bookedMinutes: 0 };
				result.push({
					chairId: c.id,
					chairName: c.name,
					appointments: stat.appointments,
					bookedMinutes: stat.bookedMinutes,
					utilization: Math.max(0, Math.min(1, stat.bookedMinutes / totalMinutesPerChair)),
				});
			}
		} else {
			for (const r of appRows) {
				const bookedMinutes = Number(r.bookedMinutes || 0);
				result.push({
					chairId: r.chairId,
					chairName: r.chairId ? (chairNames.get(r.chairId) ?? "Кресло вне списка") : "Без указания кресла",
					appointments: Number(r.appointments || 0),
					bookedMinutes,
					utilization: r.chairId
						? Math.max(0, Math.min(1, bookedMinutes / totalMinutesPerChair))
						: null,
				});
			}
		}

		const unassigned = statsByChair.get(null);
		if (unassigned && unassigned.appointments > 0 && allChairs.length > 0) {
			result.push({
				chairId: null,
				chairName: "Без указания кресла",
				appointments: unassigned.appointments,
				bookedMinutes: unassigned.bookedMinutes,
				utilization: null,
			});
		}

		result.sort((left, right) => {
			if (left.chairId === null) return 1;
			if (right.chairId === null) return -1;
			return right.bookedMinutes - left.bookedMinutes;
		});

		return {
			rows: result,
			basis: {
				workingDays,
				minutesPerDay,
				totalMinutesPerChair,
				note:
					`Знаменатель: ${workingDays} рабочих дн. × ${Math.round(minutesPerDay / 60)} ч. ` +
					"Отменённые приёмы и неявки в занятые минуты не входят.",
			},
			isEmpty: result.length === 0 || result.every((r) => r.appointments === 0),
		};
	};

	if (executor) return runQuery(executor);
	return withTenantCtx(scope.organizationId, runQuery);
}
