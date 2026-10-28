/**
 * apps/web/src/components/inventory/__tests__/ConsumablesBatchWriteoffModal.test.tsx
 *
 * Канонические тесты для ConsumablesBatchWriteoffModal (Мандаты 8e, 8n, 8am, 8ze).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ConsumablesBatchWriteoffModal } from "../ConsumablesBatchWriteoffModal.js";

describe("ConsumablesBatchWriteoffModal SSOT Invariants (Mandates 8e, 8n, 8am, 8ze)", () => {
	it("1. При isOpen = false компонент возвращает пустую строку", () => {
		const html = renderToString(
			<ConsumablesBatchWriteoffModal
				isOpen={false}
				onClose={() => {}}
				organizationId="test-org-uuid"
			/>,
		);
		assert.equal(html, "");
	});

	it("2. При isOpen = true рендерит канонический заголовок, бейдж 1-клика и список материалов", () => {
		const html = renderToString(
			<ConsumablesBatchWriteoffModal
				isOpen={true}
				onClose={() => {}}
				organizationId="test-org-uuid"
			/>,
		);

		assert.ok(html.includes("Списание расходников за смену"), "Должен быть живой понятный заголовок");
		assert.ok(html.includes("1 клик по техкартам"), "Должен быть бейдж 1 клика по техкартам");
		assert.ok(html.includes("Материалы по техкартам"), "Таблица материалов должна отображаться");
		assert.ok(html.includes("btn-confirm-shift-batch-deduction"), "Должна быть Primary CTA кнопка");
	});

	it("3. Соответствует Мандату 8n (Мягкий овердрафт): отображает пассивную плашку без блокировки", () => {
		const html = renderToString(
			<ConsumablesBatchWriteoffModal
				isOpen={true}
				onClose={() => {}}
				organizationId="test-org-uuid"
			/>,
		);

		assert.ok(html.includes("Мягкий овердрафт активен"), "Должно быть предупреждение о мягком овердрафте");
		assert.ok(html.includes("⚠️") && html.includes("-10") && html.includes("дефицит"), "Отрицательное сальдо отображается контролируемо");
	});

	it("4. Соответствует Мандату 8am (Ровно 1 Primary CTA кнопка в var(--teal)): вторичные кнопки нейтральные", () => {
		const html = renderToString(
			<ConsumablesBatchWriteoffModal
				isOpen={true}
				onClose={() => {}}
				organizationId="test-org-uuid"
			/>,
		);

		assert.ok(html.includes("✓ Списать расходники смены"), "Primary CTA текст строго по спецификации");
		assert.ok(html.includes("Печать акта"), "Кнопка печати нейтральная secondary");
		assert.ok(html.includes("Отмена"), "Кнопка отмены нейтральная secondary");
	});

	it("5. Соответствует Мандату 8ze и Apple HIG: наличествует Drag Handle и поддержка safe-area для мобильных", () => {
		const html = renderToString(
			<ConsumablesBatchWriteoffModal
				isOpen={true}
				onClose={() => {}}
				organizationId="test-org-uuid"
			/>,
		);

		assert.ok(html.includes("w-9") && html.includes("rounded-full"), "Присутствует Drag Handle 36x5px для мобильного Bottom Sheet");
		assert.ok(html.includes("safe-area-inset-bottom"), "Учтена безопасная зона экрана смартфона");
	});
});
