import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
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
 * ПОЧЕМУ ЗДЕСЬ ПОЯВИЛСЯ РАЗБОР ДЕРЕВА, А НЕ ЕЩЁ ОДНА РЕГУЛЯРКА.
 *
 * Три текстовых проверки ниже судили по ТЕКСТУ исходника: искали строку
 * `DB Fallback`, дословную строку `if (rows && rows.length > 0) return rows;` и
 * `console.warn` СРАЗУ после закрывающей скобки `catch (…)`. Каждый из трёх
 * шаблонов обходится, не убирая дефект:
 *   * подмену можно вернуть, не написав слова «Fallback» — так и стоит сегодня
 *     в `patientsQuery.ts` (`catch { return inMemoryPatients.find(...) }`);
 *   * дословную строку достаточно переписать в две;
 *   * между `catch (err) {` и `console.warn` достаточно вставить одну строку
 *     комментария — так под шаблон не попадает `aiQuery.ts`.
 * Измерено на живом дереве: при трёх настоящих нарушениях все три проверки были
 * зелёными, а слова `DB Fallback` и дословной строки в `db/**` не осталось
 * вовсе, то есть две из трёх охраняли уже несуществующий текст.
 *
 * Поэтому решает ФОРМА кода: `try`, внутри которого есть обращение к базе, и
 * `catch`, из которого исключение НЕ выходит. `catch` вокруг `JSON.parse`
 * (`clinicalQuery.ts`) под правило не попадает не по списку исключений, а
 * потому, что в его `try` обращения к базе нет.
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
 * ЧЕГО ЭТА ПРОВЕРКА НЕ УМЕЕТ, честно. Она не видит `throw` из вызванного
 * помощника: `catch { await failLoudly(err); }` для неё проглатывание. Такой
 * случай сегодня в дереве не встречается; если появится, его место — в списке
 * долга ниже, с причиной, а не в ослаблении правила.
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

test("слой доступа к данным не создаёт таблицы во время запроса", () => {
	const offenders = dbSourceFiles().filter((name) =>
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
	const offenders = dbSourceFiles().filter((name) => {
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
	const offenders = dbSourceFiles().filter((name) =>
		/catch \([^)]*\) \{\s*\n\s*console\.warn/.test(read(name)),
	);

	assert.deepEqual(
		offenders,
		[],
		"Сбой базы должен дойти до обработчика и до клиента, иначе он выглядит как " +
			`«данных нет». Проглатывание найдено в: ${offenders.join(", ")}`,
	);
});

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

type ModuleScan = {
	swallowed: SwallowedCatch[];
	/** Сколько `try` с обращением к базе просмотрено. Нужно самопроверке от вырождения. */
	databaseTryBlocks: number;
};

/**
 * Получатели вызовов, означающие обращение к базе. `db` — экспорт `db/client.ts`,
 * `tx`/`trx` — объект транзакции внутри `db.transaction(...)`, `pool` — сырой
 * `pg.Pool`.
 */
const DATABASE_RECEIVERS = new Set(["db", "tx", "trx", "pool"]);

/** Соглашение проекта: функция доступа к базе называется `...FromDb` или `...InDb`. */
const DATABASE_CALL_SUFFIXES = ["InDb", "FromDb"];

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
function hasOwnNode(block: ts.Block, matches: (node: ts.Node) => boolean): boolean {
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

function enclosingName(node: ts.Node): string {
	let current: ts.Node | undefined = node.parent;
	while (current) {
		if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
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
	const swallowsByFunction = new Map<string, number>();
	let databaseTryBlocks = 0;

	const visit = (node: ts.Node): void => {
		if (ts.isTryStatement(node) && node.catchClause && touchesDatabase(node.tryBlock)) {
			databaseTryBlocks += 1;
			const body = node.catchClause.block;
			if (!hasOwnNode(body, ts.isThrowStatement)) {
				const returnsValue = hasOwnNode(
					body,
					(current) => ts.isReturnStatement(current) && current.expression !== undefined,
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
						parsed.getLineAndCharacterOfPosition(node.catchClause.getStart(parsed)).line + 1,
					kind: returnsValue ? "подстановка" : "проглатывание",
				});
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(parsed, visit);

	return { swallowed, databaseTryBlocks };
}

function keyOf(found: { file: string; fn: string; ordinal: number }): string {
	return `${found.file}:${found.fn}#${found.ordinal}`;
}

function databaseCatchCensus(): {
	files: string[];
	swallowed: SwallowedCatch[];
	databaseTryBlocks: number;
} {
	const files = dbSourceFiles();
	const swallowed: SwallowedCatch[] = [];
	let databaseTryBlocks = 0;
	for (const file of files) {
		const scan = scanModule(file, read(file));
		swallowed.push(...scan.swallowed);
		databaseTryBlocks += scan.databaseTryBlocks;
	}
	swallowed.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
	return { files, swallowed, databaseTryBlocks };
}

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
		file: "patientsQuery.ts",
		fn: "getPatientByIdFromDb",
		ordinal: 1,
		kind: "подстановка",
		reason:
			"При сбое базы возвращает пациента из sampleData.ts, не отфильтрованного по организации. " +
			"Функция кормит не экран, а изготовление документов: routes/documents/create.ts:77, issue.ts:74, " +
			"pdf.ts:159, html.ts:74, taxXml.ts:66, auditFacts.ts:73. Значит согласие на вмешательство или " +
			"справка для НДФЛ напечатается с ФИО чужого человека — это подлог в документе, а не пустой экран. " +
			"Образец починки стоит двумя функциями ниже, в getPatientsFromDb: console.error и throw.",
	},
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
		file: "patientArchiveReasonsAndBlacklistsQuery.ts",
		fn: "setPatientArchiveStatusInDb",
		ordinal: 1,
		kind: "проглатывание",
		reason:
			"Отказ записи в чёрный список проглочен целиком: администратор видит успех, строки в базе нет, а " +
			"после перезапуска процесса запрет исчезает вместе с набором в памяти. Чёрный список — защита " +
			"персонала, и человек, которого решили не принимать, запишется на приём. Проверка чтения в этом же " +
			"файле уже вылечена: isPatientBookingBlocked отвечает отказом с текстом для стойки.",
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
	assert.equal(real.swallowed[0]?.kind, "подстановка", "Возврат значения из catch назван не тем видом.");

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

test("перепись слоя доступа не выродилась", () => {
	const census = databaseCatchCensus();

	assert.ok(
		census.files.length >= 25,
		`Перепись просмотрела ${census.files.length} модулей слоя доступа. Их там больше тридцати — ` +
			"значит обход сломался, и любой зелёный результат ниже получен на пустом множестве.",
	);
	assert.ok(
		census.databaseTryBlocks >= 5,
		`Перепись нашла ${census.databaseTryBlocks} блоков try с обращением к базе. Их в дереве ` +
			"десятки: столь низкое число означает, что распознавание обращения к базе перестало работать.",
	);
});

test("список долга по проглатыванию сбоев базы не разъезжается с деревом", () => {
	const duplicated = DECLARED_SWALLOWING.map(keyOf).filter(
		(key, index, all) => all.indexOf(key) !== index,
	);
	assert.deepEqual(duplicated, [], `В списке долга повторы: ${duplicated.join(", ")}`);

	const shallow = DECLARED_SWALLOWING.filter((debt) => debt.reason.trim().length < 120).map(keyOf);
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

	const declaredKind = new Map(DECLARED_SWALLOWING.map((debt) => [keyOf(debt), debt.kind]));
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
