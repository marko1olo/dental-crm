import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patients, payments } from "../../db/schema.js";
import {
	clinicTimeZone,
	inClinicZone,
	postgresKnowsTimeZone,
} from "../../services/reports/managerReports.js";
import { RU_MONTHS } from "./types.js";

export interface CohortLtvItem {
	cohort: string;
	"Month 12": number;
}

export interface CohortCalculationResult {
	cohortLtvJson: CohortLtvItem[];
	cohortZone: string | null;
}

export async function calculateCohortLtv(
	orgId: string,
	now: Date = new Date(),
): Promise<CohortCalculationResult> {
	const ltvStartDate = new Date(now);
	ltvStartDate.setMonth(ltvStartDate.getMonth() - 12);

	const cohortZone = await postgresKnowsTimeZone(await clinicTimeZone(orgId));
	const cohortMonthBucket = sql`date_trunc('month', ${inClinicZone(patients.createdAt, cohortZone)})`;

	const cohortRaw = await db
		.select({
			cohortMonth: sql<string>`to_char(${cohortMonthBucket}, 'YYYY-MM')`,
			patientId: payments.patientId,
			totalRevenue: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amountRub} when ${payments.status} = 'refunded' then -${payments.amountRub} else 0 end), 0)`,
		})
		.from(payments)
		.innerJoin(patients, eq(payments.patientId, patients.id))
		.where(
			and(
				eq(patients.organizationId, orgId),
				eq(payments.organizationId, orgId),
				gte(patients.createdAt, ltvStartDate),
				inArray(payments.status, ["paid", "refunded"]),
			),
		)
		.groupBy(cohortMonthBucket, payments.patientId)
		.orderBy(cohortMonthBucket);

	const cohortMap = new Map<string, number[]>();
	for (const row of cohortRaw) {
		const cm = row.cohortMonth;
		if (!cm) continue;
		if (!cohortMap.has(cm)) {
			cohortMap.set(cm, []);
		}
		cohortMap.get(cm)!.push(Number(row.totalRevenue));
	}

	const cohortLtvJson: CohortLtvItem[] = Array.from(cohortMap.entries())
		.slice(-6)
		.map(([key, revenues]) => {
			const [, monthStr] = key.split("-");
			const monthIdx = monthStr ? parseInt(monthStr, 10) - 1 : 0;
			const label = (RU_MONTHS as readonly string[])[monthIdx] ?? key;
			const avg = revenues.length
				? Math.round(revenues.reduce((a, b) => a + b, 0) / revenues.length)
				: 0;
			return {
				cohort: label,
				"Month 12": avg,
			};
		});

	return { cohortLtvJson, cohortZone };
}
