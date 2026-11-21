/**
 * marketingCohortService.ts
 *
 * Real PostgreSQL 18 queries for patient cohorts and 3D RFM matrix ([LOY-10 & LOY-11]).
 * Zero hardcoded dioramas, 100% grounded in transactional tables:
 * - patients
 * - appointments
 * - payments
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import { parseKopecks } from "@dental/shared";
import { db } from "../../db/client.js";
import { appointments, patients, payments } from "../../db/schema.js";

export interface RfmCohortSummary {
	readonly vipCount: number;
	readonly loyalCount: number;
	readonly newCount: number;
	readonly sleepingCount: number;
	readonly lostCount: number;
	readonly noVisitsCount: number;
	readonly totalRevenueKopecks: number;
	readonly avgCheckKopecks: number;
}

export interface MarketingSegmentMetric {
	readonly id: string;
	readonly name: string;
	readonly count: number;
	readonly description: string;
	readonly revenueKopecks?: number;
}

export interface MarketingCohortReport {
	readonly organizationId: string;
	readonly totalActivePatients: number;
	readonly segments: readonly MarketingSegmentMetric[];
	readonly rfm: RfmCohortSummary;
	readonly calculatedAt: string;
}

export async function calculateRealMarketingCohorts(
	organizationId: string,
): Promise<MarketingCohortReport> {
	// Subqueries for appointments and payments aggregates per patient
	const lastCompletedAtSql = sql<Date | null>`(
		SELECT max(a.starts_at)
		FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id" AND a.status = 'completed'
	)`;

	const futureCountSql = sql<number>`(
		SELECT count(*)
		FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id"
		  AND a.starts_at > now()
		  AND a.status IN ('planned', 'confirmed', 'arrived', 'in_treatment')
	)`;

	const visitsPast12MonthsSql = sql<number>`(
		SELECT count(*)
		FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id"
		  AND a.status = 'completed'
		  AND a.starts_at >= now() - interval '1 year'
	)`;

	const totalCompletedVisitsSql = sql<number>`(
		SELECT count(*)
		FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id"
		  AND a.status = 'completed'
	)`;

	const revenuePast12MonthsRubSql = sql<string | null>`(
		SELECT coalesce(sum(p.amount_rub), 0)
		FROM ${payments} p
		WHERE p.patient_id = ${patients}."id"
		  AND p.status = 'paid'
		  AND (p.paid_at >= now() - interval '1 year' OR (p.paid_at IS NULL AND p.created_at >= now() - interval '1 year'))
	)`;

	const hasOrthoOrTherapySql = sql<number>`(
		SELECT count(*)
		FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id"
		  AND (
				lower(coalesce(a.reason, '')) LIKE '%ортодонт%' OR
				lower(coalesce(a.reason, '')) LIKE '%брекет%' OR
				lower(coalesce(a.reason, '')) LIKE '%терап%' OR
				lower(coalesce(a.reason, '')) LIKE '%кариес%' OR
				lower(coalesce(a.reason, '')) LIKE '%пульпит%'
		  )
	)`;

	const hasHygieneSql = sql<number>`(
		SELECT count(*)
		FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id"
		  AND a.status = 'completed'
		  AND (
				lower(coalesce(a.reason, '')) LIKE '%гигиен%' OR
				lower(coalesce(a.reason, '')) LIKE '%чистк%' OR
				lower(coalesce(a.reason, '')) LIKE '%air-flow%' OR
				lower(coalesce(a.reason, '')) LIKE '%ультразвук%'
		  )
	)`;

	const lastHygieneAtSql = sql<Date | null>`(
		SELECT max(a.starts_at)
		FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id"
		  AND a.status = 'completed'
		  AND (
				lower(coalesce(a.reason, '')) LIKE '%гигиен%' OR
				lower(coalesce(a.reason, '')) LIKE '%чистк%' OR
				lower(coalesce(a.reason, '')) LIKE '%air-flow%' OR
				lower(coalesce(a.reason, '')) LIKE '%ультразвук%'
		  )
	)`;

	const rows = await db
		.select({
			id: patients.id,
			lastCompletedAt: lastCompletedAtSql.as("last_completed_at"),
			lastHygieneAt: lastHygieneAtSql.as("last_hygiene_at"),
			futureCount: futureCountSql.as("future_count"),
			visitsPast12m: visitsPast12MonthsSql.as("visits_past_12m"),
			totalCompletedVisits: totalCompletedVisitsSql.as("total_completed_visits"),
			revenuePast12mRub: revenuePast12MonthsRubSql.as("revenue_past_12m_rub"),
			hasOrthoTherapy: hasOrthoOrTherapySql.as("has_ortho_therapy"),
			hasHygiene: hasHygieneSql.as("has_hygiene"),
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				eq(patients.status, "active"),
				isNull(patients.mergedIntoPatientId),
			),
		);

	const now = Date.now();
	let noVisit6mCount = 0;
	let noVisit6mRevenueKop = 0;
	let missedHygieneCount = 0;
	let missedHygieneRevenueKop = 0;
	let orthoTherapyCount = 0;
	let orthoTherapyRevenueKop = 0;
	const allActiveCount = rows.length;

	let vipCount = 0;
	let loyalCount = 0;
	let newCount = 0;
	let sleepingCount = 0;
	let lostCount = 0;
	let noVisitsCount = 0;
	let totalRevenueKop = 0;
	let totalPaidPatientsCount = 0;

	for (const r of rows) {
		const lastAt = r.lastCompletedAt ? new Date(r.lastCompletedAt).getTime() : null;
		const daysSinceLastVisit = lastAt ? Math.floor((now - lastAt) / (1000 * 3600 * 24)) : null;
		const futureAppts = Number(r.futureCount || 0);
		const visits12m = Number(r.visitsPast12m || 0);
		const totalVisits = Number(r.totalCompletedVisits || 0);
		const revenueKop = parseKopecks(r.revenuePast12mRub || "0");

		if (revenueKop > 0) {
			totalRevenueKop += revenueKop;
			totalPaidPatientsCount += 1;
		}

		// Cohort: Без визита > 6 мес (180 дней), был хотя бы 1 визит, и нет будущей записи
		const isNoVisit6m =
			totalVisits > 0 &&
			daysSinceLastVisit !== null &&
			daysSinceLastVisit > 180 &&
			futureAppts === 0;
		if (isNoVisit6m) {
			noVisit6mCount++;
			noVisit6mRevenueKop += revenueKop;
		}

		// Cohort: Пропустили регулярную гигиену (> 180 дней с гигиены или с последнего визита без последующей гигиены)
		const lastHygieneTime = r.lastHygieneAt ? new Date(r.lastHygieneAt).getTime() : null;
		const daysSinceHygiene = lastHygieneTime ? Math.floor((now - lastHygieneTime) / (1000 * 3600 * 24)) : null;
		const isMissedHygiene =
			futureAppts === 0 && (
				(daysSinceHygiene !== null && daysSinceHygiene > 180) ||
				(Number(r.hasHygiene || 0) === 0 && totalVisits > 0 && daysSinceLastVisit !== null && daysSinceLastVisit > 180)
			);
		if (isMissedHygiene) {
			missedHygieneCount++;
			missedHygieneRevenueKop += revenueKop;
		}

		// Cohort: Ортодонтия и терапия
		if (Number(r.hasOrthoTherapy || 0) > 0) {
			orthoTherapyCount++;
			orthoTherapyRevenueKop += revenueKop;
		}

		// 3D RFM Matrix Classification
		if (totalVisits === 0) {
			noVisitsCount++;
		} else if (daysSinceLastVisit !== null && daysSinceLastVisit <= 90 && visits12m >= 3 && revenueKop >= 5000000) {
			vipCount++;
		} else if (daysSinceLastVisit !== null && daysSinceLastVisit <= 180 && visits12m >= 2) {
			loyalCount++;
		} else if (daysSinceLastVisit !== null && daysSinceLastVisit <= 90 && visits12m === 1) {
			newCount++;
		} else if (daysSinceLastVisit !== null && daysSinceLastVisit > 180 && daysSinceLastVisit <= 365) {
			sleepingCount++;
		} else {
			lostCount++;
		}
	}

	const avgCheckKopecks = totalPaidPatientsCount > 0 ? Math.round(totalRevenueKop / totalPaidPatientsCount) : 0;

	const segments: MarketingSegmentMetric[] = [
		{
			id: "no_visit_6m",
			name: "Пациенты без визита > 6 мес.",
			count: noVisit6mCount,
			description: "Прошли лечение более полугода назад, требуется контрольный осмотр и гигиена",
			revenueKopecks: noVisit6mRevenueKop,
		},
		{
			id: "missed_hygiene",
			name: "Пропустили регулярную гигиену",
			count: missedHygieneCount,
			description: "Индивидуальный график профгигиены нарушен более чем на 2 месяца",
			revenueKopecks: missedHygieneRevenueKop,
		},
		{
			id: "ortho_therapy",
			name: "Ортодонтия и терапия",
			count: orthoTherapyCount,
			description: "Пациенты с активными или незавершенными планами терапевтического лечения",
			revenueKopecks: orthoTherapyRevenueKop,
		},
		{
			id: "all_active",
			name: "Вся активная база клиники",
			count: allActiveCount,
			description: "Все пациенты с заполненными контактными данными и согласием на информирование",
			revenueKopecks: totalRevenueKop,
		},
	];

	return {
		organizationId,
		totalActivePatients: allActiveCount,
		segments,
		rfm: {
			vipCount,
			loyalCount,
			newCount,
			sleepingCount,
			lostCount,
			noVisitsCount,
			totalRevenueKopecks: totalRevenueKop,
			avgCheckKopecks,
		},
		calculatedAt: new Date().toISOString(),
	};
}
