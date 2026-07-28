/**
 * ЧИТАЮЩАЯ проверка (ничего не пишет в исходники).
 *
 * scripts/check-css-tokens.mjs отвечает «0 имён не разрешается», потому что
 * считает запас `var(--x, значение)` закрытием вхождения. Для СВЕТЛОЙ темы это
 * верно, а для тёмной и ночной — нет: если имя не объявлено НИГДЕ, в любой теме
 * рисуется запас. Когда запас — светлый hex, блок остаётся светлым в ночной
 * теме, и текст ночной палитры на нём исчезает.
 *
 * Здесь считается именно это: имена, не объявленные ни в одном css/js, но
 * используемые с запасом, и светлость самого запаса.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const webSrc = join(repoRoot, "apps/web/src");
const SKIP = new Set(["node_modules", "dist", "build", ".vite"]);

function* walk(dir, exts) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP.has(entry.name)) continue;
			yield* walk(join(dir, entry.name), exts);
			continue;
		}
		if (exts.some((e) => entry.name.endsWith(e))) yield join(dir, entry.name);
	}
}
const rel = (p) => relative(repoRoot, p).replaceAll("\\", "/");

function blankComments(source) {
	let out = "";
	let i = 0;
	while (i < source.length) {
		const start = source.indexOf("/*", i);
		if (start < 0) {
			out += source.slice(i);
			break;
		}
		out += source.slice(i, start);
		let end = source.indexOf("*/", start + 2);
		end = end < 0 ? source.length : end + 2;
		for (const ch of source.slice(start, end)) out += ch === "\n" ? "\n" : " ";
		i = end;
	}
	return out;
}
const lineOf = (source, offset) => source.slice(0, offset).split("\n").length;

const CSS_DECLARATION = /(?:^|[{;}])\s*(--[\w-]+)\s*:/g;
const CSS_AT_PROPERTY = /@property\s+(--[\w-]+)/g;
const CSS_VAR_USE = /\bvar\(\s*(--[\w-]+)/g;

const cssFiles = [...walk(webSrc, [".css"])];
const declared = new Set();
for (const file of cssFiles) {
	const source = blankComments(readFileSync(file, "utf8"));
	for (const pattern of [CSS_DECLARATION, CSS_AT_PROPERTY]) {
		for (const m of source.matchAll(pattern)) declared.add(m[1]);
	}
}
for (const file of walk(webSrc, [".ts", ".tsx"])) {
	const source = readFileSync(file, "utf8");
	const sf = ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		false,
		file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const visit = (node) => {
		const lit = (n) =>
			n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && n.text.startsWith("--") ? n.text : null;
		if (ts.isPropertyAssignment(node) || ts.isPropertySignature(node)) {
			const key = ts.isComputedPropertyName(node.name) ? node.name.expression : node.name;
			const name = lit(key);
			if (name) declared.add(name);
		} else if (ts.isCallExpression(node)) {
			const callee = node.expression;
			if (
				(ts.isPropertyAccessExpression(callee) && callee.name.text === "setProperty") ||
				(ts.isIdentifier(callee) && callee.text === "setProperty")
			) {
				const name = lit(node.arguments[0]);
				if (name) declared.add(name);
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(sf, visit);
}

/** Запас конкретного var(): текст между первой запятой верхнего уровня и закрывающей скобкой. */
function fallbackAt(source, openParen) {
	let depth = 0;
	let commaAt = -1;
	for (let i = openParen; i < source.length; i += 1) {
		const ch = source[i];
		if (ch === "(") depth += 1;
		else if (ch === ")") {
			depth -= 1;
			if (depth === 0) return commaAt < 0 ? null : source.slice(commaAt + 1, i).trim();
		} else if (ch === "," && depth === 1 && commaAt < 0) commaAt = i;
	}
	return null;
}

/** Светлость запаса: hex/rgb -> яркость 0..1; иначе null. */
function lightness(value) {
	if (!value) return null;
	const hex = value.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
	let r;
	let g;
	let b;
	if (hex) {
		const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
		r = Number.parseInt(h.slice(0, 2), 16);
		g = Number.parseInt(h.slice(2, 4), 16);
		b = Number.parseInt(h.slice(4, 6), 16);
	} else {
		const rgb = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
		if (!rgb) return null;
		[, r, g, b] = rgb.map(Number);
	}
	const norm = [r, g, b].map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

const undeclared = new Map();
let totalUses = 0;
for (const file of cssFiles) {
	const source = blankComments(readFileSync(file, "utf8"));
	for (const m of source.matchAll(CSS_VAR_USE)) {
		totalUses += 1;
		const name = m[1];
		if (declared.has(name)) continue;
		const open = source.indexOf("(", m.index);
		const fb = fallbackAt(source, open);
		if (!undeclared.has(name)) undeclared.set(name, []);
		undeclared.get(name).push({ file: rel(file), line: lineOf(source, m.index), fallback: fb, light: lightness(fb) });
	}
}

const ranked = [...undeclared.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`css-файлов:                       ${cssFiles.length}`);
console.log(`объявлено имён (css + js):        ${declared.size}`);
console.log(`использований var():              ${totalUses}`);
console.log(`имён НЕ ОБЪЯВЛЕНО НИГДЕ:          ${ranked.length}`);
console.log(`их вхождений:                     ${ranked.reduce((s, [, p]) => s + p.length, 0)}`);

const LIGHT = 0.5;
let lightFallbackUses = 0;
console.log(`\nимя | вхождений | из них со СВЕТЛЫМ запасом (яркость > ${LIGHT}) | пример`);
for (const [name, places] of ranked) {
	const lightOnes = places.filter((p) => p.light !== null && p.light > LIGHT);
	lightFallbackUses += lightOnes.length;
	const noFallback = places.filter((p) => !p.fallback);
	const sample = lightOnes[0] || places[0];
	console.log(
		`  ${name.padEnd(24)} ${String(places.length).padStart(3)}x   светлых:${String(lightOnes.length).padStart(3)}   безЗапаса:${String(noFallback.length).padStart(2)}   ${sample.file}:${sample.line} = ${sample.fallback ?? "(запаса нет)"}`,
	);
}
console.log(`\nВСЕГО вхождений со светлым запасом у необъявленного имени: ${lightFallbackUses}`);
console.log("Это и есть «выгоревший токен»: в тёмной и ночной теме рисуется светлый запас.");

/* Сколько в главном файле правил тёмной темы и сколько ночной — на глаз это не считается. */
const main = readFileSync(join(webSrc, "styles/main.css"), "utf8");
const count = (re) => (main.match(re) || []).length;
console.log(`\napps/web/src/styles/main.css (${main.split("\n").length} строк):`);
console.log(`  [data-theme="dark"]  ${count(/\[data-theme="dark"\]/g)}`);
console.log(`  [data-theme="night"] ${count(/\[data-theme="night"\]/g)}`);
console.log(`  html.dark / .dark    ${count(/(?:^|[\s,])(?:html)?\.dark\b/gm)}`);
