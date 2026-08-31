import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	Shell,
	ShellContent,
	ShellFooter,
	ShellHeader,
	ShellSurface,
} from "../Shell";

describe("WebKit CSS Grid Shell & Surface Elevation Architecture", () => {
	it("renders 3-part CSS Grid Shell with header, isolated scroll content and footer", () => {
		const html = renderToStaticMarkup(
			<Shell
				header={<div data-testid="test-header">Шапка Клиники</div>}
				footer={<div data-testid="test-footer">Нижняя Навигация</div>}
				sidebar={<div data-testid="test-sidebar">Боковое Меню</div>}
			>
				<div data-testid="test-content">Основная рабочая область</div>
			</Shell>,
		);

		assert.ok(html.includes("webkit-grid-shell"), "должен содержать класс webkit-grid-shell");
		assert.ok(html.includes("with-sidebar"), "должен поддерживать сетку с боковым меню");
		assert.ok(html.includes("webkit-shell-sidebar"), "должен рендерить трек сайдбара");
		assert.ok(html.includes("webkit-shell-main-track"), "должен рендерить 3-частный трек сетки");
		assert.ok(html.includes("webkit-shell-content"), "должен рендерить изолированный скролл-трек контента");
		assert.ok(html.includes("data-testid=\"test-header\""), "должен содержать шапку");
		assert.ok(html.includes("data-testid=\"test-content\""), "должен содержать контент");
		assert.ok(html.includes("data-testid=\"test-footer\""), "должен содержать футер");
	});

	it("renders standalone Shell subcomponents with tonal depth Surface Elevation", () => {
		const headerHtml = renderToStaticMarkup(
			<ShellHeader elevation="raised">
				<span>Заголовок</span>
			</ShellHeader>,
		);
		assert.ok(headerHtml.includes("webkit-shell-header"), "ShellHeader должен иметь класс webkit-shell-header");
		assert.ok(headerHtml.includes("surface-raised"), "ShellHeader по умолчанию имеет elevation raised");

		const contentHtml = renderToStaticMarkup(
			<ShellContent id="patient-workspace-track">
				<p>Карточка пациента</p>
			</ShellContent>,
		);
		assert.ok(contentHtml.includes("webkit-shell-content"), "ShellContent должен иметь класс webkit-shell-content");
		assert.ok(contentHtml.includes("patient-workspace-track"), "ShellContent должен поддерживать кастомный id");

		const footerHtml = renderToStaticMarkup(
			<ShellFooter elevation="base">
				<span>Статус</span>
			</ShellFooter>,
		);
		assert.ok(footerHtml.includes("webkit-shell-footer"), "ShellFooter должен иметь класс webkit-shell-footer");
		assert.ok(footerHtml.includes("surface-base"), "ShellFooter должен поддерживать elevation base");
	});

	it("renders ShellSurface container with all 4 elevation levels and tonal depth", () => {
		const levels = ["base", "raised", "overlay", "sunken"] as const;

		for (const level of levels) {
			const html = renderToStaticMarkup(
				<ShellSurface level={level} borderStyle="subtle">
					<span>Контент уровня {level}</span>
				</ShellSurface>,
			);
			assert.ok(html.includes("shell-surface"), "должен содержать класс shell-surface");
			assert.ok(html.includes(`surface-${level}`), `должен содержать класс surface-${level}`);
			assert.ok(html.includes("border-subtle"), "должен содержать класс border-subtle");
		}
	});

	it("supports custom tone overrides without breaking tonal hierarchy", () => {
		const html = renderToStaticMarkup(
			<ShellSurface tone="paper-soft" borderStyle="none">
				<span>Внутренний инсет-блок</span>
			</ShellSurface>,
		);
		assert.ok(html.includes("tone-paper-soft"), "должен содержать класс tone-paper-soft");
		assert.ok(html.includes("border-none"), "должен содержать класс border-none");
	});
});
