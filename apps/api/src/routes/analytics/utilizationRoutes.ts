import {
	calculateChairHourlyCost,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq, gte, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { withTenantReadCtx, type TenantDb } from "../../db/rls.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	appointments,
	cashOperations,
	chairs,
	organizations,
} from "../../db/schema.js";
import {
	clinicTimeZone,
	DEFAULT_CLINIC_TIME_ZONE,
} from "../../services/reports/managerReports/timezone.js";
import { instantOfLocalTime } from "../../services/reports/managerReports/periodBounds.js";
import {
	type DoctorProfitabilityItem,
	calculateDoctorProfitability,
} from "./doctorProfitabilityCalculator.js";
import { requireExecutiveAccess } from "./executiveAccessGuard.js";
import {
	calculateWorkingMinutesInPeriod,
	resolveClinicScheduleWorkHours,
	resolveExecutiveDateRange,
} from "./executiveKpiDateUtils.js";
import {
	type HeatmapCell,
	type NoShowHeatmap,
	calculateNoShowHeatmap,
} from "./noShowHeatmapCalculator.js";

export type { DoctorProfitabilityItem, HeatmapCell, NoShowHeatmap };
export { calculateDoctorProfitability, calculateNoShowHeatmap };

export interface ChairUtilizationItem {
	chairId: string | null;
	name: string;
	value: number;
	occupiedMinutes: number;
	availableMinutes: number;
	utilizationPercent: number;
	fill: string;
}

function withDateFilter(orgId: string, orgCol: AnyColumn, dateCol?: AnyColumn, startDate?: Date): SQL {
	if (startDate && dateCol) {
		const combined = and(eq(orgCol, orgId), gte(dateCol, startDate));
		return combined ?? eq(orgCol, orgId);
	}
	return eq(orgCol, orgId);
}

/**
 * 3. Chair Utilization (% времени в кресле от доступного рабочего времени смены)
 */
export async function calculateChairUtilization(
	orgId: string,
	startDate?: Date,
	now: Date = new Date(),
	branchId?: string,
	executor?: TenantDb,
): Promise<{
	chairUtilizationJson: ChairUtilizationItem[];
	chairOccupancyRate: number;
	chairUtilRes: Array<{
		chairId: string | null;
		count: number;
		occupiedMinutes: number;
	}>;
	availableMinutesPerChair: number;
}> {
	const runQuery = async (tx: TenantDb) => {
		const [orgRow] = await tx
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId));
		const clinicScheduleSpec = resolveClinicScheduleWorkHours(orgRow?.clinicSchedule);

		// [ANL-04] Честный расчет рабочих минут кресел по реальному графику клиники
		const effectiveStart = startDate ?? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
		const { availableMinutesPerChair } = calculateWorkingMinutesInPeriod(effectiveStart, now, clinicScheduleSpec);

		const chairConditions: SQL[] = [eq(chairs.organizationId, orgId)];
		if (branchId && branchId !== "all") {
			chairConditions.push(eq(chairs.clinicId, branchId));
		}

		const allChairs = await tx
			.select({ id: chairs.id, name: chairs.name, isActive: chairs.isActive })
			.from(chairs)
			.where(and(...chairConditions));
		const activeChairs = allChairs.filter((c) => c.isActive !== false);
		const totalActiveChairsCount = Math.max(1, activeChairs.length);

		const apptConditions: SQL[] = [
			withDateFilter(orgId, appointments.organizationId, appointments.startsAt, startDate),
		];
		if (branchId && branchId !== "all" && allChairs.length > 0) {
			apptConditions.push(inArray(appointments.chairId, allChairs.map((c) => c.id)));
		}

		const chairUtilRes = await tx
			.select({
				chairId: appointments.chairId,
				count: sql<number>`count(*)::int`,
				occupiedMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`,
			})
			.from(appointments)
			.where(and(...apptConditions))
			.groupBy(appointments.chairId);

		const utilMap = new Map(
			chairUtilRes.map((r) => [r.chairId ?? "unknown", { count: Number(r.count || 0), occupiedMinutes: Number(r.occupiedMinutes || 0) }]),
		);

		const colors = [
			"#8b5cf6",
			"#ec4899",
			"#f59e0b",
			"#10b981",
			"#3b82f6",
			"#06b6d4",
			"#a855f7",
		];

		let colorIdx = 0;
		const chairUtilizationJson: ChairUtilizationItem[] = [];

		for (const chair of activeChairs) {
			const metrics = utilMap.get(chair.id) || { count: 0, occupiedMinutes: 0 };
			const occupiedMinutes = metrics.occupiedMinutes;
			const utilizationPercent =
				availableMinutesPerChair > 0
					? Math.min(
							100,
							Math.round((occupiedMinutes / availableMinutesPerChair) * 1000) / 10,
						)
					: 0;

			chairUtilizationJson.push({
				chairId: chair.id,
				name: chair.name || "Кресло",
				value: metrics.count,
				occupiedMinutes,
				availableMinutes: availableMinutesPerChair,
				utilizationPercent,
				fill: colors[colorIdx % colors.length] ?? "#3b82f6",
			});
			colorIdx++;
		}

		const totalOccupiedMins = chairUtilRes.reduce(
			(sum, r) => sum + Number(r.occupiedMinutes || 0),
			0,
		);
		const totalAvailMins = availableMinutesPerChair * totalActiveChairsCount;
		const chairOccupancyRate =
			totalAvailMins > 0
				? Math.min(100, Math.round((totalOccupiedMins / totalAvailMins) * 1000) / 10)
				: 0;

		return {
			chairUtilizationJson,
			chairOccupancyRate,
			chairUtilRes,
			availableMinutesPerChair,
		};
	};

	if (executor) {
		return runQuery(executor);
	}
	return withTenantReadCtx(orgId, runQuery);
}

const utilizationQuerySchema = z.object({
	range: z.string().optional(),
	monthlyRentRub: z.union([z.string(), z.number()]).optional(),
	monthlyUtilitiesRub: z.union([z.string(), z.number()]).optional(),
	monthlyAdministrativePayrollRub: z.union([z.string(), z.number()]).optional(),
	monthlyEquipmentDepreciationRub: z.union([z.string(), z.number()]).optional(),
	monthlySanpinSterilizationRub: z.union([z.string(), z.number()]).optional(),
	monthlyMarketingAndOtherRub: z.union([z.string(), z.number()]).optional(),
}).strict();
type UtilizationQuery = z.infer<typeof utilizationQuerySchema>;

function sumExpenseCategoryKopecks(
	rows: ReadonlyArray<{
		amountKopecks: bigint | number | null;
		amountRub: number | string | null;
		reasonCode: number | null;
		metadata: unknown;
	}>,
) {
	const totals = {
		rentKopecks: 0,
		utilitiesKopecks: 0,
		payrollKopecks: 0,
		depreciationKopecks: 0,
		sanpinKopecks: 0,
		marketingKopecks: 0,
	};

	for (const row of rows) {
		const kopecks =
			row.amountKopecks != null
				? Number(row.amountKopecks)
				: rublesToKopecks(Number(row.amountRub || 0));
		const meta = row.metadata && typeof row.metadata === "object"
			? (row.metadata as Record<string, unknown>)
			: null;
		const category = typeof meta?.category === "string" ? meta.category : null;
		const reasonCode = row.reasonCode;

		if (category === "rent" || reasonCode === 100) totals.rentKopecks += kopecks;
		if (category === "utilities" || reasonCode === 7 || reasonCode === 10) totals.utilitiesKopecks += kopecks;
		if (category === "salaries" || category === "payroll" || reasonCode === 1) totals.payrollKopecks += kopecks;
		if (category === "equipment_lease" || category === "depreciation") totals.depreciationKopecks += kopecks;
		if (category === "sanpin" || category === "sterilization" || reasonCode === 4) totals.sanpinKopecks += kopecks;
		if (category === "marketing" || reasonCode === 6) totals.marketingKopecks += kopecks;
	}

	return totals;
}

export async function registerUtilizationRoutes(app: FastifyInstance) {
	const getUtilization = async ({
		request,
		reply,
	}: {
		request: FastifyRequest;
		reply: FastifyReply;
	}) => {
		const orgId = await requireExecutiveAccess(request, reply);
		if (!orgId) return;

		const parsedQuery = utilizationQuerySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				success: false,
				error: "ValidationError",
				message:
					parsedQuery.error.issues.map((i) => i.message).join(", ") ||
					"Некорректные параметры запроса загрузки кресел",
			});
		}

		try {
			const query: UtilizationQuery = parsedQuery.data;
			const { range } = query;
			const now = new Date();

			const data = await withTenantReadCtx(orgId, async (tx) => {
				const timeZone = (await clinicTimeZone(orgId, tx)) || DEFAULT_CLINIC_TIME_ZONE;
				let mappedExecPeriod = "month";
				if (range === "today" || range === "day") mappedExecPeriod = "day";
				else if (range === "yesterday") mappedExecPeriod = "yesterday";
				else if (range === "week") mappedExecPeriod = "week";
				else if (range === "month" || range === "last_month" || range === "this_month") mappedExecPeriod = "month";
				else if (range === "quarter" || range === "last_3_months") mappedExecPeriod = "quarter";
				else if (range === "year" || range === "this_year") mappedExecPeriod = "year";

				let startDate = resolveExecutiveDateRange(mappedExecPeriod, undefined, undefined, timeZone).startDate;
				if (range === "last_month") {
					const parts = new Map(
						new Intl.DateTimeFormat("en-CA", {
							timeZone,
							year: "numeric",
							month: "2-digit",
						})
							.formatToParts(now)
							.map((p) => [p.type, p.value] as const),
					);
					const y = Number(parts.get("year") ?? now.getUTCFullYear());
					const m = Number(parts.get("month") ?? now.getUTCMonth() + 1);
					const prevMs = instantOfLocalTime(timeZone, y, m - 1, 1);
					if (prevMs !== null) {
						startDate = new Date(prevMs);
					}
				}

				const chairData = await calculateChairUtilization(orgId, startDate, now, undefined, tx);
				const doctorProfitability = await calculateDoctorProfitability(orgId, startDate, tx);

				const [orgRow] = await tx
					.select({ clinicSchedule: organizations.clinicSchedule })
					.from(organizations)
					.where(eq(organizations.id, orgId));
				const clinicScheduleSpec = resolveClinicScheduleWorkHours(orgRow?.clinicSchedule);

				const hoursPerDay = Math.max(
					4,
					Math.min(
						24,
						Math.round(
							(clinicScheduleSpec.workdayEndMinutes - clinicScheduleSpec.workdayStartMinutes) / 60,
						) || 8,
					),
				);
				const daysPerWeek = Math.max(1, Math.min(7, clinicScheduleSpec.workingDays.size || 5));
				const workingDaysPerMonth = Math.min(31, Math.max(1, Math.round((daysPerWeek * 52) / 12)));
				const activeChairsCount = Math.max(1, chairData.chairUtilizationJson.length);

				const expenseRows = await tx
					.select({
						amountKopecks: cashOperations.amountKopecks,
						amountRub: cashOperations.amountRub,
						reasonCode: cashOperations.reasonCode,
						metadata: cashOperations.metadata,
					})
					.from(cashOperations)
					.where(
						and(
							eq(cashOperations.organizationId, orgId),
							eq(cashOperations.operationType, "expense"),
							gte(cashOperations.createdAt, startDate),
						),
					);
				const actualExpenses = sumExpenseCategoryKopecks(expenseRows);

				const rentRub = query.monthlyRentRub !== undefined ? Math.max(0, Number(query.monthlyRentRub)) : kopecksToRubles(actualExpenses.rentKopecks);
				const utilitiesRub = query.monthlyUtilitiesRub !== undefined ? Math.max(0, Number(query.monthlyUtilitiesRub)) : kopecksToRubles(actualExpenses.utilitiesKopecks);
				const payrollRub = query.monthlyAdministrativePayrollRub !== undefined ? Math.max(0, Number(query.monthlyAdministrativePayrollRub)) : kopecksToRubles(actualExpenses.payrollKopecks);
				const depreciationRub = query.monthlyEquipmentDepreciationRub !== undefined ? Math.max(0, Number(query.monthlyEquipmentDepreciationRub)) : kopecksToRubles(actualExpenses.depreciationKopecks);
				const sanpinRub = query.monthlySanpinSterilizationRub !== undefined ? Math.max(0, Number(query.monthlySanpinSterilizationRub)) : kopecksToRubles(actualExpenses.sanpinKopecks);
				const marketingRub = query.monthlyMarketingAndOtherRub !== undefined ? Math.max(0, Number(query.monthlyMarketingAndOtherRub)) : kopecksToRubles(actualExpenses.marketingKopecks);

				const hourlyEconomics = calculateChairHourlyCost({
					activeChairsCount,
					workingDaysPerMonth,
					workingHoursPerDay: hoursPerDay,
					chairUtilizationRate: Math.max(0, (chairData.chairOccupancyRate || 0) / 100),
					monthlyRentRub: rentRub,
					monthlyUtilitiesRub: utilitiesRub,
					monthlyAdministrativePayrollRub: payrollRub,
					monthlyEquipmentDepreciationRub: depreciationRub,
					monthlySanpinSterilizationRub: sanpinRub,
					monthlyMarketingAndOtherRub: marketingRub,
				});

				return {
					chairUtilizationJson: chairData.chairUtilizationJson,
					chairOccupancyRatePercent: chairData.chairOccupancyRate,
					doctorProfitabilityJson: doctorProfitability,
					chairHourlyCostRub: hourlyEconomics.hourlyCostRealOccupiedRub,
					chairHourlyNominalCostRub: hourlyEconomics.hourlyCostNominalRub,
					chairHourlyCostKopecks: hourlyEconomics.hourlyCostRealOccupiedKopecks,
				};
			});

			return {
				success: true,
				data,
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось рассчитать загрузку кресел");
			return reply.code(503).send({
				success: false,
				error: "UtilizationAnalyticsUnavailable",
				message: "Не удалось рассчитать загрузку кресел. Повторите позже.",
			});
		}
	};

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/analytics/chairs-utilization",
		permission: "public",
		handler: getUtilization,
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/analytics/utilization",
		permission: "public",
		handler: getUtilization,
	});
}
