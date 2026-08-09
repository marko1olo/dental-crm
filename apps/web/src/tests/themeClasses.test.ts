/**
 * Проверка разрешения темы и того, что вариант Tailwind `dark:` действует в
 * НОЧНОЙ теме.
 *
 * Ошибка, из-за которой появился этот файл: вариант `dark:` был объявлен через
 * класс .dark, а класс ставился только для тёмной темы. В ночной теме — тоже
 * тёмной — класса не оставалось, и все 72 файла с вариантами `dark:`
 * отрисовывались в ней светлыми плашками поверх тёмного фона. Ни типы, ни
 * сборка, ни один тест такого не видели.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveTheme } from "../lib/themeClasses";

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("разрешение темы", () => {
	test("ночная тема тёмная для системных элементов управления", () => {
		const resolved = resolveTheme("night", false);
		assert.equal(resolved.theme, "night");
		// Иначе браузер рисует светлые полосы прокрутки и поля поверх тёмного фона.
		assert.equal(resolved.colorScheme, "dark");
	});

	test("тёмная тема", () => {
		const resolved = resolveTheme("dark", false);
		assert.equal(resolved.theme, "dark");
		assert.equal(resolved.darkClass, true);
		assert.equal(resolved.lightClass, false);
		assert.equal(resolved.colorScheme, "dark");
	});

	test("светлая тема не получает класс dark ни при каких системных настройках", () => {
		const resolved = resolveTheme("light", true);
		assert.equal(resolved.theme, "light");
		assert.equal(resolved.darkClass, false);
		assert.equal(resolved.lightClass, true);
		assert.equal(resolved.colorScheme, "light");
	});

	test("авто следует системной настройке", () => {
		assert.equal(resolveTheme("auto", true).theme, "dark");
		assert.equal(resolveTheme("auto", false).theme, "light");
		assert.equal(resolveTheme("auto", true).darkClass, true);
		assert.equal(resolveTheme("auto", false).lightClass, true);
	});

	test("класс dark и класс light никогда не стоят одновременно", () => {
		for (const mode of ["light", "dark", "night", "auto"] as const) {
			for (const prefersDark of [true, false]) {
				const resolved = resolveTheme(mode, prefersDark);
				assert.ok(
					!(resolved.darkClass && resolved.lightClass),
					`${mode}/${prefersDark}: оба класса сразу — правила тем начнут конфликтовать`,
				);
			}
		}
	});
});

describe("вариант Tailwind dark:", () => {
	test("объявлен через data-theme и покрывает ночную тему", () => {
		const source = readFileSync(
			path.join(webSrc, "styles/tailwind.css"),
			"utf8",
		);
		const variantMatch = source.match(/@custom-variant dark[\s\S]*?\);/);
		assert.ok(variantMatch, "объявление варианта dark: не найдено");
		const variant = variantMatch[0];
		// Ночная тема обязана попадать в вариант: она тёмная.
		assert.ok(
			variant.includes('[data-theme="night"]'),
			"вариант dark: не учитывает ночную тему — плашки Tailwind останутся светлыми на тёмном фоне",
		);
		assert.ok(
			variant.includes('[data-theme="dark"]'),
			"вариант dark: не учитывает тёмную тему",
		);
	});
});
