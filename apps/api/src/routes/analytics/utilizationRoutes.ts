import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	doctorPayrollStatements,
	labOrders,
	payments,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { inClinicZone } from "../../services/reports/managerReports.js";

export interface ChairUtilizationItem {
	chairId: string | null;
	name: string;
	value: number;
	occupiedMinutes: number;
	availableMinutes: number;
	utilizationPercent: number;
	fill: string;
}

export interface DoctorProfitabilityItem {
	doctorId: string | null;
	name: string;
	revenue: number;
	appointmentsCount: number;
	avgTicketRub: number;
	workedHours: number;
	hourlyRevenueRub: number;
	margin: number | null;
	completionRate: number | null;
	services804nCount: number;
	labOrdersCount: number;
	labOrdersCostRub: number;
	doctorPayrollRub: number;
	clinicMarginRub: number;
}

export interface HeatmapCell {
	dayOfWeek: number;
	dayName: string;
	hour: number;
	cancelledCount: number;
	noShowCount: number;
	totalLost: number;
}

export interface NoShowHeatmap {
	totalCancelled: number;
	totalNoShow: number;
	peakDay: string | null;
	peakHour: number | null;
	cells: HeatmapCell[];
}

// biome-ignore lint/suspicious/noExplicitAny: generic column matching helper
function withDateFilter(orgId: string, orgCol: any, dateCol?: any, startDate?: Date) {
	return startDate
		? and(eq(orgCol, orgId), gte(dateCol, startDate))
		: eq(orgCol, orgId);
}

/**
 * 3. Chair Utilization (% времени в кресле от доступного рабочего времени смены)
 */
export async function calculateChairUtilization(
	orgId: string,
	startDate?: Date,
	now: Date = new Date(),
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
	const daysInPeriod = startDate
		? Math.max(
				1,
				Math.ceil(
					(now.getTime() - startDate.getTime()) /
						(1000 * 60 * 60 * 24),
				),
			)
		: 30;
	const availableMinutesPerChair = daysInPeriod * 12 * 60; // 12-часовая рабочая смена

	const chairUtilRes = await db
		.select({
			chairId: appointments.chairId,
			count: sql<number>`count(*)::int`,
			occupiedMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`,
		})
		.from(appointments)
		.where(withDateFilter(orgId, appointments.organizationId, appointments.startsAt, startDate))
		.groupBy(appointments.chairId);

	const allChairs = await db
		.select({ id: chairs.id, name: chairs.name })
		.from(chairs)
		.where(eq(chairs.organizationId, orgId));
	const chairMap = new Map(allChairs.map((c) => [c.id, c.name]));

	const colors = [
		"#8b5cf6",
		"#ec4899",
		"#f59e0b",
		"#10b981",
		"#3b82f6",
		"#06b6d4",
		"#a855f7",
	];
	const chairUtilizationJson: ChairUtilizationItem[] = chairUtilRes
		.map((r, i) => {
			const count = Number(r.count || 0);
			const occupiedMinutes = Number(r.occupiedMinutes || 0);
			const utilizationPercent =
				availableMinutesPerChair > 0
					? Math.min(
							100,
							Math.round(
								(occupiedMinutes / availableMinutesPerChair) * 1000,
							) / 10,
						)
					: 0;
			return {
				chairId: r.chairId ?? null,
				name: r.chairId
					? chairMap.get(r.chairId) || "Кресло"
					: "Основное кресло",
				value: count,
				occupiedMinutes,
				availableMinutes: availableMinutesPerChair,
				utilizationPercent,
				fill: colors[i % colors.length]!,
			};
		})
		.filter((x) => x.value > 0);

	const totalOccupiedMins = chairUtilRes.reduce(
		(sum, r) => sum + Number(r.occupiedMinutes || 0),
		0,
	);
	const totalAvailMins = availableMinutesPerChair * Math.max(1, chairUtilRes.length);
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
}

/**
 * 2. Doctor Profitability — payments and appointments grouped by doctorUserId
 */
export async function calculateDoctorProfitability(
	orgId: string,
	startDate?: Date,
): Promise<DoctorProfitabilityItem[]> {
	const docProfRes = await db
		.select({
			doctorId: appointments.doctorUserId,
			revenue: sql<number>`coalesce(sum(${payments.amountRub}),0)`,
		})
		.from(payments)
		.leftJoin(visits, eq(payments.visitId, visits.id))
		.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
		.where(
			and(
				withDateFilter(orgId, payments.organizationId, payments.createdAt, startDate),
				eq(payments.status, "paid"),
			),
		)
		.groupBy(appointments.doctorUserId);

	const docApptRes = await db
		.select({
			doctorId: appointments.doctorUserId,
			totalAppointments: sql<number>`count(*)::int`,
			completedAppointments: sql<number>`coalesce(sum(case when ${appointments.status} in ('completed', 'arrived', 'in_treatment') then 1 else 0 end), 0)::int`,
			totalMinutes: sql<number>`coalesce(sum(case when ${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (${appointments.endsAt} - ${appointments.startsAt})) / 60 else 0 end), 0)::int`,
		})
		.from(appointments)
		.where(withDateFilter(orgId, appointments.organizationId, appointments.startsAt, startDate))
		.groupBy(appointments.doctorUserId);

	const docApptMap = new Map(
		docApptRes.map((d) => [d.doctorId ?? "unassigned", d]),
	);

	const allDocs = await db
		.select({ id: users.id, fullName: users.fullName })
		.from(users)
		.where(eq(users.organizationId, orgId));
	const docMap = new Map(allDocs.map((d) => [d.id, d.fullName]));

	// 2b. Выработка врачей по номенклатуре 804н (услуги) и сданным нарядам ЗТЛ
	const docServicesRes = await db
		.select({
			doctorId: sql<string | null>`coalesce(${treatmentItems.plannedDoctorUserId}, ${appointments.doctorUserId})`,
			servicesCount: sql<number>`count(*)::int`,
		})
		.from(treatmentItems)
		.innerJoin(visits, eq(treatmentItems.visitId, visits.id))
		.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
		.where(withDateFilter(orgId, treatmentItems.organizationId, visits.createdAt, startDate))
		.groupBy(sql`coalesce(${treatmentItems.plannedDoctorUserId}, ${appointments.doctorUserId})`);
	const docServicesMap = new Map(
		docServicesRes.map((s) => [s.doctorId ?? "unassigned", Number(s.servicesCount || 0)]),
	);

	const docLabRes = await db
		.select({
			doctorId: labOrders.doctorId,
			labOrdersCount: sql<number>`count(*)::int`,
			labOrdersCostRub: sql<number>`coalesce(sum(${labOrders.priceRub}), 0)`,
		})
		.from(labOrders)
		.where(
			and(
				withDateFilter(orgId, labOrders.organizationId, labOrders.createdAt, startDate),
				inArray(labOrders.status, ["completed", "received", "installed"]),
			),
		)
		.groupBy(labOrders.doctorId);
	const docLabMap = new Map(
		docLabRes.map((l) => [l.doctorId ?? "unassigned", Number(l.labOrdersCount || 0)]),
	);
	const docLabCostMap = new Map(
		docLabRes.map((l) => [l.doctorId ?? "unassigned", Number(l.labOrdersCostRub || 0)]),
	);

	// 2c. Зарплатные ведомости Т-51 (начисленные сдельные комиссии врачей)
	const docPayrollRes = await db
		.select({
			doctorId: doctorPayrollStatements.doctorId,
			payrollRub: sql<number>`coalesce(sum(${doctorPayrollStatements.calculatedPieceworkRub}), 0)`,
			labCostRub: sql<number>`coalesce(sum(${doctorPayrollStatements.labCostRub}), 0)`,
			finalPayoutRub: sql<number>`coalesce(sum(${doctorPayrollStatements.netPayoutRub}), 0)`,
		})
		.from(doctorPayrollStatements)
		.where(
			and(
				eq(doctorPayrollStatements.organizationId, orgId),
				startDate
					? gte(
							doctorPayrollStatements.period,
							sql`to_char(${startDate}::date, 'YYYY-MM')`,
						)
					: sql`true`,
			),
		)
		.groupBy(doctorPayrollStatements.doctorId);
	const docPayrollMap = new Map(
		docPayrollRes.map((p) => [p.doctorId, Number(p.payrollRub || 0)]),
	);

	const allDoctorIds = Array.from(
		new Set([
			...docProfRes.map((r) => r.doctorId),
			...docApptRes.map((r) => r.doctorId),
			...docServicesRes.map((r) => r.doctorId),
			...docLabRes.map((r) => r.doctorId),
			...docPayrollRes.map((r) => r.doctorId),
		]),
	);

	return allDoctorIds
		.map((docId) => {
			const prof = docProfRes.find(
				(p) => (p.doctorId ?? null) === (docId ?? null),
			);
			const appt = docApptMap.get(docId ?? "unassigned");
			const revenue = Number(prof?.revenue || 0);
			const appointmentsCount = Number(appt?.totalAppointments || 0);
			const completedCount = Number(appt?.completedAppointments || 0);
			const workedMinutes = Number(appt?.totalMinutes || 0);
			const workedHours = Math.round((workedMinutes / 60) * 10) / 10;
			const avgTicketRub =
				completedCount > 0
					? Math.round(revenue / completedCount)
					: appointmentsCount > 0
						? Math.round(revenue / appointmentsCount)
						: 0;
			const hourlyRevenueRub =
				workedMinutes > 0
					? Math.round(revenue / (workedMinutes / 60))
					: 0;
			const completionRate =
				appointmentsCount > 0
					? Math.round((completedCount / appointmentsCount) * 100)
					: null;
			const services804nCount = docServicesMap.get(docId ?? "unassigned") || 0;
			const labOrdersCount = docLabMap.get(docId ?? "unassigned") || 0;
			const labOrdersCostRub = docLabCostMap.get(docId ?? "unassigned") || 0;
			const recordedPayroll = docId ? (docPayrollMap.get(docId) || 0) : 0;
			const doctorPayrollRub = recordedPayroll > 0
				? recordedPayroll
				: revenue > 0
					? Math.round(Math.max(0, revenue - labOrdersCostRub) * 0.25)
					: 0;
			const clinicMarginRub = revenue > 0
				? revenue - labOrdersCostRub - doctorPayrollRub
				: 0;
			const margin = revenue > 0
				? Math.round((clinicMarginRub / revenue) * 100)
				: null;

			return {
				doctorId: docId ?? null,
				name: docId
					? docMap.get(docId) || "Врач клиники"
					: "Общая касса",
				revenue,
				appointmentsCount,
				avgTicketRub,
				workedHours,
				hourlyRevenueRub,
				margin,
				completionRate,
				services804nCount,
				labOrdersCount,
				labOrdersCostRub,
				doctorPayrollRub,
				clinicMarginRub,
			};
		})
		.filter(
			(x) =>
				x.revenue > 0 ||
				(x.appointmentsCount ?? 0) > 0 ||
				(x.services804nCount ?? 0) > 0 ||
				(x.labOrdersCount ?? 0) > 0 ||
				(x.doctorPayrollRub ?? 0) > 0,
		)
		.sort((a, b) => b.revenue - a.revenue);
}

/**
 * 6. No-Show & Cancellation Heatmap
 */
export async function calculateNoShowHeatmap(
	orgId: string,
	startDate?: Date,
	cohortZone?: string | null,
): Promise<NoShowHeatmap> {
	const noShowTimeBucket = inClinicZone(
		appointments.startsAt,
		cohortZone,
	);
	const dowExpr = sql`extract(isodow from ${noShowTimeBucket})::int`;
	const hourExpr = sql`extract(hour from ${noShowTimeBucket})::int`;

	const noShowRaw = await db
		.select({
			dayOfWeek: dowExpr,
			hour: hourExpr,
			status: appointments.status,
			count: sql<number>`count(*)::int`,
		})
		.from(appointments)
		.where(
			and(
				withDateFilter(orgId, appointments.organizationId, appointments.startsAt, startDate),
				sql`${appointments.status} in ('cancelled', 'no_show')`,
			),
		)
		.groupBy(dowExpr, hourExpr, appointments.status);

	const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
	const DAY_FULL_NAMES = [
		"Понедельник",
		"Вторник",
		"Среда",
		"Четверг",
		"Пятница",
		"Суббота",
		"Воскресенье",
	];

	const matrix = new Map<string, { cancelled: number; noShow: number }>();
	let totalCancelled = 0;
	let totalNoShow = 0;

	for (const row of noShowRaw) {
		const dow = Number(row.dayOfWeek || 1);
		const hr = Number(row.hour || 0);
		const cnt = Number(row.count || 0);
		const key = `${dow}_${hr}`;
		if (!matrix.has(key)) {
			matrix.set(key, { cancelled: 0, noShow: 0 });
		}
		const cell = matrix.get(key)!;
		if (row.status === "cancelled") {
			cell.cancelled += cnt;
			totalCancelled += cnt;
		} else if (row.status === "no_show") {
			cell.noShow += cnt;
			totalNoShow += cnt;
		}
	}

	const heatmapCells: HeatmapCell[] = [];
	let peakLost = 0;
	let peakDayIdx: number | null = null;
	let peakHour: number | null = null;

	for (let dow = 1; dow <= 7; dow++) {
		for (let hr = 8; hr <= 21; hr++) {
			const key = `${dow}_${hr}`;
			const entry = matrix.get(key) || { cancelled: 0, noShow: 0 };
			const totalLost = entry.cancelled + entry.noShow;
			if (totalLost > peakLost) {
				peakLost = totalLost;
				peakDayIdx = dow - 1;
				peakHour = hr;
			}
			heatmapCells.push({
				dayOfWeek: dow,
				dayName: DAY_NAMES[dow - 1] ?? `День ${dow}`,
				hour: hr,
				cancelledCount: entry.cancelled,
				noShowCount: entry.noShow,
				totalLost,
			});
		}
	}

	return {
		totalCancelled,
		totalNoShow,
		peakDay:
			peakDayIdx !== null ? (DAY_FULL_NAMES[peakDayIdx] ?? null) : null,
		peakHour,
		cells: heatmapCells,
	};
}

export async function registerUtilizationRoutes(app: FastifyInstance) {
	app.get("/api/analytics/utilization", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"utilization analytics",
		);
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"utilization analytics",
		);
		if (!orgId) return;

		try {
			const { range } = request.query as { range?: string };
			let startDate: Date | undefined;
			const now = new Date();

			if (range === "today") {
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
			} else if (range === "week") {
				const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
			} else if (range === "month" || range === "last_month") {
				startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			} else if (range === "quarter" || range === "last_3_months") {
				const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
				startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
			} else if (range === "year" || range === "this_year") {
				startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
			}

			const chairData = await calculateChairUtilization(orgId, startDate, now);
			const doctorProfitability = await calculateDoctorProfitability(orgId, startDate);

			return {
				success: true,
				data: {
					chairUtilizationJson: chairData.chairUtilizationJson,
					chairOccupancyRatePercent: chairData.chairOccupancyRate,
					doctorProfitabilityJson: doctorProfitability,
				},
			};
		} catch (e) {
			request.log.error({ err: e }, "Не удалось рассчитать загрузку кресел");
			return reply.code(503).send({
				success: false,
				error: "UtilizationAnalyticsUnavailable",
				message: "Не удалось рассчитать загрузку кресел. Повторите позже.",
			});
		}
	});
}
