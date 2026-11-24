import {
	calculateChairHourlyCost,
	calculateDoctorPeriodPayroll,
	calculatePercentDiscountKopecks,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq, gte, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	cashOperations,
	chairs,
	doctorCommissions,
	doctorPayrollStatements,
	inventoryTransactions,
	labOrders,
	organizations,
	patientInvoices,
	payments,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { fetchDoctorPayrollDataset, normalizeClinicalCategory } from "../doctorPayrollDbQueries.js";
import {
	calculateWorkingMinutesInPeriod,
	resolveClinicScheduleWorkHours,
} from "./executiveKpiQuery.js";

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
	revenueKopecks?: number | undefined;
	appointmentsCount: number;
	avgTicketRub: number;
	avgTicketKopecks?: number | undefined;
	workedHours: number;
	hourlyRevenueRub: number;
	hourlyRevenueKopecks?: number | undefined;
	margin: number | null;
	completionRate: number | null;
	servicesCount: number;
	catalogServicesCount?: number | undefined;
	services804nCount?: number | undefined;
	labOrdersCount: number;
	labOrdersCostRub: number;
	labOrdersCostKopecks?: number | undefined;
	materialsCostRub?: number | undefined;
	materialsCostKopecks?: number | undefined;
	doctorPayrollRub: number;
	doctorPayrollKopecks?: number | undefined;
	clinicMarginRub: number;
	clinicMarginKopecks?: number | undefined;
}

import {
	type HeatmapCell,
	type NoShowHeatmap,
	calculateNoShowHeatmap,
} from "./noShowHeatmapCalculator.js";

export type { HeatmapCell, NoShowHeatmap };
export { calculateNoShowHeatmap };

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
	const [orgRow] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, orgId));
	const clinicScheduleSpec = resolveClinicScheduleWorkHours(orgRow?.clinicSchedule);

	// [ANL-04] Честный расчет рабочих минут кресел по реальному графику клиники (40ч/нед по умолчанию) вместо 84ч/нед
	const effectiveStart = startDate ?? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
	const { availableMinutesPerChair } = calculateWorkingMinutesInPeriod(effectiveStart, now, clinicScheduleSpec);

	const chairConditions: SQL[] = [eq(chairs.organizationId, orgId)];
	if (branchId && branchId !== "all") {
		chairConditions.push(eq(chairs.clinicId, branchId));
	}

	const allChairs = await db
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

	const chairUtilRes = await db
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
}

/**
 * 2. Doctor Profitability — payments and appointments grouped by doctorUserId
 */
export async function calculateDoctorProfitability(
	orgId: string,
	startDate?: Date,
): Promise<DoctorProfitabilityItem[]> {
	// [SEV-3.1] Прямое суммирование копеек amountKopecks
	const paymentKopExpr = sql`coalesce(${payments.amountKopecks}, 0)::bigint`;
	const docProfRes = await db
		.select({
			doctorId: appointments.doctorUserId,
			revenueKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopExpr} when ${payments.status} = 'refunded' then -abs(${paymentKopExpr}) else 0 end), 0)::bigint`,
		})
		.from(payments)
		.leftJoin(
			patientInvoices,
			and(
				eq(payments.documentId, patientInvoices.id),
				eq(patientInvoices.organizationId, orgId),
			),
		)
		.leftJoin(
			visits,
			and(
				eq(sql`coalesce(${payments.visitId}, ${patientInvoices.visitId})`, visits.id),
				eq(visits.organizationId, orgId),
			),
		)
		.leftJoin(
			appointments,
			and(
				eq(visits.appointmentId, appointments.id),
				eq(appointments.organizationId, orgId),
			),
		)
		.where(
			and(
				eq(payments.organizationId, orgId),
				startDate ? gte(sql`coalesce(${payments.paidAt}, ${payments.createdAt})`, startDate) : sql`true`,
				inArray(payments.status, ["paid", "refunded"]),
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
		.select({ id: users.id, fullName: users.fullName, specialties: users.specialties })
		.from(users)
		.where(eq(users.organizationId, orgId));
	const docMap = new Map(allDocs.map((d) => [d.id, d.fullName]));
	const docSpecialtyMap = new Map(
		allDocs.map((d) => {
			const spec = Array.isArray(d.specialties) && d.specialties.length > 0 ? String(d.specialties[0]) : null;
			return [d.id, normalizeClinicalCategory(null, spec)];
		}),
	);

	// 2b. Выработка врачей по каталогу услуг и сданным нарядам ЗТЛ
	const docServicesRes = await db
		.select({
			doctorId: sql<string | null>`coalesce(${treatmentItems.plannedDoctorUserId}, ${appointments.doctorUserId})`,
			servicesCount: sql<number>`count(*)::int`,
		})
		.from(treatmentItems)
		.innerJoin(visits, and(eq(treatmentItems.visitId, visits.id), eq(visits.organizationId, orgId)))
		.leftJoin(appointments, and(eq(visits.appointmentId, appointments.id), eq(appointments.organizationId, orgId)))
		.where(withDateFilter(orgId, treatmentItems.organizationId, visits.createdAt, startDate))
		.groupBy(sql`coalesce(${treatmentItems.plannedDoctorUserId}, ${appointments.doctorUserId})`);
	const docServicesMap = new Map(
		docServicesRes.map((s) => [s.doctorId ?? "unassigned", Number(s.servicesCount || 0)]),
	);

	const docLabRes = await db
		.select({
			doctorId: labOrders.doctorId,
			labOrdersCount: sql<number>`count(*)::int`,
			labOrdersCostKopecks: sql<number>`coalesce(sum(coalesce(${labOrders.labCostKopecks}, 0)), 0)::bigint`,
			labOrdersCostRub: sql<number>`coalesce(sum(coalesce(${labOrders.labCostRub}, 0)), 0)`,
		})
		.from(labOrders)
		.where(
			and(
				withDateFilter(orgId, labOrders.organizationId, labOrders.createdAt, startDate),
				inArray(labOrders.status, ["completed", "received", "ready", "ready_in_clinic", "fitted", "installed"]),
				eq(labOrders.isWarranty, false),
			),
		)
		.groupBy(labOrders.doctorId);
	const docLabMap = new Map(
		docLabRes.map((l) => [l.doctorId ?? "unassigned", Number(l.labOrdersCount || 0)]),
	);
	const docLabCostKopecksMap = new Map(
		docLabRes.map((l) => [
			l.doctorId ?? "unassigned",
			Number(l.labOrdersCostKopecks || rublesToKopecks(Number(l.labOrdersCostRub || 0))),
		]),
	);

	// 2c. Зарплатные ведомости:
	// Сначала читаем существующие ведомости из doctorPayrollStatements (закрытые и черновики).
	// Если ведомость за текущий период еще не закрыта/не создана, применяется оперативный расчет.
	const docPayrollRes = await db
		.select({
			doctorId: doctorPayrollStatements.doctorId,
			payrollKopecks: sql<number>`coalesce(sum(${doctorPayrollStatements.calculatedPieceworkKopecks}), 0)`,
			labCostKopecks: sql<number>`coalesce(sum(${doctorPayrollStatements.labCostKopecks}), 0)`,
			finalPayoutKopecks: sql<number>`coalesce(sum(${doctorPayrollStatements.netPayoutKopecks}), 0)`,
			isFinalized: doctorPayrollStatements.isFinalized,
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
		.groupBy(doctorPayrollStatements.doctorId, doctorPayrollStatements.isFinalized);

	const finalizedPayrollKopMap = new Map<string, number>();
	const draftPayrollKopMap = new Map<string, number>();

	for (const p of docPayrollRes) {
		const kop = Number(p.payrollKopecks || 0);
		if (p.isFinalized) {
			finalizedPayrollKopMap.set(p.doctorId, (finalizedPayrollKopMap.get(p.doctorId) || 0) + kop);
		} else {
			draftPayrollKopMap.set(p.doctorId, (draftPayrollKopMap.get(p.doctorId) || 0) + kop);
		}
	}

	// Читаем индивидуальные ставки врачей из doctorCommissions для точного оперативного расчета
	const commRows = await db
		.select({
			userId: doctorCommissions.userId,
			doctorId: doctorCommissions.doctorId,
			commissionPct: doctorCommissions.commissionPct,
			commissionPercent: doctorCommissions.commissionPercent,
		})
		.from(doctorCommissions)
		.where(
			and(
				eq(doctorCommissions.organizationId, orgId),
				eq(doctorCommissions.isActive, true),
			),
		);

	const commMap = new Map<string, number>();
	for (const c of commRows) {
		const docKey = c.userId || c.doctorId;
		if (docKey) {
			const rate = Number(c.commissionPercent || c.commissionPct || 25);
			commMap.set(docKey, rate);
		}
	}

	// 2d. Себестоимость списанных материалов по врачам (складские проводки inventoryTransactions по визитам)
	const docMaterialsRes = await db
		.select({
			doctorId: appointments.doctorUserId,
			materialsCostKopecks: sql<number>`coalesce(sum(abs(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0)) * coalesce(coalesce(${inventoryTransactions.unitCostKopecks}, round(${inventoryTransactions.unitCostRub} * 100)::bigint), 0)), 0)::bigint`,
			materialsCostRub: sql<number>`coalesce(sum(abs(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0)) * coalesce(${inventoryTransactions.unitCostRub}, 0)), 0)`,
		})
		.from(inventoryTransactions)
		.innerJoin(visits, and(eq(inventoryTransactions.visitId, visits.id), eq(visits.organizationId, orgId)))
		.leftJoin(appointments, and(eq(visits.appointmentId, appointments.id), eq(appointments.organizationId, orgId)))
		.where(
			and(
				eq(inventoryTransactions.organizationId, orgId),
				inArray(inventoryTransactions.transactionType, ["usage", "write_off"]),
				startDate ? gte(inventoryTransactions.createdAt, startDate) : sql`true`,
			),
		)
		.groupBy(appointments.doctorUserId);
	const docMaterialsKopecksMap = new Map(
		docMaterialsRes.map((m) => [
			m.doctorId ?? "unassigned",
			Number(m.materialsCostKopecks || rublesToKopecks(Number(m.materialsCostRub || 0))),
		]),
	);

	const allDoctorIds = Array.from(
		new Set([
			...docProfRes.map((r) => r.doctorId),
			...docApptRes.map((r) => r.doctorId),
			...docServicesRes.map((r) => r.doctorId),
			...docLabRes.map((r) => r.doctorId),
			...docPayrollRes.map((r) => r.doctorId),
			...docMaterialsRes.map((r) => r.doctorId),
		]),
	);

	// 2e. [DEFECT 3 FIX] Оперативный расчет зарплаты врача за текущий период,
	// если закрытой ведомости (isFinalized: true) или черновика еще нет в БД.
	// Исключает искажение маржинальности (0 ₽ ФОТ) в середине расчетного месяца.
	const missingDocIds = allDoctorIds.filter(
		(id): id is string => Boolean(id && !finalizedPayrollKopMap.has(id) && !draftPayrollKopMap.has(id)),
	);

	const operativePayrollKopMap = new Map<string, number>();
	if (missingDocIds.length > 0) {
		const fromDate = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
		const toDate = new Date();
		const fromStr = fromDate.toISOString().slice(0, 10);
		const toStr = toDate.toISOString().slice(0, 10);

		await Promise.all(
			missingDocIds.map(async (docId) => {
				try {
					const dataset = await fetchDoctorPayrollDataset({
						orgId,
						resolvedDocId: docId,
						fromStr,
						toStr,
						fromDate,
						toDate,
					});

					const commissionRate = commMap.get(docId) ?? 25;
					const docName = docMap.get(docId) || "Врач";

					const specialtyId = docSpecialtyMap.get(docId) ?? "therapy";

					const payrollResult = calculateDoctorPeriodPayroll({
						doctorId: docId,
						doctorName: docName,
						specialtyId,
						periodStartIso: fromStr,
						periodEndIso: toStr,
						services: dataset.completedServices,
						customBasePercentage: commissionRate,
						payoutModel: "percentage",
						chairRentalKop: 0,
						advancePayoutKop: 0,
						...(dataset.refundDeductions !== undefined ? { refundDeductions: dataset.refundDeductions } : {}),
						...(dataset.unallocatedLabKop !== undefined ? { unallocatedLabKop: dataset.unallocatedLabKop } : {}),
					});

					const payoutKop = payrollResult.earnedBaseCommissionKop || payrollResult.netPayoutToDoctorKop;
					operativePayrollKopMap.set(docId, payoutKop);
				} catch {
					// Fallback на оперативный расчет по ставке врача от чистой базы выручки (выручка минус ЗТЛ и материалы)
					const docProf = docProfRes.find((p) => p.doctorId === docId);
					const docRevenueKopecks = Number(docProf?.revenueKopecks || 0);
					const docLabKopecks = docLabCostKopecksMap.get(docId) || 0;
					const docMatKopecks = docMaterialsKopecksMap.get(docId) || 0;
					const netBaseKopecks = Math.max(0, docRevenueKopecks - docLabKopecks - docMatKopecks);
					const commissionPct = commMap.get(docId) ?? 25;
					const fallbackPayoutKopecks = calculatePercentDiscountKopecks(netBaseKopecks, commissionPct);
					operativePayrollKopMap.set(docId, fallbackPayoutKopecks);
				}
			}),
		);
	}

	return allDoctorIds
		.map((docId) => {
			const prof = docProfRes.find(
				(p) => (p.doctorId ?? null) === (docId ?? null),
			);
			const appt = docApptMap.get(docId ?? "unassigned");
			const revenueKopecks = Number(prof?.revenueKopecks || 0);
			const revenue = kopecksToRubles(revenueKopecks);
			const appointmentsCount = Number(appt?.totalAppointments || 0);
			const completedCount = Number(appt?.completedAppointments || 0);
			const workedMinutes = Number(appt?.totalMinutes || 0);
			const workedHours = Math.round((workedMinutes / 60) * 10) / 10;
			const avgTicketKopecks =
				completedCount > 0
					? Math.round(revenueKopecks / completedCount)
					: appointmentsCount > 0
						? Math.round(revenueKopecks / appointmentsCount)
						: 0;
			const avgTicketRub = kopecksToRubles(avgTicketKopecks);
			const hourlyRevenueKopecks =
				workedMinutes > 0
					? Math.round(revenueKopecks / (workedMinutes / 60))
					: 0;
			const hourlyRevenueRub = kopecksToRubles(hourlyRevenueKopecks);
			const completionRate =
				appointmentsCount > 0
					? Math.round((completedCount / appointmentsCount) * 100)
					: null;
			const servicesCount = docServicesMap.get(docId ?? "unassigned") || 0;
			const labOrdersCount = docLabMap.get(docId ?? "unassigned") || 0;
			const labOrdersCostKopecks = docLabCostKopecksMap.get(docId ?? "unassigned") || 0;
			const labOrdersCostRub = kopecksToRubles(labOrdersCostKopecks);
			const materialsCostKopecks = docMaterialsKopecksMap.get(docId ?? "unassigned") || 0;
			const materialsCostRub = kopecksToRubles(materialsCostKopecks);
			const doctorPayrollKopecks = docId
				? (finalizedPayrollKopMap.get(docId) ??
					draftPayrollKopMap.get(docId) ??
					operativePayrollKopMap.get(docId) ??
					0)
				: 0;
			const doctorPayrollRub = kopecksToRubles(doctorPayrollKopecks);
			// [SEV-2.4] Канонический паритет с P&L: Выручка минус ЗТЛ, материалы со склада и ФОТ врача (честный учет отрицательной маржи)
			const clinicMarginKopecks = revenueKopecks > 0
				? revenueKopecks - labOrdersCostKopecks - doctorPayrollKopecks - materialsCostKopecks
				: 0;
			const clinicMarginRub = kopecksToRubles(clinicMarginKopecks);
			const marginRatio = revenueKopecks > 0
				? clinicMarginKopecks / revenueKopecks
				: null;
			const margin = marginRatio !== null
				? Math.round(marginRatio * 100)
				: null;

			return {
				doctorId: docId ?? null,
				name: docId
					? docMap.get(docId) || "Врач клиники"
					: "Общая касса",
				revenue,
				revenueKopecks,
				appointmentsCount,
				avgTicketRub,
				avgTicketKopecks,
				workedHours,
				hourlyRevenueRub,
				hourlyRevenueKopecks,
				margin,
				completionRate,
				servicesCount,
				catalogServicesCount: servicesCount,
				services804nCount: servicesCount,
				labOrdersCount,
				labOrdersCostRub,
				labOrdersCostKopecks,
				materialsCostRub,
				materialsCostKopecks,
				doctorPayrollRub,
				doctorPayrollKopecks,
				clinicMarginRub,
				clinicMarginKopecks,
			};
		})
		.filter(
			(x) =>
				x.revenue > 0 ||
				(x.appointmentsCount ?? 0) > 0 ||
				(x.servicesCount ?? 0) > 0 ||
				(x.catalogServicesCount ?? 0) > 0 ||
				(x.services804nCount ?? 0) > 0 ||
				(x.labOrdersCount ?? 0) > 0 ||
				(x.doctorPayrollRub ?? 0) > 0,
		)
		.sort((a, b) => b.revenue - a.revenue);
}


const utilizationQuerySchema = z.object({
	range: z.string().optional(),
	monthlyRentRub: z.union([z.string(), z.number()]).optional(),
	monthlyUtilitiesRub: z.union([z.string(), z.number()]).optional(),
	monthlyAdministrativePayrollRub: z.union([z.string(), z.number()]).optional(),
	monthlyEquipmentDepreciationRub: z.union([z.string(), z.number()]).optional(),
	monthlySanpinSterilizationRub: z.union([z.string(), z.number()]).optional(),
	monthlyMarketingAndOtherRub: z.union([z.string(), z.number()]).optional(),
});
type UtilizationQuery = z.infer<typeof utilizationQuerySchema>;

export async function registerUtilizationRoutes(app: FastifyInstance) {
	const getUtilization = async (request: FastifyRequest, reply: FastifyReply) => {
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
			const parsedQuery = utilizationQuerySchema.safeParse(request.query);
			const query: UtilizationQuery = parsedQuery.success ? parsedQuery.data : {};
			const { range } = query;
			let startDate: Date | undefined;
			const now = new Date();

			if (range === "today" || range === "day") {
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
			} else if (range === "yesterday") {
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
			} else if (range === "week") {
				const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
			} else if (range === "month" || range === "last_month" || range === "this_month") {
				startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
			} else if (range === "quarter" || range === "last_3_months") {
				const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
				startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
			} else if (range === "year" || range === "this_year") {
				startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
			}

			const data = await withTenantCtx(orgId, async () => {
				const chairData = await calculateChairUtilization(orgId, startDate, now);
				const doctorProfitability = await calculateDoctorProfitability(orgId, startDate);

				// [ANL-04] Честный график и себестоимость кресел без хардкода (Мандаты 8n, 8wy)
				const [orgRow] = await db
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

				// [ANL-04] Чтение фактических расходов клиники по строгим реляционным категориям (PostgreSQL 18 SSOT):
				// 1) metadata->>'category' (rent, utilities, salaries, marketing, etc.)
				// 2) reasonCode регламентированного справочника (100: аренда, 1: ФОТ, 10/7: коммуналка/связь, 6: маркетинг, 4: санпин)
				const cashOperationKopExpr = sql`coalesce(${cashOperations.amountKopecks}, round(coalesce(${cashOperations.amountRub}, 0) * 100)::bigint, 0)::bigint`;
				const [actualExpenses] = await db
					.select({
						rentKopecks: sql<number>`coalesce(sum(case when ${cashOperations.metadata}->>'category' = 'rent' or ${cashOperations.reasonCode} = 100 then ${cashOperationKopExpr} else 0 end), 0)::bigint`,
						utilitiesKopecks: sql<number>`coalesce(sum(case when ${cashOperations.metadata}->>'category' = 'utilities' or ${cashOperations.reasonCode} in (7, 10) then ${cashOperationKopExpr} else 0 end), 0)::bigint`,
						payrollKopecks: sql<number>`coalesce(sum(case when ${cashOperations.metadata}->>'category' in ('salaries', 'payroll') or ${cashOperations.reasonCode} = 1 then ${cashOperationKopExpr} else 0 end), 0)::bigint`,
						depreciationKopecks: sql<number>`coalesce(sum(case when ${cashOperations.metadata}->>'category' in ('equipment_lease', 'depreciation') then ${cashOperationKopExpr} else 0 end), 0)::bigint`,
						sanpinKopecks: sql<number>`coalesce(sum(case when ${cashOperations.metadata}->>'category' in ('sanpin', 'sterilization') or ${cashOperations.reasonCode} = 4 then ${cashOperationKopExpr} else 0 end), 0)::bigint`,
						marketingKopecks: sql<number>`coalesce(sum(case when ${cashOperations.metadata}->>'category' = 'marketing' or ${cashOperations.reasonCode} = 6 then ${cashOperationKopExpr} else 0 end), 0)::bigint`,
					})
					.from(cashOperations)
					.where(
						and(
							eq(cashOperations.organizationId, orgId),
							eq(cashOperations.operationType, "expense"),
							startDate ? gte(cashOperations.createdAt, startDate) : gte(cashOperations.createdAt, new Date(now.getFullYear(), now.getMonth(), 1)),
						),
					);

				const rentRub = query.monthlyRentRub !== undefined ? Math.max(0, Number(query.monthlyRentRub)) : kopecksToRubles(Number(actualExpenses?.rentKopecks || 0));
				const utilitiesRub = query.monthlyUtilitiesRub !== undefined ? Math.max(0, Number(query.monthlyUtilitiesRub)) : kopecksToRubles(Number(actualExpenses?.utilitiesKopecks || 0));
				const payrollRub = query.monthlyAdministrativePayrollRub !== undefined ? Math.max(0, Number(query.monthlyAdministrativePayrollRub)) : kopecksToRubles(Number(actualExpenses?.payrollKopecks || 0));
				const depreciationRub = query.monthlyEquipmentDepreciationRub !== undefined ? Math.max(0, Number(query.monthlyEquipmentDepreciationRub)) : kopecksToRubles(Number(actualExpenses?.depreciationKopecks || 0));
				const sanpinRub = query.monthlySanpinSterilizationRub !== undefined ? Math.max(0, Number(query.monthlySanpinSterilizationRub)) : kopecksToRubles(Number(actualExpenses?.sanpinKopecks || 0));
				const marketingRub = query.monthlyMarketingAndOtherRub !== undefined ? Math.max(0, Number(query.monthlyMarketingAndOtherRub)) : kopecksToRubles(Number(actualExpenses?.marketingKopecks || 0));

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

	app.get("/api/analytics/chairs-utilization", getUtilization);
	app.get("/api/analytics/utilization", getUtilization);
}
