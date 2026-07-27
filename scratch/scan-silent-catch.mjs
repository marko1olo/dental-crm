/**
 * Ищет обработчики ошибок, которые превращают сбой в правдоподобный
 * пустой результат.
 *
 * `catch { return [] }` на чтении означает: запрос к базе упал, а
 * интерфейс показал «ничего не найдено». Для клиники это не мелочь —
 * «аллергий нет», «противопоказаний нет», «неоплаченных счетов нет»
 * выглядят как факт, хотя на самом деле данные просто не пришли.
 *
 * `catch { return null }` и `catch { return false }` в тех же местах —
 * то же самое.
 *
 * Отдельно помечаем catch, где не логируется вообще ничего: такой сбой
 * не оставляет следа даже в журнале.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIRS = ["apps/api/src/db", "apps/api/src/routes", "apps/api/src/services"];

function walk(dir, out = []) {
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.ts$/.test(entry) && !/\.test\.ts$/.test(entry)) out.push(full);
	}
	return out;
}

const findings = [];
for (const file of DIRS.flatMap((d) => walk(d))) {
	const text = readFileSync(file, "utf8");
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i += 1) {
		if (!/\}\s*catch\b/.test(lines[i])) continue;
		// Тело catch: до 6 строк, обычно оно короткое.
		const body = lines.slice(i, Math.min(i + 7, lines.length));
		const joined = body.join("\n");
		const closing = joined.indexOf("\n\t}");
		const scope = closing > 0 ? joined.slice(0, closing) : joined;

		const emptyish = /return\s*(\[\s*\]|null|false|undefined|\{\s*\})\s*;?/.exec(scope);
		if (!emptyish) continue;
		const logged = /console\.(error|warn)|request\.log|app\.log|logger\./.test(scope);
		findings.push({
			file: relative(process.cwd(), file).replace(/\\/g, "/"),
			line: i + 1,
			returns: emptyish[1].replace(/\s+/g, ""),
			logged,
			catchLine: lines[i].trim().slice(0, 70),
			next: (body[1] || "").trim().slice(0, 76),
		});
	}
}

const silent = findings.filter((f) => !f.logged);
console.log(`Обработчиков, превращающих сбой в пустой результат: ${findings.length}`);
console.log(`из них без записи в журнал: ${silent.length}\n`);

const byFile = new Map();
for (const f of findings) {
	if (!byFile.has(f.file)) byFile.set(f.file, []);
	byFile.get(f.file).push(f);
}
for (const [file, list] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
	console.log(`--- ${file} (${list.length})`);
	for (const f of list) {
		console.log(`  ${String(f.line).padStart(5)}  возвращает ${f.returns.padEnd(9)} ${f.logged ? "в журнал пишет" : "МОЛЧА"}   ${f.next}`);
	}
}
