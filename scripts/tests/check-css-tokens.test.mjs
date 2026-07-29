#!/usr/bin/env node
/**
 * Фикстуры на разбор входа в scripts/check-css-tokens.mjs.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ СУЩЕСТВУЕТ. Проверка неизвестных токенов дважды ошибалась в
 * свою пользу и об этом молчала: суффикс BEM-класса перед псевдоклассом
 * (`.btn--danger:hover`) она читала как объявление токена, а имена из .ts/.tsx
 * собирала текстом вместе с комментариями, поэтому закомментированное
 * `"--name":` навсегда помечало имя объявленным. Оба промаха невидимы в её
 * выводе: она просто печатает список короче настоящего. Числами такое не
 * поймать — нужен вход с заранее известным ответом.
 *
 * КАК ЭТО ПРОВЕРЯЕТСЯ. Настоящий файл проверки копируется байт в байт в
 * отдельное дерево-фикстуру и запускается там. Корень она вычисляет от своего
 * пути (`../`), поэтому копия видит только файлы фикстуры и ничего из
 * репозитория. Тест гоняет рабочий код, а не его пересказ, и не зависит от
 * того, что соседние агенты правят в apps/web прямо сейчас.
 *
 * ПОЧЕМУ ФИКСТУРА ЛЕЖИТ В node_modules/.cache, А НЕ В %TEMP%. Проверка
 * подключает пакет typescript, а Node ищет пакеты, поднимаясь по каталогам от
 * файла, который их подключает. Копия в системном каталоге для временных
 * файлов не нашла бы typescript и падала бы с ERR_MODULE_NOT_FOUND. Каталог
 * внутри репозитория до node_modules доходит; он же исключён из git первой
 * строкой .gitignore и удаляется в finally. Из этого же следует требование к
 * самой проверке: запускать её надо в дереве с установленными зависимостями.
 *
 * Запуск:  node --test scripts/tests/check-css-tokens.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const guardPath = join(scriptsDirectory, "check-css-tokens.mjs");
const fixtureParent = join(scriptsDirectory, "..", "node_modules", ".cache");

/**
 * Раскладывает дерево-фикстуру, запускает в нём проверку и возвращает её код
 * возврата вместе со склеенным выводом (сводка идёт в stdout, список нарушений
 * — в stderr). Дерево удаляется всегда, даже если утверждение упало.
 */
function runGuardOn(files) {
	mkdirSync(fixtureParent, { recursive: true });
	const root = mkdtempSync(join(fixtureParent, "dente-css-token-guard-"));
	try {
		const guardCopy = join(root, "scripts", "check-css-tokens.mjs");
		mkdirSync(dirname(guardCopy), { recursive: true });
		mkdirSync(join(root, "apps", "web", "src"), { recursive: true });
		copyFileSync(guardPath, guardCopy);
		for (const [relativeName, content] of Object.entries(files)) {
			const target = join(root, "apps", "web", "src", relativeName);
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, content, "utf8");
		}
		const result = spawnSync(process.execPath, [guardCopy], { encoding: "utf8" });
		assert.equal(result.error, undefined, "проверка не запустилась");
		return { status: result.status, output: `${result.stdout}${result.stderr}` };
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

/** Число из строки сводки, чтобы не зависеть от ширины выравнивания. */
function summaryNumber(output, label) {
	const match = output.match(new RegExp(`${label}\\s+(\\d+)`));
	assert.ok(match, `в выводе нет строки «${label}»:\n${output}`);
	return Number(match[1]);
}

/** Сколько имён и сколько вхождений проверка объявила неразрешимыми. */
function offenderTotals(output) {
	const match = output.match(/НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ:\s+(\d+) имён, (\d+) вхождений/);
	assert.ok(match, `в выводе нет итоговой строки нарушений:\n${output}`);
	return { names: Number(match[1]), occurrences: Number(match[2]) };
}

/**
 * Список известного долга — ЧИТАЕТСЯ ИЗ ИСХОДНИКА ПРОВЕРКИ, а не повторяется
 * здесь. Список меняется каждый раз, когда долг платят, и вписанная копия имени
 * разошлась бы с ним молча — ровно та болезнь, из-за которой эти тесты и
 * понадобились.
 *
 * Читаются ВСЕ записи, а не первая. Первая редакция этих тестов сеяла только
 * первую и получила расхождение по второй — то есть проверка была права, а тест
 * неверен. Фикстура обязана удовлетворять список целиком, иначе она проверяет не
 * то, что заявляет.
 */
function debtEntries() {
	const source = readFileSync(guardPath, "utf8");
	return [...source.matchAll(/\["(--[\w-]+)",\s*\{\s*occurrences:\s*(\d+),\s*file:\s*"([^"]+)"\s*\}\]/g)].map(
		(match) => ({ name: match[1], occurrences: Number(match[2]), file: match[3] }),
	);
}

/** Путь записи долга -> имя внутри дерева-фикстуры (она пишет от apps/web/src). */
const fixtureRelative = (repoPath) => repoPath.replace(/^apps\/web\/src\//, "");

/** Светлый литерал: любой запас выше порога яркости годится, важен не оттенок. */
const LIGHT_FALLBACK = "#f5f3ff";

/**
 * Css-файлы, в которых каждая запись долга получает ровно столько вхождений со
 * светлым запасом, сколько в ней записано. Имя из `skip` не сеется вовсе — так
 * получается расхождение записи с деревом, и ровно одно.
 */
function debtSatisfyingCss(entries, skip = null) {
	const byFile = new Map();
	for (const entry of entries) {
		if (entry.name === skip) continue;
		const key = fixtureRelative(entry.file);
		const lines = byFile.get(key) ?? [];
		for (let index = 0; index < entry.occurrences; index += 1) {
			lines.push(`.debt-${entry.name.slice(2)}-${index} { background: var(${entry.name}, ${LIGHT_FALLBACK}); }`);
		}
		byFile.set(key, lines);
	}
	return Object.fromEntries([...byFile].map(([file, lines]) => [file, `${lines.join("\n")}\n`]));
}

test("суффикс класса перед псевдоклассом не считается объявлением токена", () => {
	const { status, output } = runGuardOn({
		"styles/bem.css": [
			".btn--danger:hover { background: red; }",
			".btn--secondary::before { content: \"\"; }",
			".cancelled { border-left-color: var(--danger); }",
			"",
		].join("\n"),
	});

	assert.equal(summaryNumber(output, "объявлено переменных в css:"), 0, "селектор не объявляет токенов");
	assert.deepEqual(offenderTotals(output), { names: 1, occurrences: 1 });
	assert.match(output, /--danger/, "--danger обязан попасть в список");
	assert.equal(status, 1, "есть нарушение — код возврата 1");
});

test("закомментированное упоминание в .ts не глушит настоящее нарушение", () => {
	const { status, output } = runGuardOn({
		"styles/comments.css": [
			".y { color: var(--line-comment-token); }",
			".z { color: var(--block-comment-token); }",
			"",
		].join("\n"),
		"legacy.ts": [
			'// раньше тут было { "--line-comment-token": "1rem" }',
			'/* и в блочном комментарии: { "--block-comment-token": "2rem" } */',
			"export const noop = () => {};",
			"",
		].join("\n"),
	});

	assert.equal(summaryNumber(output, "имён выставляется из js:"), 0, "комментарий не выставляет токенов");
	assert.deepEqual(offenderTotals(output), { names: 2, occurrences: 2 });
	assert.match(output, /--line-comment-token/);
	assert.match(output, /--block-comment-token/);
	assert.equal(status, 1);
});

test("настоящие объявления и настоящие имена из js в список не попадают", () => {
	const { status, output } = runGuardOn({
		// Фрагмент без блока: привязка к началу файла.
		"styles/fragment.css": "--file-start: 1px;\n",
		"styles/declarations.css": [
			":root { --after-brace: 2px; --after-semicolon: 3px; }",
			'@property --registered { syntax: "<length>"; inherits: false; initial-value: 0px; }',
			// Вложенное правило: перед объявлением стоит `}`.
			".card { .inner { color: red; } --after-nested-block: 4px; }",
			":root { /* комментарий между скобкой и объявлением */ --after-comment: 5px; }",
			".use {",
			"  padding: var(--file-start) var(--after-brace) var(--after-semicolon);",
			"  margin: var(--registered) var(--after-nested-block) var(--after-comment);",
			"  transform: var(--from-set-property);",
			"  filter: var(--from-object-key);",
			"  outline-color: var(--from-computed-key);",
			"}",
			"",
		].join("\n"),
		"paint.tsx": [
			"export function paint(element: HTMLElement, color: string) {",
			'\telement.style.setProperty("--from-set-property", color);',
			'\treturn { "--from-object-key": color, ["--from-computed-key"]: color } as Record<string, string>;',
			"}",
			"",
		].join("\n"),
	});

	assert.equal(summaryNumber(output, "объявлено переменных в css:"), 6, "пять объявлений плюс @property");
	assert.equal(summaryNumber(output, "имён выставляется из js:"), 3, "setProperty, обычный и вычисляемый ключ");
	assert.deepEqual(offenderTotals(output), { names: 0, occurrences: 0 });
	assert.match(output, /Все var\(\) разрешаются/);
	assert.equal(status, 0, "нарушений нет — код возврата 0");
});

test("запас считается по месту использования, а не по имени", () => {
	const { status, output } = runGuardOn({
		"styles/fallback.css": [".a { color: var(--nowhere, #000); }", ".b { color: var(--nowhere); }", ""].join("\n"),
	});

	assert.equal(summaryNumber(output, "использований var\\(\\):"), 2);
	assert.match(output, /из них с запасом: 1/);
	assert.deepEqual(offenderTotals(output), { names: 1, occurrences: 1 }, "без запаса ломается только второе место");
	assert.equal(status, 1);
});

test("оба промаха на одном входе: проверка находит все три имени, а не одно", () => {
	// Ровно тот вход, на котором проверяющий поймал прежний разбор: тогда
	// печаталось «1 имён, 1 вхождений» — --danger съедало имя класса, а
	// --commented-token съедал комментарий в .ts.
	const { status, output } = runGuardOn({
		"styles/audit.css": [
			".btn--danger:hover { background: red; }",
			".x { border-left-color: var(--danger); }",
			".y { color: var(--definitely-missing-xyz); }",
			".z { color: var(--commented-token); }",
			"",
		].join("\n"),
		"audit.ts": '// упоминание { "--commented-token": "1rem" } и ничего больше\n',
	});

	assert.deepEqual(offenderTotals(output), { names: 3, occurrences: 3 });
	for (const name of ["--danger", "--definitely-missing-xyz", "--commented-token"]) {
		assert.match(output, new RegExp(`${name}\\b`), `${name} обязан попасть в список`);
	}
	assert.equal(summaryNumber(output, "объявлено переменных в css:"), 0);
	assert.equal(summaryNumber(output, "имён выставляется из js:"), 0);
	assert.equal(status, 1);
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * ДВА ТЕСТА НА СПИСОК ИЗВЕСТНОГО ДОЛГА — ТОТ САМЫЙ ДЕФЕКТ, ИЗ-ЗА КОТОРОГО ЧЕТЫРЕ
 * ТЕСТА ВЫШЕ КРАСНЕЛИ, И ОН БЫЛ НЕ В РАЗБОРЩИКЕ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Проверка расхождения списка долга стояла ПЕРЕД всеми списками нарушений и
 * выходила из процесса сама. Поэтому на дереве, где имени из списка нет, человек
 * получал одну строку про бухгалтерию — и ни одного настоящего нарушения, хотя
 * сводка выше их уже посчитала верно. В боевом репозитории это срабатывает в
 * первый же день, когда кто-то честно закроет долг: гейт краснеет, называет
 * причиной список, а пропавший текст и прозрачные плашки не печатает вовсе.
 *
 * Ни один из пяти тестов выше этого не поймал бы и после починки: у них в дереве
 * боевого файла нет, значит запись долга к их дереву не относится. Поэтому нужен
 * вход, где записанный файл ЕСТЬ.
 */

test("расхождение списка долга не съедает список нарушений", () => {
	const entries = debtEntries();
	assert.ok(entries.length > 0, "в KNOWN_LIGHT_FALLBACK_DEBT нет ни одной записи — механизм разрешений проверять нечем");
	const paid = entries[0];

	// Записанный файл в дереве ЕСТЬ, весь список удовлетворён — кроме одного
	// имени: его долг заплачен, а запись осталась. Это расхождение. Рядом лежит
	// настоящее нарушение, и оно обязано быть напечатано ПОИМЁННО, а не съедено.
	const { status, output } = runGuardOn({
		...debtSatisfyingCss(entries, paid.name),
		"styles/real-offender.css": ".x { color: var(--definitely-missing-abc); }\n",
	});

	assert.match(output, /Запись известного долга разошлась с деревом/, "расхождение обязано называться");
	assert.match(output, new RegExp(`${paid.name}\\b`), "имя из списка долга обязано быть названо");
	assert.match(
		output,
		new RegExp(`записано ${paid.occurrences}, в дереве 0`),
		"обе величины обязаны стоять рядом в одной строке",
	);
	assert.deepEqual(offenderTotals(output), { names: 1, occurrences: 1 });
	assert.match(output, /--definitely-missing-abc/, "настоящее нарушение обязано попасть в список, а не быть съеденным");
	assert.equal(status, 1);
});

test("разрешение долга действует только на записанное место", () => {
	const entries = debtEntries();
	assert.ok(entries.length > 0, "в KNOWN_LIGHT_FALLBACK_DEBT нет ни одной записи — механизм разрешений проверять нечем");
	const moved = entries[0];

	// То же имя, тот же светлый запас, но в ДРУГОМ файле. Пока разрешение
	// действовало на имя вообще, такое вхождение проходило молча под чужой
	// записью долга: перенеси нарушение в новый файл — и гейт его не видит.
	const { status, output } = runGuardOn({
		...debtSatisfyingCss(entries),
		"styles/elsewhere.css": `.moved { background: var(${moved.name}, ${LIGHT_FALLBACK}); }\n`,
	});

	assert.equal(summaryNumber(output, "СВЕТЛЫЙ ЗАПАС ВО ВСЕХ ТЕМАХ:"), 1, "лишнее место обязано краснеть");
	assert.match(output, /styles\/elsewhere\.css/, "красным обязано стать вхождение в НЕзаписанном файле");
	assert.doesNotMatch(output, /Запись известного долга разошлась/, "в записанных файлах счёт сошёлся");
	assert.equal(
		summaryNumber(output, "известный долг \\(лестницы оттенков\\):"),
		entries.length,
		"все записанные места погашены",
	);
	assert.equal(status, 1);
});
