/**
 * Ищет эффекты, которые загружают данные по идентификатору сущности, но
 * не сбрасывают состояние при его смене и не отменяют устаревший запрос.
 *
 * Тот же дефект, что был исправлен в шести виджетах карточки пациента:
 * пользователь переключается с объекта А на объект Б, эффект уходит за
 * данными Б, а на экране всё это время висят данные А — без признака
 * загрузки. Если ответ по А приходит позже ответа по Б, он перетирает
 * свежие данные, и на карточке Б навсегда остаются данные А.
 *
 * Признаки дефекта в одном эффекте:
 *   есть fetch;
 *   в списке зависимостей есть идентификатор (*Id);
 *   нет AbortController и нет флага отмены (cancelled/ignore/active);
 *   нет сброса состояния в начале эффекта.
 *
 * Отдельно считаем те, что уже пользуются готовым хуком
 * usePatientResource — там всё это уже сделано.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "apps/web/src";

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "node_modules" || entry === "dist") continue;
			walk(full, out);
		} else if (/\.tsx?$/.test(entry)) out.push(full);
	}
	return out;
}

const findings = [];
let usesHook = 0;

for (const file of walk(ROOT)) {
	const text = readFileSync(file, "utf8");
	if (!text.includes("useEffect")) continue;
	if (text.includes("usePatientResource")) usesHook += 1;
	const lines = text.split(/\r?\n/);

	for (let i = 0; i < lines.length; i += 1) {
		if (!/useEffect\(/.test(lines[i])) continue;
		// Собираем тело эффекта до строки с закрывающим `}, [...]`.
		let end = -1;
		for (let j = i; j < Math.min(i + 90, lines.length); j += 1) {
			if (/^\s*\}\s*,\s*\[.*\]\s*\)\s*;?\s*$/.test(lines[j])) {
				end = j;
				break;
			}
		}
		if (end < 0) continue;
		const body = lines.slice(i, end + 1).join("\n");
		if (!/fetch\(/.test(body)) continue;

		const deps = /\}\s*,\s*\[([^\]]*)\]\s*\)/.exec(body)?.[1] ?? "";
		// Интересуют эффекты, зависящие от идентификатора сущности.
		if (!/\w*[Ii]d\b/.test(deps)) continue;

		const hasAbort = /AbortController|signal/.test(body);
		const hasCancelFlag = /\b(cancelled|canceled|ignore|isActive|isMounted|stale)\b/.test(body);
		const resetsState = /set\w+\(\s*(\[\s*\]|null|\{\s*\}|emptyValue|undefined)\s*\)/.test(body.slice(0, 400));

		if (hasAbort || hasCancelFlag) continue;

		findings.push({
			file: relative(process.cwd(), file).replace(/\\/g, "/"),
			line: i + 1,
			deps: deps.replace(/\s+/g, " ").trim().slice(0, 56),
			resetsState,
			lines: end - i + 1,
		});
	}
}

findings.sort((a, b) => Number(a.resetsState) - Number(b.resetsState) || a.file.localeCompare(b.file));
const worst = findings.filter((f) => !f.resetsState);

console.log(`Файлов, уже использующих usePatientResource: ${usesHook}`);
console.log(`Эффектов с fetch по идентификатору без отмены запроса: ${findings.length}`);
console.log(`из них ещё и без сброса состояния (видны данные прошлой сущности): ${worst.length}\n`);

let lastFile = "";
for (const f of findings) {
	if (f.file !== lastFile) {
		console.log(`--- ${f.file}`);
		lastFile = f.file;
	}
	console.log(`  строка ${String(f.line).padStart(5)}  зависимости [${f.deps}]  ${f.resetsState ? "состояние сбрасывает" : "СОСТОЯНИЕ НЕ СБРАСЫВАЕТ"}`);
}
