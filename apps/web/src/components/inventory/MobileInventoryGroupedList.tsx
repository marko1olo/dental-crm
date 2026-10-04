/**
 * apps/web/src/components/inventory/MobileInventoryGroupedList.tsx
 *
 * Dedicated Mobile Inventory & Chairside Consumables per Apple Store Inventory Style HIG:
 * 1. Grouped Inset Cards (rounded 16px, inset separators, category-tinted icons).
 * 2. 1-Row iOS Search with instant clear button.
 * 3. Horizontal category chip scroller: [ Все | Анестезия | Пломбировочные | Эндодонтия | Слепочные | СИЗ ].
 * 4. Material card: Name, category, stock balance, vivid critical stock badge.
 * 5. 1-Tap Quick Write-off button «-1 шт» with >=44x44px touch target (Doctor in gloves mandate).
 * 6. Native iOS Bottom Sheet for batch intake with drag handle, large quantity steppers & quick chips.
 * 7. Sticky Thumb Zone Primary CTA: [ + Оприходовать партию ].
 * 8. 0px horizontal drift, safe area insets, full WCAG contrast in Light and Dark themes.
 */

import {
	Activity,
	AlertTriangle,
	ArrowDownToLine,
	Calendar,
	CheckCircle2,
	Clock,
	Layers,
	Minus,
	Package,
	Plus,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Syringe,
	Tag,
	Target,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast.js";
import {
	getExpiryTrafficLight,
	type ExpiryTrafficLightInfo,
} from "./InventoryStockTable.js";
import type { InventoryItem } from "./inventoryDataMappers.js";
import "../../styles/modules/mobile-inventory.css";

export type MobileInventoryCategoryType =
	| "all"
	| "anesthesia"
	| "filling"
	| "endo"
	| "impression"
	| "ppe";

export interface MobileInventoryCategory {
	readonly id: MobileInventoryCategoryType;
	readonly label: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const MOBILE_INVENTORY_CATEGORIES: readonly MobileInventoryCategory[] = [
	{ id: "all", label: "Все", icon: Package },
	{ id: "anesthesia", label: "Анестезия", icon: Syringe },
	{ id: "filling", label: "Пломбировочные", icon: Sparkles },
	{ id: "endo", label: "Эндодонтия", icon: Target },
	{ id: "impression", label: "Слепочные", icon: Layers },
	{ id: "ppe", label: "СИЗ", icon: ShieldCheck },
];

export function matchesCategory(
	item: InventoryItem,
	category: MobileInventoryCategoryType,
): boolean {
	if (category === "all") return true;

	const name = (item.name || "").toLowerCase();
	const cat = (item.category || "").toLowerCase();

	if (category === "anesthesia") {
		return (
			cat.includes("анестез") ||
			name.includes("анестез") ||
			name.includes("карпул") ||
			name.includes("артикаин") ||
			name.includes("ультракаин") ||
			name.includes("септанест") ||
			name.includes("скандонест") ||
			name.includes("убистезин") ||
			name.includes("лидокаин") ||
			name.includes("мепивакаин")
		);
	}

	if (category === "filling") {
		return (
			cat.includes("пломб") ||
			cat.includes("композит") ||
			cat.includes("терапи") ||
			cat.includes("адгезив") ||
			name.includes("композит") ||
			name.includes("пломб") ||
			name.includes("бонд") ||
			name.includes("адгезив") ||
			name.includes("filtek") ||
			name.includes("gradia") ||
			name.includes("estelite") ||
			name.includes("харизма") ||
			name.includes("спектрум") ||
			name.includes("трави") ||
			name.includes("паста")
		);
	}

	if (category === "endo") {
		return (
			cat.includes("эндо") ||
			name.includes("эндо") ||
			name.includes("гуттаперч") ||
			name.includes("файл") ||
			name.includes("силлер") ||
			name.includes("девавит") ||
			name.includes("бумажн") ||
			name.includes("protaper") ||
			name.includes("эндометазон")
		);
	}

	if (category === "impression") {
		return (
			cat.includes("слепоч") ||
			cat.includes("оттиск") ||
			name.includes("слепоч") ||
			name.includes("оттиск") ||
			name.includes("альгинат") ||
			name.includes("силикон") ||
			name.includes("speedex") ||
			name.includes("спидекс") ||
			name.includes("zeta") ||
			name.includes("а-силикон") ||
			name.includes("с-силикон")
		);
	}

	if (category === "ppe") {
		return (
			cat.includes("сиз") ||
			cat.includes("расход") ||
			name.includes("сиз") ||
			name.includes("перчатк") ||
			name.includes("маск") ||
			name.includes("нагрудник") ||
			name.includes("шапочк") ||
			name.includes("бахил") ||
			name.includes("дезинфек") ||
			name.includes("слюноотсос") ||
			name.includes("валик") ||
			name.includes("простын")
		);
	}

	return true;
}

export function getItemCategoryType(item: InventoryItem): MobileInventoryCategoryType {
	if (matchesCategory(item, "anesthesia")) return "anesthesia";
	if (matchesCategory(item, "filling")) return "filling";
	if (matchesCategory(item, "endo")) return "endo";
	if (matchesCategory(item, "impression")) return "impression";
	if (matchesCategory(item, "ppe")) return "ppe";
	return "all";
}

export interface MobileInventoryGroupedListProps {
	readonly items: readonly InventoryItem[];
	readonly organizationId: string;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly onClearSearch: () => void;
	readonly selectedCategory: MobileInventoryCategoryType;
	readonly onSelectCategory: (category: MobileInventoryCategoryType) => void;
	readonly onQuickDeduct?: (item: InventoryItem, quantity?: number) => void | Promise<void>;
	readonly onReceiveItem?: (item: InventoryItem, quantity?: number, lotNumber?: string, expDate?: string) => void | Promise<void>;
	readonly onSelectItem?: (item: InventoryItem) => void;
	readonly onEditItem?: (item: InventoryItem) => void;
	readonly onOpenAddModal?: () => void;
	readonly onOpenInboundInvoice?: () => void;
	readonly onOpenWaybills?: () => void;
	readonly onQuickWriteoffCarpules?: () => void;
	readonly isWritingOffCarpules?: boolean;
	readonly onRefresh?: () => void;
	readonly money?: (amountRub: number) => string;
}

export const MobileInventoryGroupedList: React.FC<MobileInventoryGroupedListProps> = ({
	items,
	organizationId,
	searchQuery,
	onSearchChange,
	onClearSearch,
	selectedCategory,
	onSelectCategory,
	onQuickDeduct,
	onReceiveItem,
	onSelectItem,
	onEditItem,
	onOpenAddModal,
	onOpenInboundInvoice,
	onOpenWaybills,
	onQuickWriteoffCarpules,
	isWritingOffCarpules = false,
	onRefresh,
	money,
}) => {
	// Local state for Quick Batch Inbound Drawer
	const [isInboundDrawerOpen, setIsInboundDrawerOpen] = useState(false);
	const [drawerTargetItem, setDrawerTargetItem] = useState<InventoryItem | null>(null);
	const [drawerQuantity, setDrawerQuantity] = useState<number>(10);
	const [drawerLotNumber, setDrawerLotNumber] = useState<string>("");
	const [drawerExpDate, setDrawerExpDate] = useState<string>("");
	const [drawerCustomName, setDrawerCustomName] = useState<string>("");
	const [isSubmittingInbound, setIsSubmittingInbound] = useState(false);

	// Optimistic deduction tracking
	const [deductingItemIds, setDeductingItemIds] = useState<Record<string, boolean>>({});

	// Quick haptic feedback for mobile touch
	const triggerHaptic = useCallback(() => {
		try {
			if (typeof navigator !== "undefined" && "vibrate" in navigator) {
				navigator.vibrate(25);
			}
		} catch {
			// Ignore vibration errors
		}
	}, []);

	// Pre-calculate counts for each category
	const categoryCounts = useMemo(() => {
		const counts: Record<MobileInventoryCategoryType, number> = {
			all: items.length,
			anesthesia: 0,
			filling: 0,
			endo: 0,
			impression: 0,
			ppe: 0,
		};
		for (const it of items) {
			if (matchesCategory(it, "anesthesia")) counts.anesthesia++;
			if (matchesCategory(it, "filling")) counts.filling++;
			if (matchesCategory(it, "endo")) counts.endo++;
			if (matchesCategory(it, "impression")) counts.impression++;
			if (matchesCategory(it, "ppe")) counts.ppe++;
		}
		return counts;
	}, [items]);

	// Filtered list based on search and selected category
	const displayItems = useMemo(() => {
		let list = items.slice();

		// Category filter
		if (selectedCategory !== "all") {
			list = list.filter((it) => matchesCategory(it, selectedCategory));
		}

		// Text & Barcode search
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(it) =>
					it.name.toLowerCase().includes(q) ||
					(it.sku && it.sku.toLowerCase().includes(q)) ||
					(it.barcode && it.barcode.toLowerCase().includes(q)) ||
					(it.lotNumber && it.lotNumber.toLowerCase().includes(q)) ||
					(it.category && it.category.toLowerCase().includes(q)),
			);
		}

		return list;
	}, [items, selectedCategory, searchQuery]);

	// Shortage count for KPI badge
	const lowStockCount = useMemo(() => {
		return items.filter(
			(it) => it.stockQuantity <= (it.criticalThreshold || 0),
		).length;
	}, [items]);

	// 1-Tap Quick Write-Off Handler (Chairside -1 unit)
	const handleExecuteQuickDeduct = async (
		e: React.MouseEvent,
		item: InventoryItem,
	) => {
		e.stopPropagation();
		triggerHaptic();

		setDeductingItemIds((prev) => ({ ...prev, [item.id]: true }));

		try {
			if (onQuickDeduct) {
				await onQuickDeduct(item, 1);
			} else {
				// Direct fallback PATCH to API with soft overdraft support (Mandate 8n)
				const res = await fetch(
					`/api/inventory/${organizationId}/${item.id}/stock`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ adjustment: -1, allowOverdraft: true }),
					},
				);
				if (res.ok) {
					const isDeficit = item.stockQuantity <= 1;
					showToast(
						isDeficit
							? `Списано 1 ед. «${item.name}» (зафиксирован мягкий овердрафт)`
							: `Списано 1 ед. «${item.name}»`,
						isDeficit ? "warning" : "success",
					);
					if (onRefresh) onRefresh();
				} else {
					showToast("Ошибка списания со склада", "error");
				}
			}
		} catch {
			showToast("Сбой сети при списании", "error");
		} finally {
			setDeductingItemIds((prev) => ({ ...prev, [item.id]: false }));
		}
	};

	// Open inbound drawer for a specific item or general batch intake
	const handleOpenInboundDrawer = (item?: InventoryItem) => {
		triggerHaptic();
		if (item) {
			setDrawerTargetItem(item);
			setDrawerCustomName(item.name);
			setDrawerLotNumber(item.lotNumber || `ПАРТИЯ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`);
			setDrawerExpDate(item.expirationDate || "2027-12-31");
		} else {
			setDrawerTargetItem(null);
			setDrawerCustomName("");
			setDrawerLotNumber(`ПАРТИЯ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`);
			setDrawerExpDate("2027-12-31");
		}
		setDrawerQuantity(10);
		setIsInboundDrawerOpen(true);
	};

	// Submit Inbound Batch from Bottom Sheet
	const handleSubmitInbound = async (e: React.FormEvent) => {
		e.preventDefault();
		if (drawerQuantity <= 0) {
			showToast("Укажите количество для оприходования", "warning");
			return;
		}

		setIsSubmittingInbound(true);
		triggerHaptic();

		try {
			if (drawerTargetItem && onReceiveItem) {
				await onReceiveItem(
					drawerTargetItem,
					drawerQuantity,
					drawerLotNumber,
					drawerExpDate,
				);
				showToast(
					`Оприходовано ${drawerQuantity} ед. «${drawerTargetItem.name}» на склад`,
					"success",
				);
			} else if (drawerTargetItem) {
				const res = await fetch(
					`/api/inventory/${organizationId}/${drawerTargetItem.id}/stock`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							adjustment: drawerQuantity,
							allowOverdraft: true,
						}),
					},
				);
				if (res.ok) {
					showToast(
						`Оприходовано +${drawerQuantity} ед. «${drawerTargetItem.name}» (партия ${drawerLotNumber})`,
						"success",
					);
					if (onRefresh) onRefresh();
				} else {
					showToast("Ошибка оприходования партии", "error");
				}
			} else if (onOpenInboundInvoice) {
				// If no specific item selected, forward to inbound invoice modal
				setIsInboundDrawerOpen(false);
				onOpenInboundInvoice();
				return;
			} else {
				showToast(`Партия (${drawerQuantity} шт) принята на склад`, "success");
			}

			setIsInboundDrawerOpen(false);
		} catch {
			showToast("Сбой при оприходовании партии", "error");
		} finally {
			setIsSubmittingInbound(false);
		}
	};

	return (
		<div
			className="mobile-inventory-container"
			data-testid="mobile-inventory-container"
		>
			{/* 1. STICKY HEADER BAR (Search + Title + Quick Carpules) */}
			<div className="mobile-inventory-header-bar">
				<div className="mobile-inventory-title-row">
					<div className="mobile-inventory-title-wrap">
						<Package size={20} className="mobile-inventory-title-icon" aria-hidden="true" />
						<h1 className="mobile-inventory-title-text">Склад материалов</h1>
					</div>

					<div className="flex items-center gap-2">
						{lowStockCount > 0 ? (
							<span
								className="mobile-inventory-kpi-badge has-shortage"
								title="Критический дефицит материалов"
								data-testid="mobile-inventory-deficit-badge"
							>
								⚠ Дефицит: {lowStockCount}
							</span>
						) : (
							<span className="mobile-inventory-kpi-badge">
								Поз: {items.length}
							</span>
						)}

						{/* Quick 1-Click Carpules Disposal for Nurse */}
						{onQuickWriteoffCarpules && (
							<button
								type="button"
								className="mobile-inventory-quick-carpule-btn"
								onClick={onQuickWriteoffCarpules}
								disabled={isWritingOffCarpules}
								title="Утилизировать пустую карпулу анестетика в 1 клик"
								data-testid="mobile-btn-quick-carpules"
							>
								<Syringe size={15} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
								<span>{isWritingOffCarpules ? "..." : "Карпула"}</span>
							</button>
						)}
					</div>
				</div>

				{/* 1-Row Search Input with Clear Button */}
				<div className="mobile-inventory-search-row">
					<div className="mobile-inventory-search-wrap">
						<Search
							className="mobile-inventory-search-icon"
							size={16}
							aria-hidden="true"
						/>
						<input
							type="search"
							className="mobile-inventory-search-input"
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Название, штрихкод или артикул..."
							aria-label="Поиск по складу"
							data-testid="mobile-inventory-search-input"
						/>
						{searchQuery ? (
							<button
								type="button"
								className="mobile-inventory-search-clear"
								onClick={onClearSearch}
								aria-label="Очистить поиск"
								data-testid="mobile-inventory-search-clear"
							>
								<X size={16} aria-hidden="true" />
							</button>
						) : null}
					</div>
				</div>

				{/* 2. HORIZONTAL CATEGORY CHIPS SCROLLER (Apple Store Category Bar) */}
				<div
					className="mobile-inventory-chips-scroller"
					role="tablist"
					aria-label="Фильтр категорий материалов"
					data-testid="mobile-inventory-category-chips"
				>
					{MOBILE_INVENTORY_CATEGORIES.map((cat) => {
						const Icon = cat.icon;
						const isActive = selectedCategory === cat.id;
						const count = categoryCounts[cat.id] || 0;
						return (
							<button
								key={cat.id}
								type="button"
								className={`mobile-inventory-chip ${isActive ? "active" : ""}`}
								onClick={() => {
									triggerHaptic();
									onSelectCategory(cat.id);
								}}
								role="tab"
								aria-selected={isActive}
								data-testid={`mobile-chip-${cat.id}`}
							>
								<Icon size={14} aria-hidden="true" />
								<span>{cat.label}</span>
								<span className="mobile-inventory-chip-count">{count}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 3. GROUPED INSET CARDS (Apple Health / iOS Settings style) */}
			{displayItems.length > 0 ? (
				<div
					className="mobile-inventory-grouped-inset"
					data-testid="mobile-inventory-grouped-card"
				>
					{displayItems.map((item) => {
						const catType = getItemCategoryType(item);
						const isLowStock = item.stockQuantity <= (item.criticalThreshold || 0);
						const isZeroStock = item.stockQuantity <= 0;
						const trafficLight = getExpiryTrafficLight(item.expirationDate);
						const isDeducting = Boolean(deductingItemIds[item.id]);

						// Determine primary icon
						let IconComponent = Package;
						if (catType === "anesthesia") IconComponent = Syringe;
						if (catType === "filling") IconComponent = Sparkles;
						if (catType === "endo") IconComponent = Target;
						if (catType === "impression") IconComponent = Layers;
						if (catType === "ppe") IconComponent = ShieldCheck;

						return (
							<div
								key={item.id}
								className="mobile-inventory-item-row"
								onClick={() => {
									triggerHaptic();
									if (onSelectItem) onSelectItem(item);
									else if (onEditItem) onEditItem(item);
									else handleOpenInboundDrawer(item);
								}}
								data-testid={`mobile-inventory-item-${item.id}`}
							>
								{/* Category Icon Box */}
								<div className={`mobile-inventory-icon-box ${catType}`}>
									<IconComponent size={20} aria-hidden="true" />
								</div>

								{/* Material Info */}
								<div className="mobile-inventory-item-info">
									<div className="mobile-inventory-item-name">
										{item.name}
									</div>

									{/* Subtitle: Category & Remaining Stock string */}
									<div className="mobile-inventory-item-meta">
										<span>{item.category || "Расходные материалы"}</span>
										<span>•</span>
										<span className="mobile-inventory-stock-highlight">
											{item.stockQuantity} {item.unit || "шт."}
										</span>
										{item.lotNumber && (
											<>
												<span>•</span>
												<span className="opacity-75">{item.lotNumber}</span>
											</>
										)}
									</div>

									{/* Badges: Critical stock & FEFO expiration */}
									<div className="mobile-inventory-badges-row">
										{isZeroStock ? (
											<span
												className="mobile-inventory-badge critical-deficit"
												data-testid="badge-critical-deficit"
											>
												<AlertTriangle size={11} aria-hidden="true" />
												<span>Закончился: 0 {item.unit || "шт."} (Овердрафт)</span>
											</span>
										) : isLowStock ? (
											<span
												className="mobile-inventory-badge critical-warning"
												data-testid="badge-critical-warning"
											>
												<AlertTriangle size={11} aria-hidden="true" />
												<span>Заканчивается: осталось {item.stockQuantity} {item.unit || "шт."}</span>
											</span>
										) : null}

										{/* FEFO Expiry Status */}
										{trafficLight.status === "expired" ? (
											<span className="mobile-inventory-badge fefo-expired">
												<Clock size={11} aria-hidden="true" />
												<span>Просрочено</span>
											</span>
										) : trafficLight.status === "warning_soon" ? (
											<span className="mobile-inventory-badge fefo-warning">
												<Clock size={11} aria-hidden="true" />
												<span>Истекает скоро ({trafficLight.daysLeft} дн.)</span>
											</span>
										) : null}
									</div>
								</div>

								{/* 4. 1-TAP QUICK WRITE-OFF BUTTON (>=44x44px touch target) */}
								<button
									type="button"
									className="mobile-inventory-quick-deduct-btn"
									disabled={isDeducting}
									onClick={(e) => handleExecuteQuickDeduct(e, item)}
									aria-label={`Списать 1 единицу ${item.name}`}
									title={`Списать 1 ${item.unit || "шт."} прямо у кресла`}
									data-testid={`btn-quick-deduct-${item.id}`}
								>
									<Minus size={15} aria-hidden="true" />
									<span>1</span>
								</button>
							</div>
						);
					})}
				</div>
			) : (
				/* Empty State */
				<div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
					<Package size={36} className="opacity-40" />
					<div className="font-semibold text-sm text-[var(--ink)]">
						{searchQuery.trim()
							? `По запросу «${searchQuery}» ничего не найдено`
							: "В выбранной категории нет материалов"}
					</div>
					<p className="text-xs max-w-xs">
						{searchQuery.trim()
							? "Проверьте правильность написания или сбросьте фильтры поиска."
							: "Нажмите кнопку ниже, чтобы оприходовать новую партию расходников."}
					</p>
					{searchQuery.trim() && (
						<button
							type="button"
							className="mt-2 h-9 px-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)]"
							onClick={onClearSearch}
						>
							Сбросить поиск
						</button>
					)}
				</div>
			)}

			{/* 5. STICKY ACTION BAR IN NATURAL THUMB ZONE */}
			<div className="mobile-inventory-bottom-bar" data-testid="mobile-inventory-bottom-bar">
				<button
					type="button"
					className="mobile-inventory-primary-fab"
					onClick={() => handleOpenInboundDrawer()}
					data-testid="mobile-btn-inbound-batch"
					aria-label="Оприходовать партию материалов"
				>
					<Plus size={20} aria-hidden="true" />
					<span>Оприходовать партию</span>
				</button>

				{onOpenInboundInvoice && (
					<button
						type="button"
						className="mobile-inventory-secondary-btn"
						onClick={onOpenInboundInvoice}
						title="Накладные ТОРГ-12 / УПД"
						aria-label="Открыть накладные"
						data-testid="mobile-btn-waybills"
					>
						<ArrowDownToLine size={18} aria-hidden="true" />
						<span className="hidden sm:inline">Накладные</span>
					</button>
				)}
			</div>

			{/* 6. NATIVE iOS BOTTOM SHEET FOR INVENTORY INTAKE & RECEIPT */}
			{isInboundDrawerOpen && (
				<div
					className="mobile-inventory-drawer-backdrop"
					onClick={() => setIsInboundDrawerOpen(false)}
					data-testid="mobile-inventory-drawer-backdrop"
				>
					<div
						className="mobile-inventory-drawer-surface"
						onClick={(e) => e.stopPropagation()}
						role="dialog"
						aria-modal="true"
						aria-label="Оприходование партии на склад"
						data-testid="mobile-inventory-drawer"
					>
						{/* Tactile Drag Handle */}
						<div className="mobile-inventory-drag-handle-wrap">
							<div className="mobile-inventory-drag-handle" />
						</div>

						{/* Drawer Header */}
						<div className="mobile-inventory-drawer-header">
							<div>
								<h2 className="mobile-inventory-drawer-title">
									Оприходовать партию
								</h2>
								<p className="text-xs text-[var(--muted)] m-0">
									{drawerTargetItem
										? drawerTargetItem.name
										: "Поступление расходных материалов"}
								</p>
							</div>

							<button
								type="button"
								className="mobile-inventory-drawer-close"
								onClick={() => setIsInboundDrawerOpen(false)}
								aria-label="Закрыть шторку"
							>
								<X size={18} aria-hidden="true" />
							</button>
						</div>

						{/* Drawer Body Form */}
						<form onSubmit={handleSubmitInbound} className="mobile-inventory-drawer-body">
							{/* Material Selection (if general intake) */}
							{!drawerTargetItem && (
								<div className="mobile-inventory-field-group">
									<label className="mobile-inventory-field-label">
										Материал со склада
									</label>
									<select
										className="mobile-inventory-field-input"
										value={drawerTargetItem ? (drawerTargetItem as InventoryItem).id : ""}
										onChange={(e) => {
											const found = items.find((it) => it.id === e.target.value);
											if (found) {
												setDrawerTargetItem(found);
												setDrawerCustomName(found.name);
											}
										}}
										data-testid="drawer-material-select"
									>
										<option value="">-- Выберите материал для пополнения --</option>
										{items.map((it) => (
											<option key={it.id} value={it.id}>
												{it.name} (остаток: {it.stockQuantity} {it.unit || "шт."})
											</option>
										))}
									</select>
								</div>
							)}

							{/* Large Quantity Stepper */}
							<div className="text-center">
								<span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
									Количество к поступлению
								</span>
								<div className="mobile-inventory-stepper-wrap">
									<button
										type="button"
										className="mobile-inventory-stepper-btn"
										onClick={() => {
											triggerHaptic();
											setDrawerQuantity((prev) => Math.max(1, prev - 1));
										}}
										aria-label="Уменьшить количество на 1"
										data-testid="drawer-stepper-minus"
									>
										<Minus size={20} aria-hidden="true" />
									</button>

									<span
										className="mobile-inventory-stepper-val"
										data-testid="drawer-stepper-value"
									>
										{drawerQuantity}
									</span>

									<button
										type="button"
										className="mobile-inventory-stepper-btn"
										onClick={() => {
											triggerHaptic();
											setDrawerQuantity((prev) => prev + 1);
										}}
										aria-label="Увеличить количество на 1"
										data-testid="drawer-stepper-plus"
									>
										<Plus size={20} aria-hidden="true" />
									</button>
								</div>
							</div>

							{/* Quick Increment Chips: +1, +5, +10, +50, +100 */}
							<div
								className="mobile-inventory-quick-chips-grid"
								data-testid="drawer-quick-chips"
							>
								{[1, 5, 10, 50, 100].map((inc) => (
									<button
										key={inc}
										type="button"
										className="mobile-inventory-quick-chip"
										onClick={() => {
											triggerHaptic();
											setDrawerQuantity((prev) => prev + inc);
										}}
										data-testid={`drawer-chip-plus-${inc}`}
									>
										+{inc}
									</button>
								))}
							</div>

							{/* Batch Number (Lot #) & Expiration Date (FEFO) */}
							<div className="grid grid-cols-2 gap-3">
								<div className="mobile-inventory-field-group">
									<label className="mobile-inventory-field-label">
										Партия / Серия
									</label>
									<input
										type="text"
										className="mobile-inventory-field-input"
										value={drawerLotNumber}
										onChange={(e) => setDrawerLotNumber(e.target.value)}
										placeholder="LOT-2026..."
										data-testid="drawer-input-lot"
									/>
								</div>

								<div className="mobile-inventory-field-group">
									<label className="mobile-inventory-field-label">
										Срок годности (FEFO)
									</label>
									<input
										type="date"
										className="mobile-inventory-field-input"
										value={drawerExpDate}
										onChange={(e) => setDrawerExpDate(e.target.value)}
										data-testid="drawer-input-expdate"
									/>
								</div>
							</div>

							{/* Drawer Sticky Footer with Submit Button */}
							<div className="mobile-inventory-drawer-footer">
								<button
									type="submit"
									disabled={isSubmittingInbound}
									className="mobile-inventory-drawer-submit"
									data-testid="drawer-btn-submit"
								>
									<CheckCircle2 size={20} aria-hidden="true" />
									<span>
										{isSubmittingInbound
											? "Приём на склад..."
											: `Принять на склад • +${drawerQuantity} шт`}
									</span>
								</button>

								{onOpenInboundInvoice && (
									<button
										type="button"
										className="mobile-inventory-drawer-secondary-link"
										onClick={() => {
											setIsInboundDrawerOpen(false);
											onOpenInboundInvoice();
										}}
									>
										Оформить официальную накладную поставщика (ТОРГ-12)
									</button>
								)}
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default MobileInventoryGroupedList;
