/**
 * Ищет поля ввода, которым в начальном состоянии подставлено конкретное
 * значение вместо пустоты.
 *
 * Так на экране «Оплаты» касса открывалась с уже введённой суммой 3800 ₽, а
 * форма возврата — с готовым возвратом на 3800 ₽: остаток демонстрационных
 * данных попал в начальное состояние хранилища. Кассир, не заметив
 * подставленного числа, принимает или возвращает сумму, которой никто не
 * называл.
 *
 * Смотрим поля, где подстановка опасна: суммы, количества, номера документов,
 * даты, ИНН, телефоны. Флаги и режимы показа не трогаем — у них значение по
 * умолчанию нормально.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["apps/web/src/store", "apps/web/src/stores"];
const RISKY_NAME =
	/(amount|sum|price|rub|total|discount|deposit|balance|inn|kpp|ogrn|phone|receipt|number|licence|license|date|count|quantity|pin|password|token)/i;

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, files);
		else if (full.endsWith(".ts") || full.endsWith(".tsx")) files.push(full);
	}
	return files;
}

/**
 * Разрешённые умолчания: это настройки программы, а не данные, которые вводит
 * человек. Подстановка здесь не создаёт риска подписать чужое.
 */
const ALLOWED = new Set([
	"pricelistImageMimeType", // тип файла для загрузки изображения прайса
	"telegramTokenTtlDraft", // срок жизни кода привязки в минутах
]);

const findings = [];
for (const root of ROOTS) {
	let files = [];
	try {
		files = walk(root);
	} catch {
		continue;
	}
	for (const file of files) {
		const source = readFileSync(file, "utf8");
		source.split(/\r?\n/).forEach((line, index) => {
			// Начальное значение вида `имя: "что-то",` — только непустые строки и числа.
			const match = /^\s{2}([A-Za-z_$][\w$]*)\s*:\s*("([^"]+)"|'([^']+)'|(\d+(?:\.\d+)?))\s*,/.exec(line);
			if (!match) return;
			const [, name, , doubleQuoted, singleQuoted, numeric] = match;
			if (!RISKY_NAME.test(name) || ALLOWED.has(name)) return;
			const value = doubleQuoted ?? singleQuoted ?? numeric;
			if (!value || value === "0") return;
			// Подписи и режимы: значение не похоже на введённые данные.
			if (/^(card|cash|online|bank_transfer|ru|en|light|dark|night|auto|all|none|idle|draft)$/i.test(value)) return;
			findings.push({
				file: relative(process.cwd(), file).replace(/\\/g, "/"),
				line: index + 1,
				name,
				value,
			});
		});
	}
}

console.log(`подозрительных подстановок: ${findings.length}\n`);
for (const item of findings) {
	console.log(`  ${item.file}:${item.line}  ${item.name} = ${item.value}`);
}
if (findings.length > 0) process.exit(1);
