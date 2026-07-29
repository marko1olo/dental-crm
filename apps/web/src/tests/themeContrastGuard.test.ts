/**
 * Отношения контраста, названные в комментариях к правкам, пересчитываются здесь
 * из живого CSS — чтобы комментарий не мог разойтись с тем, что покажет браузер.
 *
 * ЧТО БЫЛО СЛОМАНО. Комментарии к контрастным правкам в main.css и
 * contrast-fixes.css печатали отношения WCAG, посчитанные по палитре, которая
 * проигрывает каскад. Светлые и тёмные значения брались из
 * dente-redesign.css:11/67 со специфичностью (0,1,0), тогда как main.css:66/126
 * объявляет те же имена селектором :root[data-theme="..."] со специфичностью
 * (0,2,0) и выигрывает независимо от порядка импорта. Так у
 * .onboarding-compact-strip span в комментарии стояло 4.63 при фактических 4.48,
 * то есть было написано, что норма 4.5 взята, хотя она не взята. Комментарий с
 * недостижимым числом хуже отсутствующего: следующий разработчик ему поверит.
 *
 * ЧЕГО НЕ ВИДИТ scripts/check-css-tokens.mjs. Тот гейт разбирает только
 * конструкции var() и их запасы. Голое `background: #fef2f2` не попадает ни в
 * одну его корзину — литерал без var() для него не существует. Поэтому проверка
 * литералов ниже смотрит на объявления напрямую, а не через var().
 *
 * НАЗВАНИЯ ТЕМ В ЭТОМ ПРОДУКТЕ ПЕРЕВЁРНУТЫ (workspaceShell.tsx:462):
 * «Ночь» — это data-theme="dark", «Тепло» — data-theme="night". Именно так
 * стилизуют не ту тему, поэтому здесь везде используется значение атрибута.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Theme = "light" | "dark" | "night";
const THEMES: readonly Theme[] = ["light", "dark", "night"];

/** Вырезает комментарии, сохраняя переводы строк: внутри есть и скобки, и примеры var(). */
function blankComments(source: string): string {
	let result = "";
	let index = 0;
	while (index < source.length) {
		const start = source.indexOf("/*", index);
		if (start < 0) {
			result += source.slice(index);
			break;
		}
		result += source.slice(index, start);
		const closing = source.indexOf("*/", start + 2);
		const end = closing < 0 ? source.length : closing + 2;
		for (const character of source.slice(start, end)) result += character === "\n" ? "\n" : " ";
		index = end;
	}
	return result;
}

type Rule = { readonly selectors: string[]; readonly body: string; readonly line: number };

/** Плоский разбор `селекторы { тело }`. Внутренние блоки @media разбираются как обычные правила. */
function parseRules(css: string): Rule[] {
	const source = blankComments(css);
	const rules: Rule[] = [];
	for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const [, selectorList, body] = match;
		if (selectorList === undefined || body === undefined) continue;
		const selectors = selectorList
			.split(",")
			.map((selector) => selector.trim())
			.filter(Boolean);
		const line = source.slice(0, match.index ?? 0).split("\n").length;
		rules.push({ selectors, body, line });
	}
	return rules;
}

/** Порядок листов берётся из main.tsx, а не из списка в тесте: иначе тест разойдётся со сборкой. */
function importedStylesheets(): string[] {
	const entry = readFileSync(path.join(webSrc, "main.tsx"), "utf8");
	return [...entry.matchAll(/import\s+"\.\/styles\/([\w.-]+\.css)"/g)].map((match) => {
		const file = match[1];
		if (file === undefined) throw new Error("имя листа не разобрано");
		return file;
	});
}

const STYLESHEETS = importedStylesheets();
/** Разбор делается один раз: 12 листов на каждый поиск токена — это минуты вместо секунд. */
const rulesOf = new Map(
	STYLESHEETS.map((file) => [file, parseRules(readFileSync(path.join(webSrc, "styles", file), "utf8"))] as const),
);

/** Только корневые селекторы палитры: html, :root, .класс, [атрибут] и их сцепки. */
const ROOT_SELECTOR = /^(?:html|:root|\.[\w-]+|\[[^\]]*\])+$/;

type Specificity = readonly [number, number];

function rootSelectorMatch(selector: string, theme: Theme): Specificity | null {
	if (!ROOT_SELECTOR.test(selector)) return null;
	let specificity: Specificity = [0, 0];
	for (const part of selector.match(/html|:root|\.[\w-]+|\[[^\]]*\]/g) ?? []) {
		if (part === "html") {
			specificity = [specificity[0], specificity[1] + 1];
			continue;
		}
		if (part === ":root") {
			specificity = [specificity[0] + 1, specificity[1]];
			continue;
		}
		if (part.startsWith(".")) {
			// Класс темы на <html> ставит ThemeController; здесь считается только атрибут,
			// поэтому любой класс делает селектор неподходящим для чистого состояния темы.
			return null;
		}
		const attribute = /^\[data-theme=["']?([\w-]+)["']?\]$/.exec(part);
		if (!attribute || attribute[1] !== theme) return null;
		specificity = [specificity[0] + 1, specificity[1]];
	}
	return specificity;
}

type TokenDeclaration = { readonly selectors: readonly string[]; readonly value: string; readonly order: number };

/** Индекс «имя токена -> все его объявления в порядке каскада» строится один раз. */
const declarationsOf = ((): Map<string, TokenDeclaration[]> => {
	const index = new Map<string, TokenDeclaration[]>();
	let order = 0;
	for (const file of STYLESHEETS) {
		for (const rule of rulesOf.get(file) ?? []) {
			for (const declaration of rule.body.split(";")) {
				const colon = declaration.indexOf(":");
				if (colon < 0) continue;
				const name = declaration.slice(0, colon).trim();
				if (!name.startsWith("--")) continue;
				order += 1;
				const list = index.get(name) ?? [];
				list.push({ selectors: rule.selectors, value: declaration.slice(colon + 1).trim(), order });
				index.set(name, list);
			}
		}
	}
	return index;
})();

/** Значение токена, которое победит на <html> в этой теме, — так же, как решает браузер. */
function winningToken(token: string, theme: Theme): string | null {
	let best: { specificity: Specificity; order: number; value: string } | null = null;
	for (const declaration of declarationsOf.get(token) ?? []) {
		for (const selector of declaration.selectors) {
			const specificity = rootSelectorMatch(selector, theme);
			if (specificity === null) continue;
			const stronger =
				best === null ||
				specificity[0] > best.specificity[0] ||
				(specificity[0] === best.specificity[0] &&
					(specificity[1] > best.specificity[1] ||
						(specificity[1] === best.specificity[1] && declaration.order >= best.order)));
			if (stronger) best = { specificity, order: declaration.order, value: declaration.value };
		}
	}
	return best?.value ?? null;
}

type Rgba = { readonly r: number; readonly g: number; readonly b: number; readonly a: number };

function parseColor(value: string): Rgba {
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.[1];
	if (hex !== undefined) {
		const digits = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
		return {
			r: Number.parseInt(digits.slice(0, 2), 16),
			g: Number.parseInt(digits.slice(2, 4), 16),
			b: Number.parseInt(digits.slice(4, 6), 16),
			a: 1,
		};
	}
	const rgba = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(value.trim());
	if (!rgba) throw new Error(`цвет не разобран: «${value}»`);
	const [, r, g, b, a] = rgba;
	if (r === undefined || g === undefined || b === undefined) throw new Error(`цвет не разобран: «${value}»`);
	return { r: Number(r), g: Number(g), b: Number(b), a: a === undefined ? 1 : Number(a) };
}

/** Токен -> цвет темы. Одно звено var() разворачивается: --amber объявлен как var(--warn-fg). */
function colorOf(token: string, theme: Theme): Rgba {
	const raw = winningToken(token, theme);
	assert.ok(raw, `${token} не объявлен ни в одном листе для темы ${theme}`);
	const alias = /^var\(\s*(--[\w-]+)\s*\)$/.exec(raw);
	return parseColor(alias?.[1] === undefined ? raw : (winningToken(alias[1], theme) ?? raw));
}

function over(top: Rgba, bottom: Rgba): Rgba {
	return {
		r: top.a * top.r + (1 - top.a) * bottom.r,
		g: top.a * top.g + (1 - top.a) * bottom.g,
		b: top.a * top.b + (1 - top.a) * bottom.b,
		a: 1,
	};
}

const channel = (value: number): number => {
	const scaled = value / 255;
	return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const luminance = (color: Rgba): number =>
	0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);

function contrast(foreground: Rgba, background: Rgba): number {
	const [high, low] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
	if (high === undefined || low === undefined) throw new Error("яркость не посчитана");
	return (high + 0.05) / (low + 0.05);
}

/**
 * Отношения, названные в комментариях к правкам. Порядок значений — светлая,
 * «Ночь» (dark), «Тепло» (night). Подложка накладывается на --paper, потому что
 * все три плашки полупрозрачны в тёмных темах.
 *
 * Если палитра поменяется, тест упадёт с новым числом — и комментарий рядом с
 * правилом придётся пересчитать, а не оставить как есть.
 */
const MEASURED = [
	{ fg: ".onboarding-compact-strip strong", bg: ".onboarding-compact-strip", ratios: [16.69, 14.19, 12.81] },
	{ fg: ".onboarding-compact-strip span", bg: ".onboarding-compact-strip", ratios: [7.62, 8.64, 8.62] },
	{ fg: ".onboarding-compact-score", bg: ".onboarding-compact-score", ratios: [5.47, 7.17, 6.59] },
	// У .finance-due своего color нет: текст строки наследуется, и это тоже часть правки.
	{ fg: "--ink", bg: ".finance-due", ratios: [14.52, 13.89, 11.02] },
	{ fg: ".handoff-lock", bg: ".handoff-lock", ratios: [15.93, 12.89, 10.56] },
	{ fg: ".appointment-handoff-note", bg: ".appointment-handoff-note", ratios: [15.93, 12.89, 10.56] },
	{ fg: ".chip-reason", bg: ".chip-reason", ratios: [15.46, 13.24, 10.85] },
	{ fg: ".chip-doctor", bg: ".chip-doctor", ratios: [16.69, 14.19, 12.81] },
	{ fg: ".chip-chair", bg: ".chip-chair", ratios: [15.93, 12.89, 10.56] },
	// Подпись лежит на поверхности карточки, своей подложки у правила нет.
	{ fg: ".smart-field input:focus ~ label", bg: "--paper", ratios: [5.93, 8.33, 8.35] },
	/*
	 * Плашка состояния СОХРАНЕНИЯ карточки пациента (dente-redesign.css, раздел 8a).
	 * Она попала под охрану потому, что раньше брала класс из словаря статусов
	 * ПРИЁМА — .status-pill.status-confirmed: в светлой теме это --info-bg
	 * «справочно» вместо --ok-bg «успех», а в ночной, тёплой теме плашка была
	 * единственным холодным элементом экрана. Текст 11.5px, то есть норма AA для
	 * обычного текста — 4.5:1, а не 3:1 для крупного.
	 */
	{ fg: ".save-pill.save-pill-saving", bg: ".save-pill.save-pill-saving", ratios: [7.74, 11.73, 10.25] },
	// Текст здесь --ink, а не --warn-fg: штатная пара предупреждения даёт в светлой
	// теме 4.42 и норму не держит. Замер и причина — в комментарии рядом с правилом.
	{ fg: ".save-pill.save-pill-dirty", bg: ".save-pill.save-pill-dirty", ratios: [15.93, 12.89, 10.56] },
	{ fg: ".save-pill.save-pill-error", bg: ".save-pill.save-pill-error", ratios: [5.3, 5.26, 4.92] },
	{ fg: ".save-pill.save-pill-saved", bg: ".save-pill.save-pill-saved", ratios: [4.57, 7.72, 7.26] },
	/*
	 * Метка риска в строке пациента. До правки её четыре цвета были литералами и
	 * давали одно и то же отношение во всех трёх темах — 6.25 у «контроль» и 7.34 у
	 * «риск», — потому что от темы не зависели вовсе: подложка яркостью 0.830 стояла
	 * на бумаге яркостью 0.009 в обеих тёмных темах. Текст --ink, а не --warn-fg, по
	 * той же измеренной причине, что и у плашки сохранения: 4.42 в светлой теме.
	 */
	{
		fg: ".patient-row.risk-watch .patient-row-meta .patient-risk-label",
		bg: ".patient-row.risk-watch .patient-row-meta .patient-risk-label",
		ratios: [15.93, 12.89, 10.56],
	},
	{
		fg: ".patient-row.risk-high .patient-row-meta .patient-risk-label",
		bg: ".patient-row.risk-high .patient-row-meta .patient-risk-label",
		ratios: [14.52, 13.89, 11.02],
	},
] as const;

/**
 * Имя токена, которым правило реально красит свойство. Ключевой момент: цвета берутся
 * ИЗ ПРАВИЛА, а не из списка в тесте. Иначе подмена `var(--ink-2)` обратно на
 * `var(--muted)` в CSS не сдвинула бы ни одного числа здесь — тест был бы слепым
 * ровно так же, как scripts/check-css-tokens.mjs слеп к голым литералам.
 */
function tokenOfProperty(selector: string, properties: readonly string[]): string {
	// Берётся ПОСЛЕДНЕЕ объявление в порядке каскада, а не первое: у одного и того же
	// селектора бывает несколько правил, и при равной специфичности выигрывает позднее.
	// Так, .smart-field input:focus ~ label красится var(--brand-600) в main.css:16281 и
	// перекрывается var(--info-fg) в contrast-fixes.css:113 — только потому, что
	// contrast-fixes.css импортируется позже (main.tsx строка 21 против строки 9).
	let winner: string | null = null;
	for (const file of STYLESHEETS) {
		for (const rule of rulesOf.get(file) ?? []) {
			if (!rule.selectors.includes(selector)) continue;
			for (const declaration of rule.body.split(";")) {
				const colon = declaration.indexOf(":");
				if (colon < 0) continue;
				if (!properties.includes(declaration.slice(0, colon).trim())) continue;
				const token = /var\(\s*(--[\w-]+)/.exec(declaration.slice(colon + 1))?.[1];
				assert.ok(token, `${file}:${rule.line} ${selector} — ${declaration.trim()} красит не токеном`);
				winner = token;
			}
		}
	}
	assert.ok(winner, `не найдено правило «${selector}» со свойством ${properties.join("/")}`);
	return winner;
}

/** Явное имя токена пропускается как есть; селектор — разворачивается в токен правила. */
const resolveSide = (reference: string, properties: readonly string[]): string =>
	reference.startsWith("--") ? reference : tokenOfProperty(reference, properties);

/** Норма WCAG 1.4.3 AA для обычного текста. Все правила выше — 12-16px, крупными не считаются. */
const AA_NORMAL = 4.5;

describe("контраст правок считается по палитре, которая выигрывает каскад", () => {
	test("светлую и тёмную палитру задаёт main.css, а не dente-redesign.css", () => {
		// main.css:66/126 — это :root[data-theme="..."], (0,2,0); dente-redesign.css:11/67 — (0,1,0).
		// Пока это так, все цифры в комментариях считаются по main.css.
		assert.equal(winningToken("--muted", "light"), "#64748b", "светлый --muted сменил источник — цифры в комментариях устарели");
		assert.equal(winningToken("--muted", "dark"), "#94a3b8", "тёмный --muted сменил источник — цифры в комментариях устарели");
		assert.equal(winningToken("--paper", "light"), "#ffffff");
		assert.equal(winningToken("--paper", "dark"), "#0f172a");
		assert.equal(winningToken("--ink", "light"), "#111827");
		assert.equal(winningToken("--ink", "dark"), "#f8fafc");
		// В «Тепле» блока в main.css нет вовсе, поэтому побеждает dente-redesign.css:115.
		assert.equal(winningToken("--paper", "night"), "#1c1714");
		assert.equal(winningToken("--ink", "night"), "#f1e8dd");
	});

	test("каждое отношение из комментариев воспроизводится и держит норму 4.5", () => {
		for (const entry of MEASURED) {
			const what = entry.fg === entry.bg ? entry.fg : `${entry.fg} на ${entry.bg}`;
			const foreground = resolveSide(entry.fg, ["color"]);
			const background = resolveSide(entry.bg, ["background", "background-color"]);
			for (const [index, theme] of THEMES.entries()) {
				const expected = entry.ratios[index];
				if (expected === undefined) throw new Error(`нет ожидаемого значения для ${what} в теме ${theme}`);
				const paper = colorOf("--paper", theme);
				const actual = contrast(colorOf(foreground, theme), over(colorOf(background, theme), paper));
				assert.ok(
					Math.abs(actual - expected) < 0.02,
					`${what}, тема ${theme}: ${foreground} на ${background} даёт ${actual.toFixed(2)}, ` +
						`в комментарии ${expected.toFixed(2)} — пересчитать комментарий рядом с правилом`,
				);
				assert.ok(actual >= AA_NORMAL, `${what}, тема ${theme}: ${actual.toFixed(2)} ниже нормы AA ${AA_NORMAL}`);
			}
		}
	});

	test("--ink-2 остаётся тёмным в светлой теме и светлым в обеих тёмных", () => {
		// На нём держится закрытый остаточный промах полосы готовности (было 4.48 на --muted).
		assert.ok(luminance(colorOf("--ink-2", "light")) < 0.2, "--ink-2 посветлел: светлая полоса готовности снова недоберёт до 4.5");
		for (const theme of ["dark", "night"] as const) {
			assert.ok(luminance(colorOf("--ink-2", theme)) > 0.4, `--ink-2 потемнел в теме ${theme}`);
		}
	});
});

/** Правила, у которых цвет и подложка обязаны приходить из токенов, а не из литералов. */
const NO_LITERAL_SELECTORS = [
	".onboarding-compact-strip",
	".onboarding-compact-strip strong",
	".onboarding-compact-strip span",
	".onboarding-compact-score",
	".finance-due",
	".handoff-lock",
	".appointment-handoff-note",
	".chip-reason",
	".chip-doctor",
	".chip-chair",
	// Плашка сохранения карточки пациента: у неё своя палитра ровно для того, чтобы
	// не одалживать цвет у статусов приёма, и литерал здесь вернул бы её к тому же —
	// светлому пятну в тёмной и ночной темах.
	".save-pill",
	".save-pill.save-pill-saving",
	".save-pill.save-pill-dirty",
	".save-pill.save-pill-error",
	".save-pill.save-pill-saved",
	// Метка риска в строке пациента: держала четыре литерала и потому светилась в
	// обеих тёмных темах. Возврат литерала сюда — возврат того же светлого пятна.
	".patient-row.risk-watch .patient-row-meta .patient-risk-label",
	".patient-row.risk-high .patient-row-meta .patient-risk-label",
] as const;

const COLOR_PROPERTIES = new Set(["color", "background", "background-color", "border", "border-color", "border-left"]);

/**
 * СЕЛЕКТОР, ПРИВЕДЁННЫЙ К СРАВНИМОМУ ВИДУ.
 *
 * ЧТО ОБХОДИЛО ОХРАНУ. Сравнение шло по СТРОКЕ селектора на точное равенство,
 * поэтому те же классы в другом порядке давали другую строку и проходили молча.
 * Доказано приёмкой участка: рядом с охраняемым правилом дописали
 * `.risk-watch.patient-row .patient-row-meta .patient-risk-label` — та же
 * специфичность, позже в каскаде, значит выигрывает, — и все зашитые цвета
 * вернулись в силу при зелёной охране.
 *
 * Классы внутри каждого составного куска сортируются, пробелы сводятся к одному.
 */
function normalizeSelector(selector: string): string {
	return selector
		.trim()
		.split(/\s+/)
		.map((part) => {
			const classes = part.match(/\.[\w-]+/g);
			if (!classes || classes.length < 2) return part;
			const rest = part.replace(/\.[\w-]+/g, "");
			return [...classes].sort().join("") + rest;
		})
		.join(" ");
}

/**
 * ЛИТЕРАЛЬНЫЙ ЦВЕТ ЛЮБОЙ НОТАЦИИ, А НЕ ТОЛЬКО HEX И RGB.
 *
 * ЧТО ОБХОДИЛО ОХРАНУ. Искались только hex и rgb. Приёмка вписала в само
 * охраняемое правило `border-color: hsl(140 60% 45%)` — жёсткий цвет, от темы не
 * зависящий, — и проверка осталась зелёной. Именованные цвета (`wheat`, `tomato`)
 * проходили тем же путём.
 *
 * Список именованных не полон намеренно: он покрывает то, что встречается в
 * рукописном CSS, а забытое имя ловится вторым утверждением — «красит не токеном»
 * на измеряемых селекторах.
 */
const COLOR_FUNCTIONS = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i;
const NAMED_COLORS = /\b(white|black|red|green|blue|yellow|orange|purple|pink|brown|gray|grey|silver|gold|navy|teal|olive|maroon|lime|aqua|cyan|magenta|fuchsia|indigo|violet|beige|ivory|khaki|salmon|coral|tomato|wheat|orchid|plum|crimson|turquoise|lavender|azure|snow|linen|seashell|honeydew|mintcream|aliceblue|ghostwhite|whitesmoke|gainsboro|lightgray|lightgrey|darkgray|darkgrey|dimgray|dimgrey|slategray|slategrey)\b/i;

/** Литерал ли это. Ключевые слова, не задающие конкретный цвет, литералами не считаются. */
function looksLikeColorLiteral(value: string): boolean {
	const cleaned = value.replace(/\bvar\([^()]*\)/g, " ");
	if (/#[0-9a-f]{3,8}\b/i.test(cleaned)) return true;
	if (COLOR_FUNCTIONS.test(cleaned)) return true;
	return NAMED_COLORS.test(cleaned);
}


describe("тронутые правила не возвращают литералы", () => {
	test("ни в одном из них нет hex или rgb вне var()", () => {
		// scripts/check-css-tokens.mjs сюда не смотрит: он разбирает только var() и запасы,
		// поэтому голое `background: #fef2f2` в его корзины не попадает вообще.
		const wanted = new Set<string>(NO_LITERAL_SELECTORS.map(normalizeSelector));
		const seen = new Set<string>();
		for (const file of STYLESHEETS) {
			for (const rule of rulesOf.get(file) ?? []) {
				const hit = rule.selectors.filter((selector) => wanted.has(normalizeSelector(selector)));
				if (hit.length === 0) continue;
				for (const selector of hit) seen.add(selector);
				for (const declaration of rule.body.split(";")) {
					const colon = declaration.indexOf(":");
					if (colon < 0) continue;
					const property = declaration.slice(0, colon).trim();
					if (!COLOR_PROPERTIES.has(property)) continue;
					const value = declaration.slice(colon + 1);
					assert.ok(
						!looksLikeColorLiteral(value),
						`${file}:${rule.line} ${hit.join(", ")} — ${property} снова на литерале: «${declaration.trim()}»`,
					);
				}
			}
		}
		assert.deepEqual([...wanted].filter((selector) => !seen.has(selector)), [], "правило переименовано — охрана перестала его сторожить");
	});

	/*
	 * САМОПРОВЕРКА ОТ ОБХОДОВ, КОТОРЫЕ ПРИЁМКА ДОКАЗАЛА ЖИВЫМИ.
	 *
	 * Три случая ниже проходили охрану молча, пока она сверяла строку селектора и
	 * знала только hex и rgb: переставленные классы в селекторе, `hsl()` вместо
	 * `#hex`, именованный цвет. Без этой проверки любая правка выражений вернёт
	 * дыру, и заметить это будет нечем — сама охрана останется зелёной.
	 */
	test("охрана не обходится переставленными классами и другой нотацией цвета", () => {
		assert.equal(
			normalizeSelector(".risk-watch.patient-row .patient-row-meta .patient-risk-label"),
			normalizeSelector(".patient-row.risk-watch .patient-row-meta .patient-risk-label"),
			"те же классы в другом порядке дают другой ключ: правило можно перекрыть копией и остаться зелёным",
		);

		for (const literal of [
			"#fff",
			"#f4ead8",
			"rgb(255 0 0)",
			"rgba(0,0,0,.5)",
			"hsl(140 60% 45%)",
			"hsla(140, 60%, 45%, .5)",
			"oklch(0.7 0.1 200)",
			"color-mix(in srgb, red, blue)",
			"wheat",
			"tomato",
		]) {
			assert.ok(looksLikeColorLiteral(literal), `литерал «${literal}» не распознан — этой нотацией охрану обходят`);
		}

		for (const allowed of [
			"var(--teal)",
			"var(--ink, var(--teal))",
			"transparent",
			"currentColor",
			"inherit",
			"1px solid var(--line)",
			"0 0 0 1px var(--teal-ring)",
		]) {
			assert.ok(
				!looksLikeColorLiteral(allowed),
				`«${allowed}» принято за литерал — охрана начнёт краснеть на верном коде, а такую выключают`,
			);
		}
	});

	test("рамки не берут --teal-glow: у имени два разных типа", () => {
		// dente-redesign.css:26/81/129 — цвет, premium.css:19/65/111 — тень «0 0 20px rgba(...)».
		// Специфичность у обоих (0,1,0), решает только порядок импорта в main.tsx. При его смене
		// «border: 1px solid 0 0 30px rgba(...)» станет невалидным и рамка исчезнет целиком.
		for (const file of STYLESHEETS) {
			for (const rule of rulesOf.get(file) ?? []) {
				for (const declaration of rule.body.split(";")) {
					const colon = declaration.indexOf(":");
					if (colon < 0) continue;
					const property = declaration.slice(0, colon).trim();
					if (property !== "border" && !property.startsWith("border-")) continue;
					assert.ok(
						!declaration.includes("--teal-glow"),
						`${file}:${rule.line} ${rule.selectors.join(", ")} — рамка на --teal-glow: в premium.css это тень, а не цвет`,
					);
				}
			}
		}
	});
});

/**
 * Тёмных тем две, и «Ночь» — это data-theme="dark", а «Тепло» — data-theme="night".
 * Поправка, перечислившая только «dark», оставляет «Тепло» на светлом значении: именно
 * так возникли все четыре промаха, исправленные выше.
 *
 * Блоки палитры сюда не считаются: у них у каждой темы свой корневой блок, и «night»
 * в списке селекторов им не нужен. Считаются только ПОПРАВКИ — правила, где тёмная
 * тема задаёт обычные свойства конкретным элементам.
 *
 * Долг зафиксирован числом, а не словами: 36 таких поправок уже в дереве, они за
 * пределами этой правки и разбираются отдельно. Тридцать седьмая уронит тест.
 */
const DARK_WITHOUT_NIGHT_DEBT = 36;

describe("ни одна поправка на тёмную тему не забывает «Тепло»", () => {
	test('число правил [data-theme="dark"] без ночного плеча не растёт', () => {
		const lonely: string[] = [];
		for (const file of STYLESHEETS) {
			for (const rule of rulesOf.get(file) ?? []) {
				if (!rule.selectors.some((selector) => selector.includes('[data-theme="dark"]'))) continue;
				if (rule.selectors.some((selector) => selector.includes('[data-theme="night"]'))) continue;
				// Корневой блок без потомков — это сама палитра темы, а не поправка к элементу.
				// Признак: в селекторе нет пробела вне скобок, то есть нет вложенного элемента.
				const rootLevel = (selector: string): boolean =>
					!/\s/.test(selector.replaceAll(/\([^()]*\)/g, "").replaceAll(/\[[^\]]*\]/g, ""));
				if (rule.selectors.every(rootLevel)) continue;
				lonely.push(`${file}:${rule.line} ${rule.selectors.join(", ")}`);
			}
		}
		assert.ok(
			lonely.length <= DARK_WITHOUT_NIGHT_DEBT,
			`правил на [data-theme="dark"] без плеча [data-theme="night"]: ${lonely.length}, разрешено ${DARK_WITHOUT_NIGHT_DEBT}.\n` +
				`«Тепло» — это data-theme="night", и такие правила его не покрывают:\n${lonely.join("\n")}`,
		);
	});
});
