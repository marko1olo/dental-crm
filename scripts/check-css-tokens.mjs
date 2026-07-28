#!/usr/bin/env node
/**
 * check-css-tokens.mjs — ищет var(--x), которые не могут разрешиться ни в одной теме.
 *
 * ЗАЧЕМ. Неизвестное имя в var() не роняет сборку и не даёт предупреждения.
 * Объявление просто становится недействительным на этапе вычисления значения
 * (invalid at computed-value time): наследуемое свойство берёт значение
 * родителя, ненаследуемое — начальное. Для `color` это «текст пропал», для
 * `background` — прозрачная плашка. Ни tsc, ни Vite, ни один тест такого не
 * видят; находят глазами на конкретном экране в конкретной теме.
 *
 * ОТКУДА ПРОВЕРКА. В шапке apps/web/src/styles/token-aliases.css записано
 * «19 переменных, 56 вхождений», посчитанные разовым скриптом
 * scratch/scan-undefined-tokens.mjs. Разовый скрипт ничего не охраняет: число в
 * комментарии устаревает молча, а новые неизвестные имена добавляются свободно.
 *
 * ЧТО ЭТА ПРОВЕРКА ДЕЛАЕТ СТРОЖЕ ПРЕДШЕСТВЕННИКА.
 *   1. Запас считается ПО МЕСТУ ИСПОЛЬЗОВАНИЯ, а не по имени. Прежний скрипт,
 *      увидев один раз var(--x, запас), прощал все остальные вхождения var(--x)
 *      без запаса — а именно они и ломаются.
 *   2. Комментарии вырезаются. Иначе примеры дефектов, записанные в шапках самих
 *      css-файлов, считаются и за использование, и за объявление. В token-aliases.css
 *      такие примеры есть.
 *   3. Печатается файл и строка каждого вхождения, а не только имя.
 *   4. Учитываются объявления через @property и имена, выставляемые из JS через
 *      style.setProperty и инлайновые стили, — иначе они дали бы ложную тревогу.
 *
 * Запуск:  node scripts/check-css-tokens.mjs
 * Код возврата 1, если найдено хоть одно вхождение, — годится для pre-commit и CI.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const webSrc = join(repoRoot, "apps/web/src");
/** Область, ради которой проверка написана; остальное тоже проверяется, но помечается отдельно. */
const PRIMARY_SCOPE = "apps/web/src/styles/";

const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".vite"]);

function* walk(directory, extensions) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			yield* walk(join(directory, entry.name), extensions);
			continue;
		}
		if (!entry.isFile()) continue;
		if (extensions.some((extension) => entry.name.endsWith(extension))) yield join(directory, entry.name);
	}
}

const asRepoPath = (filePath) => relative(repoRoot, filePath).replaceAll("\\", "/");

/**
 * Вырезает /* ... *​/ , сохраняя смещения: каждый вырезанный символ заменяется
 * пробелом, переводы строк остаются на местах. Так номера строк не сдвигаются.
 */
function blankComments(source) {
	let result = "";
	let index = 0;
	while (index < source.length) {
		const start = source.indexOf("/*", index);
		if (start < 0) {
			result += source.slice(index);
			break;
		}
		result += source.slice(index, start);
		let end = source.indexOf("*/", start + 2);
		if (end < 0) end = source.length;
		else end += 2;
		for (const character of source.slice(start, end)) result += character === "\n" ? "\n" : " ";
		index = end;
	}
	return result;
}

/** Смещение -> номер строки (1-based). */
function lineIndex(source) {
	const starts = [0];
	for (let i = 0; i < source.length; i++) if (source[i] === "\n") starts.push(i + 1);
	return (offset) => {
		let low = 0;
		let high = starts.length - 1;
		while (low < high) {
			const middle = (low + high + 1) >> 1;
			if (starts[middle] <= offset) low = middle;
			else high = middle - 1;
		}
		return low + 1;
	};
}

/**
 * Есть ли у ЭТОГО var() запасное значение: запятая на верхнем уровне внутри
 * его собственных скобок. Вложенные var(--a, var(--b)) считаются отдельно.
 */
function hasFallbackAt(source, openParenIndex) {
	let depth = 0;
	for (let i = openParenIndex; i < source.length; i++) {
		const character = source[i];
		if (character === "(") depth += 1;
		else if (character === ")") {
			depth -= 1;
			if (depth === 0) return false;
		} else if (character === "," && depth === 1) return true;
	}
	return false;
}

const cssFiles = [...walk(webSrc, [".css"])];

// 1. Объявления: обычные `--x:` и `@property --x`.
const definedInCss = new Map(); // имя -> файлы, где объявлено
for (const filePath of cssFiles) {
	const source = blankComments(readFileSync(filePath, "utf8"));
	for (const match of source.matchAll(/(--[\w-]+)\s*:/g)) {
		if (!definedInCss.has(match[1])) definedInCss.set(match[1], new Set());
		definedInCss.get(match[1]).add(asRepoPath(filePath));
	}
	for (const match of source.matchAll(/@property\s+(--[\w-]+)/g)) {
		if (!definedInCss.has(match[1])) definedInCss.set(match[1], new Set());
		definedInCss.get(match[1]).add(asRepoPath(filePath));
	}
}

// 2. Имена, которые выставляет JS: style.setProperty("--x", …) и инлайновые
//    стили { "--x": … }. Без этого они дали бы ложную тревогу.
const definedInJs = new Set();
for (const filePath of walk(webSrc, [".ts", ".tsx"])) {
	const source = readFileSync(filePath, "utf8");
	for (const match of source.matchAll(/setProperty\(\s*["'`](--[\w-]+)["'`]/g)) definedInJs.add(match[1]);
	for (const match of source.matchAll(/["'`](--[\w-]+)["'`]\s*:/g)) definedInJs.add(match[1]);
}

// 3. Использования: каждое var() отдельно, с местом и признаком запаса.
const offenders = new Map(); // имя -> [{file, line}]
let totalUses = 0;
let usesWithFallback = 0;
const usedNames = new Set();

for (const filePath of cssFiles) {
	const raw = readFileSync(filePath, "utf8");
	const source = blankComments(raw);
	const toLine = lineIndex(source);
	const repoPath = asRepoPath(filePath);
	for (const match of source.matchAll(/\bvar\(\s*(--[\w-]+)/g)) {
		const name = match[1];
		totalUses += 1;
		usedNames.add(name);
		const openParen = source.indexOf("(", match.index);
		if (hasFallbackAt(source, openParen)) {
			usesWithFallback += 1;
			continue;
		}
		if (definedInCss.has(name) || definedInJs.has(name)) continue;
		if (!offenders.has(name)) offenders.set(name, []);
		offenders.get(name).push({ file: repoPath, line: toLine(match.index) });
	}
}

const ranked = [...offenders.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
const occurrences = ranked.reduce((sum, [, places]) => sum + places.length, 0);
const inPrimaryScope = ranked.filter(([, places]) => places.some((place) => place.file.startsWith(PRIMARY_SCOPE)));

console.log(`css-файлов проверено:            ${cssFiles.length}`);
console.log(`объявлено переменных в css:      ${definedInCss.size}`);
console.log(`имён выставляется из js:         ${definedInJs.size}`);
console.log(`использований var():             ${totalUses} (из них с запасом: ${usesWithFallback})`);
console.log(`имён использовано через var():   ${usedNames.size}`);
console.log(`НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ:  ${ranked.length} имён, ${occurrences} вхождений`);
console.log(`  из них затрагивают ${PRIMARY_SCOPE}: ${inPrimaryScope.length} имён`);

if (ranked.length === 0) {
	console.log("\nВсе var() разрешаются: каждое имя объявлено или имеет запасное значение по месту.");
	process.exit(0);
}

console.error("\nНеизвестные имена в var() без запасного значения:\n");
for (const [name, places] of ranked) {
	console.error(`  ${String(places.length).padStart(3)}x  ${name}`);
	for (const place of places) console.error(`         ${place.file}:${place.line}`);
}
console.error(
	"\nКак закрывать. Объявить токен в канонической палитре\n" +
		"  apps/web/src/styles/dente-redesign.css — блоки :root/[data-theme=\"light\"],\n" +
		"  [data-theme=\"dark\"], [data-theme=\"night\"], чтобы значение было во всех трёх темах,\n" +
		"либо, если имя лишнее, заменить его на существующий токен по месту использования.\n" +
		"Запас `var(--x, значение)` закрывает конкретное вхождение, но не остальные:\n" +
		"проверка считает запас по каждому месту отдельно, потому что так работает и CSS.\n" +
		"Зашивать hex по месту использования нельзя — темы разъедутся (см. .agents/UI_STANDARDS.md).",
);
process.exit(1);
