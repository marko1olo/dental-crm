/**
 * check-env-contract.mjs — гейт «схема ↔ .env.example».
 *
 * ЧТО ИМЕННО ОН ПРОВЕРЯЕТ И ПОЧЕМУ ИМЕННО ЭТО
 * За кампанию в этом репозитории вскрыто семь гейтов, которые были зелёными
 * потому, что проверяли не то свойство. Здесь свойство выбрано так, чтобы гейт
 * ловил ровно ту ошибку, которая уже случилась: переменная
 * DENTE_SETTINGS_ADMIN_SECRET УПОМИНАЛАСЬ в .env.example в прозе («Falls back to
 * DENTE_SETTINGS_ADMIN_SECRET or …»), но СТРОКИ ОБЪЯВЛЕНИЯ не имела ни разу.
 * Новое окружение поднимают копированием этого файла, поэтому переменная,
 * упомянутая только в прозе, не попадала в .env никогда.
 *
 * Отсюда правило: наивный поиск подстроки ЗАПРЕЩЁН — он был бы зелёным на том
 * самом дефекте, ради которого гейт написан. Требуется СТРОКА ОБЪЯВЛЕНИЯ вида
 * `NAME=` или `# NAME=`, и над ней объяснение.
 *
 * ИСТОЧНИК ИСТИНЫ — САМА СХЕМА, А НЕ ЕЁ КОПИЯ
 * Список обязательных имён импортируется из apps/api/src/env/requiredEnv.ts.
 * Переписать список сюда значило бы завести вторую копию, которая разъедется с
 * первой, и гейт снова проверял бы не то. Поэтому запуск идёт через
 * `node --import tsx` — тем же способом, каким apps/api гоняет свои тесты.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { REQUIRED_ENV } from "../apps/api/src/env/requiredEnv.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envExamplePath = path.join(repoRoot, ".env.example");

/** Сколько строк комментария над объявлением считаем объяснением. */
const MIN_EXPLANATION_LINES = 2;

/** Модули, до которых граф импортов проверки окружения доходить не должен. */
const FORBIDDEN_IMPORT_SEGMENTS = ["/db/", "/routes/", "/services/", "/migration/"];

const failures = [];

function fail(message) {
	failures.push(message);
}

/* ── Проверка 1: у каждого обязательного имени есть СТРОКА ОБЪЯВЛЕНИЯ ─────── */

const envExampleLines = readFileSync(envExamplePath, "utf8").split(/\r?\n/);

/**
 * Строка объявления — это `NAME=` или `# NAME=` (с любыми пробелами). Именно
 * такую строку оператор раскомментирует, копируя файл в .env. Упоминание имени
 * внутри прозы объявлением НЕ считается — на этом и строится весь гейт.
 */
function findDeclarationLine(name) {
	const pattern = new RegExp("^\\s*#?\\s*" + name + "\\s*=");
	return envExampleLines.findIndex((line) => pattern.test(line));
}

/** Сколько строк комментария идёт непосредственно над объявлением. */
function explanationLineCount(declarationIndex) {
	let count = 0;
	for (let index = declarationIndex - 1; index >= 0; index -= 1) {
		const line = envExampleLines[index];
		if (line === undefined) break;
		if (line.trim() === "") break;
		if (!line.trimStart().startsWith("#")) break;
		/* Соседнее объявление — это не объяснение, а другая переменная. */
		if (/^\s*#\s*[A-Z][A-Z0-9_]*\s*=/.test(line)) break;
		count += 1;
	}
	return count;
}

for (const entry of REQUIRED_ENV) {
	const declarationIndex = findDeclarationLine(entry.name);

	if (declarationIndex === -1) {
		const mentionedInProse = envExampleLines.some((line) => line.includes(entry.name));
		fail(
			`.env.example: нет строки объявления «# ${entry.name}=».` +
				(mentionedInProse
					? " Имя встречается в тексте, но упоминание в прозе объявлением не является:" +
						" при копировании файла в .env переменная не попадёт туда никогда."
					: "") +
				`\n      ломается без значения: ${entry.breaks}.` +
				`\n      читается: ${entry.readAt}`
		);
		continue;
	}

	const explanation = explanationLineCount(declarationIndex);
	if (explanation < MIN_EXPLANATION_LINES) {
		fail(
			`.env.example:${declarationIndex + 1}: объявление «${entry.name}» есть, но объяснено ` +
				`${explanation} строкой комментария при минимуме ${MIN_EXPLANATION_LINES}. ` +
				"Оператор должен прочитать, ЧТО ломается без значения, а не угадывать по имени."
		);
	}
}

/* ── Проверка 2: проверка окружения не тянет за собой db/routes/services ──── */

/*
 * Порядок вычисления модулей — то единственное, на чём держится вся конструкция.
 * db/client.ts бросает прямо на импорте, поэтому если граф проверки окружения
 * когда-нибудь дотянется до db/**, проверка снова опоздает и владелец системы
 * получит сообщение про DATABASE_URL вместо полного списка. Это условие легко
 * нарушить одним безобидным импортом, поэтому оно проверяется машинно.
 */
function collectRelativeImports(filePath, seen = new Set()) {
	const normalized = filePath.replace(/\\/g, "/");
	if (seen.has(normalized)) return seen;
	seen.add(normalized);

	let source;
	try {
		source = readFileSync(filePath, "utf8");
	} catch {
		return seen;
	}

	for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
		const specifier = match[1].replace(/\.js$/, ".ts");
		collectRelativeImports(path.resolve(path.dirname(filePath), specifier), seen);
	}
	return seen;
}

const bootModule = path.join(repoRoot, "apps", "api", "src", "env", "assertEnvOnBoot.ts");
const reached = collectRelativeImports(bootModule);

for (const module of reached) {
	for (const segment of FORBIDDEN_IMPORT_SEGMENTS) {
		if (module.includes("/apps/api/src" + segment)) {
			fail(
				`Граф импортов проверки окружения дошёл до ${module}. ` +
					"Это ломает порядок: db/client.ts бросает на импорте, и проверка опоздает. " +
					"Уберите импорт — модуль env/ должен зависеть только от zod и node."
			);
		}
	}
}

/* ── Итог ─────────────────────────────────────────────────────────────────── */

if (failures.length > 0) {
	console.error("");
	console.error("check:env-contract — ОТКАЗ");
	console.error(
		`Обязательных переменных в схеме: ${REQUIRED_ENV.length}. Нарушений: ${failures.length}.`
	);
	console.error("");
	for (const failure of failures) console.error("  ✗ " + failure);
	console.error("");
	console.error("Схема: apps/api/src/env/requiredEnv.ts (REQUIRED_ENV)");
	console.error("Образец окружения: .env.example");
	console.error("");
	process.exit(1);
}

console.log(
	`check:env-contract — ok: ${REQUIRED_ENV.length} обязательных переменных объявлены и объяснены в .env.example; ` +
		`граф импортов проверки окружения чист (${reached.size} модулей).`
);
