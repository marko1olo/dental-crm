/**
 * Отчёты по динамике выручки и потоку первичных/повторных пациентов.
 */

import { and, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { kopecksToRubles, rublesToKopecks, sumKopecks, toExactKopecks } from "@dental/shared";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	isIncomePaymentRowSql,
	paymentSignedExactFlowKopecksSql,
	paymentSignedLegacyFlowRubSql,
} from "../../../db/paymentRefundSql.js";
import { appointments, payments } from "../../../db/schema.js";
import { inClinicZone, postgresKnowsTimeZone } from "./timezone.js";
import type {
	PatientFlowPoint,
	PatientFlowReport,
	ReportScope,
	RevenueTimeline,
	RevenueTimelinePoint,
	TimelineGranularity,
} from "./types.js";

/**
 * Динамика выручки. Группировка делается в Postgres через date_trunc: считать
 * это в приложении означало бы вытащить все платежи периода в память.
 */
export async function revenueTimeline(
	scope: ReportScope,
	granularity: TimelineGranularity = "day",
	executor?: TenantDb,
): Promise<RevenueTimeline> {
	const runQuery = async (tx: TenantDb): Promise<RevenueTimeline> => {
		const zone = await postgresKnowsTimeZone(scope.timeZone, tx);
		const paymentTimestamp = sql`coalesce(${payments.paidAt}, ${payments.createdAt})`;
		const localPaidAt = inClinicZone(paymentTimestamp, zone);
		const truncated =
			granularity === "month"
				? sql`date_trunc('month', ${localPaidAt})`
				: granularity === "week"
					? sql`date_trunc('week', ${localPaidAt})`
					: sql`date_trunc('day', ${localPaidAt})`;

		const rows = await tx
			.select({
				bucket: sql<string>`to_char(${truncated}, 'YYYY-MM-DD')`,
				exactRevenueKopecks: sql<string>`coalesce(sum(${paymentSignedExactFlowKopecksSql()}), 0)::bigint`,
				legacyRevenueRub: sql<number>`coalesce(sum(${paymentSignedLegacyFlowRubSql()}), 0)`,
				paymentCount: sql<number>`count(case when ${isIncomePaymentRowSql()} then 1 end)::int`,
				payingPatients: sql<number>`count(distinct case when ${isIncomePaymentRowSql()} then ${payments.patientId} end)::int`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, scope.organizationId),
					// [ANL-02] Только фактически полученные деньги за вычетом подтвержденных возвратов по времени проведения оплаты, исключая аннулированные счета
					inArray(payments.status, ["paid", "refunded"]),
					gte(paymentTimestamp, scope.from),
					lte(paymentTimestamp, scope.to),
					sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${scope.organizationId} and pi.status in ('voided', 'cancelled')))`,
				),
			)
			.groupBy(truncated)
			.orderBy(truncated);

		const points: RevenueTimelinePoint[] = rows.map((row) => {
			const revKop = Number(row.exactRevenueKopecks || 0) + rublesToKopecks(Number(row.legacyRevenueRub || 0));
			return {
				bucket: row.bucket,
				revenueRub: kopecksToRubles(revKop),
				revenueKopecks: revKop,
				paymentCount: Number(row.paymentCount),
				payingPatients: Number(row.payingPatients),
			};
		});

		const kopecksList = points.map((p) => toExactKopecks(p.revenueKopecks ?? 0));
		const totalKopecks = sumKopecks(kopecksList);

		return {
			granularity,
			points,
			totalRub: kopecksToRubles(totalKopecks),
			totalKopecks: Number(totalKopecks),
			isEmpty: points.length === 0,
		};
	};

	if (executor) return runQuery(executor);
	return withTenantCtx(scope.organizationId, runQuery);
}

/**
 * Первичные и повторные пациенты по месяцам.
 *
 * Первичным считается пациент, у которого это первый завершённый приём за всю
 * историю, а не первый в периоде: иначе при выборе «за март» все пациенты
 * клиники окажутся первичными.
 */
export async function patientFlow(
	scope: ReportScope,
	executor?: TenantDb,
): Promise<PatientFlowReport> {
	const runQuery = async (tx: TenantDb): Promise<PatientFlowReport> => {
		const zone = await postgresKnowsTimeZone(scope.timeZone, tx);
		const monthBucket = sql`date_trunc('month', ${inClinicZone(appointments.startsAt, zone)})`;

		const firstEverRows = await tx
			.select({
				patientId: appointments.patientId,
				firstAt: sql<Date>`min(${appointments.startsAt})`,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, scope.organizationId),
					eq(appointments.status, "completed"),
					isNotNull(appointments.patientId),
				),
			)
			.groupBy(appointments.patientId);

		const periodRows = await tx
			.select({
				bucket: sql<string>`to_char(${monthBucket}, 'YYYY-MM')`,
				patientId: appointments.patientId,
				firstInBucketAt: sql<Date>`min(${appointments.startsAt})`,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, scope.organizationId),
					eq(appointments.status, "completed"),
					isNotNull(appointments.patientId),
					gte(appointments.startsAt, scope.from),
					lte(appointments.startsAt, scope.to),
				),
			)
			.groupBy(monthBucket, appointments.patientId);

		const firstEverByPatient = new Map<string, number>();
		for (const row of firstEverRows) {
			if (row.patientId && row.firstAt)
				firstEverByPatient.set(row.patientId, new Date(row.firstAt).getTime());
		}

		const byBucket = new Map<
			string,
			{ newPatients: Set<string>; returningPatients: Set<string> }
		>();
		for (const row of periodRows) {
			if (!row.patientId) continue;
			const bucket = byBucket.get(row.bucket) ?? {
				newPatients: new Set<string>(),
				returningPatients: new Set<string>(),
			};

			const firstEver = firstEverByPatient.get(row.patientId);
			const firstInBucket = new Date(row.firstInBucketAt).getTime();
			if (firstEver !== undefined && firstEver === firstInBucket)
				bucket.newPatients.add(row.patientId);
			else bucket.returningPatients.add(row.patientId);

			byBucket.set(row.bucket, bucket);
		}

		const points: PatientFlowPoint[] = [...byBucket.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([bucket, sets]) => ({
				bucket,
				newPatients: sets.newPatients.size,
				returningPatients: [...sets.returningPatients].filter(
					(id) => !sets.newPatients.has(id),
				).length,
			}));

		return {
			points,
			newTotal: points.reduce((total, point) => total + point.newPatients, 0),
			returningTotal: points.reduce(
				(total, point) => total + point.returningPatients,
				0,
			),
			isEmpty: points.length === 0,
		};
	};

	if (executor) return runQuery(executor);
	return withTenantCtx(scope.organizationId, runQuery);
}
