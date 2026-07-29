#!/usr/bin/env node
/**
 * check-css-tokens.mjs — ищет var(--x), которые не могут разрешиться ни в одной теме.
 *
 * ЗАЧЕМ. Неизвестное имя в var() не роняет сборку и не даёт предупреждения.
 * Объявление просто становится недействительным на этапе вычисления значения
 * (invalid at computed-value time): наследуемое свойство берёт значение
 * родителя, ненаследуемое — начальное. Для `color` это «текст пропал», для
 * `background` — прозрачная плашка. Ни tsc, ни Vite, ни один тест такого не
 * видят; находят глазами на конкретном экране в конкретной теме.
 *
 * ОТКУДА ПРОВЕРКА. В шапке apps/web/src/styles/token-aliases.css было записано
 * «19 переменных, 56 вхождений», посчитанные разовым скриптом
 * scratch/scan-undefined-tokens.mjs. Разовый скрипт ничего не охраняет: число в
 * комментарии устаревает молча, а новые неизвестные имена добавляются свободно.
 *
 * ЧТО ЭТА ПРОВЕРКА ДЕЛАЕТ СТРОЖЕ ПРЕДШЕСТВЕННИКА.
 *   1. Запас считается ПО МЕСТУ ИСПОЛЬЗОВАНИЯ, а не по имени. Прежний скрипт,
 *      увидев один раз var(--x, запас), прощал все остальные вхождения var(--x)
 *      без запаса — а именно они и ломаются.
 *   2. Комментарии вырезаются. Иначе примеры дефектов, записанные в шапках самих
 *      css-файлов, считаются и за использование, и за объявление. В token-aliases.css
 *      такие примеры есть.
 *   3. Печатается файл и строка каждого вхождения, а не только имя.
 *   4. Учитываются объявления через @property и имена, выставляемые из JS через
 *      style.setProperty и инлайновые стили, — иначе они дали бы ложную тревогу.
 *
 * ИСПРАВЛЕНО 28.07.2026 — ПРОВЕРКА ОШИБАЛАСЬ В СВОЮ ПОЛЬЗУ И МОЛЧА ПРОЩАЛА ИМЕНА.
 *   A. Объявление ищется только там, где оно может стоять по синтаксису CSS:
 *      сразу после `{`, после `;`, после `}` вложенного правила или в самом
 *      начале файла. Прежнее выражение /(--[\w-]+)\s*:/ не было привязано ни к
 *      чему и читало суффикс BEM-класса перед псевдоклассом как объявление:
 *      `.auth-pin-btn--danger:hover` давало «--danger объявлен». Так проверка
 *      прощала себе 7 имён — --danger, --secondary, --button, --ok, --warn,
 *      --bad, --info — из которых --danger не объявлен нигде в репозитории и
 *      используется без запаса в apps/web/src/styles/main.css. Четыре из семи
 *      (--ok, --warn, --bad, --info) — это опечатки от настоящих токенов
 *      палитры (--ok-fg, --bad-bg и т. д.), то есть дыра стояла ровно под теми
 *      именами, которые вероятнее всего написать неверно.
 *   B. Имена, выставляемые из JS, берутся из синтаксического дерева TypeScript,
 *      а не текстовым поиском по файлу. Текстовый поиск не отличал код от
 *      комментария: закомментированное упоминание `"--name":` в любом .ts/.tsx
 *      навсегда помечало имя объявленным и глушило настоящее нарушение.
 *
 * ЧЕГО ПРОВЕРКА НЕ ВИДИТ, И ЭТО ОСОЗНАННО.
 *   - Имя, собранное в рантайме: setProperty(`--x-${i}`, …) или
 *     setProperty(имяИзПеременной, …). Статически такого имени в коде нет.
 *   - Значения не вычисляются: var(--a, var(--b)) проверяется на наличие
 *     объявлений, а не на итоговый цвет.
 *   - Объявление внутри блока компонента (`.card { --gap: 1rem }`) считается
 *     объявлением. Это законный приём, а не тема; отдельная проверка «токен
 *     объявлен вне тем» здесь не делается — она дала бы шум на всех
 *     компонентных переменных.
 *   - Файл с синтаксической ошибкой парсер разбирает частично, поэтому пока
 *     чужой файл правится, имя из сломанного участка может потеряться. Это
 *     даёт ложную тревогу, а не пропуск: направление отказа безопасное.
 *
 * ДОБАВЛЕНО 28.07.2026 — ПРОВЕРКА ОХРАНЯЛА СЛУЧАЙ, КОТОРОГО В ДЕРЕВЕ НЕТ.
 *   Правило выше считает `var(--x, запас)` закрытием вхождения. Для СВЕТЛОЙ темы
 *   это верно. Но если имя не объявлено НИГДЕ, запас рисуется во ВСЕХ трёх темах,
 *   и светлый hex-запас — это светлая плита в тёмной и ночной теме.
 *   Замерено в живом браузере: `.settings-advanced-toggle` в main.css стоит как
 *   `background: var(--surface-alt, #f8fafc)`, --surface-alt не был объявлен
 *   нигде, а текст брался из --text-primary ночной темы (#f1e8dd). Итог —
 *   контраст 1.16:1 на заголовке блока «Доступ к защищенным настройкам».
 *   Первое правило при этом молчало: запас на месте. То есть проверка охраняла
 *   случай «имя без запаса» (таких в дереве было 0) и пропускала тот, который
 *   есть.
 *   Второе правило ниже разбирает запас как цвет и считает относительную яркость
 *   по той же формуле WCAG, что и контраст. Красным становится только доказуемый
 *   случай: имя не объявлено нигде И запас — светлый цвет. Обратный случай
 *   (тёмный запас, ломающий светлую тему) печатается отдельным списком без
 *   провала: он реален, но в замерах не подтверждён ни одним экраном, а гейт,
 *   красный без доказательства, отключают целиком.
 *
 * ИСПРАВЛЕНО 29.07.2026 — ПРОВЕРКА ОБРЫВАЛА СВОЙ ЖЕ ОТЧЁТ НА ПОЛУСЛОВЕ.
 *   Проверка устаревшей записи долга стояла ПЕРЕД всеми списками нарушений и
 *   выходила из процесса сама: `process.exit(1)` до печати имён. Поэтому на любом
 *   дереве, где имя из списка долга не встречается, человек получал одну строку
 *   про бухгалтерию списка — и НИ ОДНОГО настоящего нарушения, хотя сводка выше
 *   их уже посчитала. В боевом репозитории это срабатывало бы в первый же день,
 *   когда кто-то честно закроет `--violet-50`: гейт краснеет, называет причиной
 *   список долга, а список пропавшего текста и прозрачных плашек не печатает
 *   вовсе. Это ровно тот отчёт, по которому идут чинить не то.
 *
 *   Найдено самопроверкой `scripts/tests/check-css-tokens.test.mjs`: 4 падения из
 *   5, и во всех четырёх сводка проверки была ВЕРНОЙ, а не хватало только списка
 *   имён после неё. То есть разборщик из пунктов A и B выше исправен, а красной
 *   проверку делал этот обрыв. Пятый тест проходил по случайности: он сверял лишь
 *   код возврата, и `1` от обрыва совпал с ожидаемой `1` от нарушения.
 *
 *   ЗАПИСЬ ДОЛГА ТЕПЕРЬ НАЗЫВАЕТ МЕСТО, А НЕ ТОЛЬКО ЧИСЛО. Разрешение действует
 *   на пару «имя + файл», а не на имя вообще, и точность записи проверяется
 *   только если записанный файл есть в проверяемом дереве. Это строже прежнего в
 *   двух местах: то же имя со светлым запасом в ДРУГОМ файле больше не прикрыто,
 *   и запись, ставшая больше факта (закрыли одно вхождение из двух), краснеет —
 *   прежнее правило требовало исчезновения имени целиком. И заодно проверку стало
 *   возможно прогнать на дереве-фикстуре, где боевых файлов нет: до этого любая
 *   фикстура падала на чужой бухгалтерии, поэтому самопроверку никто не запускал.
 *
 * Запуск:  node scripts/check-css-tokens.mjs
 * Код возврата 1, если найдено хоть одно вхождение, — годится для pre-commit и CI.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const webSrc = join(repoRoot, "apps/web/src");
/** Область, ради которой проверка написана; остальное тоже проверяется, но помечается отдельно. */
const PRIMARY_SCOPE = "apps/web/src/styles/";

const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".vite"]);

/**
 * Объявление кастомного свойства стоит только в начале declaration: после `{`,
 * после `;`, после `}` вложенного правила или в начале файла. Привязка
 * обязательна — без неё выражение матчит `.block--элемент:hover` (см. пункт A
 * в шапке). Флаг `m` не нужен: перевод строки покрыт `\s*` после привязки, а
 * селектор, начинающийся с `--`, в CSS невозможен.
 */
const CSS_DECLARATION = /(?:^|[{;}])\s*(--[\w-]+)\s*:/g;
const CSS_AT_PROPERTY = /@property\s+(--[\w-]+)/g;
const CSS_VAR_USE = /\bvar\(\s*(--[\w-]+)/g;

function* walk(directory, extensions) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			yield* walk(join(directory, entry.name), extensions);
			continue;
		}
		if (!entry.isFile()) continue;
		if (extensions.some((extension) => entry.name.endsWith(extension))) yield join(directory, entry.name);
	}
}

const asRepoPath = (filePath) => relative(repoRoot, filePath).replaceAll("\\", "/");

/**
 * Вырезает /* ... *​/ , сохраняя смещения: каждый вырезанный символ заменяется
 * пробелом, переводы строк остаются на местах. Так номера строк не сдвигаются,
 * и содержимое комментария не может подделать привязку объявления.
 */
function blankComments(source) {
	let result = "";
	let index = 0;
	while (index < source.length) {
		const start = source.indexOf("/*", index);
		if (start < 0) {
			result += source.slice(index);
			break;
		}
		result += source.slice(index, start);
		let end = source.indexOf("*/", start + 2);
		if (end < 0) end = source.length;
		else end += 2;
		for (const character of source.slice(start, end)) result += character === "\n" ? "\n" : " ";
		index = end;
	}
	return result;
}

/** Смещение -> номер строки (1-based). */
function lineIndex(source) {
	const starts = [0];
	for (let i = 0; i < source.length; i++) if (source[i] === "\n") starts.push(i + 1);
	return (offset) => {
		let low = 0;
		let high = starts.length - 1;
		while (low < high) {
			const middle = (low + high + 1) >> 1;
			if (starts[middle] <= offset) low = middle;
			else high = middle - 1;
		}
		return low + 1;
	};
}

/**
 * Есть ли у ЭТОГО var() запасное значение: запятая на верхнем уровне внутри
 * его собственных скобок. Вложенные var(--a, var(--b)) считаются отдельно.
 */
function hasFallbackAt(source, openParenIndex) {
	let depth = 0;
	for (let i = openParenIndex; i < source.length; i++) {
		const character = source[i];
		if (character === "(") depth += 1;
		else if (character === ")") {
			depth -= 1;
			if (depth === 0) return false;
		} else if (character === "," && depth === 1) return true;
	}
	return false;
}

/**
 * Текст запаса ЭТОГО var(): всё после запятой верхнего уровня до своей
 * закрывающей скобки. Возвращает null, если запаса нет.
 */
function fallbackTextAt(source, openParenIndex) {
	let depth = 0;
	let commaIndex = -1;
	for (let i = openParenIndex; i < source.length; i++) {
		const character = source[i];
		if (character === "(") depth += 1;
		else if (character === ")") {
			depth -= 1;
			if (depth === 0) return commaIndex < 0 ? null : source.slice(commaIndex + 1, i).trim();
		} else if (character === "," && depth === 1 && commaIndex < 0) commaIndex = i;
	}
	return null;
}

/** Один канал sRGB 0..1 -> линейное значение по WCAG 2.x. */
const linearizeChannel = (channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

/**
 * Относительная яркость цветового литерала по WCAG 2.x, либо null, если это не
 * цвет (переменная, градиент, размер, ключевое слово вроде transparent).
 * Разбираются формы, которые реально стоят запасом в этом дереве: #rgb, #rrggbb,
 * #rrggbbaa, rgb()/rgba() и два имени — white и black.
 */
function relativeLuminance(value) {
	const text = value.toLowerCase().trim();
	if (text === "white") return 1;
	if (text === "black") return 0;
	let channels = null;
	const hex = /^#([0-9a-f]{3,8})$/.exec(text);
	if (hex) {
		const digits = hex[1];
		if (digits.length === 3 || digits.length === 4) {
			channels = [0, 1, 2].map((i) => Number.parseInt(digits[i] + digits[i], 16));
		} else if (digits.length === 6 || digits.length === 8) {
			channels = [0, 2, 4].map((i) => Number.parseInt(digits.slice(i, i + 2), 16));
		}
	} else {
		const rgb = /^rgba?\(([^)]*)\)$/.exec(text);
		if (rgb) {
			const parts = rgb[1].split(/[,\s/]+/).filter(Boolean).slice(0, 3);
			if (parts.length === 3 && parts.every((part) => /^[\d.]+%?$/.test(part))) {
				channels = parts.map((part) =>
					part.endsWith("%") ? (Number.parseFloat(part) * 255) / 100 : Number.parseFloat(part),
				);
			}
		}
	}
	if (!channels || channels.some((channel) => !Number.isFinite(channel))) return null;
	const [red, green, blue] = channels.map((channel) => linearizeChannel(channel / 255));
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * Порог «светлого» запаса. 0.5 относительной яркости — это примерно #bcbcbc:
 * всё выше заведомо читается как светлая плашка, а не как поверхность тёмной
 * темы. Порог сознательно грубый: задача правила — не оценивать оттенок, а
 * поймать светлый литерал, который рисуется во всех трёх темах.
 */
const LIGHT_FALLBACK_LUMINANCE = 0.5;

/**
 * ИЗВЕСТНЫЙ ДОЛГ, ПОСЧИТАННЫЙ ПОШТУЧНО. Ключ — имя, значение — СКОЛЬКО вхождений
 * со светлым запасом разрешено и В КАКОМ файле. Ровно столько и ровно там;
 * появится ещё одно, или то же имя всплывёт в другом файле — гейт краснеет.
 * Так долг зафиксирован в коде, а не в отчёте, и не может тихо расти.
 *
 * ПОЧЕМУ В ЗАПИСИ ЕСТЬ ФАЙЛ. Без него разрешение действовало на имя вообще:
 * закрыв `--violet-50` в main.css и заведя его же со светлым запасом в другом
 * файле, нарушение проходило молча под чужой записью долга. И точность записи
 * проверялась только по полному исчезновению имени, поэтому «закрыли одно
 * вхождение из двух» тоже проходило. Теперь сверяется число в названном файле.
 *
 * Это КАТЕГОРИАЛЬНЫЕ ЛЕСТНИЦЫ ОТТЕНКОВ, а не поверхности. Оттенок здесь несёт
 * смысл: .chip-assistant фиолет = ассистент.
 *
 * Здесь стоял ещё довод, что свести чипы к семантическим парам нельзя, иначе
 * «четыре категории станут одного цвета». Довод неверен: .chip-reason,
 * .chip-doctor и .chip-chair переведены на ТРИ РАЗНЫЕ пары
 * (--info-bg/--info-fg, --teal-surface/--teal-dark, --warn-bg/--warn-fg),
 * различие оттенком сохранилось, а плашки перестали быть белыми пятнами в
 * тёмных темах (было 15.97-17.22 против --paper, стало 1.15-1.35). Их имена
 * убраны из списка — гейт сам это и потребовал, когда они исчезли из дерева.
 * Остаётся .chip-assistant: у него нет своей семантической пары «ассистент», и
 * правильное закрытие — лестница 50/200/700 для фиолета в тёмной и ночной теме;
 * отдельная задача. Долг named, а не спрятан.
 */
const KNOWN_LIGHT_FALLBACK_DEBT = new Map([
	["--violet-50", { occurrences: 1, file: "apps/web/src/styles/main.css" }],
	["--violet-200", { occurrences: 1, file: "apps/web/src/styles/main.css" }],
]);

/** Строковый литерал с именем кастомного свойства -> само имя, иначе null. */
function customPropertyLiteral(node) {
	if (!node) return null;
	if (!ts.isStringLiteral(node) && !ts.isNoSubstitutionTemplateLiteral(node)) return null;
	return node.text.startsWith("--") ? node.text : null;
}

/**
 * Имена, которые код выставляет из JS. Разбор идёт по дереву TypeScript, а не
 * текстом: комментарии для парсера — trivia, поэтому закомментированный код
 * физически не может пометить имя объявленным. Учитываются три позиции:
 *   { "--x": value }          — ключ инлайнового стиля (и вычисляемый ["--x"]);
 *   { "--x": string }         — то же поле в типе стиля (CSSProperties & {...});
 *   el.style.setProperty("--x", …).
 */
function collectJsCustomProperties(filePath, source) {
	const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
	const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, false, scriptKind);
	const names = new Set();
	const visit = (node) => {
		if (ts.isPropertyAssignment(node) || ts.isPropertySignature(node)) {
			const key = ts.isComputedPropertyName(node.name) ? node.name.expression : node.name;
			const name = customPropertyLiteral(key);
			if (name) names.add(name);
		} else if (ts.isCallExpression(node)) {
			const callee = node.expression;
			const isSetProperty =
				(ts.isPropertyAccessExpression(callee) && callee.name.text === "setProperty") ||
				(ts.isIdentifier(callee) && callee.text === "setProperty");
			if (isSetProperty) {
				const name = customPropertyLiteral(node.arguments[0]);
				if (name) names.add(name);
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(sourceFile, visit);
	return names;
}

const cssFiles = [...walk(webSrc, [".css"])];

// 1. Объявления: обычные `--x:` в позиции declaration и `@property --x`.
const definedInCss = new Map(); // имя -> файлы, где объявлено
for (const filePath of cssFiles) {
	const source = blankComments(readFileSync(filePath, "utf8"));
	for (const pattern of [CSS_DECLARATION, CSS_AT_PROPERTY]) {
		for (const match of source.matchAll(pattern)) {
			if (!definedInCss.has(match[1])) definedInCss.set(match[1], new Set());
			definedInCss.get(match[1]).add(asRepoPath(filePath));
		}
	}
}

// 2. Имена, которые выставляет JS: style.setProperty("--x", …) и инлайновые
//    стили { "--x": … }. Без этого они дали бы ложную тревогу.
const definedInJs = new Set();
for (const filePath of walk(webSrc, [".ts", ".tsx"])) {
	for (const name of collectJsCustomProperties(filePath, readFileSync(filePath, "utf8"))) definedInJs.add(name);
}

// 3. Использования: каждое var() отдельно, с местом и признаком запаса.
const offenders = new Map(); // имя -> [{file, line}]
/** Правило 2: имя не объявлено нигде, а запас — СВЕТЛЫЙ цвет (виден во всех темах). */
const lightFallbacks = new Map(); // имя -> [{file, line, fallback}]
/** То же с тёмным запасом: ломает светлую тему. Печатается, но не валит гейт. */
const darkFallbacks = new Map();
let totalUses = 0;
let usesWithFallback = 0;
const usedNames = new Set();

for (const filePath of cssFiles) {
	const raw = readFileSync(filePath, "utf8");
	const source = blankComments(raw);
	const toLine = lineIndex(source);
	const repoPath = asRepoPath(filePath);
	for (const match of source.matchAll(CSS_VAR_USE)) {
		const name = match[1];
		totalUses += 1;
		usedNames.add(name);
		const openParen = source.indexOf("(", match.index);
		const isDeclared = definedInCss.has(name) || definedInJs.has(name);
		if (hasFallbackAt(source, openParen)) {
			usesWithFallback += 1;
			// Запас спасает только пока имя объявлено хоть где-то: иначе он
			// рисуется во всех трёх темах, и его цвет — это цвет во всех темах.
			if (isDeclared) continue;
			const fallback = fallbackTextAt(source, openParen);
			const luminance = fallback === null ? null : relativeLuminance(fallback);
			if (luminance === null) continue;
			const bucket = luminance > LIGHT_FALLBACK_LUMINANCE ? lightFallbacks : darkFallbacks;
			if (!bucket.has(name)) bucket.set(name, []);
			bucket.get(name).push({ file: repoPath, line: toLine(match.index), fallback });
			continue;
		}
		if (isDeclared) continue;
		if (!offenders.has(name)) offenders.set(name, []);
		offenders.get(name).push({ file: repoPath, line: toLine(match.index) });
	}
}

const rank = (entries) => [...entries].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
const count = (ranked) => ranked.reduce((sum, [, places]) => sum + places.length, 0);

const ranked = rank(offenders.entries());
const occurrences = count(ranked);
const inPrimaryScope = ranked.filter(([, places]) => places.some((place) => place.file.startsWith(PRIMARY_SCOPE)));
const rankedDark = rank(darkFallbacks.entries());

/** Какие css-файлы дерево вообще содержит: по этому и решается, применима ли запись долга. */
const scannedCssPaths = new Set(cssFiles.map(asRepoPath));

/** Сколько вхождений разрешено ЭТОМУ имени в ЭТОМ файле. Чужой файл — ноль. */
function allowanceFor(name, file) {
	const entry = KNOWN_LIGHT_FALLBACK_DEBT.get(name);
	return entry && entry.file === file ? entry.occurrences : 0;
}

/**
 * Светлый запас минус разрешение, по каждому файлу отдельно. Разрешение гасит
 * ровно столько вхождений, сколько записано, и только в записанном файле;
 * остальные попадают в список нарушений поимённо и с местом.
 */
const lightOverAllowance = new Map();
for (const [name, places] of lightFallbacks) {
	const byFile = new Map();
	for (const place of places) {
		if (!byFile.has(place.file)) byFile.set(place.file, []);
		byFile.get(place.file).push(place);
	}
	const excess = [];
	for (const [file, filePlaces] of byFile) excess.push(...filePlaces.slice(allowanceFor(name, file)));
	if (excess.length > 0) lightOverAllowance.set(name, excess);
}
const rankedLight = rank(lightOverAllowance.entries());

/** Что каждая запись долга разрешает и что на самом деле лежит в названном ею файле. */
const debtLedger = [...KNOWN_LIGHT_FALLBACK_DEBT.entries()].map(([name, entry]) => ({
	name,
	file: entry.file,
	recorded: entry.occurrences,
	actual: (lightFallbacks.get(name) ?? []).filter((place) => place.file === entry.file).length,
}));
const debtNames = debtLedger.filter((row) => row.actual > 0).map((row) => row.name);
const debtOccurrences = debtLedger.reduce((sum, row) => sum + Math.min(row.actual, row.recorded), 0);

/**
 * Запись долга разошлась с деревом — список пора править, иначе он прикроет
 * следующее нарушение под тем же именем.
 *
 * СВЕРЯЕТСЯ ТОЛЬКО ТАМ, ГДЕ НАЗВАННЫЙ ФАЙЛ ЕСТЬ. Дерево без этого файла — не
 * «долг закрыт», а «запись к этому дереву не относится»: так проверку можно
 * прогнать на фикстуре, не таща в неё боевую бухгалтерию. Прикрыть настоящее
 * нарушение это не может — разрешение всё равно действует только на пару
 * «имя + файл», которой в таком дереве нет.
 */
const staleDebt = debtLedger
	.filter((row) => scannedCssPaths.has(row.file) && row.actual !== row.recorded)
	.map((row) => `${row.name} (${row.file}: записано ${row.recorded}, в дереве ${row.actual})`);

console.log(`css-файлов проверено:            ${cssFiles.length}`);
console.log(`объявлено переменных в css:      ${definedInCss.size}`);
console.log(`имён выставляется из js:         ${definedInJs.size}`);
console.log(`использований var():             ${totalUses} (из них с запасом: ${usesWithFallback})`);
console.log(`имён использовано через var():   ${usedNames.size}`);
console.log(`НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ:  ${ranked.length} имён, ${occurrences} вхождений`);
console.log(`  из них затрагивают ${PRIMARY_SCOPE}: ${inPrimaryScope.length} имён`);
console.log(`СВЕТЛЫЙ ЗАПАС ВО ВСЕХ ТЕМАХ:     ${rankedLight.length} имён, ${count(rankedLight)} вхождений`);
console.log(`  известный долг (лестницы оттенков): ${debtNames.length} имён, ${debtOccurrences} вхождений`);
console.log(`тёмный запас во всех темах:      ${rankedDark.length} имён, ${count(rankedDark)} вхождений (не валит гейт)`);

if (rankedDark.length > 0) {
	console.log("\nИмя не объявлено нигде, запас ТЁМНЫЙ — светлая тема получит тёмную плашку:");
	for (const [name, places] of rankedDark) {
		console.log(`  ${String(places.length).padStart(3)}x  ${name}`);
		for (const place of places) console.log(`         ${place.file}:${place.line}  запас ${place.fallback}`);
	}
}

/*
 * ПОРЯДОК ПЕЧАТИ — ЧАСТЬ КОНТРАКТА, А НЕ ОФОРМЛЕНИЕ.
 *
 * Раньше блок устаревшего долга стоял ВЫШЕ и выходил из процесса сам, поэтому
 * отчёт обрывался на бухгалтерии списка и ни одного настоящего нарушения человек
 * не видел. Теперь из процесса выходят один раз, в самом низу, и печатается всё
 * найденное: сначала нарушения, потом расхождения списка долга. Ни один список
 * больше не может съесть остальные.
 */
if (ranked.length > 0) {
	console.error("\nНеизвестные имена в var() без запасного значения:\n");
	for (const [name, places] of ranked) {
		console.error(`  ${String(places.length).padStart(3)}x  ${name}`);
		for (const place of places) console.error(`         ${place.file}:${place.line}`);
	}
}

if (rankedLight.length > 0) {
	console.error("\nИмя не объявлено нигде, запас СВЕТЛЫЙ — в тёмной и ночной теме это светлая плита:\n");
	for (const [name, places] of rankedLight) {
		console.error(`  ${String(places.length).padStart(3)}x  ${name}`);
		for (const place of places) console.error(`         ${place.file}:${place.line}  запас ${place.fallback}`);
	}
}

if (staleDebt.length > 0) {
	console.error(
		`\nЗапись известного долга разошлась с деревом: ${staleDebt.join("; ")}.\n` +
			"Привести KNOWN_LIGHT_FALLBACK_DEBT к факту — запись, разрешающая больше,\n" +
			"чем в дереве есть, прикроет следующее нарушение под тем же именем и в том же файле.",
	);
}

if (ranked.length > 0 || rankedLight.length > 0) {
	console.error(
		"\nКак закрывать. Объявить токен в канонической палитре\n" +
			"  apps/web/src/styles/dente-redesign.css — блоки :root/[data-theme=\"light\"],\n" +
			"  [data-theme=\"dark\"], [data-theme=\"night\"], чтобы значение было во всех трёх темах,\n" +
			"или псевдонимом к существующему токену в apps/web/src/styles/token-aliases.css,\n" +
			"либо, если имя лишнее, заменить его на существующий токен по месту использования.\n" +
			"Запас `var(--x, значение)` закрывает конкретное вхождение, но не остальные:\n" +
			"проверка считает запас по каждому месту отдельно, потому что так работает и CSS.\n" +
			"И запас НЕ закрывает имя, не объявленное нигде: он рисуется во всех трёх темах,\n" +
			"поэтому светлый литерал в запасе — это светлая плита в тёмной и ночной теме.\n" +
			"Зашивать hex по месту использования нельзя — темы разъедутся (см. .agents/UI_STANDARDS.md).",
	);
}

/*
 * ЕДИНСТВЕННЫЙ ВЫХОД ИЗ ПРОЦЕССА. Все три причины провала уже напечатаны выше,
 * поэтому здесь остаётся только сложить их: молчаливого `exit` посреди отчёта в
 * этом файле больше нет.
 */
if (ranked.length === 0 && rankedLight.length === 0 && staleDebt.length === 0) {
	console.log("\nВсе var() разрешаются: каждое имя объявлено, либо его запас не светлый литерал.");
	process.exit(0);
}
process.exit(1);
