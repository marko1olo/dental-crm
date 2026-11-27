#!/usr/bin/env node
/**
 * scripts/dice-audit.mjs — Monte Carlo Reality Audit Engine («Кубик-Тест»).
 *
 * Создан на основе опыта Тимаэрта и требований Создателя для DENTE Dental CRM:
 * «если у вас большой код проекта... хороший способ проверить говносраки -
 * пишите агенты сгенери случайные числа (кинь кубик) и посмотри что там в тех строках
 * и опиши в рамках архитектуры и системности... если всё под контролем то ожидается 0 говносралов
 * если хотя бы один или больше то у вас ПРОБЛЕМЫ с агентами...
 * Кубик по строкам взвешен объёмом: чаще всего попадёт в оболочку, а не в ядро.
 * Поэтому у нас три списка — двери и писатели колонок, поля памяти, утверждения законов.
 * Строки ловят локальный мусор, списки — структурный: вторую дверь, колонку без читателя,
 * закон, которому код не соответствует».
 *
 * 3 ИНКВИЗИТОРСКИХ ВОПРОСА РЕАЛЬНОСТИ:
 *  1. Какая система порождает? (Домен, Ядро vs Оболочка)
 *  2. Через какую официальную дверь пишется? (Маршрут Fastify / Drizzle TX / Zustand Store)
 *  3. Законный контракт или скрытый костыль? (any, !, / 100, uppercase, хардкод токенов)
 *
 * ИСПОЛЬЗОВАНИЕ:
 *  node scripts/dice-audit.mjs [--samples 20] [--seed 42] [--list all|doors|fields|ui] [--strict] [--json]
 *  npm run audit:dice
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { codeOnly, NON_NULL_RE, RAW_MONEY_MATH_RE } from "./check-staged-safety.mjs";
import { collectFiles as collectAllCodeFiles, isTestFile as isAstTestFile, scanTestSource } from "./lib/code-health-ast.mjs";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

/* ------------------------------------------------------------------ *
 * Секция 1. Детерминированный PRNG (Mulberry32)
 * ------------------------------------------------------------------ */

/**
 * Создает сидируемый псевдослучайный генератор Mulberry32.
 * При одинаковом сиде последовательность воспроизводится на 100%.
 */
export function createPrng(seedVal) {
	let seed = 0;
	if (typeof seedVal === "number" && !Number.isNaN(seedVal)) {
		seed = seedVal >>> 0;
	} else if (typeof seedVal === "string" && seedVal.length > 0) {
		let h = 2166136261 >>> 0;
		for (let i = 0; i < seedVal.length; i++) {
			h ^= seedVal.charCodeAt(i);
			h = Math.imul(h, 16777619) >>> 0;
		}
		seed = h;
	} else {
		seed = (Date.now() ^ (Math.random() * 0x100000000)) >>> 0;
	}

	return function prng() {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* ------------------------------------------------------------------ *
 * Секция 2. CLI Парсер аргументов
 * ------------------------------------------------------------------ */

export function parseCliArgs(argv = process.argv.slice(2)) {
	const options = {
		samples: 100,
		seed: null,
		list: "all",
		strict: false,
		json: false,
		help: false,
		root: null,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg) continue;

		if (arg === "--samples" || arg === "-n") {
			const val = Number.parseInt(argv[++i], 10);
			if (!Number.isNaN(val) && val > 0) {
				options.samples = val;
			}
		} else if (arg.startsWith("--samples=")) {
			const val = Number.parseInt(arg.split("=")[1], 10);
			if (!Number.isNaN(val) && val > 0) {
				options.samples = val;
			}
		} else if (arg === "--seed" || arg === "-s") {
			options.seed = argv[++i] ?? null;
		} else if (arg.startsWith("--seed=")) {
			options.seed = arg.split("=")[1] ?? null;
		} else if (arg === "--list" || arg === "-l") {
			const val = (argv[++i] || "").toLowerCase();
			if (["doors", "fields", "ui", "tests", "all"].includes(val)) {
				options.list = val;
			}
		} else if (arg.startsWith("--list=")) {
			const val = arg.split("=")[1]?.toLowerCase();
			if (["doors", "fields", "ui", "tests", "all"].includes(val)) {
				options.list = val;
			}
		} else if (arg === "--strict") {
			options.strict = true;
		} else if (arg === "--root") {
			options.root = argv[++i] ?? null;
		} else if (arg.startsWith("--root=")) {
			options.root = arg.split("=")[1] ?? null;
		} else if (arg === "--json") {
			options.json = true;
		} else if (arg === "--help" || arg === "-h") {
			options.help = true;
		}
	}

	return options;
}

/* ------------------------------------------------------------------ *
 * Секция 3. Файловая разведка монорепозитория
 * ------------------------------------------------------------------ */

const EXCLUDED_DIRS = new Set([
	"node_modules",
	"dist",
	"build",
	".git",
	".data",
	"coverage",
	"scratch",
	".system_generated",
	"artifacts",
	"seeds", // clinical formulas (ИРОПЗ etc.) are not money math — false positive exclusion
]);

const TEST_FILE_PATTERNS = [
	/\.test\.[cm]?[jt]sx?$/,
	/\.spec\.[cm]?[jt]sx?$/,
	/TestHelpers\.[cm]?[jt]sx?$/,
	/__tests__/,
	/\/tests\//,
	/\.d\.ts$/,
];

export function isCombatSourceFile(filePath) {
	const normalized = filePath.replace(/\\/g, "/");
	if (TEST_FILE_PATTERNS.some((pat) => pat.test(normalized))) {
		return false;
	}
	return /\.(ts|tsx|js|mjs)$/.test(normalized);
}

/**
 * Рекурсивно собирает все боевые файлы из целевых директорий.
 */
export function collectCombatFiles(rootDir, targetDirs = ["packages/shared/src", "apps/api/src", "apps/web/src"]) {
	const results = [];

	function walk(currentDir) {
		let entries;
		try {
			entries = readdirSync(currentDir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name);
			if (entry.isDirectory()) {
				if (EXCLUDED_DIRS.has(entry.name)) continue;
				walk(fullPath);
			} else if (entry.isFile()) {
				if (isCombatSourceFile(fullPath)) {
					results.push(fullPath);
				}
			}
		}
	}

	for (const target of targetDirs) {
		const absTarget = path.isAbsolute(target) ? target : path.join(rootDir, target);
		walk(absTarget);
	}

	return results;
}

/* ------------------------------------------------------------------ *
 * Секция 4. Определение системы и официальной двери
 * ------------------------------------------------------------------ */

export function classifySystem(relPath) {
	const p = relPath.replace(/\\/g, "/");

	let domain = "Инфраструктура";
	let layer = "Оболочка";

	if (p.includes("packages/shared/")) {
		layer = "Ядро (Shared SSOT)";
		if (p.includes("/billing/") || p.includes("/fiscal/")) domain = "Финансы и 54-ФЗ";
		else if (p.includes("/emr/") || p.includes("/clinical/")) domain = "Клиническое ядро (ЭМК / SOAP)";
		else if (p.includes("/warehouse/") || p.includes("/inventory/")) domain = "Склад и Soft Stock";
		else if (p.includes("/schedule/")) domain = "Расписание и слоты";
		else if (p.includes("/documents/")) domain = "Документооборот (ИДС / ФНС 1151156)";
		else if (p.includes("/insurance/")) domain = "ДМС и страховые";
		else if (p.includes("/marketing/")) domain = "Маркетинг и аналитика";
		else domain = "Канонические контракты";
	} else if (p.includes("apps/api/src/db/schema/")) {
		layer = "Ядро (PostgreSQL 18 Schema)";
		domain = "Реляционная схема данных";
	} else if (p.includes("apps/api/src/routes/")) {
		layer = "Оболочка (Fastify API Gateway)";
		if (p.includes("/billingRoutes") || p.includes("/cashbox") || p.includes("/fiscal")) domain = "Касса 54-ФЗ и Платежи";
		else if (p.includes("/diary") || p.includes("/clinical") || p.includes("/odontogram")) domain = "Клинический приём и формула";
		else if (p.includes("/inventory/")) domain = "Складской бэк-офис";
		else if (p.includes("/patients/")) domain = "Картотека пациентов";
		else if (p.includes("/telephony")) domain = "Телефония";
		else domain = "API контроллеры";
	} else if (p.includes("apps/web/src/components/")) {
		layer = "Оболочка (React 19 UI)";
		if (p.includes("/odontogram")) domain = "Одонтограмма Wheeler 2.5D";
		else if (p.includes("/cashbox") || p.includes("/billing") || p.includes("/finance")) domain = "Кассовый чекаут и сплит";
		else if (p.includes("/shift")) domain = "Смена и Z-отчет";
		else if (p.includes("/copilot")) domain = "Соло-ассистент DENTE";
		else if (p.includes("/schedule")) domain = "Расписание кресел";
		else if (p.includes("/emr") || p.includes("/visit")) domain = "Приём врача у кресла";
		else domain = "Пользовательский интерфейс";
	} else if (p.includes("apps/web/src/App.tsx")) {
		layer = "Оболочка (Root UI Container)";
		domain = "Корневой контейнер приложения";
	}

	return { domain, layer };
}

export function detectOfficialDoor(relPath, lineContent, contextLines) {
	const p = relPath.replace(/\\/g, "/");
	const joined = contextLines.join("\n");

	if (p.includes("apps/api/src/routes/")) {
		if (/fastify\.(post|put|patch|delete)|method:\s*['"](POST|PUT|PATCH|DELETE)/i.test(joined)) {
			return "Fastify Mutation Route Gateway (Idempotency Required)";
		}
		return "Fastify Query Route Gateway";
	}
	if (p.includes("apps/api/src/db/")) {
		if (/db\.transaction/i.test(joined)) {
			return "Postgres ACID Transaction Boundary";
		}
		return "Drizzle ORM Relational Mapping";
	}
	if (p.includes("packages/shared/")) {
		if (/z\.object/i.test(joined)) {
			return "Zod Strict Contract Schema";
		}
		return "Canonical Shared Type Definition";
	}
	if (p.includes("apps/web/src/")) {
		if (/<button|<Button|<DenteButton/i.test(joined)) {
			return "Touch/Desktop User Interaction Point (Mandate 8am)";
		}
		if (/use[A-Z]\w+Store/i.test(joined)) {
			return "Zustand Reactive Store Dispatcher";
		}
		return "React 19 View Hierarchy";
	}

	return "Internal Module Execution";
}

/* ------------------------------------------------------------------ *
 * Секция 5. Инспекция строки: 3 вопроса реальности
 * ------------------------------------------------------------------ */

/**
 * Проверяет выпавшую строку на наличие локального мусора и костылей.
 */
export function inspectLine(sample) {
	const { relPath, lineNum, current, before, after } = sample;
	const contextLines = [...before, current, ...after];
	const joinedContext = contextLines.join("\n");

	const { domain, layer } = classifySystem(relPath);
	const officialDoor = detectOfficialDoor(relPath, current, contextLines);

	const defects = [];

	// Проверка 0: Подавление компилятора/линтера (живут именно в комментариях — проверяем ДО isComment!)
	const trimmedCurrent = current.trim();
	const isComment = trimmedCurrent.startsWith("//") || trimmedCurrent.startsWith("/*") || trimmedCurrent.startsWith("*");
	if (/(?:\/\/|\/\*)\s*(@ts-ignore|@ts-expect-error|@ts-nocheck|biome-ignore|eslint-disable)/.test(current)) {
		defects.push({
			rule: "MANDATE_8be_SUPPRESSION_DIRECTIVE",
			severity: "HIGH",
			message: "Обнаружена директива подавления компилятора/линтера (@ts-ignore / @ts-expect-error / biome-ignore / eslint-disable).",
		});
	}

	// Проверка 1: Запрещенный any / double cast / as never / z.any() (Мандат 8be)
	if (!isComment) {
		const currentCode = codeOnly(current);
		const isTsFile = /\.(?:ts|tsx|mts|cts)$/.test(relPath);

		if (/\bas\s*\(?\s*any\s*\)?\b/i.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8be_AS_ANY",
				severity: "HIGH",
				message: "Обнаружен слепой каст 'as any'. Требуется строгий Zod/TypeScript контракт.",
			});
		} else if (/\bas\s+(?:unknown|any)\s+as\b/i.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8be_DOUBLE_CAST",
				severity: "HIGH",
				message: "Обнаружен двойной каст 'as unknown as ...'. Нарушение честной типизации.",
			});
		} else if (/\bas\s+never\b/.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8be_AS_NEVER",
				severity: "HIGH",
				message: "Обнаружен слепой каст 'as never'. Требуется строгий тип без обмана компилятора.",
			});
		} else if (
			isTsFile &&
			(/(?::\s*any\b|\bany\[\]|<\s*any\s*>|\bRecord\s*<\s*[^,>]+\s*,\s*any\s*>|\|\s*any\b|\bany\s*\||=\s*any\b)/.test(currentCode))
		) {
			defects.push({
				rule: "MANDATE_8be_EXPLICIT_ANY",
				severity: "HIGH",
				message: "Объявлен нетипизированный 'any' (: any, any[], Record<_, any>, | any). Требуется строгий DTO или Discriminated Union.",
			});
		}

		if (/\bz\.any\s*\(/.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8be_ZOD_ANY",
				severity: "HIGH",
				message: "Обнаружен z.any() в Zod-валидации. Используй строгий контракт или z.unknown().",
			});
		}

		// Проверка 2: Слепой Non-null assertion (!) в ЛЮБОЙ форме (x!.y, arr[0]!, fn()!, foo(a!)) (Мандат 8be)
		if (isTsFile && NON_NULL_RE.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8be_NON_NULL_ASSERTION",
				severity: "HIGH",
				message: "Обнаружен Non-Null assertion (!). Риск рантайм падения TypeError при null/undefined.",
			});
		}

		// Проверка 3: Опасное деление на 100 или скрытое умножение на 0.01 / .01 для денег (Мандат 8bm)
		const isCanonicalMoneyFile = /(?:^|\/)(?:money|kopecksArithmetic|billingMath)\.[cm]?[jt]sx?$/i.test(relPath);
		if (!isCanonicalMoneyFile && RAW_MONEY_MATH_RE.test(currentCode)) {
			const isDiv = /\/\s*100\b/.test(currentCode);
			defects.push({
				rule: isDiv ? "MANDATE_8bm_RAW_MONEY_DIVISION" : "MANDATE_8bm_RAW_MONEY_MULTIPLICATION",
				severity: "HIGH",
				message: isDiv
					? "Деление денежной суммы на 100 в обход @dental/shared/src/money.ts (formatKopecksToRub)."
					: "Скрытое умножение денег на 0.01 / .01 в обход @dental/shared/src/money.ts (calculatePercentDiscountKopecks).",
			});
		}

		// Проверка 4: Запрет uppercase на кнопках и табах (Мандат 8am / 8d)
		if (/\buppercase\b/.test(current) && /<button|<Tab|<Chip|className.*uppercase/i.test(joinedContext)) {
			defects.push({
				rule: "MANDATE_8am_UPPERCASE_BAN",
				severity: "MEDIUM",
				message: "Капслок на кнопке/чипе. Строго Sentence case («Сохранить», «Новый приём»).",
			});
		}

		// Проверка 5: Хардкод цветов на кнопках (Мандат 8am)
		if (/bg-amber-100|bg-blue-600|bg-indigo-600|#0d9488/.test(current) && /<button|<Button|className/i.test(joinedContext)) {
			defects.push({
				rule: "MANDATE_8am_HARDCODED_BUTTON_COLOR",
				severity: "MEDIUM",
				message: "Хардкодный цвет кнопки. Разрешены только дизайн-токены: var(--primary), var(--paper), var(--line).",
			});
		}

		// Проверка 6: Утечки ТЗ и дев-жаргона в UI (Мандат 8bi / 8zg)
		if (/(1[- ]клик|Мандат 8e|modeFit|без 10 чекбоксов)/i.test(current) && />.*</.test(current)) {
			defects.push({
				rule: "MANDATE_8bi_DEV_JARGON_LEAK",
				severity: "HIGH",
				message: "Утечка ТЗ/дев-жаргона в видимый лейбл интерфейса. Используйте клинический русский язык.",
			});
		}

		// Проверка 6.5: Тихое проглатывание промисов и тест-сниффинг в боевом коде
		if (/\.catch\s*\(\s*(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>\s*(?:\{\s*\}|undefined|null)\s*\)/.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8zr_SWALLOWED_PROMISE",
				severity: "HIGH",
				message: "Тихое проглатывание rejected Promise (.catch(() => {} / null / undefined)).",
			});
		}
		if (/\bwindow\.(alert|confirm|prompt)\s*\(/.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8e_WINDOW_DIALOG",
				severity: "HIGH",
				message: "Блокирующее браузерное окно window.alert/confirm/prompt запрещено.",
			});
		}
		if (/\bprocess\.env\.(?:VITEST|VITEST_WORKER_ID|JEST_WORKER_ID|NODE_TEST_CONTEXT)\b/.test(currentCode)) {
			defects.push({
				rule: "ANTI_GOODHART_TEST_ENV_SNIFF",
				severity: "HIGH",
				message: "Боевой код детектирует тест-раннер (VITEST / NODE_TEST_CONTEXT) и меняет поведение под тесты.",
			});
		}

		// Проверка 7: Расширенная контекстная инспекция блока (±15 строк)
		const contextCode = contextLines.map((l) => codeOnly(l)).join("\n");
		if (/\bas\s+any\b/i.test(contextCode) && !/\bas\s+any\b/i.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8be_CONTEXT_AS_ANY",
				severity: "HIGH",
				message: "В блоке обнаружен слепой каст 'as any'. Требуется строгая типизация.",
			});
		}
		if (!isCanonicalMoneyFile && RAW_MONEY_MATH_RE.test(contextCode) && !RAW_MONEY_MATH_RE.test(currentCode)) {
			defects.push({
				rule: "MANDATE_8bm_CONTEXT_RAW_MONEY_DIVISION",
				severity: "HIGH",
				message: "В блоке обнаружен ручной float-расчёт денег (/ 100, * 0.01) в обход money.ts.",
			});
		}
		if (relPath.includes("apps/api/") && /console\.(log|warn|error)\(/.test(contextCode) && !relPath.includes("scripts/")) {
			defects.push({
				rule: "ROT_008_CONTEXT_CONSOLE_IN_API",
				severity: "MEDIUM",
				message: "В блоке API обнаружен неструктурированный console.log вместо Fastify logger.",
			});
		}
		// Ловим И `catch {}` (ES2019 optional catch binding), И `catch (e) {}`!
		if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(contextCode)) {
			defects.push({
				rule: "MANDATE_8zr_EMPTY_CATCH",
				severity: "HIGH",
				message: "В блоке обнаружен пустой catch {} — тихое проглатывание ошибок.",
			});
		}
	}

	return {
		relPath,
		lineNum,
		code: current.trim(),
		system: { domain, layer },
		officialDoor,
		status: defects.length === 0 ? "CLEAN" : "DEFECT",
		defects,
		context: {
			before,
			current,
			after,
		},
	};
}

/* ------------------------------------------------------------------ *
 * Секция 6. Случайная выборка строк кодовой базы (Dice Lines)
 * ------------------------------------------------------------------ */

export function sampleLines(files, count, prng, rootDir) {
	if (!files || files.length === 0) return [];

	// Сбалансированное взвешивание Тимаэрта: 50% равный вес файла + 50% вес по объёму (байты),
	// чтобы мелкие и средние файлы не тонули в тени гигантских модулей.
	const rawFiles = [];
	let totalSize = 0;

	for (const f of files) {
		try {
			const size = statSync(f).size;
			if (size > 10) {
				rawFiles.push({ file: f, size });
				totalSize += size;
			}
		} catch {
			// игнорируем файлы с ошибкой чтения
		}
	}

	if (rawFiles.length === 0) return [];

	const avgSize = totalSize / rawFiles.length;
	const weightedFiles = [];
	let totalWeight = 0;
	for (const rf of rawFiles) {
		const weight = 0.5 * avgSize + 0.5 * rf.size;
		weightedFiles.push({ file: rf.file, weight });
		totalWeight += weight;
	}

	const samples = [];
	const usedCoordinates = new Set();

	// Кэш прочитанных файлов для ускорения
	const fileLinesCache = new Map();

	let attempts = 0;
	const maxAttempts = count * 20;

	while (samples.length < count && attempts < maxAttempts) {
		attempts++;

		// Выбираем файл взвешенно по размеру
		let targetWeight = prng() * totalWeight;
		let selectedFile = weightedFiles[0].file;

		for (const wf of weightedFiles) {
			if (targetWeight <= wf.weight) {
				selectedFile = wf.file;
				break;
			}
			targetWeight -= wf.weight;
		}

		// Читаем строки
		let lines = fileLinesCache.get(selectedFile);
		if (!lines) {
			try {
				const content = readFileSync(selectedFile, "utf8");
				lines = content.split(/\r?\n/);
				fileLinesCache.set(selectedFile, lines);
			} catch {
				continue;
			}
		}

		if (lines.length === 0) continue;

		// Выбираем случайную строку
		const lineIndex = Math.floor(prng() * lines.length);
		const lineNum = lineIndex + 1;
		const coordKey = `${selectedFile}:${lineNum}`;

		if (usedCoordinates.has(coordKey)) continue;
		usedCoordinates.add(coordKey);

		// Пропускаем абсолютно пустые строки
		const current = lines[lineIndex];
		if (!current || current.trim().length === 0) continue;

		const start = Math.max(0, lineIndex - 15);
		const end = Math.min(lines.length - 1, lineIndex + 15);

		const before = lines.slice(start, lineIndex);
		const after = lines.slice(lineIndex + 1, end + 1);

		const relPath = path.relative(rootDir, selectedFile).replace(/\\/g, "/");

		const sample = {
			fullPath: selectedFile,
			relPath,
			lineNum,
			current,
			before,
			after,
		};

		const inspected = inspectLine(sample);
		samples.push(inspected);
	}

	return samples;
}

/* ------------------------------------------------------------------ *
 * Секция 7. Список 1: Двери и Мутации (Doors & Mutations)
 * ------------------------------------------------------------------ */

// Routes that are genuinely public / non-tenant auth / portal / DICOMweb / stateless checks
const PUBLIC_ROUTE_PATTERNS = [
	/\/api\/auth\/(login|logout|refresh|password|forgot|reset|pin|setup|register|invites\/accept|staff\/unlock|staff\/switch-role)\b/i,
	/\/api\/(?:v1\/)?(public|portal)\//i,
	/\/api\/(?:billing\/)?sbp\/verify-payload\b/i,
	/\/api\/imaging\/dicom\/viewer-launch-manifest\b/i,
	/\/api\/dicomweb\//i,
	/\/api\/(auth\/)?demo\//i,
];

// External callbacks/webhooks must verify cryptographic signature or shared webhook secret
const WEBHOOK_ROUTE_PATTERN =
	/(\/webhook|\/callback|\/api\/communications\/receipts\/(?:smsru|smsc))(\b|\/|$)/i;

function stripCodeComments(src) {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/(^|[^:\\])\/\/[^\r\n]*/g, "$1");
}

function extractBalancedBlock(text, startIdx, openChar = "{", closeChar = "}", maxChars = 30000) {
	let depth = 0;
	let inSingle = false;
	let inDouble = false;
	let inTemplate = false;
	let inLineComment = false;
	let inBlockComment = false;
	let escaped = false;
	let started = false;
	const endLimit = Math.min(text.length, startIdx + maxChars);

	for (let k = startIdx; k < endLimit; k++) {
		const ch = text[k];
		if (inLineComment) {
			if (ch === "\n") inLineComment = false;
			continue;
		}
		if (inBlockComment) {
			if (ch === "*" && text[k + 1] === "/") {
				inBlockComment = false;
				k++;
			}
			continue;
		}
		if (escaped) {
			escaped = false;
			continue;
		}
		if (ch === "\\" && (inSingle || inDouble || inTemplate)) {
			escaped = true;
			continue;
		}
		if (!inSingle && !inDouble && !inTemplate) {
			if (ch === "/" && text[k + 1] === "/") {
				inLineComment = true;
				k++;
				continue;
			}
			if (ch === "/" && text[k + 1] === "*") {
				inBlockComment = true;
				k++;
				continue;
			}
		}
		if (!inDouble && !inTemplate && ch === "'") {
			inSingle = !inSingle;
			continue;
		}
		if (!inSingle && !inTemplate && ch === '"') {
			inDouble = !inDouble;
			continue;
		}
		if (!inSingle && !inDouble && ch === "`") {
			inTemplate = !inTemplate;
			continue;
		}
		if (inSingle || inDouble || inTemplate) continue;

		if (ch === openChar) {
			depth++;
			started = true;
		} else if (ch === closeChar && started) {
			depth--;
			if (depth === 0) {
				return text.slice(startIdx, k + 1);
			}
		}
	}
	return text.slice(startIdx, endLimit);
}

function loadGlobalIdempotencyConfig(rootDir) {
	const registrarPath = path.join(rootDir, "apps/api/src/serverModules/pluginRegistrar.ts");
	const pluginPath = path.join(rootDir, "apps/api/src/plugins/idempotencyPlugin.ts");
	let hasGlobalPlugin = false;
	const exemptPaths = [];

	if (existsSync(registrarPath)) {
		try {
			const registrarSrc = stripCodeComments(readFileSync(registrarPath, "utf8"));
			if (/\.register\s*\(\s*idempotencyPlugin\b/.test(registrarSrc)) {
				hasGlobalPlugin = true;
			}
		} catch {
			// ignore read errors
		}
	}

	if (existsSync(pluginPath)) {
		try {
			const pluginSrc = readFileSync(pluginPath, "utf8");
			const exemptMatch = pluginSrc.match(/DEFAULT_IDEMPOTENCY_EXEMPT_PATHS\s*=\s*\[([\s\S]*?)\]/);
			if (exemptMatch) {
				for (const m of exemptMatch[1].matchAll(/["']([^"']+)["']/g)) {
					exemptPaths.push(m[1]);
				}
			}
		} catch {
			// ignore read errors
		}
	}

	return { hasGlobalPlugin, exemptPaths };
}

function computeLineStartOffsets(content) {
	const offsets = [0];
	for (let idx = 0; idx < content.length; idx++) {
		if (content[idx] === "\n") {
			offsets.push(idx + 1);
		}
	}
	return offsets;
}

function resolveRelativeTsFile(fromFilePath, relImport) {
	const dir = path.dirname(fromFilePath);
	const baseImport = relImport.replace(/\.[cm]?js$/, "");
	const candidates = [
		path.resolve(dir, `${baseImport}.ts`),
		path.resolve(dir, `${baseImport}.mts`),
		path.resolve(dir, `${baseImport}/index.ts`),
	];
	const resolvedFile = candidates.find((c) => existsSync(c));
	if (!resolvedFile) return null;
	const normalizedResolved = resolvedFile.replace(/\\/g, "/");
	if (
		!normalizedResolved.includes("/apps/api/src/") &&
		!normalizedResolved.includes("/routes/")
	) {
		return null;
	}
	return resolvedFile;
}

function readCachedFile(filePath, fileContentCache) {
	let content = fileContentCache.get(filePath);
	if (content === undefined) {
		try {
			content = readFileSync(filePath, "utf8");
		} catch {
			content = "";
		}
		fileContentCache.set(filePath, content);
	}
	return content;
}

function extractClassMethodBlock(classBody, methodName) {
	const methodRe = new RegExp(
		`(?:^|\\n)[ \\t]*(?:public|private|protected|static|async|\\s)*\\b${methodName}\\s*\\(`,
	);
	const m = methodRe.exec(classBody);
	if (!m) return null;
	const braceIdx = findFunctionBodyBrace(classBody, m.index + m[0].length - 1, false);
	if (braceIdx === -1) return null;
	return extractBalancedBlock(classBody, braceIdx);
}

function extractSymbolFromModule(filePath, symbolName, fileContentCache, depth = 0) {
	if (depth > 3) return null;
	const targetContent = readCachedFile(filePath, fileContentCache);
	if (!targetContent) return null;

	const declRe = new RegExp(
		`(?:^|\\n)(?:export\\s+)?(?:(?:async\\s+)?function\\s+${symbolName}\\b|(?:abstract\\s+)?class\\s+${symbolName}\\b|(?:const|let)\\s+${symbolName}\\s*=)`,
	);
	const declMatch = declRe.exec(targetContent);
	if (declMatch) {
		if (/(?:^|\s)class\s+/.test(declMatch[0])) {
			const classBraceIdx = targetContent.indexOf("{", declMatch.index);
			if (classBraceIdx !== -1) {
				return extractBalancedBlock(targetContent, classBraceIdx);
			}
		}
		const isConstArrow = /(?:const|let)\s+/.test(declMatch[0]);
		const eqOffset = isConstArrow ? targetContent.indexOf("=", declMatch.index) : -1;
		if (isConstArrow && eqOffset !== -1) {
			const aliasMatch = targetContent
				.slice(eqOffset + 1, eqOffset + 120)
				.match(/^\s*([a-zA-Z_$][\w$]*)\s*;/);
			if (aliasMatch && aliasMatch[1] !== symbolName) {
				const aliased = extractSymbolFromModule(
					filePath,
					aliasMatch[1],
					fileContentCache,
					depth + 1,
				);
				if (aliased) return aliased;
			}
		}
		const braceIdx = findFunctionBodyBrace(
			targetContent,
			declMatch.index,
			isConstArrow,
		);
		if (braceIdx !== -1) {
			return extractBalancedBlock(targetContent, braceIdx);
		}
		const fallbackBrace = targetContent.indexOf("{", declMatch.index);
		if (fallbackBrace !== -1) {
			return extractBalancedBlock(targetContent, fallbackBrace);
		}
	}

	const reExportRe = /export\s+\{([^}]+)\}\s+from\s+["'](\.[^"']+)["']/g;
	for (const m of targetContent.matchAll(reExportRe)) {
		const targetRel = m[2];
		for (const rawSpec of m[1].split(",")) {
			const cleanSpec = rawSpec.trim().replace(/^type\s+/, "");
			if (!cleanSpec) continue;
			const parts = cleanSpec.split(/\s+as\s+/);
			const origName = parts[0].trim();
			const exportedName = (parts[1] || parts[0]).trim();
			if (exportedName === symbolName) {
				const subFile = resolveRelativeTsFile(filePath, targetRel);
				if (subFile) {
					const found = extractSymbolFromModule(subFile, origName, fileContentCache, depth + 1);
					if (found) return found;
				}
			}
		}
	}

	const starRe = /export\s+\*\s+from\s+["'](\.[^"']+)["']/g;
	for (const m of targetContent.matchAll(starRe)) {
		const subFile = resolveRelativeTsFile(filePath, m[1]);
		if (subFile) {
			const found = extractSymbolFromModule(subFile, symbolName, fileContentCache, depth + 1);
			if (found) return found;
		}
	}

	return null;
}

function resolveRouteModuleImports(filePath, content, fileContentCache) {
	const importedSymbols = new Map();
	const importRe = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["'](\.[^"']+)["']/g;

	for (const match of content.matchAll(importRe)) {
		const specifiers = match[1];
		const relImport = match[2];
		const resolvedFile = resolveRelativeTsFile(filePath, relImport);
		if (!resolvedFile) continue;

		for (const rawSpec of specifiers.split(",")) {
			const cleanSpec = rawSpec.trim().replace(/^type\s+/, "");
			if (!cleanSpec) continue;
			const parts = cleanSpec.split(/\s+as\s+/);
			const origName = parts[0].trim();
			const localName = (parts[1] || parts[0]).trim();
			if (!origName || !localName) continue;

			const extracted = extractSymbolFromModule(resolvedFile, origName, fileContentCache, 0);
			if (extracted) {
				importedSymbols.set(localName, extracted);
			}
		}
	}

	return importedSymbols;
}

function findFunctionBodyBrace(content, searchFromIdx, isArrow) {
	const parenIdx = content.indexOf("(", searchFromIdx);
	if (parenIdx === -1) return content.indexOf("{", searchFromIdx);
	const paramBlock = extractBalancedBlock(content, parenIdx, "(", ")");
	const afterParamsIdx = parenIdx + paramBlock.length;

	let angleDepth = 0;
	let parenDepth = 0;
	let braceDepth = 0;
	let inSingle = false;
	let inDouble = false;
	let inTemplate = false;
	let escaped = false;
	let passedArrow = !isArrow;
	const limit = Math.min(content.length, afterParamsIdx + 2000);

	for (let k = afterParamsIdx; k < limit; k++) {
		const ch = content[k];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (ch === "\\" && (inSingle || inDouble || inTemplate)) {
			escaped = true;
			continue;
		}
		if (!inDouble && !inTemplate && ch === "'") {
			inSingle = !inSingle;
			continue;
		}
		if (!inSingle && !inTemplate && ch === '"') {
			inDouble = !inDouble;
			continue;
		}
		if (!inSingle && !inDouble && ch === "`") {
			inTemplate = !inTemplate;
			continue;
		}
		if (inSingle || inDouble || inTemplate) continue;

		if (
			isArrow &&
			!passedArrow &&
			angleDepth === 0 &&
			parenDepth === 0 &&
			braceDepth === 0 &&
			ch === "=" &&
			content[k + 1] === ">"
		) {
			passedArrow = true;
			k++;
			continue;
		}
		if (ch === "<") {
			angleDepth++;
			continue;
		}
		if (ch === ">" && angleDepth > 0) {
			angleDepth--;
			continue;
		}
		if (ch === "(") {
			parenDepth++;
			continue;
		}
		if (ch === ")" && parenDepth > 0) {
			parenDepth--;
			continue;
		}
		if (passedArrow && angleDepth === 0 && parenDepth === 0 && braceDepth === 0 && ch === "{") {
			const candidateBlock = extractBalancedBlock(content, k, "{", "}");
			const afterCandidate = content.slice(k + candidateBlock.length).trimStart();
			if (afterCandidate.startsWith("{")) {
				k = k + candidateBlock.length - 1;
				continue;
			}
			return k;
		}
		if (ch === "{") {
			braceDepth++;
			continue;
		}
		if (ch === "}" && braceDepth > 0) {
			braceDepth--;
			continue;
		}
		if (angleDepth === 0 && parenDepth === 0 && braceDepth === 0 && ch === ";") {
			return -1;
		}
	}

	return -1;
}

function extractLocalDeclarations(content) {
	const localVars = new Map();
	const localFuncs = new Map();

	// Опции маршрутов (const fooOptions = { ... }) — только top-level (без отступов)
	const varRe = /(?:^|\n)(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/g;
	for (const m of content.matchAll(varRe)) {
		const name = m[1];
		const eqOffset = m.index + m[0].length;
		const afterEq = content.slice(eqOffset).trimStart();
		if (/^(async\s*)?\(|^async\s+function\b|^function\b/.test(afterEq)) {
			const isArrow = !/^(async\s+)?function\b/.test(afterEq);
			const braceIdx = findFunctionBodyBrace(content, eqOffset, isArrow);
			if (braceIdx !== -1) {
				localFuncs.set(name, extractBalancedBlock(content, braceIdx));
			}
		} else {
			const braceIdx = content.indexOf("{", eqOffset);
			if (braceIdx !== -1) {
				localVars.set(name, extractBalancedBlock(content, braceIdx));
			}
		}
	}

	// Хэндлеры-стрелки и функции уровня модуля или тела registerRoutes (до 1 таба / 4 пробелов),
	// исключая обычные переменные данных внутри обработчиков (const res = ...)
	const nestedArrowFnRe = /(?:^|\n)[ \t]{1,4}(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\(|[a-zA-Z_$][\w$]*\s*=>|async\s+function\b|function\b)/g;
	for (const m of content.matchAll(nestedArrowFnRe)) {
		const name = m[1];
		const eqIdx = content.indexOf("=", m.index);
		const afterEq = content.slice(eqIdx + 1).trimStart();
		const isArrow = !/^(async\s+)?function\b/.test(afterEq);
		const braceIdx = findFunctionBodyBrace(content, eqIdx + 1, isArrow);
		if (braceIdx !== -1) {
			localFuncs.set(name, extractBalancedBlock(content, braceIdx));
		}
	}

	const fnRe = /(?:^|\n)[ \t]{0,4}(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
	for (const m of content.matchAll(fnRe)) {
		const name = m[1];
		const braceIdx = findFunctionBodyBrace(content, m.index + m[0].length - 1, false);
		if (braceIdx !== -1) {
			localFuncs.set(name, extractBalancedBlock(content, braceIdx));
		}
	}

	return { localVars, localFuncs };
}

export function auditDoors(rootDir, prng, sampleCount = 5) {
	const routesDir = path.join(rootDir, "apps/api/src/routes");
	const routeFiles = collectCombatFiles(rootDir, [path.relative(rootDir, routesDir)]);
	const { hasGlobalPlugin, exemptPaths } = loadGlobalIdempotencyConfig(rootDir);
	const fileContentCache = new Map();

	const doors = [];

	for (const file of routeFiles) {
		let content;
		try {
			content = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		fileContentCache.set(file, content);

		const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
		const lines = content.split(/\r?\n/);
		const lineStartOffsets = computeLineStartOffsets(content);

		const { localVars, localFuncs } = extractLocalDeclarations(content);
		const importedHandlers = resolveRouteModuleImports(file, content, fileContentCache);
		const filePreHooks = [];
		const preHookRe = /\b(?:fastify|app|router|server)\.addHook\s*\(\s*['"](?:preHandler|onRequest)['"]/g;
		for (const hm of content.matchAll(preHookRe)) {
			const openIdx = content.indexOf("(", hm.index);
			if (openIdx !== -1) {
				filePreHooks.push(stripCodeComments(extractBalancedBlock(content, openIdx, "(", ")")));
			}
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const methodMatch = line.match(
				/\b(fastify|app|router|server)\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(/i,
			);
			const isRouteConfig = /\b(fastify|app|router|server)\.route\s*(?:<[^>]*>)?\s*\(/i.test(line);
			let routeMethod = methodMatch ? methodMatch[2].toUpperCase() : null;

			if (!routeMethod && isRouteConfig) {
				const routeCfgPreview = lines.slice(i, Math.min(lines.length, i + 8)).join("\n");
				const cfgMethodMatch = routeCfgPreview.match(/method:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/i);
				if (cfgMethodMatch) {
					routeMethod = cfgMethodMatch[1].toUpperCase();
				}
			}

			if (!routeMethod) continue;

			const lineNum = i + 1;
			const callStartOffset =
				lineStartOffsets[i] + line.search(/\b(fastify|app|router|server)\./i);
			const openParenIdx = content.indexOf("(", callStartOffset);
			const fullCallBlock =
				openParenIdx !== -1
					? extractBalancedBlock(content, openParenIdx, "(", ")")
					: lines.slice(i, Math.min(lines.length, i + 40)).join("\n");

			const codeOnlyCall = stripCodeComments(fullCallBlock);

			// Collect referenced options variables and local/imported handler bodies
			const extraBlocks = [];
			for (const [varName, varBody] of localVars.entries()) {
				if (new RegExp(`\\b${varName}\\b`).test(codeOnlyCall)) {
					extraBlocks.push(varBody);
				}
			}
			for (const [fnName, fnBody] of localFuncs.entries()) {
				if (new RegExp(`\\b${fnName}\\b`).test(codeOnlyCall)) {
					extraBlocks.push(fnBody);
				}
			}
			for (const [impName, impBody] of importedHandlers.entries()) {
				if (new RegExp(`\\b${impName}\\b`).test(codeOnlyCall)) {
					const memberMatch = codeOnlyCall.match(new RegExp(`\\b${impName}\\.(\\w+)\\b`));
					const memberBody = memberMatch ? extractClassMethodBlock(impBody, memberMatch[1]) : null;
					extraBlocks.push(memberBody || impBody);
				}
			}
			// Follow one hop from local wrapper handlers to imported/local handlers
			const combinedFirstHop = `${codeOnlyCall}\n${extraBlocks.join("\n")}`;
			for (const [impName, impBody] of importedHandlers.entries()) {
				if (new RegExp(`\\b${impName}\\b`).test(combinedFirstHop)) {
					const memberMatch = combinedFirstHop.match(new RegExp(`\\b${impName}\\.(\\w+)\\b`));
					const memberBody = memberMatch ? extractClassMethodBlock(impBody, memberMatch[1]) : null;
					const resolvedBody = memberBody || impBody;
					if (!extraBlocks.includes(resolvedBody)) {
						extraBlocks.push(resolvedBody);
					}
				}
			}
			for (const [fnName, fnBody] of localFuncs.entries()) {
				if (new RegExp(`\\b${fnName}\\b`).test(combinedFirstHop) && !extraBlocks.includes(fnBody)) {
					extraBlocks.push(fnBody);
				}
			}

			const codeOnlyBody = stripCodeComments(`${codeOnlyCall}\n${extraBlocks.join("\n")}`);

			const routeUrlMatch =
				codeOnlyCall.match(/['"](\/api\/[^'"]+)['"]/) ||
				codeOnlyCall.match(/['"](\/[^'"]+)['"]/);
			const routeUrl = routeUrlMatch ? routeUrlMatch[1] : "";
			const isPublicRoute = PUBLIC_ROUTE_PATTERNS.some((pat) => pat.test(routeUrl));
			const isWebhookRoute = WEBHOOK_ROUTE_PATTERN.test(routeUrl);

			if (routeMethod === "GET") {
				// Исключаем обязательное 152-ФЗ логирование чтения PHI (auditLogs / medicalAudit*)
				const getMutationMatches = (
					codeOnlyBody.match(
						/\b(?:db|tx|trx|executor|bypassTx)\.(insert|update|delete)\s*\(\s*(?!\w*audit\w*|systemBackgroundJobs\b)[^)]*/gi,
					) || []
				);
				if (getMutationMatches.length > 0) {
					doors.push({
						relPath,
						lineNum,
						routeSignature: routeUrl ? `${line.trim()} (${routeUrl})` : line.trim(),
						hasIdempotency: true,
						hasTransaction: /db\.transaction|withTenantCtx|\bwithSavepoint\b|\btx\./i.test(codeOnlyBody),
						usesKopecks: /kopecks|amountKopecks|priceKopecks/i.test(codeOnlyBody),
						issues: ["GET-роут выполняет мутацию БД (insert/update/delete), нарушая read-only семантику GET"],
						status: "DEFECT",
					});
				}
				continue;
			}

			const isExemptPath =
				Boolean(routeUrl) &&
				exemptPaths.some(
					(exempt) => routeUrl === exempt || routeUrl.startsWith(exempt) || routeUrl.includes(exempt),
				);

			const hasExplicitIdempotency =
				/idempotency|Idempotency-Key|idempotency-key|x-idempotency-key|paymentClientMutationConstraint/i.test(
					codeOnlyBody,
				);
			const hasManualIdempotencyInsert = /\.insert\s*\(\s*idempotencyKeys\s*\)/.test(codeOnlyBody);
			const hasInlineWebhookVerifier =
				/verify\w*Signature|verifyProdoctorovWebhookAuth|verifyClinicMedflexSignature|authenticatePbxWebhook|handleInstantAck|guardReceiptCall|receiptSecretMatches|hmac|timingSafeEqual|timingSafeSecretEqual|webhookSecret|telegramSecret|secretToken|x-telegram-bot-api-secret-token|\bsignature\b/i.test(
					codeOnlyBody,
				);
			const hasPreHookWebhookVerifier =
				isWebhookRoute &&
				filePreHooks.some((h) =>
					/verifyWebhookSecret|verify\w*Signature|timingSafeEqual|timingSafeSecretEqual|hmac/i.test(h),
				);
			const hasWebhookVerifier = hasInlineWebhookVerifier || hasPreHookWebhookVerifier;
			const hasWebhookOrAuthGuard =
				hasWebhookVerifier ||
				/deliveryId|updateId|requireResolved\w+|requireClinical\w+|requireTelegramControlPlaneAccess|getRequestIdentity|authenticate|guardReceiptCall/i.test(
					codeOnlyBody,
				);

			let hasIdempotency = hasExplicitIdempotency;
			if (hasGlobalPlugin) {
				if (isExemptPath) {
					hasIdempotency = hasExplicitIdempotency || hasWebhookOrAuthGuard;
				} else {
					hasIdempotency = true;
				}
			}

			const hasTransaction = /db\.transaction|withTenantCtx|\bwithSavepoint\b|\btx\./i.test(codeOnlyBody);
			const hasRawMoneyMath = RAW_MONEY_MATH_RE.test(codeOnlyBody);
			const usesKopecks = /kopecks|amountKopecks|priceKopecks/i.test(codeOnlyBody);

			const issues = [];
			if (hasRawMoneyMath) {
				issues.push("Ручные float-расчёты сумм (/ 100, * 0.01) в обход @dental/shared/src/money.ts (Мандат 8bm)");
			}
			if (hasManualIdempotencyInsert) {
				issues.push("Ручная запись в таблицу idempotencyKeys в обход глобального idempotencyPlugin (ROT-005)");
			} else if (!hasIdempotency) {
				issues.push("Мутационный эндпоинт без обязательного заголовка Idempotency-Key (Мандат 8bo / RFC 9562)");
			}
			const mutationMatches =
				codeOnlyBody.match(/\b(?:db|tx|trx|executor|bypassTx)\.(insert|update|delete)\s*\(/gi) || [];
			const isTxSelfManaged = /tenantTxSelfManaged|selfManagedTx/.test(codeOnlyBody);
			const isIfElseUpsert =
				mutationMatches.length <= 2 &&
				/if\s*\(existing\)|if\s*\(\s*existing\s*\)|if\s*\(\s*rows?\.length|if\s*\(\s*found/i.test(codeOnlyBody);
			if (!hasTransaction && !isTxSelfManaged && !isIfElseUpsert && mutationMatches.length > 1) {
				issues.push("Множественные мутации данных без единой атомарной db.transaction() (Мандат 8bo)");
			}
			const usesTxVar = /\btx\.(select|insert|update|delete|execute)\s*\(/.test(codeOnlyBody);
			const usesBareDbMutation = /\bdb\.(insert|update|delete)\s*\(/.test(codeOnlyBody);
			if (hasTransaction && usesTxVar && usesBareDbMutation) {
				issues.push("Прямой вызов db.insert/update/delete рядом с tx.* внутри транзакции (Мандат 8bo)");
			}

			// Разрешаем параметры-коллбэки register*Routes(app, arg) из реальных вызывающих модулей (напр. statusHandler, telegramControlPlaneRouteOptions)
			let resolvedCallerContext = "";
			const regFnMatch = content.match(/export\s+(?:async\s+)?function\s+(register\w+)\s*\(([^)]+)\)/);
			if (regFnMatch) {
				const regFnName = regFnMatch[1];
				const regParams = regFnMatch[2]
					.split(",")
					.map((p) => p.trim().split(/[:=]/)[0].trim())
					.filter(Boolean);
				const usedParamIndices = [];
				for (let pIdx = 1; pIdx < regParams.length; pIdx++) {
					if (new RegExp(`\\b${regParams[pIdx]}\\b`).test(codeOnlyCall)) {
						usedParamIndices.push(pIdx);
					}
				}
				if (usedParamIndices.length > 0) {
					for (const callerFile of routeFiles) {
						const callerContent = readCachedFile(callerFile, fileContentCache);
						if (!callerContent || !callerContent.includes(regFnName)) continue;
						const callRe = new RegExp(`\\b${regFnName}\\s*\\(([^)]+)\\)`, "g");
						for (const cm of callerContent.matchAll(callRe)) {
							const callArgs = cm[1].split(",").map((a) => a.trim());
							const callerDecls = extractLocalDeclarations(callerContent);
							const callerImports = resolveRouteModuleImports(callerFile, callerContent, fileContentCache);
							for (const pIdx of usedParamIndices) {
								const argIdent = callArgs[pIdx];
								if (!argIdent || !/^[a-zA-Z_$][\w$]*$/.test(argIdent)) continue;
								if (callerDecls.localFuncs.has(argIdent)) resolvedCallerContext += "\n" + callerDecls.localFuncs.get(argIdent);
								if (callerDecls.localVars.has(argIdent)) resolvedCallerContext += "\n" + callerDecls.localVars.get(argIdent);
								if (callerImports.has(argIdent)) resolvedCallerContext += "\n" + callerImports.get(argIdent);
								const localObjMatch = new RegExp(`\\b(?:const|let)\\s+${argIdent}\\s*=\\s*\\{`).exec(callerContent);
								if (localObjMatch) {
									const objBrace = callerContent.indexOf("{", localObjMatch.index);
									if (objBrace !== -1) {
										resolvedCallerContext += "\n" + extractBalancedBlock(callerContent, objBrace);
									}
								}
							}
						}
					}
				}
			}
			const fullCheckBody = resolvedCallerContext
				? `${codeOnlyBody}\n${stripCodeComments(resolvedCallerContext)}`
				: codeOnlyBody;

			const hasTrustedOrgGuard =
				/\b(withTenantCtx|withTenantReadCtx|withTenantWriteCtx|requireResolvedOrganizationId|requireResolvedStaffOrAdminOrganizationId|requireOrganizationId|requireClinicalReadContext|requireClinicalMutationContext|requireStaffIdentity|requireClinicOrganizationId|requireTelegramControlPlaneAccess|verifyClinicMedflexSignature|verifyProdoctorovWebhookAuth|requireAuthenticatedUser|requireExecutiveAccess|requireNonDoctorAccess|requireScheduleMutationAccess|requireScheduleMutationContext|requireClinicalMutationAccess|requireClinicalReadAccess|requireCatalogMutationAccess|requireSettingsMutationAccess|getImagingOrganizationId|requireDicomWebSettingsAccess)\b/.test(
					fullCheckBody,
				) || /\bgetRequestIdentity\b[\s\S]{0,600}\bverified\b/.test(fullCheckBody);

			const isUnconditionalDenialStub =
				/\breply\s*\.\s*(?:code|status)\s*\(\s*(?:403|410)\s*\)/.test(codeOnlyBody) &&
				mutationMatches.length === 0 &&
				!/\b(?:db|tx|withTenantCtx|Service|Engine|Manager)\b/.test(codeOnlyBody);

			if (isWebhookRoute && !hasWebhookVerifier) {
				issues.push("Webhook-роут без проверки криптографической подписи или секрета");
			} else if (
				!isPublicRoute &&
				!(isWebhookRoute && hasWebhookVerifier) &&
				!isUnconditionalDenialStub &&
				!hasTrustedOrgGuard
			) {
				issues.push("Мутационный роут без проверки контекста организации/арендатора (BOLA/IDOR риск)");
			}

			doors.push({
				relPath,
				lineNum,
				routeSignature: routeUrl ? `${line.trim()} (${routeUrl})` : line.trim(),
				hasIdempotency,
				hasTransaction,
				usesKopecks,
				issues,
				status: issues.length === 0 ? "CLEAN" : "DEFECT",
			});
		}
	}

	// Сэмплируем через PRNG
	const sampledDoors = [];
	const count = Math.min(sampleCount, doors.length);
	const pool = [...doors];

	for (let i = 0; i < count; i++) {
		const idx = Math.floor(prng() * pool.length);
		sampledDoors.push(pool.splice(idx, 1)[0]);
	}

	return {
		totalDoorsFound: doors.length,
		sampled: sampledDoors,
	};
}
/* ------------------------------------------------------------------ *
 * Секция 8. Список 2: Поля памяти и Контракты (Memory Fields & Contracts)
 * ------------------------------------------------------------------ */

export function auditFields(rootDir, prng, sampleCount = 5) {
	const targetDirs = ["apps/api/src/db/schema", "packages/shared/src"];
	const schemaFiles = collectCombatFiles(rootDir, targetDirs);

	const contracts = [];

	for (const file of schemaFiles) {
		let content;
		try {
			content = readFileSync(file, "utf8");
		} catch {
			continue;
		}

		const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
		const lines = content.split(/\r?\n/);
		const lineStartOffsets = computeLineStartOffsets(content);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Ищем Drizzle таблицы
			const isDrizzleTable = /export const \w+\s*=\s*pgTable\s*\(/.test(line);
			// Ищем Zod схемы
			const isZodSchema = /export const \w+Schema\s*=\s*z\.object\s*\(/.test(line);

			if (isDrizzleTable || isZodSchema) {
				const lineNum = i + 1;
				let block;
				if (isDrizzleTable) {
					const pgIdx = content.indexOf("(", lineStartOffsets[i] + Math.max(0, line.indexOf("pgTable")));
					block = pgIdx !== -1
						? extractBalancedBlock(content, pgIdx, "(", ")", 60000)
						: lines.slice(i, Math.min(lines.length, i + 120)).join("\n");
				} else {
					const zodIdx = content.indexOf("(", lineStartOffsets[i] + Math.max(0, line.indexOf("z.object")));
					if (zodIdx !== -1) {
						const zodBody = extractBalancedBlock(content, zodIdx, "(", ")", 60000);
						const tailEnd = content.indexOf(";", zodIdx + zodBody.length);
						const tail = tailEnd !== -1
							? content.slice(zodIdx + zodBody.length, Math.min(tailEnd + 1, zodIdx + zodBody.length + 500))
							: "";
						block = `${line}\n${zodBody}${tail}`;
					} else {
						block = lines.slice(i, Math.min(lines.length, i + 80)).join("\n");
					}
				}

				const issues = [];

				if (isZodSchema) {
					// Для входных мутационных схем проверяем .strict()
					const isMutationSchema = /Input|Payload|Mutation|Create|Update/.test(line);
					if (isMutationSchema && !block.includes(".strict()")) {
						// Мягкое предупреждение о strictness
						issues.push("Мутационная Zod-схема без .strict() (риск проброса нетипизированных полей)");
					}
					if (/z\.any\(\)/.test(block)) {
						issues.push("Использование z.any() в контракте вместо строгого типа или z.unknown()");
					}
				}

				if (isDrizzleTable) {
					// Проверка денежных полей на суффикс kopecks
					const hasMoneyFieldWithoutKopecks = /"(price|amount|cost)"\s*:\s*(?!bigint|integer)/.test(block);
					if (hasMoneyFieldWithoutKopecks) {
						issues.push("Колонка цены/суммы без явного суффикса _kopecks или типа integer/bigint");
					}
					// Проверка ROT-015: numeric / doublePrecision / real поля для денег в рублях
					// Exempt tables already carrying a parallel kopecks bigint (dual-column migration pattern)
					const hasKopecksParallelColumn = /bigint\s*\(\s*["']\w*kopeck\w*["']/i.test(block);
					const numericMoneyMatches = [
						...block.matchAll(/(?:numeric|doublePrecision|real)\s*\(\s*["']([a-z0-9_]+)["']/gi),
					];
					const hasNumericMoneyColumn = numericMoneyMatches.some((m) => {
						const colName = m[1].toLowerCase();
						if (/(?:_pct|_percent|_points|_qty|_count|_ratio|_rate)$/.test(colName)) {
							return false;
						}
						return /(?:^|_)(?:rub|amount|price|cost|balance|fee)(?:_|$)/.test(colName);
					});
					if (!hasKopecksParallelColumn && hasNumericMoneyColumn) {
						issues.push("Денежная колонка объявлена как numeric(Rub)/float вместо bigint(kopecks) (Мандат 8bm / ROT-015)");
					}
				}

				contracts.push({
					relPath,
					lineNum,
					type: isDrizzleTable ? "Drizzle Table" : "Zod Contract Schema",
					signature: line.trim(),
					issues,
					status: issues.length === 0 ? "CLEAN" : "DEFECT",
				});
			}
		}
	}

	const sampledContracts = [];
	const count = Math.min(sampleCount, contracts.length);
	const pool = [...contracts];

	for (let i = 0; i < count; i++) {
		const idx = Math.floor(prng() * pool.length);
		sampledContracts.push(pool.splice(idx, 1)[0]);
	}

	return {
		totalContractsFound: contracts.length,
		sampled: sampledContracts,
	};
}

/* ------------------------------------------------------------------ *
 * Секция 9. Список 3: Точки входа UI (UI Entry Points & Controls)
 * ------------------------------------------------------------------ */

export function auditUi(rootDir, prng, sampleCount = 5) {
	const uiFiles = collectCombatFiles(rootDir, ["apps/web/src/components", "apps/web/src/App.tsx"]);

	const uiControls = [];
	const duplicateModalDefects = [];

	for (const file of uiFiles) {
		const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
		const baseName = path.basename(file);

		// Охота на дубликаты модалок (Мандат 8s / 8bf)
		if (/(Modal2|DrawerV2|NewModal|Copy)\.(tsx|ts)$/i.test(baseName)) {
			duplicateModalDefects.push({
				relPath,
				rule: "MANDATE_8s_DUPLICATE_CLONE",
				message: `Обнаружен файл-клон '${baseName}'. Должен быть ровно 1 канонический SSOT.`,
			});
		}

		let content;
		try {
			content = readFileSync(file, "utf8");
		} catch {
			continue;
		}

		const lines = content.split(/\r?\n/);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Ищем кнопки и интерактивные контролы
			if (/<button|<Button|<DenteButton/i.test(line)) {
				const lineNum = i + 1;
				const btnContext = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 4)).join(" ");

				const issues = [];

				// Проверка на капслок
				if (/\buppercase\b/.test(btnContext)) {
					issues.push("Капслок на кнопке (нарушение Мандата 8am / UPPERCASE BAN)");
				}

				// Проверка на соответствие матрице высот
				const hasValidHeight = /\b(h-9|h-8|h-11|min-h-\[44px\]|min-h-\[52px\]|h-7)\b/.test(btnContext);
				const hasCustomArbitraryHeight = /\bh-(12|14|16|20|24)\b/.test(btnContext);

				if (hasCustomArbitraryHeight && !hasValidHeight) {
					issues.push("Нестандартная высота кнопки (разрешено: Desktop 36px/h-9, Compact 32px/h-8, Mobile 44px/h-11)");
				}

				uiControls.push({
					relPath,
					lineNum,
					snippet: line.trim(),
					issues,
					status: issues.length === 0 ? "CLEAN" : "DEFECT",
				});
			}
		}
	}

	const sampledControls = [];
	const count = Math.min(sampleCount, uiControls.length);
	const pool = [...uiControls];

	for (let i = 0; i < count; i++) {
		const idx = Math.floor(prng() * pool.length);
		sampledControls.push(pool.splice(idx, 1)[0]);
	}

	return {
		totalControlsFound: uiControls.length,
		duplicateModalsFound: duplicateModalDefects.length,
		duplicateModals: duplicateModalDefects,
		sampled: sampledControls,
	};
}

/* ------------------------------------------------------------------ *
 * Секция 9.5. Список 4: Инквизиция честности тестов (Anti-Goodhart)
 * ------------------------------------------------------------------ */

const TEST_DEFECT_LABELS = {
	"test-no-assertion": "Тест без единого assert/expect (не может упасть)",
	"test-tautology": "Тавтология (assert.ok(true) / true === true)",
	"test-phantom-no-sut": "Фантомный тест (не вызывает боевой код проекта)",
	"test-skipped": "Отключённый тест (.skip / .todo)",
	"test-only-left": "Оставлен .only() (глушит остальные тесты)",
	"test-swallowed-assertion": "Assert внутри try/catch с проглатыванием ошибки",
	"test-self-mock": "Тест мокает сам тестируемый модуль",
	"test-size-assertion": "Гудхарт-тест на число строк исходника (дублирует check:limits)",
	"test-source-grep": "Тест грепает текст исходника вместо исполнения поведения",
	"test-weak-only": "Тест только со слабыми ассертами (toBeDefined/assert.ok(x))",
};

export function auditTests(rootDir, prng, sampleCount = 25) {
	const scanDirs = ["packages/shared/src", "apps/api/src", "apps/web/src"].map((d) => path.join(rootDir, d));
	const testFiles = [];
	for (const dir of scanDirs) {
		for (const file of collectAllCodeFiles(dir)) {
			const rel = path.relative(rootDir, file).replace(/\\/g, "/");
			if (isAstTestFile(rel) && /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)) {
				testFiles.push({ file, rel });
			}
		}
	}

	const pool = [...testFiles];
	const count = Math.min(sampleCount, pool.length);
	const sampled = [];

	for (let i = 0; i < count; i++) {
		const idx = Math.floor(prng() * pool.length);
		const picked = pool.splice(idx, 1)[0];
		let content = "";
		try {
			content = readFileSync(picked.file, "utf8");
		} catch {
			continue;
		}
		const scanned = scanTestSource(content, picked.rel);
		const issues = scanned.findings.map(
			(f) => `[${f.rule}] L${f.line}: ${TEST_DEFECT_LABELS[f.rule] ?? f.rule} (${f.text.slice(0, 70)})`,
		);
		sampled.push({
			relPath: picked.rel,
			testsCount: scanned.tests,
			findings: scanned.findings,
			issues,
			status: issues.length === 0 ? "CLEAN" : "DEFECT",
		});
	}

	return {
		totalTestFilesFound: testFiles.length,
		sampled,
	};
}

/* ------------------------------------------------------------------ *
 * Секция 10. Главный координатор Monte Carlo Reality Audit
 * ------------------------------------------------------------------ */

export function runDiceAudit(options = {}, rootDir = process.cwd()) {
	const prng = createPrng(options.seed);
	const seedStr = options.seed != null ? String(options.seed) : "random";

	const allCombatFiles = collectCombatFiles(rootDir);

	const report = {
		meta: {
			engine: "Monte Carlo Reality Audit Engine («Кубик-Тест» v2 — AST + Tests Inquisition)",
			seed: seedStr,
			totalCombatFiles: allCombatFiles.length,
			timestamp: new Date().toISOString(),
			targetList: options.list || "all",
			strict: Boolean(options.strict),
		},
		summary: {
			totalSamples: 0,
			cleanSamples: 0,
			defectSamples: 0,
			realityScorePercent: 100,
		},
		lines: [],
		doors: null,
		fields: null,
		ui: null,
		tests: null,
	};

	// 1. Сэмплирование случайных строк (Кубик по строкам)
	if (options.list === "all") {
		const lineSamples = sampleLines(allCombatFiles, options.samples || 100, prng, rootDir);
		report.lines = lineSamples;
	}

	// 2. Структурный Список 1: Двери и Мутации
	if (options.list === "all" || options.list === "doors") {
		report.doors = auditDoors(rootDir, prng, Math.max(25, Math.floor((options.samples || 100) / 4)));
	}

	// 3. Структурный Список 2: Поля памяти и Контракты
	if (options.list === "all" || options.list === "fields") {
		report.fields = auditFields(rootDir, prng, Math.max(25, Math.floor((options.samples || 100) / 4)));
	}

	// 4. Структурный Список 3: Точки входа UI
	if (options.list === "all" || options.list === "ui") {
		report.ui = auditUi(rootDir, prng, Math.max(25, Math.floor((options.samples || 100) / 4)));
	}

	// 5. Структурный Список 4: Инквизиция честности тестов (Anti-Goodhart)
	if (options.list === "all" || options.list === "tests") {
		report.tests = auditTests(rootDir, prng, Math.max(25, Math.floor((options.samples || 100) / 4)));
	}

	// Подсчет агрегированной статистики
	let totalEvaluated = 0;
	let totalDefects = 0;

	for (const l of report.lines) {
		totalEvaluated++;
		if (l.status === "DEFECT") totalDefects++;
	}

	if (report.doors?.sampled) {
		for (const d of report.doors.sampled) {
			totalEvaluated++;
			if (d.status === "DEFECT") totalDefects++;
		}
	}

	if (report.fields?.sampled) {
		for (const f of report.fields.sampled) {
			totalEvaluated++;
			if (f.status === "DEFECT") totalDefects++;
		}
	}

	if (report.ui?.sampled) {
		for (const u of report.ui.sampled) {
			totalEvaluated++;
			if (u.status === "DEFECT") totalDefects++;
		}
		if (report.ui.duplicateModalsFound > 0) {
			totalDefects += report.ui.duplicateModalsFound;
		}
	}

	if (report.tests?.sampled) {
		for (const t of report.tests.sampled) {
			totalEvaluated++;
			if (t.status === "DEFECT") totalDefects++;
		}
	}

	const cleanCount = Math.max(0, totalEvaluated - totalDefects);
	const score = totalEvaluated > 0 ? Math.round((cleanCount / totalEvaluated) * 100) : 100;

	report.summary = {
		totalSamples: totalEvaluated,
		cleanSamples: cleanCount,
		defectSamples: totalDefects,
		realityScorePercent: score,
	};

	return report;
}

/* ------------------------------------------------------------------ *
 * Секция 11. Вывод отчёта в терминал
 * ------------------------------------------------------------------ */

function formatTerminalReport(report) {
	const c = {
		cyan: (s) => `\x1b[36m${s}\x1b[0m`,
		green: (s) => `\x1b[32m${s}\x1b[0m`,
		red: (s) => `\x1b[31m${s}\x1b[0m`,
		yellow: (s) => `\x1b[33m${s}\x1b[0m`,
		bold: (s) => `\x1b[1m${s}\x1b[0m`,
		dim: (s) => `\x1b[2m${s}\x1b[0m`,
	};

	console.log(`\n${c.bold(c.cyan("🎲 MONTE CARLO REALITY AUDIT ENGINE («КУБИК-ТЕСТ»)"))}`);
	console.log(c.dim(`   Опыт Тимаэрта & Мандаты 8aj, 8ar, 8bj, 8bk DENTE Dental CRM`));
	console.log(
		c.dim(`   Сид: ${report.meta.seed} | Боевых файлов: ${report.meta.totalCombatFiles} | Время: ${report.meta.timestamp}`),
	);
	console.log("=".repeat(76));

	// 1. Вывод случайных строк
	if (report.lines && report.lines.length > 0) {
		console.log(`\n${c.bold("🎲 РЕЗУЛЬТАТЫ СЛУЧАЙНЫХ БРОСКОВ ПО СТРОКАМ КОДА:")}`);
		for (let i = 0; i < report.lines.length; i++) {
			const s = report.lines[i];
			const statusLabel = s.status === "CLEAN" ? c.green("✓ ЧИСТО") : c.red("✗ ДЕФЕКТ");

			console.log(`\n[${i + 1}/${report.lines.length}] ${statusLabel} ${c.cyan(`[${s.relPath}:${s.lineNum}]`)}`);
			console.log(`   ${c.dim("1. Система:")} ${s.system.domain} (${s.system.layer})`);
			console.log(`   ${c.dim("2. Дверь:")}   ${s.officialDoor}`);
			console.log(`   ${c.dim("3. Код:")}     ${c.bold(s.code)}`);

			if (s.defects && s.defects.length > 0) {
				for (const d of s.defects) {
					console.log(`      ${c.red("⚠")} ${c.yellow(d.rule)}: ${d.message}`);
				}
			}
		}
	}

	// 2. Список 1: Двери
	if (report.doors?.sampled && report.doors.sampled.length > 0) {
		console.log(`\n${c.bold("🚪 СПИСОК 1 (ДВЕРИ И МУТАЦИИ API):")}`);
		console.log(c.dim(`   Всего мутационных эндпоинтов найдено: ${report.doors.totalDoorsFound}`));
		for (const d of report.doors.sampled) {
			const st = d.status === "CLEAN" ? c.green("✓") : c.red("✗");
			console.log(`   ${st} ${c.cyan(`[${d.relPath}:${d.lineNum}]`)} ${d.routeSignature}`);
			const flags = [];
			flags.push(d.hasIdempotency ? c.green("idempotent") : c.dim("no-idemp-hdr"));
			flags.push(d.hasTransaction ? c.green("tx") : c.dim("direct"));
			flags.push(d.usesKopecks ? c.green("kopecks") : c.dim("standard"));
			console.log(`      ${c.dim("Параметры:")} ${flags.join(" | ")}`);
			if (d.issues.length > 0) {
				for (const iss of d.issues) console.log(`      ${c.red("⚠")} ${iss}`);
			}
		}
	}

	// 3. Список 2: Поля памяти
	if (report.fields?.sampled && report.fields.sampled.length > 0) {
		console.log(`\n${c.bold("💾 СПИСОК 2 (ПОЛЯ ПАМЯТИ И КОНТРАКТЫ СХЕМЫ):")}`);
		console.log(c.dim(`   Всего таблиц/схем найдено: ${report.fields.totalContractsFound}`));
		for (const f of report.fields.sampled) {
			const st = f.status === "CLEAN" ? c.green("✓") : c.red("✗");
			console.log(`   ${st} ${c.cyan(`[${f.relPath}:${f.lineNum}]`)} (${f.type})`);
			console.log(`      ${c.dim("Контракт:")} ${f.signature}`);
			if (f.issues.length > 0) {
				for (const iss of f.issues) console.log(`      ${c.yellow("⚠")} ${iss}`);
			}
		}
	}

	// 4. Список 3: Точки входа UI
	if (report.ui?.sampled && report.ui.sampled.length > 0) {
		console.log(`\n${c.bold("🖥️  СПИСОК 3 (ТОЧКИ ВХОДА UI И МАТРИЦА КНОПОК):")}`);
		console.log(
			c.dim(
				`   Всего контролов найдено: ${report.ui.totalControlsFound} | Клонов модалок: ${report.ui.duplicateModalsFound}`,
			),
		);
		if (report.ui.duplicateModals.length > 0) {
			for (const dup of report.ui.duplicateModals) {
				console.log(`   ${c.red("✗ КЛОН:")} ${c.cyan(dup.relPath)}: ${dup.message}`);
			}
		}
		for (const u of report.ui.sampled) {
			const st = u.status === "CLEAN" ? c.green("✓") : c.red("✗");
			console.log(`   ${st} ${c.cyan(`[${u.relPath}:${u.lineNum}]`)} ${u.snippet.slice(0, 70)}...`);
			if (u.issues.length > 0) {
				for (const iss of u.issues) console.log(`      ${c.yellow("⚠")} ${iss}`);
			}
		}
	}

	// 5. Список 4: Инквизиция честности тестов (Anti-Goodhart)
	if (report.tests?.sampled && report.tests.sampled.length > 0) {
		console.log(`\n${c.bold("🧪 СПИСОК 4 (ИНКВИЗИЦИЯ ТЕСТОВ / ANTI-GOODHART):")}`);
		console.log(c.dim(`   Всего тестовых файлов найдено: ${report.tests.totalTestFilesFound}`));
		for (const t of report.tests.sampled) {
			const st = t.status === "CLEAN" ? c.green("✓") : c.red("✗");
			console.log(`   ${st} ${c.cyan(`[${t.relPath}]`)} (${t.testsCount} tests)`);
			if (t.issues.length > 0) {
				for (const iss of t.issues.slice(0, 5)) console.log(`      ${c.red("⚠")} ${iss}`);
				if (t.issues.length > 5) console.log(`      ${c.dim(`... и ещё ${t.issues.length - 5} замечаний`)}`);
			}
		}
	}

	console.log("\n" + "=".repeat(76));
	console.log(c.bold("📊 СВОДНЫЙ РЕЙТИНГ РЕАЛЬНОСТИ (DICE REALITY INTEGRITY SCORE):"));
	console.log(`   Всего проверено сэмплов: ${report.summary.totalSamples}`);
	console.log(`   Чистых сэмплов (Clean):  ${c.green(report.summary.cleanSamples)}`);
	console.log(`   Дефектов (Defects):      ${report.summary.defectSamples > 0 ? c.red(report.summary.defectSamples) : c.green("0")}`);
	console.log(
		`   Индекс целостности:      ${
			report.summary.realityScorePercent >= 90
				? c.green(`${report.summary.realityScorePercent}%`)
				: c.red(`${report.summary.realityScorePercent}%`)
		}`,
	);

	if (report.summary.defectSamples === 0) {
		console.log(c.bold(c.green("\n🎉 [ВЕРДИКТ: ЧИСТО — 0 ГОВНОСРАЛОВ] Архитектурный контроль подтверждён!")));
	} else {
		printFailureManifesto("DICE_AUDIT", {
			details: `Кубик вскрыл ${report.summary.defectSamples} архитектурных дефектов среди ${report.summary.totalSamples} проверенных точек (индекс реальности: ${report.summary.realityScorePercent}%).`,
		});
	}
	console.log("=".repeat(76) + "\n");
}

/* ------------------------------------------------------------------ *
 * Секция 12. CLI Entry Point
 * ------------------------------------------------------------------ */

function printHelp() {
	console.log(`
Использование:
  node scripts/dice-audit.mjs [параметры]
  npm run audit:dice

Параметры:
  --samples, -n <N>     Количество случайных сэмплов строк (по умолчанию 100 — суммарно 175 точек)
  --seed, -s <S>        Сид для детерминированного Monte Carlo прогона
  --list, -l <name>     Целевой список: all (дефолт), doors, fields, ui
  --strict              Выход с кодом 1 при наличии хотя бы 1 дефекта
  --json                Вывод чистого JSON для скриптов и агентов
  --help, -h            Справка по командам
`);
}

const isDirectCall =
	process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectCall) {
	const cliOpts = parseCliArgs(process.argv.slice(2));

	if (cliOpts.help) {
		printHelp();
		process.exit(0);
	}

	const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const repoRoot = cliOpts.root ? path.resolve(cliOpts.root) : defaultRoot;
	const report = runDiceAudit(cliOpts, repoRoot);

	if (cliOpts.json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		formatTerminalReport(report);
	}

	if (cliOpts.strict && report.summary.defectSamples > 0) {
		process.exit(1);
	}
	process.exit(0);
}
