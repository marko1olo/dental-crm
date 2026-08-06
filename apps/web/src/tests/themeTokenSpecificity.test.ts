/**
 * Какое значение токена поверхности реально побеждает на <html> в каждой теме.
 *
 * ЧТО БЫЛО СЛОМАНО. В token-aliases.css тёмный блок объявлялся как
 * `[data-theme="dark"], html.dark`, а светлый — как
 * `:root, [data-theme="light"], html.light`. Селектор `html.dark` имеет
 * специфичность (0,1,1) и сильнее `[data-theme="light"]` (0,1,0). Поэтому если
 * атрибут говорит «светлая», а класс `dark` на <html> остался, светлая страница
 * получала ТЁМНЫЕ значения всех шести токенов файла.
 *
 * Так и было снято: в .dente-ops-shots/light_duplicateAlert_ПУСТО.png подсказка
 * strong.patient-next-action (PatientsView.tsx:293) залита #16211f — тёмным
 * значением --srf-chip-soft — при тексте var(--ink) = #111827. Чёрная плашка
 * вместо текста на белой карточке.
 *
 * ПОЧЕМУ ТЕСТ ТАКОЙ. Ни типы, ни сборка не считают специфичность, а глазами это
 * видно только на конкретном экране в конкретной теме. Поэтому здесь считается
 * то же, что считает браузер: какие селекторы блока подходят состоянию <html>,
 * какая у них специфичность, и кто побеждает при равной. Разбор намеренно
 * узкий — на незнакомой форме селектора он падает, а не пропускает её молча.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = path.join(webSrc, "styles/token-aliases.css");

/** Состояние корневого элемента: значение data-theme и классы на <html>. */
type RootState = {
	readonly theme: string | null;
	readonly classes: readonly string[];
};

type Specificity = readonly [number, number, number];

/** Вырезает комментарии, сохраняя переводы строк: в них есть и фигурные скобки, и примеры var(). */
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
		for (const character of source.slice(start, end))
			result += character === "\n" ? "\n" : " ";
		index = end;
	}
	return result;
}

/** Разбор одного составного селектора на части. Незнакомая форма — исключение. */
function parseCompound(selector: string): string[] {
	const parts: string[] = [];
	let index = 0;
	const text = selector.trim();
	while (index < text.length) {
		const rest = text.slice(index);
		const match =
			/^html\b/.exec(rest) ??
			/^:root\b/.exec(rest) ??
			/^:not\([^()]*\)/.exec(rest) ??
			/^\.[\w-]+/.exec(rest) ??
			/^\[[^\]]*\]/.exec(rest);
		if (!match)
			throw new Error(`селектор не разобран: «${selector}» на «${rest}»`);
		parts.push(match[0]);
		index += match[0].length;
	}
	if (parts.length === 0) throw new Error(`пустой селектор: «${selector}»`);
	return parts;
}

function matchesPart(part: string, state: RootState): boolean {
	if (part === "html" || part === ":root") return true;
	if (part.startsWith(":not("))
		return !matchesPart(part.slice(5, -1).trim(), state);
	if (part.startsWith(".")) return state.classes.includes(part.slice(1));
	const attribute = /^\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(part);
	if (!attribute) throw new Error(`часть селектора не разобрана: «${part}»`);
	if (attribute[1] !== "data-theme")
		throw new Error(`неожиданный атрибут: «${part}»`);
	return attribute[2] === undefined
		? state.theme !== null
		: state.theme === attribute[2];
}

function specificityOfPart(part: string): Specificity {
	if (part === "html") return [0, 0, 1];
	// :not() не добавляет ничего от себя — берётся специфичность самого сильного аргумента.
	if (part.startsWith(":not("))
		return specificityOfPart(part.slice(5, -1).trim());
	return [0, 1, 0]; // :root, класс, атрибут
}

function specificityOf(selector: string): Specificity {
	return parseCompound(selector).reduce<Specificity>(
		(total, part) => {
			const part_ = specificityOfPart(part);
			return [total[0] + part_[0], total[1] + part_[1], total[2] + part_[2]];
		},
		[0, 0, 0],
	);
}

function matchesSelector(selector: string, state: RootState): boolean {
	return parseCompound(selector).every((part) => matchesPart(part, state));
}

type Declaration = {
	readonly selectors: string[];
	readonly properties: Map<string, string>;
	readonly order: number;
};

/** Плоский разбор `селекторы { свойства }`. Вложенных правил в этом файле нет. */
function parseRules(css: string): Declaration[] {
	const rules: Declaration[] = [];
	const source = blankComments(css);
	const pattern = /([^{}]+)\{([^{}]*)\}/g;
	for (const match of source.matchAll(pattern)) {
		// Обе группы обязательны по самому шаблону; проверка нужна типам.
		const [, selectorList, body] = match;
		if (selectorList === undefined || body === undefined)
			throw new Error(`правило не разобрано: «${match[0]}»`);
		const selectors = selectorList
			.split(",")
			.map((selector) => selector.trim())
			.filter(Boolean);
		const properties = new Map<string, string>();
		for (const line of body.split(";")) {
			const colon = line.indexOf(":");
			if (colon < 0) continue;
			const name = line.slice(0, colon).trim();
			if (!name.startsWith("--")) continue;
			properties.set(name, line.slice(colon + 1).trim());
		}
		rules.push({ selectors, properties, order: rules.length });
	}
	return rules;
}

/** Значение токена, которое победит на <html> в заданном состоянии, — как это решает браузер. */
function winningValue(
	rules: Declaration[],
	token: string,
	state: RootState,
): string | null {
	let best: { specificity: Specificity; order: number; value: string } | null =
		null;
	for (const rule of rules) {
		const value = rule.properties.get(token);
		if (value === undefined) continue;
		for (const selector of rule.selectors) {
			if (!matchesSelector(selector, state)) continue;
			const specificity = specificityOf(selector);
			if (
				best === null ||
				specificity[0] > best.specificity[0] ||
				(specificity[0] === best.specificity[0] &&
					(specificity[1] > best.specificity[1] ||
						(specificity[1] === best.specificity[1] &&
							(specificity[2] > best.specificity[2] ||
								(specificity[2] === best.specificity[2] &&
									rule.order >= best.order)))))
			) {
				best = { specificity, order: rule.order, value };
			}
		}
	}
	return best?.value ?? null;
}

const rules = parseRules(readFileSync(cssPath, "utf8"));

/** Шесть токенов поверхностей, которые этот файл задаёт для каждой темы. */
const SURFACE_TOKENS = [
	"--teal-fill",
	"--srf-check-task",
	"--srf-check-task-blocking",
	"--srf-chip-soft",
	"--srf-badge-official",
	"--srf-badge-official-line",
] as const;

describe("token-aliases.css: палитру решает data-theme, а не класс", () => {
	test("светлая тема со согласованным классом", () => {
		const state: RootState = { theme: "light", classes: ["light"] };
		assert.equal(winningValue(rules, "--srf-chip-soft", state), "#f7fbf9");
	});

	test("светлая тема, класс dark остался на <html> — прежняя причина чёрной плашки", () => {
		// Именно это состояние снято в light_duplicateAlert_ПУСТО.png: атрибут
		// «светлая», класс «dark». До исправления здесь побеждало #16211f.
		const state: RootState = { theme: "light", classes: ["dark"] };
		assert.equal(
			winningValue(rules, "--srf-chip-soft", state),
			"#f7fbf9",
			"тёмное значение снова перебивает светлую тему — вернулась чёрная плашка в карточке пациента",
		);
	});

	test("ночная тема, класс dark остался на <html>", () => {
		const state: RootState = { theme: "night", classes: ["dark"] };
		assert.equal(
			winningValue(rules, "--srf-chip-soft", state),
			"#1a1714",
			"ночная тема получила тёмные значения вместо своих",
		);
	});

	test("тёмная тема получает свои значения", () => {
		const state: RootState = { theme: "dark", classes: ["dark"] };
		assert.equal(winningValue(rules, "--srf-chip-soft", state), "#16211f");
	});

	test("первый кадр: класс dark без атрибута остаётся тёмным", () => {
		// index.html:2 отдаёт <html class="dark"> без data-theme, и до эффекта
		// ThemeController main.css в этом же состоянии даёт тёмные --ink и --paper.
		// Светлая плашка здесь означала бы светлый текст на светлом фоне.
		const state: RootState = { theme: null, classes: ["dark"] };
		assert.equal(winningValue(rules, "--srf-chip-soft", state), "#16211f");
	});

	test("все шесть токенов имеют значение в каждой из трёх тем", () => {
		for (const theme of ["light", "dark", "night"] as const) {
			for (const token of SURFACE_TOKENS) {
				const value = winningValue(rules, token, {
					theme,
					classes: [theme === "night" ? "" : theme],
				});
				assert.ok(value, `${token} не имеет значения в теме ${theme}`);
			}
		}
	});

	test("посторонний класс не меняет ни один из шести токенов ни в одной теме", () => {
		for (const theme of ["light", "dark", "night"] as const) {
			for (const token of SURFACE_TOKENS) {
				const clean = winningValue(rules, token, { theme, classes: [] });
				for (const stray of ["dark", "light"]) {
					assert.equal(
						winningValue(rules, token, { theme, classes: [stray] }),
						clean,
						`${token} в теме ${theme} меняется от класса ${stray}: палитрой управляет класс, а не data-theme`,
					);
				}
			}
		}
	});
});
