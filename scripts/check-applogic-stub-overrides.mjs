#!/usr/bin/env node
/**
 * ГЕЙТ: мёртвый литерал не смеет перекрывать живую реализацию из модуля.
 *
 * ЗАЧЕМ. `useAppLogic` собирает возвращаемый объект из двух источников: сначала
 * раскрывает доменные модули (`...imagingQueries`, `...clinicalVisitLogic` и
 * прочие), затем перечисляет отдельные свойства. В литерале объекта JavaScript
 * ПОБЕЖДАЕТ ПОСЛЕДНИЙ КЛЮЧ. Поэтому строка
 *
 *     pickBrowserImagingFiles: () => {},
 *
 * стоящая НИЖЕ `...imagingQueries`, молча затирает настоящую реализацию из
 * `hooks/domains/useImagingQueries.ts`. Экран получает пустую функцию.
 *
 * ЭТО НЕ УМОЗРИТЕЛЬНО. Замер 2026-08-08 на коммите f81cba16f, чьё сообщение
 * гласит «stub missing derived props, typecheck clean»:
 *   - `pickBrowserImagingFiles` — живая реализация useImagingQueries.ts:63
 *     кликает по скрытому вводу файлов. Заглушка на useAppLogic.tsx:4682
 *     перекрывала её. Кнопка «Файлы» в разделе снимков (ImagingView.tsx:564)
 *     нажималась и не делала НИЧЕГО: выбор DICOM был недоступен.
 *
 * ПОЧЕМУ ЭТОГО НЕ ВИДИТ КОМПИЛЯТОР. Дубль ключа в литерале объекта — законный
 * JavaScript, TypeScript на него не ругается, потому что типы совпадают:
 * `() => void` перекрывается таким же `() => void`. Сообщение коммита
 * «typecheck clean» поэтому правдиво и одновременно бесполезно — зелёный
 * компилятор доказывает согласованность типов, а не работоспособность экрана.
 *
 * ОСОБО ОПАСНА ФОРМА `: null`. Она перекрывает функцию значением null, и
 * `onClick={null}` уже не просто ничего не делает — прямой вызов такого
 * свойства даёт TypeError «is not a function» в проде.
 *
 * КАК ПРОВЕРЯЕТСЯ. Обход дерева TypeScript, не регулярки. Порядок ключей внутри
 * литерала значим, поэтому разбор идёт строго по позиции: сначала запоминаются
 * раскрытия модулей и их строки, затем каждое свойство сверяется с тем, что
 * экспортировал раскрытый ВЫШЕ модуль.
 *
 * ПОЧЕМУ НЕ ТЕКСТОМ. Текстовый поиск не знает порядка ключей и не отличит
 * `foo: null` внутри вложенного объекта от ключа верхнего уровня. Кроме того, в
 * этом проекте уже был случай, когда текстовый гейт засчитывал совпадение из
 * КОММЕНТАРИЯ: комментарии не являются узлами AST, обход дерева от этого
 * защищён структурно.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const require_ = createRequire(import.meta.url);
const ts = require_("typescript");

const ENTRY = "apps/web/src/useAppLogic.tsx";

/**
 * Значения, которые считаются МЁРТВЫМИ: свойство с таким значением не несёт
 * поведения. Пустая функция, null, пустой список, пустой объект.
 * `0`, `""` и `false` НЕ включены намеренно: это законные начальные значения
 * счётчиков и переключателей, и они не перекрывают функции — перекрытие
 * функции скаляром дало бы ошибку типов и было бы поймано компилятором.
 */
function isDeadInitializer(node) {
	if (node.kind === ts.SyntaxKind.NullKeyword) return "null";
	if (ts.isIdentifier(node) && node.text === "undefined") return "undefined";
	if (ts.isArrayLiteralExpression(node) && node.elements.length === 0)
		return "пустой список";
	if (ts.isObjectLiteralExpression(node) && node.properties.length === 0)
		return "пустой объект";
	if (ts.isArrowFunction(node)) {
		const body = node.body;
		if (ts.isBlock(body) && body.statements.length === 0)
			return "пустая функция";
	}
	return null;
}

function parse(file) {
	return ts.createSourceFile(
		file,
		readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
}

/**
 * Ключи, которые модуль-хук отдаёт наружу из СВОЕГО ВЕРХНЕУРОВНЕВОГО возврата.
 *
 * ПОЧЕМУ НЕ ИЗ ЛЮБОГО `return`. Первая версия собирала ключи из всех возвратов
 * файла — и завышала список. Замер: в `useDocumentWorkflowModule.ts` ВОСЕМЬ
 * объектов-возвратов (строки 1368, 2316, 2404, 2544, 2796, 2905, 2970, 3476), и
 * семь из них принадлежат ВЛОЖЕННЫМ функциям. Ключ, возвращаемый внутренней
 * функцией, наружу из модуля не выходит, и засчитывать его как экспорт нельзя:
 * иначе гейт объявит перекрытием то, что модуль никогда не отдавал.
 *
 * Берётся возврат, объемлющая функция которого — сам экспортируемый хук.
 */
function exportedKeysOfHookModule(file, hookName) {
	if (!existsSync(file)) return null;
	const source = parse(file);

	let hookFn = null;
	const findHook = (node) => {
		if (
			ts.isFunctionDeclaration(node) &&
			node.name?.text === hookName &&
			node.body
		) {
			hookFn = node;
		} else if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === hookName &&
			node.initializer &&
			(ts.isArrowFunction(node.initializer) ||
				ts.isFunctionExpression(node.initializer))
		) {
			hookFn = node.initializer;
		}
		node.forEachChild(findHook);
	};
	findHook(source);
	if (!hookFn?.body) return null;

	/* Возврат считается верхнеуровневым, если ближайшая объемлющая функция — сам хук. */
	const enclosing = (node) => {
		let cur = node.parent;
		while (
			cur &&
			!ts.isFunctionDeclaration(cur) &&
			!ts.isArrowFunction(cur) &&
			!ts.isFunctionExpression(cur) &&
			!ts.isMethodDeclaration(cur)
		) {
			cur = cur.parent;
		}
		return cur;
	};

	const keys = new Set();
	const visit = (node) => {
		if (
			ts.isReturnStatement(node) &&
			node.expression &&
			ts.isObjectLiteralExpression(node.expression) &&
			enclosing(node) === hookFn
		) {
			for (const prop of node.expression.properties) {
				if (
					(ts.isPropertyAssignment(prop) ||
						ts.isShorthandPropertyAssignment(prop)) &&
					prop.name &&
					ts.isIdentifier(prop.name)
				) {
					keys.add(prop.name.text);
				}
			}
		}
		node.forEachChild(visit);
	};
	visit(hookFn.body);
	return keys;
}

const entrySource = parse(ENTRY);
const lineOf = (node) =>
	entrySource.getLineAndCharacterOfPosition(node.getStart(entrySource)).line +
	1;

/*
 * Сопоставление «имя переменной -> файл модуля». Строится по объявлениям вида
 * `const imagingQueries = useImagingQueries({ auth })` вместе с импортами, а не
 * угадывается по имени: имя переменной и имя хука в этом файле совпадают не
 * всегда (`clinicalVisitLogic` приходит из `useVisitLogic`).
 */
const importedFrom = new Map(); // имя хука -> путь модуля
const visitImports = (node) => {
	if (
		ts.isImportDeclaration(node) &&
		ts.isStringLiteral(node.moduleSpecifier) &&
		node.importClause?.namedBindings &&
		ts.isNamedImports(node.importClause.namedBindings)
	) {
		const spec = node.moduleSpecifier.text;
		if (spec.startsWith(".")) {
			for (const el of node.importClause.namedBindings.elements) {
				const base = resolve(dirname(ENTRY), spec);
				for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
					if (existsSync(base + ext)) {
						importedFrom.set(el.name.text, base + ext);
						break;
					}
				}
			}
		}
	}
	node.forEachChild(visitImports);
};
visitImports(entrySource);

const varToModule = new Map(); // имя переменной -> {путь модуля, имя хука}
const visitDecls = (node) => {
	if (
		ts.isVariableDeclaration(node) &&
		ts.isIdentifier(node.name) &&
		node.initializer &&
		ts.isCallExpression(node.initializer) &&
		ts.isIdentifier(node.initializer.expression)
	) {
		const hook = node.initializer.expression.text;
		if (importedFrom.has(hook)) {
			varToModule.set(node.name.text, {
				path: importedFrom.get(hook),
				hook,
			});
		}
	}
	node.forEachChild(visitDecls);
};
visitDecls(entrySource);

/*
 * ТРАНЗИТИВНОЕ РАСКРЫТИЕ. Модуль может прийти не прямым вызовом хука, а
 * извлечением из результата другого модуля:
 *
 *     const telegram = useTelegramModule({...});          // useAppLogic.tsx:1403
 *     const { telegramSettingsModule } = telegram;        // useAppLogic.tsx:1419
 *     ...
 *     ...telegramSettingsModule,                          // раскрытие
 *
 * Первая версия такие места не сопоставляла и честно объявляла себя слепой.
 * Слепое пятно в гейте опаснее отсутствия гейта: оно выглядит как проверка.
 * Поэтому цепочка раскрывается: внутри модуля-владельца ищется, каким хуком
 * порождено извлекаемое свойство, и берётся УЖЕ ЕГО файл.
 */
function resolveNestedModule(ownerModulePath, propertyName) {
	if (!existsSync(ownerModulePath)) return null;
	const source = parse(ownerModulePath);

	const localImports = new Map();
	const visitImp = (node) => {
		if (
			ts.isImportDeclaration(node) &&
			ts.isStringLiteral(node.moduleSpecifier) &&
			node.importClause?.namedBindings &&
			ts.isNamedImports(node.importClause.namedBindings)
		) {
			const spec = node.moduleSpecifier.text;
			if (spec.startsWith(".")) {
				for (const el of node.importClause.namedBindings.elements) {
					const base = resolve(dirname(ownerModulePath), spec);
					for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
						if (existsSync(base + ext)) {
							localImports.set(el.name.text, base + ext);
							break;
						}
					}
				}
			}
		}
		node.forEachChild(visitImp);
	};
	visitImp(source);

	let found = null;
	const visitVar = (node) => {
		if (
			!found &&
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === propertyName &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			ts.isIdentifier(node.initializer.expression)
		) {
			const hook = node.initializer.expression.text;
			if (localImports.has(hook)) {
				found = { path: localImports.get(hook), hook };
			}
		}
		node.forEachChild(visitVar);
	};
	visitVar(source);
	return found;
}

const visitDestructured = (node) => {
	if (
		ts.isVariableDeclaration(node) &&
		ts.isObjectBindingPattern(node.name) &&
		node.initializer &&
		ts.isIdentifier(node.initializer)
	) {
		const owner = varToModule.get(node.initializer.text);
		if (owner) {
			for (const el of node.name.elements) {
				if (ts.isIdentifier(el.name) && !el.propertyName) {
					const nested = resolveNestedModule(owner.path, el.name.text);
					if (nested) varToModule.set(el.name.text, nested);
				}
			}
		}
	}
	node.forEachChild(visitDestructured);
};
visitDestructured(entrySource);

/*
 * Ищем ВОЗВРАЩАЕМЫЙ ОБЪЕКТ верхнего уровня — тот, что отдаёт сам `useAppLogic`.
 * Признак: литерал объекта в `return`, содержащий раскрытия модулей. Внутренние
 * возвраты вложенных функций отсеиваются требованием наличия раскрытий.
 */
let target = null;
const visitReturns = (node) => {
	if (
		ts.isReturnStatement(node) &&
		node.expression &&
		ts.isObjectLiteralExpression(node.expression)
	) {
		const spreads = node.expression.properties.filter((p) =>
			ts.isSpreadAssignment(p),
		);
		if (spreads.length > 0) {
			if (
				!target ||
				node.expression.properties.length > target.properties.length
			)
				target = node.expression;
		}
	}
	node.forEachChild(visitReturns);
};
visitReturns(entrySource);

if (!target) {
	console.error(
		`Не найден возвращаемый объект с раскрытиями модулей в ${ENTRY}.\n` +
			"Гейт не может проверить перекрытия и потому НЕ считается пройденным: " +
			"молчаливый успех на неразобранном файле — это ложный зелёный.",
	);
	process.exit(1);
}

/*
 * Проход строго по позиции. Ключ перекрывает модуль только если объявлен НИЖЕ
 * его раскрытия. Раскрытие ниже ключа — законная и обратная ситуация.
 */
const spreadKeysSoFar = new Map(); // ключ -> {модуль, строка}
const findings = [];
const unresolved = [];

for (const prop of target.properties) {
	if (ts.isSpreadAssignment(prop) && ts.isIdentifier(prop.expression)) {
		const varName = prop.expression.text;
		const mod = varToModule.get(varName);
		if (!mod) {
			unresolved.push({ varName, line: lineOf(prop) });
			continue;
		}
		const keys = exportedKeysOfHookModule(mod.path, mod.hook);
		if (!keys) {
			unresolved.push({ varName, line: lineOf(prop), modulePath: mod.path });
			continue;
		}
		for (const key of keys) {
			spreadKeysSoFar.set(key, {
				varName,
				modulePath: mod.path,
				line: lineOf(prop),
			});
		}
		continue;
	}

	if (
		ts.isPropertyAssignment(prop) &&
		prop.name &&
		ts.isIdentifier(prop.name) &&
		prop.initializer
	) {
		const key = prop.name.text;
		const dead = isDeadInitializer(prop.initializer);
		if (dead && spreadKeysSoFar.has(key)) {
			const origin = spreadKeysSoFar.get(key);
			findings.push({
				key,
				line: lineOf(prop),
				dead,
				origin,
			});
		}
	}
}

if (unresolved.length > 0) {
	console.error(
		"Не удалось сопоставить раскрытие с модулем — гейт слеп на этих местах:",
	);
	for (const u of unresolved)
		console.error(`  ${ENTRY}:${u.line}  ...${u.varName}`);
	console.error(
		"Слепое пятно гейта — это не «пройдено». Разберитесь с сопоставлением.\n",
	);
}

if (findings.length > 0) {
	console.error(
		`Мёртвый литерал перекрывает живую реализацию: ${findings.length} мест.\n`,
	);
	for (const f of findings) {
		console.error(
			`  ${ENTRY}:${f.line}  ${f.key}: ${f.dead}\n` +
				`      перекрывает ${f.origin.modulePath.replaceAll("\\", "/")} ` +
				`(раскрыт на строке ${f.origin.line} как ...${f.origin.varName})`,
		);
	}
	console.error(
		"\nПочему это ломает клинику: в литерале объекта побеждает ПОСЛЕДНИЙ ключ. " +
			"Живая реализация из модуля подставляется, а затем затирается пустышкой. " +
			"Кнопка нажимается и не делает ничего; при значении null прямой вызов " +
			"даёт TypeError в проде.\n" +
			"Компилятор молчит: дубль ключа в литерале — законный JavaScript, а типы " +
			"совпадают. Зелёный typecheck тут ничего не доказывает.\n" +
			"Починка: удалите строку-заглушку, чтобы значение пришло из модуля. Если " +
			"модуль действительно НЕ отдаёт это свойство — реализуйте его в модуле, а " +
			"не подменяйте пустышкой в сборном объекте.",
	);
	process.exit(1);
}

if (unresolved.length > 0) process.exit(1);

console.log(
	`Перекрытий нет: разобран возвращаемый объект ${ENTRY}, ` +
		`${target.properties.length} свойств, раскрытых модулей ${varToModule.size}.`,
);
