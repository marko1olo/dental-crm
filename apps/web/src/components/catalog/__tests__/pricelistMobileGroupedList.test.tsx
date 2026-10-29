import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import { PricelistMobileGroupedList } from "../pricelist/PricelistMobileGroupedList";
import { formatRubles } from "../pricelist/servicePricelist/currencyMath";
import type { ServicePricelistItem } from "../pricelist/servicePricelistPresets";

const SAMPLE_ITEMS: readonly ServicePricelistItem[] = [
	{
		id: "srv-1",
		code804n: "A16.07.002.001",
		commercialTitle: "Лечение кариеса световой пломбой Filtek",
		statutoryTitle804n: "Восстановление зуба пломбой",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		estimatedDurationMin: 45,
		isActive: true,
		isArchived: false,
		vatRate: 0,
		vatExemptionArticle: "ст. 149 НК РФ",
		icd10Indications: ["K02.1"],
		tags: ["терапия", "кариес"],
	},
	{
		id: "srv-2",
		code804n: "A16.07.001",
		commercialTitle: "Удаление зуба простое",
		statutoryTitle804n: "Удаление зуба",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 3500,
		basePriceKopecks: 350000,
		estimatedDurationMin: 30,
		isActive: true,
		isArchived: false,
		vatRate: 0,
		vatExemptionArticle: "ст. 149 НК РФ",
		icd10Indications: ["K04.0"],
		tags: ["хирургия"],
	},
];

describe("PricelistMobileGroupedList — Apple HIG Touch Ergonomics", () => {
	it("renders mobile grouped list cards with prices, categories and action buttons", () => {
		const html = renderToString(
			<PricelistMobileGroupedList
				visibleItems={SAMPLE_ITEMS}
				selectedItemIds={new Set(["srv-1"])}
				activeTier="standard"
				onToggleSelectItem={() => {}}
				onSetZeroWarrantyPrice={() => {}}
				onEditItem={() => {}}
				onDuplicateItem={() => {}}
				onDeleteItem={() => {}}
				hasMore={true}
				remainingCount={28}
				filteredCount={2}
				onShowMore={() => {}}
			/>,
		);

		assert.ok(html.includes("pricelist-mobile-grouped-list"));
		assert.ok(html.includes("Лечение кариеса световой пломбой Filtek"));
		assert.ok(html.includes(formatRubles(4500)));
		assert.ok(html.includes("A16.07.002.001"));
		assert.ok(html.includes("45"));
		assert.ok(html.includes("мин"));
		assert.ok(html.includes("0 ₽"));
		assert.ok(html.includes("Показать ещё 40 услуг"));
		assert.ok(html.includes("28"));
	});

	it("renders mobile empty state when filteredCount is 0", () => {
		const html = renderToString(
			<PricelistMobileGroupedList
				visibleItems={[]}
				selectedItemIds={new Set()}
				activeTier="standard"
				onToggleSelectItem={() => {}}
				onSetZeroWarrantyPrice={() => {}}
				onEditItem={() => {}}
				onDuplicateItem={() => {}}
				onDeleteItem={() => {}}
				hasMore={false}
				remainingCount={0}
				filteredCount={0}
				onShowMore={() => {}}
			/>,
		);

		assert.ok(html.includes("pricelist-mobile-empty-state"));
		assert.ok(html.includes("Позиции по запросу не найдены"));
	});
});
