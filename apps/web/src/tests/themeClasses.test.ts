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

	test("тёмные темы (dark, night, ocean, emerald, cyber_xray) получают darkClass и colorScheme dark", () => {
		const darkThemes = [
			"dark",
			"night",
			"ocean",
			"emerald",
			"cyber_xray",
		] as const;
		for (const mode of darkThemes) {
			const resolved = resolveTheme(mode, false);
			assert.equal(resolved.theme, mode);
			assert.equal(resolved.darkClass, true, `${mode} должен иметь darkClass=true`);
			assert.equal(resolved.lightClass, false, `${mode} не должен иметь lightClass=true`);
			assert.equal(resolved.colorScheme, "dark", `${mode} должен иметь colorScheme=dark`);
		}
	});

	test("светлые темы (light, calm_teal, contrast, sakura, warm_sand) получают lightClass и colorScheme light", () => {
		const lightThemes = [
			"light",
			"calm_teal",
			"contrast",
			"sakura",
			"warm_sand",
		] as const;
		for (const mode of lightThemes) {
			for (const prefersDark of [true, false]) {
				const resolved = resolveTheme(mode, prefersDark);
				assert.equal(resolved.theme, mode);
				assert.equal(resolved.darkClass, false, `${mode} не должен иметь darkClass`);
				assert.equal(resolved.lightClass, true, `${mode} должен иметь lightClass`);
				assert.equal(resolved.colorScheme, "light", `${mode} должен иметь colorScheme=light`);
			}
		}
	});

	test("авто следует системной настройке", () => {
		assert.equal(resolveTheme("auto", true).theme, "dark");
		assert.equal(resolveTheme("auto", false).theme, "light");
		assert.equal(resolveTheme("auto", true).darkClass, true);
		assert.equal(resolveTheme("auto", false).lightClass, true);
		assert.equal(resolveTheme("auto", true).colorScheme, "dark");
		assert.equal(resolveTheme("auto", false).colorScheme, "light");
	});

	test("класс dark и класс light никогда не стоят одновременно для всех 10 тем", () => {
		const allModes = [
			"light",
			"dark",
			"night",
			"calm_teal",
			"contrast",
			"sakura",
			"ocean",
			"emerald",
			"cyber_xray",
			"warm_sand",
			"auto",
		] as const;
		for (const mode of allModes) {
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
	test("объявлен через data-theme и покрывает все тёмные темы", () => {
		const source = readFileSync(
			path.join(webSrc, "styles/tailwind.css"),
			"utf8",
		);
		const variantMatch = source.match(/@custom-variant dark[\s\S]*?\);/);
		assert.ok(variantMatch, "объявление варианта dark: не найдено");
		const variant = variantMatch[0];
		// Все тёмные темы обязаны попадать в вариант
		for (const darkTheme of [
			"dark",
			"night",
			"ocean",
			"emerald",
			"cyber_xray",
		]) {
			assert.ok(
				variant.includes(`[data-theme="${darkTheme}"]`),
				`вариант dark: не учитывает тему ${darkTheme} — плашки Tailwind останутся светлыми на тёмном фоне`,
			);
		}
	});
});
