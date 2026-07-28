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
 * ИЗВЕСТНЫЙ ДОЛГ, ПОСЧИТАННЫЙ ПОШТУЧНО. Ключ — имя, значение — сколько вхождений
 * со светлым запасом разрешено. Ровно столько; появится ещё одно — гейт краснеет.
 * Так долг зафиксирован в коде, а не в отчёте, и не может тихо расти.
 *
 * Это КАТЕГОРИАЛЬНЫЕ ЛЕСТНИЦЫ ОТТЕНКОВ, а не поверхности. Оттенок здесь несёт
 * смысл: .chip-reason индиго = причина визита, .chip-doctor бирюза = врач,
 * .chip-chair янтарь = кабинет, .chip-assistant фиолет = ассистент
 * (main.css:15800-15813, 16716-16719). Свести их к семантическим парам
 * --ok/--warn/--info нельзя — четыре категории станут одного цвета, и полоса
 * чипов перестанет читаться взглядом. Правильное закрытие — своя лестница 50/200/700
 * для каждого оттенка в тёмной и ночной теме, то есть расширение палитры на 12
 * значений; отдельная задача. Ни один из этих чипов не фигурирует в замерах
 * контраста разведки от 28.07.2026, поэтому спешки нет, а вслепую менять цвет,
 * которым различают категории, хуже, чем оставить долг named.
 */
const KNOWN_LIGHT_FALLBACK_DEBT = new Map([
	["--amber-50", 3],
	["--amber-200", 2],
	["--indigo-50", 1],
	["--indigo-200", 1],
	["--teal-50", 1],
	["--teal-200", 1],
	["--violet-50", 1],
	["--violet-200", 1],
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
/** Долг вычитается по счёту, а не по имени: лишнее вхождение того же имени всё равно краснеет. */
const rankedLight = rank(lightFallbacks.entries()).filter(
	([name, places]) => places.length > (KNOWN_LIGHT_FALLBACK_DEBT.get(name) ?? 0),
);
const debtNames = [...lightFallbacks.keys()].filter((name) => KNOWN_LIGHT_FALLBACK_DEBT.has(name));
const debtOccurrences = debtNames.reduce((sum, name) => sum + lightFallbacks.get(name).length, 0);
/** Имя из списка долга исчезло из дерева — список пора чистить, иначе он прикроет новое нарушение. */
const staleDebt = [...KNOWN_LIGHT_FALLBACK_DEBT.keys()].filter((name) => !lightFallbacks.has(name));

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

if (staleDebt.length > 0) {
	console.error(
		`\nСписок известного долга устарел: ${staleDebt.join(", ")} больше не встречается со светлым запасом.\n` +
			"Убрать имя из KNOWN_LIGHT_FALLBACK_DEBT — иначе оно прикроет следующее нарушение под тем же именем.",
	);
	process.exit(1);
}

if (rankedDark.length > 0) {
	console.log("\nИмя не объявлено нигде, запас ТЁМНЫЙ — светлая тема получит тёмную плашку:");
	for (const [name, places] of rankedDark) {
		console.log(`  ${String(places.length).padStart(3)}x  ${name}`);
		for (const place of places) console.log(`         ${place.file}:${place.line}  запас ${place.fallback}`);
	}
}

if (ranked.length === 0 && rankedLight.length === 0) {
	console.log("\nВсе var() разрешаются: каждое имя объявлено, либо его запас не светлый литерал.");
	process.exit(0);
}

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
process.exit(1);
