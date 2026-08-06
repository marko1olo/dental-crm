#!/usr/bin/env node
/**
 * Фикстуры на разбор входа в scripts/check-declared-guards.mjs.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ СУЩЕСТВУЕТ. Проверка ищет класс дефекта «охрана объявлена и не
 * вызывается», который в этом дереве уже дал настоящую дыру: любой с токеном
 * кабинета писал в сетку приёмов клиники в обход гейта администратора
 * (`requireScheduleMutationAccess`, закрыто 1f4614ea2). Проверка такого класса
 * ценна ровно настолько, насколько доказано, что она ловит и не ловит. Её
 * собственный зелёный вывод доказательством не является: первая редакция смотрела
 * только на экспортированные функции и на настоящей дыре молчала — историческая
 * охрана была объявлена БЕЗ export.
 *
 * ГЛАВНЫЙ ТЕСТ ЗДЕСЬ — «настоящая дыра расписания в том виде, в каком она была»:
 * вход воспроизводит форму, а не пересказ, и краснеть проверка обязана на нём.
 *
 * КАК ЭТО ПРОВЕРЯЕТСЯ. Настоящий файл проверки копируется байт в байт в отдельное
 * дерево-фикстуру и запускается там. Корень она вычисляет от своего пути (`../`),
 * поэтому копия видит только файлы фикстуры и ничего из репозитория. Тест гоняет
 * рабочий код, а не его пересказ, и не зависит от того, что соседние агенты правят
 * в apps/api прямо сейчас.
 *
 * ПОЧЕМУ ФИКСТУРА ЛЕЖИТ В node_modules/.cache, А НЕ В %TEMP%. Проверка подключает
 * пакет typescript, а Node ищет пакеты, поднимаясь по каталогам от файла, который
 * их подключает. Копия в системном каталоге для временных файлов не нашла бы
 * typescript и падала бы с ERR_MODULE_NOT_FOUND.
 *
 * Запуск:  node --test scripts/tests/check-declared-guards.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const guardPath = join(scriptsDirectory, "check-declared-guards.mjs");
const fixtureParent = join(scriptsDirectory, "..", "node_modules", ".cache");

/**
 * Раскладывает дерево-фикстуру под apps/api/src, запускает в нём проверку и
 * возвращает код возврата со склеенным выводом. Дерево удаляется всегда.
 */
function runGuardOn(files, extraArgs = []) {
	mkdirSync(fixtureParent, { recursive: true });
	const root = mkdtempSync(join(fixtureParent, "dente-declared-guards-"));
	try {
		const guardCopy = join(root, "scripts", "check-declared-guards.mjs");
		mkdirSync(dirname(guardCopy), { recursive: true });
		mkdirSync(join(root, "apps", "api", "src"), { recursive: true });
		copyFileSync(guardPath, guardCopy);
		for (const [relativeName, content] of Object.entries(files)) {
			const target = join(root, "apps", "api", "src", relativeName);
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, content, "utf8");
		}
		const result = spawnSync(process.execPath, [guardCopy, ...extraArgs], {
			encoding: "utf8",
		});
		assert.equal(result.error, undefined, "проверка не запустилась");
		return {
			status: result.status,
			output: `${result.stdout}${result.stderr}`,
		};
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

function summaryNumber(output, label) {
	const match = output.match(new RegExp(`${label}\\s+(\\d+)`));
	assert.ok(match, `в выводе нет строки «${label}»:\n${output}`);
	return Number(match[1]);
}

test("настоящая дыра расписания: охрана без export и без вызывающих названа по имени", () => {
	// Форма исторического дефекта дословно: `async function` БЕЗ export, полный
	// набор текстов отказа — и ни одного вызова. Проверено на самом историческом
	// файле (git show 1f4614ea2^): проверка находит его на строке 141.
	const { status, output } = runGuardOn({
		"routes/schedule.ts": [
			'import type { FastifyReply, FastifyRequest } from "fastify";',
			"",
			"async function requireScheduleMutationAccess(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {",
			'\tconst secret = request.headers["x-dente-schedule-admin-secret"];',
			"\tif (!secret) {",
			'\t\treply.code(403).send({ error: "ScheduleAdminSecretRequired" });',
			"\t\treturn false;",
			"\t}",
			"\treturn true;",
			"}",
			"",
			"export async function registerScheduleRoutes(app: { post: (url: string, handler: unknown) => void }) {",
			'\tapp.post("/api/appointments", async () => ({ created: true }));',
			"}",
			"",
		].join("\n"),
	});

	assert.equal(summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"), 1);
	assert.match(
		output,
		/requireScheduleMutationAccess/,
		"имя охраны обязано быть напечатано",
	);
	assert.match(
		output,
		/routes\/schedule\.ts:3/,
		"место обязано быть напечатано файлом и строкой",
	);
	assert.equal(status, 1, "настоящая дыра класса обязана валить гейт");
});

test("экспортированная охрана без ссылок краснеет, вызванная — нет", () => {
	const { status, output } = runGuardOn({
		"guards.ts": [
			"export function requireNeverCalled(): boolean {",
			"\treturn true;",
			"}",
			"export function requireActuallyCalled(): boolean {",
			"\treturn true;",
			"}",
			"",
		].join("\n"),
		"routes/thing.ts": [
			'import { requireActuallyCalled } from "../guards.js";',
			"export function handler(): boolean {",
			"\treturn requireActuallyCalled();",
			"}",
			"",
		].join("\n"),
	});

	assert.equal(
		summaryNumber(output, "объявлено охранников:"),
		2,
		"две охраны; handler под шаблон имени не подходит",
	);
	assert.equal(summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"), 1);
	assert.match(output, /requireNeverCalled/);
	assert.doesNotMatch(
		output.split("ОХРАНА ОБЪЯВЛЕНА")[1] ?? "",
		/requireActuallyCalled/,
		"вызванная охрана в список нарушений попадать не должна",
	);
	assert.equal(status, 1);
});

test("ссылка-значение в preHandler считается сшивкой, праздный импорт — нет", () => {
	// Различие не косметическое: fastify вызывает охрану сам, прямого вызова в коде
	// нет. Считать это нарушением значило бы краснеть на верно сшитом маршруте.
	// Обратное тоже важно: втянутое и неиспользованное имя сшивкой не является,
	// иначе один праздный импорт гасил бы гейт навсегда.
	const { status, output } = runGuardOn({
		"guards.ts": [
			"export function requireViaPreHandler(): boolean {",
			"\treturn true;",
			"}",
			"export function requireOnlyImported(): boolean {",
			"\treturn true;",
			"}",
			"",
		].join("\n"),
		"routes/thing.ts": [
			'import { requireViaPreHandler, requireOnlyImported } from "../guards.js";',
			"export function register(app: { get: (url: string, options: unknown) => void }): void {",
			'\tapp.get("/api/thing", { preHandler: requireViaPreHandler });',
			"}",
			"export const unused = typeof requireOnlyImported;",
			"",
		].join("\n"),
	});

	// `typeof requireOnlyImported` — ссылка-значение, поэтому в этом входе сшитыми
	// считаются оба. Проверяется именно то, что preHandler зачёт даёт.
	assert.equal(summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"), 0);
	assert.equal(status, 0);

	// А теперь имя ТОЛЬКО импортировано и нигде не использовано.
	const idle = runGuardOn({
		"guards.ts":
			"export function requireOnlyImported(): boolean {\n\treturn true;\n}\n",
		"routes/thing.ts": [
			'import { requireOnlyImported } from "../guards.js";',
			"export function register(): string {",
			'\treturn "nothing wired";',
			"}",
			"",
		].join("\n"),
	});
	assert.equal(
		summaryNumber(idle.output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
		1,
		"праздный импорт сшивкой не является",
	);
	assert.match(idle.output, /имя импортируется и не используется: 1 раз/);
	assert.equal(idle.status, 1);
});

test("объявленная причина снимает нарушение, пустая — не снимает", () => {
	const withReason = runGuardOn({
		"guards.ts": [
			"/**",
			" * Заготовка под маршрут выгрузки, который ещё не написан.",
			" * guard-callers: none — маршрут выгрузки в реестр появится волной позже, задача DENTE-1234",
			" */",
			"export function requirePlannedGuard(): boolean {",
			"\treturn true;",
			"}",
			"",
		].join("\n"),
	});
	assert.equal(summaryNumber(withReason.output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"), 0);
	assert.equal(summaryNumber(withReason.output, "с объявленной причиной:"), 1);
	assert.match(
		withReason.output,
		/маршрут выгрузки в реестр появится волной позже/,
	);
	assert.equal(withReason.status, 0);

	// Маркер без текста — это глушилка, а не объяснение. Этот вход поймал настоящий
	// дефект в самой проверке: она принимала за причину закрывающую последовательность
	// комментария, то есть глушилка работала и выглядела объяснением.
	for (const emptyMarker of [
		"/** guard-callers: none — */",
		"// guard-callers: none — .",
		"/* guard-callers: none — */",
	]) {
		const emptyReason = runGuardOn({
			"guards.ts": [
				emptyMarker,
				"export function requirePlannedGuard(): boolean {",
				"\treturn true;",
				"}",
				"",
			].join("\n"),
		});
		assert.equal(
			summaryNumber(emptyReason.output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
			1,
			`маркер без причины не принимается: ${emptyMarker}`,
		);
		assert.equal(emptyReason.status, 1);
	}
});

test("одноимённые охраны в двух файлах не прикрывают друг друга", () => {
	// Неэкспортированная охрана снаружи недостижима, поэтому её вызов в ЧУЖОМ файле
	// — это вызов другого символа. Без разделения по области один файл гасил бы
	// нарушение в другом, и в дереве такие пары есть (sampleData.ts / sampleData_opt.ts).
	const { status, output } = runGuardOn({
		"alpha.ts": [
			"function assertSameName(value: string): void {",
			'\tif (!value) throw new Error("пусто");',
			"}",
			"export function useIt(value: string): void {",
			"\tassertSameName(value);",
			"}",
			"",
		].join("\n"),
		"beta.ts": [
			"function assertSameName(value: string): void {",
			'\tif (!value) throw new Error("пусто");',
			"}",
			"export function doesNotUseIt(): string {",
			'\treturn "ничего не проверяю";',
			"}",
			"",
		].join("\n"),
	});

	assert.equal(
		summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
		1,
		"вызов в alpha.ts не оправдывает beta.ts",
	);
	assert.match(
		output,
		/beta\.ts:1/,
		"нарушение обязано быть указано в beta.ts",
	);
	assert.doesNotMatch(
		output.split("ОХРАНА ОБЪЯВЛЕНА")[1] ?? "",
		/alpha\.ts/,
		"alpha.ts сшит и нарушением не является",
	);
	assert.equal(status, 1);
});

test("обращение к свойству с тем же именем зачёта не даёт и названо пояснением", () => {
	// Известный предел проверки, зафиксированный тестом, а не умолчанный: `x.requireY`
	// — другой символ. Если бы свойство давало зачёт, охрану гасило бы любое
	// одноимённое поле в дереве.
	const { status, output } = runGuardOn({
		"guards.ts":
			"export function requireByProperty(): boolean {\n\treturn true;\n}\n",
		"routes/thing.ts": [
			"const registry = { requireByProperty: () => true };",
			"export function register(): boolean {",
			"\treturn registry.requireByProperty();",
			"}",
			"",
		].join("\n"),
	});

	assert.equal(summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"), 1);
	assert.match(output, /обращение к свойству с тем же именем/);
	assert.equal(status, 1);
});

test("упоминание охраны в комментарии сшивкой не считается", () => {
	// Ровно то, на чём держалась schedule-дыра: имя находилось текстовым поиском,
	// потому что про него было НАПИСАНО. Для парсера комментарий — trivia.
	const { status, output } = runGuardOn({
		"guards.ts": [
			"export function requireMentionedOnly(): boolean {",
			"\treturn true;",
			"}",
			"",
		].join("\n"),
		"routes/thing.ts": [
			"// Здесь обязательно надо вызвать requireMentionedOnly(request, reply),",
			"/* и ещё раз: requireMentionedOnly — самая важная охрана периметра */",
			"export function register(): string {",
			'\treturn "а вызова нет";',
			"}",
			"",
		].join("\n"),
	});

	assert.equal(
		summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
		1,
		"комментарий охрану не сшивает",
	);
	assert.match(output, /requireMentionedOnly/);
	assert.equal(status, 1);
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * ИЗМЕРЕННЫЕ ПРЕДЕЛЫ: ЧТО ПРОВЕРКА НЕ ЛОВИТ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Эти три теста закрепляют ОБХОДЫ, найденные попыткой обойти проверку своими же
 * фикстурами. Они зелёные не потому, что всё хорошо, а потому что предел ИЗМЕРЕН и
 * зафиксирован: если кто-то случайно его закроет, тест упадёт и предел придётся
 * переписать осознанно. Заявленный предел без теста через два месяца превращается в
 * неверную строку в шапке — ровно то, что эта волна и правила в двух сценариях.
 */

test("ПРЕДЕЛ: ссылка-значение, которую никогда не вызывают, считается сшивкой", () => {
	// Главный обход, и он сознательный. `preHandler: requireX` выглядит ровно так же
	// и является настоящей сшивкой, поэтому краснеть здесь нельзя — иначе гейт
	// краснел бы на верно сшитых маршрутах и его выключили бы целиком.
	const { status, output } = runGuardOn({
		"guards.ts":
			"export function requireForgotten(a: unknown): boolean {\n\treturn Boolean(a);\n}\n",
		"routes/thing.ts": [
			'import { requireForgotten } from "../guards.js";',
			"const registry = { perimeter: requireForgotten };",
			"export function register(): string {",
			"\tvoid registry;",
			'\treturn "охрана лежит в объекте и не вызывается ни разу";',
			"}",
			"",
		].join("\n"),
	});

	assert.equal(
		summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
		0,
		"предел: присваивание считается сшивкой",
	);
	assert.equal(status, 0);
});

test("ПРЕДЕЛ: охрана как метод объекта в переписи не появляется вовсе", () => {
	// Слепая зона, и компилятор её тоже не закрывает: noUnusedLocals в дереве не
	// включён. Закрытие — отдельная задача, а не тихое умолчание.
	const { status, output } = runGuardOn({
		"guards.ts": [
			"export const perimeter = {",
			"\trequireHidden(a: unknown): boolean {",
			"\t\treturn Boolean(a);",
			"\t},",
			"};",
			"",
		].join("\n"),
	});

	assert.equal(
		summaryNumber(output, "объявлено охранников:"),
		0,
		"предел: метод объекта не объявление",
	);
	assert.equal(status, 0);
});

test("вызов через пространство имён сшивкой СЧИТАЕТСЯ — ложной тревоги нет", () => {
	// Это была настоящая ложная тревога первой редакции: `guards.requireX()`
	// объявлялось нарушением, хотя охрана вызывается. Замерено на фикстуре и
	// починено; тест держит починку.
	const { status, output } = runGuardOn({
		"guards.ts":
			"export function requireViaNamespace(a: unknown): boolean {\n\treturn Boolean(a);\n}\n",
		"routes/thing.ts": [
			'import * as guards from "../guards.js";',
			"export function register(a: unknown): boolean {",
			"\treturn guards.requireViaNamespace(a);",
			"}",
			"",
		].join("\n"),
	});

	assert.equal(
		summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
		0,
		"вызов через пространство имён — вызов",
	);
	assert.equal(status, 0);
});

test("псевдоним на импорте: используемый — сшивка, неиспользуемый — нарушение", () => {
	const used = runGuardOn({
		"guards.ts":
			"export function requireAliased(a: unknown): boolean {\n\treturn Boolean(a);\n}\n",
		"routes/thing.ts": [
			'import { requireAliased as gate } from "../guards.js";',
			"export function register(a: unknown): boolean {",
			"\treturn gate(a);",
			"}",
			"",
		].join("\n"),
	});
	assert.equal(
		summaryNumber(used.output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
		0,
		"вызов под псевдонимом — сшивка",
	);
	assert.equal(used.status, 0);

	const idle = runGuardOn({
		"guards.ts":
			"export function requireAliased(a: unknown): boolean {\n\treturn Boolean(a);\n}\n",
		"routes/thing.ts": [
			'import { requireAliased as gate } from "../guards.js";',
			"export function register(): string {",
			'\treturn "псевдоним втянут и не применён";',
			"}",
			"",
		].join("\n"),
	});
	assert.equal(
		summaryNumber(idle.output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
		1,
		"псевдоним, которым не воспользовались, сшивкой не является",
	);
	assert.equal(idle.status, 1);
});

test("боевое дерево: ни одного охранника без ссылок и без объяснения", () => {
	// Это и есть гейт. Прогон идёт по настоящему apps/api/src, а не по фикстуре:
	// без него все тесты выше проверяли бы только разборщик, а дерево — ничего.
	const result = spawnSync(process.execPath, [guardPath, "--census"], {
		encoding: "utf8",
	});
	assert.equal(result.error, undefined, "проверка не запустилась");
	const output = `${result.stdout}${result.stderr}`;
	assert.ok(
		summaryNumber(output, "объявлено охранников:") > 0,
		"перепись пуста — проверка ничего не разобрала",
	);
	assert.equal(
		summaryNumber(output, "ОБЪЯВЛЕН И НЕ ВЫЗВАН:"),
		0,
		`в дереве появился охранник без ссылок и без объяснения:\n${output}`,
	);
	assert.equal(result.status, 0, `проверка охранников красная:\n${output}`);
});
