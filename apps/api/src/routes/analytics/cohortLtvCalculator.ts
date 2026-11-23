import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { kopecksToRubles, sumKopecks, toExactKopecks } from "@dental/shared";
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
	[key: string]: string | number | undefined;
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

	const paymentKopecks = sql`coalesce(${payments.amountKopecks}, round(${payments.amountRub} * 100)::bigint)`;

	// [SEV-1.3] leftJoin по всем пациентам: знаменатель когорты = общее число созданных карт пациентов за месяц
	const cohortRaw = await db
		.select({
			cohortMonth: sql<string>`to_char(${cohortMonthBucket}, 'YYYY-MM')`,
			patientId: patients.id,
			totalKopecks: sql<string>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopecks} when ${payments.status} = 'refunded' then -abs(${paymentKopecks}) else 0 end), 0)::bigint`,
		})
		.from(patients)
		.leftJoin(
			payments,
			and(
				eq(payments.patientId, patients.id),
				eq(payments.organizationId, orgId),
				inArray(payments.status, ["paid", "refunded"]),
			),
		)
		.where(
			and(
				eq(patients.organizationId, orgId),
				gte(patients.createdAt, ltvStartDate),
			),
		)
		.groupBy(cohortMonthBucket, patients.id)
		.orderBy(cohortMonthBucket);

	const cohortMap = new Map<string, number[]>();
	for (const row of cohortRaw) {
		const cm = row.cohortMonth;
		if (!cm) continue;
		if (!cohortMap.has(cm)) {
			cohortMap.set(cm, []);
		}
		const list = cohortMap.get(cm);
		if (list) {
			list.push(toExactKopecks(Number(row.totalKopecks)));
		}
	}

	const cohortLtvJson: CohortLtvItem[] = Array.from(cohortMap.entries())
		.slice(-6)
		.map(([key, kopecksList]) => {
			const [yearStr, monthStr] = key.split("-");
			const yearNum = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
			const monthIdx = monthStr ? parseInt(monthStr, 10) - 1 : 0;
			const label = (RU_MONTHS as readonly string[])[monthIdx] ?? key;
			const totalKopecks = sumKopecks(kopecksList);
			const avgKopecks = kopecksList.length > 0 ? Math.round(totalKopecks / kopecksList.length) : 0;
			const ltvRub = Math.round(kopecksToRubles(avgKopecks));

			// [SEV-1.3] Реальный возраст когорты в месяцах: Month 1, Month 3, Month 6 и т.д.
			const cohortAgeMonths = Math.max(1, (now.getFullYear() - yearNum) * 12 + (now.getMonth() - monthIdx) + 1);
			const cohortAgeKey = `Month ${cohortAgeMonths}`;

			return {
				cohort: label,
				[cohortAgeKey]: ltvRub,
				"Month 12": ltvRub,
			};
		});

	return { cohortLtvJson, cohortZone };
}
