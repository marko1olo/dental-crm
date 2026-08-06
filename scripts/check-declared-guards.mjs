#!/usr/bin/env node
/**
 * check-declared-guards.mjs — ищет ОХРАННИКОВ, КОТОРЫЕ ОБЪЯВЛЕНЫ И НЕ ВЫЗЫВАЮТСЯ.
 *
 * ЗАЧЕМ. Этот класс дефекта уже дал в дереве настоящую дыру, а не гипотезу.
 * `requireScheduleMutationAccess` в `routes/schedule.ts` был написан, снабжён
 * текстами отказов и экраном «секрет администратора» — и не вызывался ни разу.
 * Единственным вхождением имени во всём дереве было само объявление. Замер
 * запросом в процессе показал, что любой с токеном кабинета писал в сетку приёмов
 * в обход гейта администратора: 201 на создании приёма без секрета И с заведомо
 * неверным секретом, 200 на двух адресах переноса. Закрыто коммитом 1f4614ea2.
 *
 * Дефект невидим для всех обычных инструментов. Компилятор молчит: функция
 * экспортирована, значит «используется». Линтер молчит по той же причине. Тесты
 * молчат: тестировать нечего, маршрут отвечает 200 и делает своё дело. Поиск по
 * имени НАХОДИТ его — в объявлении и в комментариях, которые про него написаны, —
 * поэтому человек, проверяющий «есть ли охрана», получает утвердительный ответ.
 * Именно так дыра простояла: охрана была видна и не работала.
 *
 * ЧТО ЭТА ПРОВЕРКА СЧИТАЕТ НАРУШЕНИЕМ. Объявление верхнего уровня в `apps/api/src`
 * с именем на `require` / `assert` / `enforce` / `check` / `ensure` / `verify` /
 * `guard` / `validate`, у которого НЕТ НИ ОДНОЙ ссылки как на значение — ни вызова,
 * ни передачи в `preHandler`, ни присваивания. Ровно форма schedule-дыры.
 *
 * ЭКСПОРТ ЗНАЧЕНИЯ НЕ ИМЕЕТ, И ЭТО ИСПРАВЛЕНО ПО ЗАМЕРУ. Задание говорило про
 * экспортированные функции, но историческая охрана расписания была объявлена БЕЗ
 * export, и первая редакция этой проверки на настоящей дыре молчала (прогнано
 * против `git show 1f4614ea2^`: 0 экспортированных охранников, 0 нарушений). Теперь
 * берутся и модульные объявления, а область поиска ссылок сужается до их файла —
 * снаружи они недостижимы, и одноимённый символ в другом файле их не оправдывает.
 *
 * ПРИСТАВОК ВОСЕМЬ, А НЕ ТРИ, И ЭТО ТОЖЕ ЗАМЕР. Расширение с трёх приставок до
 * восьми даёт 104 объявления вместо 62 и НИ ОДНОГО нового нарушения: охват вырос
 * бесплатно. Проверено прогоном до и после. Обход `checkPerimeter` этим закрыт.
 *
 * РАЗБОР ИДЁТ ПО ДЕРЕВУ TypeScript, А НЕ ТЕКСТОМ, и это не вкус. Текстовый поиск
 * считает ссылкой упоминание в комментарии — то есть заметку «здесь нужна охрана»
 * он читает как саму охрану. Ровно на этом схема «объявлен и не вызван» и
 * держалась: имя находилось поиском, потому что про него было написано. Для
 * парсера комментарий — trivia, физически не ссылка.
 *
 * ССЫЛКИ РАЗДЕЛЕНЫ ПО ВИДАМ, ПОТОМУ ЧТО ОНИ ЗНАЧАТ РАЗНОЕ:
 *   вызов     — `requireX(request, reply)` и `guards.requireX(…)` при
 *               `import * as guards`;
 *   значение  — `preHandler: requireX`, `const g = requireX`, `[requireX]`, а также
 *               используемый псевдоним `import { requireX as gate }`. Это НАСТОЯЩАЯ
 *               сшивка: fastify вызовет охрану сам, прямого вызова в коде не будет.
 *               Считать нарушением такое нельзя;
 *   импорт    — только `import { requireX }` / `export { requireX }` и ничего
 *               больше, включая псевдоним, которым ни разу не воспользовались. Это
 *               НЕ сшивка: файл втянул имя и не применил его. Считается отдельно,
 *               иначе один праздный импорт гасил бы гейт навсегда;
 *   свойство  — `obj.requireX`, `{ requireX: … }`, `obj["requireX"]` у объекта,
 *               который НЕ пространство имён. Другой символ с тем же именем;
 *               печатается пояснением, зачёт не даёт.
 *
 * ОБЪЯВЛЕННАЯ ПРИЧИНА. Если охрана обязана существовать без вызывающих (заготовка
 * под маршрут, который ещё не написан), причина пишется в комментарии НАД
 * объявлением маркером `guard-callers: none — <причина>`. Маркер читается из
 * ведущих комментариев самого объявления, поэтому его нельзя оставить где-то в
 * файле и забыть, к чему он относился. Пустая причина не принимается: «none —»
 * без текста это не объяснение, а глушилка.
 *
 * ЧЕГО ЭТА ПРОВЕРКА НЕ ВИДИТ. Замерено фикстурами, а не предположено; каждый пункт
 * закреплён тестом в scripts/tests/check-declared-guards.test.mjs, чтобы предел был
 * измеренным, а не заявленным.
 *   - ССЫЛКА-ЗНАЧЕНИЕ, КОТОРУЮ НИКОГДА НЕ ВЫЗЫВАЮТ. `const registry = { perimeter:
 *     requireX }` и ни одного `registry.perimeter(…)` — проверка считает охрану
 *     сшитой. Это ГЛАВНЫЙ обход, и он сознательный: отличить сшивку от забытого
 *     присваивания — задача анализа достижимости, а не переписи имён. Направление
 *     отказа выбрано в сторону тишины, потому что `preHandler: requireX` выглядит
 *     ровно так же и является настоящей сшивкой, а страж, кричащий на верном коде,
 *     будет выключен: в этом дереве так уже случилось трижды.
 *   - ОХРАНА КАК МЕТОД ОБЪЕКТА. `export const perimeter = { requireX() {…} }` не
 *     считается объявлением вовсе — в переписи её просто нет. И компилятор её тоже
 *     не поймает: `noUnusedLocals` в дереве НЕ включён нигде (проверено чтением
 *     tsconfig.base.json, где стоит только `strict`). То есть это настоящая слепая
 *     зона, а не «видно другим инструментом».
 *   - ИМЯ, СОБРАННОЕ В РАНТАЙМЕ. `guards["require" + "Периметр"](…)` статически не
 *     существует; проверка назовёт охрану несшитой. Это ложная тревога, а не
 *     пропуск: направление отказа безопасное.
 *   - Проверка отвечает на вопрос «ссылается ли кто-нибудь», а не «выполняется ли
 *     охрана на маршруте». Второе доказывается только запросом в процессе.
 *
 * Запуск:  node scripts/check-declared-guards.mjs
 * Код возврата 1, если найден хоть один охранник без ссылок и без причины.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiSrc = join(repoRoot, "apps/api/src");

/** Имена, которые в этом проекте означают барьер. Приставки без разбора регистра дальше. */
const GUARD_NAME =
	/^(require|assert|enforce|check|ensure|verify|guard|validate)/;

const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".vite"]);

/**
 * Маркер объявленной причины. Текст после тире обязателен.
 *
 * ПОЧЕМУ СИНТАКСИС КОММЕНТАРИЯ СНИМАЕТСЯ ДО РАЗБОРА. Первая редакция искала
 * `(\S.*)$` прямо в сыром тексте комментария и приняла за причину закрывающую
 * последовательность: `/** guard-callers: none — *​/` давала «причину» из двух
 * символов `*​/`. То есть глушилка работала и выглядела как объяснение — ровно тот
 * дефект, который эта проверка и ищет, только в ней самой. Поймано её же
 * самопроверкой.
 */
const REASON_MARKER = /guard-callers:\s*none\s*[—-]\s*(.+)$/m;

/** Минимум содержания причины: короче или без слов — это не объяснение. */
const REASON_MIN_LENGTH = 10;
const REASON_HAS_WORD = /\p{L}{3,}/u;

/** Снимает обрамление комментария: `/**`, `*​/` и ведущие звёздочки строк. */
function commentBody(raw) {
	return raw
		.replace(/^\/\*+/, " ")
		.replace(/\*+\/\s*$/, " ")
		.replace(/^\/\/+/gm, " ")
		.split("\n")
		.map((line) => line.replace(/^\s*\*+\s?/, ""))
		.join("\n");
}

/**
 * ИЗВЕСТНЫЙ ДОЛГ, ПОИМЁННО. Ключ — имя охраны, значение — файл, где она объявлена,
 * и причина, по которой запись существует. Запись НЕ прощает дефект, она называет
 * его и держит гейт зелёным ровно до тех пор, пока дефект не изменился.
 *
 * РЕЕСТР ПУСТ, И ЭТО ЕГО ШТАТНОЕ СОСТОЯНИЕ, А НЕ ОТКЛЮЧЁННЫЙ МЕХАНИЗМ.
 * Обе записи, с которыми он был заведён, закрыты удалением самих охранников:
 *
 *   `requireClinicToken`   (`apps/api/src/routes/auth.ts`) — выглядела общим
 *     middleware проверки токена кабинета, не вызывалась ни разу, а её
 *     единственным действием была запись `request.clinicOrganizationId`, которую
 *     во всём дереве не читал никто. Подпись токена кабинета проверяет
 *     `security/identity.ts`, и строже.
 *   `assertTenantMatch`    (`apps/api/src/clinicalAuditService.ts`) — приглашала
 *     комментарием ею пользоваться, не вызывалась ни разу; дырой не была (чистое
 *     сравнение строк), но держала ровно ту форму, в которой стояла настоящая
 *     дыра в расписании.
 *
 * Обе удалены поимённо, а не сшиты: сшивать было нечего. Разбор — в комментариях
 * на их прежних местах, чтобы следующий читатель этих файлов не завёл их заново.
 *
 * ПОЧЕМУ МЕХАНИЗМ ОСТАЛСЯ. Запись здесь — единственный способ назвать долг, когда
 * файл охраны принадлежит другой волне работ и правиться сейчас не может. Пустая
 * `Map` держит эту возможность открытой и ничего не прощает: проверка `staleDebt`
 * ниже краснеет на записи, которая разошлась с деревом, поэтому забытая запись
 * долга не сможет тихо прикрыть следующего охранника, объявленного под тем же
 * именем. Именно она и потребовала убрать эти две.
 */
const KNOWN_UNCALLED_GUARD_DEBT = new Map();

function* walk(directory, extensions) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			yield* walk(join(directory, entry.name), extensions);
			continue;
		}
		if (!entry.isFile()) continue;
		if (entry.name.endsWith(".d.ts")) continue;
		if (extensions.some((extension) => entry.name.endsWith(extension)))
			yield join(directory, entry.name);
	}
}

const asRepoPath = (filePath) =>
	relative(repoRoot, filePath).replaceAll("\\", "/");

const isExported = (node) =>
	(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
	Boolean(
		node.modifiers?.some(
			(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
		),
	);

/** Есть ли над объявлением маркер объявленной причины С СОДЕРЖАНИЕМ. */
function declaredReason(node, source) {
	const ranges = ts.getLeadingCommentRanges(source, node.getFullStart()) ?? [];
	for (const range of ranges) {
		const match = REASON_MARKER.exec(
			commentBody(source.slice(range.pos, range.end)),
		);
		if (!match) continue;
		const reason = match[1].trim();
		if (reason.length >= REASON_MIN_LENGTH && REASON_HAS_WORD.test(reason))
			return reason;
	}
	return null;
}

const sourceFiles = [];
for (const filePath of walk(apiSrc, [".ts", ".tsx"])) {
	const source = readFileSync(filePath, "utf8");
	const scriptKind = filePath.endsWith(".tsx")
		? ts.ScriptKind.TSX
		: ts.ScriptKind.TS;
	sourceFiles.push({
		repoPath: asRepoPath(filePath),
		source,
		tree: ts.createSourceFile(
			filePath,
			source,
			ts.ScriptTarget.Latest,
			true,
			scriptKind,
		),
	});
}

/*
 * ОБЪЯВЛЕНИЯ БЕРУТСЯ И НЕЭКСПОРТИРОВАННЫЕ, И ЭТО ИСПРАВЛЕНИЕ ПО ФАКТУ.
 *
 * Первая редакция этой проверки смотрела только на экспортированные функции — так
 * было сформулировано задание. Прогон против истории показал, что тогда она НЕ
 * поймала бы тот самый дефект, ради которого написана: до починки 1f4614ea2
 * `requireScheduleMutationAccess` был объявлен как `async function` БЕЗ export
 * (schedule.ts:141). Проверка, слепая к настоящей дыре класса, бесполезна, каким
 * бы зелёным ни был её вывод.
 *
 * Компилятор такое не ловит: в tsconfig.base.json стоит `strict`, а
 * `noUnusedLocals` не включён нигде — поэтому неиспользуемая функция модуля
 * компилируется молча. Проверено чтением конфигов, а не предположением.
 *
 * ОБЛАСТЬ ССЫЛОК ЗАВИСИТ ОТ ЭКСПОРТА. Экспортированную охрану ищем по всему
 * `apps/api/src`; неэкспортированную — ТОЛЬКО в её собственном файле, потому что
 * снаружи она недостижима и одноимённый символ в другом файле — не её вызов. Без
 * этого разделения два файла с одноимённой охраной прикрывали бы друг друга.
 */
const declarations = [];
for (const { repoPath, source, tree } of sourceFiles) {
	const lineOf = (node) =>
		tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
	const remember = (nameNode, statement) => {
		const name = nameNode.text;
		if (!GUARD_NAME.test(name)) return;
		declarations.push({
			name,
			file: repoPath,
			line: lineOf(nameNode),
			exported: isExported(statement),
			reason: declaredReason(statement, source),
		});
	};
	for (const statement of tree.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name) {
			remember(statement.name, statement);
			continue;
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (!ts.isIdentifier(declaration.name)) continue;
				const initializer = declaration.initializer;
				const looksCallable =
					!initializer ||
					ts.isArrowFunction(initializer) ||
					ts.isFunctionExpression(initializer) ||
					ts.isCallExpression(initializer) ||
					ts.isConditionalExpression(initializer);
				if (looksCallable) remember(declaration.name, statement);
			}
		}
	}
}

/** Ссылки по видам. Ключ — имя, значение — счётчики и места. */
const references = new Map();
for (const declaration of declarations) {
	if (!references.has(declaration.name))
		references.set(declaration.name, {
			call: [],
			value: [],
			binding: [],
			property: [],
		});
}

/**
 * Пространства имён, втянутые в файл: `import * as guards from "…"`.
 *
 * Нужны, чтобы `guards.requireX()` считался ВЫЗОВОМ, а не обращением к чужому
 * свойству. Без этого проверка краснела на верно сшитой охране — замерено на
 * фикстуре: форма `import * as guards; guards.requireПериметр(a, b)` объявлялась
 * нарушением, хотя охрана вызывается. Страж, кричащий на верном коде, будет
 * выключен, и в этом дереве так уже случилось трижды.
 */
function namespaceImportsOf(tree) {
	const names = new Set();
	for (const statement of tree.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		const bindings = statement.importClause?.namedBindings;
		if (bindings && ts.isNamespaceImport(bindings))
			names.add(bindings.name.text);
	}
	return names;
}

/**
 * Псевдонимы охраны на импорте: `import { requireX as gate }`.
 *
 * Имя охраны при этом встречается только в списке импорта, поэтому по нему сшивку
 * не увидеть — работать дальше будет `gate`. Замерено на фикстуре: без этого шага
 * проверка объявляла нарушением охрану, которую под псевдонимом вызывают. Поэтому
 * сшивка ищется по псевдониму, и зачёт даётся ТОЛЬКО если сам псевдоним где-то
 * использован: `import { requireX as gate }` без единого упоминания `gate` — это
 * праздный импорт, а не сшивка.
 */
function aliasesOf(tree) {
	const byGuardName = new Map();
	const visit = (node) => {
		if (
			ts.isImportSpecifier(node) &&
			node.propertyName &&
			ts.isIdentifier(node.propertyName)
		) {
			const list = byGuardName.get(node.propertyName.text) ?? [];
			list.push(node.name.text);
			byGuardName.set(node.propertyName.text, list);
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(tree, visit);
	return byGuardName;
}

/** Куда отнести встреченный идентификатор. Решает РОДИТЕЛЬ, а не текст вокруг. */
function classify(node, namespaces) {
	const parent = node.parent;
	if (!parent) return "value";
	if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
		// `guards.requireX(...)` при `import * as guards` — настоящий вызов охраны.
		const target = parent.expression;
		if (ts.isIdentifier(target) && namespaces.has(target.text)) {
			return ts.isCallExpression(parent.parent) &&
				parent.parent.expression === parent
				? "call"
				: "value";
		}
		return "property";
	}
	if (
		(ts.isPropertyAssignment(parent) ||
			ts.isPropertySignature(parent) ||
			ts.isMethodSignature(parent)) &&
		parent.name === node
	)
		return "property";
	if (
		ts.isImportSpecifier(parent) ||
		ts.isExportSpecifier(parent) ||
		ts.isImportClause(parent)
	)
		return "binding";
	if (ts.isNamespaceImport(parent)) return "binding";
	if (ts.isCallExpression(parent) && parent.expression === node) return "call";
	// Объявление того же имени (в том числе разбираемое сейчас) ссылкой не является.
	if (
		ts.isFunctionDeclaration(parent) ||
		ts.isVariableDeclaration(parent) ||
		ts.isParameter(parent)
	) {
		if (parent.name === node) return "declaration";
	}
	if (
		ts.isFunctionExpression(parent) ||
		ts.isMethodDeclaration(parent) ||
		ts.isClassDeclaration(parent)
	) {
		if (parent.name === node) return "declaration";
	}
	return "value";
}

/** Строковый литерал с именем охраны: `obj["requireX"]`. Тоже свойство, не привязка. */
function stringReferencesGuard(node) {
	return (
		(ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
		references.has(node.text)
	);
}

for (const { repoPath, tree } of sourceFiles) {
	const lineOf = (node) =>
		tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
	const namespaces = namespaceImportsOf(tree);
	const aliases = aliasesOf(tree);
	/** Сколько раз в этом файле упомянут псевдоним — то есть работают ли им. */
	const aliasUses = new Map();
	const countAliases = (node) => {
		if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent ?? {})) {
			aliasUses.set(node.text, (aliasUses.get(node.text) ?? 0) + 1);
		}
		ts.forEachChild(node, countAliases);
	};
	ts.forEachChild(tree, countAliases);

	const visit = (node) => {
		if (ts.isIdentifier(node) && references.has(node.text)) {
			const kind = classify(node, namespaces);
			if (kind !== "declaration") {
				references
					.get(node.text)
					[kind].push({ file: repoPath, line: lineOf(node) });
			}
		} else if (stringReferencesGuard(node)) {
			references
				.get(node.text)
				.property.push({ file: repoPath, line: lineOf(node) });
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(tree, visit);

	// Псевдоним, которым действительно работают, — сшивка охраны под её именем.
	for (const [guardName, aliasNames] of aliases) {
		if (!references.has(guardName)) continue;
		for (const alias of aliasNames) {
			if ((aliasUses.get(alias) ?? 0) > 0) {
				references
					.get(guardName)
					.value.push({ file: repoPath, line: 0, alias });
			}
		}
	}
}

const isTestPath = (file) =>
	/(^|\/)tests?\//.test(file) ||
	file.endsWith(".test.ts") ||
	file.endsWith(".test.tsx");

/** Приговор по каждой охране. Считается по ссылкам-привязкам, не по упоминаниям. */
const verdicts = declarations.map((declaration) => {
	const all = references.get(declaration.name);
	/** Неэкспортированную охрану видно только внутри её файла — там и ищем. */
	const inScope = (places) =>
		declaration.exported
			? places
			: places.filter((place) => place.file === declaration.file);
	const found = {
		call: inScope(all.call),
		value: inScope(all.value),
		binding: inScope(all.binding),
		property: inScope(all.property),
	};
	const wiring = [...found.call, ...found.value];
	const debt = KNOWN_UNCALLED_GUARD_DEBT.get(declaration.name) ?? null;
	return {
		...declaration,
		found,
		wiring,
		debt: debt && debt.file === declaration.file ? debt : null,
		/** Сшивка есть, но только из тестов: боевой код через охрану не ходит. */
		onlyFromTests:
			wiring.length > 0 &&
			!isTestPath(declaration.file) &&
			wiring.every((place) => isTestPath(place.file)),
	};
});

const uncalled = verdicts.filter((verdict) => verdict.wiring.length === 0);
const waivedByReason = uncalled.filter((verdict) => verdict.reason !== null);
const waivedByDebt = uncalled.filter(
	(verdict) => verdict.reason === null && verdict.debt !== null,
);
const offenders = uncalled
	.filter((verdict) => verdict.reason === null && verdict.debt === null)
	.sort((a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file));
const onlyFromTests = verdicts.filter((verdict) => verdict.onlyFromTests);

/**
 * Запись долга разошлась с деревом: охрана в ней названа, а нарушением уже не
 * является (сшита, переименована или удалена). Запись пора убрать — иначе она
 * прикроет следующего охранника, объявленного под тем же именем.
 *
 * Проверяется ТОЛЬКО когда файл записи есть в проверяемом дереве: дерево без него
 * — это не «долг закрыт», а «запись к этому дереву не относится». Так проверку
 * можно прогнать на фикстуре, не таща в неё боевую бухгалтерию.
 */
const scannedPaths = new Set(sourceFiles.map((file) => file.repoPath));
const staleDebt = [...KNOWN_UNCALLED_GUARD_DEBT.entries()]
	.filter(
		([name, entry]) =>
			scannedPaths.has(entry.file) &&
			!uncalled.some((verdict) => verdict.name === name),
	)
	.map(([name, entry]) => `${name} (${entry.file})`);

console.log(`файлов разобрано:                 ${sourceFiles.length}`);
console.log(
	`объявлено охранников:             ${declarations.length} (экспортированных ${declarations.filter((d) => d.exported).length})`,
);
console.log(`из них без единой ссылки:         ${uncalled.length}`);
console.log(`  с объявленной причиной:         ${waivedByReason.length}`);
console.log(`  в списке известного долга:      ${waivedByDebt.length}`);
console.log(`ОБЪЯВЛЕН И НЕ ВЫЗВАН:             ${offenders.length}`);
console.log(
	`сшит только из тестов:            ${onlyFromTests.length} (не валит гейт)`,
);

/*
 * ПЕРЕПИСЬ ЦЕЛИКОМ — по флагу, потому что она нужна человеку, а не гейту.
 * Без неё вывод отвечает «нарушений нет» и не даёт проверить, ЧТО именно проверка
 * сочла сшитым: ровно та слепота, из-за которой охрану расписания считали
 * работающей. С флагом видно каждое имя и вид его ссылок.
 */
if (process.argv.includes("--census")) {
	console.log(
		"\n===== ПЕРЕПИСЬ ОХРАННИКОВ: вызов / значение / импорт / свойство =====",
	);
	for (const verdict of [...verdicts].sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		const { call, value, binding, property } = verdict.found;
		console.log(
			`  ${verdict.name.padEnd(42)} вызов ${String(call.length).padStart(3)}  значение ${String(value.length).padStart(3)}` +
				`  импорт ${String(binding.length).padStart(3)}  свойство ${String(property.length).padStart(3)}   ${verdict.file}:${verdict.line}`,
		);
	}
}

if (onlyFromTests.length > 0) {
	console.log(
		"\nОхрана сшита ТОЛЬКО из тестов — боевой код через неё не ходит:",
	);
	for (const verdict of onlyFromTests) {
		console.log(`  ${verdict.name}  ${verdict.file}:${verdict.line}`);
		for (const place of verdict.wiring)
			console.log(`         ссылка: ${place.file}:${place.line}`);
	}
}

if (waivedByReason.length > 0) {
	console.log(
		"\nБез вызывающих, но причина объявлена в комментарии над объявлением:",
	);
	for (const verdict of waivedByReason) {
		console.log(`  ${verdict.name}  ${verdict.file}:${verdict.line}`);
		console.log(`         причина: ${verdict.reason}`);
	}
}

if (waivedByDebt.length > 0) {
	console.log(
		"\nБез вызывающих, названы в списке известного долга этой проверки:",
	);
	for (const verdict of waivedByDebt) {
		console.log(`  ${verdict.name}  ${verdict.file}:${verdict.line}`);
		console.log(`         ${verdict.debt.reason}`);
	}
}

if (offenders.length > 0) {
	console.error(
		"\nОХРАНА ОБЪЯВЛЕНА И НЕ ВЫЗЫВАЕТСЯ НИГДЕ — ровно форма дыры в расписании:\n",
	);
	for (const verdict of offenders) {
		console.error(`  ${verdict.name}  ${verdict.file}:${verdict.line}`);
		if (verdict.found.binding.length > 0) {
			console.error(
				`         имя импортируется и не используется: ${verdict.found.binding.length} раз(а)`,
			);
			for (const place of verdict.found.binding)
				console.error(`           ${place.file}:${place.line}`);
		}
		if (verdict.found.property.length > 0) {
			console.error(
				`         есть обращение к свойству с тем же именем (${verdict.found.property.length}): другой символ, зачёт не даёт`,
			);
			for (const place of verdict.found.property)
				console.error(`           ${place.file}:${place.line}`);
		}
	}
	console.error(
		"\nКак закрывать. Либо сшить: вызвать охрану на маршрутах, которые обязаны через неё ходить,\n" +
			"либо удалить поимённо, если её работу уже делает другой слой, либо — если она заготовка —\n" +
			"написать причину в комментарии НАД объявлением маркером\n" +
			"  guard-callers: none — <причина, почему вызывающих нет>\n" +
			"Причина обязана быть текстом: маркер без объяснения не принимается.\n" +
			"Ссылка-значение (`preHandler: requireX`) считается сшивкой; один праздный import — нет.",
	);
}

if (staleDebt.length > 0) {
	console.error(
		`\nЗапись известного долга разошлась с деревом: ${staleDebt.join("; ")}.\n` +
			"Охрана больше не подходит под нарушение — убрать её из KNOWN_UNCALLED_GUARD_DEBT,\n" +
			"иначе запись прикроет следующего охранника, объявленного под тем же именем.",
	);
}

/*
 * ЕДИНСТВЕННЫЙ ВЫХОД ИЗ ПРОЦЕССА, И ОН В САМОМ НИЗУ. Соседняя проверка
 * `check-css-tokens.mjs` держала `process.exit(1)` в середине отчёта, и он съедал
 * все списки под собой: гейт краснел, называя причиной бухгалтерию, и ни одного
 * настоящего нарушения не печатал. Здесь этой ошибки нет по построению.
 */
if (offenders.length === 0 && staleDebt.length === 0) {
	console.log(
		"\nВсе объявленные охранники сшиты, либо их отсутствие вызывающих объяснено поимённо.",
	);
	process.exit(0);
}
process.exit(1);
