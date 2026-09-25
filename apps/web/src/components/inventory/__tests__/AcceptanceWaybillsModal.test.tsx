/**
 * ============================================================================
 * AcceptanceWaybillsModal.test.tsx
 * DENTE Dental CRM — Unit tests for AcceptanceWaybillsModal (React Layer)
 * 
 * Инварианты:
 * 1. Десктопная эргономика 32-36px, быстрый ввод и 1-клик шаблоны стоматологических ТМЦ.
 * 2. FEFO-индикаторы партий со сроками годности и копеечно-точный расчет сумм и НДС.
 * 3. Мандат 8n: мягкий овердрафт без блокировок, автоматическое погашение дефицита.
 * 4. Регламентная форма ТОРГ-12 и экспорт в CSV без больничного мусора.
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AcceptanceWaybillsModal } from "../AcceptanceWaybillsModal.js";
import { createSampleDentalWaybill } from "../acceptanceWaybillsEngine.js";

describe("AcceptanceWaybillsModal — React Presentation & Ergonomics", () => {
	it("1. Не рендерит ничего в DOM, когда isOpen === false", () => {
		const html = renderToString(
			<AcceptanceWaybillsModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);
		assert.equal(html, "");
	});

	it("2. Рендерит модальное окно оприходования накладной со стоматологическими поставщиками и материалами", () => {
		const sampleWaybill = createSampleDentalWaybill();

		const html = renderToString(
			<AcceptanceWaybillsModal
				isOpen={true}
				onClose={() => {}}
				initialWaybill={sampleWaybill}
				inventoryItems={[
					{
						id: "item_anesthetic_1",
						name: "Септанест с адреналином 1:100 000 (50 карпул/уп)",
						stockQuantity: -4, // Мягкий овердрафт после списания у кресла
						unitCostRub: "5400",
						unit: "упак",
					},
				]}
			/>,
		);

		// Заголовок модального окна и бейдж мандатов
		assert.ok(html.includes("Приходная накладная поставщика"), "Заголовок модального окна должен присутствовать");
		assert.ok(html.includes("Мандаты 8e / 8n"), "Бейдж соответствия мандатам должен присутствовать");

		// Поставщики
		assert.ok(html.includes("Стомторг"), "Стомторг должен быть в списке");
		assert.ok(html.includes("ВладМиВа"), "ВладМиВа должна быть в списке");

		// 1-клик пресеты стоматологических материалов
		assert.ok(html.includes("Септанест"), "Шаблон Септанеста должен присутствовать в пресетах");
		assert.ok(html.includes("Filtek"), "Шаблон Filtek должен присутствовать в пресетах");
		assert.ok(html.includes("OptiBond"), "Шаблон OptiBond должен присутствовать в пресетах");
		assert.ok(html.includes("ProTaper"), "Шаблон ProTaper должен присутствовать в пресетах");

		// FEFO индикация и партии
		assert.ok(html.includes("FEFO"), "FEFO статус должен отображаться");
		assert.ok(html.includes("FLTK-") || html.includes("SEPT-"), "Номер партии должен отображаться");

		// Мандат 8n: индикация мягкого овердрафта (дефицит -4)
		assert.ok(html.includes("Дефицит у кресла") || html.includes("овердрафт") || html.includes("-4"), "Индикатор овердрафта должен отображаться");

		// Управляющие кнопки
		assert.ok(html.includes("data-testid=\"btn-post-acceptance-waybill\""), "Кнопка проведения накладной должна присутствовать");
		assert.ok(html.includes("ТОРГ-12"), "Кнопка печати ТОРГ-12 должна присутствовать");
		assert.ok(html.includes("CSV"), "Кнопка экспорта в CSV должна присутствовать");

		// Запрет больничного мусора
		assert.ok(!html.includes("начмед"), "Не должно быть начмеда");
		assert.ok(!html.includes("комиссия из 3 человек"), "Не должно быть больничных комиссий");
		assert.ok(!html.includes("наркотическ"), "Не должно быть наркотических форм");
	});
});
