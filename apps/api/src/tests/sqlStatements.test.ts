/**
 * sqlStatements.test.ts — разбор SQL на выражения.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ СУЩЕСТВУЕТ. Разборщик решает, какими кусками SQL уходит в
 * боевую базу, и его прежняя реализация (split по каждому ';') уронила
 * раскатку чистой базы: `npm run db:migrate` вставал на 0134 из 130 файлов.
 * Регрессия здесь не проявляется как ошибка компиляции — она проявляется как
 * половина оператора, отправленная в базу. Поэтому проверка поведением.
 *
 * Правила взяты из документации PostgreSQL, раздел 4.1 (Lexical Structure):
 * блочные комментарии вложенные; тег долларового цитирования регистрозависим и
 * может быть пустым; в обычной строке кавычка удваивается, а обратная косая
 * черта не экранирует ничего — экранирует она только в E'…'.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
	carriesConcurrently,
	scanSqlStatements,
	splitSqlStatements,
} from "../scripts/sqlStatements.js";

const MIGRATIONS_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../drizzle",
);

function migration(name: string): string {
	return readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
}

describe("splitSqlStatements — границы выражений", () => {
	it("не режет по точке с запятой внутри однострочного комментария", () => {
		assert.equal(splitSqlStatements("SELECT 1 -- a; b\n;").length, 1);
	});

	it("не режет по точке с запятой внутри блочного комментария", () => {
		assert.equal(splitSqlStatements("SELECT 1 /* a; b */ ;").length, 1);
	});

	it("считает блочные комментарии вложенными, как требует PostgreSQL", () => {
		// Реализация с булевым флагом «внутри комментария» закрыла бы комментарий
		// на первом */ и увидела бы c; как отдельное выражение.
		assert.equal(splitSqlStatements("SELECT 1 /* a /* b; */ c; */ ;").length, 1);
	});

	it("не режет по точке с запятой внутри строкового литерала", () => {
		assert.equal(splitSqlStatements("SELECT 'a;b';").length, 1);
		assert.equal(splitSqlStatements("SELECT 'it''s; ok';").length, 1);
	});

	it("не режет по точке с запятой внутри идентификатора в кавычках", () => {
		assert.equal(splitSqlStatements('SELECT 1 AS "a;b";').length, 1);
		assert.equal(splitSqlStatements('SELECT 1 AS "a""b;c";').length, 1);
	});

	it("в E'…' обратная косая черта экранирует кавычку", () => {
		assert.equal(splitSqlStatements("SELECT E'a\\';b';").length, 1);
	});

	it("не режет тело $$…$$ и $tag$…$tag$", () => {
		assert.equal(splitSqlStatements("DO $$ BEGIN a; b; END $$; SELECT 1;").length, 2);
		assert.equal(
			splitSqlStatements(
				"CREATE FUNCTION f() RETURNS void AS $fn$ BEGIN a; END $fn$ LANGUAGE plpgsql; SELECT 1;",
			).length,
			2,
		);
	});

	it("допускает вложение долларовых литералов с РАЗНЫМИ тегами", () => {
		assert.equal(
			splitSqlStatements("DO $outer$ x $inner$ a; b $inner$ y; $outer$; SELECT 1;").length,
			2,
		);
	});

	it("не принимает позиционный параметр $1 за начало цитирования", () => {
		assert.equal(splitSqlStatements("SELECT $1; SELECT $2;").length, 2);
	});

	it("не принимает '$' внутри идентификатора за начало цитирования", () => {
		// Postgres лексирует a$b$c как ОДИН идентификатор (правило самого длинного
		// совпадения), поэтому и разборщик обязан.
		assert.equal(splitSqlStatements("SELECT a$b$c; SELECT 1;").length, 2);
	});

	it("отбрасывает хвост без SQL, но не первый оператор под шапкой комментариев", () => {
		assert.equal(splitSqlStatements("SELECT 1;\n-- конец\n").length, 1);
		assert.deepEqual(splitSqlStatements("-- шапка\nSELECT 1;"), ["-- шапка\nSELECT 1;"]);
	});

	it("склейка выражений через ';' возвращает исходный текст без потерь", () => {
		const sql = "-- шапка\nDO $$ a; b $$;\nSELECT 'c;d';\n";
		assert.equal(scanSqlStatements(sql).map((s) => s.text).join(";"), sql);
	});
});

describe("carriesConcurrently — CONCURRENTLY в коде, а не в комментарии", () => {
	it("не считает упоминание в комментарии", () => {
		assert.equal(carriesConcurrently("-- CONCURRENTLY\nCREATE INDEX i ON t (c);"), false);
		assert.equal(carriesConcurrently("/* CONCURRENTLY */ CREATE INDEX i ON t (c);"), false);
	});

	it("считает настоящий оператор", () => {
		assert.equal(carriesConcurrently("CREATE INDEX CONCURRENTLY i ON t (c);"), true);
	});
});

describe("реальные миграции репозитория", () => {
	it("0134: DO-блок остаётся целым, за ним отдельный CREATE UNIQUE INDEX", () => {
		const statements = splitSqlStatements(migration("0134_ai_jobs_recording_path_index.sql"));
		assert.equal(statements.length, 2);
		assert.match(statements[0]?.trim() ?? "", /DO \$\$[\s\S]*END \$\$;$/);
		assert.match(statements[1]?.trim() ?? "", /^CREATE UNIQUE INDEX/);
	});

	it("0118: тело функции на $fn$ не разрезано", () => {
		const withFunction = splitSqlStatements(
			migration("0118_align_tables_with_schema.sql"),
		).filter((statement) => statement.includes("$fn$"));
		assert.equal(withFunction.length, 1);
		assert.match(
			withFunction[0]?.trim() ?? "",
			/CREATE OR REPLACE FUNCTION[\s\S]*\$fn\$ LANGUAGE plpgsql;$/,
		);
	});

	it("0134 и 0141 объясняют в комментарии, почему НЕ используют CONCURRENTLY, и проверку не будят", () => {
		assert.equal(carriesConcurrently(migration("0134_ai_jobs_recording_path_index.sql")), false);
		assert.equal(carriesConcurrently(migration("0141_hot_path_indexes.sql")), false);
	});

	it("0155 и 0156 действительно содержат CONCURRENTLY и помечены no-transaction", () => {
		for (const name of ["0155_paranoid_fk_indexes.sql", "0156_paranoid_gin_indexes.sql"]) {
			const sql = migration(name);
			assert.equal(carriesConcurrently(sql), true, name);
			assert.match(sql.split(/\r?\n/)[0] ?? "", /^\s*--\s*no-transaction\s*$/, name);
		}
	});
});
