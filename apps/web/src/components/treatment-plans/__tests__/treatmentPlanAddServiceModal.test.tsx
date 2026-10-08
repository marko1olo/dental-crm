/**
 * treatmentPlanAddServiceModal.test.tsx — Тестирование рендеринга и эргономики модального окна
 * добавления услуги из клинического каталога в этап плана лечения.
 *
 * Использует чистый renderToString (React SSR) в соответствии с правилом Anti-Kustarnyi-DOM.
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanAddServiceModal } from "../TreatmentPlanAddServiceModal";
import type { TreatmentPlanStage } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";

const MOCK_STAGES: TreatmentPlanStage[] = [
	{
		id: "stage-1",
		stageNumber: 1,
		title: "Терапевтическая санация",
		subtitle: "Лечение кариеса",
		clinicalGoal: "Санация",
		stageKind: "stage_1_therapy",
		items: [],
		totalRub: 0,
		totalKopecks: 0,
		estimatedVisits: 1,
		estimatedWeeks: 1,
		order804nCodes: [],
		status: "draft",
	},
	{
		id: "stage-2",
		stageNumber: 2,
		title: "Хирургический этап",
		subtitle: "Удаление",
		clinicalGoal: "Удаление ретинированных зубов",
		stageKind: "stage_2_surgery",
		items: [],
		totalRub: 0,
		totalKopecks: 0,
		estimatedVisits: 1,
		estimatedWeeks: 1,
		order804nCodes: [],
		status: "draft",
	},
];

const MOCK_CATALOG: CatalogServiceLookupItem[] = [
	{
		id: "A16.07.002.001",
		code: "A16.07.002.001",
		order804nCode: "A16.07.002.001",
		title: "Восстановление зуба пломбой с нарушением формы зуба (глубокий кариес)",
		category: "Терапия",
		basePriceRub: 5200,
		active: true,
	},
	{
		id: "A16.07.001.001",
		code: "A16.07.001.001",
		order804nCode: "A16.07.001.001",
		title: "Удаление постоянного зуба простое с местной анестезией",
		category: "Хирургия",
		basePriceRub: 3500,
		active: true,
	},
];

describe("TreatmentPlanAddServiceModal — Модальное окно каталога клинических услуг", () => {
	test("не рендерит разметку, если isOpen === false", () => {
		const html = renderToString(
			<TreatmentPlanAddServiceModal
				isOpen={false}
				onClose={() => {}}
				stages={MOCK_STAGES}
				targetStage={MOCK_STAGES[0]!}
				catalog={MOCK_CATALOG}
				onAddService={() => {}}
			/>,
		);
		assert.equal(html, "");
	});

	test("рендерит чистый заголовок «Каталог клинических услуг» и подзаголовок без птичьего языка при isOpen === true", () => {
		const html = renderToString(
			<TreatmentPlanAddServiceModal
				isOpen={true}
				onClose={() => {}}
				stages={MOCK_STAGES}
				targetStage={MOCK_STAGES[0]!}
				catalog={MOCK_CATALOG}
				onAddService={() => {}}
			/>,
		);

		// Заголовок и подзаголовок
		assert.ok(html.includes("Каталог клинических услуг"), "Заголовок «Каталог клинических услуг» должен присутствовать");
		assert.ok(html.includes("Прейскурант и клинические позиции для плана лечения"), "Клинический подзаголовок должен присутствовать");
		assert.ok(html.includes("data-testid=\"add-service-from-catalog-modal\""), "Контейнер модалки должен иметь data-testid");
		assert.ok(html.includes("data-testid=\"catalog-service-search-input\""), "Поле поиска должно присутствовать");
	});

	test("рендерит позиции каталога с кодами, ценами и без обрезки названий", () => {
		const html = renderToString(
			<TreatmentPlanAddServiceModal
				isOpen={true}
				onClose={() => {}}
				stages={MOCK_STAGES}
				targetStage={MOCK_STAGES[0]!}
				catalog={MOCK_CATALOG}
				onAddService={() => {}}
			/>,
		);

		for (const item of MOCK_CATALOG) {
			assert.ok(
				html.includes(item.title),
				`Название услуги «${item.title}» должно присутствовать в разметке`,
			);
			assert.ok(
				html.includes(item.code!),
				`Код услуги «${item.code}» должен присутствовать`,
			);
			assert.ok(
				html.includes(`data-testid="catalog-item-${item.id}"`),
				`Элемент каталога ${item.id} должен присутствовать`,
			);
		}
	});

	test("рендерит кнопку «Добавить в этап» с доступным data-testid", () => {
		const html = renderToString(
			<TreatmentPlanAddServiceModal
				isOpen={true}
				onClose={() => {}}
				stages={MOCK_STAGES}
				targetStage={MOCK_STAGES[0]!}
				catalog={MOCK_CATALOG}
				onAddService={() => {}}
			/>,
		);

		assert.ok(
			html.includes("data-testid=\"confirm-add-service-to-stage-btn\""),
			"Кнопка добавления в этап должна иметь data-testid",
		);
		assert.ok(html.includes("Добавить в этап"), "Текст кнопки должен быть «Добавить в этап»");
		assert.ok(html.includes("Отмена"), "Кнопка отмены должна присутствовать");
	});

	test("рендерит дефолтный словарь ORDER_804N_DICTIONARY, если каталог пустой или не передан", () => {
		const html = renderToString(
			<TreatmentPlanAddServiceModal
				isOpen={true}
				onClose={() => {}}
				stages={MOCK_STAGES}
				targetStage={MOCK_STAGES[0]!}
				catalog={undefined}
				onAddService={() => {}}
			/>,
		);

		assert.ok(html.includes("Каталог клинических услуг"), "Модалка должна открываться с дефолтным каталогом");
		assert.ok(html.includes("data-testid=\"add-service-from-catalog-modal\""), "Контейнер должен быть отрендерен");
	});
});
