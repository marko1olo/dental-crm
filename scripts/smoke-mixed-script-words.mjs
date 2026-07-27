/**
 * Ищет слова, в которых кириллица смешана с латиницей.
 *
 * Такие слова выглядят правильно, но ими нельзя пользоваться: поиск по тексту
 * их не находит, программа чтения с экрана произносит их неверно, а сортировка
 * ставит не туда. Проверка кодировки (smoke:web-text-encoding) их не ловит:
 * мойибаки нет, байты валидные.
 *
 * Пример, с которого проверка началась: aria-label «Тема интерфейcа» —
 * предпоследняя буква латинская c вместо кириллической с.
 *
 * Похожие по виду буквы: a c e o p x y A B C E H K M O P T X.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["apps/web/src", "apps/api/src", "packages/shared/src"];
const EXTENSIONS = [".ts", ".tsx", ".css"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".vite", "coverage", "__snapshots__"]);

/** Латинские буквы, неотличимые от кириллических на вид. */
const CONFUSABLE_LATIN = "aceopxyABCEHKMOPTX";
/*
 * Слово, где есть хотя бы одна кириллическая буква и хотя бы одна латинская
 * буква из списка похожих. Слова целиком латиницей и целиком кириллицей
 * проходят.
 */
const WORD = /[A-Za-zА-Яа-яЁё]{2,}/g;

/*
 * Ищем только внутри строковых литералов. В коде полно диапазонов символов
 * вида [а-яёa-z] и регулярных выражений, где смесь алфавитов — это норма, а не
 * дефект: там латиница и кириллица стоят рядом намеренно.
 */
const STRING_LITERAL = /"([^"\\\n]|\\.)*"|'([^'\\\n]|\\.)*'|`([^`\\]|\\.)*`/g;

/** Похоже на регулярное выражение или на диапазон символов, а не на текст. */
function looksLikePattern(literal) {
	return /[[\]\\^$|]|\{\d|\.\*|\.\+|\(\?/.test(literal);
}

function stringLiteralsOf(line) {
	return [...line.matchAll(STRING_LITERAL)]
		.map((match) => match[0].slice(1, -1))
		.filter((literal) => !looksLikePattern(literal));
}

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) walk(full, files);
		else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) files.push(full);
	}
	return files;
}

/**
 * Разрешённые исключения: там смесь алфавитов — это данные, а не текст.
 *
 * Названия колонок чужих баз пишутся так, как они в этих базах есть: если в
 * старой МИС колонка называется «зубformula», сопоставление обязано искать
 * ровно эту строку, иначе импорт её не найдёт.
 */
const ALLOWED = [
	{ file: "apps/api/src/migration/vendorProfiles.ts", word: "зубformula" },
];

const findings = [];
const allowed = [];
let checkedFiles = 0;

for (const root of ROOTS) {
	let files = [];
	try {
		files = walk(root);
	} catch {
		continue;
	}
	for (const file of files) {
		checkedFiles += 1;
		const source = readFileSync(file, "utf8");
		const lines = source.split(/\r?\n/);
		lines.forEach((line, index) => {
			for (const literal of stringLiteralsOf(line)) {
				for (const match of literal.matchAll(WORD)) {
					const word = match[0];
					if (!/[А-Яа-яЁё]/.test(word)) continue;
					const latinChars = [...word].filter((ch) => CONFUSABLE_LATIN.includes(ch));
					if (latinChars.length === 0) continue;
					const relativePath = relative(process.cwd(), file).replace(/\\/g, "/");
					const finding = {
						file: relativePath,
						line: index + 1,
						word,
						latin: [...new Set(latinChars)].join(""),
					};
					if (ALLOWED.some((rule) => rule.file === relativePath && rule.word === word)) {
						allowed.push(finding);
						continue;
					}
					findings.push(finding);
				}
			}
		});
	}
}

const report = {
	ok: findings.length === 0,
	checkedFiles,
	mixedScriptWords: findings.length,
	allowedByRule: allowed.length,
	findings: findings.slice(0, 40),
};
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
