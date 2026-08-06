import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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
 *
 * ПОЧЕМУ ЗДЕСЬ ВЕЗДЕ РАЗБОР ДЕРЕВА, А НЕ РЕГУЛЯРКИ.
 *
 * Здесь стояли три текстовых проверки, судившие по ТЕКСТУ исходника: искали
 * строку `DB Fallback`, дословную строку `if (rows && rows.length > 0) return
 * rows;` и `console.warn` СРАЗУ после закрывающей скобки `catch (…)`. Измерено
 * на живом дереве: совпадений НОЛЬ по всем трём, то есть все три были зелены ПО
 * ПОСТРОЕНИЮ — при живых нарушениях в тех же файлах. Каждый шаблон обходится, не
 * убирая дефект: подмену можно вернуть, не написав слова «Fallback»; дословную
 * строку достаточно переписать в две или переименовать переменную; между
 * `catch (err) {` и `console.warn` достаточно вставить строку комментария.
 *
 * Судьба каждой из трёх, по классам, а не по тексту:
 *
 *   1. `catch (…) { console.warn` — УДАЛЕНА. Её класс целиком покрыт разбором
 *      дерева ниже, и покрыт строго шире: разбору всё равно, `console.warn` там,
 *      `console.log` или ничего, и сколько строк стоит между скобкой и вызовом.
 *      Доказательство её слепоты живое, а не гипотетическое: `aiQuery.ts` — это
 *      ровно `} catch (e) {`, две строки комментария, `console.warn`. Шаблон его
 *      не видит, разбор дерева видит и держит в списке долга. Проверка, слепая на
 *      единственном живом образце своего класса, даёт не защиту, а ложную
 *      уверенность, и стоит она столько же, сколько отсутствие проверки.
 *
 *   2. `DB Fallback` — УДАЛЕНА. Это была охрана СТРОКИ ЛОГА, а не класса. Слова
 *      этого в `db/**` не осталось вовсе, и вернуть подмену, не написав его,
 *      ничего не стоит — что и сделано в `patientsQuery.ts`.
 *
 *   3. `if (rows && rows.length > 0) return rows;` — ЗАМЕНЕНА разбором дерева, а
 *      не удалена, потому что её класс НЕ покрыт проверкой `catch`: здесь база не
 *      отказывала. Выборка прошла, вернула ноль строк, и функция вместо пустого
 *      списка отдаёт что-то другое. Замена нашла живое нарушение в первый же
 *      прогон — `lostPatientsFiltersQuery.ts`, — которое дословный шаблон не
 *      видел никогда: там другое имя переменной и другой источник подмены.
 *
 *   4. `CREATE TABLE IF NOT EXISTS` — ОСТАВЛЕНА как класс, но переведена на
 *      строковые литералы дерева и расширена на `ALTER/DROP/CREATE INDEX/…`.
 *      Её класс не покрыт ничем другим, а поиск подстроки по всему файлу краснел
 *      бы на комментарии, объясняющем, что рантайм-DDL отсюда убрали.
 *
 * Итог: решает ФОРМА кода. Для проглатывания это `try`, внутри которого есть
 * обращение к базе, и `catch`, из которого исключение НЕ выходит. `catch` вокруг
 * `JSON.parse` (`clinicalQuery.ts`) под правило не попадает не по списку
 * исключений, а потому, что в его `try` обращения к базе нет.
 *
 * И ОБРАТНАЯ ЛОВУШКА, КОТОРАЯ В ЭТОМ ПРОЕКТЕ УЖЕ СРАБОТАЛА. Наивный шаблон
 * «catch … inMemory» по `db/*Query.ts` даёт три совпадения, и два из них —
 * пояснительные комментарии, рассказывающие, как подмену УБРАЛИ (докстринг
 * `patientArchiveReasonsAndBlacklistsQuery.ts` и разбор в `patientsQuery.ts`).
 * То есть две трети срабатываний были бы наказанием за документацию, а сторож,
 * который краснеет на верном коде, учит себя отключать. Разбор дерева
 * комментарии не видит по построению, и это проверяется самопроверкой ниже —
 * не «по построению, поверьте», а прогоном на фикстуре.
 *
 * ЧЕГО ЭТИ ПРОВЕРКИ НЕ УМЕЮТ, честно.
 *   * Не видят `throw` из вызванного помощника: `catch { await failLoudly(err); }`
 *     для них проглатывание. В дереве сегодня не встречается; если появится, его
 *     место — в списке долга, с причиной, а не в ослаблении правила.
 *   * Подмена на пустом пути ищется только там, где непустой результат отдаётся
 *     через `return`. Родственная форма «обновить состояние, только если строк
 *     больше нуля» (`if (ruleRecords.length > 0) replaceAll(...)`,
 *     `domainStateHydration.ts`) под правило не попадает: там наружу не уходит
 *     подставленное значение, там остаётся ПРЕЖНЕЕ состояние. Класс родственный, и
 *     он не охраняется — это долг, а не покрытая земля.
 *   * DDL ищется в строковых литералах. Инструкция, собранная конкатенацией из
 *     кусков по отдельности безобидных, не будет найдена.
 */

const dbDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../db",
);

/**
 * Все модули слоя доступа, РЕКУРСИВНО и по всем `.ts`.
 *
 * Прежний обход брал только верхний уровень и только маску `*Query.ts`, поэтому
 * `db/tests/`, `db/domainStateHydration.ts`, `db/patientsSchema.ts` и
 * `db/communicationsSchema.ts` были вне поля зрения: достаточно было положить
 * подмену в файл с другим именем.
 *
 * `*.test.ts` исключены осознанно и по существу, а не для тишины: проверочный
 * файл не отдаёт строки маршруту, и `catch` в нём — это способ утверждать, что
 * сбой произошёл. Правило же охраняет путь данных до клиента.
 */
function dbSourceFiles(): string[] {
	const found: string[] = [];
	const walk = (dir: string, prefix: string): void => {
		const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
		for (const entry of entries) {
			const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				walk(path.join(dir, entry.name), relative);
				continue;
			}
			if (!entry.name.endsWith(".ts")) continue;
			if (entry.name.endsWith(".test.ts")) continue;
			found.push(relative);
		}
	};
	walk(dbDir, "");
	return found;
}

function read(relativePath: string): string {
	return readFileSync(path.join(dbDir, ...relativePath.split("/")), "utf8");
}

/* ------------------------------------------------------------------ *
 * Разбор дерева: catch, из которого сбой базы не выходит наружу.
 * ------------------------------------------------------------------ */

/** «подстановка» — catch отдаёт значение; «проглатывание» — молча продолжает работу. */
type SwallowKind = "подстановка" | "проглатывание";

type SwallowedCatch = {
	/** Путь модуля относительно apps/api/src/db. */
	file: string;
	/**
	 * Имя функции, в которой стоит catch. Ключом храповика взято оно, а не номер
	 * строки: номер сдвигает любая правка выше по файлу, и храповик начинает
	 * охранять пустое место, оставаясь зелёным.
	 */
	fn: string;
	/**
	 * Который по счёту проглатывающий catch ВНУТРИ этой функции: 1, 2, 3…
	 *
	 * БЕЗ НЕГО КАЖДАЯ ОБЪЯВЛЕННАЯ ФУНКЦИЯ — БЕЗРАЗМЕРНЫЙ МОЛЧАЛИВЫЙ СЛОТ.
	 * Ключ был «файл:функция», а сравнение идёт множествами ключей, поэтому
	 * ВТОРОЙ проглатывающий catch внутри уже объявленной функции давал тот же
	 * ключ и проходил незамеченным. Измерено приёмкой этого же участка: в
	 * getPatientByIdFromDb добавили второй catch, читающий пациента БЕЗ фильтра
	 * по организации и подставляющий выдуманные данные при сбое, — то есть
	 * межарендную утечку прямо в изготовление документов, — и сторож дал семь из
	 * семи зелёных.
	 *
	 * Это ровно тот класс, который осуждает сообщение коммита этого же файла:
	 * «порог с запасом — это молчаливые слоты под следующий такой же дефект».
	 * Запас убрали у порога и оставили у функции.
	 */
	ordinal: number;
	/** Только для человека в сообщении об ошибке. В ключ не входит. */
	line: number;
	kind: SwallowKind;
};

/**
 * Подмена на ПУСТОМ пути: выборка прошла успешно и вернулась пустой, а функция
 * вместо пустого ответа отдаёт что-то другое.
 *
 * Это второй класс, и с проглатыванием catch он не пересекается: здесь база не
 * отказала, отказа нет вовсе, поэтому ни один `catch` в деле не участвует.
 */
type EmptyPathSubstitution = {
	file: string;
	fn: string;
	/** Который по счёту такой возврат внутри функции; зачем — см. ordinal у SwallowedCatch. */
	ordinal: number;
	line: number;
};

/** DDL, выполняемый из обработчика запроса: схему определяют миграции, а не он. */
type RuntimeDdl = {
	file: string;
	fn: string;
	line: number;
	/** Начало найденной инструкции — чтобы человек сразу увидел, о чём речь. */
	statement: string;
};

type ModuleScan = {
	swallowed: SwallowedCatch[];
	emptyPath: EmptyPathSubstitution[];
	runtimeDdl: RuntimeDdl[];
	/** Сколько `try` с обращением к базе просмотрено. Нужно самопроверке от вырождения. */
	databaseTryBlocks: number;
	/** Сколько функций с обращением к базе просмотрено. Тоже самопроверке от вырождения. */
	databaseFunctions: number;
};

/**
 * Получатели вызовов, означающие обращение к базе. `db` — экспорт `db/client.ts`,
 * `tx`/`trx` — объект транзакции внутри `db.transaction(...)`, `pool` — сырой
 * `pg.Pool`.
 */
const DATABASE_RECEIVERS = new Set(["db", "tx", "trx", "pool"]);

/** Соглашение проекта: функция доступа к базе называется `...FromDb` или `...InDb`. */
const DATABASE_CALL_SUFFIXES = ["InDb", "FromDb"];

/**
 * DDL, которому в обработчике запроса делать нечего. Ищется ТОЛЬКО в строковых
 * литералах, поэтому объяснение в комментарии под правило не попадает по
 * построению — а прежняя редакция искала подстроку по всему тексту файла и
 * покраснела бы на первой же фразе «прежний код делал CREATE TABLE во время
 * запроса». В этом дереве сторож краснел на объяснении уже трижды.
 *
 * Набор шире прежней дословной строки `CREATE TABLE IF NOT EXISTS`: класс дефекта —
 * «схему определяет обработчик запроса», и `ALTER TABLE … ADD COLUMN` в нём ровно
 * так же, как и создание таблицы. Именно расхождение колонок, созданных рантаймом,
 * со схемой из drizzle и валило SELECT у 17 таблиц.
 */
const RUNTIME_DDL =
	/\b(create\s+table|alter\s+table|drop\s+table|truncate\s+table|create\s+(unique\s+)?index|drop\s+index|create\s+type|alter\s+type)\b/i;

function isTextLiteral(node: ts.Node): node is ts.LiteralLikeNode {
	return (
		ts.isStringLiteralLike(node) ||
		node.kind === ts.SyntaxKind.TemplateHead ||
		node.kind === ts.SyntaxKind.TemplateMiddle ||
		node.kind === ts.SyntaxKind.TemplateTail
	);
}

function isFunctionLike(node: ts.Node): boolean {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node) ||
		ts.isClassDeclaration(node) ||
		ts.isClassExpression(node)
	);
}

/** Обращается ли поддерево к базе. Заходит и во вложенные функции: `db.transaction(async (tx) => …)`. */
function touchesDatabase(node: ts.Node): boolean {
	let found = false;
	const visit = (current: ts.Node): void => {
		if (found) return;
		if (
			ts.isPropertyAccessExpression(current) &&
			ts.isIdentifier(current.expression) &&
			DATABASE_RECEIVERS.has(current.expression.text)
		) {
			found = true;
			return;
		}
		if (ts.isCallExpression(current)) {
			const callee = current.expression;
			const name = ts.isIdentifier(callee)
				? callee.text
				: ts.isPropertyAccessExpression(callee)
					? callee.name.text
					: "";
			if (DATABASE_CALL_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
				found = true;
				return;
			}
		}
		ts.forEachChild(current, visit);
	};
	visit(node);
	return found;
}

/**
 * Есть ли в теле блока узел, удовлетворяющий условию, БЕЗ захода во вложенные
 * функции. `throw` внутри колбэка до вызывающего не доходит, значит считать его
 * возвратом ошибки нельзя.
 */
function hasOwnNode(
	block: ts.Block,
	matches: (node: ts.Node) => boolean,
): boolean {
	let found = false;
	const visit = (current: ts.Node): void => {
		if (found) return;
		if (matches(current)) {
			found = true;
			return;
		}
		if (isFunctionLike(current)) return;
		ts.forEachChild(current, visit);
	};
	ts.forEachChild(block, visit);
	return found;
}

/** Узлы поддерева, удовлетворяющие условию, БЕЗ захода во вложенные функции. */
function collectOwnNodes(
	root: ts.Node,
	matches: (node: ts.Node) => boolean,
): ts.Node[] {
	const found: ts.Node[] = [];
	const visit = (current: ts.Node): void => {
		if (matches(current)) found.push(current);
		if (isFunctionLike(current)) return;
		ts.forEachChild(current, visit);
	};
	ts.forEachChild(root, visit);
	return found;
}

/**
 * Проверка «в наборе есть хотя бы одна строка» в любой записи: `rows.length > 0`,
 * `rows?.length >= 1`, `rows.length !== 0`, `0 < rows.length`.
 *
 * Дословная строка `if (rows && rows.length > 0) return rows;`, которую охраняла
 * прежняя редакция этого файла, — лишь одна из них, и переименование переменной
 * или перенос на две строки обходили её, не убирая дефект.
 */
function isNonEmptyLengthTest(condition: ts.Node): boolean {
	const isLength = (node: ts.Node): boolean =>
		ts.isPropertyAccessExpression(node) && node.name.text === "length";
	const isNumber = (node: ts.Node, value: string): boolean =>
		ts.isNumericLiteral(node) && node.text === value;

	let found = false;
	const visit = (current: ts.Node): void => {
		if (found) return;
		if (ts.isBinaryExpression(current)) {
			const operator = current.operatorToken.kind;
			const leftIsLength =
				isLength(current.left) &&
				((operator === ts.SyntaxKind.GreaterThanToken &&
					isNumber(current.right, "0")) ||
					(operator === ts.SyntaxKind.GreaterThanEqualsToken &&
						isNumber(current.right, "1")) ||
					((operator === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
						operator === ts.SyntaxKind.ExclamationEqualsToken) &&
						isNumber(current.right, "0")));
			const rightIsLength =
				isLength(current.right) &&
				((operator === ts.SyntaxKind.LessThanToken &&
					isNumber(current.left, "0")) ||
					(operator === ts.SyntaxKind.LessThanEqualsToken &&
						isNumber(current.left, "1")));
			if (leftIsLength || rightIsLength) {
				found = true;
				return;
			}
		}
		ts.forEachChild(current, visit);
	};
	visit(condition);
	return found;
}

/**
 * Заведомо пустой ответ: `[]`, `null`, `undefined`, `0`, `""`, `return` без значения.
 * Пустую выборку в пустой ответ — это честно и нарушением не является, даже если
 * записано через проверку длины. Исключение задано ФОРМОЙ возвращаемого значения, а
 * не списком функций, поэтому обойти его нельзя переименованием.
 */
function isEmptyAnswer(expression: ts.Expression | undefined): boolean {
	if (expression === undefined) return true;
	if (ts.isArrayLiteralExpression(expression))
		return expression.elements.length === 0;
	if (expression.kind === ts.SyntaxKind.NullKeyword) return true;
	if (ts.isIdentifier(expression) && expression.text === "undefined")
		return true;
	if (ts.isNumericLiteral(expression)) return expression.text === "0";
	if (ts.isStringLiteralLike(expression)) return expression.text === "";
	return false;
}

/** Отдаёт ли ветка `then` какое-то значение — прямым `return` или через свой блок. */
function returnsSomeValue(statement: ts.Statement): boolean {
	if (ts.isReturnStatement(statement))
		return statement.expression !== undefined;
	if (ts.isBlock(statement)) {
		return hasOwnNode(
			statement,
			(node) => ts.isReturnStatement(node) && node.expression !== undefined,
		);
	}
	return false;
}

function enclosingName(node: ts.Node): string {
	let current: ts.Node | undefined = node.parent;
	while (current) {
		if (ts.isFunctionDeclaration(current) && current.name)
			return current.name.text;
		if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
			return current.name.text;
		}
		if (
			(ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
			current.parent &&
			ts.isVariableDeclaration(current.parent) &&
			ts.isIdentifier(current.parent.name)
		) {
			return current.parent.name.text;
		}
		current = current.parent;
	}
	return "<верхний уровень модуля>";
}

/** Экспортируется, чтобы сканер проверялся самопроверкой на фикстурах, а не только на дереве. */
export function scanModule(file: string, source: string): ModuleScan {
	const parsed = ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ true,
		ts.ScriptKind.TS,
	);
	const swallowed: SwallowedCatch[] = [];
	const emptyPath: EmptyPathSubstitution[] = [];
	const runtimeDdl: RuntimeDdl[] = [];
	const swallowsByFunction = new Map<string, number>();
	const emptyPathByFunction = new Map<string, number>();
	let databaseTryBlocks = 0;
	let databaseFunctions = 0;

	const visit = (node: ts.Node): void => {
		if (isTextLiteral(node) && RUNTIME_DDL.test(node.text)) {
			runtimeDdl.push({
				file,
				fn: enclosingName(node),
				line:
					parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
				statement: node.text.trim().replace(/\s+/g, " ").slice(0, 90),
			});
		}
		if (isFunctionLike(node)) {
			const body = (node as ts.FunctionLikeDeclaration).body;
			if (body !== undefined && ts.isBlock(body) && touchesDatabase(body)) {
				databaseFunctions += 1;
				// Возвраты ПОСЛЕ проверки на непустоту: именно они и есть подмена.
				// Возврат внутри самой проверки лежит до её конца и потому не считается.
				const fallbacks = collectOwnNodes(
					body,
					(current) =>
						ts.isReturnStatement(current) && !isEmptyAnswer(current.expression),
				);
				const gates = collectOwnNodes(
					body,
					(current) =>
						ts.isIfStatement(current) &&
						isNonEmptyLengthTest(current.expression) &&
						returnsSomeValue(current.thenStatement),
				);
				for (const gate of gates) {
					const substituted = fallbacks.some(
						(candidate) => candidate.getStart(parsed) >= gate.getEnd(),
					);
					if (!substituted) continue;
					const fn = enclosingName(gate);
					const ordinal = (emptyPathByFunction.get(fn) ?? 0) + 1;
					emptyPathByFunction.set(fn, ordinal);
					emptyPath.push({
						file,
						fn,
						ordinal,
						line:
							parsed.getLineAndCharacterOfPosition(gate.getStart(parsed)).line +
							1,
					});
				}
			}
		}
		if (
			ts.isTryStatement(node) &&
			node.catchClause &&
			touchesDatabase(node.tryBlock)
		) {
			databaseTryBlocks += 1;
			const body = node.catchClause.block;
			if (!hasOwnNode(body, ts.isThrowStatement)) {
				const returnsValue = hasOwnNode(
					body,
					(current) =>
						ts.isReturnStatement(current) && current.expression !== undefined,
				);
				const fn = enclosingName(node);
				// Обход идёт сверху вниз по файлу, поэтому счётчик даёт устойчивый
				// номер: правки в других функциях его не сдвигают.
				const ordinal = (swallowsByFunction.get(fn) ?? 0) + 1;
				swallowsByFunction.set(fn, ordinal);
				swallowed.push({
					file,
					fn,
					ordinal,
					line:
						parsed.getLineAndCharacterOfPosition(
							node.catchClause.getStart(parsed),
						).line + 1,
					kind: returnsValue ? "подстановка" : "проглатывание",
				});
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(parsed, visit);

	return {
		swallowed,
		emptyPath,
		runtimeDdl,
		databaseTryBlocks,
		databaseFunctions,
	};
}

function keyOf(found: { file: string; fn: string; ordinal: number }): string {
	return `${found.file}:${found.fn}#${found.ordinal}`;
}

function databaseCatchCensus(): {
	files: string[];
	swallowed: SwallowedCatch[];
	emptyPath: EmptyPathSubstitution[];
	runtimeDdl: RuntimeDdl[];
	databaseTryBlocks: number;
	databaseFunctions: number;
} {
	const files = dbSourceFiles();
	const swallowed: SwallowedCatch[] = [];
	const emptyPath: EmptyPathSubstitution[] = [];
	const runtimeDdl: RuntimeDdl[] = [];
	let databaseTryBlocks = 0;
	let databaseFunctions = 0;
	for (const file of files) {
		const scan = scanModule(file, read(file));
		swallowed.push(...scan.swallowed);
		emptyPath.push(...scan.emptyPath);
		runtimeDdl.push(...scan.runtimeDdl);
		databaseTryBlocks += scan.databaseTryBlocks;
		databaseFunctions += scan.databaseFunctions;
	}
	swallowed.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
	emptyPath.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
	return {
		files,
		swallowed,
		emptyPath,
		runtimeDdl,
		databaseTryBlocks,
		databaseFunctions,
	};
}

/**
 * Список долга по подмене на ПУСТОМ пути. Форма и требования те же, что у
 * DECLARED_SWALLOWING: точное множество, причина у каждой строки, отписка короче
 * 120 символов валит прогон.
 */
const DECLARED_EMPTY_PATH: {
	file: string;
	fn: string;
	ordinal: number;
	reason: string;
}[] = [
	/* closed: getLostPatientsFiltersFromDb — пустая выборка → [], снимок lost_patients_filters не читается;
	   daysSinceLastVisit считается от последнего прошлого приёма / createdAt, не константа 90. */
];

/**
 * Список долга. Ровно те `catch`, что сегодня скрывают сбой базы, с причиной у
 * каждого. Образец — `DECLARED_UNMOUNTED` из
 * `apps/web/src/tests/panelsAreMounted.test.ts`, где короткая отписка вместо
 * причины сама валит прогон.
 *
 * Сверка идёт РОВНЫМ РАВЕНСТВОМ множеств, а не порогом «не больше N». Порог с
 * запасом — это молчаливые слоты под следующий такой же дефект: в этом же
 * проекте храповик адресов так и получил два свободных слота, потому что строки
 * из него убирали, а число не опускали.
 *
 * Все четыре файла лежат в `apps/api/src/db/**` — вне зоны участка сторожей,
 * поэтому здесь они объявлены долгом, а не починены. Образец правильной починки
 * стоит в самих файлах: `getPatientsFromDb` (`patientsQuery.ts`) и
 * `isPatientBookingBlocked` (`patientArchiveReasonsAndBlacklistsQuery.ts`)
 * отвечают отказом с человеческим текстом, называющим причину и следующий шаг.
 */
const DECLARED_SWALLOWING: {
	file: string;
	fn: string;
	ordinal: number;
	/**
	 * Вид проглатывания на момент объявления долга.
	 *
	 * В КЛЮЧ он не входит, и это решение, а не недосмотр: ключ отвечает на вопрос
	 * «тот же это catch или другой», а вид — на вопрос «насколько он опасен».
	 * Смешать их в одну строку — значит превратить рост тяжести в исчезновение
	 * одного долга и появление другого, и тогда сообщение об ошибке соврёт «новый
	 * catch скрывает сбой» про catch, который стоял здесь всё время. Поэтому вид
	 * сверяется отдельным утверждением, называющим именно переход.
	 *
	 * ЗАЧЕМ ЕГО СВЕРЯТЬ ВООБЩЕ. «проглатывание» — вызывающий не узнал о сбое;
	 * «подстановка» — вызывающий получил вместо ответа выдуманное значение. Второе
	 * тяжелее: молчание оставляет шанс, что отсутствие данных заметят дальше по
	 * коду, а подставленное значение от настоящего не отличается ничем и уезжает в
	 * документ. Пока вид не сверялся, объявленный долг можно было ухудшить с
	 * первого вида до второго, не тронув ни ключ, ни число записей, ни причину, —
	 * и сторож давал семь зелёных из семи. Проверено приёмкой этого участка на
	 * aiQuery.ts: catch, который сегодня только пишет в console.warn, был научен
	 * возвращать значение, и ни одна из семи проверок этого не заметила.
	 */
	kind: SwallowKind;
	reason: string;
}[] = [
	{
		file: "pricelistQuery.ts",
		fn: "getDefaultOrganizationId",
		ordinal: 1,
		kind: "подстановка",
		reason:
			"При сбое базы возвращает зашитый идентификатор организации 00000000-0000-0000-0000-000000000001 " +
			"вместо отказа. Вызывающий считает, что определил клинику, и прайс с документами уезжает в чужую " +
			"организацию. Тем же выражением нарушено правило анти-хардкода из .agents/AGENTS.md. Честный ответ " +
			"здесь — исключение: организацию не определили, работать дальше нельзя.",
	},
	{
		file: "aiQuery.ts",
		fn: "createAiRecognitionJobInDb",
		ordinal: 1,
		kind: "проглатывание",
		reason:
			"Сбой записи события аудита не доходит до вызывающего: он уходит в console.warn, и на этом всё, " +
			"хотя собственный комментарий на месте называет это пробелом прослеживаемости по 152-ФЗ. Решение " +
			"осознанное — задача распознавания не должна падать из-за журнала, — но тогда отказ обязан " +
			"доходить до маршрута отдельным полем ответа, иначе «событие записано» ничем не подтверждено.",
	},
	{
		file: "domainStateHydration.ts",
		fn: "selectByOrganization",
		ordinal: 1,
		kind: "подстановка",
		reason:
			"При сбое чтения таблицы возвращает пустой массив, и гидратация подменяет рабочее состояние " +
			"клиники пустотой: раздел открывается и показывает «данных нет» вместо отказа. Смягчение есть — " +
			"строка уходит в report.warnings, — но ни один вызывающий на warnings не смотрит, а на экране " +
			"пустой список от честно пустого не отличается. Именно так пропадала переписка из рабочего кабинета.",
	},
	{
		file: "domainStateHydration.ts",
		fn: "findLatestVisitIdForPatient",
		ordinal: 1,
		kind: "подстановка",
		reason:
			"При сбое базы возвращает null, то есть «у пациента нет ни одного приёма». Маршруты, открывающие " +
			"карточку, по этому ответу заводят новый приём вместо продолжения существующего, и запись о " +
			"лечении расходится по двум приёмам. Смягчения нет вовсе: ни лога, ни предупреждения в отчёте — " +
			"отличить сбой базы от пациента без визитов вызывающий не может ничем.",
	},
];

/*
 * САМОПРОВЕРКА СКАНЕРА, в обе стороны. Без неё «нарушений не найдено» означает
 * что угодно, включая сломанный разбор. Проверяется: заведомый образец найден;
 * та же конструкция в комментарии — нет; catch вокруг JSON.parse — нет;
 * catch, из которого исключение выходит, — нет.
 */
test("сканер находит проглатывающий catch и не краснеет на объяснении в комментарии", () => {
	const real = scanModule(
		"fixture.ts",
		[
			"export async function getThingFromDb(orgId: string) {",
			"	try {",
			"		const rows = await db.select().from(things).where(eq(things.orgId, orgId));",
			"		return rows;",
			"	} catch {",
			"		return inMemoryThings;",
			"	}",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		real.swallowed.map(keyOf),
		["fixture.ts:getThingFromDb#1"],
		"Сканер не увидел заведомую подмену при сбое базы — значит его зелёный ничего не значит.",
	);
	assert.equal(
		real.swallowed[0]?.kind,
		"подстановка",
		"Возврат значения из catch назван не тем видом.",
	);

	// Вторая сторона того же различения. Без неё сверка вида ничего не стоит: если
	// сканер начнёт называть «подстановкой» всё подряд, храповик станет красным на
	// ровном месте и его выключат; если «проглатыванием» всё подряд — рост тяжести
	// снова пройдёт молча. Оба вида обязаны быть проверены на заведомом образце.
	const silent = scanModule(
		"fixture.ts",
		[
			"export async function writeThingInDb(orgId: string) {",
			"	try {",
			"		await db.insert(things).values({ orgId });",
			"	} catch (error) {",
			"		console.warn('[fixture] не удалось записать:', error);",
			"	}",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		silent.swallowed.map(keyOf),
		["fixture.ts:writeThingInDb#1"],
		"Сканер не увидел catch, который молча продолжает работу после отказа записи в базу.",
	);
	assert.equal(
		silent.swallowed[0]?.kind,
		"проглатывание",
		"catch без возврата значения назван «подстановкой». Тогда сверка вида будет краснеть на " +
			"объявленном долге, который никто не менял, и её выключат вместе с настоящим сигналом.",
	);

	const quoted = scanModule(
		"fixture.ts",
		[
			"/*",
			" * БЫЛО: try { await db.select()... } catch { return inMemoryThings; }",
			" * Убрали: сбой базы обязан дойти до обработчика, а не подменяться образцом.",
			" */",
			"// catch { return inMemoryThings; } — так делать нельзя",
			"export async function getThingFromDb(orgId: string) {",
			"	const rows = await db.select().from(things).where(eq(things.orgId, orgId));",
			"	return rows;",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		quoted.swallowed,
		[],
		"Сторож покраснел на комментарии, который объясняет, как дефект УБРАЛИ. Это наказание за " +
			"документацию: такой сторож учит стирать объяснение вместо починки кода.",
	);

	const notDatabase = scanModule(
		"fixture.ts",
		[
			"function parseJsonArray(raw: string | null): string[] {",
			"	try {",
			"		const parsed = JSON.parse(raw ?? '[]');",
			"		return Array.isArray(parsed) ? parsed : [];",
			"	} catch {",
			"		return [];",
			"	}",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		notDatabase.swallowed,
		[],
		"catch вокруг JSON.parse обращения к базе не прикрывает и нарушением быть не должен: " +
			"испорченный JSON — это данные, а не отказ базы.",
	);

	const rethrows = scanModule(
		"fixture.ts",
		[
			"export async function getThingFromDb(orgId: string) {",
			"	try {",
			"		return await db.select().from(things).where(eq(things.orgId, orgId));",
			"	} catch (error) {",
			"		console.error('[fixture] не удалось прочитать:', error);",
			"		throw error;",
			"	}",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		rethrows.swallowed,
		[],
		"catch, из которого исключение выходит наружу, — это правильная форма, а не нарушение.",
	);

	const inCallback = scanModule(
		"fixture.ts",
		[
			"export async function getThingFromDb(orgId: string) {",
			"	try {",
			"		return await db.select().from(things);",
			"	} catch (error) {",
			"		queue.push(() => { throw error; });",
			"		return [];",
			"	}",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		inCallback.swallowed.map(keyOf),
		["fixture.ts:getThingFromDb#1"],
		"throw внутри колбэка до вызывающего не доходит и возвратом ошибки считаться не может.",
	);
});

test("сканер находит подмену на пустом пути и не считает нарушением честный пустой ответ", () => {
	const substituted = scanModule(
		"fixture.ts",
		[
			"export async function getThingsFromDb(orgId: string) {",
			"	const rows = await db.select().from(things).where(eq(things.orgId, orgId));",
			"	if (rows.length > 0) {",
			"		return rows;",
			"	}",
			"	return SAMPLE_THINGS;",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		substituted.emptyPath.map(keyOf),
		["fixture.ts:getThingsFromDb#1"],
		"Сканер не увидел заведомую подмену пустой выборки: выборка прошла, строк нет, а наружу уходит " +
			"не пустой список. Отказа базы здесь нет вовсе, поэтому проверка catch этот класс не ловит.",
	);

	// Запись, которую прежний дословный шаблон уже не узнавал: другое имя
	// переменной, другая форма проверки, ветка без фигурных скобок.
	const renamed = scanModule(
		"fixture.ts",
		[
			"export async function getThingsFromDb(orgId: string) {",
			"	const found = await db.select().from(things).where(eq(things.orgId, orgId));",
			"	if (0 < found.length) return found;",
			"	return buildDemoThings(orgId);",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		renamed.emptyPath.map(keyOf),
		["fixture.ts:getThingsFromDb#1"],
		"Переименование переменной и зеркальная запись условия обходили дословный шаблон " +
			"`if (rows && rows.length > 0) return rows;`, не убирая дефект. Разбор дерева обязан их видеть.",
	);

	const honest = scanModule(
		"fixture.ts",
		[
			"export async function getThingsFromDb(orgId: string) {",
			"	const rows = await db.select().from(things).where(eq(things.orgId, orgId));",
			"	if (rows.length > 0) return rows;",
			"	return [];",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		honest.emptyPath,
		[],
		"Пустая выборка отдана пустым списком — это честно, даже если записано через проверку длины. " +
			"Сторож, краснеющий здесь, требует переписать верный код и потому будет выключен.",
	);

	const explained = scanModule(
		"fixture.ts",
		[
			"export async function getThingsFromDb(orgId: string) {",
			"	// БЫЛО: if (rows.length > 0) return rows; return SAMPLE_THINGS;",
			"	// Убрали: пустая таблица — это пустой список, а не демонстрационные данные.",
			"	return db.select().from(things).where(eq(things.orgId, orgId));",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		explained.emptyPath,
		[],
		"Сторож покраснел на комментарии о том, как дефект УБРАЛИ. В db/domainStateHydration.ts такой " +
			"комментарий уже лежит («БЫЛО: if (serviceRecords.length > 0)»), и текстовый шаблон наказал бы " +
			"за него автора починки.",
	);
});

test("сканер находит DDL в строке и не краснеет на DDL в комментарии", () => {
	const runtime = scanModule(
		"fixture.ts",
		[
			"export async function ensureThingsTable() {",
			"	await db.execute(sql`CREATE TABLE IF NOT EXISTS things (id uuid primary key)`);",
			"	await pool.query('ALTER TABLE things ADD COLUMN note text');",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		runtime.runtimeDdl.map((found) => found.line),
		[2, 3],
		"Сканер не увидел DDL в обработчике. Ищется и шаблонная строка, и обычная: рантайм-DDL " +
			"конкурировал с миграциями за право определять схему, и у 17 таблиц набор колонок разошёлся.",
	);

	const documented = scanModule(
		"fixture.ts",
		[
			"/**",
			" * ПРЕЖДЕ здесь был CREATE TABLE IF NOT EXISTS во время запроса, и колонки",
			" * расходились со schema.ts. Теперь схему задают только миграции.",
			" */",
			"export async function getThingsFromDb(orgId: string) {",
			"	// ALTER TABLE отсюда убран намеренно",
			"	return db.select().from(things).where(eq(things.orgId, orgId));",
			"}",
		].join("\n"),
	);
	assert.deepEqual(
		documented.runtimeDdl,
		[],
		"Сторож покраснел на объяснении. Прежняя редакция искала подстроку по всему тексту файла и " +
			"покраснела бы на этом докстринге — то есть заставила бы стереть объяснение вместо правки кода.",
	);
});

/*
 * ПОЧЕМУ ПОРОГИ НИЖЕ СТОЯТ РОВНО ПО ИЗМЕРЕННОМУ ЧИСЛУ, А НЕ «С ЗАПАСОМ».
 *
 * Возражение против точного числа звучит разумно: датчик вырождения обязан молчать
 * на законной правке, иначе его выключат вместе с сигналом. Оно верно, но только в
 * ОДНУ сторону, и разница не в лозунге, а в направлении.
 *
 * У порога `>=` верхней границы нет: рост множества бесплатен. Новый модуль слоя
 * доступа перепись не портит, число дописывать не нужно, красным становится только
 * СОКРАЩЕНИЕ. А сокращение и есть класс потери: перепись перестала видеть часть
 * дерева, и любой зелёный результат ниже получен на урезанном множестве. Удаление
 * модуля слоя доступа — событие редкое и человеческого взгляда достойное: опустите
 * число тем же коммитом, это и есть работа храповика, а не издержка. Это НЕ ровное
 * равенство: равенство краснело бы и на добавлении, то есть наказывало бы за
 * безопасную правку, и его бы обошли.
 *
 * Запас НИЖЕ измеренного — не «здоровая погрешность», а оплаченная вперёд квота
 * молчаливых потерь. Здесь она была смертельной, и это измерено, а не опасение:
 *   * порог стоял `>= 25` при 31 модуле в дереве;
 *   * прежний, УЖЕ ПОЧИНЕННЫЙ дефект обхода — маска `*Query.ts` вместо всех `.ts` —
 *     даёт на живом дереве РОВНО 25 модулей;
 *   * значит возврат ровно того дефекта, ради которого обход и переписали, проходил
 *     порог без единого покраснения.
 *   * блоков try с обращением к базе в дереве 11, порог стоял `>= 5`. Распознавание
 *     обращения к базе состоит из двух половин, и они измеренно неравны: снятие
 *     получателя `db` оставляет 1 блок из 11 (это заметит любой порог), а снятие
 *     соглашения об именах `*InDb`/`*FromDb` оставляет 10 из 11 — и уносит с собой
 *     ровно один объявленный долг, aiQuery.ts. Порог 5 такую поломку не видит.
 *
 * И отдельно от числа: у той поломки обхода есть ФОРМА, а не только размер, поэтому
 * ниже стоит утверждение о форме. Число модулей — совпадение сегодняшнего дерева,
 * форма «в переписи есть файлы вне маски `*Query.ts`» верна при любом их количестве.
 *
 * ПРИЁМКА ЭТОГО ЖЕ УЧАСТКА НАШЛА ДВА МОЛЧАЛИВЫХ СЛОТА, И ОБА ЗАКРЫТЫ ЗДЕСЬ.
 * Правило выше было объявлено верно, а исполнено не до конца — ровно так же, как в
 * храповике адресов, чьё сообщение коммита это правило и сформулировало.
 *
 *   1. ПОРОГ МОДУЛЕЙ ОТСТАЛ ОТ ДЕРЕВА НА ЕДИНИЦУ. Стояло `>= 31` при 32 модулях в
 *      `db/**` (замер: 32 файла `.ts` без `*.test.ts`, из них 7 вне маски
 *      `*Query.ts` — client.ts, communicationsSchema.ts, domainStateHydration.ts,
 *      moneyTypeParsers.ts, patientsSchema.ts, schema.ts, visitsProjection.ts).
 *      Одна свободная единица означает буквально это: один модуль слоя доступа
 *      может выпасть из переписи, и все проверки ниже останутся зелёными на
 *      урезанном множестве. В `domainStateHydration.ts` сегодня объявлены ДВА долга
 *      по подмене рабочего состояния клиники пустотой — то есть цена выпавшего
 *      модуля измеряется не аккуратностью числа, а пропавшей перепиской в рабочем
 *      кабинете. Число поднято до 32.
 *
 *      ПРАВИЛО, чтобы отставание не вернулось: этот порог РАСТЁТ ВМЕСТЕ С НАБОРОМ.
 *      Появился модуль в `db/**` — поднимите число тем же коммитом; удалили модуль —
 *      опустите тем же коммитом и назовите причину. Порог `>=` красен только на
 *      сокращении, поэтому «поднять вместе с набором» не наказывает за добавление:
 *      забытое обновление не валит прогон, оно лишь возвращает свободный слот — и
 *      именно поэтому правило записано здесь, а не оставлено на память.
 *
 *   2. ДАТЧИК, КОТОРЫЙ ПОСЧИТАЛИ И НЕ СВЕРИЛИ ВОВСЕ. `databaseFunctions` считался,
 *      протаскивался через `ModuleScan` и `databaseCatchCensus` — и не участвовал ни
 *      в одном утверждении: единственное его употребление было в ТЕКСТЕ сообщения об
 *      ошибке. Это не запас, это отсутствие порога: 106 функций с обращением к базе
 *      ничем не охранялись.
 *
 *      Чем это опасно именно здесь: `databaseFunctions` — мера охвата проверки
 *      «пустая выборка отдаётся пустым ответом». Сломайся `touchesDatabase` или
 *      `isFunctionLike` частично, и охват молча сожмётся, а проверка останется
 *      зелёной. Полное вырождение до нуля сегодня всё-таки поймал бы список долга
 *      (ранее объявленная подмена в `lostPatientsFiltersQuery.ts` уже закрыта (пустой
 *      DECLARED_EMPTY_PATH); полный ноль охвата всё равно валит порог modules) — но ЧАСТИЧНОЕ не поймал бы никто: одна
 *      объявленная строка не отличает 106 просмотренных функций от 20. Порог
 *      поставлен по замеру, 106, и живёт по тому же правилу, что и модули.
 */
test("перепись слоя доступа не выродилась", () => {
	const census = databaseCatchCensus();

	assert.ok(
		census.files.length >= 32,
		`Перепись просмотрела ${census.files.length} модулей слоя доступа, а на момент установки порога ` +
			"их было 32. Множество сократилось: либо обход снова сузился по маске имени или перестал " +
			"заходить в подкаталоги, и тогда любой зелёный результат ниже получен на урезанном дереве, " +
			"либо модули удалили по делу — тогда опустите это число тем же коммитом и назовите причину.",
	);

	const outsideQueryMask = census.files.filter(
		(name) => !name.endsWith("Query.ts"),
	);
	assert.ok(
		outsideQueryMask.length > 0,
		"В переписи не осталось ни одного модуля вне маски `*Query.ts`. Именно так обход и был сломан до " +
			"починки: он брал файлы с угаданным именем, поэтому db/domainStateHydration.ts, " +
			"db/patientsSchema.ts и db/communicationsSchema.ts были вне поля зрения — а в первом из них " +
			"сегодня объявлены ДВА долга по подмене рабочего состояния клиники пустотой. Обход обязан " +
			"брать все `.ts` рекурсивно, а не файлы, чьё имя кончается на Query.",
	);

	assert.ok(
		census.databaseTryBlocks >= 10,
		`Перепись нашла ${census.databaseTryBlocks} блоков try с обращением к базе, а на момент установки ` +
			"порога их было 10. Обращение к базе распознаётся по получателю (db, tx, trx, pool) и по " +
			"соглашению об именах (*InDb, *FromDb); отвалившаяся половина уносит блоки из переписи молча. " +
			"Либо распознавание сломалось, либо try убрали по делу — тогда опустите число тем же коммитом.",
	);

	/*
	 * ОХВАТ ПРОВЕРКИ ПУСТОГО ПУТИ. Это число считалось с самого начала, но не
	 * сверялось ни одним утверждением — оно лишь печаталось в тексте ошибки. Порога
	 * не было вовсе, поэтому частичное вырождение разбора уменьшало охват молча.
	 */
	assert.ok(
		census.databaseFunctions >= 106,
		`Перепись нашла ${census.databaseFunctions} функций с обращением к базе, а на момент установки ` +
			"порога их было 106. Это охват проверки «пустая выборка отдаётся пустым ответом»: она смотрит " +
			"только внутрь функций, признанных работающими с базой. Сжался охват — проверка молча " +
			"перестала смотреть на часть слоя доступа, и её зелёный получен на урезанном множестве, а " +
			"подмена пустой выборки уезжает на экран как «данных нет». Либо распознавание обращения к базе " +
			"сломалось, либо функции убрали по делу — тогда опустите число тем же коммитом.",
	);
});

test("список долга по проглатыванию сбоев базы не разъезжается с деревом", () => {
	const duplicated = DECLARED_SWALLOWING.map(keyOf).filter(
		(key, index, all) => all.indexOf(key) !== index,
	);
	assert.deepEqual(
		duplicated,
		[],
		`В списке долга повторы: ${duplicated.join(", ")}`,
	);

	const shallow = DECLARED_SWALLOWING.filter(
		(debt) => debt.reason.trim().length < 120,
	).map(keyOf);
	assert.deepEqual(
		shallow,
		[],
		`Долг заявлен отпиской вместо причины: ${shallow.join(", ")}. Причина обязана называть, что ` +
			"именно возвращается вместо отказа, кто это увидит и чем подтверждено — файл, строка, ответ.",
	);
});

test("сбой базы в слое доступа доходит до вызывающего, а не подменяется значением", () => {
	const census = databaseCatchCensus();
	const declared = new Set(DECLARED_SWALLOWING.map(keyOf));
	const actual = new Set(census.swallowed.map(keyOf));

	const added = census.swallowed
		.filter((found) => !declared.has(keyOf(found)))
		.map((found) => `${found.file}:${found.line} ${found.fn} (${found.kind})`);
	assert.deepEqual(
		added,
		[],
		`Новый catch скрывает сбой базы от вызывающего: ${added.join("; ")}. Вызывающий получает ` +
			"значение вместо ошибки, и это неотличимо от «данных нет»: экран пуст, документ печатается с " +
			"чужими данными, запись в базу считается успешной. Сбой базы обязан выйти из слоя доступа " +
			"исключением с человеческим текстом — образец в getPatientsFromDb (db/patientsQuery.ts).",
	);

	const stale = [...declared].filter((key) => !actual.has(key)).sort();
	assert.deepEqual(
		stale,
		[],
		`Долг заявлен на catch, которого перепись не находит: ${stale.join(", ")}. Либо он вылечен — ` +
			"тогда удалите запись, иначе список хранит свободный слот и следующий такой дефект пройдёт " +
			"молча, — либо функцию переименовали и запись охраняет несуществующее место.",
	);

	const declaredKind = new Map(
		DECLARED_SWALLOWING.map((debt) => [keyOf(debt), debt.kind]),
	);
	const changedKind = census.swallowed
		.filter((found) => {
			const known = declaredKind.get(keyOf(found));
			return known !== undefined && known !== found.kind;
		})
		.map(
			(found) =>
				`${found.file}:${found.line} ${found.fn}: объявлено «${declaredKind.get(keyOf(found))}», ` +
				`в дереве «${found.kind}»`,
		);
	assert.deepEqual(
		changedKind,
		[],
		`Тяжесть объявленного долга изменилась, а запись осталась прежней: ${changedKind.join("; ")}. ` +
			"Переход «проглатывание» → «подстановка» означает, что вызывающий теперь получает вместо " +
			"ответа выдуманное значение: от настоящего оно не отличается ничем и уезжает в документ, в " +
			"отчёт или в кассу. Это НОВЫЙ дефект под старой записью, и ключ храповика его не видит — ключ " +
			"отвечает лишь на вопрос «тот же это catch». Верните форму catch; если ухудшение осознанное — " +
			"правьте вид И причину отдельным коммитом, чтобы решение было видно в истории. Обратный " +
			"переход «подстановка» → «проглатывание» тоже красный: причина в списке описывает уже не тот " +
			"код, а список долга, которому нельзя верить, охраняет ровно ничего.",
	);
});

test("схему определяют миграции, а не обработчик запроса", () => {
	const census = databaseCatchCensus();
	const offenders = census.runtimeDdl.map(
		(found) => `${found.file}:${found.line} ${found.fn}: ${found.statement}`,
	);

	assert.deepEqual(
		offenders,
		[],
		`DDL выполняется из слоя доступа: ${offenders.join("; ")}. Схему задают drizzle/*.sql и ` +
			"scripts/migrate.ts. Рантайм-DDL конкурирует с файлами миграций за право определять таблицу: " +
			"у 17 таблиц так разошёлся набор колонок, drizzle подставлял в SELECT имена из schema.ts, " +
			"которых в созданной таблице не было, запрос падал, и наружу шли выдуманные строки. Сломано " +
			"было полностью, а выглядело работающим.",
	);
});

test("пустая выборка отдаётся пустым ответом, а не подменяется другим источником", () => {
	const census = databaseCatchCensus();
	const declared = new Set(DECLARED_EMPTY_PATH.map(keyOf));
	const actual = new Set(census.emptyPath.map(keyOf));

	const shallow = DECLARED_EMPTY_PATH.filter(
		(debt) => debt.reason.trim().length < 120,
	).map(keyOf);
	assert.deepEqual(
		shallow,
		[],
		`Долг заявлен отпиской вместо причины: ${shallow.join(", ")}. Причина обязана называть, что ` +
			"уходит наружу вместо пустого списка и кто это увидит.",
	);

	const added = census.emptyPath
		.filter((found) => !declared.has(keyOf(found)))
		.map((found) => `${found.file}:${found.line} ${found.fn}`);
	assert.deepEqual(
		added,
		[],
		`Пустая выборка подменяется другим ответом: ${added.join("; ")}. Отказа базы здесь нет — запрос ` +
			"прошёл и честно вернул ноль строк, поэтому проверка проглатывания catch этот класс не видит " +
			`вовсе. Просмотрено функций с обращением к базе: ${census.databaseFunctions}. У честной ` +
			"выборки нет причин отличать пустой результат от непустого: пусто — значит пустой список. " +
			"Всё остальное — вторая ветка, про которую вызывающий не знает, и разница между «никого нет» " +
			"и «вот вам чужие строки» до человека уже не доходит.",
	);

	const stale = [...declared].filter((key) => !actual.has(key)).sort();
	assert.deepEqual(
		stale,
		[],
		`Долг заявлен на подмену, которой перепись не находит: ${stale.join(", ")}. Либо она вылечена — ` +
			"тогда удалите запись, иначе список хранит свободный слот, — либо разбор дерева перестал " +
			"находить этот класс, и тогда зелёное выше не значит ничего.",
	);
});
