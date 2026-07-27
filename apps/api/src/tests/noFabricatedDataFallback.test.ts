import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Запрет на возврат выдуманных данных из слоя доступа к базе.
 *
 * ЧТО БЫЛО. 50 из 65 модулей db/*Query.ts имели одинаковый хвост:
 *
 *     export async function getXFromDb(orgId) {
 *       try {
 *         await ensureXTable();                       // CREATE TABLE во время запроса
 *         const rows = await db.select()...;
 *         if (rows && rows.length > 0) return rows;   // только НЕПУСТОЙ результат
 *       } catch (err) {
 *         console.warn("[X DB Fallback]:", err);      // ошибка проглатывается
 *       }
 *       return [ { patientName: "Орлов Станислав Викторович", ... } ];
 *     }
 *
 * Пустая таблица и сбой SQL давали один и тот же результат — придуманные строки
 * с ФИО несуществующих пациентов, диагнозами и суммами. На живой базе (все 77
 * миграций применены, 134 таблицы) эти таблицы пусты, то есть КАЖДЫЙ такой
 * экран показывал вымысел, неотличимый от настоящих данных. В медицинской
 * системе это прямо запрещено правилом «Zero Mocks» из AGENTS.md.
 *
 * Отдельно опасен был `CREATE TABLE IF NOT EXISTS` внутри обработчика запроса:
 * рантайм-DDL конкурировал с файлами миграций за право определять схему, и у 17
 * таблиц набор колонок разошёлся — drizzle подставлял в SELECT имена из
 * schema.ts, которых в созданной таблице не было, запрос падал, ошибку глотал
 * catch, и наружу шли те же выдуманные строки. Сломано это было полностью, а
 * выглядело работающим.
 *
 * ПРАВИЛО. Слой доступа к данным возвращает то, что в базе. Пусто — значит
 * пустой массив. Сбой — значит исключение до обработчика. Демонстрационные
 * данные заводятся сид-скриптом, схема — миграциями (scripts/migrate.ts).
 */

const dbDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../db",
);

function queryModules(): string[] {
	return readdirSync(dbDir)
		.filter((name) => name.endsWith("Query.ts"))
		.sort();
}

function read(name: string): string {
	return readFileSync(path.join(dbDir, name), "utf8");
}

test("слой доступа к данным не создаёт таблицы во время запроса", () => {
	const offenders = queryModules().filter((name) =>
		read(name).includes("CREATE TABLE IF NOT EXISTS"),
	);

	assert.deepEqual(
		offenders,
		[],
		"Схему определяют файлы drizzle/*.sql и scripts/migrate.ts, а не обработчик " +
			`запроса. Рантайм-DDL найден в: ${offenders.join(", ")}`,
	);
});

test("слой доступа к данным не подменяет результат выдуманными строками", () => {
	const offenders = queryModules().filter((name) => {
		const source = read(name);
		return (
			/DB Fallback/.test(source) ||
			// «вернуть строки только если их больше нуля» — маркер подмены:
			// у честной выборки нет причин отличать пустой результат от непустого.
			/if \(rows && rows\.length > 0\) return rows;/.test(source)
		);
	});

	assert.deepEqual(
		offenders,
		[],
		`Пустая таблица — это пустой список, а не демонстрационные данные: ${offenders.join(", ")}`,
	);
});

test("слой доступа к данным не глушит ошибки базы через console.warn", () => {
	const offenders = queryModules().filter((name) =>
		/catch \([^)]*\) \{\s*\n\s*console\.warn/.test(read(name)),
	);

	assert.deepEqual(
		offenders,
		[],
		"Сбой базы должен дойти до обработчика и до клиента, иначе он выглядит как " +
			`«данных нет». Проглатывание найдено в: ${offenders.join(", ")}`,
	);
});
