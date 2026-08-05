#!/usr/bin/env node
/**
 * check-tracked-ignored.mjs — храповик на «отслеживается вопреки .gitignore».
 *
 * ЗАЧЕМ. Правило игнора НЕ снимает файл с отслеживания. Если правило добавили
 * после того, как путь попал в индекс, а `git rm --cached` никто не выполнил,
 * файл продолжает жить в репозитории, и ни один обычный инструмент этого не
 * показывает. Класс дефекта встречен в этом дереве СЕМЬ раз, измерено 2026-08-06:
 * 3168 отслеживаемых путей под 6 правилами игнора при 12081 отслеживаемом файле,
 * включая шесть полных профилей пользователя Edge внутри artifacts/.
 *
 * ПОЧЕМУ ЕГО НЕ ВИДНО БЕЗ ЭТОГО СКРИПТА — две независимые слепые зоны:
 *
 *   1. `git status` слеп ПО ПОСТРОЕНИЮ. Отслеживаемый файл не является
 *      untracked, поэтому мандат 9 конституции («Always check `git status
 *      --short`») этот дефект не ловит и поймать не может.
 *
 *   2. `git check-ignore` БЕЗ `--no-index` слеп тоже. По умолчанию команда
 *      сначала смотрит в индекс, и путь из индекса коротко замыкает проверку:
 *      вывода нет вообще, что неотличимо от «ни одно правило не совпало».
 *      Измерено на этом дереве: `git ls-files | git check-ignore --stdin -v`
 *      возвращает 0 строк при 3168 реальных нарушениях. Опцию `--no-index`
 *      добавили в git ровно для этого случая (коммит 8231fa6ae): она обходит
 *      проверку индекса и позволяет спросить у механизма исключений, что он
 *      ДУМАЕТ о пути, независимо от того, отслеживается путь или нет.
 *
 * ПОЧЕМУ БЮДЖЕТ, А НЕ НОЛЬ. Убрать 3168 путей можно только через `git rm
 * --cached` с последующей чисткой истории на двух зеркалах — это решение
 * владельца, а не автоматической проверки. Гейт, который падает всегда, через
 * неделю обходят, и тогда он не защищает ничего (ровно так `check:encoding`
 * пролежал невключаемым до 2026-07-28). Поэтому здесь храповик: зафиксирован
 * бюджет ПО КАЖДОМУ ПРАВИЛУ, падение — только на РОСТЕ. Уменьшение допустимо и
 * печатается отдельной строкой с просьбой опустить бюджет: храповик обязан
 * крутиться в одну сторону, иначе он превращается в вечный потолок долга.
 *
 * ПОЧЕМУ БЮДЖЕТ ПО ПРАВИЛАМ, А НЕ ОДНО ЧИСЛО. Одно суммарное число позволяет
 * одной группе гнить, пока другая чистится: удалили 5 файлов из .data/, добавили
 * 5 в artifacts/ — сумма та же, гейт молчит. Раздельные бюджеты это закрывают.
 *
 * ПОЧЕМУ ОБЯЗАТЕЛЕН ФИЛЬТР ПО `!`. `git check-ignore -v` печатает ПОСЛЕДНЕЕ
 * совпавшее правило, и для негации оно начинается с `!`. Совпадение с негацией
 * означает ровно обратное — путь НЕ игнорируется. Проверено на этом дереве:
 * `.env.example` совпадает с `!.env.example` (.gitignore:57), а
 * `git check-ignore --no-index -q .env.example` даёт код 1, то есть «не
 * игнорируется». Без фильтра `.env.example` даёт вечное ложное срабатывание —
 * и это не гипотеза, на нём уже споткнулись при разработке этой проверки.
 *
 * ЗАПУСК:  node scripts/check-tracked-ignored.mjs
 * Код возврата 1 при превышении бюджета или при появлении правила без бюджета.
 *
 * ОТРИЦАТЕЛЬНЫЙ КОНТРОЛЬ («докажи, что страж кусает») — БЕЗ ЗАПИСЕЙ В GIT:
 *
 *     node scripts/check-tracked-ignored.mjs --extra-path artifacts/__gate_probe.txt
 *
 * `git check-ignore --no-index` — чистый сопоставитель шаблонов: он не читает
 * ни индекс, ни диск. Проверено 2026-08-06 — путь, которого нет НИ в индексе,
 * НИ на диске, всё равно возвращается как совпавший с `artifacts/`. Поэтому
 * доказать укус можно подсунув синтетический путь, не выполняя ни `git add -f`,
 * ни `git reset`, ни `touch`. Флаг умеет ТОЛЬКО ДОБАВЛЯТЬ пути в проверяемый
 * список, то есть может сделать гейт строже и не может сделать его мягче —
 * ослабить проверку им физически нельзя.
 */

import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Бюджет отслеживаемых путей по каждому правилу игнора. Ключ — текст шаблона, а
 * НЕ `источник:строка`: номера строк в .gitignore едут при любой правке файла, и
 * привязка к ним ломала бы бюджет на ровном месте.
 *
 * Замерено 2026-08-06 на HEAD 653c37a88 своим прогоном этого скрипта.
 * Правило `scripts/smoke-speech-key-rotation.mjs` в списке отсутствует намеренно:
 * оно удалено из .gitignore в этой же правке как ошибочное (скрипт живой, заведён
 * в package.json как `smoke:speech-key-rotation` и упомянут в README).
 *
 * Правило без записи здесь считается бюджетом 0 — новый вид нарушения обязан
 * ронять проверку, а не молча приниматься.
 */
const BUDGETS = new Map([
	["artifacts/", 2212],
	[".data/", 909],
	["dist/", 24],
	["apps/api/.data/", 21],
	["local-secrets/*.env", 2],
]);

/** Сколько путей печатать по группе, вышедшей за бюджет. */
const MAX_NAMED_PATHS = 25;

function parseArguments(argv) {
	const extraPaths = [];
	for (let index = 0; index < argv.length; index += 1) {
		if (argv[index] !== "--extra-path") {
			throw new Error(`Неизвестный аргумент: ${argv[index]}. Поддерживается только --extra-path <путь>.`);
		}
		const value = argv[index + 1];
		if (value === undefined || value.startsWith("--")) {
			throw new Error("--extra-path требует значение (путь).");
		}
		extraPaths.push(value);
		index += 1;
	}
	return { extraPaths };
}

/** Пути из ИНДЕКСА. `-z` обязателен: имена файлов здесь содержат пробелы и кириллицу. */
function readTrackedPaths() {
	const stdout = execFileSync("git", ["ls-files", "-z"], {
		cwd: repoRoot,
		encoding: "buffer",
		maxBuffer: 256 * 1024 * 1024,
	});
	return splitNulBuffer(stdout);
}

function splitNulBuffer(buffer) {
	const text = buffer.toString("utf8");
	const parts = text.split("\0");
	if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
	return parts;
}

/**
 * Спрашивает у механизма исключений, что он думает о каждом пути, и возвращает
 * записи ТОЛЬКО по положительным правилам (негации отброшены — см. шапку файла).
 *
 * Вынесено отдельной функцией именно ради отрицательного контроля: на вход можно
 * подать любой список путей, в том числе синтетический, и проверить реакцию
 * гейта, не трогая ни индекс, ни рабочее дерево.
 */
function collectTrackedIgnored(paths) {
	if (paths.length === 0) return [];

	let stdout;
	try {
		stdout = execFileSync("git", ["check-ignore", "--stdin", "-z", "--no-index", "-v"], {
			cwd: repoRoot,
			input: Buffer.from(`${paths.join("\0")}\0`, "utf8"),
			encoding: "buffer",
			maxBuffer: 256 * 1024 * 1024,
		});
	} catch (error) {
		// Код 1 — «ни один путь не игнорируется». Это законный успех с нулём
		// находок, а не сбой: путать их значит превратить чистое дерево в падение.
		// Всё остальное (в первую очередь 128) — настоящая ошибка git.
		if (error.status === 1) return [];
		const stderr = error.stderr ? error.stderr.toString("utf8").trim() : "";
		throw new Error(`git check-ignore завершился с кодом ${error.status}: ${stderr || "без вывода"}`);
	}

	// Формат при `-z -v`: <источник>\0<строка>\0<шаблон>\0<путь>\0 — четыре поля
	// на запись, разделитель между полями тот же NUL, что и между записями.
	const fields = splitNulBuffer(stdout);
	if (fields.length % 4 !== 0) {
		throw new Error(`Неожиданный вывод git check-ignore: ${fields.length} полей, не кратно 4.`);
	}

	const records = [];
	for (let index = 0; index < fields.length; index += 4) {
		const pattern = fields[index + 2];
		// Совпадение с негацией означает «путь НЕ игнорируется». Пропускаем.
		if (pattern.startsWith("!")) continue;
		records.push({
			source: fields[index],
			line: fields[index + 1],
			pattern,
			path: fields[index + 3],
		});
	}
	return records;
}

/** Время последней записи файла; для несуществующего пути — Infinity («свежайший»). */
function modifiedAt(relativePath) {
	try {
		return statSync(join(repoRoot, relativePath)).mtimeMs;
	} catch {
		// Путь есть в индексе (или подан как синтетический), но не лежит на диске.
		// Такой всегда интереснее старого артефакта, поэтому он идёт первым.
		return Number.POSITIVE_INFINITY;
	}
}

function groupByPattern(records) {
	const groups = new Map();
	for (const record of records) {
		let group = groups.get(record.pattern);
		if (group === undefined) {
			group = { pattern: record.pattern, source: record.source, line: record.line, paths: [] };
			groups.set(record.pattern, group);
		}
		group.paths.push(record.path);
	}
	return groups;
}

/**
 * Печатает пути группы, вышедшей за бюджет. Печатать все 2212 бессмысленно —
 * инженеру нужно знать, ЧТО ДОБАВИЛОСЬ. Точного списка «нового» без снимка
 * прошлого состояния не существует, а снимок из 3168 путей пришлось бы
 * переписывать при каждой правке артефактов, поэтому здесь используется лучший
 * доступный признак новизны: время последней записи на диске, по убыванию.
 * Путь, которого на диске нет вовсе, идёт первым.
 */
function namePaths(group, overBudget) {
	if (group.paths.length <= MAX_NAMED_PATHS) {
		return { paths: [...group.paths].sort(), exact: true };
	}
	const limit = Math.min(MAX_NAMED_PATHS, Math.max(overBudget + 3, 5));
	const sorted = [...group.paths].sort((left, right) => modifiedAt(right) - modifiedAt(left));
	return { paths: sorted.slice(0, limit), exact: false };
}

const { extraPaths } = parseArguments(process.argv.slice(2));
const trackedPaths = readTrackedPaths();
const probedPaths = extraPaths.length > 0 ? [...trackedPaths, ...extraPaths] : trackedPaths;
const records = collectTrackedIgnored(probedPaths);
const groups = groupByPattern(records);

const failures = [];
const improvements = [];

for (const group of groups.values()) {
	const budget = BUDGETS.get(group.pattern) ?? 0;
	if (group.paths.length > budget) {
		failures.push({ group, budget, actual: group.paths.length });
		continue;
	}
	if (group.paths.length < budget) {
		improvements.push({ group, budget, actual: group.paths.length });
	}
}

// Правило, которое исчезло целиком (бюджет есть, находок нет), — тоже улучшение.
for (const [pattern, budget] of BUDGETS) {
	if (budget > 0 && !groups.has(pattern)) {
		improvements.push({ group: { pattern, source: ".gitignore", line: "-" }, budget, actual: 0 });
	}
}

const total = records.length;
const budgetTotal = [...BUDGETS.values()].reduce((sum, value) => sum + value, 0);

if (extraPaths.length > 0) {
	console.error(`ОТРИЦАТЕЛЬНЫЙ КОНТРОЛЬ: к списку из индекса добавлено синтетических путей: ${extraPaths.length}.`);
}

if (failures.length === 0) {
	console.log(
		`Отслеживаемых вопреки игнору: ${total} при бюджете ${budgetTotal} ` +
			`(проверено путей: ${probedPaths.length}, правил с находками: ${groups.size}). Роста нет.`,
	);
	for (const { group, budget, actual } of improvements) {
		console.log(
			`  улучшение: правило «${group.pattern}» — ${actual} вместо ${budget}. ` +
				`Опустите бюджет в scripts/check-tracked-ignored.mjs, иначе храповик прокрутится назад.`,
		);
	}
	process.exit(0);
}

console.error(
	`РОСТ отслеживаемых вопреки .gitignore: ${total} при бюджете ${budgetTotal}. ` +
		`Правил вышло за бюджет: ${failures.length}.\n`,
);

for (const { group, budget, actual } of failures) {
	console.error(`  правило «${group.pattern}» (${group.source}:${group.line}): ${actual} при бюджете ${budget}`);
	const overBudget = actual - budget;
	const { paths, exact } = namePaths(group, overBudget);
	console.error(
		exact
			? "      все пути этого правила:"
			: `      ${paths.length} самых свежих по времени записи (вероятные новички, всего в группе ${actual}):`,
	);
	for (const path of paths) {
		console.error(`        ${path}`);
	}
}

console.error(
	"\nЧТО ЭТО ЗНАЧИТ. Перечисленные пути лежат в индексе git, хотя .gitignore их запрещает.\n" +
		"Игнор НЕ снимает файл с отслеживания: правило действует только на неотслеживаемые пути,\n" +
		"поэтому `git status` их не покажет, и `git check-ignore` без `--no-index` тоже не покажет.\n" +
		"\nЧТО ДЕЛАТЬ:\n" +
		"  1. Если файл не должен быть в репозитории — снимите его с отслеживания:\n" +
		"       git rm --cached <путь>\n" +
		"     Файл останется на диске. Учтите: у остальных он при pull исчезнет из рабочего дерева.\n" +
		"  2. Если файл НУЖЕН, а ошибочно правило — правьте .gitignore, а не индекс.\n" +
		"  3. Бюджет в scripts/check-tracked-ignored.mjs поднимать МОЖНО только осознанным решением\n" +
		"     владельца репозитория. Поднять его, чтобы прошёл гейт, — значит выключить проверку.\n",
);
process.exit(1);
