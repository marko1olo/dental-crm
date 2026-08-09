/**
 * Статический импорт на файл, которого нет в репозитории.
 *
 * ЗАЧЕМ. Файл лежит в рабочем дереве, но в индекс не попал. На машине автора
 * всё собирается, typecheck зелёный, тесты идут. У всех остальных — и в CI из
 * чистого клона — сборки нет вовсе: модуля не существует.
 *
 * Класс не выдуманный, измерено 2026-08-09 на этом дереве. Коммит 6aaa97b3d
 * добавил в apps/web/src/useAppLogic.tsx:179 импорт
 * ./hooks/domains/usePricelistLogic и вызов на строке 819, а сам файл оставил
 * незакоммиченным. Пять коммитов подряд собирались только потому, что файл
 * лежал в рабочем дереве. `git clean` уничтожил бы его без следа.
 *
 * ПОЧЕМУ ЭТОГО НЕ ВИДНО НИ ОДНИМ СУЩЕСТВУЮЩИМ ИНСТРУМЕНТОМ — четыре
 * независимые слепые зоны, и каждая слепа по построению:
 *
 *   1. `tsc` разрешает модули ЧЕРЕЗ ФАЙЛОВУЮ СИСТЕМУ. Файл на диске есть,
 *      значит ошибки нет. Про git компилятор не знает ничего.
 *   2. `check-dynamic-imports.mjs` спрашивает `existsSync` — ровно та же
 *      слепота, только для динамических импортов.
 *   3. `check-tracked-ignored.mjs` решает ОБРАТНУЮ задачу: отслеживается
 *      вопреки .gitignore. Здесь наоборот — не отслеживается вопреки импорту.
 *   4. `git status` показал бы untracked-файл, но в этом дереве их 60+ (мусор
 *      агентов: ast-remove-*.cjs, diff.txt, lines300.txt). Один нужный файл в
 *      этом шуме неотличим от мусора — именно так его и потеряли.
 *
 * КАК СЧИТАЕТСЯ. Список отслеживаемых путей берётся из `git ls-tree -r HEAD`,
 * а не с диска. Для каждого отслеживаемого .ts/.tsx/.mts/.cts файла из HEAD
 * разбирается ЕГО ЖЕ содержимое из HEAD (`git show`), а не рабочая копия:
 * иначе гейт судил бы о коммите по незакоммиченным правкам.
 *
 * ПОЧЕМУ AST, А НЕ ПОИСК ТЕКСТА. Первый заход был на регулярном выражении и
 * дал 102 находки, из которых настоящей была ОДНА. Ложные приходили из двух
 * источников, и оба неустранимы текстовым поиском:
 *   - спецификатор `../AppHelpers.js` в TypeScript разрешается в
 *     `AppHelpers.ts` (так ESM-импорты и пишутся в TS);
 *   - строковые литералы ВНУТРИ кода тестовых утилит
 *     (tests/utils/componentReachability.ts собирает искусственный модуль из
 *     строк `"./X"`, `"./App"`) регулярным выражением неотличимы от импортов.
 * Поэтому обход идёт по узлам ImportDeclaration / ExportDeclaration /
 * dynamic-import, а разрешение повторяет правила TypeScript.
 *
 * Только чтение. Ненулевой код возврата при находках.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SCANNED_PREFIXES = [
	"apps/api/src/",
	"apps/web/src/",
	"packages/shared/src/",
	"scripts/",
];

function git(args) {
	return execFileSync("git", args, {
		cwd: ROOT,
		encoding: "utf8",
		maxBuffer: 1 << 28,
	});
}

/*
 * Порядок расширений повторяет разрешение модулей в TypeScript: сначала точное
 * совпадение (для .json и .css), затем .ts/.tsx/.d.ts, затем каталог с index.
 * Отдельная ветка для `.js` -> `.ts` обязательна: в ESM-проекте на TypeScript
 * импорты пишутся с расширением .js, а на диске лежит .ts.
 */
function resolveCandidates(spec, fromFile) {
	const base = path.posix.normalize(
		path.posix.join(path.posix.dirname(fromFile), spec),
	);
	const out = [base];
	const jsLike = /\.(js|jsx|mjs|cjs)$/.exec(base);
	if (jsLike) {
		const stem = base.slice(0, -jsLike[0].length);
		const swap = { js: "ts", jsx: "tsx", mjs: "mts", cjs: "cts" }[jsLike[1]];
		out.push(`${stem}.${swap}`, `${stem}.ts`, `${stem}.tsx`, `${stem}.d.ts`);
	} else {
		out.push(
			`${base}.ts`,
			`${base}.tsx`,
			`${base}.d.ts`,
			`${base}.mts`,
			`${base}.cts`,
			`${base}.js`,
			`${base}.mjs`,
			`${base}.cjs`,
			`${base}.json`,
			`${base}/index.ts`,
			`${base}/index.tsx`,
			`${base}/index.js`,
			`${base}/index.mjs`,
		);
	}
	return out;
}

/* Спецификаторы импорта берутся из узлов, а не из текста. */
function importSpecifiers(sourceFile) {
	const found = [];
	function visit(node) {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			found.push(node.moduleSpecifier);
		} else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments.length > 0 &&
			ts.isStringLiteral(node.arguments[0])
		) {
			found.push(node.arguments[0]);
		}
		node.forEachChild(visit);
	}
	visit(sourceFile);
	return found;
}

function scan(trackedSet, readFile, files) {
	const findings = [];
	for (const file of files) {
		let text;
		try {
			text = readFile(file);
		} catch {
			continue;
		}
		const sourceFile = ts.createSourceFile(
			file,
			text,
			ts.ScriptTarget.Latest,
			true,
			/\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
		);
		for (const literal of importSpecifiers(sourceFile)) {
			const spec = literal.text;
			if (!spec.startsWith(".")) continue;
			const candidates = resolveCandidates(spec, file);
			if (candidates.some((candidate) => trackedSet.has(candidate))) continue;
			const line =
				sourceFile.getLineAndCharacterOfPosition(literal.getStart(sourceFile))
					.line + 1;
			findings.push({ file, line, spec, candidates });
		}
	}
	return findings;
}
/*
 * САМОПРОВЕРКА. Гейт, чей обход сломан, печатает «нарушений нет» — ровно то же,
 * что исправный гейт на чистом дереве. Отличить их можно только корпусом, где
 * заранее известен ответ, поэтому корпус держит и нарушения, и почти-нарушения:
 * последние и есть настоящий риск, потому что первый заход на регулярном
 * выражении дал 101 ложное срабатывание именно на них.
 */
function selfCheck() {
	const tracked = new Set([
		"app/src/a.ts",
		"app/src/b.tsx",
		"app/src/lib/util.ts",
		"app/src/dir/index.ts",
		"app/src/data.json",
	]);
	const corpus = {
		"app/src/case.ts": [
			/* ДОЛЖНЫ молчать */
			'import { a } from "./a";',
			'import { u } from "./lib/util.js";', // .js -> .ts, обычай ESM в TS
			'import { b } from "./b.js";', // .js -> .tsx
			'import { d } from "./dir";', // каталог -> index.ts
			'import data from "./data.json";',
			'import { useState } from "react";', // пакет, не относительный
			'export { a } from "./a";',
			'const fake = "./nowhere";', // строка в коде, НЕ импорт
			'const tpl = ["./X", "./App"].join("");', // фикстура tests/utils
			/* ДОЛЖНЫ найтись — ровно три */
			'import { g } from "./ghost";',
			'export { h } from "./lib/ghost.js";',
			'const m = await import("./dyn-ghost");',
		].join("\n"),
	};
	const findings = scan(tracked, (f) => corpus[f], Object.keys(corpus));
	const got = findings.map((f) => f.spec).sort();
	const want = ["./dyn-ghost", "./ghost", "./lib/ghost.js"];
	const ok =
		got.length === want.length && got.every((s, i) => s === want[i]);
	if (!ok) {
		console.error("САМОПРОВЕРКА ПРОВАЛЕНА — обход или разрешение путей сломаны.");
		console.error(`  ожидалось: ${want.join(", ")}`);
		console.error(`  получено:  ${got.join(", ") || "(пусто)"}`);
		process.exit(2);
	}
	console.log(
		"самопроверка: .js->.ts, каталог->index, пакеты и строки в коде не считаются нарушением; призрачные импорты находятся",
	);
}

selfCheck();

/*
 * Ревизия задаётся аргументом, по умолчанию HEAD. Это не удобство, а
 * обязательное условие проверяемости: гейт, который умеет смотреть только на
 * HEAD, нельзя доказать иначе как переписыванием истории. Доказательство на
 * этом дереве (только чтение, ничего не портит):
 *   node scripts/check-imports-in-git.mjs 424b8ce65   -> 1, находит дефект
 *   node scripts/check-imports-in-git.mjs 009fa9e6d   -> 0, дефект закрыт
 */
const REF = process.argv[2] ?? "HEAD";

const trackedFiles = git(["ls-tree", "-r", REF, "--name-only"])
	.split("\n")
	.map((line) => line.trim())
	.filter(Boolean);
const trackedSet = new Set(trackedFiles);

const targets = trackedFiles.filter(
	(file) =>
		SCANNED_PREFIXES.some((prefix) => file.startsWith(prefix)) &&
		/\.(ts|tsx|mts|cts)$/.test(file),
);

/*
 * Содержимое берётся из HEAD, а не с диска: гейт судит о коммите, а не о
 * незакоммиченных правках. Иначе он бы промолчал ровно в том случае, ради
 * которого написан, — файл на диске есть, в коммите его нет.
 */
const findings = scan(trackedSet, (file) => git(["show", `${REF}:${file}`]), targets);

console.log(`ревизия:                            ${REF}`);
console.log(`отслеживаемых файлов:               ${trackedFiles.length}`);
console.log(`из них разобрано (ts/tsx):          ${targets.length}`);
console.log(`импортов на файл вне репозитория:   ${findings.length}`);

if (findings.length > 0) {
	console.error("");
	console.error("ИМПОРТ ВЕДЁТ НА ФАЙЛ, КОТОРОГО НЕТ В РЕПОЗИТОРИИ:");
	for (const finding of findings) {
		console.error(`  ${finding.file}:${finding.line} -> ${finding.spec}`);
	}
	console.error("");
	console.error(
		"Файл существует на вашей машине, но не в git: из чистого клона сборки нет.",
	);
	console.error("Проверьте `git status --short` и выполните `git add` для нужного файла.");
	process.exit(1);
}

console.log("");
console.log("каждый статический импорт ведёт на файл, который есть в репозитории");
