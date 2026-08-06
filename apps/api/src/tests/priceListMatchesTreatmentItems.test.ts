import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sql } from "drizzle-orm";

import { db } from "../db/client.js";

/**
 * ЦЕНА ПОЗИЦИИ ЛЕЧЕНИЯ СОВПАДАЕТ С ПРАЙСОМ, НА КОТОРЫЙ ОНА ССЫЛАЕТСЯ.
 *
 * ЗАЧЕМ ИМЕННО ТАКАЯ ПРОВЕРКА. Позиция лечения несёт `service_id` — ссылку на
 * строку прайса. Ссылка есть, а цена в позиции своя, и ничто их не связывало.
 * Замер на живой демо-клинике: в прайсе `7200.50` и `14800.99`, в позициях
 * `7200.00` и `14800.00`. Потеря 3,48 ₽ на пяти позициях.
 *
 * Беда не в трёх рублях, а в том, ЧТО ЭТО ЗА ДАННЫЕ. Демо-клиника — материал для
 * снимков визуального гейта и для сквозных денежных сценариев, и её сеялка в
 * своём же комментарии обещает: «цепочке денег нужен материал, на котором копейка
 * видна». Второй массив круглых цен стирал копейки ровно там, где они должны быть
 * видны: дефект округления в квитанции или в счёте не проявился бы на демо никогда.
 *
 * ПОЧЕМУ ПРОВЕРКА ПО ДАННЫМ, А НЕ ПО ТЕКСТУ СЕЯЛКИ. Проверка текста исходника
 * ловит один способ ошибиться и обходится вторым; проверка данных ловит любой,
 * включая правку прайса без правки позиций и наоборот. Цена — та же
 * `numeric(12,2)`, сравнение идёт ТЕКСТОМ из колонки, без плавающей точки.
 *
 * ЧЕСТНО О ТЕКУЩЕМ СОСТОЯНИИ. Сеялка починена (цена берётся из прайса, второго
 * списка больше нет), но живая база засеяна ДО правки. Значит эта проверка красна
 * до следующего пересева демо-клиники, и это правильно: она сообщает о состоянии
 * ДАННЫХ, а не о состоянии кода. Пересев не делается здесь намеренно — он сносит
 * демо-организацию целиком, а на ней в этот момент работают другие.
 *
 * Расхождение допускается ровно одно и названо: скидка живёт отдельным полем
 * (`discount_rub`), поэтому сверяется ЦЕНА ЗА ЕДИНИЦУ, а не итог строки.
 */

type Mismatch = {
	title: string;
	service_title: string;
	item_price: string;
	price_list: string;
	rows: number;
};

describe("прайс и позиции лечения", () => {
	test("цена позиции совпадает с прайсом, на который она ссылается", async (context) => {
		let rows: Mismatch[];
		try {
			const result = await db.execute<Mismatch>(sql`
				select t.title,
				       s.title as service_title,
				       t.unit_price_rub::text as item_price,
				       s.base_price_rub::text as price_list,
				       count(*)::int as rows
				  from treatment_items t
				  join service_catalog_items s on s.id = t.service_id
				 where t.unit_price_rub is distinct from s.base_price_rub
				 group by 1, 2, 3, 4
				 order by 1
			`);
			rows = result.rows as Mismatch[];
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (
				/ECONNREFUSED|ENOTFOUND|password authentication|does not exist|Connection terminated/i.test(
					message,
				)
			) {
				return context.skip(
					"база недоступна — проверка НЕ выполнена, это пропуск, а не успех",
				);
			}
			throw error;
		}

		const explained = rows
			.map(
				(row) =>
					`«${row.title}» → прайс «${row.service_title}»: в позиции ${row.item_price} ₽, ` +
					`в прайсе ${row.price_list} ₽, строк ${row.rows}`,
			)
			.join("\n  ");

		assert.deepEqual(
			rows,
			[],
			"цена позиции лечения расходится с прайсом, на который она ссылается — значит копейки " +
				"теряются между прайсом и назначенным лечением, и демо-данные перестают быть материалом, " +
				`на котором видна копейка:\n  ${explained}`,
		);
	});

	test("проверка не выродилась: связанные с прайсом позиции в базе есть", async (context) => {
		let linked: number;
		try {
			const result = await db.execute<{ n: number }>(sql`
				select count(*)::int as n from treatment_items where service_id is not null
			`);
			linked = result.rows[0]?.n ?? 0;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (
				/ECONNREFUSED|ENOTFOUND|password authentication|does not exist|Connection terminated/i.test(
					message,
				)
			) {
				return context.skip(
					"база недоступна — проверка НЕ выполнена, это пропуск, а не успех",
				);
			}
			throw error;
		}

		/*
		 * Без этой проверки предыдущая была бы зелёной на пустой базе: «расхождений
		 * нет» и «сравнивать нечего» — разные ответы, и первый без второго ничего не
		 * значит. Ровно из-за отсутствия такой пары в этом дереве датчик охвата
		 * считался и не сверялся, а обвал охвата с 106 функций до 26 проходил при
		 * семи зелёных проверках из восьми.
		 */
		assert.ok(
			linked > 0,
			"ни одна позиция лечения не ссылается на прайс — предыдущая проверка сравнивает пустое множество " +
				"и не подтверждает ничего. Засейте демо-клинику: npx tsx apps/api/src/scripts/seedOpsScreenshotDemo.ts",
		);
	});
});
