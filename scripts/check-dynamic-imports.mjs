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
import { fileURLToPath } from "node:url";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..");

export const RAW_LAZY_ALLOWLIST_PATH = resolve(repoRoot, "scripts/config/raw-lazy-allowlist.json");

export function loadRawLazyAllowlist(customPath = RAW_LAZY_ALLOWLIST_PATH) {
	if (!existsSync(customPath)) {
		return { legacy_backlog: [] };
	}
	try {
		const raw = readFileSync(customPath, "utf8");
		return JSON.parse(raw);
	} catch (err) {
		console.error(`[check-dynamic-imports] Ошибка парсинга allowlist ${customPath}:`, err);
		return { legacy_backlog: [] };
	}
}

/**
 * Проверка использования сырого React.lazy в apps/web/src.
 * Канонический стандарт клиники: lazyWithRetry из apps/web/src/lib/lazyWithRetry.ts
 */
export function checkRawLazyUsage(webFiles, allowlist = null) {
	const backlogList = (allowlist?.legacy_backlog || loadRawLazyAllowlist().legacy_backlog || []).map((p) =>
		p.replace(/\\/g, "/"),
	);
	const allowedSet = new Set(backlogList);
	const violations = [];

	const RAW_REACT_LAZY = /\bReact\.lazy\s*\(/;
	const IMPORT_LAZY_FROM_REACT = /import\s*\{[^}]*\blazy\b[^}]*\}\s*from\s*["']react["']/;
	const BARE_LAZY_CALL = /\blazy\s*\(/;

	for (const file of webFiles) {
		const normalized = file.replace(/\\/g, "/");
		const relPath = normalized.replace(/^.*?(apps\/web\/src\/.*)$/, "$1");

		// Исключаем сам канонический файл lazyWithRetry и тесты
		if (
			normalized.endsWith("apps/web/src/lib/lazyWithRetry.ts") ||
			normalized.includes(".test.") ||
			normalized.includes(".spec.") ||
			normalized.includes("/tests/")
		) {
			continue;
		}

		if (!existsSync(file)) continue;
		let text;
		try {
			text = readFileSync(file, "utf8");
		} catch (_) {
			continue;
		}

		const code = text
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/(^|[^:])\/\/.*$/gm, "$1");

		const hasReactLazy = RAW_REACT_LAZY.test(code);
		const hasBareLazy = IMPORT_LAZY_FROM_REACT.test(code) && BARE_LAZY_CALL.test(code);

		if (hasReactLazy || hasBareLazy) {
			if (!allowedSet.has(relPath)) {
				const match = (hasReactLazy ? RAW_REACT_LAZY : BARE_LAZY_CALL).exec(code);
				const line = match ? code.slice(0, match.index).split("\n").length : 1;
				violations.push({
					file: relPath,
					line,
					message: `Использование сырого React.lazy запрещено! Все динамические компоненты должны загружаться исключительно через канонический lazyWithRetry (apps/web/src/lib/lazyWithRetry.ts) с защитой от сбоев чтения чанков на медленных дисках (5400 RPM HDD) и автоматическими ретраями.`,
				});
			}
		}
	}

	return violations;
}

const ROOTS = ["apps/api/src", "apps/web/src", "packages/shared/src"];

function sources(dir) {
	const out = [];
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry === "dist") continue;
		const full = join(dir, entry);
		if (!existsSync(full)) continue;
		try {
			if (statSync(full).isDirectory()) {
				out.push(...sources(full));
				continue;
			}
		} catch (_) {
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
export function resolveTarget(fromFile, specifier) {
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

export function checkBrokenDynamicImports(files) {
	const broken = [];
	let checked = 0;

	for (const file of files) {
		if (!existsSync(file)) continue;
		let text;
		try {
			text = readFileSync(file, "utf8");
		} catch (_) {
			continue;
		}
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

	return { broken, checked };
}

export function runDynamicImportChecks(options = {}) {
	const files = options.files || ROOTS.flatMap((root) => (existsSync(root) ? sources(root) : []));
	const webFiles = options.webFiles || (existsSync("apps/web/src") ? sources("apps/web/src") : []);
	const allowlist = options.allowlist || loadRawLazyAllowlist(options.allowlistPath);

	const { broken, checked } = checkBrokenDynamicImports(files);
	const rawLazyViolations = checkRawLazyUsage(webFiles, allowlist);

	return {
		passed: broken.length === 0 && rawLazyViolations.length === 0,
		broken,
		checked,
		filesCount: files.length,
		rawLazyViolations,
	};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = runDynamicImportChecks();

	console.log(`файлов просмотрено:            ${result.filesCount}`);
	console.log(`динамических импортов найдено:  ${result.checked}`);
	console.log(`ведут в несуществующий файл:    ${result.broken.length}`);
	console.log(`невалидных сырых React.lazy:    ${result.rawLazyViolations.length}`);

	if (result.broken.length > 0) {
		console.log(
			"\nНАЙДЕНЫ ИМПОРТЫ В НИКУДА. Проверка типов их не видит, а сервер падает",
		);
		console.log("при первом обращении к такому маршруту:\n");
		for (const item of result.broken) {
			console.log(`  ${item.file}:${item.line}`);
			console.log(`      import("${item.specifier}") — файла нет`);
		}
	}

	if (result.rawLazyViolations.length > 0) {
		console.error(`\n❌ НАЙДЕНО ИСПОЛЬЗОВАНИЕ СЫРОГО React.lazy (${result.rawLazyViolations.length} шт):`);
		for (const item of result.rawLazyViolations) {
			console.error(`  - ${item.file}:${item.line}`);
			console.error(`    ${item.message}`);
		}
	}

	if (!result.passed) {
		printFailureManifesto("DYNAMIC_IMPORTS", {
			details: `Найдено ${result.broken.length} битых динамических импортов и ${result.rawLazyViolations.length} сырых React.lazy.`,
		});
		process.exit(1);
	}

	console.log("\n✅ Все динамические импорты ведут на существующие файлы, сырой React.lazy блокирован.");
}
