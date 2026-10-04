import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/modules/mobile-inventory.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";

import {
	MobileInventoryGroupedList,
	type MobileInventoryCategoryType,
} from "./components/inventory/MobileInventoryGroupedList";
import type { InventoryItem } from "./components/inventory/inventoryDataMappers";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

const PREVIEW_ITEMS: InventoryItem[] = [
	{
		id: "mat-1",
		name: "Ультракаин Д-С форте (100 карпул/уп)",
		category: "Анестезия",
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
		category: "Анестезия",
		stockQuantity: 3,
		criticalThreshold: 10,
		unitCostRub: "4200",
		updatedAt: new Date().toISOString(),
		unit: "карпулы",
		lotNumber: "LOT-2024S19",
		expirationDate: "2026-10-25",
	},
	{
		id: "mat-3",
		name: "Композит Filtek Ultimate Body A2 (4г)",
		category: "Пломбировочные",
		stockQuantity: 8,
		criticalThreshold: 4,
		unitCostRub: "2850",
		updatedAt: new Date().toISOString(),
		unit: "шприц",
		lotNumber: "LOT-FLTK-992",
		expirationDate: "2027-08-15",
	},
	{
		id: "mat-4",
		name: "Адгезив Single Bond Universal (5мл)",
		category: "Пломбировочные",
		stockQuantity: 2,
		criticalThreshold: 3,
		unitCostRub: "4900",
		updatedAt: new Date().toISOString(),
		unit: "флакон",
		lotNumber: "LOT-SBU-441",
		expirationDate: "2027-04-10",
	},
	{
		id: "mat-5",
		name: "Эндодонтические файлы ProTaper Gold F1-F3",
		category: "Эндодонтия",
		stockQuantity: 12,
		criticalThreshold: 5,
		unitCostRub: "1900",
		updatedAt: new Date().toISOString(),
		unit: "блистер",
		lotNumber: "LOT-PTG-881",
		expirationDate: "2028-01-20",
	},
	{
		id: "mat-6",
		name: "Силлер AH Plus (паста A + паста B)",
		category: "Эндодонтия",
		stockQuantity: 1,
		criticalThreshold: 2,
		unitCostRub: "5400",
		updatedAt: new Date().toISOString(),
		unit: "упак",
		lotNumber: "LOT-AHP-102",
		expirationDate: "2026-11-30",
	},
	{
		id: "mat-7",
		name: "Слепочная масса Speedex Putty (910мл)",
		category: "Слепочные",
		stockQuantity: 5,
		criticalThreshold: 3,
		unitCostRub: "3200",
		updatedAt: new Date().toISOString(),
		unit: "банка",
		lotNumber: "LOT-SPDX-55",
		expirationDate: "2027-06-15",
	},
	{
		id: "mat-8",
		name: "Перчатки нитриловые неопудренные (р-р M, 100 шт)",
		category: "СИЗ",
		stockQuantity: 8,
		criticalThreshold: 5,
		unitCostRub: "650",
		updatedAt: new Date().toISOString(),
		unit: "упак",
		lotNumber: "LOT-GLV-993",
		expirationDate: "2029-05-01",
	},
	{
		id: "mat-9",
		name: "Маски медицинские трехслойные (50 шт)",
		category: "СИЗ",
		stockQuantity: 0,
		criticalThreshold: 4,
		unitCostRub: "250",
		updatedAt: new Date().toISOString(),
		unit: "упак",
		lotNumber: "LOT-MSK-110",
		expirationDate: "2028-10-15",
	},
];

function MobileInventoryPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	const [items, setItems] = useState<InventoryItem[]>(PREVIEW_ITEMS);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<MobileInventoryCategoryType>("all");

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	const handleQuickDeduct = (item: InventoryItem, qty = 1) => {
		setItems((prev) =>
			prev.map((it) =>
				it.id === item.id
					? { ...it, stockQuantity: it.stockQuantity - qty }
					: it,
			),
		);
	};

	const handleReceiveItem = (
		item: InventoryItem,
		qty = 10,
		lotNumber?: string,
		expDate?: string,
	) => {
		setItems((prev) =>
			prev.map((it) =>
				it.id === item.id
					? {
							...it,
							stockQuantity: it.stockQuantity + qty,
							...(lotNumber ? { lotNumber } : {}),
							...(expDate ? { expirationDate: expDate } : {}),
						}
					: it,
			),
		);
	};

	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col">
			<MobileInventoryGroupedList
				items={items}
				organizationId="preview-org"
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onClearSearch={() => setSearchQuery("")}
				selectedCategory={selectedCategory}
				onSelectCategory={setSelectedCategory}
				onQuickDeduct={handleQuickDeduct}
				onReceiveItem={handleReceiveItem}
				onSelectItem={() => {}}
				onEditItem={() => {}}
				onOpenAddModal={() => {}}
				onOpenInboundInvoice={() => {}}
				onQuickWriteoffCarpules={() => {
					// Quick write-off of carpules in demo
					if (items[0]) {
						handleQuickDeduct(items[0], 1);
					}
				}}
				isWritingOffCarpules={false}
				money={(n) => `${n.toLocaleString("ru-RU")} ₽`}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<MobileInventoryPreviewApp />
		</React.StrictMode>,
	);
}
