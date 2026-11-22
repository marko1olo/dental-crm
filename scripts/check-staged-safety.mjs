#!/usr/bin/env node
/**
 * @file check-staged-safety.mjs
 * @description Инспектор безопасности диффа (Diff Safety & Anti-Blind-Kitten Gate).
 *
 * Создан по прямому требованию Создателя:
 * «еще больше коммит и тестовые проверки в любое время доулучшь и универсально сделай
 *  чтобы агенты нормально фиксили ан е как слепые ленивые котята».
 *
 * НАЗНАЧЕНИЕ:
 * Проверяет git diff (staged перед коммитом или текущий дифф в любое время).
 * Категорически запрещает добавлять в боевой код:
 * 1. `as any`, `: any`, `as unknown as`, `as never` (слепая эрозия типов).
 * 2. `!` non-null assertions (слепая надежда вместо guard-clause).
 * 3. `// @ts-ignore`, `// @ts-nocheck`, `// biome-ignore` (подавление компилятора).
 * 4. `console.log()` в боевом API / Web коде (мусор в логах).
 * 5. `/ 100` на денежных полях в UI (деление float в обход money.ts).
 * 6. `uppercase` на кнопках, чипах, табах (нарушение Мандата 8am).
 * 7. Цирковые хардкодные цвета на кнопках (bg-amber-100, text-yellow-600).
 * 8. Утечки ТЗ и дев-жаргона в UI («1 клик», «modeFit»).
 *
 * ЗАПУСК:
 *   node scripts/check-staged-safety.mjs           # Проверка staged диффа перед коммитом
 *   node scripts/check-staged-safety.mjs --all     # Проверка всех незакоммиченных изменений (in-flight)
 *   npm run check:diff                             # Запуск в любое время
 */

import { execSync } from "node:child_process";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const isAll = process.argv.includes("--all") || process.argv.includes("-a");

function getDiff() {
	try {
		if (isAll) {
			// Проверяем весь рабочий дифф (staged + unstaged)
			return execSync("git diff HEAD", { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
		}
		// По умолчанию проверяем только то, что подготовлено к коммиту (staged)
		const stagedDiff = execSync("git diff --cached", { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
		if (stagedDiff.trim().length > 0) {
			return stagedDiff;
		}
		// Если ничего не застейджено, но скрипт вызван руками — проверим обычный diff
		return execSync("git diff", { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
	} catch (err) {
		console.warn("[WARN] Не удалось получить git diff:", err.message);
		return "";
	}
}

function isTestOrDocOrScriptFile(filePath) {
	const norm = filePath.replace(/\\/g, "/");
	if (norm.includes("/tests/") || norm.includes("/__tests__/") || norm.includes(".test.") || norm.includes(".spec.")) return true;
	if (norm.endsWith(".md") || norm.endsWith(".json") || norm.endsWith(".txt") || norm.endsWith(".sql")) return true;
	if (norm.startsWith("scripts/") || norm.startsWith("electron/scripts/")) return true;
	if (norm.includes("/sampleData/") || norm.includes("/demo/")) return true;
	return false;
}

const FORBIDDEN_DIFF_PATTERNS = [
	{
		rule: "ANTI_BLIND_AS_ANY",
		regex: /\bas\s+any\b/,
		severity: "CRITICAL",
		title: "Слепой каст 'as any'",
		message: "Ты добавил 'as any' вместо строгой типизации. Запрещено вести себя как слепой котёнок — объяви интерфейс или используй Zod safeParse!",
		gateKey: "TYPE_RATCHET",
	},
	{
		rule: "ANTI_BLIND_DOUBLE_CAST",
		regex: /\bas\s+(?:unknown\s+as|any\s+as|never\b)/,
		severity: "CRITICAL",
		title: "Двойной каст 'as unknown as' или 'as never'",
		message: "Ты добавил слепой каст (as unknown as / as never), пытаясь обмануть компилятор TypeScript. Это саботаж типизации!",
		gateKey: "TYPE_RATCHET",
	},
	{
		rule: "ANTI_BLIND_NON_NULL",
		regex: /[a-zA-Z0-9_$]+!\.[a-zA-Z0-9_$]+/,
		severity: "HIGH",
		title: "Non-null assertion (!)",
		message: "Ты добавил оператор '!' вместо guard-clause проверки на null/undefined. При отсутствии данных приложение упадёт с TypeError!",
		gateKey: "TYPESCRIPT_COMPILER",
	},
	{
		rule: "ANTI_BLIND_EMPTY_CATCH",
		regex: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/,
		severity: "CRITICAL",
		title: "Глухое проглатывание ошибки (empty catch {})",
		message: "Ты оставил пустой блок catch {}. Ошибки обязаны логироваться через req.log/console или обрабатываться с человеческим тостом!",
		gateKey: "TYPESCRIPT_COMPILER",
	},
	{
		rule: "ANTI_BLIND_WINDOW_DIALOG",
		regex: /\bwindow\.(alert|confirm|prompt)\s*\(/,
		severity: "CRITICAL",
		title: "Браузерное всплывающее окно (window.alert/confirm/prompt)",
		message: "Мандат 8e категорически запрещает window.alert/confirm/prompt. Используй неблокирующие тосты или Bottom Sheet шторки!",
		gateKey: "BUTTON_STYLES",
	},
	{
		rule: "ANTI_BLIND_MOCK_PATIENT",
		regex: /(?:patientName|clientName|doctorName)\s*[:=]\s*["'](?:Иванов|Петров|Сидоров|Смирнов|Test|Тест|Тестовый)["']/i,
		severity: "CRITICAL",
		title: "Хардкодный пациент или врач в боевом коде",
		message: "Zero-Mock-Defaults: запрещено зашивать вымышленных пациентов или врачей в пропсы! Используй null с честным Empty State.",
		gateKey: "MOCK_DEFAULTS",
	},
	{
		rule: "ANTI_BLIND_SUPPRESSION",
		regex: /(?:\/\/|\/\*)\s*(@ts-ignore|@ts-nocheck|biome-ignore|eslint-disable)/,
		severity: "CRITICAL",
		title: "Подавление компилятора или линтера",
		message: "Ты добавил комментарий подавления (@ts-ignore / biome-ignore). Замазывание ошибок категорически запрещено!",
		gateKey: "TYPE_RATCHET",
	},
	{
		rule: "ANTI_BLIND_CONSOLE_LOG",
		regex: /\bconsole\.(log|debug|info)\(/,
		severity: "MEDIUM",
		title: "Неструктурированный console.log",
		message: "В боевом коде запрещён console.log. В API используй Fastify logger (req.log), на фронтенде — структурированный логгер.",
		gateKey: "TYPESCRIPT_COMPILER",
	},
	{
		rule: "ANTI_BLIND_MONEY_DIV",
		regex: /\b(price|amount|cost|rubles|balance|kopecks|total)\w*\s*\/\s*100\b/i,
		severity: "CRITICAL",
		title: "Деление денег на 100 (/ 100)",
		message: "Ты добавил ручное деление на 100 в обход @dental/shared/src/money.ts. Опасность потери копеек из-за IEEE 754 float!",
		gateKey: "DICE_AUDIT",
	},
	{
		rule: "ANTI_BLIND_UPPERCASE",
		regex: /\buppercase\b/,
		severity: "MEDIUM",
		title: "Запрещённый UPPERCASE (Мандат 8am)",
		message: "Капслок на кнопках, табах и чипах запрещён. Строго Sentence case («Сохранить», «Новый приём»).",
		gateKey: "BUTTON_STYLES",
	},
	{
		rule: "ANTI_BLIND_CIRCUS_COLORS",
		regex: /\b(bg-amber-100|text-yellow-600|border-amber-400|bg-purple-100|bg-orange-100)\b/,
		severity: "MEDIUM",
		title: "Цирковые хардкодные цвета на кнопках",
		message: "Хардкодный цвет кнопки запрещён. Используй только семантические токены: var(--primary), var(--paper), var(--line).",
		gateKey: "BUTTON_STYLES",
	},
	{
		rule: "ANTI_BLIND_DEV_JARGON",
		regex: /(?:1[- ]клик|Мандат 8e|modeFit)/i,
		severity: "HIGH",
		title: "Утечка ТЗ и дев-жаргона в UI",
		message: "Не выводи внутренние термины («1 клик», «Мандат 8e») на экран врачу! Используй профессиональный медицинский язык.",
		gateKey: "BUTTON_STYLES",
	},
];

function analyzeDiff(diffText) {
	const violations = [];
	const lines = diffText.split("\n");

	let currentFile = null;
	let currentLineNum = 0;

	for (const line of lines) {
		if (line.startsWith("diff --git ")) {
			// diff --git a/path/to/file b/path/to/file
			const match = line.match(/b\/(.*)$/);
			currentFile = match ? match[1] : null;
			currentLineNum = 0;
			continue;
		}

		if (line.startsWith("@@ ")) {
			// @@ -start,len +start,len @@
			const match = line.match(/\+(\d+)/);
			currentLineNum = match ? Number.parseInt(match[1], 10) - 1 : 0;
			continue;
		}

		if (line.startsWith("+") && !line.startsWith("+++")) {
			currentLineNum++;
			if (!currentFile || isTestOrDocOrScriptFile(currentFile)) {
				continue;
			}

			const addedCode = line.slice(1);
			const trimmed = addedCode.trim();

			// Пропускаем строки комментариев (кроме супрессий)
			const isNormalComment = (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) &&
				!trimmed.includes("@ts-") && !trimmed.includes("biome-") && !trimmed.includes("eslint-");
			if (isNormalComment) continue;

			for (const p of FORBIDDEN_DIFF_PATTERNS) {
				if (p.regex.test(addedCode)) {
					violations.push({
						file: currentFile,
						lineNum: currentLineNum,
						pattern: p,
						codeSnippet: trimmed,
					});
				}
			}
		} else if (!line.startsWith("-")) {
			currentLineNum++;
		}
	}

	return violations;
}

export function runDiffSafetyAudit() {
	console.log(`\n🔎 [DIFF SAFETY GUARD] Инспекция изменений ${isAll ? "(все незакоммиченные файлы)" : "(staged diff)"}...`);
	const diffText = getDiff();

	if (!diffText || diffText.trim().length === 0) {
		console.log("ℹ️  Изменений для инспекции не обнаружено. Дифф чист.\n");
		return 0;
	}

	const violations = analyzeDiff(diffText);

	if (violations.length === 0) {
		console.log("✅ [DIFF SAFETY PASSED] В добавляемом коде нет запрещённых костылей (as any, !, suppressions, float money). Чисто!\n");
		return 0;
	}

	console.error("\n" + "=".repeat(80));
	console.error("🚨 СТОП! АНТИ-КОТЁНОК: ОБНАРУЖЕНЫ КОСТЫЛИ И СЛЕПЫЕ ЗАПЛАТКИ В ВАШЕМ ДИФФЕ!");
	console.error("=".repeat(80));
	console.error(`Найдено ${violations.length} грубых нарушений качества в добавляемых строках кода:\n`);

	for (let i = 0; i < violations.length; i++) {
		const v = violations[i];
		console.error(`[${i + 1}/${violations.length}] ❌ [${v.pattern.severity}] ${v.pattern.title}`);
		console.error(`       Локация:   ${v.file}:${v.lineNum}`);
		console.error(`       Строка:    ${v.codeSnippet}`);
		console.error(`       Причина:   ${v.pattern.message}\n`);
	}

	// Печатаем манифест для самого частого или первого критического дефекта
	const criticalViolation = violations.find((v) => v.pattern.severity === "CRITICAL") || violations[0];
	printFailureManifesto(criticalViolation.pattern.gateKey, {
		details: `Ты попытался протащить ${violations.length} костылей в дифф! Нарушение: ${criticalViolation.pattern.title} в ${criticalViolation.file}:${criticalViolation.lineNum}`,
	});

	console.error("💡 НАСТАВЛЕНИЕ ДЛЯ АГЕНТА:");
	console.error(" 1. Открой целевой файл ПОЛНОСТЬЮ через read_file чанками по 800 строк от 1-й строки (Закон №0).");
	console.error(" 2. Не затыкай дыру 'as any' или '!'. Напиши строгий тип, DTO или безопасный guard: if (!item) return.");
	console.error(" 3. Проверь смежные вызовы в домене — истреби весь класс проблемы, а не 1 строчку.");
	console.error(" 4. Повтори проверку: node scripts/check-staged-safety.mjs\n");

	return 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-staged-safety.mjs")) {
	const code = runDiffSafetyAudit();
	process.exit(code);
}
