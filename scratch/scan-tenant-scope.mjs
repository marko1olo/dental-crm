/**
 * Ищет запросы к таблицам, у которых есть organization_id, но в условии
 * WHERE он не участвует.
 *
 * Класс дефекта: клиника A запрашивает объект по идентификатору и
 * получает объект клиники B. Идентификаторы — uuid, угадать нельзя, но
 * утечка возможна через любые перебор, экспорт, лог или ошибку в связке
 * идентификаторов. Для медицинских данных это худший из возможных
 * дефектов.
 *
 * Эвристика: в файлах apps/api/src/db ищем цепочки
 * `.from(schema.X)` ... `.where(...)` и смотрим, встречается ли внутри
 * условия organizationId. Отдельно помечаем update/delete — там утечка
 * означает не чтение чужого, а порчу чужого.
 *
 * Это статический поиск, каждый кандидат требует проверки глазами:
 * часть запросов законно работает без привязки к организации
 * (справочники, служебные таблицы, вложенные подзапросы).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DB_DIR = "apps/api/src/db";
const SCHEMA_FILE = join(DB_DIR, "schema.ts");

// Какие таблицы вообще привязаны к организации.
const schemaText = readFileSync(SCHEMA_FILE, "utf8");
const orgScoped = new Set();
{
	const re = /export const (\w+) = pgTable\("(\w+)",\s*\{([\s\S]*?)\n\}\)/g;
	let m;
	while ((m = re.exec(schemaText))) {
		const [, exportName, , body] = m;
		if (/organizationId\s*:/.test(body)) orgScoped.add(exportName);
	}
}
console.log(`Таблиц с organizationId: ${orgScoped.size}\n`);

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.ts$/.test(entry) && entry !== "schema.ts") out.push(full);
	}
	return out;
}

const findings = [];
for (const file of [...walk(DB_DIR), ...walk("apps/api/src/routes")]) {
	const text = readFileSync(file, "utf8");
	const lines = text.split(/\r?\n/);

	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		// Читающие запросы.
		const fromMatch = /\.from\(schema\.(\w+)\)/.exec(line);
		// Пишущие запросы.
		const writeMatch = /\.(update|delete)\(schema\.(\w+)\)/.exec(line);
		const table = fromMatch?.[1] || writeMatch?.[2];
		if (!table || !orgScoped.has(table)) continue;

		// Условие может растянуться на несколько строк — берём окно.
		const window = lines.slice(i, Math.min(i + 12, lines.length)).join("\n");
		const upTo = window.split(/;\s*$/m)[0] || window;
		if (!/\.where\(/.test(upTo)) {
			// Запрос без where: чтение всей таблицы через все клиники.
			if (fromMatch && !/\.from\(schema\.\w+\)\s*$/.test(line.trim())) continue;
			findings.push({
				file: relative(process.cwd(), file).replace(/\\/g, "/"),
				line: i + 1,
				table,
				kind: writeMatch ? writeMatch[1] : "select",
				reason: "нет WHERE вообще",
				code: line.trim().slice(0, 96),
			});
			continue;
		}
		if (/organizationId/.test(upTo)) continue;
		findings.push({
			file: relative(process.cwd(), file).replace(/\\/g, "/"),
			line: i + 1,
			table,
			kind: writeMatch ? writeMatch[1] : "select",
			reason: "WHERE есть, organizationId в нём нет",
			code: line.trim().slice(0, 96),
		});
	}
}

const writes = findings.filter((f) => f.kind !== "select");
const reads = findings.filter((f) => f.kind === "select");

console.log(`Кандидатов всего: ${findings.length} (записи ${writes.length}, чтения ${reads.length})`);
for (const group of [
	["ЗАПИСЬ БЕЗ ПРИВЯЗКИ К КЛИНИКЕ", writes],
	["ЧТЕНИЕ БЕЗ ПРИВЯЗКИ К КЛИНИКЕ", reads],
]) {
	const [title, list] = group;
	if (!list.length) continue;
	console.log(`\n===== ${title}: ${list.length} =====`);
	let lastFile = "";
	for (const f of list) {
		if (f.file !== lastFile) {
			console.log(`\n--- ${f.file}`);
			lastFile = f.file;
		}
		console.log(`  ${f.line}  [${f.table}] ${f.reason}`);
		console.log(`        ${f.code}`);
	}
}
