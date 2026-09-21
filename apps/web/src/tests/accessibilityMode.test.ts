/**
 * accessibilityMode.test.ts
 *
 * Модульные тесты версии для людей с ограниченными возможностями
 * (ГОСТ Р 52872-2019 / WCAG 2.1 AAA 7:1)
 *
 * Проверяет:
 * 1. themeStore:
 *    - toggleAccessibilityMode() переключает между текущей темой и "contrast"
 *    - флаг isAccessibilityMode отражает текущий статус доступности
 *    - запоминание и возврат к предыдущей теме при выходе из режима доступности
 *    - setThemeMode("contrast") выставляет isAccessibilityMode: true
 *    - setThemeMode("light") сбрасывает isAccessibilityMode: false
 *    - масштабирование шрифта a11yFontSize: "normal" | "large" | "x-large"
 * 2. themeClasses (resolveTheme и applyThemeToRoot):
 *    - resolveTheme с isAccessibilityMode: true выставляет theme="contrast"
 *    - applyThemeToRoot выставляет dataset.theme="contrast", добавляет класс "a11y-contrast",
 *      и устанавливает dataset.a11yFont
 *    - applyThemeToRoot при отключении режима удаляет класс "a11y-contrast"
 * 3. UI Компоненты (AccessibilityModeButton & ClinicControlPill):
 *    - Кнопка содержит строгую иконку Glasses (SVG), без мультяшных эмодзи
 *    - Кнопка меняет лейбл "Для слабовидящих" <-> "Обычная версия"
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	AccessibilityModeButton,
	ClinicControlPill,
} from "../components/Header";
import { applyThemeToRoot, resolveTheme } from "../lib/themeClasses";
import { useThemeStore } from "../store/themeStore";

// Mock HTMLElement для тестирования DOM-манипуляций applyThemeToRoot
function createMockHtmlElement() {
	const classSet = new Set<string>();
	const dataset: Record<string, string> = {};
	const style: Record<string, string> = {};

	return {
		dataset,
		style,
		classList: {
			add: (cls: string) => classSet.add(cls),
			remove: (cls: string) => classSet.delete(cls),
			toggle: (cls: string, force?: boolean) => {
				const shouldHave = force !== undefined ? force : !classSet.has(cls);
				if (shouldHave) {
					classSet.add(cls);
				} else {
					classSet.delete(cls);
				}
				return shouldHave;
			},
			contains: (cls: string) => classSet.has(cls),
		},
	};
}

describe("Режим для слабовидящих: useThemeStore", () => {
	beforeEach(() => {
		useThemeStore.getState().setThemeMode("light");
		useThemeStore.getState().setA11yFontSize("normal");
	});

	it("начальное состояние: стандартный режим", () => {
		const state = useThemeStore.getState();
		assert.equal(state.themeMode, "light");
		assert.equal(state.isAccessibilityMode, false);
		assert.equal(state.a11yFontSize, "normal");
	});

	it("toggleAccessibilityMode() включает высококонтрастный режим contrast", () => {
		const store = useThemeStore.getState();
		store.setThemeMode("dark");
		assert.equal(useThemeStore.getState().themeMode, "dark");
		assert.equal(useThemeStore.getState().isAccessibilityMode, false);

		// Переключаем в режим доступности
		store.toggleAccessibilityMode();
		const activeState = useThemeStore.getState();
		assert.equal(activeState.themeMode, "contrast");
		assert.equal(activeState.isAccessibilityMode, true);

		// Переключаем обратно: должна восстановиться тёмная тема
		activeState.toggleAccessibilityMode();
		const restoredState = useThemeStore.getState();
		assert.equal(restoredState.themeMode, "dark");
		assert.equal(restoredState.isAccessibilityMode, false);
	});

	it("setThemeMode('contrast') активирует флаг isAccessibilityMode", () => {
		const store = useThemeStore.getState();
		store.setThemeMode("contrast");
		assert.equal(useThemeStore.getState().themeMode, "contrast");
		assert.equal(useThemeStore.getState().isAccessibilityMode, true);

		// Переключение на другую тему выключает флаг доступности
		store.setThemeMode("calm_teal");
		assert.equal(useThemeStore.getState().themeMode, "calm_teal");
		assert.equal(useThemeStore.getState().isAccessibilityMode, false);
	});

	it("setA11yFontSize() переключает размер шрифта между normal, large и x-large", () => {
		const store = useThemeStore.getState();
		assert.equal(store.a11yFontSize, "normal");

		store.setA11yFontSize("large");
		assert.equal(useThemeStore.getState().a11yFontSize, "large");

		store.setA11yFontSize("x-large");
		assert.equal(useThemeStore.getState().a11yFontSize, "x-large");

		store.setA11yFontSize("normal");
		assert.equal(useThemeStore.getState().a11yFontSize, "normal");
	});
});

describe("Режим для слабовидящих: resolveTheme & applyThemeToRoot", () => {
	it("resolveTheme с флагом isAccessibilityMode возвращает тему contrast", () => {
		const resolved = resolveTheme("dark", true, { isAccessibilityMode: true });
		assert.equal(resolved.theme, "contrast");
		assert.equal(resolved.isAccessibilityMode, true);
		assert.equal(resolved.colorScheme, "light");
		assert.equal(resolved.darkClass, false);
		assert.equal(resolved.lightClass, true);
	});

	it("resolveTheme для режима contrast автоматически выставляет isAccessibilityMode: true", () => {
		const resolved = resolveTheme("contrast", false);
		assert.equal(resolved.theme, "contrast");
		assert.equal(resolved.isAccessibilityMode, true);
	});

	it("resolveTheme передает выбранный размер шрифта a11yFontSize", () => {
		const resolved = resolveTheme("contrast", false, {
			isAccessibilityMode: true,
			a11yFontSize: "x-large",
		});
		assert.equal(resolved.a11yFontSize, "x-large");
	});

	it("applyThemeToRoot выставляет dataset.theme, класс a11y-contrast и data-a11y-font", () => {
		const mockRoot = createMockHtmlElement();
		const resolved = resolveTheme("light", false, {
			isAccessibilityMode: true,
			a11yFontSize: "large",
		});

		applyThemeToRoot(mockRoot as unknown as HTMLElement, resolved);

		assert.equal(mockRoot.dataset.theme, "contrast");
		assert.ok(mockRoot.classList.contains("a11y-contrast"));
		assert.equal(mockRoot.dataset.a11yFont, "large");
	});

	it("applyThemeToRoot убирает класс a11y-contrast при переходе в обычный режим", () => {
		const mockRoot = createMockHtmlElement();
		// Сначала режим доступности
		const resolvedA11y = resolveTheme("contrast", false, {
			isAccessibilityMode: true,
		});
		applyThemeToRoot(mockRoot as unknown as HTMLElement, resolvedA11y);
		assert.ok(mockRoot.classList.contains("a11y-contrast"));

		// Затем обычный режим
		const resolvedNormal = resolveTheme("light", false, {
			isAccessibilityMode: false,
			a11yFontSize: "normal",
		});
		applyThemeToRoot(mockRoot as unknown as HTMLElement, resolvedNormal);
		assert.equal(mockRoot.dataset.theme, "light");
		assert.ok(!mockRoot.classList.contains("a11y-contrast"));
		assert.equal(mockRoot.dataset.a11yFont, "normal");
	});
});

describe("UI Компоненты доступности: AccessibilityModeButton & ClinicControlPill", () => {
	beforeEach(() => {
		useThemeStore.getState().setThemeMode("light");
		useThemeStore.getState().setA11yFontSize("normal");
	});

	it("AccessibilityModeButton рендерит клиническую кнопку с иконкой и без эмодзи", () => {
		const html = renderToStaticMarkup(
			React.createElement(AccessibilityModeButton),
		);
		assert.ok(
			html.includes("dnt-a11y-toggle-btn"),
			"Содержит CSS-класс кнопки доступности",
		);
		assert.ok(
			html.includes("Для слабовидящих"),
			"Содержит текст кнопки для слабовидящих",
		);
		assert.ok(html.includes("svg"), "Содержит SVG векторную иконку (Glasses)");
		// Мандат 8d: ноль мультяшных эмодзи
		assert.ok(!html.includes("👓"), "Запрещены мультяшные эмодзи в разметке");
		assert.ok(!html.includes("👁️"), "Запрещены мультяшные эмодзи в разметке");
	});

	it("AccessibilityModeButton в активном режиме отображает 'Обычная версия'", () => {
		useThemeStore.getState().setThemeMode("contrast");
		const html = renderToStaticMarkup(
			React.createElement(AccessibilityModeButton),
		);
		assert.ok(
			html.includes("dnt-a11y-toggle-btn--active"),
			"Имеет класс активного режима",
		);
		assert.ok(
			html.includes("Обычная версия"),
			"Содержит текст возврата к обычной версии",
		);
	});

	it("ClinicControlPill монтирует кнопку доступности в верхний тулбар", () => {
		const html = renderToStaticMarkup(React.createElement(ClinicControlPill));
		assert.ok(
			html.includes("dnt-a11y-toggle-btn"),
			"ClinicControlPill монтирует кнопку версии для слабовидящих",
		);
		assert.ok(
			html.includes("Для слабовидящих") || html.includes("Обычная версия"),
		);
	});
});
