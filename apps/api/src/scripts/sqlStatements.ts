/**
 * sqlStatements.ts — разбор SQL-файла на выражения с учётом контекста.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Раннер миграций (scripts/migrate.ts) выполняет main()
 * на верхнем уровне, поэтому импортировать его ради проверки разборщика нельзя —
 * импорт запустил бы раскатку. Разборщик решает, что именно уедет в боевую базу,
 * и должен проверяться отдельно от неё.
 */

/**
 * Символ, который PostgreSQL считает частью идентификатора (не первым).
 *
 * Всё, что старше U+007F, PostgreSQL относит к «буквам» и разрешает и в
 * идентификаторах, и в тегах долларового цитирования. Проверка кодом, а не
 * диапазоном в регулярном выражении: диапазон пришлось бы писать управляющими
 * символами прямо в исходнике.
 */
function isIdentifierChar(char: string): boolean {
	if (/[A-Za-z0-9_$]/.test(char)) return true;
	return (char.codePointAt(0) ?? 0) > 0x7f;
}

/** Первый символ тега долларового цитирования: цифра запрещена, иначе это $1. */
function isDollarTagStart(char: string): boolean {
	if (/[A-Za-z_]/.test(char)) return true;
	return (char.codePointAt(0) ?? 0) > 0x7f;
}

/** Остальные символы тега: '$' его завершает, поэтому в набор не входит. */
function isDollarTagChar(char: string): boolean {
	if (/[A-Za-z0-9_]/.test(char)) return true;
	return (char.codePointAt(0) ?? 0) > 0x7f;
}

/**
 * Одно выражение SQL-файла в двух видах.
 */
export interface SqlStatement {
	/** Исходный текст выражения без завершающей ';' — он и уходит в client.query(). */
	readonly text: string;
	/**
	 * Тот же текст, в котором комментарии и СОДЕРЖИМОЕ литералов заменены
	 * пробелом: однострочные и блочные комментарии, '…', "…", $$…$$, $tag$…$tag$.
	 * Годится ТОЛЬКО для поиска ключевых слов; выполнять этот текст нельзя.
	 */
	readonly codeOnly: string;
}

/**
 * Читает тег долларового цитирования, начинающийся на позиции at.
 *
 * Возвращает сам разделитель ("$$" или "$tag$") либо null, если на этой позиции
 * цитирования нет. Правила взяты из документации PostgreSQL (4.1.2.4):
 *   • тег может быть пустым ($$) либо начинаться с буквы или подчёркивания;
 *   • тег регистрозависим, поэтому сравнение закрывающего идёт байт в байт;
 *   • $1 — позиционный параметр, а не цитирование: первый символ цифра;
 *   • '$' разрешён внутри идентификатора, поэтому a$b$c — это ОДИН идентификатор.
 *     Postgres лексирует его правилом идентификатора (самое длинное совпадение),
 *     и по той же причине документация требует пробел перед $$ после ключевого
 *     слова. Отсюда проверка предыдущего символа.
 */
function readDollarTag(sql: string, at: number): string | null {
	const previous = at > 0 ? sql[at - 1] : undefined;
	if (previous !== undefined && isIdentifierChar(previous)) return null;

	let index = at + 1;
	while (index < sql.length) {
		const char = sql[index];
		if (char === undefined) return null;
		if (char === "$") return sql.slice(at, index + 1);
		const allowed = index === at + 1 ? isDollarTagStart : isDollarTagChar;
		if (!allowed(char)) return null;
		index += 1;
	}
	return null;
}

/**
 * Строка E'…' трактует обратную косую черту как экранирование, обычная '…' — нет
 * (standard_conforming_strings включён по умолчанию с PostgreSQL 9.1).
 */
function isEscapeStringLiteral(sql: string, quoteAt: number): boolean {
	const prefix = quoteAt > 0 ? sql[quoteAt - 1] : undefined;
	if (prefix !== "E" && prefix !== "e") return false;
	const before = quoteAt > 1 ? sql[quoteAt - 2] : undefined;
	return before === undefined || !isIdentifierChar(before);
}

/** Возвращает позицию сразу за закрывающей кавычкой. Удвоенная кавычка — экранирование. */
function skipQuoted(
	sql: string,
	openAt: number,
	quote: string,
	backslashEscapes: boolean,
): number {
	let index = openAt + 1;
	while (index < sql.length) {
		const char = sql[index];
		if (char === undefined) break;
		if (backslashEscapes && char === "\\") {
			index += 2;
			continue;
		}
		if (char === quote) {
			if (sql[index + 1] === quote) {
				index += 2;
				continue;
			}
			return index + 1;
		}
		index += 1;
	}
	// Незакрытый литерал: отдаём хвост файла целиком. Диагностику выдаст Postgres —
	// молча дорезать файл здесь означало бы отправить в базу синтаксический мусор.
	return sql.length;
}

/**
 * Разбирает SQL-файл за один проход, различая контексты, внутри которых ';'
 * НЕ является границей выражения.
 *
 * ЗАЧЕМ ЭТО НЕ split(';'). Прежняя реализация в migrate.ts резала файл по каждому
 * символу ';' без учёта контекста. На корпусе миграций этого репозитория она
 * ломается сразу в трёх местах: точка с запятой внутри однострочного комментария
 * (0134:42, 0141:47 и :163), блок DO $$ … END $$; с точкой с запятой внутри тела
 * (0134:56-72) и функция на $fn$ … $fn$ (0118:33-44). Разрезанный по такой точке
 * DO-блок уходит в базу половиной оператора.
 *
 * Различаемые состояния (все — из документации PostgreSQL, раздел 4.1):
 *   • -- … до конца строки;
 *   • блочные комментарии (косая черта со звёздочкой) — в PostgreSQL они
 *     ВЛОЖЕННЫЕ, поэтому счётчик глубины, а не поиск первого закрывающего;
 *   • '…' с удвоением кавычки, и отдельно E'…' с обратной косой чертой;
 *   • "…" (идентификатор) с удвоением кавычки;
 *   • $$…$$ и $tag$…$tag$ — тело непрозрачно, внутри не действует ничто.
 */
export function scanSqlStatements(sql: string): SqlStatement[] {
	const statements: SqlStatement[] = [];
	let textStart = 0;
	let codeOnly = "";
	let index = 0;

	const flush = (end: number): void => {
		statements.push({ text: sql.slice(textStart, end), codeOnly });
		codeOnly = "";
	};

	while (index < sql.length) {
		const char = sql[index];
		if (char === undefined) break;
		const next = sql[index + 1];

		if (char === "-" && next === "-") {
			const lineEnd = sql.indexOf("\n", index + 2);
			index = lineEnd === -1 ? sql.length : lineEnd;
			codeOnly += " ";
			continue;
		}

		if (char === "/" && next === "*") {
			let depth = 1;
			index += 2;
			while (index < sql.length && depth > 0) {
				if (sql[index] === "/" && sql[index + 1] === "*") {
					depth += 1;
					index += 2;
					continue;
				}
				if (sql[index] === "*" && sql[index + 1] === "/") {
					depth -= 1;
					index += 2;
					continue;
				}
				index += 1;
			}
			codeOnly += " ";
			continue;
		}

		if (char === "'") {
			index = skipQuoted(sql, index, "'", isEscapeStringLiteral(sql, index));
			codeOnly += " ";
			continue;
		}

		if (char === '"') {
			index = skipQuoted(sql, index, '"', false);
			codeOnly += " ";
			continue;
		}

		if (char === "$") {
			const tag = readDollarTag(sql, index);
			if (tag !== null) {
				const close = sql.indexOf(tag, index + tag.length);
				index = close === -1 ? sql.length : close + tag.length;
				codeOnly += " ";
				continue;
			}
		}

		if (char === ";") {
			flush(index);
			index += 1;
			textStart = index;
			continue;
		}

		codeOnly += char;
		index += 1;
	}

	flush(sql.length);
	return statements;
}

/**
 * Выражения файла, готовые к отправке по одному: без кусков, состоящих только из
 * комментариев и пробелов, с восстановленной точкой с запятой.
 *
 * КРИТИЧЕСКИЙ ИНВАРИАНТ: отбрасываются ТОЛЬКО куски без единого символа SQL.
 * Первый кусок файла содержит заголовочные комментарии И первый DDL-оператор,
 * поэтому проверяется проекция codeOnly, а не первый символ строки.
 */
export function splitSqlStatements(sql: string): string[] {
	return scanSqlStatements(sql)
		.filter((statement) => statement.codeOnly.trim().length > 0)
		.map((statement) => `${statement.text.trim()};`);
}

/**
 * True, если в исполняемом тексте (вне комментариев и литералов) встречается
 * CONCURRENTLY.
 */
export function carriesConcurrently(sql: string): boolean {
	return scanSqlStatements(sql).some((statement) =>
		/\bCONCURRENTLY\b/i.test(statement.codeOnly),
	);
}
