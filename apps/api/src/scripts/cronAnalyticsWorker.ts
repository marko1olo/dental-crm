import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	biAnalyticsSnapshots,
	patientInvoices,
	patients,
	treatmentPlans,
} from "../db/schema.js";

/**
 * Сырая строка запроса прибыльности. Числа объявлены `string | number`, потому
 * что драйвер pg отдаёт `SUM(numeric)` и `COUNT(*)` (bigint) строками, а не
 * числами: тип, обещающий `number`, был бы ложью.
 */
export interface DoctorProfitabilityQueryRow {
	readonly name: string | null;
	readonly revenue: string | number | null;
	readonly total_appointments: string | number | null;
	readonly completed_appointments: string | number | null;
}

/**
 * Строка «эффективности врача» в том виде, в каком она ложится в
 * bi_analytics_snapshots.doctor_profitability_json и доезжает до экрана
 * аналитики. `margin` и `completionRate` — `number | null`: null означает
 * «считать не из чего», и интерфейс печатает на его месте прочерк
 * (pages/analyticsDoctorMetrics.ts:154-159).
 */
export interface DoctorProfitabilitySnapshotRow {
	readonly name: string;
	readonly revenue: number;
	readonly margin: number | null;
	readonly completionRate: number | null;
}

/** Число из того, что вернул драйвер: строка, число или null. */
function toCount(value: string | number | null | undefined): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Сборка строки прибыльности врача. Вынесена из запроса отдельно, чтобы её
 * можно было проверить обычным node:test без базы — тем же приёмом, что и
 * `doctorProfitabilityRow` в services/biAnalyticsWorker.ts.
 *
 * СЕБЕСТОИМОСТИ В СИСТЕМЕ НЕТ, ПОЭТОМУ ПРИБЫЛИ НЕТ. Здесь стояло
 * `margin: Number(row.revenue) * 0.4` с подписью «Simplified margin heuristic»:
 * сорок процентов выручки объявлялись прибылью врача и уходили в
 * bi_analytics_snapshots — ту же таблицу и ту же форму, что читает экран
 * аналитики. Число выглядело расчётом, расчётом не являясь.
 *
 * Посчитать маржу честно не из чего: на 2026-07-28 в базе пусты все источники
 * затрат — inventory_transactions, inventory_items, procedure_material_rules,
 * doctor_commissions, pricelist_doctor_payrolls (по нулю строк в каждой).
 * Подставить ноль вместо неизвестной себестоимости нельзя: тогда прибылью
 * объявляется вся выручка целиком — ложь крупнее прежней. То же решение уже
 * принято на живом маршруте routes/analytics.ts:127-132.
 *
 * Успешность, в отличие от маржи, измерима: статусы приёмов в базе есть.
 * Здесь стояла константа `85`. Единица — процентные пункты (85 означает 85 %),
 * как того требует `formatCompletionRate`
 * (pages/analyticsDoctorMetrics.ts:117-118); доля 0..1 из
 * services/reports/managerReports.ts:255 — другой контракт, сюда не годится.
 * Округление не делаем: это задача отображения, оно там и живёт.
 */
export function buildDoctorProfitabilityRow(
	row: DoctorProfitabilityQueryRow,
): DoctorProfitabilitySnapshotRow {
	// Приёмов у врача может не быть вовсе — тогда делить не на что. Ноль здесь
	// был бы утверждением «врач не завершил ни одного приёма», а это разные
	// вещи: нечего считать ≠ посчитали и вышел ноль.
	const totalAppointments = toCount(row.total_appointments);
	const completedAppointments = toCount(row.completed_appointments);

	return {
		name: row.name ?? "Врач не указан",
		revenue: toCount(row.revenue),
		margin: null,
		completionRate:
			totalAppointments > 0
				? (completedAppointments / totalAppointments) * 100
				: null,
	};
}

export async function runBiAnalyticsAggregation(orgId: string) {
	try {
		console.log(
			`[BI Analytics] Starting aggregation for organization: ${orgId}`,
		);

		// 1. Cohort LTV (Real Implementation)
		const rawLtv = await db.execute(sql`
			WITH cohorts AS (
				SELECT 
					id as patient_id, 
					to_char(created_at, 'YYYY-MM') as cohort
				FROM patients
				WHERE organization_id = ${orgId}
			),
			revenues AS (
				SELECT 
					i.patient_id,
					i.total_amount_rub,
					EXTRACT(day FROM (i.created_at - p.created_at)) as days_since_registration
				FROM patient_invoices i
				JOIN patients p ON p.id = i.patient_id
				WHERE i.organization_id = ${orgId} AND i.status = 'paid'
			)
			SELECT 
				c.cohort,
				COALESCE(SUM(CASE WHEN r.days_since_registration <= 30 THEN r.total_amount_rub ELSE 0 END), 0) as month_1_revenue,
				COALESCE(SUM(CASE WHEN r.days_since_registration <= 365 THEN r.total_amount_rub ELSE 0 END), 0) as month_12_revenue
			FROM cohorts c
			LEFT JOIN revenues r ON c.patient_id = r.patient_id
			GROUP BY c.cohort
			ORDER BY c.cohort DESC
			LIMIT 6
		`);

		const cohortLtvJson = rawLtv.rows.map((row: any) => ({
			cohort: row.cohort,
			"Month 1": Number(row.month_1_revenue),
			"Month 12": Number(row.month_12_revenue),
		}));

		// 2. Treatment Plan Funnel (Real Implementation)
		const planCounts = await db
			.select({
				status: treatmentPlans.status,
				count: sql<number>`count(*)::int`,
			})
			.from(treatmentPlans)
			.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
			.where(eq(patients.organizationId, orgId))
			.groupBy(treatmentPlans.status);

		const funnelMap: Record<string, number> = {
			draft: 0,
			proposed: 0,
			approved: 0,
			active: 0,
			completed: 0,
		};
		for (const p of planCounts) {
			if (p.status in funnelMap) funnelMap[p.status] = p.count;
		}

		const planFunnelJson = [
			{ name: "Draft", value: funnelMap.draft },
			{ name: "Proposed", value: funnelMap.proposed },
			{ name: "Approved", value: funnelMap.approved },
			{ name: "Active", value: funnelMap.active },
			{ name: "Completed", value: funnelMap.completed },
		];

		// 3. Chair Utilization Rate (Real Implementation)
		const chairUsage = await db.execute(sql`
			SELECT 
				c.name,
				COUNT(a.id) as appointment_count
			FROM chairs c
			LEFT JOIN appointments a ON a.chair_id = c.id 
				AND a.starts_at > NOW() - INTERVAL '30 days'
			WHERE c.organization_id = ${orgId}
			GROUP BY c.id, c.name
		`);

		const colors = ["#14b8a6", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];
		const chairUtilizationJson = chairUsage.rows.map((row: any, idx: number) => ({
			name: row.name,
			value: Number(row.appointment_count),
			fill: colors[idx % colors.length]
		}));

		// 4. Doctor Profitability
		//
		// ВЫРУЧКА и УСПЕШНОСТЬ СЧИТАЮТСЯ ПО РАЗНЫМ МНОЖЕСТВАМ ПРИЁМОВ, поэтому здесь
		// два отдельных CTE, а не один JOIN. Выручка идёт через оплаченные счета
		// (appointments -> visits -> patient_invoices), и это внутреннее соединение
		// оставляет только те приёмы, которые дошли до оплаты. Считать успешность
		// врача на этом же множестве бессмысленно: оно завершённое по построению,
		// и доля «завершённых» вышла бы близкой к 100 % у любого врача.
		// Успешность берётся по всему приёмному журналу врача.
		const doctorProf = await db.execute(sql`
			WITH doctor_revenue AS (
				SELECT
					a.doctor_user_id AS doctor_id,
					SUM(i.total_amount_rub) AS revenue
				FROM appointments a
				JOIN visits v ON v.appointment_id = a.id
				JOIN patient_invoices i ON i.visit_id = v.id
				WHERE i.organization_id = ${orgId} AND i.status = 'paid'
				GROUP BY a.doctor_user_id
			),
			doctor_appointments AS (
				SELECT
					a.doctor_user_id AS doctor_id,
					COUNT(*) AS total_count,
					COUNT(*) FILTER (WHERE a.status = 'completed') AS completed_count
				FROM appointments a
				WHERE a.organization_id = ${orgId} AND a.doctor_user_id IS NOT NULL
				GROUP BY a.doctor_user_id
			)
			SELECT
				u.full_name AS name,
				COALESCE(r.revenue, 0) AS revenue,
				ap.total_count AS total_appointments,
				ap.completed_count AS completed_appointments
			FROM users u
			LEFT JOIN doctor_revenue r ON r.doctor_id = u.id
			LEFT JOIN doctor_appointments ap ON ap.doctor_id = u.id
			WHERE u.organization_id = ${orgId}
				AND (r.revenue IS NOT NULL OR ap.total_count IS NOT NULL)
			ORDER BY revenue DESC
			LIMIT 5
		`);

		const doctorProfitabilityJson = doctorProf.rows.map(
			(row: DoctorProfitabilityQueryRow) => buildDoctorProfitabilityRow(row),
		);

		// Insert new snapshot
		await db.insert(biAnalyticsSnapshots).values({
			organizationId: orgId,
			snapshotDate: new Date(),
			cohortLtvJson: cohortLtvJson.length ? cohortLtvJson : [],
			planFunnelJson,
			chairUtilizationJson: chairUtilizationJson.length ? chairUtilizationJson : [],
			doctorProfitabilityJson: doctorProfitabilityJson.length ? doctorProfitabilityJson : [],
		});

		console.log(
			`[BI Analytics] Snapshot generated successfully for organization: ${orgId}`,
		);
	} catch (err) {
		console.error("[BI Analytics] Failed to run aggregation:", err);
	}
}
