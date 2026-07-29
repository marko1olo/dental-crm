import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import * as drizzleSchema from "../db/schema.js";

/**
 * Расхождение между pgEnum в базе и z.enum в контракте — тихая потеря данных.
 *
 * ЧТО СЛУЧИЛОСЬ. В "communication_channel" восемь значений, включая vk и max;
 * в communicationChannelSchema их было шесть. routes/vk.ts и routes/max.ts
 * пишут задачи и события с этими каналами, база принимает их без возражений,
 * а db/domainStateHydration.ts прогоняет строки через safeParse и молча
 * отбрасывает непрошедшие (функция collect: `else skipped += 1`). Переписка во
 * «ВКонтакте» и MAX исчезала из рабочего кабинета, оставляя после себя одну
 * строку в отчёте о гидратации, которую никто не читает.
 *
 * НАПРАВЛЕНИЕ ПРОВЕРКИ. Каждое значение из базы обязано быть и в контракте.
 * Обратное допустимо: контракт может знать о значении, которого ещё нет в
 * pgEnum, — такие строки просто не появятся, а вот потерять существующие
 * нельзя.
 *
 * ПОЧЕМУ СПИСОК ПАР БОЛЬШЕ НЕ ПИШЕТСЯ РУКАМИ. Здесь стоял поимённый массив из
 * 12 пар. В схеме объявлено 46 pgEnum, и у 37 из них есть одноимённый `*Schema`
 * в контракте — то есть сверять можно было 37, а сверялось 12. Порок ровно тот,
 * который apps/web/src/tests/panelsAreMounted.test.ts уже отверг словами
 * «поимённый список структурно не способен заметить файл, которого в списке
 * нет»: новое перечисление появляется вместе со своим контрактом, в список его
 * никто не дописывает, и расхождение в нём никогда не будет замечено. Проверка
 * при этом остаётся зелёной и выглядит работающей.
 *
 * Поэтому пары строятся переписью: перебираются объявления pgEnum в модулях
 * apps/api/src/db, и для каждого ищется `<имя экспорта>Schema` в контракте. У
 * кого пары нет — либо запись в NO_CONTRACT_PAIR С ПРИЧИНОЙ, либо красный.
 * Молча выпасть из переписи перечисление больше не может.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ КОНТРАКТ ЧИТАЕТСЯ ИЗ ИСХОДНИКА, А НЕ ИЗ СОБРАННОГО dist.
 *
 * Здесь стояло `import * as contract from "@dental/shared"`, а packages/shared
 * отдаёт наружу СОБРАННЫЙ артефакт (package.json: exports → dist/index.js).
 * Значит сторож судил о контракте по dist, и это давало ему сразу две ложные
 * стороны — обе измерены на этом дереве, а не предположены:
 *
 *   1. КРАСНЫЙ ПРИ ЦЕЛОМ ИСХОДНИКЕ. egiszStatusSchema объявлен в
 *      packages/shared/src/index.ts, но пока `npm run build -w @dental/shared`
 *      не прогнали, в dist его нет — и поимённая проверка статуса ЕГИСЗ падала
 *      при полностью исправном контракте. Дефекта нет, а набор красный: сторожу,
 *      который врёт в одну сторону, перестают верить и в остальном, и первым же
 *      движением его выключают вместе с настоящим сигналом.
 *
 *   2. ЗЕЛЁНЫЙ ПРИ СЛОМАННОМ ИСХОДНИКЕ, и это опаснее. Пока dist не пересобран,
 *      ЛЮБОЕ расхождение, внесённое в src, сторож не видит вовсе: он сверяет
 *      базу с прошлой сборкой. Убрать значение из z.enum и не пересобирать —
 *      готовый способ пройти сверку, не заметив её.
 *
 * Разбор исходника через `ts.createSourceFile` снимает оба: сторож смотрит
 * ровно на тот текст, который правит инженер. Образец приёма в этом же дереве —
 * apps/api/src/tests/noFabricatedDataFallback.test.ts, там разбор дерева заменил
 * текстовые шаблоны по тем же причинам.
 *
 * РАЗБОР, А НЕ ПОИСК ПОДСТРОКИ — и это отдельное решение. Значения можно было
 * бы искать регуляркой по тексту src/index.ts. Нельзя: в этом дереве класс
 * дефекта «сторож краснеет на ОБЪЯСНЕНИИ» встретился четырежды за сутки —
 * проверка ищет образец в сыром тексте и находит его в комментарии, который этот
 * образец объясняет. Ниже, в докстринге поимённой проверки ЕГИСЗ, дословно
 * написано `z.enum(["Pending","Sent","Error","Accepted","sent"])` как пример
 * ЗАПРЕЩЁННОГО набора. Текстовый поиск нашёл бы «sent» в контракте и остался
 * зелёным на настоящем расхождении. Разбор дерева комментарии не видит по
 * построению, и это проверено фикстурой, а не обещано.
 *
 * ЧЕГО РАЗБОР ИСХОДНИКА НЕ УМЕЕТ, честно. Он не знает, что за контракт РАБОТАЕТ
 * в запущенном сервере: apps/api импортирует dist. Это отдельная болезнь с
 * отдельным действием оператора («пересоберите пакет», а не «поправьте набор»),
 * поэтому она вынесена в отдельную проверку с отдельным названием — последнюю в
 * этом файле. Смешивать их в одну нельзя: именно смешение и давало красный при
 * целом исходнике.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../../../..");
const databaseModulesDir = path.resolve(here, "../db");
const contractSourceDir = path.join(repositoryRoot, "packages", "shared", "src");
const contractDistDir = path.join(repositoryRoot, "packages", "shared", "dist");

/* ------------------------------------------------------------------ *
 * Разбор: набор строковых значений из объявления, в любой его записи.
 * ------------------------------------------------------------------ */

/** Разрешённое перечисление: значения плюс место объявления — для человека в сообщении. */
type ResolvedEnum = {
	readonly values: readonly string[];
	/** Модуль относительно корня переписи: "index.ts", "migration.ts". */
	readonly module: string;
	readonly line: number;
};

/**
 * Безымянный набор: `z.enum([...])` внутри объекта, без своего экспорта. Перепись
 * пар его не видит и видеть не должна — сверять не с чем, — но четыре причины в
 * NO_CONTRACT_PAIR ссылаются именно на такие литералы, и эти ссылки проверяются.
 */
type InlineEnum = {
	readonly module: string;
	readonly line: number;
	/** Имя свойства, к которому привязан литерал: `status`, `direction`. Для поиска глазами. */
	readonly property: string;
	readonly values: readonly string[];
};

type EnumCensus = {
	readonly named: ReadonlyMap<string, ResolvedEnum>;
	readonly inline: readonly InlineEnum[];
	/** Модули, до которых перепись дошла по графу реэкспортов. Нужно самопроверке. */
	readonly visited: readonly string[];
};

type ModuleRecord = {
	readonly module: string;
	readonly parsed: ts.SourceFile;
	readonly declarations: ReadonlyMap<string, ts.Expression>;
	readonly imports: ReadonlyMap<string, { readonly module: string; readonly name: string }>;
	readonly starExports: readonly string[];
	readonly namedReExports: readonly { exported: string; local: string; module: string }[];
	readonly localExports: readonly { exported: string; local: string }[];
	readonly exportedDeclarations: readonly { name: string; initializer: ts.Expression }[];
	/** Развёрнутые инициализаторы экспортов — чтобы не считать их безымянными. */
	readonly exportedInitializers: ReadonlySet<ts.Node>;
};

type ModuleGraph = {
	load: (module: string) => ModuleRecord;
};

/**
 * Снимает обёртки, не меняющие набор значений: `.optional()`, `.default(...)`,
 * `.describe(...)`, скобки, `as const`, `satisfies`.
 *
 * Условие «получатель не `z`» здесь обязательно и стоило одной отладки: без него
 * `z.enum([...])` сам считается обёрткой, разворачивается до идентификатора `z`, и
 * перепись находит НОЛЬ перечислений из 162, оставаясь зелёной. Тот же класс, что
 * поймала самопроверка «перепись не выродилась» у распознавания pgEnum.
 */
function unwrapModifiers(expression: ts.Expression): ts.Expression {
	let current: ts.Expression = expression;
	for (;;) {
		if (
			ts.isCallExpression(current) &&
			ts.isPropertyAccessExpression(current.expression) &&
			!(ts.isIdentifier(current.expression.expression) && current.expression.expression.text === "z")
		) {
			current = current.expression.expression;
			continue;
		}
		if (ts.isParenthesizedExpression(current)) {
			current = current.expression;
			continue;
		}
		if (ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
			current = current.expression;
			continue;
		}
		return current;
	}
}

/** Имя фабрики zod: `z.enum(...)` → "enum". Не zod — null. */
function zodFactory(expression: ts.Expression): string | null {
	if (!ts.isCallExpression(expression)) return null;
	const callee = expression.expression;
	if (!ts.isPropertyAccessExpression(callee)) return null;
	if (!ts.isIdentifier(callee.expression) || callee.expression.text !== "z") return null;
	return callee.name.text;
}

function parseModule(module: string, source: string, moduleExtension: string, scriptKind: ts.ScriptKind): ModuleRecord {
	const parsed = ts.createSourceFile(module, source, ts.ScriptTarget.Latest, /* setParentNodes */ true, scriptKind);
	const declarations = new Map<string, ts.Expression>();
	const imports = new Map<string, { module: string; name: string }>();
	const starExports: string[] = [];
	const namedReExports: { exported: string; local: string; module: string }[] = [];
	const localExports: { exported: string; local: string }[] = [];
	const exportedDeclarations: { name: string; initializer: ts.Expression }[] = [];
	const exportedInitializers = new Set<ts.Node>();

	// Специфик модуля в исходнике на TypeScript указывает на ".js" (правило ESM),
	// а файл рядом лежит с ".ts". В собранном dist оба совпадают.
	const resolveSpecifier = (specifier: string): string | null => {
		if (!specifier.startsWith(".")) return null;
		const target = specifier.replace(/\.js$/, moduleExtension);
		return path.normalize(path.join(path.dirname(module), target)).split(path.sep).join("/");
	};

	for (const statement of parsed.statements) {
		if (ts.isVariableStatement(statement)) {
			const exported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
			for (const declaration of statement.declarationList.declarations) {
				if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) continue;
				declarations.set(declaration.name.text, declaration.initializer);
				if (exported === true) {
					exportedDeclarations.push({ name: declaration.name.text, initializer: declaration.initializer });
					exportedInitializers.add(unwrapModifiers(declaration.initializer));
				}
			}
			continue;
		}
		if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
			const target = resolveSpecifier(statement.moduleSpecifier.text);
			const bindings = statement.importClause?.namedBindings;
			if (target !== null && bindings !== undefined && ts.isNamedImports(bindings)) {
				for (const element of bindings.elements) {
					imports.set(element.name.text, { module: target, name: (element.propertyName ?? element.name).text });
				}
			}
			continue;
		}
		if (ts.isExportDeclaration(statement)) {
			const target =
				statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
					? resolveSpecifier(statement.moduleSpecifier.text)
					: null;
			if (statement.exportClause === undefined) {
				if (target !== null) starExports.push(target);
				continue;
			}
			if (!ts.isNamedExports(statement.exportClause)) continue;
			for (const element of statement.exportClause.elements) {
				const local = (element.propertyName ?? element.name).text;
				if (target !== null) namedReExports.push({ exported: element.name.text, local, module: target });
				else localExports.push({ exported: element.name.text, local });
			}
		}
	}

	return {
		module,
		parsed,
		declarations,
		imports,
		starExports,
		namedReExports,
		localExports,
		exportedDeclarations,
		exportedInitializers,
	};
}

function createModuleGraph(options: {
	read: (module: string) => string;
	moduleExtension: string;
	scriptKind: ts.ScriptKind;
}): ModuleGraph {
	const cache = new Map<string, ModuleRecord>();
	return {
		load: (module: string): ModuleRecord => {
			const cached = cache.get(module);
			if (cached !== undefined) return cached;
			const record = parseModule(module, options.read(module), options.moduleExtension, options.scriptKind);
			cache.set(module, record);
			return record;
		},
	};
}

/**
 * Значения выражения, если это набор строк. Понимает все записи, которыми
 * перечисление объявляют в этом дереве и рядом с ним:
 *
 *   z.enum(["a", "b"])                         — основная;
 *   z.enum(CONSTANT)                           — значения вынесены в массив;
 *   z.enum([...CONSTANT, "c"])                 — массив подмешан спредом;
 *   z.union([otherSchema, z.literal("none")])  — объединение вместо перечисления;
 *   z.literal("only")                          — единственное значение;
 *   z.nativeEnum({ A: "a" })                   — объект вместо массива;
 *   otherSchema                                — псевдоним, в том числе из другого модуля.
 *
 * ЗАЧЕМ ТАК ШИРОКО, а не только `z.enum`. Прежний сторож брал контракт из рантайма
 * и опознавал его по наличию массива строк в `options`. У ZodUnion `options` — это
 * СХЕМЫ, а не строки; у ZodLiteral его нет вовсе. То есть переписать
 * `z.enum([...])` в `z.union([z.literal(...), ...])` — и пара молча исчезала из
 * сверки, а расхождение внутри неё уже никто не проверял. Измерено на этом дереве:
 * рантайм видел 160 перечислений, разбор исходника видит 162, и обе разницы — как
 * раз union и literal (speechGatewayProviderSchema, dicomWorkbenchPixelPolicySchema).
 */
function resolveEnumValues(
	graph: ModuleGraph,
	module: ModuleRecord,
	expression: ts.Expression,
	seen: Set<string>,
): readonly string[] | null {
	const node = unwrapModifiers(expression);

	if (ts.isIdentifier(node)) return resolveIdentifier(graph, module, node.text, seen);

	if (ts.isArrayLiteralExpression(node)) {
		const values: string[] = [];
		for (const element of node.elements) {
			if (ts.isStringLiteralLike(element)) {
				values.push(element.text);
				continue;
			}
			if (ts.isSpreadElement(element)) {
				const spread = resolveEnumValues(graph, module, element.expression, new Set(seen));
				if (spread === null) return null;
				values.push(...spread);
				continue;
			}
			return null;
		}
		return values.length > 0 ? values : null;
	}

	const factory = zodFactory(node);
	if (factory === "enum") {
		const argument = (node as ts.CallExpression).arguments[0];
		return argument === undefined ? null : resolveEnumValues(graph, module, argument, seen);
	}
	if (factory === "literal") {
		const argument = (node as ts.CallExpression).arguments[0];
		return argument !== undefined && ts.isStringLiteralLike(argument) ? [argument.text] : null;
	}
	if (factory === "union") {
		const argument = (node as ts.CallExpression).arguments[0];
		const members = argument === undefined ? undefined : unwrapModifiers(argument);
		if (members === undefined || !ts.isArrayLiteralExpression(members)) return null;
		const values: string[] = [];
		for (const member of members.elements) {
			const resolved = resolveEnumValues(graph, module, member, new Set(seen));
			if (resolved === null) return null;
			values.push(...resolved);
		}
		return values.length > 0 ? values : null;
	}
	if (factory === "nativeEnum") {
		const argument = (node as ts.CallExpression).arguments[0];
		const members = argument === undefined ? undefined : unwrapModifiers(argument);
		if (members === undefined || !ts.isObjectLiteralExpression(members)) return null;
		const values: string[] = [];
		for (const property of members.properties) {
			if (!ts.isPropertyAssignment(property) || !ts.isStringLiteralLike(property.initializer)) return null;
			values.push(property.initializer.text);
		}
		return values.length > 0 ? values : null;
	}
	return null;
}

/** Идентификатор: сначала объявление в этом модуле, затем импорт из соседнего. */
function resolveIdentifier(
	graph: ModuleGraph,
	module: ModuleRecord,
	name: string,
	seen: Set<string>,
): readonly string[] | null {
	const key = `${module.module}#${name}`;
	if (seen.has(key)) return null;
	seen.add(key);
	const local = module.declarations.get(name);
	if (local !== undefined) return resolveEnumValues(graph, module, local, seen);
	const imported = module.imports.get(name);
	if (imported === undefined) return null;
	return resolveIdentifier(graph, graph.load(imported.module), imported.name, seen);
}

/**
 * Перепись перечислений от точки входа по графу реэкспортов.
 *
 * ПОЧЕМУ ИМЕННО ГРАФ, а не «все файлы каталога». apps/api импортирует пакет
 * целиком (`@dental/shared`), то есть видит РОВНО то, что дошло до index.ts.
 * Экспорт из файла, который index.ts не реэкспортирует, до сервера не доходит и
 * парой считаться не должен — иначе перепись отчитается о сверке, которой в
 * рантайме нет. Обратная сторона тоже измерена: `export * from "./migration.js"`
 * приносит 8 перечислений и 7 живых пар, и обход только index.ts потерял бы их
 * молча. Поэтому обход идёт по реэкспортам, а самопроверка ниже требует, чтобы в
 * переписи были экспорты не из точки входа.
 */
function enumCensus(graph: ModuleGraph, entry: string): EnumCensus {
	const named = new Map<string, ResolvedEnum>();
	const inline: InlineEnum[] = [];
	const visited: string[] = [];

	const walk = (module: string): void => {
		if (visited.includes(module)) return;
		visited.push(module);
		const record = graph.load(module);

		const record$ = (name: string, initializer: ts.Expression, values: readonly string[] | null): void => {
			if (values === null || named.has(name)) return;
			named.set(name, {
				values,
				module,
				line: record.parsed.getLineAndCharacterOfPosition(initializer.getStart(record.parsed)).line + 1,
			});
		};

		for (const declaration of record.exportedDeclarations) {
			record$(declaration.name, declaration.initializer, resolveEnumValues(graph, record, declaration.initializer, new Set()));
		}
		for (const entryPoint of record.localExports) {
			const initializer = record.declarations.get(entryPoint.local);
			if (initializer === undefined) continue;
			record$(entryPoint.exported, initializer, resolveEnumValues(graph, record, initializer, new Set()));
		}
		for (const reExport of record.namedReExports) {
			const target = graph.load(reExport.module);
			const initializer = target.declarations.get(reExport.local);
			if (initializer === undefined) continue;
			record$(reExport.exported, initializer, resolveIdentifier(graph, target, reExport.local, new Set()));
		}

		const collectInline = (node: ts.Node): void => {
			if (ts.isCallExpression(node) && zodFactory(node) === "enum" && !record.exportedInitializers.has(node)) {
				const argument = node.arguments[0];
				const values = argument === undefined ? null : resolveEnumValues(graph, record, argument, new Set());
				if (values !== null) {
					const parent = node.parent;
					inline.push({
						module,
						line: record.parsed.getLineAndCharacterOfPosition(node.getStart(record.parsed)).line + 1,
						property: ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name) ? parent.name.text : "",
						values,
					});
				}
			}
			ts.forEachChild(node, collectInline);
		};
		ts.forEachChild(record.parsed, collectInline);

		for (const target of record.starExports) walk(target);
	};

	walk(entry);
	return { named, inline, visited };
}

/**
 * Перепись считается один раз: index.ts — это 8400 строк, и повторный разбор в
 * каждой из тринадцати проверок стоил 8 секунд из 9. Медленный сторож выключают
 * так же охотно, как врущий.
 */
let contractSourceCache: EnumCensus | null = null;

function contractSourceCensus(): EnumCensus {
	if (contractSourceCache !== null) return contractSourceCache;
	const graph = createModuleGraph({
		read: (module) => readFileSync(path.join(contractSourceDir, ...module.split("/")), "utf8"),
		moduleExtension: ".ts",
		scriptKind: ts.ScriptKind.TS,
	});
	contractSourceCache = enumCensus(graph, "index.ts");
	return contractSourceCache;
}

/** Та же перепись по собранному артефакту. Нужна ровно одной, последней проверке. */
function contractDistCensus(): EnumCensus | null {
	if (!existsSync(path.join(contractDistDir, "index.js"))) return null;
	const graph = createModuleGraph({
		read: (module) => readFileSync(path.join(contractDistDir, ...module.split("/")), "utf8"),
		moduleExtension: ".js",
		scriptKind: ts.ScriptKind.JS,
	});
	return enumCensus(graph, "index.js");
}

/* ------------------------------------------------------------------ *
 * Перепись перечислений базы.
 * ------------------------------------------------------------------ */

/** Перечисление базы: имя типа в PostgreSQL, имя экспорта, модуль и значения. */
type DatabaseEnum = {
	readonly exportName: string;
	readonly databaseName: string;
	readonly values: readonly string[];
	/** Модуль относительно apps/api/src/db. */
	readonly module: string;
	readonly line: number;
};

function databaseModuleFiles(): string[] {
	const found: string[] = [];
	const walk = (dir: string, prefix: string): void => {
		const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
		for (const entry of entries) {
			const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				walk(path.join(dir, entry.name), relative);
				continue;
			}
			if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) continue;
			found.push(relative);
		}
	};
	walk(databaseModulesDir, "");
	return found;
}

/**
 * Все pgEnum ВО ВСЕХ модулях db, разбором исходника.
 *
 * ПОЧЕМУ НЕ `Object.entries(schema)`, как было. Перепись перебирала экспорты
 * одного модуля — db/schema.js — и объявляла их всем множеством перечислений.
 * Измерено: pgEnum "communication_campaign_status" объявлен в
 * db/communicationsSchema.ts, оттуда же его берут routes/communicationsOutbox.ts
 * и services/communications/campaigns.ts, а schema.ts его не реэкспортирует —
 * значит перепись не видела его ВОВСЕ. Не «видела без пары», а не видела: ни в
 * сверке значений, ни в списке причин, ни в счётчике вырождения. Достаточно было
 * объявить перечисление в модуле по соседству, чтобы сторож про него не узнал, —
 * тот же порок «читаем один артефакт и называем его целым миром», из-за которого
 * контракт брался из dist.
 *
 * Рантаймовый импорт schema.js при этом не выброшен: он проверяет, что модуль
 * грузится и что разбор исходника совпал с тем, что реально построил drizzle
 * (отдельная проверка ниже). Две независимые меры, а не одна с честным словом.
 */
let databaseEnumsCache: DatabaseEnum[] | null = null;

function databaseEnums(): DatabaseEnum[] {
	if (databaseEnumsCache !== null) return databaseEnumsCache;
	// Загрузчик читает НАСТОЯЩИЕ файлы каталога, а не один текущий: pgEnum, чьи
	// значения вынесены в соседний модуль (`pgEnum("x", VALUES_FROM_OTHER_FILE)`),
	// иначе разрешался бы не в том файле и молча приезжал бы с пустым набором.
	const graph = createModuleGraph({
		read: (module) => readFileSync(path.join(databaseModulesDir, ...module.split("/")), "utf8"),
		moduleExtension: ".ts",
		scriptKind: ts.ScriptKind.TS,
	});
	const found: DatabaseEnum[] = [];
	const seen = new Set<string>();

	for (const file of databaseModuleFiles()) {
		if (!readFileSync(path.join(databaseModulesDir, ...file.split("/")), "utf8").includes("pgEnum")) continue;
		const record = graph.load(file);

		const collect = (exportName: string, initializer: ts.Expression, owner: ModuleRecord): void => {
			const call = unwrapModifiers(initializer);
			if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression) || call.expression.text !== "pgEnum") {
				return;
			}
			if (seen.has(exportName)) return;
			seen.add(exportName);
			const nameArgument = call.arguments[0];
			const valuesArgument = call.arguments[1];
			const values = valuesArgument === undefined ? null : resolveEnumValues(graph, owner, valuesArgument, new Set());
			found.push({
				exportName,
				databaseName: nameArgument !== undefined && ts.isStringLiteralLike(nameArgument) ? nameArgument.text : "",
				values: values ?? [],
				module: owner.module,
				line: owner.parsed.getLineAndCharacterOfPosition(call.getStart(owner.parsed)).line + 1,
			});
		};

		for (const declaration of record.exportedDeclarations) {
			collect(declaration.name, declaration.initializer, record);
		}
		// `const x = pgEnum(...); export { x };` и `export { x } from "./y.js"` —
		// те же экспорты, записанные иначе. Без них перепись снова зависела бы от
		// того, как написан экспорт, а не от того, что объявлено.
		for (const entry of record.localExports) {
			const initializer = record.declarations.get(entry.local);
			if (initializer !== undefined) collect(entry.exported, initializer, record);
		}
		for (const entry of record.namedReExports) {
			const target = graph.load(entry.module);
			const initializer = target.declarations.get(entry.local);
			if (initializer !== undefined) collect(entry.exported, initializer, target);
		}
	}

	databaseEnumsCache = found.sort((left, right) => left.exportName.localeCompare(right.exportName));
	return databaseEnumsCache;
}

/** pgEnum так, как их видит drizzle в рантайме. Только для сверки с разбором исходника. */
function runtimeDatabaseEnums(): Map<string, readonly string[]> {
	const found = new Map<string, readonly string[]>();
	for (const [exportName, value] of Object.entries(drizzleSchema)) {
		if ((typeof value !== "object" && typeof value !== "function") || value === null) continue;
		const candidate = value as { enumName?: unknown; enumValues?: unknown };
		if (typeof candidate.enumName !== "string") continue;
		if (!Array.isArray(candidate.enumValues) || !candidate.enumValues.every((item) => typeof item === "string")) {
			continue;
		}
		found.set(exportName, candidate.enumValues as readonly string[]);
	}
	return found;
}

function contractEnumFor(census: EnumCensus, exportName: string): ResolvedEnum | null {
	return census.named.get(`${exportName}Schema`) ?? null;
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
	return [...left].sort().join(" ") === [...right].sort().join(" ");
}

/* ------------------------------------------------------------------ *
 * Перечисления базы без одноимённого контракта.
 * ------------------------------------------------------------------ */

/**
 * Каждая строка обязана называть причину: контракт зовётся иначе, контракта нет
 * вовсе, или сверять нечего по существу. Причина короче 80 символов сама валит
 * прогон — отписка вместо причины уже приводила в этом проекте к спискам, которым
 * никто не верит.
 *
 * users.role в перепись не попадает вовсе и записи здесь не требует: она объявлена
 * как text, а не pgEnum, — сверять нечего, роль ничем не ограничена на уровне базы.
 *
 * ПОЛЕ contractIsAnonymous — НЕ пометка, а проверяемое утверждение. Четыре причины
 * ниже говорят «контракт ЕСТЬ, но объявлен безымянным литералом, и набор совпадает
 * со схемой один в один». Прежде это была проза с номерами строк, и вся проза
 * устарела молча: сверено сегодня — из пяти названных номеров (2094, 2504, 4231,
 * 4299, 4347) не совпал НИ ОДИН, файл вырос, литералы сдвинулись на 17 строк.
 * Причина с неверными координатами — не документация, а трата времени следующего
 * инженера. Поэтому номера убраны, а само утверждение о совпадении набора теперь
 * проверяется разбором: отдельный тест требует, чтобы в контракте нашёлся
 * безымянный `z.enum` РОВНО с этим набором значений. Уберут значение из литерала —
 * покраснеет, хотя именованной пары так и не появилось.
 */
const NO_CONTRACT_PAIR: readonly {
	readonly exportName: string;
	readonly contractIsAnonymous?: true;
	readonly reason: string;
}[] = [
	{
		exportName: "communicationDirection",
		contractIsAnonymous: true,
		reason:
			"Контракт ЕСТЬ, но объявлен безымянным литералом внутри объекта: `direction: z.enum([\"inbound\", " +
			"\"outbound\"])` в packages/shared/src/index.ts. Набор совпадает со схемой один в один (проверяется " +
			"тестом о безымянных контрактах), но перепись видит только именованные экспорты. Починка — вынести " +
			"в communicationDirectionSchema.",
	},
	{
		exportName: "denteTelegramWebhookStatus",
		contractIsAnonymous: true,
		reason:
			"Контракт ЕСТЬ, но безымянный: `status: z.enum([\"processing\", \"processed\", \"duplicate\", " +
			"\"ignored\", \"rejected\"])` в packages/shared/src/index.ts — набор совпадает со схемой полностью. " +
			"Пара не строится только из-за отсутствия именованного экспорта.",
	},
	{
		exportName: "documentStatus",
		contractIsAnonymous: true,
		reason:
			"Контракт ЕСТЬ, но безымянный И продублирован: ДВА литерала `status: z.enum([\"draft\", \"issued\", " +
			"\"voided\"])` в packages/shared/src/index.ts, оба совпадают со схемой. Две копии одного перечисления " +
			"разъедутся молча — тем более нужен один именованный экспорт.",
	},
	{
		exportName: "imagingStudyStatus",
		contractIsAnonymous: true,
		reason:
			"Контракт ЕСТЬ, но безымянный: `status: z.enum([\"available\", \"needs_review\", \"failed\"])` в " +
			"packages/shared/src/index.ts — набор совпадает со схемой. Пара не строится только из-за отсутствия " +
			"именованного экспорта.",
	},
	{
		exportName: "communicationCampaignStatus",
		reason:
			"Контракта НЕТ вовсе: ни campaignStatus, ни communicationCampaignStatus в packages/shared/src не " +
			"встречается, безымянного литерала с набором draft/scheduled/running/completed/cancelled там тоже " +
			"нет. Перечисление живое: им типизирована колонка status в db/communicationsSchema.ts, значения " +
			"ставят services/communications/campaigns.ts и routes/communicationsOutbox.ts. До этой правки " +
			"перепись не видела его ВОВСЕ — оно объявлено не в schema.ts. Долг ведущему: packages/shared вне " +
			"зоны участка.",
	},
	{
		exportName: "communicationConsentScope",
		reason:
			"Контракта НЕТ вовсе: значений service/marketing в packages/shared/src не встречается. Перечисление " +
			"живое — им типизирована колонка scope в db/communicationsSchema.ts со значением по умолчанию " +
			"marketing, а согласие на рекламу по сетям электросвязи требуется по ФЗ «О рекламе» ст. 18 ч. 1. " +
			"Значение попадает в базу без проверки контрактом. Долг ведущему: packages/shared вне зоны участка.",
	},
	{
		exportName: "communicationConsentState",
		reason:
			"Контракта НЕТ вовсе: поиск по \"granted\" в packages/shared/src даёт ноль совпадений. Отзыв " +
			"согласия — юридически значимое действие, и его состояние попадает в базу без проверки на входе. " +
			"Долг ведущему: packages/shared вне зоны участка сторожей.",
	},
	{
		exportName: "communicationOutboxStatus",
		reason:
			"Контракта НЕТ вовсе: поиск по \"suppressed\" в packages/shared/src даёт ноль совпадений. Ближайший " +
			"по имени communicationStatusSchema — ДРУГОЙ набор (queued/scheduled/needs_call/sent/delivered/" +
			"completed/failed/skipped) и другая таблица, он уже спарен с pgEnum communication_status; " +
			"подставлять его сюда нельзя. Долг ведущему.",
	},
	{
		exportName: "treatmentPlanStatus",
		reason:
			"Контракта НЕТ вовсе: ни treatmentPlanStatusSchema, ни набора Draft/Active/Approved/Completed/" +
			"Rejected в packages/shared/src не встречается — ближайший по имени treatmentPlanItemStatusSchema " +
			"это ДРУГАЯ таблица и другой набор (proposed/approved/in_progress/completed/cancelled), он уже " +
			"спарен с pgEnum treatment_plan_item_status. Перечисление живое: тип treatment_plan_status создан " +
			"миграцией 0000 и типизирует колонку status в treatment_plans. До 2026-07-29 колонка была объявлена " +
			"как text с умолчанием «draft» — значения, которого в наборе НЕТ, — поэтому регистр никто не " +
			"сверял: воронка планов в scripts/cronAnalyticsWorker.ts ищет строчные ключи и считает нули. " +
			"Долг ведущему: packages/shared вне зоны участка.",
	},
	{
		exportName: "ledgerPaymentMethod",
		reason:
			"Контракта НЕТ вовсе: поиск по \"installment_balance\" в packages/shared/src даёт ноль совпадений. " +
			"paymentMethodSchema — ДРУГОЙ набор из семи значений, уже спаренный с pgEnum payment_method: в нём " +
			"нет dms и installment_balance, зато есть лишние bank_transfer, online, insurance, other. Способ " +
			"оплаты в кассовой книге — это деньги, и проверять его чужим набором нельзя. Долг ведущему.",
	},
];

/* ------------------------------------------------------------------ *
 * Самопроверка разбора на фикстурах.
 * ------------------------------------------------------------------ */

function fixtureCensus(files: Record<string, string>, entry = "index.ts"): EnumCensus {
	const graph = createModuleGraph({
		read: (module) => {
			const source = files[module];
			if (source === undefined) throw new Error(`фикстура не содержит модуль ${module}`);
			return source;
		},
		moduleExtension: ".ts",
		scriptKind: ts.ScriptKind.TS,
	});
	return enumCensus(graph, entry);
}

/**
 * САМОПРОВЕРКА, в обе стороны. Без неё «расхождений не найдено» означает что
 * угодно, включая разбор, который не нашёл ни одного перечисления: ровно это и
 * случилось при первой редакции распознавания pgEnum — ноль из сорока с лишним,
 * и результат был зелёный.
 */
test("разбор контракта видит перечисление в любой записи", () => {
	const census = fixtureCensus({
		"index.ts": [
			"const PAYMENT_METHODS = [\"cash\", \"card\"] as const;",
			"export const patientStatusSchema = z.enum([\"active\", \"archived\"]);",
			"export const paymentMethodSchema = z.enum(PAYMENT_METHODS);",
			"export const spreadSchema = z.enum([...PAYMENT_METHODS, \"dms\"]);",
			"export const visitStatusSchema = z.union([z.literal(\"planned\"), z.literal(\"done\")]);",
			"export const singleSchema = z.literal(\"only\");",
			"export const nativeSchema = z.nativeEnum({ Draft: \"draft\", Issued: \"issued\" });",
			"export const chainedSchema = z.enum([\"a\", \"b\"]).default(\"a\").describe(\"…\");",
			"export const aliasSchema = patientStatusSchema;",
			"const localStatus = z.enum([\"x\", \"y\"]);",
			"export { localStatus as localStatusSchema };",
			"export { migrationRunStatusSchema as renamedSchema } from \"./migration.js\";",
			"export * from \"./migration.js\";",
		].join("\n"),
		"migration.ts": 'export const migrationRunStatusSchema = z.enum(["queued", "running"]);',
	});

	assert.deepEqual(
		Object.fromEntries([...census.named].map(([name, found]) => [name, [...found.values]])),
		{
			patientStatusSchema: ["active", "archived"],
			paymentMethodSchema: ["cash", "card"],
			spreadSchema: ["cash", "card", "dms"],
			visitStatusSchema: ["planned", "done"],
			singleSchema: ["only"],
			nativeSchema: ["draft", "issued"],
			chainedSchema: ["a", "b"],
			aliasSchema: ["active", "archived"],
			localStatusSchema: ["x", "y"],
			renamedSchema: ["queued", "running"],
			migrationRunStatusSchema: ["queued", "running"],
		},
		"Разбор не узнал одну из записей перечисления. Каждая из них — способ объявить тот же набор, и " +
			"пропущенная запись означает потерянную пару: значения этого перечисления перестают сверяться с " +
			"базой, а сверка остаётся зелёной. Рантаймовый предшественник этого разбора терял union и literal " +
			"именно так.",
	);

	assert.deepEqual(
		[...census.visited],
		["index.ts", "migration.ts"],
		"Обход не пошёл по `export * from`. В живом дереве это 8 перечислений и 7 пар из migration.ts: " +
			"потеря пройдёт молча, потому что перепись просто станет меньше.",
	);
});

test("разбор контракта не видит перечисление в комментарии и не создаёт его из объяснения", () => {
	const census = fixtureCensus({
		"index.ts": [
			"/**",
			" * ЗАПРЕЩЁННЫЙ набор — пример из докстринга ниже в этом же файле:",
			" * z.enum([\"Pending\", \"Sent\", \"Error\", \"Accepted\", \"sent\"]) — «sent» база отклонит.",
			" */",
			"// export const ghostSchema = z.enum([\"ghost\"]);",
			"/** БЫЛО: z.enum([\"vk\"]) — убрали, значение переехало в communicationChannelSchema. */",
			"export const egiszStatusSchema = z.enum([\"Pending\", \"Sent\", \"Error\", \"Accepted\"]);",
		].join("\n"),
	});

	assert.deepEqual(
		[...census.named.keys()],
		["egiszStatusSchema"],
		"Разбор создал перечисление из комментария. Тогда сторож зелёный на расхождении, которое объяснено " +
			"в докстринге, — то есть объяснение работает как обход проверки.",
	);
	assert.deepEqual(
		[...(census.named.get("egiszStatusSchema")?.values ?? [])],
		["Pending", "Sent", "Error", "Accepted"],
		"Значение «sent», упомянутое в комментарии как ЗАПРЕЩЁННОЕ, попало в набор. Текстовый поиск сделал " +
			"бы ровно это и остался бы зелёным на настоящем расхождении.",
	);
	assert.deepEqual(
		census.inline,
		[],
		"Пример `z.enum([...])` из комментария посчитан безымянным контрактом. На этом держится проверка " +
			"четырёх причин из NO_CONTRACT_PAIR: она обязана видеть код, а не прозу о коде.",
	);
});

test("разбор контракта отличает безымянный литерал от именованного экспорта", () => {
	const census = fixtureCensus({
		"index.ts": [
			"export const documentSchema = z.object({",
			"	status: z.enum([\"draft\", \"issued\", \"voided\"]),",
			"});",
			"export const patientStatusSchema = z.enum([\"active\", \"archived\"]);",
		].join("\n"),
	});

	assert.deepEqual(
		[...census.named.keys()],
		["patientStatusSchema"],
		"Набор внутри объекта стал именованной парой. Тогда причина «контракт есть, но безымянный» была бы " +
			"объявлена для перечисления, у которого пара УЖЕ есть, и список причин перестал бы быть правдой.",
	);
	assert.deepEqual(
		census.inline.map((found) => [found.property, [...found.values]]),
		[["status", ["draft", "issued", "voided"]]],
		"Безымянный литерал не найден вовсе. Тогда утверждение «набор совпадает со схемой один в один» из " +
			"четырёх причин никем не проверяется и снова становится прозой, устаревающей молча.",
	);
	assert.equal(
		census.named.get("patientStatusSchema")?.line,
		4,
		"Разбор не назвал строку объявления. Сообщение об ошибке без места — это сторож, после которого " +
			"инженер ищет виновника руками.",
	);
});

/* ------------------------------------------------------------------ *
 * Самопроверки от вырождения и сверка.
 * ------------------------------------------------------------------ */

/*
 * ПОЧЕМУ ПОРОГИ СТОЯТ РОВНО ПО ИЗМЕРЕННОМУ ЧИСЛУ, А НЕ «С ЗАПАСОМ», И ПОЧЕМУ
 * САМОГО ЧИСЛА НЕДОСТАТОЧНО.
 *
 * Возражение против точного числа звучит разумно: датчик вырождения обязан молчать
 * на законной правке, иначе его выключат вместе с сигналом. Оно верно только в ОДНУ
 * сторону. У порога `>=` верхней границы нет: рост множества бесплатен, новое
 * перечисление вместе с контрактом проходит молча, число дописывать не нужно.
 * Красным становится только СОКРАЩЕНИЕ, а сокращение здесь — ровно тот класс,
 * который сверка и охраняет: перечисление ушло из переписи, и его значения больше
 * никто не сверяет с контрактом. Это НЕ ровное равенство: равенство краснело бы на
 * добавлении, то есть наказывало бы за безопасную правку.
 *
 * ЧТО ИМЕННО ПРОПУСКАЕТ ЗАПАС, измерено, а не предположено. Здесь стояло `>= 40`
 * при 44 перечислениях — четыре молчаливых слота. Их подняли до 44/36, и это уже
 * второй заход: на момент ЭТОЙ правки в дереве 46 перечислений и 37 пар, то есть за
 * время жизни файла запас накопился снова, сам, без чьего-либо решения. Цена слота
 * названа в этом же файле живым случаем: users.role объявлена как text, а не
 * pgEnum, и на уровне базы роль не ограничена ничем. Превращение pgEnum в text
 * выкидывает перечисление из переписи целиком — значения перестают проверяться и
 * базой, и контрактом сразу, — и ниже порога это проходит молча столько раз,
 * сколько в запасе слотов.
 *
 * РЕШЕНИЕ. Числа подняты до измеренных (46 перечислений, 37 пар, 162 экспорта
 * контракта) с явным правилом: они РАСТУТ ВМЕСТЕ С КОНТРАКТОМ и опускаются только
 * тем же коммитом, который законно удаляет перечисление, вместе с причиной в
 * сообщении. Поднимать их при добавлении не обязательно — прогон не покраснеет, —
 * но тогда запас копится снова, как накопился сейчас; поэтому всякий, кто правит
 * этот файл, обязан заново прижать числа к фактам.
 *
 * И ОТДЕЛЬНО: ЧИСЛО — СЛАБЫЙ ИНСТРУМЕНТ, оно живёт в чужой памяти. Поэтому рядом
 * стоят две проверки, которым число не нужно вовсе и которые обновляются сами:
 *   * разбор исходника обязан совпадать с тем, что построил drizzle в рантайме —
 *     две независимые меры одного множества, расхождение между ними и есть поломка
 *     распознавания, при любом размере множества;
 *   * в переписи обязаны быть перечисления вне точки входа (pgEnum вне schema.ts,
 *     контракт вне index.ts) — это ФОРМА уже случившейся поломки «читаем один
 *     модуль и называем его целым миром», и она верна при любом числе.
 * Их порог обойти нельзя, потому что порога у них нет.
 */
test("перепись перечислений базы не выродилась", () => {
	const enums = databaseEnums();
	assert.ok(
		enums.length >= 46,
		`Перепись нашла ${enums.length} pgEnum в модулях db, а на момент установки порога их было 46. ` +
			"Множество сократилось: либо распознавание перечисления сломалось и любой зелёный результат ниже " +
			"получен на урезанном множестве, либо перечисление убрали из схемы — например, колонку перевели с " +
			"pgEnum на text, и тогда её значения не проверяет уже никто. Если удаление по делу, опустите это " +
			"число тем же коммитом и назовите причину.",
	);

	const outsideMainSchema = enums.filter((item) => item.module !== "schema.ts");
	assert.ok(
		outsideMainSchema.length > 0,
		"В переписи не осталось ни одного pgEnum вне schema.ts. Именно так перепись и была сломана до этой " +
			"правки: она перебирала экспорты одного модуля, поэтому communication_campaign_status из " +
			"db/communicationsSchema.ts не попадал в неё ВОВСЕ — ни в сверку значений, ни в список причин. " +
			"Обход обязан читать все модули db, а не тот один, который импортирован сверху.",
	);

	const census = contractSourceCensus();
	const paired = enums.filter((item) => contractEnumFor(census, item.exportName) !== null);
	assert.ok(
		paired.length >= 37,
		`Пар «перечисление базы + контракт» нашлось ${paired.length}, а на момент установки порога их было ` +
			"37. Каждая потерянная пара — это перечисление, чьи значения больше не сверяются с контрактом, а " +
			"расхождение стоит строк в рабочем кабинете: непрошедшие safeParse ряды гидратация молча " +
			"отбрасывает. Либо разбор контракта перестал узнавать запись перечисления, либо именованный " +
			"экспорт убрали.",
	);
});

test("перепись контракта читает исходник, а не собранный артефакт", () => {
	const census = contractSourceCensus();

	assert.ok(
		census.named.size >= 162,
		`Перепись контракта нашла ${census.named.size} перечислений в packages/shared/src, а на момент ` +
			"установки порога их было 162. Сокращение означает либо поломку разбора, либо удаление экспортов; " +
			"в первом случае зелёное ниже получено на урезанном множестве.",
	);

	const outsideEntry = [...census.named.values()].filter((found) => found.module !== "index.ts");
	assert.ok(
		outsideEntry.length > 0,
		"В переписи контракта не осталось экспортов вне index.ts. Обход по `export * from` сломался: " +
			"migration.ts даёт 8 перечислений и 7 живых пар, и их потеря выглядит как «стало меньше», а не " +
			"как ошибка.",
	);

	// Возврат к рантаймовому импорту собранного пакета — это возврат сразу двух
	// ложных сторон, описанных в докстринге файла. Поэтому он запрещён здесь же,
	// разбором собственного текста: иначе «починку» откатит первый, кому покажется,
	// что импорт короче.
	const ownSource = readFileSync(fileURLToPath(import.meta.url), "utf8");
	const ownModule = parseModule("enumContractDrift.test.ts", ownSource, ".ts", ts.ScriptKind.TS);
	const importsBuiltPackage = ownModule.parsed.statements.filter(
		(statement) =>
			ts.isImportDeclaration(statement) &&
			ts.isStringLiteral(statement.moduleSpecifier) &&
			statement.moduleSpecifier.text === "@dental/shared",
	);
	assert.deepEqual(
		importsBuiltPackage.map((statement) => statement.getText(ownModule.parsed)),
		[],
		"Этот сторож снова импортирует @dental/shared. Пакет отдаёт наружу СОБРАННЫЙ dist, поэтому такой " +
			"импорт делает проверку красной при целом исходнике (пока сборка отстаёт) и зелёной при сломанном " +
			"(пока сборка отстаёт). Контракт читается из packages/shared/src разбором; о свежести сборки есть " +
			"отдельная проверка с отдельным названием.",
	);
});

test("разбор исходника схемы совпадает с тем, что построил drizzle", () => {
	const parsed = databaseEnums();
	const runtime = runtimeDatabaseEnums();
	const byName = new Map(parsed.map((item) => [item.exportName, item]));

	const invisible = [...runtime.keys()].filter((name) => !byName.has(name)).sort();
	assert.deepEqual(
		invisible,
		[],
		`drizzle построил pgEnum, которого разбор исходника не нашёл: ${invisible.join(", ")}. Разбор — ` +
			"единственный, кто видит все модули db, поэтому его слепое пятно означает перечисление вне сверки.",
	);

	const mismatched = parsed
		.filter((item) => runtime.has(item.exportName) && !sameSet(item.values, runtime.get(item.exportName) ?? []))
		.map(
			(item) =>
				`${item.exportName}: исходник [${item.values.join(", ")}], drizzle ` +
				`[${(runtime.get(item.exportName) ?? []).join(", ")}]`,
		);
	assert.deepEqual(
		mismatched,
		[],
		`Разбор исходника и drizzle расходятся в значениях: ${mismatched.join("; ")}. Сверка ниже идёт по ` +
			"разбору, поэтому его ошибка — это сверка не с тем набором. Числу тут верить нельзя: две " +
			"независимые меры обязаны совпадать, и это условие не требует порога и не устаревает.",
	);

	const lostFromMainSchema = parsed
		.filter((item) => item.module === "schema.ts" && !runtime.has(item.exportName))
		.map((item) => item.exportName);
	assert.deepEqual(
		lostFromMainSchema,
		[],
		`pgEnum объявлен в schema.ts, но из модуля не экспортируется: ${lostFromMainSchema.join(", ")}. ` +
			"Значит либо распознавание pgEnum в рантайме сломалось, либо экспорт потеряли и колонки этого " +
			"перечисления собираются уже не по нему.",
	);
});

test("у каждого перечисления базы есть либо контракт, либо объявленная причина", () => {
	const census = contractSourceCensus();
	const unpaired = databaseEnums()
		.filter((item) => contractEnumFor(census, item.exportName) === null)
		.map((item) => item.exportName);
	const declared = new Set(NO_CONTRACT_PAIR.map((entry) => entry.exportName));

	const undeclared = unpaired.filter((name) => !declared.has(name));
	assert.deepEqual(
		undeclared,
		[],
		`Перечисление базы без контракта и без объявленной причины: ${undeclared.join(", ")}. Значения из ` +
			"такого перечисления никто не проверяет на входе, и расхождение с ним будет стоить строк в " +
			"рабочем кабинете. Либо впишите соответствие контракту, либо объявите причину здесь.",
	);

	const stale = [...declared].filter((name) => !unpaired.includes(name)).sort();
	assert.deepEqual(
		stale,
		[],
		`Причина объявлена для перечисления, у которого контракт УЖЕ есть: ${stale.join(", ")}. Уберите ` +
			"запись — иначе список причин перестаёт быть правдой, а пара выпадает из сверки.",
	);

	const shallow = NO_CONTRACT_PAIR.filter((entry) => entry.reason.trim().length < 80).map(
		(entry) => entry.exportName,
	);
	assert.deepEqual(
		shallow,
		[],
		`Причина заявлена отпиской: ${shallow.join(", ")}. Причина обязана называть, где контракт лежит под ` +
			"другим именем или почему его нет вовсе — иначе следующий инженер будет искать его заново.",
	);
});

/**
 * Четыре причины утверждают: «контракт есть, но безымянный, и набор совпадает со
 * схемой один в один». Пока это была проза, она устаревала молча — все пять
 * названных в ней номеров строк оказались неверны. Здесь утверждение проверяется:
 * в контракте обязан найтись безымянный `z.enum` РОВНО с набором этого pgEnum.
 *
 * Это не украшение: у четырёх перечислений значения на входе проверяет именно такой
 * литерал, и никакая пара его не охраняет. Уберут из него значение — база примет
 * строку, контракт отклонит, гидратация молча выбросит; теперь это красный.
 *
 * ЧЕГО ПРОВЕРКА НЕ УМЕЕТ, честно: она ищет совпадение по НАБОРУ, а не по месту.
 * Если где-то в контракте случайно окажется другой литерал с тем же набором,
 * проверка сочтёт утверждение исполненным. Порядок значений тоже не сверяется —
 * safeParse он безразличен.
 */
test("безымянный контракт, названный в причине, существует и совпадает со схемой", () => {
	const census = contractSourceCensus();
	const byName = new Map(databaseEnums().map((item) => [item.exportName, item]));
	const problems: string[] = [];

	for (const entry of NO_CONTRACT_PAIR) {
		if (entry.contractIsAnonymous !== true) continue;
		const found = byName.get(entry.exportName);
		if (found === undefined) {
			problems.push(`${entry.exportName}: перечисления с таким именем в переписи базы больше нет`);
			continue;
		}
		const matches = census.inline.filter((candidate) => sameSet(candidate.values, found.values));
		if (matches.length > 0) continue;
		const nearest = census.inline
			.filter((candidate) => candidate.values.some((value) => found.values.includes(value)))
			.map((candidate) => `${candidate.module}:${candidate.line} ${candidate.property} [${candidate.values.join(", ")}]`);
		problems.push(
			`${entry.exportName} (${found.databaseName}, db/${found.module}:${found.line}): в базе набор ` +
				`[${found.values.join(", ")}], а безымянного z.enum с этим набором в контракте нет. Ближайшие: ` +
				`${nearest.length > 0 ? nearest.join("; ") : "ни одного пересечения по значениям"}`,
		);
	}

	assert.deepEqual(
		problems,
		[],
		`Причина утверждает, что контракт есть безымянным литералом и совпадает со схемой, но это уже не ` +
			`так: ${problems.join(" | ")}. У этих перечислений значения на входе проверяет только такой ` +
			"литерал — расхождение в нём означает строки, которые база примет, контракт отклонит, а гидратация " +
			"молча выбросит. Либо верните набор, либо вынесите его в именованный экспорт и уберите запись.",
	);
});

test("значения перечислений базы не теряются в контракте", () => {
	const census = contractSourceCensus();
	const drift: string[] = [];

	for (const item of databaseEnums()) {
		const contract = contractEnumFor(census, item.exportName);
		if (contract === null) continue;
		const known = new Set(contract.values);
		const missing = item.values.filter((value) => !known.has(value));
		if (missing.length > 0) {
			drift.push(
				`${item.databaseName} (db/${item.module}:${item.line}, schema.${item.exportName}): в базе есть ` +
					`${missing.map((value) => `«${value}»`).join(", ")}, а в контракте ${item.exportName}Schema ` +
					`(packages/shared/src/${contract.module}:${contract.line}, набор ` +
					`[${contract.values.join(", ")}]) таких значений нет — такие строки будут молча отброшены ` +
					"при гидратации.",
			);
		}
	}

	assert.deepEqual(drift, [], drift.join("\n"));
});

test("каждая пара перечислений непуста — проверка не выродилась", () => {
	const census = contractSourceCensus();
	for (const item of databaseEnums()) {
		assert.ok(
			item.values.length > 0,
			`${item.databaseName} (db/${item.module}:${item.line}): пустое перечисление в базе. Либо значения ` +
				"собраны выражением, которого разбор не понимает, — и тогда сверять ему нечем, — либо " +
				"перечисление действительно пусто.",
		);
		const contract = contractEnumFor(census, item.exportName);
		if (contract === null) continue;
		assert.ok(contract.values.length > 0, `${item.exportName}Schema: пустое перечисление в контракте`);
	}
});

test("канал связи содержит vk и max — из-за их отсутствия терялась переписка", () => {
	const contract = contractEnumFor(contractSourceCensus(), "communicationChannel");
	assert.ok(contract !== null, "communicationChannelSchema не найден в packages/shared/src");
	for (const channel of ["vk", "max"]) {
		assert.ok(
			contract.values.includes(channel),
			`communicationChannelSchema не знает канал «${channel}». routes/${channel}.ts пишет задачи и ` +
				"события с этим каналом, база их принимает, а гидратация прогоняет через safeParse и молча " +
				"отбрасывает: переписка исчезает из рабочего кабинета.",
		);
	}
});

/**
 * ПОЧЕМУ ЭТОТ НАБОР ПРОВЕРЯЕТСЯ ЕЩЁ И ПОИМЁННО, ХОТЯ ВЫШЕ ЕСТЬ ПЕРЕПИСЬ.
 *
 * Перепись сверяет ровно одно направление: каждое значение базы обязано быть в
 * контракте. Обратное она разрешает сознательно — и именно поэтому она НЕ способна
 * заметить контракт, который принимает ЛИШНЕЕ. Контракт вида
 * z.enum(["Pending","Sent","Error","Accepted","sent"]) прошёл бы перепись молча,
 * а «sent» так и падало бы на вставке в Postgres.
 *
 * Для egisz_logs это не гипотетическая придирка: заглавная буква — единственное,
 * что отличает принимаемое значение от отклоняемого, и цена ошибки — потерянная
 * запись в журнале передачи медицинских данных в государственную систему, то есть
 * запись о том, что УЖЕ отправлено. Поэтому набор здесь закреплён целиком и в
 * точном порядке: и пропажа значения, и появление лишнего дают красный.
 *
 * Ссылка на контракт берётся тем же contractEnumFor, а не именованным импортом, и
 * теперь по двум причинам. Первая прежняя: именованный импорт отсутствующего
 * экспорта в ESM — ошибка связывания, файл не загрузился бы целиком и вместе с ним
 * перестала бы выполняться вся перепись выше, оставив ноль сверок вместо одной
 * ошибки. Вторая: любой импорт из @dental/shared — это чтение СОБРАННОГО dist,
 * из-за которого эта самая проверка и падала при полностью исправном исходнике.
 */
test("статус ЕГИСЗ закреплён поимённо: «sent» в нижнем регистре не должен приниматься", () => {
	const contract = contractEnumFor(contractSourceCensus(), "egiszStatus");
	assert.ok(
		contract !== null,
		"egiszStatusSchema не найден в packages/shared/src. Раньше эта строка означала «пересоберите пакет» — " +
			"проверка читала dist и падала при целом исходнике. Теперь читается исходник, и отсутствие " +
			"экспорта означает именно отсутствие экспорта.",
	);
	assert.deepEqual(
		[...contract.values],
		["Pending", "Sent", "Error", "Accepted"],
		"Набор статусов ЕГИСЗ разошёлся с типом egisz_status_enum " +
			"(apps/api/drizzle/0000_freezing_randall_flagg.sql:26). Лишнее значение — это строка, " +
			"которую примет контракт и отклонит база при вставке в журнал уже отправленных данных; " +
			"пропавшее — строка, которую молча отбросит гидратация.",
	);
});

/**
 * СВЕЖЕСТЬ СБОРКИ — ОТДЕЛЬНАЯ БОЛЕЗНЬ И ОТДЕЛЬНОЕ ДЕЙСТВИЕ ОПЕРАТОРА.
 *
 * Всё выше судит об ИСХОДНИКЕ контракта. Но apps/api импортирует @dental/shared, а
 * пакет отдаёт наружу dist/index.js: safeParse в db/domainStateHydration.ts работает
 * по СОБРАННОМУ набору. Значит отставшая сборка — это та же потеря строк, только уже
 * в запущенном сервере, а не в чьей-то ветке.
 *
 * Поэтому проверка есть, но она отдельная и называет свою причину своим именем:
 * «сборка отстала, пересоберите пакет», а не «контракт разошёлся». Смешение этих двух
 * в одном утверждении и было исходным дефектом файла — сторож требовал править
 * набор, который в порядке, и его красный ничего не сообщал.
 *
 * Область сужена умышленно: сверяются только перечисления, у которых ЕСТЬ пара с
 * pgEnum. Там отставание стоит строк в базе. Новый экспорт контракта без пары
 * отставанием сборки никому не вредит, и краснеть на него — снова учить выключать
 * сторожа.
 */
test("собранный @dental/shared не отстал от исходника контракта", () => {
	const source = contractSourceCensus();
	const built = contractDistCensus();
	assert.ok(
		built !== null,
		"packages/shared/dist/index.js отсутствует: пакет не собран. apps/api импортирует именно его, " +
			"поэтому сервер сейчас не поднимется вовсе. Выполните `npm run build -w @dental/shared`.",
	);

	const pairedNames = databaseEnums()
		.map((item) => `${item.exportName}Schema`)
		.filter((name) => source.named.has(name));

	const lagging = pairedNames
		.map((name) => {
			const expected = source.named.get(name);
			const actual = built.named.get(name);
			if (expected === undefined) return null;
			if (actual === undefined) return `${name}: в исходнике есть, в сборке нет вовсе`;
			if (!sameSet(expected.values, actual.values)) {
				return `${name}: исходник [${expected.values.join(", ")}], сборка [${actual.values.join(", ")}]`;
			}
			return null;
		})
		.filter((entry): entry is string => entry !== null);

	assert.deepEqual(
		lagging,
		[],
		`СБОРКА ОТСТАЛА ОТ ИСХОДНИКА (это не расхождение контракта со схемой): ${lagging.join("; ")}. ` +
			"Действие одно: `npm run build -w @dental/shared`. Пока сборка отстаёт, apps/api проверяет " +
			"входящие строки прошлым набором значений: safeParse в db/domainStateHydration.ts отклонит " +
			"значение, которое база уже принимает, и строка исчезнет из рабочего кабинета молча — как " +
			"исчезала переписка ВКонтакте и MAX. Набор в packages/shared/src при этом может быть " +
			"полностью правильным, и править его не нужно.",
	);
});
