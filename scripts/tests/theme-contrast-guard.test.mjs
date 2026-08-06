#!/usr/bin/env node
/**
 * Охрана правок контраста по темам: светлые ЛИТЕРАЛЫ и тёмное плечо без ночного.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ СУЩЕСТВУЕТ. Серия правок перевела почти белые плашки с
 * литералов на токены палитры: полоса готовности, просроченный платёж, плашка
 * передачи приёма, чипы карточки записи, строки находок по зубам. Ничего из
 * этого не охранялось. Существующая проверка scripts/check-css-tokens.mjs здесь
 * не помогает по устройству: она разбирает только конструкции var() — берёт
 * имя, смотрит объявление, разбирает запас. Объявление `background: #fef2f2`
 * не содержит var() вообще, поэтому физически не может попасть ни в одну её
 * корзину нарушений. То есть предыдущий класс дефекта она не видит и не увидит.
 * Этот тест смотрит на литералы напрямую.
 *
 * ИМЕНА ТЕМ. «Ночь» — это data-theme="dark", «Тепло» — data-theme="night"
 * (перевёрнуто в apps/web/src/workspaceShell.tsx). Порядок тем во всех числах:
 * светлая / «Ночь» / «Тепло».
 *
 * ЧТО ТАКОЕ «СВЕТЛЫЙ ЛИТЕРАЛ». Цветовой литерал (#rgb, #rrggbb, rgb(), rgba() с
 * альфой от 0.85) с относительной яркостью WCAG выше 0.5 — примерно светлее
 * #bcbcbc. Порог тот же, что в scripts/check-css-tokens.mjs, и намеренно грубый:
 * задача не оценить оттенок, а поймать светлую плиту, которая рисуется во всех
 * трёх темах. Полупрозрачные значения (альфа ниже 0.85) не считаются: их цвет
 * решает подложка, а не сам литерал.
 *
 * ТРИ ПРАВИЛА.
 *   1. Правила, переведённые на токены, не возвращают светлый литерал в
 *      цветовые свойства. Заодно проверяется, что каждый охраняемый селектор в
 *      дереве ЕЩЁ ЕСТЬ: переименовали — тест краснеет, а не молча охраняет
 *      пустоту.
 *   2. Тёмное плечо без ночного плеча над светлым литералом — это ровно тот
 *      дефект, из которого выросла вся серия: базовое правило со светлым
 *      литералом, поправка на [data-theme="dark"] и никакой поправки на
 *      [data-theme="night"], поэтому «Тепло» остаётся на почти белой плите.
 *      Таких мест в дереве 24, они перечислены поимённо ниже. Новое место валит
 *      тест; исчезнувшее — тоже, чтобы реестр не прикрыл следующее нарушение
 *      под тем же селектором (так же ведёт себя KNOWN_LIGHT_FALLBACK_DEBT в
 *      scripts/check-css-tokens.mjs).
 *   3. У --teal-glow ДВА РАЗНЫХ ТИПА: цвет в main.css:24/86/146 и
 *      dente-redesign.css:26/81/129, готовая тень «0 0 20px rgba(...)» в
 *      premium.css:19/65/111. Побеждает цвет (main.css объявляет его на
 *      :root[data-theme="light"] и :root[data-theme="dark"] со специфичностью
 *      (0,2,0) против (0,1,0) у premium.css; в «Тепле» блока main.css нет, и
 *      цвет из dente-redesign.css выигрывает порядком импорта — main.tsx:17
 *      после main.tsx:16). Значит теневое использование недействительно, и оно
 *      в дереве одно. Счётчик пинуется: появится второе — тест краснеет.
 *
 * ЧЕТВЁРТЫЙ ТЕСТ ПРОВЕРЯЕТ САМИ ДЕТЕКТОРЫ. На живом дереве первые два молчат — так
 * и задумано, но такой страж прошёл бы и будучи сломанным: детектор, всегда
 * возвращающий пустой список, даёт ровно те же три галочки. Поэтому тот же код
 * гоняется на подделанном входе с заранее известным ответом: одно правило с
 * дефектом, одно с обоими плечами, одно на токенах, полупрозрачное значение и
 * светлый запас внутри var(). Ожидается ровно одна находка.
 *
 * ЧЕГО ТЕСТ НЕ ДЕЛАЕТ. Не вычисляет каскад и не считает контраст: разбор здесь
 * текстовый, по правилам и объявлениям. Числа контраста считаны отдельно и
 * записаны в комментариях рядом с правилами (см. main.css:762-810,
 * shadow-analyst.css:304-321). Тест охраняет форму, а не оттенок.
 *
 * Запуск:  node --test scripts/tests/theme-contrast-guard.test.mjs
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const stylesDirectory = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"apps/web/src/styles",
);

/** Правила, переведённые с почти белых литералов на токены палитры. */
const GUARDED_SELECTORS = [
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
	".sa-tooth-row--critical",
	".sa-tooth-row--done",
	".smart-field input:focus ~ label",
	".smart-field textarea:focus ~ label",
	".smart-field input:not(:placeholder-shown) ~ label",
	".smart-field textarea:not(:placeholder-shown) ~ label",
];

/**
 * ИЗВЕСТНЫЙ ДОЛГ, ПЕРЕЧИСЛЕННЫЙ ПОИМЁННО. Базовый селектор (без плеча темы), у
 * которого есть поправка на «Ночь», нет поправки на «Тепло», а в самом базовом
 * правиле стоит светлый литерал. Список закрыт: правки серии из него ушли,
 * остальное — незакрытые места, а не разрешение писать новые.
 */
const KNOWN_DARK_WITHOUT_NIGHT = new Set([
	"._ccm-btn",
	"._ccm-btn:hover",
	"._ccm-panel",
	".clinic-legal-form",
	".clinic-profile-form-grid input",
	".clinic-profile-form-grid select",
	".clinic-profile-form-grid textarea",
	".clinical-rules-toggle",
	".clinical-rules-toggle > summary",
	".clinical-rules-toggle > summary:hover",
	".communication-empty-state",
	".compliance-bar",
	".dictation-action-guidance",
	".emk-tab-button.active",
	".mode-readiness > div",
	".mode-readiness span",
	".onboarding-draft-strip",
	".payment-capture-detail-section",
	".schedule-filter-strip",
	".schedule-shift-summary",
	".schedule-shift-summary-grid article",
	".status-empty",
	".status-neutral",
	".visit-draft-missing",
]);

const COLOR_PROPERTY =
	/^(color|background|background-color|border|border-color|border-top-color|border-right-color|border-bottom-color|border-left-color|outline-color|fill|stroke)$/;

/** Плечо «Ночи» в селекторе. */
const DARK_ARM =
	/\[data-theme="dark"\]|html\.dark|body\.dark-mode|(?:^|\s)\.dark(?=\s|$)/;
const NIGHT_ARM = /\[data-theme="night"\]/;
const ANY_ARM =
	/:root\[data-theme="(?:dark|night|light)"\]\s*|\[data-theme="(?:dark|night|light)"\]\s*|html\.(?:dark|light)\s*|body\.dark-mode\s*|(?:^|\s)\.dark(?=\s|$)/g;

/** Один канал sRGB 0..1 -> линейное значение по WCAG 2.x. */
const linearizeChannel = (channel) =>
	channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** Относительная яркость цветового литерала, либо null, если это не плотный цвет. */
function relativeLuminance(literal) {
	const text = literal.toLowerCase().trim();
	let channels = null;
	const hex = /^#([0-9a-f]{3,8})$/.exec(text);
	if (hex) {
		const digits = hex[1];
		if (digits.length === 3 || digits.length === 4) {
			channels = [0, 1, 2].map((index) =>
				Number.parseInt(digits[index] + digits[index], 16),
			);
			if (
				digits.length === 4 &&
				Number.parseInt(digits[3] + digits[3], 16) / 255 < 0.85
			)
				return null;
		} else if (digits.length === 6 || digits.length === 8) {
			channels = [0, 2, 4].map((index) =>
				Number.parseInt(digits.slice(index, index + 2), 16),
			);
			if (
				digits.length === 8 &&
				Number.parseInt(digits.slice(6, 8), 16) / 255 < 0.85
			)
				return null;
		}
	} else {
		const rgb = /^rgba?\(([^)]*)\)$/.exec(text);
		if (rgb) {
			const parts = rgb[1].split(/[,\s/]+/).filter(Boolean);
			if (parts.length > 3 && Number.parseFloat(parts[3]) < 0.85) return null;
			const head = parts.slice(0, 3);
			if (head.length === 3 && head.every((part) => /^[\d.]+%?$/.test(part))) {
				channels = head.map((part) =>
					part.endsWith("%")
						? (Number.parseFloat(part) * 255) / 100
						: Number.parseFloat(part),
				);
			}
		}
	}
	if (!channels || channels.some((channel) => !Number.isFinite(channel)))
		return null;
	const [red, green, blue] = channels.map((channel) =>
		linearizeChannel(channel / 255),
	);
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Светлее примерно #bcbcbc — в тёмной и ночной теме это светлая плита. */
const LIGHT_LUMINANCE = 0.5;

/**
 * Вырезает комментарии, сохраняя смещения: номера строк не сдвигаются, а пример
 * дефекта, записанный в шапке css-файла, не считается за объявление.
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
		end = end < 0 ? source.length : end + 2;
		for (const character of source.slice(start, end))
			result += character === "\n" ? "\n" : " ";
		index = end;
	}
	return result;
}

/**
 * Правила файла: селектор, тело, номер строки. Обход по глубине скобок, поэтому
 * правила внутри @media попадают в список, а сам @media-блок — нет.
 */
function parseRules(source, file) {
	const rules = [];
	const stack = [];
	let depth = 0;
	let selectorStart = 0;
	for (let index = 0; index < source.length; index++) {
		const character = source[index];
		if (character === "{") {
			stack.push({
				selector: source.slice(selectorStart, index).trim(),
				bodyStart: index + 1,
			});
			depth += 1;
			selectorStart = index + 1;
		} else if (character === "}") {
			depth -= 1;
			const frame = stack.pop();
			if (frame && !frame.selector.startsWith("@")) {
				rules.push({
					selector: frame.selector,
					body: source.slice(frame.bodyStart, index),
					file,
					line: source.slice(0, frame.bodyStart).split("\n").length,
				});
			}
			selectorStart = index + 1;
		} else if (character === ";" && depth === 0) {
			selectorStart = index + 1;
		}
	}
	return rules;
}

/** Убирает конструкции var(...) целиком: их запасы охраняет check-css-tokens.mjs. */
function withoutVarCalls(value) {
	let result = "";
	let index = 0;
	while (index < value.length) {
		const start = value.indexOf("var(", index);
		if (start < 0) {
			result += value.slice(index);
			break;
		}
		result += value.slice(index, start);
		let depth = 0;
		let end = start + 3;
		for (; end < value.length; end++) {
			if (value[end] === "(") depth += 1;
			else if (value[end] === ")") {
				depth -= 1;
				if (depth === 0) break;
			}
		}
		index = end + 1;
	}
	return result;
}

/** Светлые литералы в цветовых свойствах правила: [{ property, literal, luminance }]. */
function lightLiterals(body) {
	const found = [];
	for (const declaration of body.split(";")) {
		const colon = declaration.indexOf(":");
		if (colon < 0) continue;
		const property = declaration.slice(0, colon).trim().toLowerCase();
		if (!COLOR_PROPERTY.test(property)) continue;
		const value = withoutVarCalls(declaration.slice(colon + 1));
		for (const match of value.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) {
			const luminance = relativeLuminance(match[0]);
			if (luminance !== null && luminance > LIGHT_LUMINANCE) {
				found.push({ property, literal: match[0], luminance });
			}
		}
	}
	return found;
}

const normalize = (selector) => selector.replace(/\s+/g, " ").trim();
const splitSelectorList = (selectorList) =>
	selectorList.split(",").map(normalize).filter(Boolean);
const stripThemeArms = (selector) => normalize(selector.replace(ANY_ARM, " "));

/**
 * Светлые литералы в охраняемых правилах и охраняемые селекторы, которых в дереве
 * нет. Вынесено в функцию, чтобы тот же детектор можно было прогнать на
 * подделанном входе с заранее известным ответом (последний тест файла): страж,
 * который никогда не краснел, ничего не доказывает.
 */
function scanGuarded(rules, guarded) {
	const seen = new Set();
	const offenders = [];
	for (const rule of rules) {
		for (const selector of splitSelectorList(rule.selector)) {
			if (!guarded.includes(selector)) continue;
			seen.add(selector);
			for (const hit of lightLiterals(rule.body)) {
				offenders.push(
					`${rule.file}:${rule.line}  ${selector}  ${hit.property}: ${hit.literal} (яркость ${hit.luminance.toFixed(2)})`,
				);
			}
		}
	}
	return {
		offenders,
		missing: guarded.filter((selector) => !seen.has(selector)),
	};
}

/**
 * Базовые селекторы, у которых есть плечо «Ночи», нет плеча «Тепла», а в самом
 * базовом правиле стоит светлый литерал. Ключ — базовый селектор без плеча темы,
 * значение — места, чтобы отчёт указывал на файл и строку.
 */
function collectDarkWithoutNight(rules) {
	const nightBases = new Set();
	const darkBases = new Map();
	const litBases = new Map();

	for (const rule of rules) {
		for (const selector of splitSelectorList(rule.selector)) {
			const base = stripThemeArms(selector);
			if (NIGHT_ARM.test(selector)) {
				nightBases.add(base);
				continue;
			}
			if (DARK_ARM.test(selector)) {
				if (!darkBases.has(base))
					darkBases.set(base, `${rule.file}:${rule.line}`);
				continue;
			}
			if (/\[data-theme=|html\.light/.test(selector)) continue;
			if (lightLiterals(rule.body).length > 0 && !litBases.has(base))
				litBases.set(base, `${rule.file}:${rule.line}`);
		}
	}

	const hits = new Map();
	for (const [base, darkAt] of darkBases) {
		if (nightBases.has(base)) continue;
		const litAt = litBases.get(base);
		if (litAt) hits.set(base, `база ${litAt}, плечо «Ночи» ${darkAt}`);
	}
	return hits;
}

const allRules = readdirSync(stylesDirectory)
	.filter((name) => name.endsWith(".css"))
	.flatMap((name) =>
		parseRules(
			blankComments(readFileSync(join(stylesDirectory, name), "utf8")),
			name,
		),
	);

test("правила, переведённые на токены, не возвращают светлый литерал", () => {
	const { offenders, missing } = scanGuarded(allRules, GUARDED_SELECTORS);
	assert.deepEqual(
		missing,
		[],
		`охраняемый селектор исчез из дерева — переименован или удалён, охрана стала пустой:\n${missing.join("\n")}`,
	);
	assert.deepEqual(
		offenders,
		[],
		`светлый литерал вернулся в правило, переведённое на токен палитры:\n${offenders.join("\n")}\n` +
			"Плашка станет почти белой в темах «Ночь» и «Тепло», а текст в них светлый.\n" +
			"Закрывать токеном, объявленным во всех трёх темах (--bad-bg/--warn-bg/--info-bg/--teal-surface).",
	);
});

test("тёмное плечо без ночного плеча над светлым литералом: реестр из 24 мест закрыт", () => {
	const hits = collectDarkWithoutNight(allRules);

	const added = [...hits.keys()]
		.filter((base) => !KNOWN_DARK_WITHOUT_NIGHT.has(base))
		.sort();
	const gone = [...KNOWN_DARK_WITHOUT_NIGHT]
		.filter((base) => !hits.has(base))
		.sort();

	assert.deepEqual(
		added,
		[],
		"новое место того же дефекта: базовое правило со светлым литералом, поправка на «Ночь» есть, " +
			`на «Тепло» нет — тема «Тепло» останется на светлой плите:\n${added
				.map((base) => `  ${base}  (${hits.get(base)})`)
				.join(
					"\n",
				)}\nПеречислять [data-theme="night"] рядом с [data-theme="dark"] недостаточно надёжно: ` +
			"надёжно — убрать литерал из базового правила в токен, объявленный во всех трёх темах.",
	);
	assert.deepEqual(
		gone,
		[],
		`реестр устарел: ${gone.join(", ")} больше не подходит под дефект. Удалить из KNOWN_DARK_WITHOUT_NIGHT — ` +
			"иначе реестр прикроет следующее нарушение под тем же селектором.",
	);
	assert.equal(hits.size, KNOWN_DARK_WITHOUT_NIGHT.size);
});

test("--teal-glow с двумя типами: теневое использование в дереве одно и запинено", () => {
	/** Использование, требующее ГОТОВОЙ ТЕНИ: var(--teal-glow) занимает всё значение box-shadow. */
	const shadowTyped = [];
	/** Использование, требующее ЦВЕТА: перед var(--teal-glow) в значении стоят длины. */
	const colorTyped = [];
	for (const name of readdirSync(stylesDirectory).filter((file) =>
		file.endsWith(".css"),
	)) {
		const source = blankComments(
			readFileSync(join(stylesDirectory, name), "utf8"),
		);
		source.split("\n").forEach((line, index) => {
			const match = /^\s*box-shadow\s*:\s*(.+?)\s*;?\s*$/.exec(line);
			if (!match || !match[1].includes("var(--teal-glow")) return;
			const value = match[1].replace(/\s*!important\s*$/, "").trim();
			(value.startsWith("var(--teal-glow") ? shadowTyped : colorTyped).push(
				`${name}:${index + 1}  ${value}`,
			);
		});
	}

	assert.equal(
		shadowTyped.length,
		1,
		"--teal-glow объявлен цветом в main.css/dente-redesign.css и готовой тенью в premium.css; побеждает цвет, " +
			`поэтому каждое теневое использование недействительно и тень пропадает целиком:\n${shadowTyped.join("\n")}`,
	);
	assert.match(
		shadowTyped[0],
		/^premium\.css:/,
		"известное теневое использование одно, в premium.css",
	);
	assert.ok(
		colorTyped.length > 0,
		"цветовые использования --teal-glow должны остаться цветовыми",
	);

	const strip = allRules.find((rule) =>
		splitSelectorList(rule.selector).includes(".onboarding-compact-strip"),
	);
	assert.ok(strip, "правило .onboarding-compact-strip обязано быть в дереве");
	assert.match(
		strip.body,
		/border:[^;]*var\(--line-strong\)/,
		"рамка полосы готовности стоит на --line-strong",
	);
	assert.doesNotMatch(
		strip.body,
		/var\(--teal-glow\)/,
		"--teal-glow здесь мог стать тенью и убить рамку целиком",
	);
});

/**
 * Оба детектора выше на живом дереве молчат — так и должно быть. Но страж, который
 * никогда не краснел, ничего не доказывает: три теста прошли бы и с детектором,
 * возвращающим пустой список всегда. Здесь тот же код гоняется на подделанном
 * входе с заранее известным ответом.
 */
test("детекторы краснеют на подделанном входе, а на токенах молчат", () => {
	const fixture = parseRules(
		blankComments(
			[
				"/* .plate: ровно прежний дефект — светлый литерал в базе, плечо «Ночи» есть, «Тепла» нет */",
				".plate { background: #fef2f2; color: var(--ink); }",
				'[data-theme="dark"] .plate { background: rgba(15, 23, 42, 0.92); }',
				"/* .plate-ok: тот же светлый литерал, но перечислены ОБА плеча — не дефект этого правила */",
				".plate-ok { background: #fdf5f5; }",
				'[data-theme="dark"] .plate-ok { background: #111827; }',
				'[data-theme="night"] .plate-ok { background: #201010; }',
				"/* .tokenised: как стало после правки — литералов нет вообще */",
				".tokenised { background: var(--bad-bg); color: var(--ink); }",
				"/* полупрозрачное значение не считается светлым: его цвет решает подложка */",
				".veil { background: rgba(255, 255, 255, 0.3); }",
				"/* светлый запас внутри var() — область scripts/check-css-tokens.mjs, здесь не считается */",
				".fallback { background: var(--surface-alt, #f8fafc); }",
				"/* пример дефекта в комментарии не должен считаться: background: #ffffff */",
				"",
			].join("\n"),
		),
		"fixture.css",
	);

	const hits = collectDarkWithoutNight(fixture);
	assert.deepEqual(
		[...hits.keys()],
		[".plate"],
		"дефект — только .plate: у .plate-ok плечо «Тепла» есть",
	);
	assert.match(
		hits.get(".plate"),
		/база fixture\.css:2, плечо «Ночи» fixture\.css:3/,
	);

	const guarded = scanGuarded(fixture, [
		".plate",
		".tokenised",
		".veil",
		".fallback",
	]);
	assert.deepEqual(guarded.missing, [], "все четыре селектора в фикстуре есть");
	assert.equal(
		guarded.offenders.length,
		1,
		`светлым литералом обязано быть только .plate:\n${guarded.offenders.join("\n")}`,
	);
	assert.match(
		guarded.offenders[0],
		/^fixture\.css:2\s+\.plate\s+background: #fef2f2 \(яркость 0\.9\d\)$/,
	);

	assert.deepEqual(
		scanGuarded(fixture, [".renamed-away"]).missing,
		[".renamed-away"],
		"переименованный селектор обязан попасть в missing, иначе охрана молча охраняет пустоту",
	);
});
