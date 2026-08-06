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
 * ЗАПУСК:
 *   node .github/workflows/api-test-ratchet.mjs --log <файл> --ceiling <файл>
 *
 * Если задан $GITHUB_STEP_SUMMARY, вердикт дублируется туда. В сводку уходят
 * ТОЛЬКО РАЗОБРАННЫЕ ЧИСЛА и никогда не уходит сырой вывод набора: в падениях
 * тестов печатаются фикстуры с персональными данными пациентов, а сводка прогона
 * читается всеми, у кого есть доступ на чтение репозитория.
 */

import { readFileSync, appendFileSync } from "node:fs";

const COUNTER_NAMES = ["tests", "suites", "pass", "fail", "cancelled", "skipped", "todo"];

/** Строки сводки node --test: `ℹ fail 63` (spec) или `# fail 63` (tap). */
const SUMMARY_LINE = /^(?:ℹ|#)\s+([a-z_]+)\s+(\d+)\s*$/;

function parseArguments(argv) {
	const options = { log: null, ceiling: null };
	for (let index = 0; index < argv.length; index += 2) {
		const flag = argv[index];
		const value = argv[index + 1];
		if (flag !== "--log" && flag !== "--ceiling") {
			throw new Error(`Неизвестный аргумент: ${flag}. Поддерживаются --log и --ceiling.`);
		}
		if (value === undefined) throw new Error(`${flag} требует значение (путь к файлу).`);
		options[flag.slice(2)] = value;
	}
	if (!options.log) throw new Error("--log обязателен: путь к файлу с выводом набора.");
	if (!options.ceiling) throw new Error("--ceiling обязателен: путь к файлу потолка.");
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

	const counters = Object.fromEntries(COUNTER_NAMES.map((name) => [name, found.get(name)]));

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
	const accounted = counters.pass + counters.fail + counters.cancelled + counters.skipped + counters.todo;
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

function readCeiling(path) {
	const ceiling = JSON.parse(readFileSync(path, "utf8"));
	for (const key of ["fail", "cancelled", "broken"]) {
		if (!Number.isInteger(ceiling[key]) || ceiling[key] < 0) {
			throw new Error(`Потолок ${path}: поле «${key}» обязано быть целым неотрицательным числом.`);
		}
	}
	if (typeof ceiling.calibrated !== "boolean") {
		throw new Error(`Потолок ${path}: поле «calibrated» обязано быть true или false.`);
	}
	return ceiling;
}

function emit(lines) {
	const text = lines.join("\n");
	console.log(text);
	const summaryPath = process.env.GITHUB_STEP_SUMMARY;
	if (summaryPath) appendFileSync(summaryPath, `${text}\n`, "utf8");
}

function main() {
	const options = parseArguments(process.argv.slice(2));
	const ceiling = readCeiling(options.ceiling);
	const parsed = parseSummary(readFileSync(options.log, "utf8"));

	if (!parsed.ok) {
		emit([
			"## Тесты @dental/api — РАЗБОР НЕ УДАЛСЯ",
			"",
			parsed.reason,
		]);
		return 1;
	}

	const { counters } = parsed;
	const broken = counters.fail + counters.cancelled;
	const factLine =
		`tests ${counters.tests} / pass ${counters.pass} / fail ${counters.fail} / ` +
		`cancelled ${counters.cancelled} / skipped ${counters.skipped} / сломанных блоков ${broken}`;

	if (!ceiling.calibrated) {
		emit([
			"## Тесты @dental/api — ПОТОЛОК НЕ ОТКАЛИБРОВАН, храповик не кусает",
			"",
			`Замер этого прогона: ${factLine}`,
			"",
			"Потолок в `.github/workflows/api-test-ceiling.json` помечен `\"calibrated\": false`.",
			"Числа в нём сняты НА МАШИНЕ РАЗРАБОТЧИКА, против живой засеянной базы, под Windows.",
			"В CI база другая — чистая, только миграции, без seed-данных, Linux, — поэтому те числа",
			"здесь ничего не значат и сравнивать по ним значит ронять сборку по причине,",
			"не связанной с кодом.",
			"",
			"ЧТО СДЕЛАТЬ, ОДНОЙ ПРАВКОЙ:",
			"",
			"```json",
			`  "calibrated": true,`,
			`  "fail": ${counters.fail},`,
			`  "cancelled": ${counters.cancelled},`,
			`  "broken": ${broken},`,
			"```",
			"",
			"После этого храповик начнёт ронять сборку на РОСТЕ любого из трёх чисел.",
			"Пока `calibrated` равен false, это сообщение печатается на КАЖДОМ прогоне —",
			"незамеченным такое состояние не останется.",
		]);
		return 0;
	}

	const breaches = [];
	if (counters.fail > ceiling.fail) breaches.push(`fail: ${counters.fail} при потолке ${ceiling.fail}`);
	if (counters.cancelled > ceiling.cancelled) {
		breaches.push(`cancelled: ${counters.cancelled} при потолке ${ceiling.cancelled}`);
	}
	if (broken > ceiling.broken) breaches.push(`сломанных блоков: ${broken} при потолке ${ceiling.broken}`);

	if (breaches.length > 0) {
		emit([
			"## Тесты @dental/api — РОСТ ЧИСЛА СЛОМАННЫХ ТЕСТОВ",
			"",
			`Замер: ${factLine}`,
			"",
			"Вышло за потолок:",
			...breaches.map((breach) => `- ${breach}`),
			"",
			"Потолок поднимать нельзя: поднять его ради зелёного значит выключить проверку.",
			"Чините тесты, которые сломала эта правка. Потолок живёт в",
			"`.github/workflows/api-test-ceiling.json`, и его рост обязан быть отдельным",
			"осознанным решением владельца, а не побочным эффектом чужого коммита.",
		]);
		return 1;
	}

	const improvements = [];
	if (counters.fail < ceiling.fail) improvements.push(`fail: ${counters.fail} вместо ${ceiling.fail}`);
	if (counters.cancelled < ceiling.cancelled) {
		improvements.push(`cancelled: ${counters.cancelled} вместо ${ceiling.cancelled}`);
	}
	if (broken < ceiling.broken) improvements.push(`сломанных блоков: ${broken} вместо ${ceiling.broken}`);

	const lines = ["## Тесты @dental/api — роста нет", "", `Замер: ${factLine}`];
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
