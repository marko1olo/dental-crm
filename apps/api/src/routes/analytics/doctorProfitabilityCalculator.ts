import {
	calculateDoctorPeriodPayroll,
	calculateKopecksSharePercent,
	formatDateKeyInTimeZone,
	kopecksToRubles,
	resolveValidIanaTimeZone,
	rublesToKopecks,
	todayDateKeyInTimeZone,
	wallClockToUtcInTimeZone,
} from "@dental/shared";
import { and, eq, gte, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	paymentSignedExactFlowKopecksSql,
	paymentSignedLegacyFlowRubSql,
} from "../../db/paymentRefundSql.js";
import {
	appointments,
	doctorCommissions,
	doctorPayrollStatements,
	inventoryTransactions,
	labOrders,
	payments,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { fetchDoctorPayrollDataset, normalizeClinicalCategory } from "../doctorPayrollDbQueries.js";
import { clinicTimeZone } from "../../services/reports/managerReports/timezone.js";

const logger = createApiLogger("doctorProfitabilityCalculator");

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

function withDateFilter(orgId: string, orgCol: AnyColumn, dateCol?: AnyColumn, startDate?: Date): SQL {
	if (startDate && dateCol) {
		const combined = and(eq(orgCol, orgId), gte(dateCol, startDate));
		return combined ?? eq(orgCol, orgId);
	}
	return eq(orgCol, orgId);
}

/**
 * 2. Doctor Profitability — payments and appointments grouped by doctorUserId
 */
export async function calculateDoctorProfitability(
	orgId: string,
	startDate?: Date,
	executor?: TenantDb,
): Promise<DoctorProfitabilityItem[]> {
	const runQuery = async (tx: TenantDb): Promise<DoctorProfitabilityItem[]> => {
		const docProfRes = await tx
			.select({
				doctorId: appointments.doctorUserId,
				exactRevenueKopecks: sql<number>`coalesce(sum(${paymentSignedExactFlowKopecksSql()}), 0)::bigint`,
				legacyRevenueRub: sql<number>`coalesce(sum(${paymentSignedLegacyFlowRubSql()}), 0)`,
			})
			.from(payments)
			.leftJoin(
				visits,
				and(
					sql`coalesce(${payments.visitId}, (select pi.visit_id from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} limit 1)) = ${visits.id}`,
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
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
				),
			)
			.groupBy(appointments.doctorUserId);

		const docRevenueKopecksMap = new Map<string, number>();
		for (const row of docProfRes) {
			const revKop = Number(row.exactRevenueKopecks || 0) + rublesToKopecks(Number(row.legacyRevenueRub || 0));
			docRevenueKopecksMap.set(row.doctorId ?? "unassigned", revKop);
		}

		const docApptRes = await tx
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

		const allDocs = await tx
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
		const docServicesRes = await tx
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

		const docLabRes = await tx
			.select({
				doctorId: labOrders.doctorId,
				labOrdersCount: sql<number>`count(*)::int`,
				labOrdersCostKopecks: sql<number>`coalesce(sum(coalesce(${labOrders.labCostKopecks}, 0)), 0)::bigint`,
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
				Number(l.labOrdersCostKopecks ?? 0),
			]),
		);

		// 2c. Зарплатные ведомости
		const docPayrollRes = await tx
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
		const commRows = await tx
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

		// 2d. Себестоимость списанных материалов по врачам
		const docMaterialsRes = await tx
			.select({
				doctorId: appointments.doctorUserId,
				exactMaterialsCostKopecks: sql<number>`coalesce(sum(case when ${inventoryTransactions.unitCostKopecks} > 0 then (case when ${inventoryTransactions.transactionType} = 'storno' then -1 else 1 end) * abs(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0)) * ${inventoryTransactions.unitCostKopecks} else 0 end), 0)::bigint`,
				legacyMaterialsCostRub: sql<number>`coalesce(sum(case when coalesce(${inventoryTransactions.unitCostKopecks}, 0) <= 0 then (case when ${inventoryTransactions.transactionType} = 'storno' then -1 else 1 end) * abs(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0)) * coalesce(${inventoryTransactions.unitCostRub}, 0) else 0 end), 0)`,
			})
			.from(inventoryTransactions)
			.innerJoin(visits, and(eq(inventoryTransactions.visitId, visits.id), eq(visits.organizationId, orgId)))
			.leftJoin(appointments, and(eq(visits.appointmentId, appointments.id), eq(appointments.organizationId, orgId)))
			.where(
				and(
					eq(inventoryTransactions.organizationId, orgId),
					inArray(inventoryTransactions.transactionType, [
						"auto_deduct",
						"usage",
						"write_off",
						"emergency_overdraft",
						"shift_batch_deduction",
						"treatment_consumable",
						"manual_writeoff",
						"write_off_mdlp",
						"storno",
					]),
					startDate ? gte(inventoryTransactions.createdAt, startDate) : sql`true`,
				),
			)
			.groupBy(appointments.doctorUserId);
		const docMaterialsKopecksMap = new Map(
			docMaterialsRes.map((m) => [
				m.doctorId ?? "unassigned",
				Number(m.exactMaterialsCostKopecks || 0) + rublesToKopecks(Number(m.legacyMaterialsCostRub || 0)),
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

		// 2e. Оперативный расчет зарплаты врача за текущий период (строго в рамках открытой транзакции tx)
		const missingDocIds = allDoctorIds.filter(
			(id): id is string => Boolean(id && !finalizedPayrollKopMap.has(id) && !draftPayrollKopMap.has(id)),
		);

		const operativePayrollKopMap = new Map<string, number>();
		if (missingDocIds.length > 0) {
			const tz = resolveValidIanaTimeZone(await clinicTimeZone(orgId, tx));
			const toDate = new Date();
			const todayKey = todayDateKeyInTimeZone(tz, toDate);
			const monthStartKey = `${todayKey.slice(0, 7)}-01`;
			const fromDate =
				startDate ??
				wallClockToUtcInTimeZone(monthStartKey, 0, 0, tz) ??
				new Date(toDate.getFullYear(), toDate.getMonth(), 1, 0, 0, 0, 0);
			const fromStr = formatDateKeyInTimeZone(fromDate, tz);
			const toStr = formatDateKeyInTimeZone(toDate, tz);

			for (const docId of missingDocIds) {
				try {
					const dataset = await fetchDoctorPayrollDataset({
						orgId,
						resolvedDocId: docId,
						fromStr,
						toStr,
						fromDate,
						toDate,
						tx,
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
						...(dataset.priorDebtCarryOverKop !== undefined ? { priorDebtCarryOverKop: dataset.priorDebtCarryOverKop } : {}),
					});

					const payoutKop = payrollResult.grossPayoutBeforeTaxKop;
					operativePayrollKopMap.set(docId, payoutKop);
				} catch (err: unknown) {
					logger.error(
						{
							err: safeLogError(err),
							organizationId: orgId,
							doctorId: docId,
						},
						"Operative doctor payroll calculation failed in doctorProfitabilityCalculator",
					);
					throw err;
				}
			}
		}

		return allDoctorIds
			.map((docId) => {
				const appt = docApptMap.get(docId ?? "unassigned");
				const revenueKopecks = docRevenueKopecksMap.get(docId ?? "unassigned") || 0;
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
				const clinicMarginKopecks = revenueKopecks > 0
					? revenueKopecks - labOrdersCostKopecks - doctorPayrollKopecks - materialsCostKopecks
					: 0;
				const clinicMarginRub = kopecksToRubles(clinicMarginKopecks);
				const margin = revenueKopecks > 0
					? calculateKopecksSharePercent(clinicMarginKopecks, revenueKopecks, 0)
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
	};

	if (executor) {
		return runQuery(executor);
	}
	return withTenantCtx(orgId, runQuery);
}
