/**
 * apps/web/src/tests/mobileInventoryGroupedList.test.tsx
 *
 * Automated verification of Mobile Inventory & Chairside Consumables (§2.3 Apple Store Inventory HIG):
 * 1. 1-Row iOS Search Bar & Horizontal Category Chips: [ Все | Анестезия | Пломбировочные | Эндодонтия | Слепочные | СИЗ ].
 * 2. Grouped Inset List Cards: single rounded 16px card container, inset separators, category-tinted icons.
 * 3. Clinical Ergonomics: Russian material names, stock balance, amber/rose critical stock badges.
 * 4. 1-Tap Quick Write-off Button: «-1 шт» with >=44x44px touch target (Doctor in gloves mandate).
 * 5. Natural Thumb Zone Sticky Bar: fixed bottom [ + Оприходовать партию ].
 * 6. Native iOS Bottom Sheet: rounded-t 24px, drag handle, large stepper & quick quantity chips.
 * 7. 0px horizontal drift protection & CSS token purity.
 */

import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import {
	MobileInventoryGroupedList,
	matchesCategory,
	getItemCategoryType,
	MOBILE_INVENTORY_CATEGORIES,
} from "../components/inventory/MobileInventoryGroupedList.js";
import type { InventoryItem } from "../components/inventory/inventoryDataMappers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../..");

test("Mobile Inventory HIG — category matching and clinical classification helpers", () => {
	// Sample items across clinical specialties
	const ultracain: InventoryItem = {
		id: "item-1",
		name: "Ультракаин Д-С Форте (100 карпул)",
		category: "Анестетики",
		stockQuantity: 48,
		criticalThreshold: 10,
		unitCostRub: "6500",
		updatedAt: new Date().toISOString(),
		unit: "карпул",
	};

	const filtek: InventoryItem = {
		id: "item-2",
		name: "Композит Filtek Ultimate Body A2 4г",
		category: "Терапия / Композиты",
		stockQuantity: 3,
		criticalThreshold: 5,
		unitCostRub: "2850",
		updatedAt: new Date().toISOString(),
		unit: "шприц",
	};

	const protaper: InventoryItem = {
		id: "item-3",
		name: "Эндодонтические файлы ProTaper Gold F1-F3",
		category: "Эндодонтия",
		stockQuantity: 8,
		criticalThreshold: 5,
		unitCostRub: "1900",
		updatedAt: new Date().toISOString(),
		unit: "упак",
	};

	const speedex: InventoryItem = {
		id: "item-4",
		name: "Слепочная масса Speedex Putty 910мл",
		category: "Слепочные материалы",
		stockQuantity: 2,
		criticalThreshold: 3,
		unitCostRub: "3200",
		updatedAt: new Date().toISOString(),
		unit: "банка",
	};

	const gloves: InventoryItem = {
		id: "item-5",
		name: "Перчатки нитриловые неопудренные р-р M (100 шт)",
		category: "СИЗ / Расходные",
		stockQuantity: 0,
		criticalThreshold: 4,
		unitCostRub: "650",
		updatedAt: new Date().toISOString(),
		unit: "упак",
	};

	// 1. Matches Category
	assert.ok(matchesCategory(ultracain, "anesthesia"), "Ultracain must match anesthesia");
	assert.ok(!matchesCategory(ultracain, "filling"), "Ultracain must not match filling");
	assert.ok(matchesCategory(filtek, "filling"), "Filtek must match filling");
	assert.ok(matchesCategory(protaper, "endo"), "ProTaper must match endo");
	assert.ok(matchesCategory(speedex, "impression"), "Speedex must match impression");
	assert.ok(matchesCategory(gloves, "ppe"), "Gloves must match ppe");

	// 2. All Category matches everything
	assert.ok(matchesCategory(ultracain, "all"), "All items match 'all'");
	assert.ok(matchesCategory(filtek, "all"), "All items match 'all'");

	// 3. getItemCategoryType
	assert.equal(getItemCategoryType(ultracain), "anesthesia");
	assert.equal(getItemCategoryType(filtek), "filling");
	assert.equal(getItemCategoryType(protaper), "endo");
	assert.equal(getItemCategoryType(speedex), "impression");
	assert.equal(getItemCategoryType(gloves), "ppe");
});

test("Mobile Inventory HIG — MobileInventoryGroupedList renders Apple Store Inventory cards & thumb zone", () => {
	const sampleItems: InventoryItem[] = [
		{
			id: "mat-1",
			name: "Ультракаин Д-С Форте (100 карпул)",
			category: "Анестетики",
			stockQuantity: 48,
			criticalThreshold: 10,
			unitCostRub: "6500",
			updatedAt: new Date().toISOString(),
			unit: "карпул",
			lotNumber: "LOT-2026A44",
			expirationDate: "2027-12-31",
		},
		{
			id: "mat-2",
			name: "Септанест с адреналином 1:100 000 (50 карпул)",
			category: "Анестетики",
			stockQuantity: 3, // Low stock <= criticalThreshold
			criticalThreshold: 10,
			unitCostRub: "4200",
			updatedAt: new Date().toISOString(),
			unit: "карпул",
			lotNumber: "LOT-2024S19",
			expirationDate: "2026-10-25",
		},
		{
			id: "mat-3",
			name: "Композит Filtek Ultimate Body A2",
			category: "Композиты",
			stockQuantity: 12,
			criticalThreshold: 5,
			unitCostRub: "2850",
			updatedAt: new Date().toISOString(),
			unit: "шприц",
			lotNumber: "LOT-FLTK-992",
			expirationDate: "2027-08-15",
		},
		{
			id: "mat-4",
			name: "Маски медицинские трехслойные (50 шт)",
			category: "СИЗ",
			stockQuantity: 0, // Zero stock / Overdraft
			criticalThreshold: 5,
			unitCostRub: "250",
			updatedAt: new Date().toISOString(),
			unit: "упак",
			lotNumber: "LOT-MSK-110",
			expirationDate: "2028-10-15",
		},
	];

	const markup = renderToStaticMarkup(
		React.createElement(MobileInventoryGroupedList, {
			items: sampleItems,
			organizationId: "org-test-1",
			searchQuery: "",
			onSearchChange: () => {},
			onClearSearch: () => {},
			selectedCategory: "all",
			onSelectCategory: () => {},
			onQuickDeduct: () => {},
			onReceiveItem: () => {},
			onSelectItem: () => {},
			onEditItem: () => {},
			onOpenAddModal: () => {},
			onOpenInboundInvoice: () => {},
			onOpenWaybills: () => {},
			onQuickWriteoffCarpules: () => {},
			isWritingOffCarpules: false,
			onRefresh: () => {},
			money: (n) => `${n} ₽`,
		}),
	);

	// 1. Root container
	assert.ok(
		markup.includes("mobile-inventory-container"),
		"Must render .mobile-inventory-container root",
	);

	// 2. 1-Row Search Input
	assert.ok(
		markup.includes("mobile-inventory-search-input"),
		"Must render .mobile-inventory-search-input for quick barcode/name lookup",
	);

	// 3. Category Chips Scroller with required HIG categories
	assert.ok(
		markup.includes("mobile-inventory-chips-scroller"),
		"Must render horizontal category chips scroller",
	);
	assert.ok(markup.includes("Все"), "Must include 'Все' chip");
	assert.ok(markup.includes("Анестезия"), "Must include 'Анестезия' chip");
	assert.ok(markup.includes("Пломбировочные"), "Must include 'Пломбировочные' chip");
	assert.ok(markup.includes("Эндодонтия"), "Must include 'Эндодонтия' chip");
	assert.ok(markup.includes("Слепочные"), "Must include 'Слепочные' chip");
	assert.ok(markup.includes("СИЗ"), "Must include 'СИЗ' chip");

	// 4. Grouped Inset Cards
	assert.ok(
		markup.includes("mobile-inventory-grouped-inset"),
		"Must render .mobile-inventory-grouped-inset container",
	);
	assert.ok(
		markup.includes("Ультракаин Д-С Форте"),
		"Material name must be rendered without truncation",
	);
	assert.ok(
		markup.includes("48 карпул"),
		"Remaining stock balance must be clearly displayed with units",
	);

	// 5. Critical Stock Badges
	assert.ok(
		markup.includes("critical-warning"),
		"Must render critical-warning badge for low stock item (Септанест: 3 шт)",
	);
	assert.ok(
		markup.includes("Заканчивается: осталось 3 карпул"),
		"Must display 'Заканчивается: осталось 3 карпул'",
	);
	assert.ok(
		markup.includes("critical-deficit"),
		"Must render critical-deficit badge for 0 stock item",
	);
	assert.ok(
		markup.includes("Закончился: 0 упак (Овердрафт)"),
		"Must display 'Закончился: 0 упак (Овердрафт)'",
	);

	// 6. 1-Tap Quick Write-Off Button
	assert.ok(
		markup.includes("mobile-inventory-quick-deduct-btn"),
		"Must render 1-tap quick write-off button directly on each material card",
	);
	assert.ok(
		markup.includes("btn-quick-deduct-mat-1"),
		"Quick write-off button must have testid for item mat-1",
	);

	// 7. Natural Thumb Zone Sticky Action Bar
	assert.ok(
		markup.includes("mobile-inventory-bottom-bar"),
		"Must render .mobile-inventory-bottom-bar in Natural Thumb Zone",
	);
	assert.ok(
		markup.includes("Оприходовать партию"),
		"Must render [ + Оприходовать партию ] button in bottom bar",
	);
});

test("Mobile Inventory HIG — mobile-inventory.css tokens and ergonomic invariants", () => {
	const cssContent = fs.readFileSync(
		path.join(webRoot, "src/styles/modules/mobile-inventory.css"),
		"utf8",
	);

	// 1. Grouped Inset Border Radius 16px
	assert.ok(
		cssContent.includes("border-radius: 16px"),
		"Grouped inset card must enforce 16px radius per Apple Health / Store Inventory HIG",
	);

	// 2. Material row min-height >= 64px
	assert.ok(
		cssContent.includes("min-height: 64px"),
		"Material card row must enforce min-height: 64px for touch ergonomics",
	);

	// 3. Quick Write-Off Button Touch Target 44x44px
	assert.ok(
		cssContent.includes("min-width: 44px") && cssContent.includes("min-height: 44px"),
		"Quick write-off button must enforce 44x44px touch target (Doctor in gloves mandate)",
	);

	// 4. Inset Separator (left: 64px)
	assert.ok(
		cssContent.includes("left: 64px"),
		"Must implement 64px inset separator (matching icon + gap offset)",
	);

	// 5. 0px horizontal drift protection
	assert.ok(
		cssContent.includes("overflow-x: clip") || cssContent.includes("overflow-x: hidden"),
		"Must enforce 0px horizontal drift protection",
	);

	// 6. Primary Action in Thumb Zone (sticky bottom bar, env safe-area)
	assert.ok(
		cssContent.includes(".mobile-inventory-bottom-bar") &&
			cssContent.includes("position: fixed") &&
			cssContent.includes("safe-area-inset-bottom"),
		"Bottom action bar must be fixed in thumb zone with safe-area padding",
	);

	// 7. Native iOS Bottom Sheet Drawer (rounded-t 24px, drag handle)
	assert.ok(
		cssContent.includes("border-top-left-radius: 24px") &&
			cssContent.includes("border-top-right-radius: 24px"),
		"Inbound Bottom Sheet must have 24px top radius",
	);
	assert.ok(
		cssContent.includes("mobile-inventory-drag-handle"),
		"Must include tactile drag handle in bottom sheet drawer",
	);
});
