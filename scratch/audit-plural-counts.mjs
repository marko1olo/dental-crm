/**
 * Ищет счётчики без склонения: «1 снимка», «0 документа», «21 записей».
 *
 * Число рядом с существительным в русском требует трёх форм. Без них экран
 * читается как ошибка программы, и доверие к остальным цифрам падает. В
 * проекте есть общий помощник countLabel в AppHelpers — находки надо перевести
 * на него.
 *
 * Ищем подстановку числа, за которой сразу идёт существительное: `{n} снимка`,
 * `${n} записей`, `{list.length} документа`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "apps/web/src";
const SKIP = new Set(["node_modules", "dist", "tests", "__snapshots__"]);

/** Существительные, которые в проекте стоят рядом с числом. */
const NOUNS = [
	"снимок", "снимка", "снимков",
	"документ", "документа", "документов",
	"запись", "записи", "записей",
	"прием", "приема", "приемов", "приём", "приёма", "приёмов",
	"пациент", "пациента", "пациентов",
	"задача", "задачи", "задач",
	"позиция", "позиции", "позиций",
	"строка", "строки", "строк",
	"платеж", "платежа", "платежей", "платёж", "платежа",
	"услуга", "услуги", "услуг",
	"кресло", "кресла", "кресел",
	"врач", "врача", "врачей",
	"сообщение", "сообщения", "сообщений",
	"шаблон", "шаблона", "шаблонов",
	"файл", "файла", "файлов",
	"минута", "минуты", "минут",
	"день", "дня", "дней",
	"предупреждение", "предупреждения", "предупреждений",
];

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		if (SKIP.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, files);
		else if (full.endsWith(".tsx") || full.endsWith(".ts")) files.push(full);
	}
	return files;
}

const nounPattern = NOUNS.join("|");
/*
 * Подстановка значения, затем пробел и существительное. Ловим и JSX-выражения
 * `{x} снимка`, и шаблонные строки `${x} снимка`.
 */
const PATTERN = new RegExp(
	// `{x} снимка`, `${x} снимка`, а также `{a.b.c} записей` внутри JSX.
	`(\\$?\\{[^{}]{1,80}\\})\\s*(?:·\\s*)?(${nounPattern})(?![\\wа-яё])`,
	"gi",
);

const findings = [];
for (const file of walk(ROOT)) {
	const source = readFileSync(file, "utf8");
	source.split(/\r?\n/).forEach((line, index) => {
		// Строки, где уже используется склонение, пропускаем.
		if (/countLabel|ruCount|pluralize/.test(line)) return;
		for (const match of line.matchAll(PATTERN)) {
			findings.push({
				file: relative(process.cwd(), file).replace(/\\/g, "/"),
				line: index + 1,
				text: `${match[1]} ${match[2]}`.slice(0, 70),
			});
		}
	});
}

console.log(`счётчиков без склонения: ${findings.length}\n`);
for (const item of findings) {
	console.log(`  ${item.file}:${item.line}  ${item.text}`);
}
