/**
 * treatmentPlanSplitCatalogMode.test.tsx — Тестирование двухколоночного сплит-режима
 * каталога услуг и этапов плана лечения DENTE CRM.
 *
 * Использует чистый renderToString (React SSR) в соответствии с правилом Anti-Kustarnyi-DOM.
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanSplitView } from "../splitCatalog/TreatmentPlanSplitView";
import { SplitCatalogPanel } from "../splitCatalog/SplitCatalogPanel";
import { StageServicesTable } from "../stageEditor/StageServicesTable";
import { TreatmentPlanSpecialtyFilterBar } from "../TreatmentPlanSpecialtyFilterBar";
import type { TreatmentPlanStage } from "../types";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";

const MOCK_STAGES: TreatmentPlanStage[] = [
	{
		id: "stage-1",
		stageNumber: 1,
		title: "Терапевтическая санация",
		subtitle: "Лечение кариеса",
		clinicalGoal: "Устранение очагов инфекции и кариозных полостей",
		stageKind: "stage_1_therapy",
		items: [
			{
				id: "item-101",
				serviceCode: "A16.07.002.001",
				code804n: "A16.07.002.001",
				name: "Восстановление зуба светоотверждаемым композитом",
				category: "Терапия",
				toothNumber: 46,
				quantity: 1,
				unitPriceRub: 5200,
				priceRub: 5200,
				discountRub: 0,
				stageKind: "stage_1_therapy",
			},
		],
		totalRub: 5200,
		totalKopecks: 520000 as any,
		estimatedVisits: 1,
		estimatedWeeks: 1,
		order804nCodes: ["A16.07.002.001"],
		status: "draft",
	},
	{
		id: "stage-2",
		stageNumber: 2,
		title: "Хирургический этап",
		subtitle: "Имплантация",
		clinicalGoal: "Установка дентального имплантата",
		stageKind: "stage_2_surgery",
		items: [],
		totalRub: 0,
		totalKopecks: 0 as any,
		estimatedVisits: 1,
		estimatedWeeks: 2,
		order804nCodes: [],
		status: "draft",
	},
];

const MOCK_CATALOG: CatalogServiceLookupItem[] = [
	{
		id: "A16.07.002.001",
		code: "A16.07.002.001",
		order804nCode: "A16.07.002.001",
		title: "Восстановление зуба светоотверждаемым композитом",
		category: "Терапия",
		basePriceRub: 5200,
		active: true,
	},
	{
		id: "A16.07.004.001",
		code: "A16.07.004.001",
		order804nCode: "A16.07.004.001",
		title: "Эндодонтическое лечение одноканального зуба",
		category: "Эндодонтия",
		basePriceRub: 7500,
		active: true,
	},
	{
		id: "A16.07.054",
		code: "A16.07.054",
		order804nCode: "A16.07.054",
		title: "Внутрикостная дентальная имплантация",
		category: "Хирургия",
		basePriceRub: 35000,
		active: true,
	},
];

describe("TreatmentPlanSplitView — Двухколоночный сплит-режим «Каталог + Этапы» (Паритет со StomX)", () => {
	test("рендерит двухколоночный контейнер со сплит-панелью каталога и таблицей этапа", () => {
		const html = renderToString(
			<TreatmentPlanSplitView
				stages={MOCK_STAGES}
				catalog={MOCK_CATALOG}
				onQuickAddService={() => {}}
				onOpenCreateStageModal={() => {}}
			/>,
		);

		assert.ok(html.includes("treatment-plan-split-view"), "Контейнер сплит-режима должен присутствовать");
		assert.ok(html.includes("split-catalog-panel"), "Левая панель каталога должна присутствовать");
		assert.ok(html.includes("Каталог услуг клиники"), "Заголовок каталога должен быть на чистом русском языке");
		assert.ok(html.includes("split-stages-header-bar"), "Шапка этапов должна присутствовать");
		assert.ok(html.includes("stage-services-table-1"), "Таблица услуг активного этапа I должна рендериться");
	});

	test("левая панель каталога рендерит поиск, выбор зуба FDI и быстрые пакеты", () => {
		const html = renderToString(
			<SplitCatalogPanel
				catalog={MOCK_CATALOG}
				activeStageNumber={1}
				activeStageTitle="Терапевтическая санация"
				selectedTooth={46}
				onSelectTooth={() => {}}
				onAddServiceToStage={() => {}}
				onApplyBundle={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"split-catalog-search-input\""), "Поле мгновенного поиска услуг");
		assert.ok(html.includes("data-testid=\"split-catalog-tooth-bar\""), "Полоса выбора зуба FDI");
		assert.ok(html.includes("Целевой зуб (FDI):"), "Подпись выбора зуба");
		assert.ok(html.includes("data-testid=\"tooth-chip-46\""), "Чип зуба 46");
		assert.ok(html.includes("data-testid=\"bundle-quick-hygiene\""), "Быстрый клинический пакет профгигиены");
		assert.ok(html.includes("data-testid=\"bundle-quick-caries\""), "Быстрый клинический пакет кариеса");
		assert.ok(html.includes("Восстановление зуба светоотверждаемым композитом"), "Услуга из каталога");
		assert.ok(html.includes("split-service-price"), "Блок цены услуги в каталоге");
		assert.ok(html.includes("data-testid=\"quick-add-A16.07.002.001\""), "Кнопка 1-клик добавления услуги в этап");
	});

	test("правая колонка этапа StageServicesTable рендерит услуги со степперами [- 1 +], ценой и действиями", () => {
		const html = renderToString(
			<StageServicesTable
				stage={MOCK_STAGES[0]!}
				onUpdateItemQuantity={() => {}}
				onRemoveItem={() => {}}
				onStartStage={() => {}}
				onPayStage={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"stage-services-table-header\""), "Шапка таблицы услуг");
		assert.ok(html.includes("data-testid=\"stage-row-item-101\""), "Строка услуги в этапе");
		assert.ok(html.includes("title=\"Зуб 46\""), "Бейджик зуба №46 с подсказкой");
		assert.ok(html.includes("data-testid=\"dec-qty-item-101\""), "Кнопка уменьшения количества [-]");
		assert.ok(html.includes("data-testid=\"inc-qty-item-101\""), "Кнопка увеличения количества [+]");
		assert.ok(html.includes("data-testid=\"stage-remove-item-101\""), "Кнопка удаления услуги из этапа");
		assert.ok(html.includes("data-testid=\"stage-services-table-footer\""), "Подвал таблицы");
		assert.ok(html.includes("data-testid=\"stage-footer-pay-btn\""), "Кнопка передачи этапа в кассу");
		assert.ok(html.includes("stage-footer-total-sum"), "Итоговая сумма этапа");
	});

	test("TreatmentPlanSpecialtyFilterBar рендерит тумблер переключения режимов «Сплит-каталог» / «Карточки»", () => {
		const html = renderToString(
			<TreatmentPlanSpecialtyFilterBar
				stages={MOCK_STAGES}
				visibleStages={MOCK_STAGES}
				specialtyFilter="all"
				onSetSpecialtyFilter={() => {}}
				onOpenAddCatalogService={() => {}}
				onOpenCreateStageModal={() => {}}
				isSplitMode={true}
				onToggleSplitMode={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"tp-split-mode-btn\""), "Кнопка включения сплит-режима");
		assert.ok(html.includes("data-testid=\"tp-cards-mode-btn\""), "Кнопка включения карточек");
		assert.ok(html.includes("Сплит-каталог"), "Текст кнопки сплит-режима");
	});
});
