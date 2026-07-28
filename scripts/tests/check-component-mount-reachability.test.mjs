/*
 * Проверка того, что страж достижимости умеет краснеть — и умеет зеленеть.
 *
 * Страж, который никто не заставил сработать, ничего не доказывает. Страж,
 * который красный всегда, доказывает ещё меньше: его просто отключат. Поэтому
 * здесь оба направления на одном и том же наборе файлов.
 *
 * Как устроено. Настоящий scripts/check-component-mount-reachability.mjs вместе
 * с правилами копируется в каталог во временной папке ОС — вне репозитория — и
 * запускается там. Скрипт определяет корень репозитория по своему же положению
 * (на уровень выше scripts/), поэтому подмены путей и специальных флагов не
 * нужно: проверяется ровно тот код, который поедет в коммит, без единой лазейки
 * вида «--root», которой потом можно было бы навести стража на пустой каталог и
 * получить зелёный.
 *
 * Запуск: node --import tsx --test scripts/tests/check-component-mount-reachability.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardRelative = "scripts/check-component-mount-reachability.mjs";
const rulesRelative = "scripts/lib/component-mount-rules.yml";

function writeFixtureFile(root, relativePath, contents) {
	const target = path.join(root, relativePath);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, contents, "utf8");
}

/** Разворачивает копию стража и минимальное приложение в отдельном каталоге вне репозитория. */
function createFixture(name) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), `dente-mount-guard-${name}-`));
	for (const relative of [guardRelative, rulesRelative]) {
		writeFixtureFile(root, relative, fs.readFileSync(path.join(repoRoot, relative), "utf8"));
	}
	return root;
}

function runGuard(root) {
	const result = spawnSync(process.execPath, [guardRelative, "--json"], {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	assert.notEqual(
		result.status,
		2,
		`guard failed to execute: ${result.stdout}\n${result.stderr}`,
	);
	let parsed;
	try {
		parsed = JSON.parse(result.stdout);
	} catch (error) {
		assert.fail(`guard produced unparseable output (${error.message}): ${result.stdout}`);
	}
	return { status: result.status, ...parsed };
}

function statesOf(report, filePart) {
	return report.findings
		.filter((finding) => finding.file.includes(filePart))
		.map((finding) => finding.state);
}

/*
 * Живая цепочка в три звена: main.tsx -> AppShell -> Live -> DeepLive.
 * Именно три, потому что промах кампании был в проверке двух звеньев из трёх.
 */
function writeHealthyApp(root) {
	writeFixtureFile(
		root,
		"apps/web/src/main.tsx",
		[
			'import { createRoot } from "react-dom/client";',
			'import { AppShell } from "./AppShell";',
			'const host = document.getElementById("root");',
			"if (host) createRoot(host).render(<AppShell />);",
			"",
		].join("\n"),
	);
	writeFixtureFile(
		root,
		"apps/web/src/AppShell.tsx",
		[
			'import { Live } from "./components/Live";',
			"export function AppShell() {",
			"  return <Live />;",
			"}",
			"",
		].join("\n"),
	);
	writeFixtureFile(
		root,
		"apps/web/src/components/Live.tsx",
		[
			// Одинарные кавычки намеренно: 145 строк импорта в apps/web/src написаны
			// именно так, и первая версия правил их не видела.
			"import { DeepLive } from '../deep/DeepLive';",
			"export function Live() {",
			"  return <DeepLive />;",
			"}",
			"",
		].join("\n"),
	);
	writeFixtureFile(
		root,
		"apps/web/src/deep/DeepLive.tsx",
		["export function DeepLive() {", "  return <p>ok</p>;", "}", ""].join("\n"),
	);
}

test("здоровое дерево: страж зелёный и видит все три звена", () => {
	const root = createFixture("green");
	writeHealthyApp(root);

	const report = runGuard(root);

	assert.equal(report.status, 0, `expected exit 0, got ${report.status}`);
	assert.equal(report.findings.length, 0);
	// Три компонента, не четыре: main.tsx компонента не объявляет, он вызывает
	// createRoot(...).render() напрямую — как настоящий apps/web/src/main.tsx.
	assert.equal(report.summary.componentsDeclared, 3);
	assert.equal(report.summary.counts.rendered, 3);
});

test("сирота: компонент, который никто не импортирует, назван по имени", () => {
	const root = createFixture("orphan");
	writeHealthyApp(root);
	writeFixtureFile(
		root,
		"apps/web/src/components/Orphan.tsx",
		["export function Orphan() {", "  return <span>dead</span>;", "}", ""].join("\n"),
	);

	const report = runGuard(root);

	assert.equal(report.status, 1);
	assert.deepEqual(statesOf(report, "Orphan.tsx"), ["orphaned"]);
	assert.equal(report.summary.counts.orphaned, 1);
});

test("импортируют, но не рендерят: хуже сироты, потому что выглядит подключённым", () => {
	const root = createFixture("dead-import");
	writeHealthyApp(root);
	writeFixtureFile(
		root,
		"apps/web/src/components/LooksWired.tsx",
		["export function LooksWired() {", "  return <span>never</span>;", "}", ""].join("\n"),
	);
	// AppShell импортирует LooksWired и не ставит его тегом. Компилятор молчит,
	// тесты молчат, ревьюер видит импорт и считает компонент подключённым.
	writeFixtureFile(
		root,
		"apps/web/src/AppShell.tsx",
		[
			'import { Live } from "./components/Live";',
			'import { LooksWired } from "./components/LooksWired";',
			"export function AppShell() {",
			"  return <Live />;",
			"}",
			"",
		].join("\n"),
	);

	const report = runGuard(root);

	assert.equal(report.status, 1);
	assert.deepEqual(statesOf(report, "LooksWired.tsx"), ["imported-but-never-rendered"]);
});

test("третье звено: рендерится внутри недостижимой ветки, а не рендерится вовсе", () => {
	const root = createFixture("subtree");
	writeHealthyApp(root);
	// Ровно та ловушка, на которой кампания погорела: DeadHost действительно
	// ставит <DeadChild /> тегом, два звена цепочки живы — но от main.tsx до
	// DeadHost дороги нет.
	writeFixtureFile(
		root,
		"apps/web/src/components/DeadHost.tsx",
		[
			'import { DeadChild } from "./DeadChild";',
			"export function DeadHost() {",
			"  return <DeadChild />;",
			"}",
			"",
		].join("\n"),
	);
	writeFixtureFile(
		root,
		"apps/web/src/components/DeadChild.tsx",
		["export function DeadChild() {", "  return <b>never</b>;", "}", ""].join("\n"),
	);

	const report = runGuard(root);

	assert.equal(report.status, 1);
	assert.deepEqual(statesOf(report, "DeadHost.tsx"), ["orphaned"]);
	assert.deepEqual(
		statesOf(report, "DeadChild.tsx"),
		["rendered-only-inside-an-unreachable-tree"],
		"DeadChild импортируют и ставят тегом — если страж назовёт его сиротой или живым, он врёт",
	);
});

test("ленивый маршрут остаётся живым, а предзагрузка чанка живым не делает", () => {
	const root = createFixture("lazy");
	writeHealthyApp(root);
	// Так App.tsx грузит все экраны: имя экспорта в .then() записано явно, и
	// локальное имя (Renamed) с ним не совпадает.
	writeFixtureFile(
		root,
		"apps/web/src/AppShell.tsx",
		[
			'import { lazy } from "react";',
			'import { Live } from "./components/Live";',
			'const Renamed = lazy(() => import("./LazyScreen").then((module) => ({ default: module.LazyScreen })));',
			"export function AppShell() {",
			"  return <><Live /><Renamed /></>;",
			"}",
			"",
		].join("\n"),
	);
	writeFixtureFile(
		root,
		"apps/web/src/LazyScreen.tsx",
		["export function LazyScreen() {", "  return <div>lazy</div>;", "}", ""].join("\n"),
	);
	// А это предзагрузка: модуль исполнится, компонент не отрендерится. Если бы
	// страж считал её рендером, один такой файл отбелил бы весь репозиторий.
	writeFixtureFile(
		root,
		"apps/web/src/preload.ts",
		['void import("./components/PreloadedOnly");', ""].join("\n"),
	);
	writeFixtureFile(
		root,
		"apps/web/src/components/PreloadedOnly.tsx",
		["export function PreloadedOnly() {", "  return <i>chunk</i>;", "}", ""].join("\n"),
	);

	const report = runGuard(root);

	assert.equal(report.status, 1);
	assert.equal(report.summary.counts["rendered-via-lazy-route"], 1);
	assert.equal(
		statesOf(report, "LazyScreen.tsx").length,
		0,
		"ленивая цель маршрута — живой компонент, нарушением быть не должна",
	);
	// Предзагруженный компонент остаётся НАРУШЕНИЕМ — вот что здесь важно.
	// Метка именно «импортируют, но не рендерят»: предзагрузка выглядит
	// подключением и им не является, что и есть определение этой корзины.
	assert.deepEqual(statesOf(report, "PreloadedOnly.tsx"), [
		"imported-but-never-rendered",
	]);
});

test("исключение снимает нарушение только вместе с причиной", () => {
	const root = createFixture("allowlist");
	writeHealthyApp(root);
	// Каталог __tests__ уже в ALLOWLIST стража с причиной.
	writeFixtureFile(
		root,
		"apps/web/src/__tests__/TestOnlyHarness.tsx",
		["export function TestOnlyHarness() {", "  return <div>harness</div>;", "}", ""].join("\n"),
	);

	const report = runGuard(root);

	assert.equal(report.status, 0, "разрешённый компонент не должен ронять стража");
	assert.equal(report.findings.length, 0);
	assert.equal(report.allowed.length, 1);
	assert.match(report.allowed[0].file, /TestOnlyHarness\.tsx$/);
	assert.ok(
		report.allowed[0].allowlistReason.length > 0,
		"запись в исключениях без причины бессмысленна",
	);
});
