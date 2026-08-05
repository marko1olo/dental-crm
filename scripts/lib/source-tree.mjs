/**
 * source-tree.mjs — разбор дерева исходников apps/web для сторожей загрузки.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Три сторожа — smoke-web-code-split-source.mjs,
 * smoke-app-boot-state-source.mjs и smoke-app-update-recovery-source.mjs — в один
 * день независимо ушли с проверки подстрок на разбор дерева, и каждый унёс к себе
 * СВОЙ экземпляр одних и тех же восьми функций: обход узлов, имя тега JSX,
 * предки JSX, таблица импортов, разрешение относительного модуля в файл, признаки
 * класса-границы отказа, привязка ленивого импорта, поиск location.reload().
 * Копии уже начали расходиться к моменту сведения (расхождения названы ниже), а
 * разъехавшийся разбор — известный способ получить сторожа, который на одном
 * наборе краснеет, а на соседнем молчит: в этом же дереве так уже разошлись два
 * разбора маршрутов (см. шапку route-topology.mjs).
 *
 * ЧТО РАЗОШЛОСЬ В КОПИЯХ И КАКАЯ РЕДАКЦИЯ ВЗЯТА ЗА ОБЩУЮ:
 *  1. `valueImportsByLocalName`. Две копии клали в таблицу СТРОКУ-спецификатор,
 *     третья — запись `{from, exported}`, потому что ей нужно искать объявление в
 *     чужом модуле, а `import { a as b }` объявлен там под именем `a`. Общей взята
 *     редакция с записью: она умеет и то, и другое, а строка не умела бы искать
 *     объявление. Потребителю, которому нужен только файл, читает `.from`.
 *  2. `classErrorBoundaryTraits`. Одна копия возвращала только имя класса и два
 *     признака, вторая — ещё и сам узел (ей нужно лезть внутрь методов), третья
 *     вообще держала этот разбор встроенным в цикл и на первом же полном классе
 *     останавливалась. Общей взята редакция с узлом: она надмножество, а порядок
 *     обхода и правило «побеждает первый» у всех трёх совпадали.
 *  3. `reloadsDocument` / `callsDocumentReload`. Один и тот же предикат, но одна
 *     копия принимала только SourceFile, вторая — узел и SourceFile отдельно.
 *     Общей взята вторая: первая есть её частный случай `node === sourceFile`.
 * Остальные пять функций совпадали дословно с точностью до переноса строки и
 * текста комментария.
 *
 * ЧЕГО ЭТОТ РАЗБОР НЕ УМЕЕТ — названо здесь, а не спрятано. Модуль работает на
 * `ts.createSourceFile`, то есть на голом дереве без Program и без TypeChecker:
 * это сознательный выбор (сторожа обязаны запускаться за доли секунды и без
 * tsconfig), и он платит следующим:
 *  - Разрешение модуля здесь СВОЁ, четыре кандидата по расширению. Псевдонимы
 *    путей из tsconfig, `exports` из package.json и вообще всё, что делает
 *    `ts.resolveModuleName`, не поддержано. Пакет из node_modules возвращается как
 *    `null` — и это правильно: чужой код мы не сторожим.
 *  - Цепочка реэкспортов не разворачивается. `export { X } from "./y"` в промежуточном
 *    модуле оборвёт поиск объявления: TypeChecker прошёл бы её, голое дерево — нет.
 *  - Импорт по умолчанию и импорт пространства имён ищутся в чужом модуле по
 *    ЛОКАЛЬНОМУ имени. Настоящее имя `default` при этом не разбирается; совпадение
 *    локального имени с именем объявления в модуле-источнике — везение, а не
 *    разрешение. Для нынешних сторожей этого достаточно: они ходят по именованным
 *    импортам.
 *  - Ничего динамического: получатель, собранный в рантайме, имя компонента из
 *    переменной, элемент, отрисованный через `React.createElement(byName)`, в
 *    дерево предков не попадут. Свойство «этот компонент реально смонтирован при
 *    таком-то состоянии» разбором исходника не доказывается в принципе и требует
 *    исполнения.
 *
 * Только чтение. Ни одна функция здесь ничего не пишет и не запускает.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/* ------------------------------------------------------------------ *
 * Слой 1. Дерево, имена, импорты.
 * ------------------------------------------------------------------ */

/** Файл на диске -> дерево. Родительские ссылки нужны для обхода предков JSX. */
export function parseTypeScriptFile(filePath) {
	return ts.createSourceFile(
		filePath,
		readFileSync(filePath, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
}

export function eachNode(node, visit) {
	visit(node);
	node.forEachChild((child) => eachNode(child, visit));
}

/** Текст имени тега: `<Foo/>`, `<foo.Bar/>`, `<div/>`. */
export function jsxTagName(node) {
	const opening = ts.isJsxElement(node) ? node.openingElement : node;
	return opening.tagName.getText(opening.getSourceFile());
}

/** Элементы-предки узла JSX, от ближайшего к корню. */
export function jsxAncestors(node) {
	const ancestors = [];
	for (let cursor = node.parent; cursor; cursor = cursor.parent) {
		if (ts.isJsxElement(cursor)) ancestors.push(cursor);
	}
	return ancestors;
}

/**
 * Локальное имя -> `{from, exported}`: из какого модуля пришло имя и под каким
 * именем оно там объявлено. Для импорта по умолчанию и пространства имён
 * `exported` — локальное имя (см. ограничение в шапке).
 */
export function valueImportsByLocalName(sourceFile) {
	const bindings = new Map();
	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
		const clause = statement.importClause;
		// `import type` стирается компилятором: в рантайме такого имени нет.
		if (!clause || clause.isTypeOnly) continue;
		const from = statement.moduleSpecifier.text;
		if (clause.name)
			bindings.set(clause.name.text, { from, exported: clause.name.text });
		const named = clause.namedBindings;
		if (named && ts.isNamespaceImport(named))
			bindings.set(named.name.text, { from, exported: named.name.text });
		if (named && ts.isNamedImports(named)) {
			for (const element of named.elements) {
				if (element.isTypeOnly) continue;
				// `import { a as b }` — искать объявление надо по исходному имени.
				bindings.set(element.name.text, {
					from,
					exported: (element.propertyName ?? element.name).text,
				});
			}
		}
	}
	return bindings;
}

/** Относительный спецификатор -> файл на диске. Пакеты из node_modules не наши. */
export function resolveRelativeModule(fromFile, specifier) {
	if (!specifier.startsWith(".")) return null;
	const base = path.posix.join(
		path.posix.dirname(fromFile.replaceAll("\\", "/")),
		specifier,
	);
	for (const candidate of [
		`${base}.tsx`,
		`${base}.ts`,
		`${base}/index.tsx`,
		`${base}/index.ts`,
	]) {
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

/** Функция модуля по имени: `function f(){}` либо `const f = () => {}`. */
export function functionDeclarationByName(sourceFile, name) {
	let found = null;
	eachNode(sourceFile, (node) => {
		if (found) return;
		if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
			found = node;
			return;
		}
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === name &&
			node.initializer &&
			(ts.isArrowFunction(node.initializer) ||
				ts.isFunctionExpression(node.initializer))
		) {
			found = node.initializer;
		}
	});
	return found;
}

/**
 * Объявление функции по её локальному имени: сперва в этом же модуле, затем — по
 * таблице импортов — в модуле, откуда имя пришло. Именно это разрешение делает
 * сторожа безразличным к тому, вызывается ли API напрямую или через обёртку.
 */
export function resolveFunctionBinding(sourceFile, filePath, imports, name) {
	const local = functionDeclarationByName(sourceFile, name);
	if (local) return { node: local, file: filePath, sourceFile };

	const binding = imports.get(name);
	if (!binding) return null;
	const importedFile = resolveRelativeModule(filePath, binding.from);
	if (!importedFile) return null;
	const importedAst = parseTypeScriptFile(importedFile);
	const declaration = functionDeclarationByName(importedAst, binding.exported);
	if (!declaration) return null;
	return { node: declaration, file: importedFile, sourceFile: importedAst };
}

/** Есть ли внутри узла вызов `location.reload()` — детерминированный выход. */
export function callsLocationReload(node, sourceFile) {
	let found = false;
	eachNode(node, (inner) => {
		if (found) return;
		if (!ts.isCallExpression(inner)) return;
		const callee = inner.expression;
		if (!ts.isPropertyAccessExpression(callee)) return;
		if (callee.name.text !== "reload") return;
		if (/(^|\.)location$/.test(callee.expression.getText(sourceFile)))
			found = true;
	});
	return found;
}

/* ------------------------------------------------------------------ *
 * Слой 2. Границы отказа React над ленивым монтажом.
 * ------------------------------------------------------------------ */

/**
 * Классы модуля с отметкой, какие из двух обработчиков границы у них есть.
 *
 * ПОЧЕМУ ОПОРА ИМЕННО НА ЭТИ ДВА ИМЕНИ. getDerivedStateFromError и
 * componentDidCatch — не наши идентификаторы, а строковые ключи, по которым сам
 * React при обходе fiber-дерева решает, является ли класс границей
 * (react.dev/reference/react/Component). Их нельзя переименовать, не сломав
 * механизм: по этой же причине они переживают минификацию — сборщики мангрят
 * идентификаторы, а не имена свойств.
 */
export function classErrorBoundaryTraits(sourceFile) {
	const classes = [];
	eachNode(sourceFile, (node) => {
		if (!ts.isClassDeclaration(node) && !ts.isClassExpression(node)) return;
		let derivesStateFromError = false;
		let catchesRenderError = false;
		for (const member of node.members) {
			if (!member.name) continue;
			const memberName = member.name.getText(sourceFile);
			const isStatic =
				(ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static) !== 0;
			if (memberName === "getDerivedStateFromError" && isStatic) {
				derivesStateFromError = true;
			}
			if (memberName === "componentDidCatch" && !isStatic) {
				catchesRenderError = true;
			}
		}
		classes.push({
			node,
			name: node.name ? node.name.text : "(без имени)",
			derivesStateFromError,
			catchesRenderError,
		});
	});
	return classes;
}

/**
 * Привязки, в чей инициализатор попал динамический `import(...)`:
 * `const V = lazy(() => import("./V"))` и любая другая обёртка над ним.
 */
export function dynamicImportBindings(sourceFile) {
	const bindings = [];
	eachNode(sourceFile, (node) => {
		if (!ts.isVariableDeclaration(node) || !node.initializer) return;
		if (!ts.isIdentifier(node.name)) return;
		const specifiers = [];
		eachNode(node.initializer, (inner) => {
			if (
				ts.isCallExpression(inner) &&
				inner.expression.kind === ts.SyntaxKind.ImportKeyword &&
				inner.arguments.length > 0 &&
				ts.isStringLiteral(inner.arguments[0])
			) {
				specifiers.push(inner.arguments[0].text);
			}
		});
		if (specifiers.length > 0) bindings.push({ name: node.name.text, specifiers });
	});
	return bindings;
}

/** Привязка, в которую положен `lazy(() => import(<specifier>))`. */
export function lazyBindingNameForImport(sourceFile, specifier) {
	const binding = dynamicImportBindings(sourceFile).find((candidate) =>
		candidate.specifiers.includes(specifier),
	);
	return binding ? binding.name : null;
}

/**
 * Граница отказа над ленивым монтажом, найденная разбором, а не по имени.
 *
 * Ход один и тот же во всех трёх сторожах: в файле-хозяине берётся привязка
 * ленивого модуля, ищется её ЭЛЕМЕНТ JSX, от него вверх берутся элементы-предки,
 * каждый предок разрешается через таблицу импортов хозяина в реальный файл, файл
 * разбирается, и в нём ищется класс с ОБОИМИ обработчиками React. Ни имя класса,
 * ни имя модуля границы в проверку не входят.
 *
 * `specifier === null` означает «любой ленивый модуль хозяина»: так находится
 * граница разделов рабочего места, которых полтора десятка и перечислять их
 * поимённо значило бы вернуть ту же зависимость от написания.
 *
 * Возвращает:
 *  - `boundary` — первый предок-класс с обоими обработчиками (`null`, если нет);
 *  - `halfBuilt` — предок-класс, у которого есть только половина механизма:
 *    «собрано наполовину» обязано быть отличимо от «границы нет вовсе»;
 *  - `lazyBindingName` — имя первой подходящей ленивой привязки (для текста
 *    отказа), `mountedBindingName` — имя той, чей монтаж реально найден в JSX.
 */
export function findLazyMountErrorBoundary(hostFile, { specifier = null } = {}) {
	const hostAst = parseTypeScriptFile(hostFile);
	const hostImports = valueImportsByLocalName(hostAst);
	const candidates = dynamicImportBindings(hostAst).filter(
		(binding) => specifier === null || binding.specifiers.includes(specifier),
	);

	const result = {
		hostAst,
		hostImports,
		lazyBindingName: candidates.length > 0 ? candidates[0].name : null,
		mountedBindingName: null,
		boundary: null,
		halfBuilt: null,
	};

	for (const candidate of candidates) {
		let mount = null;
		eachNode(hostAst, (node) => {
			if (mount) return;
			if (!ts.isJsxSelfClosingElement(node) && !ts.isJsxOpeningElement(node))
				return;
			if (jsxTagName(node) === candidate.name) mount = node;
		});
		if (!mount) continue;
		result.mountedBindingName ??= candidate.name;

		for (const ancestor of jsxAncestors(mount)) {
			const rootBinding = jsxTagName(ancestor).split(".")[0];
			const imported = hostImports.get(rootBinding);
			if (!imported) continue;
			const ancestorFile = resolveRelativeModule(hostFile, imported.from);
			if (!ancestorFile) continue;
			const ancestorAst = parseTypeScriptFile(ancestorFile);
			for (const traits of classErrorBoundaryTraits(ancestorAst)) {
				if (traits.derivesStateFromError && traits.catchesRenderError) {
					result.boundary ??= {
						file: ancestorFile,
						ast: ancestorAst,
						classNode: traits.node,
						className: traits.name,
					};
				} else if (traits.derivesStateFromError || traits.catchesRenderError) {
					result.halfBuilt ??= `${ancestorFile}:${traits.name}`;
				}
			}
		}

		if (result.boundary) break;
	}

	return result;
}
