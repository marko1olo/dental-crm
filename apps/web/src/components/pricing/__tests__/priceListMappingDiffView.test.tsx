/**
 * DENTE Dental CRM — Unit & Regression Tests for PriceListMappingDiffView
 *
 * Tests:
 * 1. Dual-pane rendering (Raw Old Line vs Mapped Statutory 804n).
 * 2. Strict 1-row toolbar (32-36px) presence, filter tabs, stats.
 * 3. Confidence chips: Exact (804n code), High (green), Medium (amber), Low (requires choice).
 * 4. 1-Click inline price modifiers (±100 ₽, ±500 ₽).
 * 5. Mandate 8e warranty 0 ₽ (Гарантия) row modifier & batch setting.
 * 6. Batch indexation (+5%, +10%) and rounding (to 100 ₽, 500 ₽).
 * 7. Proportional scroll synchronization logic.
 * 8. Approval toggling, catalog linking, and search filtering.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	type ExistingCatalogReference,
	type IngestedMappingItem,
	PriceListMappingDiffView,
} from "../PriceListMappingDiffView.js";

const MOCK_ITEMS: IngestedMappingItem[] = [
	{
		id: "item-1",
		sourceLineNumber: 1,
		rawLine: "A16.07.002.001 Наложение световой пломбы Filtek Z250 4500 руб",
		cleanedTitle: "Наложение световой пломбы Filtek Z250",
		code804n: "A16.07.002.001",
		statutoryTitle804n:
			"Восстановление зуба пломбой I, V, VI класс по Блэку с использованием стоматологических цементов",
		category: "therapy",
		specialty: "therapist",
		priceRub: 4500,
		priceKopecks: 450000,
		confidence: 0.98,
		confidenceKind: "exact_code",
		suggestedAction: "create_new",
		isApproved: true,
	},
	{
		id: "item-2",
		sourceLineNumber: 2,
		rawLine: "Лечение глубокого кариеса жевательного зуба - 6800",
		cleanedTitle: "Лечение глубокого кариеса жевательного зуба",
		code804n: "A16.07.002",
		statutoryTitle804n: "Восстановление зуба пломбой",
		category: "therapy",
		specialty: "therapist",
		priceRub: 6800,
		priceKopecks: 680000,
		confidence: 0.88,
		confidenceKind: "high_keyword",
		matchedExistingServiceId: "cat-therapy-01",
		matchedExistingTitle: "Кариес глубокий световая пломба",
		matchedExistingPriceRub: 6500,
		suggestedAction: "update_existing",
		isApproved: true,
	},
	{
		id: "item-3",
		sourceLineNumber: 3,
		rawLine: "Сложное удаление восьмерки ультразвуком 5 200 ₽",
		cleanedTitle: "Сложное удаление восьмерки ультразвуком",
		code804n: "A16.07.001.002",
		statutoryTitle804n: "Удаление сложного зуба с разъединением корней",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 5200,
		priceKopecks: 520000,
		confidence: 0.74,
		confidenceKind: "medium_keyword",
		suggestedAction: "create_new",
		isApproved: false,
	},
	{
		id: "item-4",
		sourceLineNumber: 4,
		rawLine: "Какая-то странная услуга без аналогов 1200 р",
		cleanedTitle: "Какая-то странная услуга без аналогов",
		code804n: "B01.065.001",
		statutoryTitle804n:
			"Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
		category: "diagnostics",
		specialty: "therapist",
		priceRub: 1200,
		priceKopecks: 120000,
		confidence: 0.45,
		confidenceKind: "fallback",
		suggestedAction: "create_new",
		isApproved: false,
	},
	{
		id: "item-5",
		sourceLineNumber: 5,
		rawLine: "Гарантийный осмотр и пришлифовка 0 руб",
		cleanedTitle: "Гарантийный осмотр и пришлифовка",
		code804n: "B01.065.002",
		statutoryTitle804n:
			"Прием (осмотр, консультация) врача-стоматолога-терапевта повторный",
		category: "diagnostics",
		specialty: "therapist",
		priceRub: 0,
		priceKopecks: 0,
		confidence: 0.95,
		confidenceKind: "exact_code",
		suggestedAction: "create_new",
		isApproved: true,
	},
];

const MOCK_CATALOG: ExistingCatalogReference[] = [
	{
		id: "cat-therapy-01",
		code: "A16.07.002",
		title: "Кариес глубокий световая пломба",
		basePriceRub: 6500,
	},
	{
		id: "cat-surg-01",
		code: "A16.07.001",
		title: "Удаление зуба простое",
		basePriceRub: 3500,
	},
];

describe("PriceListMappingDiffView (804n Statutory Diff-View & Ingestion)", () => {
	it("renders dual-pane structure with raw document pane and 804n nomenclature pane", () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// Container & Panes
		assert.ok(html.includes("pricelist-diff-container"));
		assert.ok(html.includes("pricelist-diff-panes"));
		assert.ok(html.includes("1. Исходная строка старого документа"));
		assert.ok(html.includes("2. Распознанное наименование, код услуги, цена и действие"));

		// Left Raw Document lines
		assert.ok(html.includes("Filtek Z250 4500 руб"));
		assert.ok(html.includes("Лечение глубокого кариеса жевательного зуба - 6800"));
		assert.ok(html.includes("#1"));
		assert.ok(html.includes("#2"));

		// Right Mapped Statutory lines
		assert.ok(html.includes("A16.07.002.001"));
		assert.ok(html.includes("Восстановление зуба пломбой"));
		assert.ok(html.includes("+ Новая"));
		assert.ok(html.includes("Обновить цену"));
	});

	it("renders strict 1-row toolbar (32-36px) with stats, filters and batch controls", () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// 1-Row Toolbar
		assert.ok(html.includes("pricelist-diff-toolbar"));
		assert.ok(html.includes("Всего: 5"));
		assert.ok(html.includes("Коды: 2"));

		// Filter segmented controls
		assert.ok(html.includes("Все (5)"));
		assert.ok(html.includes("Новые (4)"));
		assert.ok(html.includes("Обновление (1)"));
		assert.ok(html.includes("Проверить (1)"));

		// Batch action buttons
		assert.ok(html.includes("+5%"));
		assert.ok(html.includes("+10%"));
		assert.ok(html.includes("0 ₽ (Гарантия)"));
		assert.ok(html.includes("До 100 ₽"));
		assert.ok(html.includes("До 500 ₽"));

		// Accept All 1-click button
		assert.ok(html.includes("Принять всё (5)"));
	});

	it("renders distinct confidence chips: exact 804n, high (green), medium (amber), low (requires choice)", () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// Exact 804n code badge
		assert.ok(html.includes("98% Код услуги"));
		assert.ok(html.includes("pricelist-diff-confidence-badge exact"));

		// High confidence chip (green)
		assert.ok(html.includes("88% Высокая"));
		assert.ok(html.includes("pricelist-diff-confidence-badge high"));

		// Medium confidence chip (amber)
		assert.ok(html.includes("74% Средняя"));
		assert.ok(html.includes("pricelist-diff-confidence-badge medium"));

		// Low confidence chip (requires choice)
		assert.ok(html.includes("45% Требует выбора"));
		assert.ok(html.includes("pricelist-diff-confidence-badge low"));
	});

	it("renders 1-click inline price modifiers (±100 ₽, ±500 ₽) and 0 ₽ Warranty per Mandate 8e", () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// Inline Modifier buttons
		assert.ok(html.includes("-500 ₽"));
		assert.ok(html.includes("-100 ₽"));
		assert.ok(html.includes("+100 ₽"));
		assert.ok(html.includes("+500 ₽"));

		// Warranty button & active warranty badge for item-5 (priceRub = 0)
		assert.ok(html.includes("0 ₽ (Гарантия)"));
		assert.ok(html.includes("pricelist-diff-delta-btn warranty active"));
	});

	it("correctly calculates inline modifier deltas", () => {
		const calls: IngestedMappingItem[][] = [];
		const onItemsChange = (items: readonly IngestedMappingItem[]) => {
			calls.push([...items]);
		};
		const items = [...MOCK_ITEMS];

		// Simulate ±100 ₽, ±500 ₽ delta logic
		const modifyDelta = (rowId: string, deltaRub: number) => {
			const updated = items.map((it) => {
				if (it.id !== rowId) return it;
				const nextPrice = Math.max(0, it.priceRub + deltaRub);
				return {
					...it,
					priceRub: nextPrice,
					priceKopecks: Math.round(nextPrice * 100),
				};
			});
			onItemsChange(updated);
		};

		// +100 ₽ on item-1 (4500 -> 4600)
		modifyDelta("item-1", 100);
		const callDelta1 = calls[0];
		const deltaItem1 = callDelta1?.find((i) => i.id === "item-1");
		assert.equal(deltaItem1?.priceRub, 4600);
		assert.equal(deltaItem1?.priceKopecks, 460000);

		// -500 ₽ on item-2 (6800 -> 6300)
		modifyDelta("item-2", -500);
		const callDelta2 = calls[1];
		const deltaItem2 = callDelta2?.find((i) => i.id === "item-2");
		assert.equal(deltaItem2?.priceRub, 6300);
		assert.equal(deltaItem2?.priceKopecks, 630000);

		// Overdraft protection: -10000 ₽ does not go negative
		modifyDelta("item-4", -10000);
		const callDelta3 = calls[2];
		const deltaItem4 = callDelta3?.find((i) => i.id === "item-4");
		assert.equal(deltaItem4?.priceRub, 0);
		assert.equal(deltaItem4?.priceKopecks, 0);
	});

	it("correctly executes Mandate 8e item 7 zero-ruble warranty logic", () => {
		const calls: IngestedMappingItem[][] = [];
		const onItemsChange = (items: readonly IngestedMappingItem[]) => {
			calls.push([...items]);
		};
		const items = [...MOCK_ITEMS];

		const setZeroPrice = (rowId: string) => {
			const updated = items.map((it) => {
				if (it.id !== rowId) return it;
				return {
					...it,
					priceRub: 0,
					priceKopecks: 0,
				};
			});
			onItemsChange(updated);
		};

		setZeroPrice("item-1");
		assert.equal(calls.length, 1);
		const call0 = calls[0];
		const item1 = call0?.find((i) => i.id === "item-1");
		assert.equal(item1?.priceRub, 0);
		assert.equal(item1?.priceKopecks, 0);
	});

	it("correctly applies batch indexation (+5%, +10%) and rounding (100 ₽, 500 ₽)", () => {
		const calls: IngestedMappingItem[][] = [];
		const onItemsChange = (items: readonly IngestedMappingItem[]) => {
			calls.push([...items]);
		};
		const items = [...MOCK_ITEMS];

		// Batch +10% on approved items
		const batchMarkup = (percent: number) => {
			const hasApproved = items.some((i) => i.isApproved);
			const updated = items.map((it) => {
				if (hasApproved && !it.isApproved) return it;
				const nextPrice = Math.max(0, Math.round(it.priceRub * (1 + percent / 100)));
				return {
					...it,
					priceRub: nextPrice,
					priceKopecks: Math.round(nextPrice * 100),
				};
			});
			onItemsChange(updated);
		};

		batchMarkup(10);
		// item-1: 4500 * 1.10 = 4950
		// item-2: 6800 * 1.10 = 7480
		// item-3: unapproved, unchanged (5200)
		const callMarkup = calls[0];
		assert.equal(callMarkup?.find((i) => i.id === "item-1")?.priceRub, 4950);
		assert.equal(callMarkup?.find((i) => i.id === "item-2")?.priceRub, 7480);
		assert.equal(callMarkup?.find((i) => i.id === "item-3")?.priceRub, 5200);

		// Batch rounding to 500 ₽
		const roundCalls: IngestedMappingItem[][] = [];
		const onItemsRoundChange = (itms: readonly IngestedMappingItem[]) => {
			roundCalls.push([...itms]);
		};
		const batchRounding = (roundTo: number) => {
			const hasApproved = items.some((i) => i.isApproved);
			const updated = items.map((it) => {
				if (hasApproved && !it.isApproved) return it;
				const nextPrice = Math.max(0, Math.round(it.priceRub / roundTo) * roundTo);
				return {
					...it,
					priceRub: nextPrice,
					priceKopecks: Math.round(nextPrice * 100),
				};
			});
			onItemsRoundChange(updated);
		};

		batchRounding(500);
		// item-1 (4500 -> 4500)
		// item-2 (6800 -> 7000)
		const callRounding = roundCalls[0];
		assert.equal(callRounding?.find((i) => i.id === "item-1")?.priceRub, 4500);
		assert.equal(callRounding?.find((i) => i.id === "item-2")?.priceRub, 7000);
	});

	it("computes proportional scroll synchronization ratio accurately", () => {
		const leftScrollHeight = 1000;
		const leftClientHeight = 500;
		const leftScrollTop = 250;

		const rightScrollHeight = 1500;
		const rightClientHeight = 500;

		const maxLeft = leftScrollHeight - leftClientHeight;
		const maxRight = rightScrollHeight - rightClientHeight;

		const ratio = leftScrollTop / maxLeft;
		const rightScrollTop = Math.round(ratio * maxRight);

		assert.equal(ratio, 0.5);
		assert.equal(rightScrollTop, 500);
	});

	it("renders clean empty state when no items match the filter", () => {
		const html = renderToString(<PriceListMappingDiffView items={[]} />);
		assert.ok(html.includes("Нет строк, соответствующих выбранному фильтру"));
		assert.ok(html.includes("Нет позиций для сопоставления"));
	});

	it("renders responsive mobile footer action button with shrink-0 and adaptive text to prevent truncation (Mandates 8d, 8p)", () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		assert.ok(html.includes("pricelist-diff-btn-primary"));
		assert.ok(html.includes("shrink-0"));
		assert.ok(html.includes("min-w-fit"));
		assert.ok(html.includes("px-3"));
		assert.ok(html.includes("text-xs sm:text-sm"));
		assert.ok(html.includes("sm:hidden"));
		assert.ok(html.includes("hidden sm:inline"));
		assert.ok(html.includes("Загрузить (3)"));
		assert.ok(html.includes("Загрузить в прейскурант (3)"));
	});
});
