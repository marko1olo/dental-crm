import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { createApiLogger } from "../../../observability/logger.js";
import { db } from "../../../db/client.js";
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

const logger = createApiLogger("doctorPerformanceService");

/**
 * Выручка и загрузка по врачам (Мандаты 8ap, 8bm, 8bo).
 *
 * Платёж связывается с врачом через приём: payments → visits → appointments.
 * Платёж без визита отнести к врачу нельзя, и он попадает в отдельную сумму
 * «не отнесено» — размазывать его по врачам пропорционально значило бы
 * придумать данные.
 *
 * Прямой поиск по payments.paidAt задействует индекс idx_payments_org_paid_at.
 */
export async function doctorPerformance(
	scope: ReportScope,
): Promise<DoctorPerformanceReport> {
	const paymentTimestamp = sql`coalesce(${payments.paidAt}, ${payments.createdAt})`;
	const revenueRows = await db
		.select({
			doctorUserId: appointments.doctorUserId,
			revenueRub: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} when ${payments.status} = 'refunded' then -${payments.amountRub} else 0 end), 0)::numeric(12,2)`,
		})
		.from(payments)
		.leftJoin(patientInvoices, eq(payments.documentId, patientInvoices.id))
		.leftJoin(
			visits,
			eq(sql`coalesce(${payments.visitId}, ${patientInvoices.visitId})`, visits.id),
		)
		.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
		.where(
			and(
				eq(payments.organizationId, scope.organizationId),
				inArray(payments.status, ["paid", "refunded"]),
				gte(paymentTimestamp, scope.from),
				lte(paymentTimestamp, scope.to),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.status in ('voided', 'cancelled')))`,
			),
		)
		.groupBy(appointments.doctorUserId);

	const appointmentRows = await db
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

	const staff = await db
		.select({ id: users.id, fullName: users.fullName })
		.from(users)
		.where(eq(users.organizationId, scope.organizationId));
	const staffNames = new Map(staff.map((row) => [row.id, row.fullName]));

	type Accumulator = {
		revenueRub: number;
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
			total: 0,
			completed: 0,
			cancelled: 0,
			noShow: 0,
		};
		byDoctor.set(key, fresh);
		return fresh;
	};

	let rawUnattributedRevenueRub = 0;
	let unlinkedRefundsSumRub = 0;
	for (const row of revenueRows) {
		const amount = Number(row.revenueRub);
		if (!row.doctorUserId) {
			rawUnattributedRevenueRub += amount;
			if (amount < 0) {
				unlinkedRefundsSumRub += Math.abs(amount);
			}
			continue;
		}
		ensure(row.doctorUserId).revenueRub += amount;
	}

	// [ANL-01] Защита от отрицательной нераспределённой выручки при непривязанных к врачам возвратах
	const hasNegativeUnattributed = rawUnattributedRevenueRub < 0;
	if (hasNegativeUnattributed) {
		logger.warn(
			{
				organizationId: scope.organizationId,
				rawUnattributedRevenueRub,
				unlinkedRefundsSumRub,
			},
			"Negative unattributed revenue detected due to doctor-unlinked refunds. Clamped to 0",
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
		.map(([doctorUserId, accumulator]) => ({
			doctorUserId,
			doctorName: staffNames.get(doctorUserId) ?? "Сотрудник вне списка",
			revenueRub: accumulator.revenueRub,
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
				accumulator.completed > 0
					? Math.round(accumulator.revenueRub / accumulator.completed)
					: null,
			marginRub: null as null,
		}))
		.sort((left, right) => right.revenueRub - left.revenueRub);

	return {
		rows,
		unattributedRevenueRub,
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
}
