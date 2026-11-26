/**
 * Отчёты по выработке врачей и реэкспорт модульных сервисов загрузки/воронки/напоминаний/расписания.
 */

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	paymentSignedExactFlowKopecksSql,
	paymentSignedLegacyFlowRubSql,
} from "../../../db/paymentRefundSql.js";
import {
	appointments,
	patientInvoices,
	payments,
	users,
	visits,
} from "../../../db/schema.js";
import type {
	DoctorPerformanceReport,
	DoctorPerformanceRow,
	ReportScope,
} from "./types.js";

export { appointmentFunnel } from "./appointmentFunnelService.js";
export { chairLoad } from "./chairLoadService.js";
export { reminderEffect } from "./reminderEffectService.js";
export { scheduleLoad } from "./scheduleLoadService.js";

/**
 * Выручка и загрузка по врачам.
 *
 * Платёж связывается с врачом через приём: payments → visits → appointments.
 * Платёж без визита отнести к врачу нельзя, и он попадает в отдельную сумму
 * «не отнесено» — размазывать его по врачам пропорционально значило бы
 * придумать данные.
 */
export async function doctorPerformance(
	scope: ReportScope,
	executor?: TenantDb,
): Promise<DoctorPerformanceReport> {
	const runQuery = async (tx: TenantDb): Promise<DoctorPerformanceReport> => {
		const paymentTimestamp = sql`coalesce(${payments.paidAt}, ${payments.createdAt})`;
		const visitPaymentsSubquery = tx
			.select({
				visitId: sql<string>`coalesce(${payments.visitId}, ${patientInvoices.visitId})`.as("visit_id"),
				exactRevenueKopecks: sql<string>`coalesce(sum(${paymentSignedExactFlowKopecksSql()}), 0)::bigint`.as("exact_revenue_kopecks"),
				legacyRevenueRub: sql<string>`coalesce(sum(${paymentSignedLegacyFlowRubSql()}), 0)`.as("legacy_revenue_rub"),
			})
			.from(payments)
			.leftJoin(
				patientInvoices,
				and(
					eq(payments.documentId, patientInvoices.id),
					eq(patientInvoices.organizationId, scope.organizationId),
					sql`${payments.visitId} is null`,
				),
			)
			.where(
				and(
					eq(payments.organizationId, scope.organizationId),
					inArray(payments.status, ["paid", "refunded"]),
					gte(paymentTimestamp, scope.from),
					lte(paymentTimestamp, scope.to),
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${scope.organizationId} and pi.status in ('voided', 'cancelled')))`,
				),
			)
			.groupBy(sql`coalesce(${payments.visitId}, ${patientInvoices.visitId})`)
			.as("vp");

		const revenueRows = await tx
			.select({
				doctorUserId: appointments.doctorUserId,
				exactRevenueKopecks: sql<string>`coalesce(sum(${visitPaymentsSubquery.exactRevenueKopecks}), 0)::bigint`,
				legacyRevenueRub: sql<string>`coalesce(sum(${visitPaymentsSubquery.legacyRevenueRub}), 0)`,
			})
			.from(visitPaymentsSubquery)
			.leftJoin(visits, and(eq(visitPaymentsSubquery.visitId, visits.id), eq(visits.organizationId, scope.organizationId)))
			.leftJoin(appointments, and(eq(visits.appointmentId, appointments.id), eq(appointments.organizationId, scope.organizationId)))
			.groupBy(appointments.doctorUserId);

		const appointmentRows = await tx
			.select({
				doctorUserId: appointments.doctorUserId,
				status: appointments.status,
				total: sql<number>`count(*)::int`,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, scope.organizationId),
					gte(appointments.startsAt, scope.from),
					lte(appointments.startsAt, scope.to),
				),
			)
			.groupBy(appointments.doctorUserId, appointments.status);

		const staff = await tx
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(eq(users.organizationId, scope.organizationId));
		const staffNames = new Map(staff.map((row) => [row.id, row.fullName]));

		type Accumulator = {
			revenueRub: number;
			revenueKopecks: number;
			total: number;
			completed: number;
			cancelled: number;
			noShow: number;
		};
		const byDoctor = new Map<string, Accumulator>();
		const ensure = (key: string): Accumulator => {
			const existing = byDoctor.get(key);
			if (existing) return existing;
			const fresh = {
				revenueRub: 0,
				revenueKopecks: 0,
				total: 0,
				completed: 0,
				cancelled: 0,
				noShow: 0,
			};
			byDoctor.set(key, fresh);
			return fresh;
		};

		let rawUnattributedRevenueKopecks = 0;
		let unlinkedRefundsSumKopecks = 0;
		const doctorRevenueKopecksMap = new Map<string, number>();

		for (const row of revenueRows) {
			const kopecks =
				Number(row.exactRevenueKopecks || 0) +
				rublesToKopecks(Number(row.legacyRevenueRub || 0));
			if (!row.doctorUserId) {
				rawUnattributedRevenueKopecks += kopecks;
				if (kopecks < 0) {
					unlinkedRefundsSumKopecks += Math.abs(kopecks);
				}
				continue;
			}
			const currentKop = (doctorRevenueKopecksMap.get(row.doctorUserId) ?? 0) + kopecks;
			doctorRevenueKopecksMap.set(row.doctorUserId, currentKop);
			const acc = ensure(row.doctorUserId);
			acc.revenueKopecks = currentKop;
			acc.revenueRub = kopecksToRubles(currentKop);
		}

		const rawUnattributedRevenueRub = kopecksToRubles(rawUnattributedRevenueKopecks);
		const unlinkedRefundsSumRub = kopecksToRubles(unlinkedRefundsSumKopecks);

		// [ANL-01] Защита от отрицательной нераспределённой выручки при непривязанных к врачам возвратах
		const hasNegativeUnattributed = rawUnattributedRevenueRub < 0;
		if (hasNegativeUnattributed && scope.logger?.warn) {
			scope.logger.warn(
				{
					organizationId: scope.organizationId,
					rawUnattributedRevenueRub,
					unlinkedRefundsSumRub,
				},
				`[ANL-01][Audit] Negative unattributed revenue (${rawUnattributedRevenueRub} руб) detected due to doctor-unlinked refunds for org ${scope.organizationId}. Clamped to 0. Total unlinked refunds: ${unlinkedRefundsSumRub} руб.`,
			);
		}
		const unattributedRevenueRub = Math.max(0, rawUnattributedRevenueRub);

		for (const row of appointmentRows) {
			if (!row.doctorUserId) continue;
			const accumulator = ensure(row.doctorUserId);
			const count = Number(row.total);
			accumulator.total += count;
			if (row.status === "completed") accumulator.completed += count;
			else if (row.status === "cancelled") accumulator.cancelled += count;
			else if (row.status === "no_show") accumulator.noShow += count;
		}

		const rows: DoctorPerformanceRow[] = [...byDoctor.entries()]
			.map(([doctorUserId, accumulator]) => {
				const averageTicketKopecks =
					accumulator.completed > 0
						? Math.round(accumulator.revenueKopecks / accumulator.completed)
						: null;
				return {
					doctorUserId,
					doctorName: staffNames.get(doctorUserId) ?? "Сотрудник вне списка",
					revenueRub: accumulator.revenueRub,
					revenueKopecks: accumulator.revenueKopecks,
					appointmentsTotal: accumulator.total,
					appointmentsCompleted: accumulator.completed,
					appointmentsCancelled: accumulator.cancelled,
					appointmentsNoShow: accumulator.noShow,
					completionRate:
						accumulator.total > 0
							? accumulator.completed / accumulator.total
							: null,
					noShowRate:
						accumulator.total > 0 ? accumulator.noShow / accumulator.total : null,
					averageTicketRub:
						averageTicketKopecks != null
							? kopecksToRubles(averageTicketKopecks)
							: null,
					averageTicketKopecks,
					marginRub: null as null,
				};
			})
			.sort((left, right) => (right.revenueKopecks ?? 0) - (left.revenueKopecks ?? 0));

		return {
			rows,
			unattributedRevenueRub,
			unattributedRevenueKopecks: rawUnattributedRevenueKopecks,
			attributionNote:
				hasNegativeUnattributed
					? `Обнаружены не привязанные к приёмам возвраты на сумму ${Math.round(unlinkedRefundsSumRub).toLocaleString("ru-RU")} ₽. Нераспределённая выручка скорректирована до 0 ₽.`
					: unattributedRevenueRub > 0
						? "Часть выручки не отнесена к врачу: платёж не связан с приёмом. " +
							"Связь идёт через приём, у визита отдельного поля «врач» нет. " +
							"Чтобы выручка попадала врачу, оплату нужно оформлять из визита, созданного из записи в расписании."
						: "Вся выручка периода отнесена к врачам.",
			isEmpty: rows.length === 0 && unattributedRevenueRub === 0 && !hasNegativeUnattributed,
		};
	};

	if (executor) return runQuery(executor);
	return withTenantCtx(scope.organizationId, runQuery);
}
