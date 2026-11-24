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
	"Month 1"?: number | undefined;
	"Month 12"?: number | undefined;
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

	const paymentKopecks = sql`coalesce(${payments.amountKopecks}, round(coalesce(${payments.amountRub}, 0) * 100)::bigint, 0)::bigint`;

	// 1. Пациенты по когортам: знаменатель когорты = общее число созданных карт пациентов за календарный месяц
	const cohortPatientsRaw = await db
		.select({
			cohortMonth: sql<string>`to_char(${cohortMonthBucket}, 'YYYY-MM')`,
			patientCount: sql<number>`count(distinct ${patients.id})::int`,
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, orgId),
				gte(patients.createdAt, ltvStartDate),
			),
		)
		.groupBy(cohortMonthBucket)
		.orderBy(cohortMonthBucket);

	// 2. Платежи пациентов когорт с группировкой по возрасту (в месяцах от создания карты до оплаты)
	// Month offset 0 = Month 1 (первые 30 дней), offset 1 = Month 2, ..., offset 11 = Month 12
	const monthOffsetExpr = sql<number>`greatest(0, (date_part('year', age(coalesce(${payments.paidAt}, ${payments.createdAt}), ${patients.createdAt})) * 12 + date_part('month', age(coalesce(${payments.paidAt}, ${payments.createdAt}), ${patients.createdAt})))::int)`;

	const cohortPaymentsRaw = await db
		.select({
			cohortMonth: sql<string>`to_char(${cohortMonthBucket}, 'YYYY-MM')`,
			monthOffset: monthOffsetExpr,
			netKopecks: sql<number>`coalesce(sum(case when ${payments.status} = 'paid' then ${paymentKopecks} when ${payments.status} = 'refunded' then -abs(${paymentKopecks}) else 0 end), 0)::bigint`,
		})
		.from(patients)
		.innerJoin(
			payments,
			and(
				eq(payments.patientId, patients.id),
				eq(payments.organizationId, orgId),
				inArray(payments.status, ["paid", "refunded"]),
				sql`(${payments.documentId} is null or not exists (select 1 from patient_invoices pi where pi.id = ${payments.documentId} and pi.organization_id = ${orgId} and pi.status in ('voided', 'cancelled')))`,
			),
		)
		.where(
			and(
				eq(patients.organizationId, orgId),
				gte(patients.createdAt, ltvStartDate),
			),
		)
		.groupBy(cohortMonthBucket, monthOffsetExpr);

	const paymentsMap = new Map<string, number>();
	for (const row of cohortPaymentsRaw) {
		const cm = row.cohortMonth;
		if (!cm) continue;
		const offset = Number(row.monthOffset || 0);
		const key = `${cm}:${offset}`;
		paymentsMap.set(key, Number(row.netKopecks || 0));
	}

	const cohortLtvJson: CohortLtvItem[] = cohortPatientsRaw
		.slice(-6)
		.map((cohortRow) => {
			const key = cohortRow.cohortMonth;
			const patientCount = Math.max(1, Number(cohortRow.patientCount || 1));
			const [yearStr, monthStr] = key.split("-");
			const yearNum = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
			const monthIdx = monthStr ? parseInt(monthStr, 10) - 1 : 0;
			const label = (RU_MONTHS as readonly string[])[monthIdx] ?? key;

			// Честный возраст когорты в месяцах
			const cohortAgeMonths = Math.max(
				1,
				(now.getFullYear() - yearNum) * 12 + (now.getMonth() - monthIdx) + 1,
			);
			const maxMaturedMonth = Math.min(12, cohortAgeMonths);

			const item: CohortLtvItem = {
				cohort: label,
			};

			// Заполняем накопительный LTV ТОЛЬКО для фактически наступивших месяцев
			let cumulativeKopecks = 0;
			for (let m = 1; m <= maxMaturedMonth; m++) {
				const offset = m - 1;
				const periodKopecks = paymentsMap.get(`${key}:${offset}`) || 0;
				cumulativeKopecks += periodKopecks;
				const avgKopecks = Math.round(cumulativeKopecks / patientCount);
				const ltvRub = kopecksToRubles(avgKopecks);
				item[`Month ${m}`] = ltvRub;
			}

			if (item["Month 12"] === undefined) {
				item["Month 12"] = item[`Month ${maxMaturedMonth}`];
			}

			return item;
		});

	return { cohortLtvJson, cohortZone };
}
