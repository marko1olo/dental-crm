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

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { scanTestSource } from "./lib/code-health-ast.mjs";
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

export function isTestFile(filePath) {
	const norm = filePath.replace(/\\/g, "/");
	return norm.includes("/tests/") || norm.includes("/__tests__/") || norm.includes(".test.") || norm.includes(".spec.");
}

export function isDocOrScriptFile(filePath) {
	const norm = filePath.replace(/\\/g, "/");
	if (norm.endsWith(".md") || norm.endsWith(".json") || norm.endsWith(".txt") || norm.endsWith(".sql")) return true;
	if (norm.startsWith("scripts/") || norm.startsWith("electron/scripts/")) return true;
	if (norm.includes("/sampleData/") || norm.includes("/demo/")) return true;
	return false;
}

function isTestOrDocOrScriptFile(filePath) {
	return isTestFile(filePath) || isDocOrScriptFile(filePath);
}

/**
 * Убирает из строки кода литералы и хвостовой комментарий, чтобы regex видел ТОЛЬКО код.
 * Без этого "Готово!" в строке или `// ок!` в комментарии давали бы ложные срабатывания.
 */
export function codeOnly(line) {
	return line
		.replace(/"(?:[^"\\]|\\.)*"/g, '""')
		.replace(/'(?:[^'\\]|\\.)*'/g, "''")
		.replace(/`(?:[^`\\]|\\.)*`/g, "``")
		.replace(/\/\/.*$/, "");
}

/**
 * Non-null assertion в ЛЮБОЙ форме: `x!.y`, `x!)`, `x!,`, `x[0]!`, `f()!`, `x!;`.
 * Не трогает `!=`, `!==`, `!x` и JSX-текст (`Готово!</b>`).
 */
export const NON_NULL_RE = /[\w\])]!(?![=<])/;
const TS_FILE_RE = /\.(?:ts|tsx|mts|cts)$/;

function toCaseInsensitivePattern(word) {
	return word
		.split("")
		.map((c) => (/[a-zA-Z]/.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c))
		.join("");
}

/**
 * Недвусмысленные финансовые корни (могут быть в любой части идентификатора и в любом регистре).
 */
const UNAMBIGUOUS_MONEY_WORDS = [
	"price", "amount", "cost", "payout", "wage", "salary",
	"discount", "commission", "subtotal", "invoice", "cashback",
	"payroll", "balance", "kopeck", "gross", "ruble", "kop"
];
const UNAMBIGUOUS_MONEY_PATTERN = `[a-zA-Z0-9_$]*(?:${UNAMBIGUOUS_MONEY_WORDS.map(toCaseInsensitivePattern).join("|")})[a-zA-Z0-9_$]*`;

/**
 * Чувствительные короткие корни (требуют строгих границ слов, camelCase или snake_case для предотвращения ложных срабатываний).
 *  - rub: rub, rubAmount, priceRub, price_rub (исключает scrub, shrub)
 *  - net: net, netBase, totalNet, docNet, net_base (исключает network, subnet, internet, magnet)
 *  - fee: fee, feeKopecks, doctorFee, doc_fee (исключает feedback, coffee)
 *  - vat: vat, vatPercent, totalVat, total_vat (исключает private, activate, elevation)
 *  - bill: bill, billAmount, billing, billable, totalBill
 */
const SENSITIVE_SHORT_ROOTS = [
	"\\b(?:net|fee|vat|bill|rub)\\b",
	"\\b(?:net|fee|vat|bill|rub)[A-Z_0-9][a-zA-Z0-9_$]*",
	"\\b(?:billing|billable)[a-zA-Z0-9_$]*",
	"[a-zA-Z0-9_$]*[a-z0-9](?:Net|Fee|Vat|Bill|Rub)(?:[A-Z_0-9][a-zA-Z0-9_$]*)?",
	"[a-zA-Z0-9_$]*_(?:net|fee|vat|bill|rub)(?:_[a-zA-Z0-9_$]+)?",
].join("|");

export const MONEY_IDENTIFIER_PATTERN = `(?:${UNAMBIGUOUS_MONEY_PATTERN}|${SENSITIVE_SHORT_ROOTS})`;

/**
 * Числовые коэффициенты ручной конвертации денег: 100, 100n, 100.0, 0.01, .01, 0.010.
 * Lookbehind (?<![\w.]) и Lookahead (?![\w.]) гарантируют совпадение точных значений (не 1000 и не 1.01).
 */
export const RAW_MONEY_NUM_PATTERN = "(?<![\\w.])(?:100(?:n|\\.0+)?|0?\\.010*)(?![\\w.])";

// Денежная переменная слева: moneyId ... [* или /] ... NUM
const LEFT_MONEY_MATH = `\\b${MONEY_IDENTIFIER_PATTERN}(?:\\s*[\\*\\/]\\s*\\(?\\s*[\\w$.]+\\s*\\)?)*\\s*[\\*\\/]\\s*\\(?\\s*${RAW_MONEY_NUM_PATTERN}`;

// Денежная переменная справа: NUM ... [* или /] ... moneyId
const RIGHT_MONEY_MATH = `${RAW_MONEY_NUM_PATTERN}\\s*[\\*\\/]\\s*\\(?(?:\\s*[\\w$.]+\\s*[\\*\\/]\\s*\\(?)*\\s*${MONEY_IDENTIFIER_PATTERN}\\b`;

export const RAW_MONEY_MATH_RE = new RegExp(`(?:${LEFT_MONEY_MATH}|${RIGHT_MONEY_MATH})`);

export const FORBIDDEN_DIFF_PATTERNS = [
	{
		rule: "ANTI_BLIND_AS_ANY",
		regex: /(?:\bas\s*\(\s*any\s*\)|\bas\s+any\b|:\s*any\b|<any>|=\s*any\b|\bany\[\]|\|\s*any\b|\bany\s*\||\bRecord\s*<\s*[^,>]+\s*,\s*any\s*>|\btype\s+[A-Za-z0-9_$]+\s*=\s*any\s*;?)/,
		onlyCode: true,
		onlyExt: TS_FILE_RE,
		severity: "CRITICAL",
		title: "Явный тип или каст 'any' (: any, as any, as (any), Record<string, any>, | any, type X = any, any[])",
		message: "Ты добавил 'any' вместо строгой типизации. Запрещено вести себя как слепой котёнок — объяви строгий DTO-интерфейс или Zod-схему!",
		gateKey: "TYPE_RATCHET",
	},
	{
		rule: "ANTI_BLIND_ZOD_ANY",
		regex: /\bz\.any\s*\(/,
		onlyCode: true,
		onlyExt: TS_FILE_RE,
		severity: "CRITICAL",
		title: "Дыра в валидации Zod: z.any()",
		message: "Запрещено использовать z.any() в схемах валидации. Используй строгий контракт или z.unknown() с дальнейшей валидацией!",
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
		regex: NON_NULL_RE,
		onlyCode: true,
		onlyExt: TS_FILE_RE,
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
		message: "Ты оставил пустой блок catch {}. Ошибки обязаны логироваться через req.log/logger или обрабатываться с человеческим тостом!",
		gateKey: "TYPESCRIPT_COMPILER",
	},
	{
		rule: "ANTI_BLIND_SWALLOWED_PROMISE",
		regex: /\.catch\s*\(\s*(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>\s*(?:\{\s*\}|undefined|null)\s*\)/,
		onlyCode: true,
		severity: "CRITICAL",
		title: "Тихое проглатывание rejected Promise (.catch(() => {} / null / undefined))",
		message: "Запрещено глотать ошибки промисов молча! Логируй ошибку через logger/req.log или возвращай явный отказ пользователю.",
		gateKey: "TYPESCRIPT_COMPILER",
	},
	{
		rule: "ANTI_BLIND_TEST_ENV_SNIFF",
		regex: /\bprocess\.env\.(?:VITEST|VITEST_WORKER_ID|JEST_WORKER_ID|NODE_TEST_CONTEXT)\b/,
		onlyCode: true,
		onlyExt: TS_FILE_RE,
		severity: "CRITICAL",
		title: "Боевой код нюхает тест-раннер (process.env.VITEST / NODE_TEST_CONTEXT)",
		message: "Боевой код не имеет права менять поведение под тест-раннер! Передавай зависимости через DI/параметры, а не проверяй VITEST в рантайме.",
		gateKey: "UNIT_TESTS",
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
		regex: /(?:\/\/|\/\*)\s*(@ts-ignore|@ts-nocheck|@ts-expect-error|biome-ignore|eslint-disable)/,
		severity: "CRITICAL",
		title: "Подавление компилятора или линтера",
		message: "Ты добавил комментарий подавления (@ts-ignore / @ts-expect-error / biome-ignore). Замазывание ошибок категорически запрещено!",
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
		rule: "ANTI_BLIND_RAW_MONEY_MATH",
		regex: RAW_MONEY_MATH_RE,
		onlyCode: true,
		severity: "CRITICAL",
		title: "Ручные float-расчёты денег (/ 100, * 0.01, * 100)",
		message: "Запрещены ручные вычисления и конвертации денег (/ 100, * 0.01, * .01, * 100) в обход @dental/shared/src/money.ts. Опасность потери копеек из-за IEEE-754 float! Используй kopecksToRubles(), rublesToKopecks(), calculatePercentDiscountKopecks().",
		gateKey: "DICE_AUDIT",
	},
	{
		rule: "ANTI_BLIND_HARD_RELOAD",
		regex: /\bwindow\.location\.(?:reload\s*\(|href\s*=)/,
		severity: "CRITICAL",
		title: "Аппаратный перезапуск экрана (F5 / location.reload)",
		message: "Мандат 8d/8zq категорически запрещает F5-перезагрузки (window.location.reload). Обновляй состояние реактивно через React Query invalidation или store dispatch!",
		gateKey: "BUTTON_STYLES",
	},
	{
		rule: "ANTI_BLIND_POTEMKIN_TIMEOUT",
		regex: /\bsetTimeout\s*\(\s*(?:[^,]+,\s*(?:1000|1500|2000|3000|5000)\b)/,
		severity: "HIGH",
		title: "Потёмкинский тайм-аут (fake setTimeout delay)",
		message: "Мандат 8e/8n запрещает симуляцию асинхронности через setTimeout(1500). Работа в DENTE реальна: промис -> Fastify -> PG18 -> UI!",
		gateKey: "MOCK_DEFAULTS",
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

export const FORBIDDEN_TEST_PATTERNS = [
	{
		rule: "ANTI_BLIND_TEST_SKIP",
		regex: /\b(?:it|test|describe)\.(?:skip|only|todo)\s*\(/,
		onlyCode: true,
		severity: "CRITICAL",
		title: "Подавление тестов через .skip(), .only() или .todo()",
		message: "Запрещено отключать тесты (.skip / .todo) или изолировать (.only)! Чини причину падения теста, а не глуши его.",
		gateKey: "UNIT_TESTS",
	},
	{
		rule: "ANTI_GOODHART_TAUTOLOGY",
		regex: /\bassert\.ok\s*\(\s*true\b|\bassert\.(?:strict)?[Ee]qual\s*\(\s*(true|false)\s*,\s*\1\b|\bexpect\s*\(\s*(true|false)\s*\)\.(?:toBe|toEqual)\s*\(\s*\2\s*\)/,
		onlyCode: true,
		severity: "CRITICAL",
		title: "Тест-пустышка / тавтология (assert.ok(true) / expect(true).toBe(true))",
		message: "Тест, который физически не может упасть — это саботаж (Закон Гудхарта). Проверяй реальное поведение кода!",
		gateKey: "UNIT_TESTS",
	},
	{
		rule: "ANTI_GOODHART_LINE_COUNT",
		regex: /(?:lineCount|lines|Lines|LineCount)\s*>=\s*\d{2,4}\s*&&\s*\w*(?:lineCount|lines|Lines|LineCount)\s*<=|\.split\s*\(\s*(?:""|''|\/\\r\?\\n\/)\s*\)\.length\s*(?:<=|>=)/,
		onlyCode: true,
		severity: "HIGH",
		title: "Гудхарт-тест на количество строк исходника в юнит-тесте",
		message: "Запрещено добавлять проверки числа строк файлов в юнит-тесты! Лимит размера файлов контролирует единый шлюз npm run check:limits.",
		gateKey: "UNIT_TESTS",
	},
];

/**
 * Проверка файла scripts/config/sanitary-baseline.json на попытки ослабления лимитов долга
 * или тихого снижения порогов количества тестов (floors) без записи в ratchet-ledger.jsonl.
 * Поддерживает как плоский v1 формат, так и структурированный v2 ({ limits, floors }).
 */
export function checkBaselineDiff(diffText) {
	const violations = [];
	const baselineDiffRegex = /diff --git a\/scripts\/config\/sanitary-baseline\.json b\/scripts\/config\/sanitary-baseline\.json[\s\S]*?(?=(?:diff --git|$))/;
	const match = baselineDiffRegex.exec(diffText);
	if (!match) return violations;

	const hunk = match[0];
	const floorKeys = new Set(["prodFiles", "testFiles", "tests"]);
	const oldVals = {};
	const newVals = {};
	let hasV2Section = false;
	let inFloorsSection = false;

	for (const line of hunk.split("\n")) {
		if (/"limits"\s*:/.test(line)) { hasV2Section = true; inFloorsSection = false; }
		else if (/"floors"\s*:/.test(line)) { hasV2Section = true; inFloorsSection = true; }
		else if (/^\s*\}/.test(line.slice(1))) { inFloorsSection = false; }

		if (line.startsWith("-") && !line.startsWith("---")) {
			const m = line.match(/"([^"]+)":\s*(\d+)/);
			if (m && m[1] !== "version") oldVals[m[1]] = { val: Number.parseInt(m[2], 10), isFloor: inFloorsSection || floorKeys.has(m[1]) };
		} else if (line.startsWith("+") && !line.startsWith("+++")) {
			const m = line.match(/"([^"]+)":\s*(\d+)/);
			if (m && m[1] !== "version") newVals[m[1]] = { val: Number.parseInt(m[2], 10), isFloor: inFloorsSection || floorKeys.has(m[1]) };
		}
	}

	const hasLedgerAddition = /diff --git a\/scripts\/config\/ratchet-ledger\.jsonl b\/scripts\/config\/ratchet-ledger\.jsonl[\s\S]*?\n\+\{/.test(diffText);

	for (const [key, entry] of Object.entries(newVals)) {
		const oldEntry = oldVals[key];
		const oldVal = oldEntry ? oldEntry.val : 0;
		const isFloor = entry.isFloor || (oldEntry?.isFloor ?? false);

		if (isFloor) {
			if (oldEntry && entry.val < oldVal && !hasLedgerAddition) {
				violations.push({
					file: "scripts/config/sanitary-baseline.json",
					lineNum: 1,
					pattern: {
						rule: "ANTI_BLIND_BASELINE_FLOOR_DROP",
						severity: "CRITICAL",
						title: "Тихое снижение порога числа тестов/файлов (Floor Drop без Ledger)",
						message: `Запрещено снижать порог "${key}" (${oldVal} ➔ ${entry.val}) без записи в scripts/config/ratchet-ledger.jsonl! Используй --accept-test-removal с --reason.`,
						gateKey: "TYPE_RATCHET",
					},
					codeSnippet: `"${key}": ${entry.val} (было: ${oldVal})`,
				});
			}
			continue;
		}

		if (hasV2Section && !oldEntry) continue;
		if (entry.val > oldVal) {
			violations.push({
				file: "scripts/config/sanitary-baseline.json",
				lineNum: 1,
				pattern: {
					rule: "ANTI_BLIND_BASELINE_REGRESSION",
					severity: "CRITICAL",
					title: "Попытка ослабления санитарного храповика (Sanitary Baseline Regression)",
					message: `Запрещено увеличивать лимиты долга в sanitary-baseline.json (${key}: ${oldVal} ➔ ${entry.val})! Закон Храповика (Мандат 8ai / 8bq) допускает только монотонное убывание или 0.`,
					gateKey: "TYPE_RATCHET",
				},
				codeSnippet: `"${key}": ${entry.val} (было: ${oldVal})`,
			});
		}
	}

	return violations;
}

function checkContiguousAddedBlock(block, file, violations) {
	if (!block || block.length <= 1) return;
	const fullBlockCode = block.map((b) => b.code).join("\n");
	const blockCodeOnly = block.map((b) => codeOnly(b.code)).join("\n");
	const firstLineNum = block[0].lineNum;

	for (const p of FORBIDDEN_DIFF_PATTERNS) {
		if (p.onlyExt && !p.onlyExt.test(file)) continue;
		const subject = p.onlyCode ? blockCodeOnly : fullBlockCode;
		if (p.regex.test(subject)) {
			const alreadyCaught = violations.some(
				(v) => v.file === file && v.pattern.rule === p.rule && block.some((b) => b.lineNum === v.lineNum),
			);
			if (!alreadyCaught) {
				violations.push({
					file,
					lineNum: firstLineNum,
					pattern: p,
					codeSnippet: block.map((b) => b.trimmed).join(" "),
				});
			}
		}
	}
}

export function analyzeDiff(diffText) {
	const violations = [...checkBaselineDiff(diffText)];
	const lines = diffText.split("\n");

	let currentFile = null;
	let currentLineNum = 0;
	let contiguousAdded = [];

	const flushContiguous = () => {
		if (contiguousAdded.length > 0 && currentFile && !isDocOrScriptFile(currentFile) && !isTestFile(currentFile)) {
			checkContiguousAddedBlock(contiguousAdded, currentFile, violations);
		}
		contiguousAdded = [];
	};

	for (const line of lines) {
		if (line.startsWith("diff --git ")) {
			flushContiguous();
			// diff --git a/path/to/file b/path/to/file
			const match = line.match(/b\/(.*)$/);
			currentFile = match ? match[1] : null;
			currentLineNum = 0;
			continue;
		}

		if (line.startsWith("@@ ")) {
			flushContiguous();
			// @@ -start,len +start,len @@
			const match = line.match(/\+(\d+)/);
			currentLineNum = match ? Number.parseInt(match[1], 10) - 1 : 0;
			continue;
		}

		if (line.startsWith("+") && !line.startsWith("+++")) {
			currentLineNum++;
			if (!currentFile || isDocOrScriptFile(currentFile)) {
				continue;
			}

			const addedCode = line.slice(1);
			const trimmed = addedCode.trim();

			contiguousAdded.push({ lineNum: currentLineNum, code: addedCode, trimmed });

			// Проверка тестовых файлов на саботаж тестов (.skip / .only)
			if (isTestFile(currentFile)) {
				const subject = codeOnly(addedCode);
				for (const p of FORBIDDEN_TEST_PATTERNS) {
					if (p.regex.test(subject)) {
						violations.push({
							file: currentFile,
							lineNum: currentLineNum,
							pattern: p,
							codeSnippet: trimmed,
						});
					}
				}
				continue;
			}

			// Пропускаем строки комментариев (кроме супрессий)
			const isNormalComment = (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) &&
				!trimmed.includes("@ts-") && !trimmed.includes("biome-") && !trimmed.includes("eslint-");
			if (isNormalComment) continue;

			for (const p of FORBIDDEN_DIFF_PATTERNS) {
				if (p.onlyExt && !p.onlyExt.test(currentFile)) continue;
				const subject = p.onlyCode ? codeOnly(addedCode) : addedCode;
				if (p.regex.test(subject)) {
					violations.push({
						file: currentFile,
						lineNum: currentLineNum,
						pattern: p,
						codeSnippet: trimmed,
					});
				}
			}
		} else {
			flushContiguous();
			if (!line.startsWith("-")) {
				currentLineNum++;
			}
		}
	}
	flushContiguous();

	return violations;
}

const HARD_ZERO_TEST_AST_RULES = new Set([
	"test-no-assertion",
	"test-tautology",
	"test-swallowed-assertion",
	"test-self-mock",
	"test-skipped",
	"test-only-left",
]);
const NO_GROWTH_TEST_AST_RULES = new Set([
	"test-phantom-no-sut",
	"test-source-grep",
	"test-size-assertion",
	"test-weak-only",
]);

function countTestFindingsByRule(text, file) {
	if (!text) return {};
	const res = scanTestSource(text, file);
	const grouped = {};
	for (const f of res.findings) {
		if (!grouped[f.rule]) grouped[f.rule] = [];
		grouped[f.rule].push(f);
	}
	return grouped;
}

function defaultReadHeadText(file) {
	try {
		return execFileSync("git", ["show", `HEAD:${file}`], {
			encoding: "utf8",
			maxBuffer: 16 * 1024 * 1024,
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return "";
	}
}

function defaultReadTargetText(file, stagedOnly) {
	if (stagedOnly) {
		try {
			return execFileSync("git", ["show", `:${file}`], {
				encoding: "utf8",
				maxBuffer: 16 * 1024 * 1024,
				stdio: ["ignore", "pipe", "ignore"],
			});
		} catch {
			// fallback to working tree below
		}
	}
	return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/**
 * AST-инспекция всех затронутых в диффе тест-файлов (per-file ratchet):
 * 1. Жесткий 0 на фейки/проглатывание/скипы (`HARD_ZERO_TEST_AST_RULES`).
 * 2. Запрет добавлять новые фантомы, source-grep, size-assertion и weak-only даже при наличии старого долга в репо.
 */
export function checkTestFilesAstRegression(diffText, io = {}) {
	const violations = [];
	const chunks = diffText.split(/(?=^diff --git )/m).filter((c) => c.startsWith("diff --git "));
	const readBefore = io.readBefore ?? defaultReadHeadText;
	const useStaged = io.stagedOnly ?? !isAll;
	const readAfter = io.readAfter ?? ((file) => defaultReadTargetText(file, useStaged));
	const seen = new Set();

	for (const chunk of chunks) {
		const header = chunk.match(/^diff --git a\/.+ b\/(.+)/);
		if (!header) continue;
		const file = header[1].trim();
		if (seen.has(file) || !isTestFile(file) || !/\.[cm]?[jt]sx?$/.test(file)) continue;
		seen.add(file);
		if (/^deleted file mode /m.test(chunk)) continue;

		const afterText = readAfter(file);
		if (!afterText) continue;
		const beforeText = readBefore(file) ?? "";

		const beforeGrouped = countTestFindingsByRule(beforeText, file);
		const afterGrouped = countTestFindingsByRule(afterText, file);

		for (const [rule, list] of Object.entries(afterGrouped)) {
			const beforeCount = beforeGrouped[rule]?.length ?? 0;
			const afterCount = list.length;
			const isHardZero = HARD_ZERO_TEST_AST_RULES.has(rule);
			const isRegressed = NO_GROWTH_TEST_AST_RULES.has(rule) && afterCount > beforeCount;
			if (!isHardZero && !isRegressed) continue;

			const sample = list[list.length - 1];
			violations.push({
				file,
				lineNum: sample?.line ?? 1,
				pattern: {
					rule: `ANTI_GOODHART_AST_${rule.toUpperCase().replace(/-/g, "_")}`,
					severity: "CRITICAL",
					title: `AST-ПВО тестов: ${rule} (${beforeCount} -> ${afterCount})`,
					message: isHardZero
						? `В тест-файле обнаружено недопустимое нарушение "${rule}". Вызови реальный код проекта с проверяемым ассертом!`
						: `В тест-файле выросло число плохих тестов "${rule}" (${beforeCount} -> ${afterCount}). Запрещено добавлять новые фантомные/source-grep/typeof-only/line-count тесты!`,
					gateKey: "UNIT_TESTS",
				},
				codeSnippet: sample?.text ?? rule,
			});
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

	const violations = [...analyzeDiff(diffText), ...checkTestFilesAstRegression(diffText)];

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
