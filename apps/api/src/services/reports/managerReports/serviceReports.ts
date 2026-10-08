/**
 * Отчёт по оказанным услугам и категориям номенклатуры (что продаётся).
 */

import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
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
	// Выражение используется и в выборке, и в сортировке, поэтому объявлено один
	// раз: `orderBy(sql`2 desc`)` по номеру столбца отсортировал бы по
	// количеству, и LIMIT отрезал бы самые дорогие услуги вместо самых мелких.
	/*
	 * Было `::int`. Количество объявлено numeric(10,2), а цена с миграции 0135
	 * хранится с копейками: приведение к целому округляло итог по услуге.
	 * Проверено на базе: половина услуги за 6 805,50 ₽ давала в отчёте 3 403
	 * вместо 3 402,75.
	 */
	/*
	 * УБРАН `greatest(quantity, 1)` — ЭТО БЫЛА ТИХАЯ ДОГАДКА, А НЕ ЗАЩИТА.
	 *
	 * Стояло `unit_price_rub * greatest(quantity, 1) - discount_rub`. То есть
	 * позиция с количеством 0 или отрицательным выставлялась в отчёте как ОДНА
	 * ЕДИНИЦА — счёт за объём, которого в позиции нет. Проверены все три
	 * объяснения, которые могли бы её оправдать; ни одно не подтвердилось
	 * (разбор 2026-08-06):
	 *
	 *  • «защита от деления/умножения на ноль». НЕТ: здесь умножение, ноль в нём
	 *    безопасен. Единственное деление на количество стоит ниже
	 *    (`averagePriceRub`) и УЖЕ защищено собственным `quantity > 0 ? … : 0`.
	 *  • «починка плохих данных». НЕТ, она частична и потому обманчива: колонка
	 *    объявлена `numeric(10, 2)` и пропускает ДРОБНОЕ количество (об этом прямо
	 *    сказано в миграции 0135), а `greatest(…, 1)` про дробное не знает ничего.
	 *    Заглушка, закрывающая один случай из двух, врёт о модели угроз.
	 *  • «осознанное правило: строка без количества считается за одну». НЕТ: ни
	 *    комментария, ни документа, ни проверки. Введено 2026-07-27 первым же
	 *    коммитом отчётов (782098525) без единого слова объяснения и с тех пор не
	 *    трогалось. Общий контракт требует обратного —
	 *    `packages/shared/src/index.ts`, `quantity: z.number().int().positive()`.
	 *
	 * КАНОН ЭТОТ ВОПРОС УЖЕ РЕШИЛ, И НЕ В ПОЛЬЗУ ЕДИНИЦЫ.
	 * `money/patientDebt.ts`, `assertContractQuantity`: количество ≤ 0 — ОТКАЗ,
	 * дословно «позицию без объёма надо отменять статусом cancelled, а не считать
	 * как одну единицу». Там же, в шапке файла, прежнее выражение ЭТОГО отчёта
	 * названо тихой правкой данных. Расхождение отчёта руководителю с кассой хуже
	 * любого из трёх правил, поэтому фантомная единица убрана: канон и отчёт
	 * теперь сходятся в том, что за строку без объёма не выставляется ничего.
	 *
	 * ЧИСЛЕННЫЙ ЭФФЕКТ НА ЗАКОННЫХ ДАННЫХ — НОЛЬ. При `quantity >= 1`
	 * `greatest(quantity, 1) = quantity` побитово. Меняется только поведение на
	 * данных, которые контракт запрещает: строка с `quantity <= 0` даёт 0 (внешний
	 * `greatest(…, 0)` уже стоит), а не цену одной единицы.
	 *
	 * ЧЕГО ЭТА ПРАВКА НЕ ДЕЛАЕТ. В базе у `treatment_items` НОЛЬ ограничений типа
	 * CHECK (замер живого `pg_constraint` 2026-08-06), поэтому `quantity <= 0` и
	 * дробное физически возможны прямой записью в SQL. Через приложение — нет:
	 * единственный производственный писатель (`routes/odontogram.ts`) валидирует
	 * `z.number().int().min(1).max(999)`. Настоящее лечение — ограничение на
	 * уровне колонки, оно вне этой правки.
	 *
	 * ТО ЖЕ ВЫРАЖЕНИЕ ОСТАЛОСЬ ЕЩЁ В ОДНОМ ПРОИЗВОДСТВЕННОМ МЕСТЕ:
	 * `services/communications/audience.ts:276`. Оно вне области этой правки и
	 * названо здесь явно, чтобы его не искали заново.
	 */
	const lineTotal = sql<number>`coalesce(sum(greatest(${treatmentItems.unitPriceRub} * ${treatmentItems.quantity} - ${treatmentItems.discountRub}, 0)), 0)::numeric(12,2)`;

	const rows = await db
		.select({
			title: treatmentItems.title,
			// Количество тоже без `greatest(…, 1)`: столбец «сколько продано» не
			// должен показывать единицу там, где её не продавали.
			quantity: sql<number>`coalesce(sum(${treatmentItems.quantity}), 0)::int`,
			plannedRub: lineTotal,
			discountRub: sql<number>`coalesce(sum(${treatmentItems.discountRub}), 0)::numeric(12,2)`,
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
		.orderBy(sql`${lineTotal} desc`)
		.limit(Math.max(1, Math.min(500, limit)));

	const result: ServiceSalesRow[] = rows
		.map((row) => {
			const quantity = Number(row.quantity);
			const plannedRub = Number(row.plannedRub);
			return {
				title: row.title,
				quantity,
				plannedRub,
				averagePriceRub: quantity > 0 ? Math.round(plannedRub / quantity) : 0,
				discountRub: Number(row.discountRub),
			};
		})
		.sort((left, right) => right.plannedRub - left.plannedRub);

	return {
		rows: result,
		plannedTotalRub: result.reduce((total, row) => total + row.plannedRub, 0),
		discountTotalRub: result.reduce((total, row) => total + row.discountRub, 0),
		note:
			"Суммы назначенные, а не полученные: разница с выручкой — это дебиторка и скидки. " +
			"Позиции без привязки к приёму в отчёт не входят, датировать их нечем.",
		isEmpty: result.length === 0,
	};
}
