/*
 * Замер вырезанного движка сканирования папки. Файл временный.
 *
 * Отвечает на один вопрос: сколько кода реально удалили и что он тянет за собой.
 * Без этого «восстановить движок» — не задача, а лозунг.
 */
import { readFileSync, writeFileSync } from "node:fs";

const OLD = process.argv[2];
const lines = readFileSync(OLD, "utf8").split("\n");

/** Конец функции по балансу фигурных скобок от строки объявления. */
function extent(startLine) {
	let depth = 0;
	let seen = false;
	for (let i = startLine - 1; i < lines.length; i += 1) {
		for (const ch of lines[i]) {
			if (ch === "{") {
				depth += 1;
				seen = true;
			} else if (ch === "}") depth -= 1;
		}
		if (seen && depth === 0) return i + 1;
	}
	return -1;
}

const starts = [];
lines.forEach((line, index) => {
	if (
		/^\s*(?:async\s+)?function\s+(?:runBrowserImagingFolderScan|scanBrowserDirectoryHandle|scanBrowserFileList)\s*\(/.test(
			line,
		)
	)
		starts.push(index + 1);
});

let total = 0;
const bodies = [];
for (const start of starts) {
	const end = extent(start);
	total += end - start + 1;
	const body = lines.slice(start - 1, end).join("\n");
	bodies.push(body);
	console.log(
		`строки ${start}-${end}  (${end - start + 1})  ${lines[start - 1].trim().slice(0, 58)}`,
	);
}
console.log(`\nИТОГО тела движка: ${total} строк`);

const engine = bodies.join("\n\n");
writeFileSync(process.argv[3], engine);

/* Что движок использует извне — это и есть цена восстановления. */
const externals = new Set();
for (const m of engine.matchAll(/\b([a-z][A-Za-z0-9_]{3,})\s*\(/g)) externals.add(m[1]);
const declaredInside = new Set();
for (const m of engine.matchAll(/(?:function|const|let)\s+([A-Za-z_$][\w$]*)/g))
	declaredInside.add(m[1]);
const needed = [...externals].filter((n) => !declaredInside.has(n)).sort();
console.log(`\nвызывает извне (${needed.length}):`);
console.log(needed.join(", "));
