/**
 * BranchSelector.test.tsx — Тестирование переключателя филиалов клиники в шапке CRM.
 * 
 * Домен 30: Сеть клиник, Франшиза, Филиалы, Межфилиальный трансфер.
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import { BranchSelector } from "../topBarModules/BranchSelector";

describe("BranchSelector: Селектор филиала клиники в шапке", () => {
	it("При наличии одного отделения рендерит компактный неклиппируемый бейдж филиала", () => {
		const html = renderToStaticMarkup(
			<BranchSelector defaultClinicName="ДЕНТЕ Центральный" />,
		);

		assert.ok(html.includes("branch-single-badge"), "Содержит testid одиночного бейджа");
		assert.ok(html.includes("ДЕНТЕ Центральный"), "Отображает название клиники");
		assert.ok(!html.includes("btn-branch-selector-toggle"), "Не показывает дропдаун при 1 отделении (0px шума)");
	});

	it("Отображает иконку здания Lucide Building2 и использует семантические токены темы", () => {
		const html = renderToStaticMarkup(
			<BranchSelector defaultClinicName="Филиал Север" className="test-branch-class" />,
		);

		assert.ok(html.includes("test-branch-class"), "Применяет пользовательский класс");
		assert.ok(html.includes("var(--paper-soft)"), "Использует токен var(--paper-soft)");
		assert.ok(html.includes("var(--line)"), "Использует токен границы var(--line)");
	});
});
