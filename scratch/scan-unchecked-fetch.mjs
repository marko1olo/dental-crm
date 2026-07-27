/**
 * Ищет места, где результат fetch не проверяется, но пользователю всё
 * равно показывают успех.
 *
 * Класс дефекта: сервер вернул 400/403/409/500, клиент этого не заметил,
 * показал «Сохранено» и закрыл форму. Оператор уверен, что данные
 * записаны, а их нет. В клинике это назначение, оплата или отмена
 * приёма, о которых никто не узнает до конфликта.
 *
 * Эвристика: внутри одной функции есть `await fetch(` и следом вызов,
 * сообщающий об успехе (showToast(..., "success"), toast.success, alert
 * с положительным текстом), но между ними нет обращения к `.ok`,
 * `.status` или `throw`.
 *
 * Это статический поиск. Он даёт кандидатов, каждый нужно смотреть
 * глазами: часть срабатываний законна (например, проверка вынесена в
 * общий помощник).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.argv[2] || "apps/web/src";
const SUCCESS = /showToast\(\s*[^)]*?,\s*["']success["']|toast\.success\(|setSuccess\(|"Сохранено"|«Сохранено»/;
const CHECK = /\.ok\b|\.status\b|res\.status|response\.status|throw\b|catch\s*\(|statusCode/;

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) {
			if (entry === "node_modules" || entry === "dist") continue;
			walk(full, out);
		} else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
	}
	return out;
}

const findings = [];
for (const file of walk(ROOT)) {
	const text = readFileSync(file, "utf8");
	if (!text.includes("fetch(")) continue;
	const lines = text.split(/\r?\n/);

	for (let i = 0; i < lines.length; i += 1) {
		if (!/await\s+fetch\(/.test(lines[i])) continue;
		// Окно от вызова до 24 строк вперёд — обычная длина обработчика.
		const window = lines.slice(i, Math.min(i + 24, lines.length));
		const joined = window.join("\n");
		const successAt = window.findIndex((l) => SUCCESS.test(l));
		if (successAt < 0) continue;
		const between = window.slice(0, successAt + 1).join("\n");
		if (CHECK.test(between)) continue;
		findings.push({
			file: relative(process.cwd(), file).replace(/\\/g, "/"),
			line: i + 1,
			fetchLine: lines[i].trim().slice(0, 96),
			successLine: window[successAt].trim().slice(0, 96),
			successOffset: successAt,
			hasJsonParse: /await\s+\w+\.json\(\)/.test(between),
		});
	}
}

findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
console.log(`Кандидатов «успех без проверки ответа»: ${findings.length}\n`);
let lastFile = "";
for (const f of findings) {
	if (f.file !== lastFile) {
		console.log(`\n--- ${f.file}`);
		lastFile = f.file;
	}
	console.log(`  строка ${f.line}: ${f.fetchLine}`);
	console.log(`      +${f.successOffset}: ${f.successLine}`);
}
