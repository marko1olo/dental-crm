/**
 * DENTE Dental CRM — Unit & Regression Tests for PriceDiffPanes Decomposition
 * Unified SSOT Architectural & Financial Gate (Mandates 8b, 8zi, 8e, 8n, 8am)
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import type { ExistingCatalogReference, IngestedMappingItem } from "../types";
import {
	PriceDiffComparisonRow,
	PriceDiffPanes,
	PriceDiffPanesToolbar,
	PriceDiffSourcePane,
	PriceDiffTable,
	PriceDiffTargetPane,
	calculateItemPriceDiff,
} from "../PriceDiffPanes";

const TEST_ITEMS: IngestedMappingItem[] = [
	{
		id: "srv-001",
		sourceLineNumber: 1,
		rawLine: "A16.07.002.001 Наложение световой пломбы Gradia Direct 5200 руб",
		cleanedTitle: "Наложение световой пломбы Gradia Direct",
		code804n: "A16.07.002.001",
		statutoryTitle804n: "Восстановление зуба пломбой с нарушением контактного пункта",
		category: "therapy",
		specialty: "therapist",
		priceRub: 5200,
		priceKopecks: 520000,
		confidence: 0.98,
		confidenceKind: "exact_code",
		suggestedAction: "update_existing",
		matchedExistingServiceId: "cat-001",
		matchedExistingTitle: "Пломбирование светоотверждаемым композитом",
		matchedExistingPriceRub: 4500,
		isApproved: true,
	},
	{
		id: "srv-002",
		sourceLineNumber: 2,
		rawLine: "Профессиональная ультразвуковая чистка зубов 3800 р",
		cleanedTitle: "Профессиональная ультразвуковая чистка зубов",
		code804n: "A16.07.051",
		statutoryTitle804n: "Профессиональная гигиена полости рта и зубов",
		category: "hygiene",
		specialty: "hygienist",
		priceRub: 3800,
		priceKopecks: 380000,
		confidence: 0.92,
		confidenceKind: "high_keyword",
		suggestedAction: "update_existing",
		matchedExistingServiceId: "cat-002",
		matchedExistingTitle: "Комплексная гигиена полости рта",
		matchedExistingPriceRub: 4200,
		isApproved: true,
	},
	{
		id: "srv-003",
		sourceLineNumber: 3,
		rawLine: "Удаление ретинированного дистопированного зуба мудрости 8500",
		cleanedTitle: "Удаление ретинированного дистопированного зуба мудрости",
		code804n: "A16.07.001.003",
		statutoryTitle804n: "Сложное удаление зуба с выкраиванием слизисто-надкостничного лоскута",
		category: "surgery",
		specialty: "surgeon",
		priceRub: 8500,
		priceKopecks: 850000,
		confidence: 0.89,
		confidenceKind: "high_keyword",
		suggestedAction: "create_new",
		isApproved: true,
	},
	{
		id: "srv-004",
		sourceLineNumber: 4,
		rawLine: "Осмотр врача и пришлифовка пломбы по гарантии 0",
		cleanedTitle: "Осмотр врача и пришлифовка пломбы по гарантии",
		code804n: "B01.065.002",
		statutoryTitle804n: "Прием (осмотр, консультация) врача-стоматолога повторный",
		category: "therapy",
		specialty: "therapist",
		priceRub: 0,
		priceKopecks: 0,
		confidence: 0.95,
		confidenceKind: "exact_code",
		suggestedAction: "create_new",
		isApproved: true,
	},
];

const TEST_CATALOG: ExistingCatalogReference[] = [
	{
		id: "cat-001",
		code: "A16.07.002.001",
		title: "Пломбирование светоотверждаемым композитом",
		basePriceRub: 4500,
		category: "therapy",
	},
	{
		id: "cat-002",
		code: "A16.07.051",
		title: "Комплексная гигиена полости рта",
		basePriceRub: 4200,
		category: "hygiene",
	},
];

describe("PriceDiffPanes Decomposition & Financial SSOT", () => {
	it("Gate 1: Exact integer kopeck price delta calculation and trends", () => {
		// Item 1: 4500 -> 5200 (+700 Rub, +70 000 Kopecks, +16%)
		const diff1 = calculateItemPriceDiff(TEST_ITEMS[0]);
		assert.strictEqual(diff1.oldPriceRub, 4500);
		assert.strictEqual(diff1.oldPriceKopecks, 450000);
		assert.strictEqual(diff1.newPriceRub, 5200);
		assert.strictEqual(diff1.newPriceKopecks, 520000);
		assert.strictEqual(diff1.deltaRub, 700);
		assert.strictEqual(diff1.deltaKopecks, 70000);
		assert.strictEqual(diff1.deltaPercent, 16);
		assert.strictEqual(diff1.trend, "increase");

		// Item 2: 4200 -> 3800 (-400 Rub, -40 000 Kopecks, -10%)
		const diff2 = calculateItemPriceDiff(TEST_ITEMS[1]);
		assert.strictEqual(diff2.oldPriceRub, 4200);
		assert.strictEqual(diff2.oldPriceKopecks, 420000);
		assert.strictEqual(diff2.newPriceRub, 3800);
		assert.strictEqual(diff2.newPriceKopecks, 380000);
		assert.strictEqual(diff2.deltaRub, -400);
		assert.strictEqual(diff2.deltaKopecks, -40000);
		assert.strictEqual(diff2.deltaPercent, -10);
		assert.strictEqual(diff2.trend, "decrease");

		// Item 3: New service (no old price) -> trend is "new"
		const diff3 = calculateItemPriceDiff(TEST_ITEMS[2]);
		assert.strictEqual(diff3.oldPriceRub, 0);
		assert.strictEqual(diff3.oldPriceKopecks, 0);
		assert.strictEqual(diff3.newPriceRub, 8500);
		assert.strictEqual(diff3.newPriceKopecks, 850000);
		assert.strictEqual(diff3.deltaRub, 8500);
		assert.strictEqual(diff3.deltaKopecks, 850000);
		assert.strictEqual(diff3.trend, "new");

		// Item 4: 0 Rub Warranty -> 0 Kopecks
		const diff4 = calculateItemPriceDiff(TEST_ITEMS[3]);
		assert.strictEqual(diff4.newPriceRub, 0);
		assert.strictEqual(diff4.newPriceKopecks, 0);
		assert.strictEqual(diff4.trend, "new");
	});

	it("Gate 2: Renders PriceDiffPanesToolbar with stats and filters", () => {
		const html = renderToString(
			<PriceDiffPanesToolbar
				stats={{
					total: 4,
					approvedCount: 4,
					exactCount: 2,
					newCount: 2,
					updateCount: 2,
					attentionCount: 0,
					increasedCount: 1,
					decreasedCount: 1,
					unchangedCount: 0,
					avgConfidence: 94,
					totalDeltaRub: 300,
				}}
				filterTab="all"
				onFilterTabChange={() => {}}
				searchTerm=""
				onSearchTermChange={() => {}}
				onAcceptAll={() => {}}
			/>,
		);

		assert.ok(html.includes("panes-diff-toolbar"));
		assert.ok(html.includes("Всего: 4"));
		assert.ok(html.includes("Коды: 2"));
		assert.ok(html.includes("94%"));
		assert.ok(html.includes("Все (4)"));
		assert.ok(html.includes("Новые (2)"));
		assert.ok(html.includes("Изменены (2)"));
		assert.ok(html.includes("panes-btn-accept-all"));
	});

	it("Gate 3: Renders PriceDiffSourcePane with source lines and line numbers", () => {
		const mockRef = { current: null };
		const html = renderToString(
			<PriceDiffSourcePane
				filteredItems={TEST_ITEMS}
				hoveredRowId={null}
				leftBodyRef={mockRef}
				onLeftScroll={() => {}}
				onHoverRow={() => {}}
			/>,
		);

		assert.ok(html.includes("diff-pane-left"));
		assert.ok(html.includes("1. Исходный прейскурант клиники"));
		assert.ok(html.includes("4 строк"));
		assert.ok(html.includes("#1"));
		assert.ok(html.includes("#2"));
		assert.ok(html.includes("Gradia Direct 5200 руб"));
		assert.ok(html.includes("чистка зубов 3800 р"));
	});

	it("Gate 4: Renders PriceDiffTargetPane with 1-click clinical actions and prices", () => {
		const mockRef = { current: null };
		const html = renderToString(
			<PriceDiffTargetPane
				filteredItems={TEST_ITEMS}
				totalApprovedCount={4}
				totalCount={4}
				activeLinkRowId={null}
				hoveredRowId={null}
				editingRowPriceId={null}
				editingRowPriceBuffer=""
				existingCatalog={TEST_CATALOG}
				rightBodyRef={mockRef}
				onRightScroll={() => {}}
				onHoverRow={() => {}}
				onToggleApproveRow={() => {}}
				onSetCreateNew={() => {}}
				onSetActiveLinkRowId={() => {}}
				onSetLinkExisting={() => {}}
				onStartEditPrice={() => {}}
				onPriceBufferChange={() => {}}
				onCommitRowPrice={() => {}}
				onCancelEditPrice={() => {}}
				onModifyRowDelta={() => {}}
				onSetRowZeroPrice={() => {}}
				formatPrice={(val) => `${val} ₽`}
			/>,
		);

		assert.ok(html.includes("diff-pane-right"));
		assert.ok(html.includes("2. Сопоставление со стандартной номенклатурой"));
		assert.ok(html.includes("Выбрано к загрузке: 4 из 4"));
		assert.ok(html.includes("5200 ₽"));
		assert.ok(html.includes("0 ₽ (Гарантия)"));
		assert.ok(html.includes("+500 ₽"));
		assert.ok(html.includes("-500 ₽"));
		assert.ok(html.includes("diff-mapped-row-srv-001"));
	});

	it("Gate 5: Renders PriceDiffComparisonRow visual card (Old -> New Price Delta)", () => {
		const html = renderToString(
			<PriceDiffComparisonRow
				item={TEST_ITEMS[0]}
				formatPrice={(val) => `${val} ₽`}
				isSelected={true}
				onToggleSelect={() => {}}
				onModifyDelta={() => {}}
				onSetZero={() => {}}
			/>,
		);

		assert.ok(html.includes("diff-comparison-row-srv-001"));
		assert.ok(html.includes("A16.07.002.001"));
		assert.ok(html.includes("Наложение световой пломбы Gradia Direct"));
		assert.ok(html.includes("4500 ₽"));
		assert.ok(html.includes("5200 ₽"));
		assert.ok(html.includes("+700 ₽ (+16%)"));
	});

	it("Gate 6: Mandate 8e Doctor Autonomy — Approval buttons are NEVER disabled", () => {
		const mockRef = { current: null };
		const html = renderToString(
			<PriceDiffPanes
				filteredItems={TEST_ITEMS}
				totalApprovedCount={4}
				totalCount={4}
				activeLinkRowId={null}
				hoveredRowId={null}
				editingRowPriceId={null}
				editingRowPriceBuffer=""
				existingCatalog={TEST_CATALOG}
				leftBodyRef={mockRef}
				rightBodyRef={mockRef}
				onLeftScroll={() => {}}
				onRightScroll={() => {}}
				onHoverRow={() => {}}
				onToggleApproveRow={() => {}}
				onSetCreateNew={() => {}}
				onSetActiveLinkRowId={() => {}}
				onSetLinkExisting={() => {}}
				onStartEditPrice={() => {}}
				onPriceBufferChange={() => {}}
				onCommitRowPrice={() => {}}
				onCancelEditPrice={() => {}}
				onModifyRowDelta={() => {}}
				onSetRowZeroPrice={() => {}}
				formatPrice={(val) => `${val} ₽`}
			/>,
		);

		// Button must not contain disabled attribute
		assert.strictEqual(html.includes('disabled=""'), false);
		assert.strictEqual(html.includes("disabled"), false);

		// Mobile tab bar contains touch target >= 44px
		assert.ok(html.includes("pricelist-diff-mobile-tabbar"));
		assert.ok(html.includes("min-height:44px") || html.includes("minHeight: \"44px\"") || html.includes("44px"));
	});

	it("Gate 7: Backward Compatibility — PriceDiffTable alias renders identical layout", () => {
		const mockRef = { current: null };
		const html = renderToString(
			<PriceDiffTable
				filteredItems={TEST_ITEMS}
				totalApprovedCount={4}
				totalCount={4}
				activeLinkRowId={null}
				hoveredRowId={null}
				editingRowPriceId={null}
				editingRowPriceBuffer=""
				existingCatalog={TEST_CATALOG}
				leftBodyRef={mockRef}
				rightBodyRef={mockRef}
				onLeftScroll={() => {}}
				onRightScroll={() => {}}
				onHoverRow={() => {}}
				onToggleApproveRow={() => {}}
				onSetCreateNew={() => {}}
				onSetActiveLinkRowId={() => {}}
				onSetLinkExisting={() => {}}
				onStartEditPrice={() => {}}
				onPriceBufferChange={() => {}}
				onCommitRowPrice={() => {}}
				onCancelEditPrice={() => {}}
				onModifyRowDelta={() => {}}
				onSetRowZeroPrice={() => {}}
				formatPrice={(val) => `${val} ₽`}
			/>,
		);

		assert.ok(html.includes("pricelist-diff-panes"));
		assert.ok(html.includes("diff-pane-left"));
		assert.ok(html.includes("diff-pane-right"));
	});
});
