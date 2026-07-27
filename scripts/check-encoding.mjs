#!/usr/bin/env node
/**
 * check-encoding.mjs — проверка кодировки исходников.
 *
 * ЗАЧЕМ. 26 июля 2026 года в 13:31 вспомогательный скрипт прочитал
 * apps/api/src/routes/telegram.ts как UTF-8, хотя файл лежал в CP1251, и
 * записал результат обратно. 10 554 символа кириллицы превратились в символ
 * замены U+FFFD — весь русский текст Telegram-бота, включая тот, что уходит
 * пациентам. Порча попала в коммит и пролежала незамеченной: компилятор её не
 * видит, тесты тоже, а глазами такое находят уже по жалобе пациента.
 *
 * Текст восстановлен из git (блоб 8ae0eb72…, SHA-1 сошёлся), но сам класс
 * ошибки никуда не делся: в корне репозитория лежит больше десятка разовых
 * скриптов (fix.py, fix2.py, patch.mjs, patch_sample.cjs …), которые
 * переписывают исходники целиком.
 *
 * Проверка ловит три вещи:
 *   1. файл не является корректным UTF-8 (обычно значит CP1251);
 *   2. в файле есть символ замены U+FFFD — след уже случившейся потери;
 *   3. в файле есть «мохибака» — UTF-8, прочитанный как cp1252: кириллица в
 *      UTF-8 начинается с байтов D0/D1, и в cp1252 они выглядят как латинские
 *      «D с чертой» и «N с тильдой», за которыми идёт знак из верхней половины
 *      таблицы.
 *
 * Сами искомые символы в этом файле НЕ записаны буквально — только escape-
 * последовательностями, иначе проверка сработала бы на собственном исходнике.
 *
 * Запуск:  node scripts/check-encoding.mjs
 * Код возврата 1, если что-то найдено, — можно ставить в pre-commit и в CI.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	".data",
	"pglite-data",
	"temp-test-db",
	"test-results",
	".postgres",
	"screenshots",
]);
const CHECKED_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".css", ".html", ".sql"];

const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);
// U+00D0 и U+00D1 — это байты D0/D1 (начало кириллицы в UTF-8), показанные как
// cp1252. За ними в такой мохибаке всегда идёт знак из верхней половины таблицы.
const MOJIBAKE_PATTERN = new RegExp("[\\u00D0\\u00D1][\\u0080-\\u00BF\\u0402-\\u045F\\u2018-\\u201E\\u20AC\\u2122]");

/** UTF-8 без «мусорных» замен: декодируем строго и сравниваем обратный путь. */
function decodeStrictUtf8(buffer) {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
	} catch {
		return null;
	}
}

function* walk(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			yield* walk(join(directory, entry.name));
			continue;
		}
		if (!entry.isFile()) continue;
		if (!CHECKED_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) continue;
		yield join(directory, entry.name);
	}
}

const problems = [];
let checked = 0;

for (const filePath of walk(repoRoot)) {
	// Файлы больше 8 МБ — это не исходники, а выгрузки и логи.
	if (statSync(filePath).size > 8 * 1024 * 1024) continue;
	checked += 1;
	const buffer = readFileSync(filePath);
	const relativePath = relative(repoRoot, filePath).replaceAll("\\", "/");

	const text = decodeStrictUtf8(buffer);
	if (text === null) {
		problems.push({
			file: relativePath,
			kind: "не UTF-8",
			detail: "файл не декодируется как UTF-8 — скорее всего он в CP1251; перекодируйте его",
		});
		continue;
	}

	const replacementIndex = text.indexOf(REPLACEMENT_CHARACTER);
	if (replacementIndex >= 0) {
		const line = text.slice(0, replacementIndex).split("\n").length;
		const total = text.split(REPLACEMENT_CHARACTER).length - 1;
		problems.push({
			file: relativePath,
			kind: "потерянный текст",
			detail: `символ замены U+FFFD встречается ${total} раз, первый — строка ${line}. Текст утрачен, восстанавливать из git`,
		});
		continue;
	}

	const mojibake = MOJIBAKE_PATTERN.exec(text);
	if (mojibake) {
		const line = text.slice(0, mojibake.index).split("\n").length;
		problems.push({
			file: relativePath,
			kind: "мохибака",
			detail: `строка ${line}: похоже, UTF-8 был прочитан как cp1252 («${text.slice(mojibake.index, mojibake.index + 12)}»)`,
		});
	}
}

if (problems.length === 0) {
	console.log(`Кодировка в порядке: проверено ${checked} файлов, замечаний нет.`);
	process.exit(0);
}

console.error(`Найдены проблемы с кодировкой (${problems.length}) среди ${checked} файлов:\n`);
for (const problem of problems) {
	console.error(`  [${problem.kind}] ${problem.file}`);
	console.error(`      ${problem.detail}`);
}
console.error(
	"\nВосстановить исходный текст можно из git, например:\n" +
		"  git log --oneline -- <файл>\n" +
		"  git show <коммит-до-порчи>:<путь-к-файлу> > /tmp/clean.ts\n" +
		"Если файл в CP1251 — перекодируйте его в UTF-8, а не читайте как UTF-8 с заменой символов.",
);
process.exit(1);
