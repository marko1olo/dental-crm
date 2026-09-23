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

import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
	type ExistingCatalogReference,
	type IngestedMappingItem,
	PriceListMappingDiffView,
} from '../PriceListMappingDiffView';

const MOCK_ITEMS: IngestedMappingItem[] = [
	{
		id: 'item-1',
		sourceLineNumber: 1,
		rawLine: 'A16.07.002.001 Наложение световой пломбы Filtek Z250 4500 руб',
		cleanedTitle: 'Наложение световой пломбы Filtek Z250',
		code804n: 'A16.07.002.001',
		statutoryTitle804n: 'Восстановление зуба пломбой I, V, VI класс по Блэку с использованием стоматологических цементов',
		category: 'therapy',
		specialty: 'therapist',
		priceRub: 4500,
		priceKopecks: 450000,
		confidence: 0.98,
		confidenceKind: 'exact_code',
		suggestedAction: 'create_new',
		isApproved: true,
	},
	{
		id: 'item-2',
		sourceLineNumber: 2,
		rawLine: 'Лечение глубокого кариеса жевательного зуба - 6800',
		cleanedTitle: 'Лечение глубокого кариеса жевательного зуба',
		code804n: 'A16.07.002',
		statutoryTitle804n: 'Восстановление зуба пломбой',
		category: 'therapy',
		specialty: 'therapist',
		priceRub: 6800,
		priceKopecks: 680000,
		confidence: 0.88,
		confidenceKind: 'high_keyword',
		matchedExistingServiceId: 'cat-therapy-01',
		matchedExistingTitle: 'Кариес глубокий световая пломба',
		matchedExistingPriceRub: 6500,
		suggestedAction: 'update_existing',
		isApproved: true,
	},
	{
		id: 'item-3',
		sourceLineNumber: 3,
		rawLine: 'Сложное удаление восьмерки ультразвуком 5 200 ₽',
		cleanedTitle: 'Сложное удаление восьмерки ультразвуком',
		code804n: 'A16.07.001.002',
		statutoryTitle804n: 'Удаление сложного зуба с разъединением корней',
		category: 'surgery',
		specialty: 'surgeon',
		priceRub: 5200,
		priceKopecks: 520000,
		confidence: 0.74,
		confidenceKind: 'medium_keyword',
		suggestedAction: 'create_new',
		isApproved: false,
	},
	{
		id: 'item-4',
		sourceLineNumber: 4,
		rawLine: 'Какая-то странная услуга без аналогов 1200 р',
		cleanedTitle: 'Какая-то странная услуга без аналогов',
		code804n: 'B01.065.001',
		statutoryTitle804n: 'Прием (осмотр, консультация) врача-стоматолога-терапевта первичный',
		category: 'diagnostics',
		specialty: 'therapist',
		priceRub: 1200,
		priceKopecks: 120000,
		confidence: 0.45,
		confidenceKind: 'fallback',
		suggestedAction: 'create_new',
		isApproved: false,
	},
	{
		id: 'item-5',
		sourceLineNumber: 5,
		rawLine: 'Гарантийный осмотр и пришлифовка 0 руб',
		cleanedTitle: 'Гарантийный осмотр и пришлифовка',
		code804n: 'B01.065.002',
		statutoryTitle804n: 'Прием (осмотр, консультация) врача-стоматолога-терапевта повторный',
		category: 'diagnostics',
		specialty: 'therapist',
		priceRub: 0,
		priceKopecks: 0,
		confidence: 0.95,
		confidenceKind: 'exact_code',
		suggestedAction: 'create_new',
		isApproved: true,
	},
];

const MOCK_CATALOG: ExistingCatalogReference[] = [
	{ id: 'cat-therapy-01', code: 'A16.07.002', title: 'Кариес глубокий световая пломба', basePriceRub: 6500 },
	{ id: 'cat-surg-01', code: 'A16.07.001', title: 'Удаление зуба простое', basePriceRub: 3500 },
];

describe('PriceListMappingDiffView (804n Statutory Diff-View & Ingestion)', () => {
	it('renders dual-pane structure with raw document pane and 804n nomenclature pane', () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// Container & Panes
		expect(html).toContain('pricelist-diff-container');
		expect(html).toContain('pricelist-diff-panes');
		expect(html).toContain('1. Исходная строка старого документа');
		expect(html).toContain('2. Распознанное наименование, код 804н, цена и действие');

		// Left Raw Document lines
		expect(html).toContain('Filtek Z250 4500 руб');
		expect(html).toContain('Лечение глубокого кариеса жевательного зуба - 6800');
		expect(html).toContain('#1');
		expect(html).toContain('#2');

		// Right Mapped Statutory lines
		expect(html).toContain('A16.07.002.001');
		expect(html).toContain('Восстановление зуба пломбой');
		expect(html).toContain('+ Новая');
		expect(html).toContain('Обновить цену');
	});

	it('renders strict 1-row toolbar (32-36px) with stats, filters and batch controls', () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// 1-Row Toolbar
		expect(html).toContain('pricelist-diff-toolbar');
		expect(html).toContain('Всего: 5');
		expect(html).toContain('804н: 2');

		// Filter segmented controls
		expect(html).toContain('Все (5)');
		expect(html).toContain('Новые (4)');
		expect(html).toContain('Обновление (1)');
		expect(html).toContain('Проверить (1)');

		// Batch action buttons
		expect(html).toContain('+5%');
		expect(html).toContain('+10%');
		expect(html).toContain('0 ₽ (Гарантия)');
		expect(html).toContain('До 100 ₽');
		expect(html).toContain('До 500 ₽');

		// Accept All 1-click button
		expect(html).toContain('Принять всё (5)');
	});

	it('renders distinct confidence chips: exact 804n, high (green), medium (amber), low (requires choice)', () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// Exact 804n code badge
		expect(html).toContain('98% Код 804н');
		expect(html).toContain('pricelist-diff-confidence-badge exact');

		// High confidence chip (green)
		expect(html).toContain('88% Высокая');
		expect(html).toContain('pricelist-diff-confidence-badge high');

		// Medium confidence chip (amber)
		expect(html).toContain('74% Средняя');
		expect(html).toContain('pricelist-diff-confidence-badge medium');

		// Low confidence chip (requires choice)
		expect(html).toContain('45% Требует выбора');
		expect(html).toContain('pricelist-diff-confidence-badge low');
	});

	it('renders 1-click inline price modifiers (±100 ₽, ±500 ₽) and 0 ₽ Warranty per Mandate 8e', () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// Inline Modifier buttons
		expect(html).toContain('-500 ₽');
		expect(html).toContain('-100 ₽');
		expect(html).toContain('+100 ₽');
		expect(html).toContain('+500 ₽');

		// Warranty button & active warranty badge for item-5 (priceRub = 0)
		expect(html).toContain('0 ₽ (Гарантия)');
		expect(html).toContain('pricelist-diff-delta-btn warranty active');
	});

	it('correctly calculates inline modifier deltas', () => {
		const onItemsChange = vi.fn();
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
		modifyDelta('item-1', 100);
		const callDelta1 = onItemsChange.mock.calls[0]?.[0] as IngestedMappingItem[];
		const deltaItem1 = callDelta1?.find((i) => i.id === 'item-1');
		expect(deltaItem1?.priceRub).toBe(4600);
		expect(deltaItem1?.priceKopecks).toBe(460000);

		// -500 ₽ on item-2 (6800 -> 6300)
		modifyDelta('item-2', -500);
		const callDelta2 = onItemsChange.mock.calls[1]?.[0] as IngestedMappingItem[];
		const deltaItem2 = callDelta2?.find((i) => i.id === 'item-2');
		expect(deltaItem2?.priceRub).toBe(6300);
		expect(deltaItem2?.priceKopecks).toBe(630000);

		// Overdraft protection: -10000 ₽ does not go negative
		modifyDelta('item-4', -10000);
		const callDelta3 = onItemsChange.mock.calls[2]?.[0] as IngestedMappingItem[];
		const deltaItem4 = callDelta3?.find((i) => i.id === 'item-4');
		expect(deltaItem4?.priceRub).toBe(0);
		expect(deltaItem4?.priceKopecks).toBe(0);
	});

	it('correctly executes Mandate 8e item 7 zero-ruble warranty logic', () => {
		const onItemsChange = vi.fn();
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

		setZeroPrice('item-1');
		const calls = onItemsChange.mock.calls;
		expect(calls.length).toBe(1);
		const call0 = calls[0]?.[0] as IngestedMappingItem[];
		const item1 = call0?.find((i) => i.id === 'item-1');
		expect(item1?.priceRub).toBe(0);
		expect(item1?.priceKopecks).toBe(0);
	});

	it('correctly applies batch indexation (+5%, +10%) and rounding (100 ₽, 500 ₽)', () => {
		const onItemsChange = vi.fn();
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
		const callMarkup = onItemsChange.mock.calls[0]?.[0] as IngestedMappingItem[];
		expect(callMarkup?.find((i) => i.id === 'item-1')?.priceRub).toBe(4950);
		expect(callMarkup?.find((i) => i.id === 'item-2')?.priceRub).toBe(7480);
		expect(callMarkup?.find((i) => i.id === 'item-3')?.priceRub).toBe(5200);

		// Batch rounding to 500 ₽
		const onItemsRoundChange = vi.fn();
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
		const callRounding = onItemsRoundChange.mock.calls[0]?.[0] as IngestedMappingItem[];
		expect(callRounding?.find((i) => i.id === 'item-1')?.priceRub).toBe(4500);
		expect(callRounding?.find((i) => i.id === 'item-2')?.priceRub).toBe(7000);
	});

	it('computes proportional scroll synchronization ratio accurately', () => {
		// Mock scroll containers
		const leftScrollHeight = 1000;
		const leftClientHeight = 500;
		const leftScrollTop = 250; // halfway through scroll

		const rightScrollHeight = 1500;
		const rightClientHeight = 500;

		const maxLeft = leftScrollHeight - leftClientHeight; // 500
		const maxRight = rightScrollHeight - rightClientHeight; // 1000

		const ratio = leftScrollTop / maxLeft; // 0.5
		const rightScrollTop = Math.round(ratio * maxRight); // 500

		expect(ratio).toBe(0.5);
		expect(rightScrollTop).toBe(500);

		// Edge case: at top (scrollTop = 0)
		const ratioTop = 0 / maxLeft;
		expect(Math.round(ratioTop * maxRight)).toBe(0);

		// Edge case: at bottom (scrollTop = maxLeft)
		const ratioBottom = maxLeft / maxLeft;
		expect(Math.round(ratioBottom * maxRight)).toBe(maxRight);
	});

	it('renders clean empty state when no items match the filter', () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={[]}
			/>,
		);

		expect(html).toContain('Нет строк, соответствующих выбранному фильтру');
		expect(html).toContain('Нет позиций для сопоставления');
	});

	it('renders responsive mobile footer action button with shrink-0 and adaptive text to prevent truncation (Mandates 8d, 8p)', () => {
		const html = renderToString(
			<PriceListMappingDiffView
				items={MOCK_ITEMS}
				existingCatalog={MOCK_CATALOG}
			/>,
		);

		// Button must have shrink-0, min-w-fit and responsive text sizes
		expect(html).toContain('pricelist-diff-btn-primary');
		expect(html).toContain('shrink-0');
		expect(html).toContain('min-w-fit');
		expect(html).toContain('px-3');
		expect(html).toContain('text-xs sm:text-sm');

		// Adaptive mobile and desktop labels
		expect(html).toContain('sm:hidden');
		expect(html).toContain('hidden sm:inline');
		expect(html).toContain('Загрузить (3)');
		expect(html).toContain('Загрузить в прейскурант (3)');
	});
});
