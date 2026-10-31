/**
 * apps/web/src/components/inventory/__tests__/consumablesBatchWriteoffDecomposition.test.tsx
 *
 * Тесты декомпозированных модулей пакетного списания расходников:
 * - useConsumablesBatchWriteoff
 * - BatchWriteoffShiftStats
 * - BatchWriteoffConsumablesTable
 * - BatchWriteoffFooterActions
 * Соответствует Мандатам 8e, 8n, 8am, 8ze.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { DEFAULT_SHIFT_DATA } from "../writeoff/useConsumablesBatchWriteoff.js";
import { BatchWriteoffShiftStats } from "../writeoff/BatchWriteoffShiftStats.js";
import { BatchWriteoffConsumablesTable } from "../writeoff/BatchWriteoffConsumablesTable.js";
import { BatchWriteoffFooterActions } from "../writeoff/BatchWriteoffFooterActions.js";

describe("Consumables Batch Writeoff Decomposed Modules Suite (Mandates 8e, 8n, 8am, 8ze)", () => {
	it("1. BatchWriteoffShiftStats: рендерит показатели смены, процедуры и плашку мягкого овердрафта", () => {
		const html = renderToString(
			<BatchWriteoffShiftStats
				date={DEFAULT_SHIFT_DATA.date}
				shiftStats={DEFAULT_SHIFT_DATA.shiftStats}
				hasOverdraft={true}
			/>,
		);

		assert.ok(html.includes("Дата смены"), "Отображается поле 'Дата смены'");
		assert.ok(html.includes(DEFAULT_SHIFT_DATA.date), "Отображается текущая дата смены");
		assert.ok(html.includes("пациентов") && html.includes("12"), "Отображается количество завершенных приёмов");
		assert.ok(html.includes("Лечение кариеса"), "Отображается процедура из breakdown");
		assert.ok(html.includes("Мягкий овердрафт активен (Мандат 8n)"), "Пассивное предупреждение овердрафта наличествует");
		assert.ok(html.includes("btn-generate-supplier-order"), "Присутствует кнопка формирования заказа поставщику");
	});

	it("2. BatchWriteoffShiftStats: при hasOverdraft = false не показывает плашку дефицита", () => {
		const html = renderToString(
			<BatchWriteoffShiftStats
				date={DEFAULT_SHIFT_DATA.date}
				shiftStats={DEFAULT_SHIFT_DATA.shiftStats}
				hasOverdraft={false}
			/>,
		);

		assert.ok(!html.includes("Мягкий овердрафт активен"), "Плашка дефицита скрыта при отсутствии овердрафта");
		assert.ok(!html.includes("btn-generate-supplier-order"), "Кнопка заказа поставщику скрыта");
	});

	it("3. BatchWriteoffConsumablesTable: корректно отображает список материалов с овердрафтом", () => {
		const html = renderToString(
			<BatchWriteoffConsumablesTable
				consumables={DEFAULT_SHIFT_DATA.consumablesSummary}
			/>,
		);

		assert.ok(html.includes("Перчатки смотровые нитриловые"), "Отображается материал нормы");
		assert.ok(html.includes("Иглы инъекционные стоматологические"), "Отображается материал с дефицитом");
		assert.ok(html.includes("дефицит") && html.includes("-10"), "Отрицательный остаток четко помечен дефицитом");
		assert.ok(html.includes("Материалы по техкартам") && html.includes("8"), "Шапка содержит точное число материалов");
	});

	it("4. BatchWriteoffFooterActions: кнопка списания активна (ноль блокировок, Мандат 8e) и имеет цвет var(--teal)", () => {
		const html = renderToString(
			<BatchWriteoffFooterActions
				isSubmitting={false}
				onPrintAct={() => {}}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);

		assert.ok(html.includes("btn-confirm-shift-batch-deduction"), "Primary CTA кнопка наличествует");
		assert.ok(html.includes("✓ Списать расходники смены"), "Текст кнопки списания");
		assert.ok(!html.includes("disabled"), "Кнопка НЕ заблокирована (Мандат 8e)");
		assert.ok(html.includes("var(--teal, #0d9488)"), "Цвет кнопки var(--teal)");
		assert.ok(html.includes("Печать акта"), "Кнопка печати акта наличествует");
		assert.ok(html.includes("Отмена"), "Кнопка отмены наличествует");
	});

	it("5. BatchWriteoffFooterActions: при isSubmitting = true кнопка блокируется и показывает спиннер", () => {
		const html = renderToString(
			<BatchWriteoffFooterActions
				isSubmitting={true}
				onPrintAct={() => {}}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);

		assert.ok(html.includes("disabled"), "При отправке кнопка блокируется от повторных кликов");
		assert.ok(html.includes("Списание расходников..."), "Текст состояния отправки");
	});
});
