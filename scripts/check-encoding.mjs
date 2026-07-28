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
	// Added 2026-07-28: the sanctioned agent scratch area (rule 9). Transient by
	// definition, and it legitimately held a UTF-16 .tsx file plus two mojibake
	// probe scripts. Policing scratch is what kept this gate unwireable.
	"scratch",
]);

/**
 * Files whose JOB is to contain the damage this gate hunts: repair implementations,
 * their test fixtures, detector regexes, and the agent notes that document a real
 * incident. Exempt from the mojibake and U+FFFD rules only - every one of them must
 * still be valid UTF-8, and a BOM is never allowed anywhere.
 *
 * Added 2026-07-28. Before this, the gate flagged 14 such files, so it could not be
 * wired into any script or hook and therefore never ran. A gate that cannot be
 * enabled protects nothing.
 *
 * A file may also opt itself out by carrying the literal `encoding-check: fixture`
 * anywhere in its text, with the reason on the same line. Grep that marker to audit
 * every exemption.
 */
const FIXTURE_ALLOWLIST = new Map([
	["apps/api/src/text/repairMojibake.test.ts", "tests the repair, must carry damaged samples"],
	["apps/api/src/tests/repairMojibake.test.ts", "same, integration side"],
	["apps/api/src/migration/encoding.ts", "the source-encoding detector itself"],
	["apps/api/src/migration/parsers/index.ts", "flags rows containing U+FFFD as suspect"],
	["apps/api/src/migration/tests/parsers.test.ts", "asserts damage detection"],
	["apps/api/src/migration/tests/valueNormalize.test.ts", "asserts damage detection"],
	["scripts/smoke-api-text-encoding.mjs", "encoding smoke test, holds detector regexes"],
	["scripts/smoke-telegram-validation.mjs", "detector char class after the telegram.ts incident"],
	[".agents/archon/cycle1.workflow.js", "agent notes explaining a real mojibake finding"],
	[".agents/archon/RECON_DOSSIER.md", "dossier that documents this gate's own findings"],
	[".agents/archon/packets/S3-aijobs-index-and-ram/encoding-check.cjs", "packet-local encoding probe"],
]);
const FIXTURE_MARKER = "encoding-check: fixture";
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

	// BOM check, added 2026-07-28. A byte-level audit found 13 files carrying a UTF-8
	// BOM - write_to_file never produces one, so each came from another editor - and
	// this gate could not see any of them. A BOM also breaks tooling that expects a
	// bare prefix. It is checked before the UTF-8 decode because a BOM decodes fine
	// and would otherwise pass silently.
	if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
		problems.push({
			file: relativePath,
			kind: "BOM",
			detail: "UTF-8 BOM в начале файла — перезапишите файл как UTF-8 без BOM",
		});
		continue;
	}
	if ((buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff)) {
		problems.push({
			file: relativePath,
			kind: "UTF-16",
			detail: "файл в UTF-16 — перекодируйте в UTF-8; однобайтовый декодер превратит его в мусор",
		});
		continue;
	}

	const text = decodeStrictUtf8(buffer);
	if (text === null) {
		problems.push({
			file: relativePath,
			kind: "не UTF-8",
			detail: "файл не декодируется как UTF-8 — скорее всего он в CP1251; перекодируйте его",
		});
		continue;
	}

	// Fixtures are exempt from the damage rules only. Validity and BOM still apply,
	// which is why this check sits after those two.
	if (FIXTURE_ALLOWLIST.has(relativePath) || text.includes(FIXTURE_MARKER)) {
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
