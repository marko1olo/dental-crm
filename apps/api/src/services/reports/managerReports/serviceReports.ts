/**
 * Отчёт по оказанным услугам и категориям номенклатуры (что продаётся).
 */

import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { kopecksToRubles, sumKopecks, toExactKopecks } from "@dental/shared";
import { db } from "../../../db/client.js";
import { treatmentItems, visits } from "../../../db/schema.js";
import type {
	ReportScope,
	ServiceSalesReport,
	ServiceSalesRow,
} from "./types.js";

/**
 * Что продаётся. Считается по позициям лечения, а не по платежам: платёж не
 * знает, за какую услугу он получен.
 *
 * ВАЖНО ПРО СМЫСЛ ЧИСЛА. Это назначенная сумма, а не полученная. Разница между
 * ней и выручкой — это дебиторка и скидки, поэтому подписывать её словом
 * «выручка» нельзя.
 */
export async function serviceSales(
	scope: ReportScope,
	limit = 50,
): Promise<ServiceSalesReport> {
	// Сумма позиции: цена за единицу на количество минус скидка, не ниже нуля.
	// Выражение используется и в выборке, и в сортировке, поэтому объявлено один раз.
	const effectiveUnitKop = sql`coalesce(${treatmentItems.unitPriceKopecks}, 0)::bigint`;
	const effectiveDiscountKop = sql`coalesce(${treatmentItems.discountKopecks}, 0)::bigint`;
	const lineTotalKopecks = sql<string>`coalesce(sum(greatest(${effectiveUnitKop} * ${treatmentItems.quantity} - ${effectiveDiscountKop}, 0)), 0)::bigint`;
	const discountKopecksExpr = sql<string>`coalesce(sum(${effectiveDiscountKop}), 0)::bigint`;

	const rows = await db
		.select({
			title: treatmentItems.title,
			quantity: sql<number>`coalesce(sum(${treatmentItems.quantity}), 0)::int`,
			plannedKopecks: lineTotalKopecks,
			discountKopecks: discountKopecksExpr,
		})
		.from(treatmentItems)
		.leftJoin(visits, eq(treatmentItems.visitId, visits.id))
		.where(
			and(
				eq(treatmentItems.organizationId, scope.organizationId),
				ne(treatmentItems.status, "cancelled"),
				// Позиции без визита в период не попадают: датировать их нечем.
				gte(visits.createdAt, scope.from),
				lte(visits.createdAt, scope.to),
			),
		)
		.groupBy(treatmentItems.title)
		.orderBy(sql`${lineTotalKopecks} desc`)
		.limit(Math.max(1, Math.min(500, limit)));

	const result: ServiceSalesRow[] = rows
		.map((row) => {
			const quantity = Number(row.quantity);
			const plannedKopecks = Number(row.plannedKopecks);
			const discountKopecks = Number(row.discountKopecks);
			const averagePriceKopecks = quantity > 0 ? Math.round(plannedKopecks / quantity) : 0;
			return {
				title: row.title,
				quantity,
				plannedRub: kopecksToRubles(plannedKopecks),
				plannedKopecks,
				averagePriceRub: kopecksToRubles(averagePriceKopecks),
				averagePriceKopecks,
				discountRub: kopecksToRubles(discountKopecks),
				discountKopecks,
			};
		})
		.sort((left, right) => (right.plannedKopecks ?? 0) - (left.plannedKopecks ?? 0));

	const totalPlannedKop = sumKopecks(result.map((r) => toExactKopecks(r.plannedKopecks ?? 0)));
	const totalDiscountKop = sumKopecks(result.map((r) => toExactKopecks(r.discountKopecks ?? 0)));

	return {
		rows: result,
		plannedTotalRub: kopecksToRubles(totalPlannedKop),
		plannedTotalKopecks: Number(totalPlannedKop),
		discountTotalRub: kopecksToRubles(totalDiscountKop),
		discountTotalKopecks: Number(totalDiscountKop),
		note:
			"Суммы назначенные, а не полученные: разница с выручкой — это дебиторка и скидки. " +
			"Позиции без привязки к приёму в отчёт не входят, датировать их нечем.",
		isEmpty: result.length === 0,
	};
}
