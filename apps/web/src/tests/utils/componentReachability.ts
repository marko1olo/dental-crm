import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

/**
 * ПЕРЕПИСЬ КОМПОНЕНТОВ И ИХ ДОСТИЖИМОСТИ ОТ ТОЧКИ МОНТИРОВАНИЯ.
 *
 * Компонент, который существует, но которого никто не рендерит, невидим для
 * typecheck (он компилируется), невидим для тестов (их на него нет) и невидим
 * для ревьюера, проверившего два звена трёхзвенной цепочки. За кампанию класс
 * дефекта всплыл трижды: AppRouter.tsx с пятью законченными экранами внутри,
 * который никто не импортировал; формы, вынесенные из монолита и оставленные
 * сиротами; починка внутри мёртвого файла, выданная за починку для людей.
 *
 * ПОЧЕМУ РАЗБОР, А НЕ ШАБЛОН. Предыдущий страж (scripts/check-component-mount-
 * reachability.mjs, удалён вместе с этим файлом-заменой) искал объявления
 * шаблонами ast-grep. Шаблон `export const $NAME = ($$$PARAMS) => $$$BODY`
 * НЕ совпадает, если на имени стоит аннотация типа, а `export const X:
 * React.FC = () => {}` — самая частая форма в этом дереве. Из-за этого страж не
 * видел ни pages/PublicBookingWidget.tsx, ни
 * components/plan/ComparativePlannerDashboard.tsx — ровно те две сироты, что
 * были найдены руками. Здесь берётся дерево разбора @babel/parser, и форма
 * объявления перестаёт что-либо решать: аннотация типа, обёртка memo/forwardRef,
 * аннотация возвращаемого типа, класс-компонент — всё это одни и те же узлы.
 *
 * ЧТО СЧИТАЕТСЯ ДОСТИЖИМЫМ. Ровно то, что исполняет браузер: обход начинается с
 * единственного входа main.tsx и идёт по рёбрам, которые ведут к рендеру.
 * Импорт ради побочного эффекта и голый `import()` таким ребром НЕ являются —
 * иначе workspacePreload.ts, тянущий все экраны, отбелил бы всё дерево и
 * проверка потеряла бы смысл.
 *
 * РАЗБОР ОДИН НА ПРОЦЕСС. Файлов ~370, и парсер вызывается по одному разу на
 * файл; результат кэшируется в модуле, чтобы несколько блоков одного теста не
 * платили за обход повторно. Процесс на файл не запускается ни разу — прежний
 * страж поднимал ast-grep подпроцессом, и его собственный тест шёл 4 м 33 с.
 */

const here = dirname(fileURLToPath(import.meta.url));
/** apps/web/src — корень вселенной файлов; вне него перепись ничего не судит. */
export const webSrcRoot = join(here, "..", "..");

/** Единственная настоящая точка монтирования: main.tsx вызывает createRoot().render(). */
const ENTRY = "main.tsx";

/** Каталоги, целиком выпадающие из графа. */
const IGNORED_DIRECTORIES = [
	"node_modules",
	"dist",
	"__snapshots__",
	"tests",
	"__tests__",
];

const SOURCE_EXTENSIONS = [".ts", ".tsx"];

export type EdgeKind =
	| "value"
	| "type"
	| "namespace"
	| "side-effect"
	| "lazy"
	| "dynamic-preload"
	| "reexport";

export interface ImportBinding {
	/** Имя в экспортирующем модуле: имя экспорта, "default" или "*". */
	readonly imported: string;
	/** Имя, под которым импортёр этим значением пользуется. */
	readonly local: string;
}

export interface ImportEdge {
	readonly source: string;
	readonly line: number;
	readonly kind: EdgeKind;
	readonly bindings: readonly ImportBinding[];
}

export interface ComponentDeclaration {
	readonly name: string;
	readonly line: number;
	readonly isDefaultExport: boolean;
}

export interface FileFacts {
	readonly path: string;
	readonly components: ComponentDeclaration[];
	readonly jsxTags: Set<string>;
	readonly valueRefs: Set<string>;
	readonly imports: ImportEdge[];
}

export type ComponentState =
	| "rendered"
	| "rendered-via-lazy-route"
	| "rendered-by-value-only"
	| "declared-but-never-rendered"
	| "imported-but-never-rendered"
	| "orphaned"
	| "rendered-only-inside-an-unreachable-tree";

export interface ComponentVerdict {
	/** Путь от apps/web/src, косые черты вперёд: `components/schedule/FreedSlotsPanel.tsx`. */
	readonly file: string;
	readonly name: string;
	readonly line: number;
	readonly state: ComponentState;
	/** Человекочитаемое объяснение приговора; попадает в текст падения теста. */
	readonly detail: string;
}

export interface ReachabilityCensus {
	readonly entry: string;
	readonly scannedFiles: number;
	readonly parsedFiles: number;
	readonly componentFiles: number;
	readonly verdicts: readonly ComponentVerdict[];
	readonly reachableFiles: ReadonlySet<string>;
	readonly facts: ReadonlyMap<string, FileFacts>;
	/** Имена, объявленные более чем в одном файле: там привязка по имени неоднозначна. */
	readonly duplicateComponentNames: readonly string[];
	readonly wallClockMs: number;
}

const RENDERED_STATES: ReadonlySet<ComponentState> = new Set<ComponentState>([
	"rendered",
	"rendered-via-lazy-route",
	"rendered-by-value-only",
]);

/** Приговор, при котором пользователь компонент увидеть может. */
export function isMounted(state: ComponentState): boolean {
	return RENDERED_STATES.has(state);
}

function toPosix(value: string): string {
	return value.split(sep).join("/");
}

function collectSourceFiles(): string[] {
	const found: string[] = [];
	const stack = [webSrcRoot];
	while (stack.length > 0) {
		const current = stack.pop() as string;
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const full = join(current, entry.name);
			if (entry.isDirectory()) {
				if (IGNORED_DIRECTORIES.includes(entry.name)) continue;
				stack.push(full);
				continue;
			}
			if (!entry.isFile()) continue;
			if (!SOURCE_EXTENSIONS.includes(extname(entry.name))) continue;
			if (entry.name.endsWith(".d.ts")) continue;
			if (/\.test\.tsx?$/.test(entry.name)) continue;
			found.push(toPosix(relative(webSrcRoot, full)));
		}
	}
	return found.sort();
}

type Node = { type: string; loc?: { start: { line: number } } } & Record<
	string,
	unknown
>;

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Node).type === "string"
	);
}

/** Дочерние узлы без списка полей на каждый тип: обходятся все значения объекта. */
function children(node: Node): Node[] {
	const out: Node[] = [];
	for (const [key, value] of Object.entries(node)) {
		if (
			key === "loc" ||
			key === "leadingComments" ||
			key === "trailingComments"
		)
			continue;
		if (Array.isArray(value)) {
			for (const item of value) if (isNode(item)) out.push(item);
			continue;
		}
		if (isNode(value)) out.push(value);
	}
	return out;
}

/**
 * Узлы, целиком принадлежащие системе типов. Идентификатор внутри них — это
 * ТИП, а не использование значения, и считать его рендером нельзя: иначе
 * `const x: MyPanel = ...` объявлял бы панель живой.
 */
const TYPE_ONLY_NODES = new Set([
	"TSTypeAnnotation",
	"TSTypeAliasDeclaration",
	"TSInterfaceDeclaration",
	"TSInterfaceBody",
	"TSTypeParameterDeclaration",
	"TSTypeParameterInstantiation",
	"TSTypeReference",
	"TSQualifiedName",
	"TSTypeQuery",
	"TSTypeOperator",
	"TSDeclareFunction",
	"TSModuleDeclaration",
	"TSEnumDeclaration",
	"TSIndexSignature",
	"TSPropertySignature",
	"TSMethodSignature",
	"TSCallSignatureDeclaration",
	"TSConstructSignatureDeclaration",
]);

function hasJsx(node: Node): boolean {
	const stack: Node[] = [node];
	while (stack.length > 0) {
		const current = stack.pop() as Node;
		if (current.type === "JSXElement" || current.type === "JSXFragment")
			return true;
		if (TYPE_ONLY_NODES.has(current.type)) continue;
		for (const child of children(current)) stack.push(child);
	}
	return false;
}

const PASCAL_CASE = /^[A-Z]/;
/**
 * Имя компонента: заглавная первая буква И хотя бы одна строчная. Второе
 * условие отсекает КОНСТАНТЫ_В_ВЕРХНЕМ_РЕГИСТРЕ: например
 * components/workspace/onboarding/ui/SharedOnboardingUI.tsx:18 объявляет
 * `SPECIALIZATIONS` — массив данных, в элементах которого лежат иконки JSX.
 * Компонентом он не является, и в описи долгов ему не место.
 */
const COMPONENT_NAME = /^[A-Z][A-Za-z0-9_$]*[a-z][A-Za-z0-9_$]*$/;

function lineOf(node: Node): number {
	return node.loc?.start.line ?? 0;
}

function stringLiteralValue(node: unknown): string | null {
	if (!isNode(node)) return null;
	if (node.type === "StringLiteral" && typeof node.value === "string")
		return node.value;
	return null;
}

/**
 * Имя экспорта из `import("./X").then((m) => ({ default: m.NAME }))`.
 * Ровно так App.tsx грузит экраны, и локальное имя там не совпадает с именем
 * экспорта: `lazy(() => import("./App").then((m) => ({ default: m.App })))` в
 * AppShell.tsx объявляет DentalWorkspace. Проверка по локальному имени объявила
 * бы главный компонент приложения нерендерящимся.
 */
function lazyNamedTarget(
	call: Node,
): { source: string; exported: string } | null {
	const callee = call.callee as Node | undefined;
	if (callee?.type !== "MemberExpression") return null;
	const property = callee.property as Node | undefined;
	if (property?.type !== "Identifier" || property.name !== "then") return null;
	const inner = callee.object as Node | undefined;
	if (inner?.type !== "CallExpression") return null;
	const innerCallee = inner.callee as Node | undefined;
	if (innerCallee?.type !== "Import") return null;
	const source = stringLiteralValue((inner.arguments as unknown[])?.[0]);
	if (!source) return null;

	// Имя достаётся из объектного литерала `{ default: m.NAME }`, если он есть.
	let exported = "default";
	const handler = (call.arguments as unknown[])?.[0];
	if (isNode(handler)) {
		const stack: Node[] = [handler];
		while (stack.length > 0) {
			const current = stack.pop() as Node;
			if (current.type === "ObjectProperty") {
				const key = current.key as Node | undefined;
				const value = current.value as Node | undefined;
				if (
					key?.type === "Identifier" &&
					key.name === "default" &&
					value?.type === "MemberExpression" &&
					isNode(value.property) &&
					(value.property as Node).type === "Identifier"
				) {
					exported = (value.property as Node).name as string;
					break;
				}
			}
			for (const child of children(current)) stack.push(child);
		}
	}
	return { source, exported };
}

/** `lazy(() => import("./X"))` и `React.lazy(...)`: сам факт такого ребра — рендер. */
function isLazyCall(call: Node): boolean {
	const callee = call.callee as Node | undefined;
	if (!callee) return false;
	if (callee.type === "Identifier") return callee.name === "lazy";
	if (callee.type === "MemberExpression") {
		const property = callee.property as Node | undefined;
		return property?.type === "Identifier" && property.name === "lazy";
	}
	return false;
}

function parseFile(relativePath: string, source: string): Node {
	const isTsx = relativePath.endsWith(".tsx");
	return parse(source, {
		sourceType: "module",
		errorRecovery: false,
		plugins: isTsx ? ["typescript", "jsx"] : ["typescript"],
	}).program as unknown as Node;
}

function declarationName(node: Node): { name: string; line: number } | null {
	const id = node.id as Node | undefined;
	if (id?.type === "Identifier" && typeof id.name === "string") {
		return { name: id.name, line: lineOf(node) };
	}
	return null;
}

/** Объявления верхнего уровня, которые экспортируются и несут JSX. */
function collectComponents(program: Node): ComponentDeclaration[] {
	const declared = new Map<string, { line: number; jsx: boolean }>();
	const exported = new Set<string>();
	const defaultExported = new Set<string>();
	const components: ComponentDeclaration[] = [];

	function noteDeclaration(node: Node, markExported: boolean): void {
		if (
			node.type === "FunctionDeclaration" ||
			node.type === "ClassDeclaration"
		) {
			const named = declarationName(node);
			if (!named) return;
			declared.set(named.name, { line: named.line, jsx: hasJsx(node) });
			if (markExported) exported.add(named.name);
			return;
		}
		if (node.type === "VariableDeclaration") {
			for (const raw of (node.declarations as unknown[]) ?? []) {
				if (!isNode(raw)) continue;
				const id = raw.id as Node | undefined;
				if (id?.type !== "Identifier" || typeof id.name !== "string") continue;
				const init = raw.init as Node | undefined;
				declared.set(id.name, {
					line: lineOf(raw),
					jsx: init ? hasJsx(init) : false,
				});
				if (markExported) exported.add(id.name);
			}
		}
	}

	for (const statement of (program.body as unknown[]) ?? []) {
		if (!isNode(statement)) continue;

		if (statement.type === "ExportNamedDeclaration") {
			if (statement.source) continue; // ре-экспорт: обрабатывается как ребро
			const declaration = statement.declaration as Node | undefined;
			if (declaration) {
				noteDeclaration(declaration, true);
				continue;
			}
			for (const raw of (statement.specifiers as unknown[]) ?? []) {
				if (!isNode(raw)) continue;
				const local = raw.local as Node | undefined;
				const exportedName = raw.exported as Node | undefined;
				if (local?.type !== "Identifier" || typeof local.name !== "string")
					continue;
				exported.add(local.name);
				if (
					exportedName?.type === "Identifier" &&
					exportedName.name === "default"
				) {
					defaultExported.add(local.name);
				}
			}
			continue;
		}

		if (statement.type === "ExportDefaultDeclaration") {
			const declaration = statement.declaration as Node | undefined;
			if (!declaration) continue;
			if (
				declaration.type === "Identifier" &&
				typeof declaration.name === "string"
			) {
				exported.add(declaration.name);
				defaultExported.add(declaration.name);
				continue;
			}
			const named = declarationName(declaration);
			if (named) {
				declared.set(named.name, {
					line: named.line,
					jsx: hasJsx(declaration),
				});
				exported.add(named.name);
				defaultExported.add(named.name);
				continue;
			}
			// `export default () => <div />` — имени нет; берётся имя модуля.
			if (hasJsx(declaration)) {
				components.push({
					name: "default",
					line: lineOf(statement),
					isDefaultExport: true,
				});
			}
			continue;
		}

		noteDeclaration(statement, false);
	}

	for (const [name, info] of declared) {
		if (!exported.has(name)) continue;
		if (!info.jsx) continue;
		if (!COMPONENT_NAME.test(name)) continue;
		components.push({
			name,
			line: info.line,
			isDefaultExport: defaultExported.has(name),
		});
	}
	return components.sort((a, b) => a.line - b.line);
}

function collectImportEdges(program: Node): ImportEdge[] {
	const edges: ImportEdge[] = [];
	const consumedImportCalls = new Set<Node>();

	for (const statement of (program.body as unknown[]) ?? []) {
		if (!isNode(statement)) continue;

		if (statement.type === "ImportDeclaration") {
			const source = stringLiteralValue(statement.source);
			if (!source) continue;
			const line = lineOf(statement);
			if (statement.importKind === "type") {
				edges.push({ source, line, kind: "type", bindings: [] });
				continue;
			}
			const specifiers = (statement.specifiers as unknown[]) ?? [];
			if (specifiers.length === 0) {
				edges.push({ source, line, kind: "side-effect", bindings: [] });
				continue;
			}
			const bindings: ImportBinding[] = [];
			let kind: EdgeKind = "value";
			for (const raw of specifiers) {
				if (!isNode(raw)) continue;
				const local = raw.local as Node | undefined;
				if (local?.type !== "Identifier" || typeof local.name !== "string")
					continue;
				if (raw.type === "ImportDefaultSpecifier") {
					bindings.push({ imported: "default", local: local.name });
					continue;
				}
				if (raw.type === "ImportNamespaceSpecifier") {
					kind = "namespace";
					bindings.push({ imported: "*", local: local.name });
					continue;
				}
				if (raw.importKind === "type") continue;
				const importedNode = raw.imported as Node | undefined;
				const importedName =
					importedNode?.type === "Identifier"
						? (importedNode.name as string)
						: (stringLiteralValue(importedNode) ?? local.name);
				bindings.push({ imported: importedName, local: local.name });
			}
			if (bindings.length === 0) {
				edges.push({ source, line, kind: "type", bindings: [] });
				continue;
			}
			edges.push({ source, line, kind, bindings });
			continue;
		}

		if (statement.type === "ExportAllDeclaration") {
			const source = stringLiteralValue(statement.source);
			if (source) {
				edges.push({
					source,
					line: lineOf(statement),
					kind: "reexport",
					bindings: [{ imported: "*", local: "*" }],
				});
			}
			continue;
		}

		if (statement.type === "ExportNamedDeclaration" && statement.source) {
			const source = stringLiteralValue(statement.source);
			if (!source) continue;
			const bindings: ImportBinding[] = [];
			for (const raw of (statement.specifiers as unknown[]) ?? []) {
				if (!isNode(raw)) continue;
				const localNode = raw.local as Node | undefined;
				const exportedNode = raw.exported as Node | undefined;
				const importedName =
					localNode?.type === "Identifier" ? (localNode.name as string) : "*";
				const exportedName =
					exportedNode?.type === "Identifier"
						? (exportedNode.name as string)
						: importedName;
				bindings.push({ imported: importedName, local: exportedName });
			}
			edges.push({
				source,
				line: lineOf(statement),
				kind: "reexport",
				bindings:
					bindings.length > 0 ? bindings : [{ imported: "*", local: "*" }],
			});
		}
	}

	// Динамические импорты живут в произвольной глубине выражений, поэтому их
	// собирает обход, а не перебор верхнего уровня.
	const stack: Node[] = [program];
	while (stack.length > 0) {
		const current = stack.pop() as Node;
		if (TYPE_ONLY_NODES.has(current.type)) continue;

		if (current.type === "CallExpression") {
			if (isLazyCall(current)) {
				const argument = (current.arguments as unknown[])?.[0];
				if (isNode(argument)) {
					// Ищем внутри стрелки либо `import("x").then(...)`, либо голый `import("x")`.
					const inner: Node[] = [argument];
					while (inner.length > 0) {
						const node = inner.pop() as Node;
						if (node.type === "CallExpression") {
							const named = lazyNamedTarget(node);
							if (named) {
								const innerCall = (node.callee as Node).object as Node;
								consumedImportCalls.add(node);
								consumedImportCalls.add(innerCall);
								edges.push({
									source: named.source,
									line: lineOf(node),
									kind: "lazy",
									bindings: [
										{ imported: named.exported, local: named.exported },
									],
								});
								continue;
							}
							if ((node.callee as Node | undefined)?.type === "Import") {
								const source = stringLiteralValue(
									(node.arguments as unknown[])?.[0],
								);
								if (source) {
									consumedImportCalls.add(node);
									edges.push({
										source,
										line: lineOf(node),
										kind: "lazy",
										bindings: [{ imported: "default", local: "default" }],
									});
								}
								continue;
							}
						}
						for (const child of children(node)) inner.push(child);
					}
				}
			} else if ((current.callee as Node | undefined)?.type === "Import") {
				if (!consumedImportCalls.has(current)) {
					const source = stringLiteralValue(
						(current.arguments as unknown[])?.[0],
					);
					if (source) {
						edges.push({
							source,
							line: lineOf(current),
							kind: "dynamic-preload",
							bindings: [],
						});
					}
				}
			}
		}

		for (const child of children(current)) stack.push(child);
	}

	return edges;
}

function collectReferences(program: Node): {
	jsxTags: Set<string>;
	valueRefs: Set<string>;
} {
	const jsxTags = new Set<string>();
	const valueRefs = new Set<string>();

	const stack: Node[] = [program];
	while (stack.length > 0) {
		const current = stack.pop() as Node;
		// Строка импорта не является использованием: иначе мёртвый импорт выглядел
		// бы живым, а это ровно тот дефект, который перепись ищет.
		if (current.type === "ImportDeclaration") continue;
		if (TYPE_ONLY_NODES.has(current.type)) continue;

		if (
			current.type === "JSXOpeningElement" ||
			current.type === "JSXSelfClosingElement"
		) {
			let name = current.name as Node | undefined;
			while (name?.type === "JSXMemberExpression")
				name = name.object as Node | undefined;
			if (
				name?.type === "JSXIdentifier" &&
				typeof name.name === "string" &&
				PASCAL_CASE.test(name.name)
			) {
				jsxTags.add(name.name);
				valueRefs.add(name.name);
			}
		}

		if (
			current.type === "Identifier" &&
			typeof current.name === "string" &&
			PASCAL_CASE.test(current.name)
		) {
			valueRefs.add(current.name);
		}

		for (const child of children(current)) stack.push(child);
	}

	return { jsxTags, valueRefs };
}

function resolveSpecifier(
	fromFile: string,
	specifier: string,
	universe: Set<string>,
): string | null {
	if (!specifier.startsWith(".")) return null;
	const joined = posix.join(posix.dirname(fromFile), specifier);
	const stem = joined.replace(/\.(js|jsx|mjs|cjs)$/, "");
	for (const candidate of [
		`${stem}.tsx`,
		`${stem}.ts`,
		`${stem}/index.tsx`,
		`${stem}/index.ts`,
		joined,
	]) {
		if (universe.has(candidate)) return candidate;
	}
	return null;
}

let cached: ReachabilityCensus | null = null;

/**
 * Перепись целиком. Считается один раз на процесс: node:test запускает каждый
 * файл теста отдельным процессом, а внутри процесса блоков может быть много.
 */
export function componentReachability(): ReachabilityCensus {
	if (cached) return cached;
	const startedAt = Date.now();

	const files = collectSourceFiles();
	const universe = new Set(files);
	if (!universe.has(ENTRY)) {
		throw new Error(
			`точка входа ${ENTRY} не найдена в apps/web/src — перепись не может доказать достижимость ничего`,
		);
	}

	const facts = new Map<string, FileFacts>();
	for (const file of files) {
		const source = readFileSync(join(webSrcRoot, file), "utf8");
		let program: Node;
		try {
			program = parseFile(file, source);
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			// Молча пропущенный файл — это дырка в переписи, а перепись с дыркой
			// хуже отсутствующей: она выдаёт зелёный на непроверенном.
			throw new Error(
				`не разобрать ${file}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		const references = collectReferences(program);
		facts.set(file, {
			path: file,
			components: collectComponents(program),
			jsxTags: references.jsxTags,
			valueRefs: references.valueRefs,
			imports: collectImportEdges(program),
		});
	}

	const componentFiles = new Set(
		[...facts].filter(([, f]) => f.components.length > 0).map(([p]) => p),
	);

	interface ResolvedEdge {
		readonly from: string;
		readonly to: string;
		readonly kind: EdgeKind;
		readonly line: number;
		readonly bindings: readonly ImportBinding[];
	}
	const edges: ResolvedEdge[] = [];
	for (const [file, fileFacts] of facts) {
		for (const edge of fileFacts.imports) {
			const target = resolveSpecifier(file, edge.source, universe);
			if (!target || target === file) continue;
			edges.push({
				from: file,
				to: target,
				kind: edge.kind,
				line: edge.line,
				bindings: edge.bindings,
			});
		}
	}

	const edgesFrom = new Map<string, ResolvedEdge[]>();
	const edgesTo = new Map<string, ResolvedEdge[]>();
	for (const edge of edges) {
		if (!edgesFrom.has(edge.from)) edgesFrom.set(edge.from, []);
		(edgesFrom.get(edge.from) as ResolvedEdge[]).push(edge);
		if (!edgesTo.has(edge.to)) edgesTo.set(edge.to, []);
		(edgesTo.get(edge.to) as ResolvedEdge[]).push(edge);
	}

	/**
	 * Пользуется ли импортёр хоть одной привязкой из цели. Привязки в camelCase
	 * (хуки, словари) в этой переписи не отслеживаются, поэтому такое ребро
	 * считается проходимым: мёртвый импорт хука — не тот класс дефекта, а вот
	 * объявить компонент живым без оснований нельзя.
	 */
	function edgeUsesTarget(edge: ResolvedEdge): boolean {
		const fromFacts = facts.get(edge.from);
		if (!fromFacts) return false;
		if (edge.bindings.length === 0) return false;
		let sawPascal = false;
		for (const binding of edge.bindings) {
			if (binding.local === "*") return true;
			if (!PASCAL_CASE.test(binding.local)) return true;
			sawPascal = true;
			if (fromFacts.valueRefs.has(binding.local)) return true;
		}
		return !sawPascal;
	}

	function edgeIsRenderPath(edge: ResolvedEdge): boolean {
		switch (edge.kind) {
			case "type":
				return false;
			case "side-effect":
			case "dynamic-preload":
				// Модуль исполнится, компонент не отрендерится. Для не-компонентов
				// (полифилы, регистрация service worker) это нормальная зависимость.
				return !componentFiles.has(edge.to);
			case "lazy":
			case "reexport":
				return true;
			case "namespace":
				return edgeUsesTarget(edge);
			default:
				if (!componentFiles.has(edge.to)) return true;
				return edgeUsesTarget(edge);
		}
	}

	const reachable = new Set<string>([ENTRY]);
	const queue: string[] = [ENTRY];
	while (queue.length > 0) {
		const current = queue.shift() as string;
		for (const edge of edgesFrom.get(current) ?? []) {
			if (reachable.has(edge.to)) continue;
			if (!edgeIsRenderPath(edge)) continue;
			reachable.add(edge.to);
			queue.push(edge.to);
		}
	}

	/**
	 * Ре-экспорт проносит имя дальше: если бочка B ре-экспортирует X из файла F,
	 * то рендер `<X/>` в достижимом импортёре бочки — это рендер F.X. Без этого
	 * шага компонент за бочкой числился бы объявленным и нерендерящимся.
	 */
	function reexportAliases(
		file: string,
		componentName: string,
	): ImportBinding[] {
		const aliases: ImportBinding[] = [];
		for (const edge of edgesTo.get(file) ?? []) {
			if (edge.kind !== "reexport") continue;
			for (const binding of edge.bindings) {
				if (binding.imported === componentName || binding.imported === "*") {
					aliases.push({
						imported: edge.from,
						local: binding.local === "*" ? componentName : binding.local,
					});
				}
			}
		}
		return aliases;
	}

	function bindersOf(
		file: string,
		component: ComponentDeclaration,
		onlyReachable: boolean,
	) {
		const result: Array<{ edge: ResolvedEdge; local: string }> = [];
		for (const edge of edgesTo.get(file) ?? []) {
			if (edge.kind === "type") continue;
			if (onlyReachable && !reachable.has(edge.from)) continue;
			for (const binding of edge.bindings) {
				const matchesName = binding.imported === component.name;
				const matchesDefault =
					binding.imported === "default" && component.isDefaultExport;
				const matchesNamespace = binding.imported === "*";
				if (matchesName || matchesDefault || matchesNamespace) {
					result.push({
						edge,
						local: binding.local === "*" ? component.name : binding.local,
					});
				}
			}
		}
		// Через бочку: имя приходит из ре-экспортирующего модуля.
		for (const alias of reexportAliases(file, component.name)) {
			for (const edge of edgesTo.get(alias.imported) ?? []) {
				if (edge.kind === "type") continue;
				if (onlyReachable && !reachable.has(edge.from)) continue;
				for (const binding of edge.bindings) {
					if (binding.imported === alias.local || binding.imported === "*") {
						result.push({
							edge,
							local: binding.local === "*" ? alias.local : binding.local,
						});
					}
				}
			}
		}
		return result;
	}

	const verdicts: ComponentVerdict[] = [];
	for (const file of [...componentFiles].sort()) {
		const fileFacts = facts.get(file) as FileFacts;
		const incoming = (edgesTo.get(file) ?? []).filter(
			(edge) => edge.kind !== "type",
		);
		const fileReachable = reachable.has(file);

		for (const component of fileFacts.components) {
			const base = { file, name: component.name, line: component.line };

			if (fileReachable) {
				const binders = bindersOf(file, component, true);
				const renderedAsTag =
					fileFacts.jsxTags.has(component.name) ||
					binders.some(
						({ edge, local }) =>
							facts.get(edge.from)?.jsxTags.has(local) === true,
					);
				const renderedAsValue = binders.some(
					({ edge, local }) =>
						facts.get(edge.from)?.valueRefs.has(local) === true,
				);
				const renderedViaLazy = binders.some(
					({ edge }) => edge.kind === "lazy",
				);

				if (renderedAsTag || file === ENTRY) {
					verdicts.push({ ...base, state: "rendered", detail: "" });
				} else if (renderedViaLazy) {
					const where = [
						...new Set(
							binders
								.filter(({ edge }) => edge.kind === "lazy")
								.map(({ edge }) => `${edge.from}:${edge.line}`),
						),
					].join(", ");
					verdicts.push({
						...base,
						state: "rendered-via-lazy-route",
						detail: `ленивая цель маршрута из ${where}`,
					});
				} else if (renderedAsValue) {
					verdicts.push({
						...base,
						state: "rendered-by-value-only",
						detail: "передают пропом или в createElement, тегом JSX не ставят",
					});
				} else {
					verdicts.push({
						...base,
						state: "declared-but-never-rendered",
						detail:
							"файл достижим от main.tsx, но это имя не встречается ни в одном достижимом файле",
					});
				}
				continue;
			}

			if (incoming.length === 0) {
				verdicts.push({
					...base,
					state: "orphaned",
					detail: "ни один файл приложения не импортирует этот модуль",
				});
				continue;
			}
			const rendersSomewhere = incoming.some(
				(edge) => edgeIsRenderPath(edge) && edgeUsesTarget(edge),
			);
			if (rendersSomewhere) {
				const where = [
					...new Set(
						incoming
							.filter((edge) => edgeUsesTarget(edge))
							.map((edge) => `${edge.from}:${edge.line}`),
					),
				].join(", ");
				verdicts.push({
					...base,
					state: "rendered-only-inside-an-unreachable-tree",
					detail: `рендерится из ${where}, но от ${ENTRY} до этой ветки дороги нет`,
				});
				continue;
			}
			verdicts.push({
				...base,
				state: "imported-but-never-rendered",
				detail: `импортируют, но не рендерят: ${[...new Set(incoming.map((edge) => `${edge.from}:${edge.line}`))].join(", ")}`,
			});
		}
	}

	const nameOwners = new Map<string, Set<string>>();
	for (const verdict of verdicts) {
		if (!nameOwners.has(verdict.name)) nameOwners.set(verdict.name, new Set());
		(nameOwners.get(verdict.name) as Set<string>).add(verdict.file);
	}
	const duplicateComponentNames = [...nameOwners]
		.filter(([, owners]) => owners.size > 1)
		.map(([name]) => name)
		.sort();

	cached = {
		entry: ENTRY,
		scannedFiles: files.length,
		parsedFiles: facts.size,
		componentFiles: componentFiles.size,
		verdicts,
		reachableFiles: reachable,
		facts,
		duplicateComponentNames,
		wallClockMs: Date.now() - startedAt,
	};
	return cached;
}
