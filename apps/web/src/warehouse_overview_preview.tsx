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
import "./styles/overflow-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";

import {
	WarehouseStockAlertsBar,
	WarehouseOverviewTab,
	WarehouseWaybillsTab,
	WarehouseInventoryTab,
	WarehouseBatchTrackingModal,
} from "./components/warehouse/index.js";
import type { InventoryItem } from "./components/inventory/useInventoryLogic.js";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses.js";
import { Layers, Truck, ClipboardList, ShieldAlert, Sun, Moon } from "lucide-react";

const INITIAL_WAREHOUSE_ITEMS: InventoryItem[] = [
	{
		id: "mat-septanest",
		name: "Септанест с адреналином 1:100 000 (50 карпул/уп)",
		category: "Анестезия",
		stockQuantity: 42,
		criticalThreshold: 15,
		unitCostRub: "5400.00",
		unit: "упак",
		sku: "AN-SEPT-100",
		lotNumber: "SEPT-2026A18",
		expirationDate: "2028-08-30",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "mat-scandonest",
		name: "Скандонест 3% без вазоконстриктора (50 карпул/уп)",
		category: "Анестезия",
		stockQuantity: -4, // Мягкий овердрафт у кресла врача (Мандат 8e/8n)
		criticalThreshold: 10,
		unitCostRub: "5800.00",
		unit: "упак",
		sku: "AN-SCAND-3",
		lotNumber: "SCAND-2026B04",
		expirationDate: "2026-10-25", // Истекает в ближайшие 30 дней (FEFO Yellow)
		updatedAt: new Date().toISOString(),
	},
	{
		id: "mat-filtek",
		name: "Композит Filtek Z250 шприц 4г (оттенок A2, 3M ESPE)",
		category: "Терапия",
		stockQuantity: 3, // Критический порог (3 <= 5)
		criticalThreshold: 5,
		unitCostRub: "2950.00",
		unit: "шт",
		sku: "COMP-FLTK-Z250",
		lotNumber: "FLTK-88941",
		expirationDate: "2027-11-15",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "mat-optibond",
		name: "Адгезивная система OptiBond FL (набор 8мл+8мл, Kerr)",
		category: "Адгезивы",
		stockQuantity: 6,
		criticalThreshold: 2,
		unitCostRub: "8900.00",
		unit: "набор",
		sku: "ADH-OPTB-FL",
		lotNumber: "OPTB-70231",
		expirationDate: "2028-04-10",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "mat-gloves",
		name: "Перчатки смотровые нитриловые неопудренные р-р M (100 шт)",
		category: "СИЗ",
		stockQuantity: 28,
		criticalThreshold: 10,
		unitCostRub: "450.00",
		unit: "упак",
		sku: "PPE-GLV-NITR-M",
		lotNumber: "GLV-2026M09",
		expirationDate: "2029-06-01",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "mat-expired-test",
		name: "Устаревший девитализирующий гель (Архив/Брак)",
		category: "Эндодонтия",
		stockQuantity: 1,
		criticalThreshold: 2,
		unitCostRub: "850.00",
		unit: "шт",
		sku: "ENDO-OLD-DEV",
		lotNumber: "DEV-2023-ARCH",
		expirationDate: "2025-01-01", // Просрочен (FEFO Red)
		updatedAt: new Date().toISOString(),
	},
];

export const WarehouseOverviewPreviewApp: React.FC = () => {
	const [activeTab, setActiveTab] = useState<"overview" | "waybills" | "inventory">("overview");
	const [themeMode, setThemeMode] = useState<ThemeMode>("light");
	const [items, setItems] = useState<InventoryItem[]>(INITIAL_WAREHOUSE_ITEMS);
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
	const [selectedBatchItem, setSelectedBatchItem] = useState<InventoryItem | undefined>(undefined);

	useEffect(() => {
		applyThemeToRoot(document.documentElement, resolveTheme(themeMode, false));
	}, [themeMode]);

	const toggleTheme = () => {
		setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
	};

	const handleOpenBatchTracking = (item?: InventoryItem) => {
		setSelectedBatchItem(item);
		setIsBatchModalOpen(true);
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-[var(--paper,#f8fafc)] text-[var(--ink,#0f172a)] overflow-hidden font-sans">
			{/* Верхняя навигационная панель DENTE */}
			<header className="h-12 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] px-4 flex items-center justify-between shrink-0 shadow-xs">
				<div className="flex items-center gap-3">
					<div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
						D
					</div>
					<div>
						<h1 className="text-sm font-bold text-[var(--ink,#0f172a)] leading-none">
							Склад и материальный учет DENTE
						</h1>
						<p className="text-[10px] text-[var(--muted,#64748b)] mt-0.5 font-medium">
							Оперативный материальный учет, СанПиН 3.3686-21 (FEFO)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Переключатель вкладок */}
					<div className="flex items-center bg-[var(--paper-soft,#f1f5f9)] p-0.5 rounded-lg border border-[var(--line-subtle,#e2e8f0)] text-xs">
						<button
							type="button"
							onClick={() => setActiveTab("overview")}
							className={`h-7 px-3 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
								activeTab === "overview"
									? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-300 shadow-xs border border-[var(--line,#cbd5e1)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="tab-overview"
						>
							<Layers size={13} />
							<span>Обзор склада</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("waybills")}
							className={`h-7 px-3 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
								activeTab === "waybills"
									? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-300 shadow-xs border border-[var(--line,#cbd5e1)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="tab-waybills"
						>
							<Truck size={13} />
							<span>Накладные ТОРГ-12</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("inventory")}
							className={`h-7 px-3 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
								activeTab === "inventory"
									? "bg-[var(--paper,#ffffff)] text-teal-700 dark:text-teal-300 shadow-xs border border-[var(--line,#cbd5e1)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="tab-inventory"
						>
							<ClipboardList size={13} />
							<span>Инвентаризация (ИНВ-3/19)</span>
						</button>
					</div>

					{/* Переключатель темы */}
					<button
						type="button"
						onClick={toggleTheme}
						className="h-8 w-8 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] flex items-center justify-center cursor-pointer transition-colors"
						title={themeMode === "light" ? "Переключить на темную тему" : "Переключить на светлую тему"}
						data-testid="btn-toggle-theme"
					>
						{themeMode === "light" ? <Moon size={15} /> : <Sun size={15} />}
					</button>
				</div>
			</header>

			{/* Рабочая область выбранной вкладки */}
			<main className="flex-1 overflow-hidden p-3 flex flex-col min-h-0">
				{activeTab === "overview" && (
					<WarehouseOverviewTab
						organizationId="preview-org-1"
						items={items}
						onOpenWaybills={() => setActiveTab("waybills")}
						onOpenBatchTracking={handleOpenBatchTracking}
						onOpenInventoryAudit={() => setActiveTab("inventory")}
						onDeductItem={(item, qty = 1) => {
							setItems((prev) =>
								prev.map((it) =>
									it.id === item.id
										? { ...it, stockQuantity: Number(it.stockQuantity) - qty }
										: it,
								),
							);
						}}
						onReceiveItem={(item, qty = 1) => {
							setItems((prev) =>
								prev.map((it) =>
									it.id === item.id
										? { ...it, stockQuantity: Number(it.stockQuantity) + qty }
										: it,
								),
							);
						}}
					/>
				)}

				{activeTab === "waybills" && (
					<WarehouseWaybillsTab
						organizationId="preview-org-1"
						inventoryItems={items}
						onWaybillPosted={(wb) => {
							// Пополняем остатки
							setItems((prev) => {
								const next = [...prev];
								for (const it of wb.items) {
									const existingIdx = next.findIndex(
										(x) => x.name.toLowerCase() === it.name.toLowerCase(),
									);
									if (existingIdx >= 0) {
										const current = next[existingIdx]!;
										next[existingIdx] = {
											...current,
											stockQuantity: Number(current.stockQuantity) + it.quantity,
										};
									}
								}
								return next;
							});
						}}
					/>
				)}

				{activeTab === "inventory" && (
					<WarehouseInventoryTab
						organizationId="preview-org-1"
						items={items}
						onApplyAudit={async (doc) => {
							// Применяем фактические остатки
							setItems((prev) => {
								const next = [...prev];
								for (const line of doc.items) {
									const idx = next.findIndex((x) => x.id === line.itemId);
									if (idx >= 0) {
										next[idx] = {
											...next[idx]!,
											stockQuantity: line.actualQuantity,
										};
									}
								}
								return next;
							});
						}}
					/>
				)}
			</main>

			{/* Модальное окно FEFO партий и серий */}
			<WarehouseBatchTrackingModal
				isOpen={isBatchModalOpen}
				onClose={() => setIsBatchModalOpen(false)}
				items={items}
				selectedItem={selectedBatchItem}
				onDeductBatch={(item, qty) => {
					setItems((prev) =>
						prev.map((it) =>
							it.id === item.id
								? { ...it, stockQuantity: Number(it.stockQuantity) - qty }
								: it,
						),
					);
				}}
				onWriteOffExpired={(item) => {
					setItems((prev) =>
						prev.map((it) =>
							it.id === item.id
								? { ...it, stockQuantity: 0 }
								: it,
						),
					);
				}}
			/>
		</div>
	);
};

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<WarehouseOverviewPreviewApp />);
}
