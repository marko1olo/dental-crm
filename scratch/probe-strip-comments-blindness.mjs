/**
 * Сколько регистраций маршрутов теряет старое вырезание комментариев.
 *
 * ЗАЧЕМ. Субагент заявил, что гейт охраны не видит POST /api/imaging/visiograph-ai,
 * и предположил причину: `stripComments` съедает часть routes/imaging.ts. Я нашёл
 * в файле строку заголовка Accept со «звёздочка-слэш-звёздочка» и починил разбор,
 * но общее число охраняемых маршрутов в гейте не изменилось. Значит утверждать
 * «починил» нельзя, пока не измерено. Здесь считается ровно это: сколько
 * регистраций видно до и после.
 *
 * ТОЛЬКО ЧТЕНИЕ.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "apps/api/src/routes";
const REGISTRATION = /\bapp\.(get|post|put|patch|delete)\s*\(\s*["'`](\/api\/[^"'`]*)["'`]/g;

/** Прежний способ: два регулярных выражения. */
function stripOld(text) {
	return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Новый способ: посимвольный проход, строковые литералы не трогаются. */
function stripNew(text) {
	let out = "";
	let index = 0;
	let quote = null;
	while (index < text.length) {
		const char = text[index];
		const next = text[index + 1];
		if (quote) {
			if (char === "\\") {
				out += char + (next ?? "");
				index += 2;
				continue;
			}
			if (char === quote) quote = null;
			out += char;
			index += 1;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			out += char;
			index += 1;
			continue;
		}
		if (char === "/" && next === "*") {
			const end = text.indexOf("*/", index + 2);
			const stop = end === -1 ? text.length : end + 2;
			out += text.slice(index, stop).replace(/[^\n]/g, "");
			index = stop;
			continue;
		}
		if (char === "/" && next === "/") {
			const end = text.indexOf("\n", index);
			index = end === -1 ? text.length : end;
			continue;
		}
		out += char;
		index += 1;
	}
	return out;
}

function count(text) {
	return [...text.matchAll(REGISTRATION)].length;
}

let totalOld = 0;
let totalNew = 0;
const losses = [];
for (const entry of readdirSync(DIR)) {
	if (!entry.endsWith(".ts")) continue;
	const raw = readFileSync(join(DIR, entry), "utf8");
	const oldCount = count(stripOld(raw));
	const newCount = count(stripNew(raw));
	totalOld += oldCount;
	totalNew += newCount;
	if (newCount !== oldCount) losses.push({ entry, oldCount, newCount });
}

console.log(`регистраций видно старым способом: ${totalOld}`);
console.log(`регистраций видно новым способом:  ${totalNew}`);
console.log(`разница:                            ${totalNew - totalOld}`);
if (losses.length === 0) {
	console.log("\nни одного файла с расхождением — старый способ ничего не терял");
} else {
	console.log("\nфайлы, где старый способ терял регистрации:");
	for (const item of losses) {
		console.log(`  ${item.entry}: было видно ${item.oldCount}, стало ${item.newCount}`);
	}
}
