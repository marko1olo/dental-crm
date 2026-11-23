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

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { RAW_MONEY_MATH_RE } from "./check-staged-safety.mjs";
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
			if (["doors", "fields", "ui", "all"].includes(val)) {
				options.list = val;
			}
		} else if (arg.startsWith("--list=")) {
			const val = arg.split("=")[1]?.toLowerCase();
			if (["doors", "fields", "ui", "all"].includes(val)) {
				options.list = val;
			}
		} else if (arg === "--strict") {
			options.strict = true;
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
]);

const TEST_FILE_PATTERNS = [
	/\.test\.[cm]?[jt]sx?$/,
	/\.spec\.[cm]?[jt]sx?$/,
	/TestHelpers\.[cm]?[jt]sx?$/,
	/__tests__/,
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

	// Проверка 1: Запрещенный any (Мандат 8be)
	// Игнорируем в комментариях // или /*
	const trimmedCurrent = current.trim();
	const isComment = trimmedCurrent.startsWith("//") || trimmedCurrent.startsWith("/*") || trimmedCurrent.startsWith("*");
	if (!isComment) {
		if (/\bas\s+any\b/i.test(current)) {
			defects.push({
				rule: "MANDATE_8be_AS_ANY",
				severity: "HIGH",
				message: "Обнаружен слепой каст 'as any'. Требуется строгий Zod/TypeScript контракт.",
			});
		} else if (/\bas\s+unknown\s+as\b/i.test(current)) {
			defects.push({
				rule: "MANDATE_8be_DOUBLE_CAST",
				severity: "HIGH",
				message: "Обнаружен двойной каст 'as unknown as ...'. Нарушение честной типизации.",
			});
		} else if (/:\s*any\b/.test(current) && !/biome-ignore|eslint-disable/.test(current)) {
			defects.push({
				rule: "MANDATE_8be_EXPLICIT_ANY",
				severity: "MEDIUM",
				message: "Объявлен нетипизированный ': any'. Требуется строгий DTO или Discriminated Union.",
			});
		}

		// Проверка 2: Слепой Non-null assertion (!) (Мандат 8be)
		if (/[a-zA-Z0-9_$]+!\.[a-zA-Z0-9_$]+/.test(current)) {
			defects.push({
				rule: "MANDATE_8be_NON_NULL_ASSERTION",
				severity: "HIGH",
				message: "Обнаружен Non-Null assertion (!). Риск рантайм падения TypeError при null/undefined.",
			});
		}

		// Проверка 3: Опасное деление на 100 или скрытое умножение на 0.01 / .01 для денег (Мандат 8bm)
		if (RAW_MONEY_MATH_RE.test(current)) {
			const isDiv = /\/\s*100\b/.test(current);
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

		// Проверка 7: Расширенная контекстная инспекция блока (±15 строк)
		if (/\bas\s+any\b/i.test(joinedContext) && !/\bas\s+any\b/i.test(current)) {
			defects.push({
				rule: "MANDATE_8be_CONTEXT_AS_ANY",
				severity: "HIGH",
				message: "В блоке обнаружен слепой каст 'as any'. Требуется строгая типизация.",
			});
		}
		if (RAW_MONEY_MATH_RE.test(joinedContext) && !RAW_MONEY_MATH_RE.test(current)) {
			defects.push({
				rule: "MANDATE_8bm_CONTEXT_RAW_MONEY_DIVISION",
				severity: "HIGH",
				message: "В блоке обнаружен ручной float-расчёт денег (/ 100, * 0.01) в обход money.ts.",
			});
		}
		if (relPath.includes("apps/api/") && /console\.(log|warn|error)\(/.test(joinedContext) && !relPath.includes("scripts/")) {
			defects.push({
				rule: "ROT_008_CONTEXT_CONSOLE_IN_API",
				severity: "MEDIUM",
				message: "В блоке API обнаружен неструктурированный console.log вместо Fastify logger.",
			});
		}
		if (/catch\s*\([_a-zA-Z0-9]*\)\s*\{\s*\}/.test(joinedContext)) {
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

	// Для реалистичного взвешивания Тимаэрта (кубик взвешен объёмом):
	// Считаем размер каждого файла в байтах.
	const weightedFiles = [];
	let totalWeight = 0;

	for (const f of files) {
		try {
			const size = statSync(f).size;
			if (size > 10) {
				weightedFiles.push({ file: f, weight: size });
				totalWeight += size;
			}
		} catch {
			// игнорируем файлы с ошибкой чтения
		}
	}

	if (weightedFiles.length === 0) return [];

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

export function auditDoors(rootDir, prng, sampleCount = 5) {
	const routesDir = path.join(rootDir, "apps/api/src/routes");
	const routeFiles = collectCombatFiles(rootDir, [path.relative(rootDir, routesDir)]);

	const doors = [];

	for (const file of routeFiles) {
		let content;
		try {
			content = readFileSync(file, "utf8");
		} catch {
			continue;
		}

		const relPath = path.relative(rootDir, file).replace(/\\/g, "/");
		const lines = content.split(/\r?\n/);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			// Ищем объявления мутаций Fastify
			const isMutation =
				/\b(fastify|app|router)\.(post|put|patch|delete)\s*\(|method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i.test(line);

			if (isMutation) {
				const lineNum = i + 1;
				// Берем окно контекста маршрута (до 25 строк вперед)
				const routeBody = lines.slice(i, Math.min(lines.length, i + 35)).join("\n");
				// Очищаем комментарии, чтобы исключить ложные срабатывания на текст комментариев
				const codeOnlyBody = routeBody.replace(/\/\/[^\r\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

				const hasIdempotency =
					/idempotency|Idempotency-Key|idempotency-key|x-idempotency-key|paymentClientMutationConstraint/i.test(
						codeOnlyBody,
					);
				const hasTransaction = /db\.transaction|\btx\./i.test(codeOnlyBody);
				const hasRawMoneyMath = RAW_MONEY_MATH_RE.test(codeOnlyBody);
				const usesKopecks = /kopecks|amountKopecks|priceKopecks/i.test(codeOnlyBody);

				const issues = [];
				if (hasRawMoneyMath) {
					issues.push("Ручные float-расчёты сумм (/ 100, * 0.01) в обход @dental/shared/src/money.ts (Мандат 8bm)");
				}
				if (!hasIdempotency) {
					issues.push("Мутационный эндпоинт без обязательного заголовка Idempotency-Key (Мандат 8bo / RFC 9562)");
				}
				const mutationMatches = codeOnlyBody.match(/\b(insert|update|delete)\s*\(|\.insert\(|\.update\(|\.delete\(/gi) || [];
				if (!hasTransaction && mutationMatches.length > 1) {
					issues.push("Множественные мутации данных без единой атомарной db.transaction() (Мандат 8bo)");
				}
				const hasOrgContext =
					/organizationId|organization_id|orgId|withTenantCtx|requireClinicalMutationContext|requireClinicalReadContext/i.test(
						codeOnlyBody,
					);
				if (!hasOrgContext) {
					issues.push("Мутационный роут без проверки контекста организации/арендатора (BOLA/IDOR риск)");
				}

				doors.push({
					relPath,
					lineNum,
					routeSignature: line.trim(),
					hasIdempotency,
					hasTransaction,
					usesKopecks,
					issues,
					status: issues.length === 0 ? "CLEAN" : "DEFECT",
				});
			}
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

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Ищем Drizzle таблицы
			const isDrizzleTable = /export const \w+\s*=\s*pgTable\s*\(/.test(line);
			// Ищем Zod схемы
			const isZodSchema = /export const \w+Schema\s*=\s*z\.object\s*\(/.test(line);

			if (isDrizzleTable || isZodSchema) {
				const lineNum = i + 1;
				const block = lines.slice(i, Math.min(lines.length, i + 30)).join("\n");

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
					// Проверка ROT-015: numeric поля для денег в рублях
					if (/numeric\s*\(\s*["']\w*(rub|amount|price|cost|balance|total|fee)\w*["']/i.test(block)) {
						issues.push("Денежная колонка объявлена как numeric(Rub) вместо bigint(kopecks) (Мандат 8bm / ROT-015)");
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
 * Секция 10. Главный координатор Monte Carlo Reality Audit
 * ------------------------------------------------------------------ */

export function runDiceAudit(options = {}, rootDir = process.cwd()) {
	const prng = createPrng(options.seed);
	const seedStr = options.seed != null ? String(options.seed) : "random";

	const allCombatFiles = collectCombatFiles(rootDir);

	const report = {
		meta: {
			engine: "Monte Carlo Reality Audit Engine («Кубик-Тест»)",
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

	const report = runDiceAudit(cliOpts, process.cwd());

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
