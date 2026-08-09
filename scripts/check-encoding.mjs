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
 * Проверка ловит четыре вещи:
 *   1. файл не является корректным UTF-8 (обычно значит CP1251);
 *   2. в файле есть символ замены U+FFFD — след уже случившейся потери;
 *   3. в файле есть «мохибака» — UTF-8, прочитанный как cp1252: кириллица в
 *      UTF-8 начинается с байтов D0/D1, и в cp1252 они выглядят как латинские
 *      «D с чертой» и «N с тильдой», за которыми идёт знак из верхней половины
 *      таблицы.
 *   4. в файле есть мохибака ДРУГОГО РОДА — UTF-8, прочитанный как cp1251.
 *      Добавлено 2026-08-06: те же байты D0/D1 в cp1251 — это уже не «D с
 *      чертой» и «N с тильдой», а КИРИЛЛИЧЕСКИЕ «Р» и «С», поэтому правило 3
 *      не видит такую порчу вообще. Коммит b5e76d8a0 перекодировал так
 *      apps/api/src/routes/diary.ts целиком — 3314 отрезков, включая текст
 *      отказов, который врач читает на экране, — а гейт дал EXIT=0 на 6063
 *      файлах.
 *
 * Сами искомые символы в этом файле НЕ записаны буквально — только escape-
 * последовательностями, иначе проверка сработала бы на собственном исходнике.
 *
 * Запуск:  node scripts/check-encoding.mjs
 * Код возврата 1, если что-то найдено, — можно ставить в pre-commit и в CI.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
	[
		"apps/api/src/text/repairMojibake.test.ts",
		"tests the repair, must carry damaged samples",
	],
	["apps/api/src/tests/repairMojibake.test.ts", "same, integration side"],
	["apps/api/src/migration/encoding.ts", "the source-encoding detector itself"],
	[
		"apps/api/src/migration/parsers/index.ts",
		"flags rows containing U+FFFD as suspect",
	],
	["apps/api/src/migration/tests/parsers.test.ts", "asserts damage detection"],
	[
		"apps/api/src/migration/tests/valueNormalize.test.ts",
		"asserts damage detection",
	],
	[
		"scripts/smoke-api-text-encoding.mjs",
		"encoding smoke test, holds detector regexes",
	],
	[
		"scripts/smoke-telegram-validation.mjs",
		"detector char class after the telegram.ts incident",
	],
	[
		".agents/archon/cycle1.workflow.js",
		"agent notes explaining a real mojibake finding",
	],
	[
		".agents/archon/RECON_DOSSIER.md",
		"dossier that documents this gate's own findings",
	],
	[
		".agents/archon/packets/S3-aijobs-index-and-ram/encoding-check.cjs",
		"packet-local encoding probe",
	],
]);
/**
 * Исключения ТОЛЬКО из правила 4 (cp1251). Добавлено 2026-08-06.
 *
 * Список намеренно отдельный от FIXTURE_ALLOWLIST выше: тот снимает сразу все
 * правила порчи, а эти файлы обязаны и дальше проверяться на U+FFFD и на
 * cp1252-мохибаку. Каждый открыт и проверен вручную — во всех шести флаг ставит
 * ЦИТАТА порчи, а не живой текст: рабочих строк, которые кто-то читает с
 * экрана, здесь нет, ни один из файлов не компилируется и не импортируется.
 * Без этого списка правило 4 даёт 6 «падений» не по делу и гейт снова
 * становится невключаемым — ровно та ошибка, из-за которой он не работал до
 * 2026-07-28.
 */
const CP1251_FIXTURE_ALLOWLIST = new Map([
	[
		".agents/AGENTS.md",
		"раздел «Признаки мождибаке» — 4 показательных примера порчи (строки 161, 237, 238, 241)",
	],
	[
		".agents/archon/packets/U6-state-snapshot-writes/review.md",
		"строка 158: набор образцов, по которым агент искал порчу",
	],
	[
		".agents/archon/packets/C3-nav-rail-unlabelled/review.md",
		"строка 143: разбор регулярки-детектора из AGENTS.md",
	],
	[
		".agents/archon/packets/C1-dicom-wrong-study/review.md",
		"строка 111: цитата испорченного текста в отчёте о находке",
	],
	[
		"artifacts/debug_final.html",
		"снимок DOM от 2026-07-23: страница тогда отдавала порчу, это улика",
	],
	[
		"scripts/smoke-workspace-live-core-actions.mjs",
		"строка 828: регулярка смоука намеренно ловит ОБЕ формы слова, чистую и испорченную, чтобы видеть порчу в живом UI",
	],
]);
const FIXTURE_MARKER = "encoding-check: fixture";
const CHECKED_EXTENSIONS = [
	".ts",
	".tsx",
	".js",
	".mjs",
	".cjs",
	".json",
	".md",
	".css",
	".html",
	".sql",
];

const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);
// U+00D0 и U+00D1 — это байты D0/D1 (начало кириллицы в UTF-8), показанные как
// cp1252. За ними в такой мохибаке всегда идёт знак из верхней половины таблицы.
const MOJIBAKE_PATTERN =
	/[\u00D0\u00D1][\u0080-\u00BF\u0402-\u045F\u2018-\u201E\u20AC\u2122]/;

/**
 * ПРАВИЛО 4: cp1251-мохибака. Добавлено 2026-08-06.
 *
 * ПОЧЕМУ ОТДЕЛЬНАЯ ПРОВЕРКА, А НЕ РАСШИРЕНИЕ MOJIBAKE_PATTERN. Регулярка выше
 * ищет байты D0/D1, показанные как cp1252 (U+00D0/U+00D1). Если те же байты
 * показать как cp1251, получатся U+0420 и U+0421 — обычные кириллические буквы,
 * и ни одно условие правила 3 на них не срабатывает. Тем же слеп и round-trip
 * из .agents/AGENTS.md: он гоняет текст через latin1, а latin1 обрезает U+0420
 * до байта 0x20 (пробел) и уничтожает улику ещё ДО декодирования. На полностью
 * испорченном diary.ts тот round-trip печатает mojibake:false.
 *
 * КАК ЛОВИМ. Обратный ход через ТОТ кодек, которым текст прочитали неправильно:
 * берём максимальный отрезок символов, представимых в cp1251 байтами >= 0x80,
 * кодируем его обратно в cp1251 и пробуем декодировать строгим UTF-8.
 *
 * ПОЧЕМУ НЕ ДАЁТ ЛОЖНЫХ СРАБАТЫВАНИЙ. Регулярка, удалённая из конституции
 * 2026-07-28 (лидер U+0420/U+0421 плюс любой знак U+0080..U+00FF), была опасна
 * тем, что решала по ПАРЕ символов: «Т»+«°», «м»+«µ» — обычный технический
 * русский, 55 ложных срабатываний в одном pdf.ts. Здесь решает не шаблон, а
 * четыре независимых условия сразу:
 *   - отрезок не короче 4 символов. Это убивает двухсимвольные «Её», «ЕЁ» и
 *     «В»+кавычка, на которых ломается любая парная эвристика: замерено, без
 *     этого условия по дереву всплывает 67 файлов вместо 4;
 *   - байты отрезка декодируются строгим UTF-8 БЕЗ ОШИБКИ. Настоящее русское
 *     слово в cp1251 почти всегда даёт невалидный UTF-8 и отсеивается само;
 *   - результат СТРОГО короче исходника (мохибака всегда раздувает текст);
 *   - в результате не меньше двух кириллических букв и нет управляющих знаков.
 *
 * Замерено на этом дереве: 0 срабатываний на чистом блобе diary.ts из коммита
 * 69a1100fe (2229 строк русского текста) и 0 на остальных 6000+ файлах.
 */
const CP1251_HIGH =
	"ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏ" +
	"ђ‘’“”•–—™љ›њќћџ" +
	" ЎўЈ¤Ґ¦§Ё©Є«¬­®Ї" +
	"°±Ііґµ¶·ё№є»јЅѕї" +
	"АБВГДЕЖЗИЙКЛМНОП" +
	"РСТУФХЦЧШЩЪЫЬЭЮЯ" +
	"абвгдежзийклмноп" +
	"рстуфхцчшщъыьэюя";
if (CP1251_HIGH.length !== 128) {
	// Таблица содержит один невидимый символ (байт 0x98). Любой редактор, который
	// его «почистит», сдвинет всё, что идёт после, и правило 4 молча ослепнет на
	// всей кириллице. Падаем громко, а не тихо пропускаем порчу.
	throw new Error(
		`CP1251_HIGH повреждена: ${CP1251_HIGH.length} символов вместо 128`,
	);
}
const CP1251_REVERSE = new Map();
for (let index = 0; index < CP1251_HIGH.length; index += 1) {
	CP1251_REVERSE.set(CP1251_HIGH[index], 0x80 + index);
}
/**
 * Дешёвый предфильтр. Кириллица в UTF-8 всегда начинается с байта D0..D3, а в
 * cp1251 это U+0420..U+0423. Без такого ведущего символа кириллического
 * мохибаке не бывает, поэтому посимвольный разбор запускается на единицах
 * файлов, а не на всех шести тысячах.
 */
const CP1251_LEAD_PROBE = new RegExp(
	"[\\u0420-\\u0423][" + CP1251_HIGH.slice(0, 0x40) + "]",
);
const CP1251_MIN_RUN = 4;
const CP1251_MIN_CYRILLIC = 2;
const CYRILLIC_LETTER = /[\u0400-\u04FF]/g;
const UNPRINTABLE =
	/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/;

/** Отрезок cp1251-мохибаки -> исходный текст, либо null, если это не порча. */
function decodeCp1251Run(run) {
	const bytes = [];
	for (const character of run) {
		const byte = CP1251_REVERSE.get(character);
		if (byte === undefined) return null;
		bytes.push(byte);
	}
	const decoded = decodeStrictUtf8(Buffer.from(bytes));
	if (decoded === null || decoded === run) return null;
	if ([...decoded].length >= [...run].length) return null;
	if (UNPRINTABLE.test(decoded)) return null;
	const cyrillic = decoded.match(CYRILLIC_LETTER);
	if (cyrillic === null || cyrillic.length < CP1251_MIN_CYRILLIC) return null;
	return decoded;
}

/** Первый отрезок cp1251-мохибаки в тексте и общее число отрезков. */
function findCp1251Mojibake(text) {
	if (!CP1251_LEAD_PROBE.test(text)) return null;
	const characters = [...text];
	let first = null;
	let total = 0;
	let index = 0;
	while (index < characters.length) {
		if (!CP1251_REVERSE.has(characters[index])) {
			index += 1;
			continue;
		}
		let end = index;
		while (end < characters.length && CP1251_REVERSE.has(characters[end]))
			end += 1;
		if (end - index >= CP1251_MIN_RUN) {
			const run = characters.slice(index, end).join("");
			const decoded = decodeCp1251Run(run);
			if (decoded !== null) {
				total += 1;
				if (first === null) {
					first = {
						run,
						decoded,
						offset: characters.slice(0, index).join("").length,
					};
				}
			}
		}
		index = end;
	}
	return first === null
		? null
		: { run: first.run, decoded: first.decoded, offset: first.offset, total };
}

/** UTF-8 без «мусорных» замен: декодируем строго и сравниваем обратный путь. */
function decodeStrictUtf8(buffer) {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
	} catch {
		return null;
	}
}

/*
 * ОБХОД ИДЁТ ПО ПРАВИЛАМ GIT, А НЕ ПО СВОЕМУ СПИСКУ КАТАЛОГОВ.
 *
 * SKIP_DIRS выше — вторая копия правил игнора, и она разошлась с `.gitignore`,
 * как расходится любая вторая копия. Замер 2026-08-09: в списке есть
 * `test-results`, но нет `playwright-report`, поэтому гейт читал
 * `apps/web/playwright-report/index.html` — сгенерированный Playwright отчёт,
 * НЕ отслеживаемый и уже покрытый `.gitignore:43` — и выдавал на нём мохибаку
 * как находку. Гейт был красным из-за файла, которого в репозитории нет.
 *
 * `git ls-files --cached --others --exclude-standard` даёт ровно нужный состав:
 * отслеживаемые плюс новые, но БЕЗ игнорируемых. Это то, что git считает
 * проектом, — а гейт защищает именно проект, а не рабочий каталог. Список
 * пополнять больше не нужно: добавили путь в `.gitignore` — гейт узнал сам.
 *
 * SKIP_DIRS оставлен: `scratch` и `.data` отслеживаются частично, и по ним
 * ходить всё равно незачем. Список стал сужением, а не источником правды.
 */
function gitProjectFiles() {
	const out = spawnSync(
		"git",
		["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
		{ cwd: repoRoot, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
	);
	if (out.status !== 0) return null;
	return out.stdout.toString("utf8").split("\0").filter(Boolean);
}

function* walk(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			yield* walk(join(directory, entry.name));
			continue;
		}
		if (!entry.isFile()) continue;
		if (!CHECKED_EXTENSIONS.some((extension) => entry.name.endsWith(extension)))
			continue;
		yield join(directory, entry.name);
	}
}

/**
 * Состав к проверке. Если git недоступен (сборка из архива без `.git`),
 * падать нельзя — возвращаемся к обходу каталогов и говорим об этом вслух,
 * чтобы «проверено 5680 файлов» не читалось как проверка того же состава.
 */
function* filesToCheck() {
	const tracked = gitProjectFiles();
	if (!tracked) {
		process.stdout.write(
			"git недоступен — обход по каталогам, игнорируемое может попасть в находки.\n",
		);
		yield* walk(repoRoot);
		return;
	}
	for (const relative of tracked) {
		const parts = relative.split("/");
		if (parts.some((part) => SKIP_DIRS.has(part))) continue;
		if (!CHECKED_EXTENSIONS.some((extension) => relative.endsWith(extension)))
			continue;
		const full = join(repoRoot, relative);
		// Файл может быть в индексе и удалён в рабочем каталоге.
		if (!existsSync(full)) continue;
		yield full;
	}
}

const problems = [];
let checked = 0;

for (const filePath of filesToCheck()) {
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
	if (
		(buffer[0] === 0xff && buffer[1] === 0xfe) ||
		(buffer[0] === 0xfe && buffer[1] === 0xff)
	) {
		problems.push({
			file: relativePath,
			kind: "UTF-16",
			detail:
				"файл в UTF-16 — перекодируйте в UTF-8; однобайтовый декодер превратит его в мусор",
		});
		continue;
	}

	const text = decodeStrictUtf8(buffer);
	if (text === null) {
		problems.push({
			file: relativePath,
			kind: "не UTF-8",
			detail:
				"файл не декодируется как UTF-8 — скорее всего он в CP1251; перекодируйте его",
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

	const cp1251 = CP1251_FIXTURE_ALLOWLIST.has(relativePath)
		? null
		: findCp1251Mojibake(text);
	if (cp1251) {
		const line = text.slice(0, cp1251.offset).split("\n").length;
		problems.push({
			file: relativePath,
			kind: "мохибака cp1251",
			detail:
				`строка ${line}: UTF-8 был прочитан как cp1251, отрезков ${cp1251.total}. ` +
				`Первый: «${cp1251.run.slice(0, 24)}» — это «${cp1251.decoded.slice(0, 24)}»`,
		});
	}
}

if (problems.length === 0) {
	console.log(
		`Кодировка в порядке: проверено ${checked} файлов, замечаний нет.`,
	);
	process.exit(0);
}

console.error(
	`Найдены проблемы с кодировкой (${problems.length}) среди ${checked} файлов:\n`,
);
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
