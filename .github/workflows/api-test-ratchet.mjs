#!/usr/bin/env node
/**
 * api-test-ratchet.mjs — храповик по набору тестов @dental/api.
 *
 * ЗАЧЕМ ХРАПОВИК, А НЕ «ДОЛЖНО БЫТЬ ЗЕЛЕНО». Набор `npm run test -w @dental/api`
 * красный: на 2026-08-05 замерено 1955 тестов, 1862 pass, 63 fail, 25 cancelled,
 * 5 skipped, EXIT=1. Гейт, который требует зелёного от красного набора, красен с
 * первого дня, и его выключают в течение недели — ровно так в этом репозитории
 * пролежал невключаемым `check:encoding` до 2026-07-28. Поэтому здесь тот же
 * приём, что уже применён в `scripts/check-tracked-ignored.mjs`: зафиксированный
 * потолок, падение ТОЛЬКО на росте, снижение — зелёное и с просьбой опустить
 * потолок. Храповик обязан крутиться в одну сторону, иначе он превращается в
 * вечный потолок долга.
 *
 * ПОЧЕМУ ПОТОЛОК В ОТДЕЛЬНОМ ФАЙЛЕ (`api-test-ceiling.json`). Чтобы его
 * изменение было отдельной строкой в истории. Потолок, зашитый в YAML рядом с
 * сотней строк конфигурации, меняют не глядя; потолок в собственном файле
 * меняют осознанно, и `git log` по одному файлу показывает всю историю долга.
 *
 * САМОЕ ХРУПКОЕ МЕСТО ЗДЕСЬ — РАЗБОР ЧИСЕЛ, И ОН ЗАЩИЩЁН ОТДЕЛЬНО.
 * Сломанный разбор даёт вечно зелёный храповик, то есть восьмой лживый гейт.
 * Поэтому:
 *   • отсутствие сводки в выводе — ВСЕГДА EXIT=1, независимо от калибровки;
 *   • `tests 0` — ВСЕГДА EXIT=1 (набор не запустился, а не «всё починили»);
 *   • pass + fail + cancelled + skipped + todo обязано сходиться с tests, иначе
 *     разбор поймал чужие строки — ВСЕГДА EXIT=1;
 *   • понимаются ОБА формата репортёра node --test: `spec` (префикс U+2139,
 *     умолчание при перенаправленном stdout, замерено на Node v24.13.0) и `tap`
 *     (префикс `#`). Привязка к одному формату сломалась бы от смены версии Node
 *     или от `--test-reporter`, и сломалась бы молча.
 *
 * ПОЧЕМУ ОДНИХ ЧИСЕЛ МАЛО — «ОБМЕН ДОЛГА». Три числа инвариантны к компенсирующей
 * паре изменений: почини один тест и сломай другой — 63 → 63, и потолок по числу
 * молчит. Это измерено на соседнем гейте этого репозитория: при переписи маршрутов
 * одновременно добавили новый мёртвый и оживили известный мёртвый, число осталось
 * 58 → 58, и только сверка СОСТАВА назвала обе стороны. Правило кампании: гейт,
 * проверенный только мутацией «стало хуже», проверен наполовину; вторая
 * обязательная мутация — с нулевой дельтой.
 *
 * Поэтому здесь, сверх трёх чисел, сверяется ПОИМЁННОЕ МНОЖЕСТВО сломанных тестов,
 * и сверяется В ОБЕ СТОРОНЫ по образцу `scripts/check-route-callers.mjs:592-619`
 * (единственный гейт проекта, знавший состав, а не число):
 *   • появился ключ, которого нет в списке → EXIT=1 (новый долг);
 *   • ключ из списка перестал ломаться, а список не обновлён → EXIT=1 (долг закрыт).
 * Симметрия обязательна: она не даёт списку протухнуть незаметно. При обмене долга
 * срабатывают ОБА направления сразу, и вердикт называет обе стороны.
 *
 * Тот же механизм с той же симметрией независимо сделан в LLVM `lit`:
 * `--xfail-from-file` (кому разрешено падать) и `--xfail-not-from-file` (кто из
 * списка начал проходить). Там же пройден и наш следующий шаг: списки переехали из
 * флагов командной строки в файл, когда перевалили за сотню записей. У нас записей
 * заведомо больше сотни, поэтому файл с самого начала — тот же `api-test-ceiling.json`.
 *
 * ОТКУДА БЕРУТСЯ ИМЕНА. Репортёр `spec` печатает в конце блок `✖ failing tests:`,
 * где каждая запись — две строки: `test at <путь>:<строка>:<колонка>` и следом
 * `✖ <имя теста>`. Замерено на реальном логе (1964 теста): записей 385 = fail 24 +
 * cancelled 313 + 48 сюит с упавшим хуком; строк `test at` вне блока — ноль.
 *
 * КЛЮЧ = `<путь к файлу теста> :: <имя теста>`. Обоснование по замерам:
 *   • голое имя не годится: имена повторяются между файлами (замерено);
 *   • строка:колонка в ключ НЕ входит: любая правка выше сдвигает строку, а под
 *     tsx колонки транспилированные (`13:970`, `13:3315`) — ключ ломался бы от
 *     форматирования;
 *   • полное имя с сюитами взять НЕОТКУДА: блок `✖ failing tests:` печатает только
 *     листовое имя, без describe — замерено;
 *   • разделители пути нормализуются в `/`: локально Windows печатает `src\db\...`,
 *     в CI Linux `src/db/...`, и без нормализации списки не совпали бы между
 *     платформами по каждой записи.
 * Переименование теста при таком ключе — это «исчез старый ключ» плюс «появился
 * новый», то есть ДВА срабатывания, а не молчание; подменить один тест другим
 * тоже нельзя. Цена: одинаковое листовое имя в двух describe одного файла даёт
 * общий ключ. Кратность поэтому УЧИТЫВАЕТСЯ (сравниваются мультимножества), так что
 * обмен внутри такой пары тоже виден. На сегодняшнем логе дублей нет: 385 записей,
 * 385 уникальных ключей.
 *
 * КАК ОБНОВЛЯТЬ СПИСОК. Сверка по составу строже сверки по числу и потому краснеет
 * на КАЖДОЙ законной починке. Эталон, который дорого обновлять, обходят — и тогда
 * гейт мёртв вернее, чем если бы его не было. Поэтому обновление — одно действие:
 *   node .github/workflows/api-test-ratchet.mjs --log <файл> --ceiling <файл> --accept
 * Флаг переписывает `api-test-ceiling.json` замером этого прогона (числа + список) и
 * выставляет `calibrated: true`. В CI он НЕ подключён и подключаться не должен:
 * смысл в том, что сдвиг эталона — осознанная локальная команда, оставляющая diff в
 * одном файле, который видно в обзоре.
 *
 * ЗАПУСК:
 *   node .github/workflows/api-test-ratchet.mjs --log <файл> --ceiling <файл> [--accept]
 *
 * Если задан $GITHUB_STEP_SUMMARY, вердикт дублируется туда. В сводку уходят
 * РАЗОБРАННЫЕ ЧИСЛА и ИМЕНА ТЕСТОВ, и никогда не уходит тело падения: в падениях
 * тестов печатаются фикстуры с персональными данными пациентов, а сводка прогона
 * читается всеми, у кого есть доступ на чтение репозитория. Имена тестов в это
 * ограничение не попадают: это литералы исходников, и читатель сводки — тот же, кто
 * и так видит их в дереве. Границу держит разбор: из блока `✖ failing tests:`
 * берутся только строка `test at <путь>` и строка с именем, а строки диагностики
 * между записями не читаются вообще.
 *
 * ПРО ВТОРОЙ ФОРМАТ, ЧЕСТНО. Числа читаются и из `spec`, и из `tap`. Имена — ТОЛЬКО
 * из `spec`, потому что только этот формат замерен на этом наборе. Асимметрия
 * закрыта громким отказом, а не догадкой: если сводка говорит, что сломанные тесты
 * есть, а поимённо не разобран ни один, это EXIT=1. Смена репортёра или версии Node
 * выключить сверку состава молча не может.
 */

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const COUNTER_NAMES = [
	"tests",
	"suites",
	"pass",
	"fail",
	"cancelled",
	"skipped",
	"todo",
];

/** Строки сводки node --test: `ℹ fail 63` (spec) или `# fail 63` (tap). */
const SUMMARY_LINE = /^(?:ℹ|#)\s+([a-z_]+)\s+(\d+)\s*$/;

/**
 * Запись поимённого блока `✖ failing tests:` репортёра `spec` — РОВНО ДВЕ строки:
 *   test at src\db\visitsQuery.test.ts:13:970
 *   ✖ имя теста (245.8281ms)              ← у отменённых длительности нет
 *   ✖ имя теста (32.2453ms) # причина     ← у todo-теста ещё и суффикс после `#`
 * Пара обязательна: одиночная строка `test at ...` записью не считается. Строка и
 * колонка разбираются, чтобы их ОТБРОСИТЬ, — в ключ они не входят (см. шапку).
 *
 * ДЛИТЕЛЬНОСТЬ И `# ...` ОБЯЗАНЫ ОТБРАСЫВАТЬСЯ ОБА, И ИМЕННО ВМЕСТЕ. Первая
 * редакция этого разбора снимала только хвостовую длительность, поэтому у
 * todo-тестов (`(32.2453ms) # маршрут не реализован`) длительность оказывалась
 * в СЕРЕДИНЕ строки и уезжала прямо в ключ — ЗАМЕРЕНО: 8 таких ключей из 51 попали
 * в эталон. Такой ключ меняется от прогона к прогону вместе с миллисекундами, то
 * есть эталон краснел бы на ровном месте и его бы отключили. Порядок частей
 * зафиксирован репортёром: сначала длительность, затем `#`.
 */
const TRAILER_LOCATION = /^test at (.+):(\d+):(\d+)\s*$/;
const TRAILER_NAME = /^✖ (.*?)(?:\s\(\d+(?:\.\d+)?ms\))?(?:\s#\s.*)?\s*$/;

/** Разделитель ключа. Пробелы вокруг — чтобы ключ читался в diff глазами. */
const KEY_SEPARATOR = " :: ";

function parseArguments(argv) {
	const options = { log: null, ceiling: null, accept: false };
	for (let index = 0; index < argv.length; index += 1) {
		const flag = argv[index];
		if (flag === "--accept") {
			options.accept = true;
			continue;
		}
		if (flag !== "--log" && flag !== "--ceiling") {
			throw new Error(
				`Неизвестный аргумент: ${flag}. Поддерживаются --log, --ceiling и --accept.`,
			);
		}
		const value = argv[index + 1];
		if (value === undefined)
			throw new Error(`${flag} требует значение (путь к файлу).`);
		options[flag.slice(2)] = value;
		index += 1;
	}
	if (!options.log)
		throw new Error("--log обязателен: путь к файлу с выводом набора.");
	if (!options.ceiling)
		throw new Error("--ceiling обязателен: путь к файлу потолка.");
	return options;
}

/**
 * Достаёт сводку из вывода набора.
 *
 * Берётся ПОСЛЕДНЕЕ вхождение каждого счётчика: если запускалось несколько
 * процессов node --test (а корневой `npm run test` так и делает), сводок в
 * потоке будет несколько, и значение имеет итоговая.
 */
function parseSummary(text) {
	const found = new Map();
	for (const line of text.split(/\r?\n/)) {
		const match = SUMMARY_LINE.exec(line.trim());
		if (match === null) continue;
		const [, name, value] = match;
		if (!COUNTER_NAMES.includes(name)) continue;
		found.set(name, Number.parseInt(value, 10));
	}

	const missing = COUNTER_NAMES.filter((name) => !found.has(name));
	if (missing.length > 0) {
		return {
			ok: false,
			reason:
				`в выводе набора не найдена сводка node --test (нет счётчиков: ${missing.join(", ")}).\n` +
				"Это значит, что набор не дошёл до конца: упал при загрузке, был убит по таймауту\n" +
				"задания или его вывод не попал в файл. Числа сравнивать не с чем, поэтому это\n" +
				"падение, а не «ноль ошибок».",
		};
	}

	const counters = Object.fromEntries(
		COUNTER_NAMES.map((name) => [name, found.get(name)]),
	);

	if (counters.tests === 0) {
		return {
			ok: false,
			reason:
				"набор сообщил tests 0 — не выполнено ни одного теста.\n" +
				"Пустой прогон нельзя принимать за успех: именно так храповик становится вечно зелёным.",
		};
	}

	// Контроль целостности разбора. `suites` в сумму НЕ входит: node считает
	// сюиты отдельно от тестов, и прибавление их к сумме дало бы расхождение
	// на каждом наборе с describe().
	const accounted =
		counters.pass +
		counters.fail +
		counters.cancelled +
		counters.skipped +
		counters.todo;
	if (accounted !== counters.tests) {
		return {
			ok: false,
			reason:
				`сводка не сходится: pass+fail+cancelled+skipped+todo = ${accounted}, а tests = ${counters.tests}.\n` +
				"Разбор поймал не те строки — сравнивать такие числа с потолком нельзя.",
		};
	}

	return { ok: true, counters };
}

/**
 * Достаёт ПОИМЁННЫЙ состав сломанного из блока `✖ failing tests:` репортёра `spec`.
 *
 * Возвращает МАССИВ, а не множество: одинаковое листовое имя в двух describe одного
 * файла даёт один ключ, и кратность здесь — единственное, что отличает «сломаны оба»
 * от «сломан один». Set потерял бы эту разницу молча.
 *
 * Записью считается только ПАРА строк подряд: `test at <путь>:<строка>:<колонка>` и
 * следом строка с маркером. Одиночная строка `test at ...`, случайно попавшая в тело
 * падения, записью не станет.
 */
function parseBrokenNames(text) {
	const lines = text.split(/\r?\n/);
	const keys = [];
	for (let index = 0; index + 1 < lines.length; index += 1) {
		const location = TRAILER_LOCATION.exec(lines[index]);
		if (location === null) continue;
		const name = TRAILER_NAME.exec(lines[index + 1]);
		if (name === null) continue;
		// Разделители пути — в `/`: Windows печатает `src\db\...`, Linux `src/db/...`,
		// и без этого списки не совпали бы между машиной разработчика и CI ни одной записью.
		const file = location[1].trim().replace(/\\/g, "/");
		keys.push(`${file}${KEY_SEPARATOR}${name[1].trim()}`);
	}
	return keys;
}

/** Мультимножество: ключ → сколько раз встретился. */
function toCounts(keys) {
	const counts = new Map();
	for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
	return counts;
}

/** Что есть в `left` сверх `right`, с учётом кратности. Отсортировано для читаемости. */
function surplusOf(left, right) {
	const extra = [];
	for (const [key, count] of left) {
		const surplus = count - (right.get(key) ?? 0);
		for (let repeat = 0; repeat < surplus; repeat += 1) extra.push(key);
	}
	return extra.sort();
}

/**
 * Ключи для вердикта, списком markdown. Печатается не больше KEYS_SHOWN штук: при
 * первом расхождении с эталоном список бывает в сотни записей, и вываленный целиком
 * он топит вердикт, ради которого сводку и открывают. ЧИСЛО расхождений называется
 * всегда, в заголовке блока, поэтому усечение ничего не прячет.
 */
const KEYS_SHOWN = 40;

function describeKeys(keys) {
	const shown = keys.slice(0, KEYS_SHOWN).map((key) => `- \`${key}\``);
	if (keys.length > KEYS_SHOWN) {
		shown.push(
			`- …и ещё ${keys.length - KEYS_SHOWN}; полный состав — в diff после \`--accept\``,
		);
	}
	return shown;
}

function readCeiling(path) {
	const ceiling = JSON.parse(readFileSync(path, "utf8"));
	for (const key of ["fail", "cancelled", "broken"]) {
		if (!Number.isInteger(ceiling[key]) || ceiling[key] < 0) {
			throw new Error(
				`Потолок ${path}: поле «${key}» обязано быть целым неотрицательным числом.`,
			);
		}
	}
	if (typeof ceiling.calibrated !== "boolean") {
		throw new Error(
			`Потолок ${path}: поле «calibrated» обязано быть true или false.`,
		);
	}
	// Список требуется только у откалиброванного потолка: до первого прогона в CI
	// его взять неоткуда. Но если потолок объявлен откалиброванным, отсутствие или
	// порча списка — это отказ, а не «сверять нечего»: пустой/битый список молча
	// превратил бы сверку состава в ту самую проверку, которая всегда зелена.
	if (ceiling.calibrated) {
		if (!Array.isArray(ceiling.broken_tests)) {
			throw new Error(
				`Потолок ${path}: при «calibrated: true» поле «broken_tests» обязано быть массивом ключей ` +
					`вида "путь/к/файлу.test.ts${KEY_SEPARATOR}имя теста". Обновить одной командой: --accept.`,
			);
		}
		const bad = ceiling.broken_tests.filter(
			(key) => typeof key !== "string" || !key.includes(KEY_SEPARATOR),
		);
		if (bad.length > 0) {
			throw new Error(
				`Потолок ${path}: в «broken_tests» ${bad.length} записей не строки или без разделителя ` +
					`«${KEY_SEPARATOR.trim()}». Первая: ${JSON.stringify(bad[0])}.`,
			);
		}
		// ЗАМЕРЕНО: записей в блоке `✖ failing tests:` НЕ РАВНО broken, а не меньше его.
		// На реальном логе 385 записей при broken = fail 24 + cancelled 313 = 337:
		// разницу в 48 дают сюиты с упавшим хуком — они печатаются в блоке, но node
		// считает их в `suites`, а не в `tests`. Равенство здесь было бы выдуманным
		// инвариантом и роняло бы храповик на честном потолке; проверяется НЕРАВЕНСТВО.
		if (ceiling.broken_tests.length < ceiling.broken) {
			throw new Error(
				`Потолок ${path}: «broken» = ${ceiling.broken}, а в «broken_tests» всего ` +
					`${ceiling.broken_tests.length} записей.\n` +
					"Поимённый список не может быть короче числа сломанных блоков: значит, число и состав\n" +
					"правились порознь. Пересоберите потолок одной командой: --accept.",
			);
		}
	}
	return ceiling;
}

function emit(lines) {
	const text = lines.join("\n");
	console.log(text);
	const summaryPath = process.env.GITHUB_STEP_SUMMARY;
	if (summaryPath) appendFileSync(summaryPath, `${text}\n`, "utf8");
}

/**
 * Переписывает файл потолка замером этого прогона. ЕДИНСТВЕННОЕ действие, которым
 * сдвигается эталон, — и оно локальное: в CI флаг не подключён.
 *
 * Пояснительные ключи (`_`, `_зачем`, …) сохраняются: они и есть документация файла,
 * и потерять их при машинной перезаписи значит превратить осмысленный файл в дамп.
 * Список сортируется — иначе diff показывал бы перестановки как изменения.
 */
function writeCeiling(path, previous, counters, brokenKeys) {
	const next = {};
	for (const [key, value] of Object.entries(previous)) {
		if (key.startsWith("_")) next[key] = value;
	}
	next.calibrated = true;
	next.fail = counters.fail;
	next.cancelled = counters.cancelled;
	next.broken = counters.fail + counters.cancelled;
	next.broken_tests = [...brokenKeys].sort();
	next._замер = `Принято --accept: tests ${counters.tests} / pass ${counters.pass} / fail ${counters.fail} / cancelled ${counters.cancelled} / skipped ${counters.skipped}; поимённых записей ${brokenKeys.length}.`;
	writeFileSync(path, `${JSON.stringify(next, null, "\t")}\n`, "utf8");
}

function main() {
	const options = parseArguments(process.argv.slice(2));
	const ceiling = readCeiling(options.ceiling);
	const logText = readFileSync(options.log, "utf8");
	const parsed = parseSummary(logText);

	if (!parsed.ok) {
		emit(["## Тесты @dental/api — РАЗБОР НЕ УДАЛСЯ", "", parsed.reason]);
		return 1;
	}

	const { counters } = parsed;
	const broken = counters.fail + counters.cancelled;
	const brokenKeys = parseBrokenNames(logText);

	// АСИММЕТРИЯ РАЗБОРА, ЗАКРЫТАЯ ГРОМКИМ ОТКАЗОМ. Числа читаются из обоих форматов
	// репортёра, имена — только из `spec`. Если сводка говорит, что сломанное есть, а
	// поимённо не разобрано ничего, то либо сменился репортёр, либо блок
	// `✖ failing tests:` не попал в лог. Тихо сравнить при этом «пустое с пустым»
	// значило бы выключить сверку состава ровно тогда, когда она нужна.
	if (broken > 0 && brokenKeys.length === 0) {
		emit([
			"## Тесты @dental/api — СОСТАВ НЕ РАЗОБРАН",
			"",
			`Сводка сообщает fail ${counters.fail} и cancelled ${counters.cancelled}, то есть сломанные блоки есть,`,
			"но в выводе не найдено ни одной записи блока `✖ failing tests:` (пара строк",
			"`test at <путь>:<строка>:<колонка>` и следом строка с маркером).",
			"",
			"Вероятные причины: сменился репортёр node --test (имена берутся из `spec`),",
			"вывод обрезан, или набор запущен с `--test-reporter=tap`. Сравнивать состав не с чем,",
			"поэтому это падение, а не «состав совпал».",
		]);
		return 1;
	}

	if (brokenKeys.length > 0 && brokenKeys.length < broken) {
		emit([
			"## Тесты @dental/api — СОСТАВ РАЗОБРАН ЧАСТИЧНО",
			"",
			`Поимённых записей ${brokenKeys.length}, а fail + cancelled = ${broken}.`,
			"Записей не может быть меньше: каждый упавший и каждый отменённый блок печатается",
			"в `✖ failing tests:` (сверх них там же сюиты с упавшим хуком, поэтому записей обычно",
			"БОЛЬШЕ). Значит вывод обрезан или разбор поймал не тот блок — сравнивать нельзя.",
		]);
		return 1;
	}

	const factLine =
		`tests ${counters.tests} / pass ${counters.pass} / fail ${counters.fail} / ` +
		`cancelled ${counters.cancelled} / skipped ${counters.skipped} / сломанных блоков ${broken} / ` +
		`поимённых записей ${brokenKeys.length}`;

	// --accept обрабатывается ПОСЛЕ всех проверок разбора выше и до любого сравнения:
	// принимать замер, разбор которого не сошёлся, значит записать в эталон мусор.
	if (options.accept) {
		writeCeiling(options.ceiling, ceiling, counters, brokenKeys);
		emit([
			"## Тесты @dental/api — ЭТАЛОН ПРИНЯТ (--accept)",
			"",
			`Замер: ${factLine}`,
			"",
			`Файл \`${options.ceiling}\` перезаписан: числа, поимённый список (${brokenKeys.length} записей)`,
			'и `"calibrated": true`.',
			"",
			"Посмотрите diff перед коммитом. Флаг сдвигает эталон и потому способен принять",
			"настоящую регрессию за норму — это ровно то, что должно быть видно в обзоре одной",
			"строкой в одном файле. В CI флаг не подключён.",
		]);
		return 0;
	}

	if (!ceiling.calibrated) {
		emit([
			"## Тесты @dental/api — ПОТОЛОК НЕ ОТКАЛИБРОВАН, храповик не кусает",
			"",
			`Замер этого прогона: ${factLine}`,
			"",
			'Потолок в `.github/workflows/api-test-ceiling.json` помечен `"calibrated": false`.',
			"Числа в нём сняты НА МАШИНЕ РАЗРАБОТЧИКА, против живой засеянной базы, под Windows.",
			"В CI база другая — чистая, только миграции, без seed-данных, Linux, — поэтому те числа",
			"здесь ничего не значат и сравнивать по ним значит ронять сборку по причине,",
			"не связанной с кодом.",
			"",
			"ЧТО СДЕЛАТЬ, ОДНОЙ КОМАНДОЙ — она запишет и числа, и поимённый список",
			`(${brokenKeys.length} записей; вручную такой список не переносят):`,
			"",
			"```sh",
			"node .github/workflows/api-test-ratchet.mjs \\",
			`  --log <файл с выводом набора> --ceiling ${options.ceiling} --accept`,
			"```",
			"",
			"После этого храповик начнёт ронять сборку на РОСТЕ любого из трёх чисел И на любом",
			"изменении СОСТАВА сломанных тестов — в том числе при обмене долга, когда числа",
			"не меняются.",
			"Пока `calibrated` равен false, это сообщение печатается на КАЖДОМ прогоне —",
			"незамеченным такое состояние не останется.",
		]);
		return 0;
	}

	const breaches = [];
	if (counters.fail > ceiling.fail)
		breaches.push(`fail: ${counters.fail} при потолке ${ceiling.fail}`);
	if (counters.cancelled > ceiling.cancelled) {
		breaches.push(
			`cancelled: ${counters.cancelled} при потолке ${ceiling.cancelled}`,
		);
	}
	if (broken > ceiling.broken)
		breaches.push(`сломанных блоков: ${broken} при потолке ${ceiling.broken}`);

	// СВЕРКА СОСТАВА, В ОБЕ СТОРОНЫ. Образец — scripts/check-route-callers.mjs:592-619.
	// Односторонняя проверка («только новый долг») дала бы списку протухать: закрытый
	// долг оставался бы в эталоне и молча разрешал сломать этот тест заново.
	const currentCounts = toCounts(brokenKeys);
	const knownCounts = toCounts(ceiling.broken_tests);
	const newBroken = surplusOf(currentCounts, knownCounts);
	const fixedBroken = surplusOf(knownCounts, currentCounts);

	if (breaches.length > 0 || newBroken.length > 0 || fixedBroken.length > 0) {
		// Заголовок называет ИМЕННО обмен, когда сработали обе стороны: это тот случай,
		// в котором числа не меняются, и по одним числам вердикт был бы зелёным.
		const isSwap = newBroken.length > 0 && fixedBroken.length > 0;
		const title = isSwap
			? "## Тесты @dental/api — ОБМЕН ДОЛГА: одно сломано, другое починено"
			: newBroken.length > 0
				? "## Тесты @dental/api — НОВЫЙ СЛОМАННЫЙ ТЕСТ"
				: breaches.length > 0
					? "## Тесты @dental/api — РОСТ ЧИСЛА СЛОМАННЫХ ТЕСТОВ"
					: "## Тесты @dental/api — ДОЛГ ЗАКРЫТ, СПИСОК НЕ ОБНОВЛЁН";

		const lines = [title, "", `Замер: ${factLine}`];

		if (isSwap) {
			lines.push(
				"",
				`Числа при этом ${broken === ceiling.broken ? "НЕ ИЗМЕНИЛИСЬ" : "изменились"}: сломанных блоков ${broken} при потолке ${ceiling.broken}.`,
				"Поимённая сверка ловит то, к чему сумма слепа: компенсирующая пара изменений",
				"оставляет счётчик на месте.",
			);
		}

		if (breaches.length > 0) {
			lines.push(
				"",
				"ВЫШЛО ЗА ЧИСЛОВОЙ ПОТОЛОК:",
				...breaches.map((breach) => `- ${breach}`),
			);
		}

		if (newBroken.length > 0) {
			lines.push(
				"",
				`НОВЫЙ ДОЛГ — сломано, и в списке этого нет (${newBroken.length}):`,
				...describeKeys(newBroken),
				"",
				"Чините то, что сломала эта правка. Вписать новые имена в список ради зелёного",
				"значит выключить проверку.",
			);
		}

		if (fixedBroken.length > 0) {
			lines.push(
				"",
				`ДОЛГ ЗАКРЫТ — в списке есть, а в прогоне не сломано (${fixedBroken.length}):`,
				...describeKeys(fixedBroken),
				"",
				"Это хорошая новость и всё же красный: пока список не обновлён, храповик разрешает",
				"сломать эти тесты обратно молча. Снимите их со списка.",
			);
		}

		lines.push(
			"",
			"Эталон живёт в `.github/workflows/api-test-ceiling.json`. Обновление — одной командой:",
			"",
			"```sh",
			"node .github/workflows/api-test-ratchet.mjs \\",
			`  --log <файл с выводом набора> --ceiling ${options.ceiling} --accept`,
			"```",
			"",
			"Команда переписывает и числа, и состав. Она же и есть точка обзора: сдвиг эталона",
			"обязан быть отдельным осознанным решением владельца, а не побочным эффектом чужого",
			"коммита, и виден одним diff одного файла.",
		);

		emit(lines);
		return 1;
	}

	const improvements = [];
	if (counters.fail < ceiling.fail)
		improvements.push(`fail: ${counters.fail} вместо ${ceiling.fail}`);
	if (counters.cancelled < ceiling.cancelled) {
		improvements.push(
			`cancelled: ${counters.cancelled} вместо ${ceiling.cancelled}`,
		);
	}
	if (broken < ceiling.broken)
		improvements.push(`сломанных блоков: ${broken} вместо ${ceiling.broken}`);

	const lines = [
		"## Тесты @dental/api — роста нет, состав совпал",
		"",
		`Замер: ${factLine}`,
		"",
		`Поимённо сверено ${brokenKeys.length} записей: ни одна не появилась и ни одна не исчезла.`,
	];
	if (improvements.length > 0) {
		lines.push(
			"",
			"УЛУЧШЕНИЕ — опустите потолок в `.github/workflows/api-test-ceiling.json`,",
			"иначе храповик прокрутится назад и пропустит следующую поломку:",
			...improvements.map((improvement) => `- ${improvement}`),
		);
	}
	emit(lines);
	return 0;
}

try {
	process.exitCode = main();
} catch (error) {
	console.error(`[храповик] ${error.message}`);
	process.exitCode = 1;
}
