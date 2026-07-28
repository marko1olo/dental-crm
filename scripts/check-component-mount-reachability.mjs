#!/usr/bin/env node
/*
 * Достижимость компонентов от настоящей точки монтирования.
 *
 * ЗАЧЕМ. Компонент, который существует, но которого никто не рендерит, невидим
 * для typecheck (он компилируется), невидим для тестов (их на него нет) и
 * невидим для ревьюера, проверившего два звена трёхзвенной цепочки. За эту
 * кампанию класс дефекта всплыл трижды:
 *   1. AppRouter.tsx — 359 строк мёртвого кода, в которые были подключены пять
 *      законченных экранов; открыть их не мог ни один пользователь.
 *   2. Компоненты вынесли из монолита и оставили сиротами — их никто не
 *      импортировал.
 *   3. Починили выбор роли внутри InlineStepRole, проверили два звена цепочки и
 *      выдали сильнейшую метку достижимости. У WorkspaceOnboardingNoticeBars
 *      при этом была ровно ОДНА ссылка на весь репозиторий — его собственное
 *      объявление. Починили мёртвый файл и заверили, что правка дошла до людей.
 *
 * ЧТО СЧИТАЕТСЯ ДОСТИЖИМЫМ. Ровно то, что реально исполняет браузер: обход
 * начинается с единственного входа (main.tsx) и идёт по рёбрам, которые
 * действительно ведут к рендеру. Импорт ради побочного эффекта таким ребром не
 * является — иначе workspacePreload.ts, который строками `import "./XView"`
 * тянет все экраны, отбелил бы весь репозиторий и проверка потеряла бы смысл.
 *
 * ЧЕМ РАЗБИРАЕТСЯ КОД. Только ast-grep (дерево разбора). Регулярка по этому
 * репозиторию уже дважды соврала на многострочных объявлениях: «45 пустых
 * модулей из 50» и «123 pgTable» вместо 126. Если ast-grep недоступен, скрипт
 * падает с инструкцией и НЕ скатывается на текстовый поиск: тихо ошибающийся
 * страж хуже отсутствующего.
 *
 * ЧЕСТНОСТЬ. Скрипт заведомо красный. Ослаблять его до зелёного нельзя: он
 * печатает правдивую опись и выходит с ненулевым кодом. Список исключений —
 * именной, каждая запись с причиной, и добавление записи должно быть спорным
 * решением человека, а не способом убрать красноту.
 *
 * Запуск:  node scripts/check-component-mount-reachability.mjs [--json] [--quiet]
 * Коды:    0 — все компоненты рендерятся; 1 — есть недостижимые; 2 — сам страж
 *          не смог выполнить проверку (нет ast-grep, нет правил, нет входа).
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF_FAILURE_EXIT = 2;
const FINDINGS_EXIT = 1;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/*
 * Топология репозитория, а не настройка развёртывания: порты и креденшелы живут
 * в .env, а вот «где у приложения точка монтирования» — факт исходников, и
 * прятать его в переменные окружения было бы вредно. Одно объявление, с
 * обоснованием каждой строки.
 */
const TOPOLOGY = {
	/** Корень исходников веба; вне него скрипт ничего не судит. */
	sourceRoot: "apps/web/src",
	/**
	 * Единственный настоящий вход: main.tsx вызывает createRoot(...).render().
	 * App.tsx и workspaceShell.tsx корнями НЕ объявлены намеренно — они обязаны
	 * оказаться достижимыми сами, и скрипт это проверяет. Объявив их корнями,
	 * мы бы спрятали ровно ту поломку, которую ищем.
	 */
	entry: "apps/web/src/main.tsx",
	/** Правила ast-grep. Читаются человеком, поэтому вынесены в отдельный файл. */
	rules: "scripts/lib/component-mount-rules.yml",
	/** Расширения, которые вообще участвуют в графе. */
	sourceExtensions: [".ts", ".tsx"],
	/** Каталоги, целиком выпадающие из графа. */
	ignoredDirectories: ["node_modules", "dist", "__snapshots__"],
};

/*
 * Именные исключения. Каждая запись — причина, по которой компонент законно не
 * достижим от main.tsx. Пустой список — нормальное состояние: если исключений
 * нет, значит нет и оправданий.
 *
 * `path` сравнивается как префикс пути от корня репозитория, чтобы можно было
 * закрыть каталог целиком, но только осознанно и с причиной.
 */
const ALLOWLIST = [
	{
		path: "apps/web/src/__tests__/",
		reason:
			"Файлы node:test. Компонент, который рендерит только тест, пользователю не показывается — но и дефектом это не является.",
	},
];

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const quiet = args.has("--quiet");

function fail(message, hint) {
	process.stdout.write(`СТРАЖ НЕ ВЫПОЛНЕН: ${message}\n`);
	if (hint) process.stdout.write(`${hint}\n`);
	process.exit(SELF_FAILURE_EXIT);
}

function toPosix(value) {
	return value.split(path.sep).join("/").replace(/\\/g, "/");
}

// ── 1. Инструмент ───────────────────────────────────────────────────────────
/*
 * .agents/AGENTS.md §8 предписывает `npx @ast-grep/cli`. На этой машине такая
 * форма падает с «could not determine executable to run»: бинарь в пакете
 * называется ast-grep, и npx не выводит его имя из имени скоупнутого пакета.
 * Поэтому перебираем формы по порядку и берём первую работающую — вместо того
 * чтобы падать на форме из документа.
 */
function resolveAstGrep() {
	const candidates = [
		{ command: "ast-grep", prefix: [] },
		{ command: "npx", prefix: ["--no-install", "ast-grep"] },
		{ command: "npx", prefix: ["--no-install", "sg"] },
		{ command: "npx", prefix: ["--yes", "@ast-grep/cli"] },
	];
	for (const candidate of candidates) {
		const probe = spawnSync(
			candidate.command,
			[...candidate.prefix, "--version"],
			{ cwd: repoRoot, encoding: "utf8", shell: true },
		);
		if (probe.status === 0 && /ast-grep|sg\s/i.test(probe.stdout ?? "")) {
			return { ...candidate, version: (probe.stdout ?? "").trim() };
		}
	}
	return null;
}

const astGrep = resolveAstGrep();
if (!astGrep) {
	fail(
		"ast-grep не найден ни одной из форм запуска.",
		"Поставьте его: npm i -g @ast-grep/cli. Текстовым поиском этот скрипт подменять нельзя — регулярка уже дважды дала ложную перепись в этом репозитории.",
	);
}

const rulesPath = path.join(repoRoot, TOPOLOGY.rules);
if (!fs.existsSync(rulesPath)) {
	fail(`не найден файл правил ${TOPOLOGY.rules}.`);
}
const entryRelative = toPosix(TOPOLOGY.entry);
if (!fs.existsSync(path.join(repoRoot, entryRelative))) {
	fail(
		`не найдена точка входа ${entryRelative}.`,
		"Если вход переехал, поправьте TOPOLOGY.entry — но не добавляйте новых корней, чтобы скрыть недостижимость.",
	);
}

// ── 2. Вселенная файлов ─────────────────────────────────────────────────────
/*
 * Нужна отдельно от результатов ast-grep: сироту (файл, который не импортирует
 * никто) видно только на полном списке файлов. Если бы список строился из
 * совпадений, сироты без совпадений просто исчезли бы из отчёта.
 */
function collectSourceFiles(relativeDirectory) {
	const absolute = path.join(repoRoot, relativeDirectory);
	const found = [];
	const stack = [absolute];
	while (stack.length > 0) {
		const current = stack.pop();
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (TOPOLOGY.ignoredDirectories.includes(entry.name)) continue;
				stack.push(path.join(current, entry.name));
				continue;
			}
			if (!entry.isFile()) continue;
			const extension = path.extname(entry.name);
			if (!TOPOLOGY.sourceExtensions.includes(extension)) continue;
			if (entry.name.endsWith(".d.ts")) continue;
			found.push(toPosix(path.relative(repoRoot, path.join(current, entry.name))));
		}
	}
	return found.sort();
}

const universe = new Set(collectSourceFiles(TOPOLOGY.sourceRoot));
if (!universe.has(entryRelative)) {
	fail(`точка входа ${entryRelative} вне ${TOPOLOGY.sourceRoot}.`);
}

function isTestFile(relativePath) {
	return (
		relativePath.includes("/__tests__/") ||
		relativePath.endsWith(".test.ts") ||
		relativePath.endsWith(".test.tsx")
	);
}

function allowlistEntryFor(relativePath) {
	return ALLOWLIST.find((entry) => relativePath.startsWith(entry.path)) ?? null;
}

// ── 3. Разбор ast-grep ──────────────────────────────────────────────────────
const scan = spawnSync(
	astGrep.command,
	[
		...astGrep.prefix,
		"scan",
		"--rule",
		TOPOLOGY.rules,
		"--json=compact",
		TOPOLOGY.sourceRoot,
	],
	{ cwd: repoRoot, encoding: "utf8", shell: true, maxBuffer: 512 * 1024 * 1024 },
);
if (scan.status !== 0 && !scan.stdout) {
	fail(
		`ast-grep вернул ${scan.status}.`,
		(scan.stderr ?? "").trim() || "Пустой stderr.",
	);
}

let matches;
try {
	matches = JSON.parse(scan.stdout || "[]");
} catch (error) {
	fail(`не разобрать JSON от ast-grep: ${error.message}`);
}

/** @type {Map<string, {
 *   components: Array<{name: string, line: number}>,
 *   jsxNames: Set<string>,
 *   valueNames: Set<string>,
 *   imports: Array<object>,
 * }>} */
const records = new Map();
function recordFor(relativePath) {
	let record = records.get(relativePath);
	if (!record) {
		record = {
			components: [],
			jsxNames: new Set(),
			valueNames: new Set(),
			imports: [],
		};
		records.set(relativePath, record);
	}
	return record;
}

/*
 * Спецификаторы приходят массивом узлов вместе с запятыми — это текст из дерева
 * разбора, а не результат разрезания файла регуляркой. Разбирается три формы:
 * `Foo`, `Foo as Bar` и встроенный тип `type Foo` (последний рендером не является).
 */
function parseSpecifiers(multi) {
	const bindings = [];
	for (const node of multi ?? []) {
		const text = (node.text ?? "").trim();
		if (text === "" || text === ",") continue;
		if (text.startsWith("type ")) continue;
		const parts = text.split(/\s+as\s+/);
		const imported = parts[0].trim();
		const local = (parts[1] ?? parts[0]).trim();
		if (imported === "") continue;
		bindings.push({ imported, local });
	}
	return bindings;
}

const IDENTIFIER_ONLY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
let ambiguousDefaultImports = 0;

/*
 * Путь модуля приходит вместе с кавычками, потому что правила берут его
 * метапеременной без кавычек — иначе одинарные кавычки (145 строк в apps/web/src)
 * не совпали бы вовсе. Снимаем ровно одну обрамляющую пару.
 */
function stripQuotes(text) {
	if (typeof text !== "string") return undefined;
	const first = text[0];
	if ((first === '"' || first === "'" || first === "`") && text.endsWith(first)) {
		return text.slice(1, -1);
	}
	return text;
}

/*
 * Путь модуля из текста инструкции `export ... from "..."`. Это не поиск по
 * файлу: текст пришёл целым узлом дерева разбора, а по грамматике поле `source`
 * в export_statement — последний строковый литерал инструкции. Поэтому «взять
 * последнюю строку в кавычках» здесь точная операция, а не догадка.
 */
function extractQuotedSource(statementText) {
	if (typeof statementText !== "string") return undefined;
	const literals = statementText.match(/(["'`])(?:(?!\1).)*\1/g);
	if (!literals || literals.length === 0) return undefined;
	return literals[literals.length - 1];
}

for (const match of matches) {
	const file = toPosix(match.file);
	if (!universe.has(file)) continue;
	const record = recordFor(file);
	const single = match.metaVariables?.single ?? {};
	const multi = match.metaVariables?.multi ?? {};
	const line = (match.range?.start?.line ?? 0) + 1;
	const source = stripQuotes(single.SRC?.text);

	switch (match.ruleId) {
		case "component-decl":
			record.components.push({ name: single.NAME.text, line });
			break;
		case "jsx-name": {
			// `<Namespace.Component />` даёт nested_identifier; графу нужен корень.
			const head = match.text.split(".")[0];
			record.jsxNames.add(head);
			record.valueNames.add(head);
			break;
		}
		case "pascal-ref-tsx":
		case "pascal-ref-ts":
			record.valueNames.add(match.text);
			break;
		case "import-named":
		case "import-named-ts":
			record.imports.push({
				source,
				line,
				kind: "value",
				bindings: parseSpecifiers(multi.SPECS),
			});
			break;
		case "import-type-named":
		case "import-type-named-ts":
			record.imports.push({ source, line, kind: "type", bindings: [] });
			break;
		case "import-default":
		case "import-default-ts": {
			// Шаблон жадный: на `import Def, { A } from "x"` он захватит `Def, { A }`.
			// Такие случаи покрывает import-mixed, поэтому здесь берём только
			// одиночный идентификатор.
			const declared = single.DEF?.text ?? "";
			if (!IDENTIFIER_ONLY.test(declared)) break;
			record.imports.push({
				source,
				line,
				kind: "value",
				bindings: [{ imported: "default", local: declared }],
			});
			break;
		}
		case "import-mixed":
		case "import-mixed-ts":
			record.imports.push({
				source,
				line,
				kind: "value",
				bindings: [
					{ imported: "default", local: single.DEF.text },
					...parseSpecifiers(multi.SPECS),
				],
			});
			break;
		case "import-namespace":
		case "import-namespace-ts":
			record.imports.push({
				source,
				line,
				kind: "namespace",
				bindings: [{ imported: "*", local: single.NS.text }],
			});
			break;
		case "import-side-effect":
		case "import-side-effect-ts":
			record.imports.push({ source, line, kind: "side-effect", bindings: [] });
			break;
		/*
		 * React.lazy существует ровно для того, чтобы отрендерить модуль, поэтому
		 * такое ребро — доказательство рендера само по себе, без поиска тега.
		 * Требовать тег здесь нельзя: AppShell.tsx:6 пишет
		 *   const DentalWorkspace = lazy(() => import("./App").then((m) => ({ default: m.App })));
		 * то есть локальное имя (DentalWorkspace) не совпадает с именем экспорта
		 * (App), и проверка по тегу объявила бы главный компонент приложения
		 * нерендерящимся.
		 */
		case "lazy-target-named":
		case "lazy-target-named-ts":
			record.imports.push({
				source,
				line,
				kind: "lazy",
				viaLazy: true,
				bindings: [{ imported: single.NAME.text, local: single.NAME.text }],
			});
			break;
		case "lazy-target-default":
		case "lazy-target-default-ts":
			record.imports.push({
				source,
				line,
				kind: "lazy",
				viaLazy: true,
				bindings: [{ imported: "default", local: "default" }],
			});
			break;
		/*
		 * Голый динамический импорт — предзагрузка чанка (workspacePreload.ts),
		 * не рендер. Считать её ребром рендера значило бы отбелить все экраны
		 * одним файлом.
		 */
		case "import-dynamic":
		case "import-dynamic-ts":
			record.imports.push({ source, line, kind: "dynamic-preload", bindings: [] });
			break;
		/*
		 * Путь ре-экспорта приходит узлом поля `source`, а не метапеременной,
		 * потому что шаблон с $$$SPECS ast-grep 0.44.1 не принимает. Список имён
		 * из этой формы не достаётся — см. обоснование в файле правил: бочек
		 * компонентов в дереве сейчас нет, замерено.
		 */
		case "reexport-source":
		case "reexport-source-ts": {
			const target = stripQuotes(
				match.metaVariables?.single?.SRC?.text ?? extractQuotedSource(match.text),
			);
			if (target) {
				record.imports.push({ source: target, line, kind: "reexport", bindings: [] });
			}
			break;
		}
		default:
			break;
	}
}

for (const file of universe) recordFor(file);

const componentFiles = new Set(
	[...records].filter(([, record]) => record.components.length > 0).map(([file]) => file),
);

// ── 4. Разрешение модулей ───────────────────────────────────────────────────
/*
 * Только относительные пути ведут внутрь репозитория: `@dental/shared`,
 * `react`, `lucide-react` — внешние и графа не касаются. Расширение `.js` в
 * спецификаторе — стиль TypeScript ESM (в тестах здесь пишут
 * `../workspaceShell.js`), поэтому оно снимается перед подбором.
 */
function resolveSpecifier(fromFile, specifier) {
	if (typeof specifier !== "string" || !specifier.startsWith(".")) return null;
	const joined = path.posix.join(path.posix.dirname(fromFile), specifier);
	const stem = joined.replace(/\.(js|jsx|mjs|cjs)$/, "");
	const candidates = [
		`${stem}.tsx`,
		`${stem}.ts`,
		`${stem}/index.tsx`,
		`${stem}/index.ts`,
		joined,
	];
	for (const candidate of candidates) {
		if (universe.has(candidate)) return candidate;
	}
	return null;
}

/** @type {Array<{from: string, to: string, kind: string, line: number, bindings: Array<object>}>} */
const edges = [];
for (const [file, record] of records) {
	for (const imported of record.imports) {
		const target = resolveSpecifier(file, imported.source);
		if (!target || target === file) continue;
		edges.push({ from: file, to: target, ...imported, resolved: target });
	}
}

const edgesFrom = new Map();
const edgesTo = new Map();
for (const edge of edges) {
	if (!edgesFrom.has(edge.from)) edgesFrom.set(edge.from, []);
	edgesFrom.get(edge.from).push(edge);
	if (!edgesTo.has(edge.to)) edgesTo.set(edge.to, []);
	edgesTo.get(edge.to).push(edge);
}

/*
 * Использует ли файл `edge.from` хоть одну привязку из `edge.to`. Проверяется по
 * именам вне строк импорта — иначе мёртвый импорт выглядел бы живым.
 *
 * Привязки в camelCase (`viewLabels`, `appViews`) правило pascal-ref не
 * собирает, поэтому подтвердить их использование скрипт не может и считает
 * ребро проходимым. Это осознанная граница: мёртвый импорт хука — не тот класс
 * дефекта, который здесь ищут, а вот необоснованно объявить компонент живым
 * нельзя.
 */
function edgeUsesTarget(edge) {
	const record = records.get(edge.from);
	if (!record) return false;
	if (edge.bindings.length === 0) return false;
	let sawPascal = false;
	for (const binding of edge.bindings) {
		if (!/^[A-Z]/.test(binding.local)) return true;
		sawPascal = true;
		if (record.valueNames.has(binding.local)) return true;
	}
	return !sawPascal;
}

function edgeIsRenderPath(edge) {
	switch (edge.kind) {
		case "type":
			return false;
		case "side-effect":
		case "dynamic-preload":
			// Модуль исполнится, компонент не отрендерится. Для не-компонентов
			// (полифилы, регистрация сервис-воркера) это нормальная зависимость.
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

// ── 5. Обход от входа ───────────────────────────────────────────────────────
const reachable = new Set([entryRelative]);
const queue = [entryRelative];
while (queue.length > 0) {
	const current = queue.shift();
	for (const edge of edgesFrom.get(current) ?? []) {
		if (reachable.has(edge.to)) continue;
		if (!edgeIsRenderPath(edge)) continue;
		reachable.add(edge.to);
		queue.push(edge.to);
	}
}

// ── 6. Приговор по каждому компоненту ───────────────────────────────────────
/*
 * Связать привязку импортёра с конкретным компонентом. Импорт по умолчанию не
 * несёт имени экспорта, поэтому: если в файле ровно один компонент — привязка
 * его; если больше — привязка считается относящейся ко всем, а случай попадает
 * в счётчик неоднозначностей, чтобы это не выглядело точным знанием.
 */
function importersBinding(file, componentName, onlyReachable) {
	const result = [];
	for (const edge of edgesTo.get(file) ?? []) {
		if (edge.kind === "type") continue;
		if (onlyReachable && !reachable.has(edge.from)) continue;
		const components = records.get(file).components;
		for (const binding of edge.bindings) {
			if (binding.imported === componentName) {
				result.push({ edge, local: binding.local });
			} else if (binding.imported === "default" || binding.imported === "*") {
				if (components.length > 1) ambiguousDefaultImports += 1;
				result.push({ edge, local: binding.local });
			}
		}
	}
	return result;
}

const STATE = {
	rendered: "rendered",
	renderedViaLazy: "rendered-via-lazy-route",
	renderedByValue: "rendered-by-value-only",
	declaredNeverRendered: "declared-but-never-rendered",
	importedNeverRendered: "imported-but-never-rendered",
	orphaned: "orphaned",
	unreachableSubtree: "rendered-only-inside-an-unreachable-tree",
	testOnly: "reachable-only-from-tests",
};

const verdicts = [];
for (const file of [...componentFiles].sort()) {
	const record = records.get(file);
	const incoming = (edgesTo.get(file) ?? []).filter((edge) => edge.kind !== "type");
	const nonTestIncoming = incoming.filter((edge) => !isTestFile(edge.from));
	const fileReachable = reachable.has(file);

	for (const component of record.components) {
		const base = { file, name: component.name, line: component.line };

		if (fileReachable) {
			const binders = importersBinding(file, component.name, true);
			const renderedAsTag =
				binders.some(({ edge, local }) => records.get(edge.from).jsxNames.has(local)) ||
				record.jsxNames.has(component.name);
			const renderedAsValue = binders.some(({ edge, local }) =>
				records.get(edge.from).valueNames.has(local),
			);
			const renderedViaLazy = binders.some(({ edge }) => edge.viaLazy === true);
			const isEntryComponent = file === entryRelative;
			if (renderedAsTag || isEntryComponent) {
				verdicts.push({ ...base, state: STATE.rendered, detail: "" });
			} else if (renderedViaLazy) {
				verdicts.push({
					...base,
					state: STATE.renderedViaLazy,
					detail: `ленивая цель маршрута из ${[...new Set(binders.filter(({ edge }) => edge.viaLazy).map(({ edge }) => `${edge.from}:${edge.line}`))].join(", ")}`,
				});
			} else if (renderedAsValue) {
				verdicts.push({
					...base,
					state: STATE.renderedByValue,
					detail: "используется как значение (проп/createElement), а не тегом JSX",
				});
			} else {
				verdicts.push({
					...base,
					state: STATE.declaredNeverRendered,
					detail: "файл достижим, но это имя не встречается ни в одном достижимом файле",
				});
			}
			continue;
		}

		if (incoming.length === 0) {
			verdicts.push({
				...base,
				state: STATE.orphaned,
				detail: "ни один файл не импортирует этот модуль",
			});
			continue;
		}
		if (nonTestIncoming.length === 0) {
			verdicts.push({
				...base,
				state: STATE.testOnly,
				detail: `импортируют только тесты: ${[...new Set(incoming.map((edge) => edge.from))].join(", ")}`,
			});
			continue;
		}
		const renderedSomewhere = nonTestIncoming.some(
			(edge) => edgeIsRenderPath(edge) && edgeUsesTarget(edge),
		);
		if (renderedSomewhere) {
			verdicts.push({
				...base,
				state: STATE.unreachableSubtree,
				detail: `рендерится из ${[...new Set(nonTestIncoming.filter((edge) => edgeUsesTarget(edge)).map((edge) => edge.from))].join(", ")}, но эта ветка не связана с ${entryRelative}`,
			});
		} else {
			verdicts.push({
				...base,
				state: STATE.importedNeverRendered,
				detail: `импортируют, но не рендерят: ${[...new Set(nonTestIncoming.map((edge) => `${edge.from}:${edge.line}`))].join(", ")}`,
			});
		}
	}
}

const OK_STATES = new Set([
	STATE.rendered,
	STATE.renderedViaLazy,
	STATE.renderedByValue,
]);
const findings = verdicts.filter((verdict) => {
	if (OK_STATES.has(verdict.state)) return false;
	const allowed = allowlistEntryFor(verdict.file);
	if (allowed) {
		verdict.allowlistReason = allowed.reason;
		return false;
	}
	return true;
});
const allowed = verdicts.filter((verdict) => verdict.allowlistReason);

const counts = {};
for (const verdict of verdicts) {
	counts[verdict.state] = (counts[verdict.state] ?? 0) + 1;
}

// ── 7. Опись ────────────────────────────────────────────────────────────────
const summary = {
	entry: entryRelative,
	astGrepVersion: astGrep.version,
	scannedFiles: universe.size,
	componentFiles: componentFiles.size,
	componentsDeclared: verdicts.length,
	reachableFiles: reachable.size,
	appTsxReachable: reachable.has("apps/web/src/App.tsx"),
	workspaceShellReachable: reachable.has("apps/web/src/workspaceShell.tsx"),
	counts,
	allowlisted: allowed.length,
	findings: findings.length,
	ambiguousDefaultImports,
};

if (asJson) {
	process.stdout.write(`${JSON.stringify({ summary, findings, allowed }, null, 2)}\n`);
} else {
	const ORDER = [
		STATE.rendered,
		STATE.renderedViaLazy,
		STATE.renderedByValue,
		STATE.declaredNeverRendered,
		STATE.importedNeverRendered,
		STATE.orphaned,
		STATE.unreachableSubtree,
		STATE.testOnly,
	];
	const TITLES = {
		[STATE.rendered]: "РЕНДЕРИТСЯ — импортируют и ставят тегом JSX в достижимом файле",
		[STATE.renderedViaLazy]: "РЕНДЕРИТСЯ ЛЕНИВО — React.lazy тянет модуль ради рендера",
		[STATE.renderedByValue]: "РЕНДЕРИТСЯ ЗНАЧЕНИЕМ — передают пропом/createElement, тегом не ставят",
		[STATE.declaredNeverRendered]: "ОБЪЯВЛЕН, НО НЕ РЕНДЕРИТСЯ — файл достижим, имя не используется нигде",
		[STATE.importedNeverRendered]: "ИМПОРТИРУЮТ, НО НЕ РЕНДЕРЯТ — хуже сироты: выглядит подключённым",
		[STATE.orphaned]: "СИРОТА — не импортирует никто",
		[STATE.unreachableSubtree]: "РЕНДЕРИТСЯ ВНУТРИ НЕДОСТИЖИМОЙ ВЕТКИ — та самая ловушка: два звена цепочки живы, третьего нет",
		[STATE.testOnly]: "ДОСТИЖИМ ТОЛЬКО ИЗ ТЕСТОВ",
	};

	process.stdout.write("ДОСТИЖИМОСТЬ КОМПОНЕНТОВ ОТ ТОЧКИ МОНТИРОВАНИЯ\n");
	process.stdout.write(`точка входа            : ${summary.entry}\n`);
	process.stdout.write(`ast-grep               : ${summary.astGrepVersion}\n`);
	process.stdout.write(`просмотрено файлов     : ${summary.scannedFiles}\n`);
	process.stdout.write(`файлов с компонентами  : ${summary.componentFiles}\n`);
	process.stdout.write(`компонентов объявлено  : ${summary.componentsDeclared}\n`);
	process.stdout.write(`файлов достижимо       : ${summary.reachableFiles}\n`);
	process.stdout.write(`App.tsx достижим       : ${summary.appTsxReachable ? "да" : "НЕТ"}\n`);
	process.stdout.write(`workspaceShell достижим: ${summary.workspaceShellReachable ? "да" : "НЕТ"}\n`);
	if (summary.ambiguousDefaultImports > 0) {
		process.stdout.write(
			`импортов по умолчанию с неоднозначной привязкой: ${summary.ambiguousDefaultImports} (в файле больше одного компонента — привязка считалась ко всем)\n`,
		);
	}
	process.stdout.write("\nПО СОСТОЯНИЯМ\n");
	for (const state of ORDER) {
		process.stdout.write(`  ${String(counts[state] ?? 0).padStart(4)}  ${state}\n`);
	}

	if (!quiet) {
		for (const state of ORDER) {
			if (OK_STATES.has(state)) continue;
			const group = verdicts.filter((verdict) => verdict.state === state);
			if (group.length === 0) continue;
			process.stdout.write(`\n${TITLES[state]} (${group.length})\n`);
			for (const verdict of group) {
				const mark = verdict.allowlistReason ? "разрешено" : "НАРУШЕНИЕ";
				process.stdout.write(`  [${mark}] ${verdict.file}:${verdict.line} ${verdict.name}\n`);
				if (verdict.detail) process.stdout.write(`      ${verdict.detail}\n`);
				if (verdict.allowlistReason) {
					process.stdout.write(`      причина исключения: ${verdict.allowlistReason}\n`);
				}
			}
		}
	}

	process.stdout.write(
		`\nИТОГ: нарушений ${findings.length}, в исключениях ${allowed.length}.\n`,
	);
	if (findings.length > 0) {
		process.stdout.write(
			"Ослаблять проверку до зелёного нельзя. Либо смонтировать компонент, либо удалить его, либо внести в ALLOWLIST с причиной, которую можно защитить.\n",
		);
	}
}

process.exit(findings.length > 0 ? FINDINGS_EXIT : 0);
