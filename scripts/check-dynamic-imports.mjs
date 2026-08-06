/**
 * Динамические импорты, ведущие в никуда.
 *
 * ЗАЧЕМ. В маршрутах сервера принято подключать запросы к базе на месте:
 *   const { getSomethingFromDb } = await import("../db/somethingQuery.js");
 * Проверка типов такой импорт НЕ проверяет — путь в нём просто строка. Файл
 * удаляют, typecheck остаётся зелёным, и сервер падает при первом обращении к
 * маршруту: до этой минуты всё выглядит рабочим.
 *
 * Класс не выдуманный. Этой ночью из apps/api/src/db удалили два модуля запросов
 * (patientCommunicationTimelinesQuery и rebookingConversionRulesQuery) — оба
 * оказались осиротевшими, и удаление было верным. Но проверить это можно было
 * только руками: ни typecheck, ни тесты про такие пути не знают.
 *
 * Проверка читает исходники, находит все `await import("…")` и `import("…")` с
 * относительным путём и убеждается, что файл на диске существует.
 *
 * Только чтение. Возвращает ненулевой код при находках, чтобы её можно было
 * поставить в гейт.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const ROOTS = ["apps/api/src", "apps/web/src", "packages/shared/src"];

function sources(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry === "dist") continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			out.push(...sources(full));
			continue;
		}
		if ([".ts", ".tsx", ".mts", ".js", ".mjs"].includes(extname(entry)))
			out.push(full);
	}
	return out;
}

/**
 * Куда на диске смотрит путь импорта.
 *
 * Проект собран как ES-модули, поэтому в коде пишут «./x.js», а на диске лежит
 * «./x.ts». Проверяем оба варианта и папочный index — иначе проверка объявила бы
 * ненайденным каждый обычный импорт.
 */
function resolveTarget(fromFile, specifier) {
	const base = resolve(dirname(fromFile), specifier);
	const candidates = [base];
	if (base.endsWith(".js"))
		candidates.push(`${base.slice(0, -3)}.ts`, `${base.slice(0, -3)}.tsx`);
	if (base.endsWith(".mjs")) candidates.push(`${base.slice(0, -4)}.mts`);
	if (!extname(base)) {
		candidates.push(`${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`);
		candidates.push(
			join(base, "index.ts"),
			join(base, "index.tsx"),
			join(base, "index.js"),
		);
	}
	return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/*
 * САМОПРОВЕРКА. Проверка, которая никогда ничего не находит, опаснее её
 * отсутствия: она даёт спокойствие, ничего не охраняя. Поэтому до основной работы
 * убеждаемся, что механизм умеет и находить, и не придираться:
 *   несуществующий путь обязан не разрешиться;
 *   существующий модуль, записанный как «.js» при файле «.ts» на диске, обязан
 *     разрешиться — иначе проверка объявит ненайденным каждый обычный импорт.
 */
const selfCheckAnchor = "apps/api/src/db/client.ts";
if (existsSync(selfCheckAnchor)) {
	const mustFail = resolveTarget(
		selfCheckAnchor,
		"./этого-модуля-нет-и-никогда-не-было.js",
	);
	const mustPass = resolveTarget(selfCheckAnchor, "./schema.js");
	if (mustFail !== null) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: выдуманный путь разрешился, проверка ничего не поймает",
		);
		process.exit(2);
	}
	if (mustPass === null) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: существующий модуль не разрешился, будут ложные находки",
		);
		process.exit(2);
	}
	console.log(
		"самопроверка: выдуманный путь не разрешается, существующий разрешается",
	);
}

const files = ROOTS.flatMap((root) => (existsSync(root) ? sources(root) : []));
const broken = [];
let checked = 0;

for (const file of files) {
	const text = readFileSync(file, "utf8");
	/*
	 * Комментарии вырезаются: в этом проекте принято объяснять в комментариях, что
	 * какой модуль удалён, и путь из объяснения — не импорт. Без вырезания
	 * проверка ловила бы собственную документацию.
	 */
	const code = text
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/(^|[^:])\/\/.*$/gm, "$1");
	for (const match of code.matchAll(
		/\bimport\s*\(\s*["'`](\.[^"'`]+)["'`]\s*\)/g,
	)) {
		checked += 1;
		const specifier = match[1];
		if (resolveTarget(file, specifier)) continue;
		const line = code.slice(0, match.index).split("\n").length;
		broken.push({ file, line, specifier });
	}
}

console.log(`файлов просмотрено:            ${files.length}`);
console.log(`динамических импортов найдено:  ${checked}`);
console.log(`ведут в несуществующий файл:    ${broken.length}`);

if (broken.length > 0) {
	console.log(
		"\nНАЙДЕНЫ ИМПОРТЫ В НИКУДА. Проверка типов их не видит, а сервер падает",
	);
	console.log("при первом обращении к такому маршруту:\n");
	for (const item of broken) {
		console.log(`  ${item.file}:${item.line}`);
		console.log(`      import("${item.specifier}") — файла нет`);
	}
	console.log(
		"\nКак закрывать: либо вернуть модуль, либо убрать обращение к нему вместе",
	);
	console.log(
		"с маршрутом. Оставлять импорт «на потом» нельзя: он не сломает сборку и",
	);
	console.log("будет ждать первого посетителя раздела.");
	process.exit(1);
}

console.log("\nвсе динамические импорты ведут на существующие файлы");
