/**
 * RetailProductsModal.tsx — Витрина стойки ресепшена клиники ДЕНТЕ:
 * розничные сопутствующие товары (Curaprox, Marvis, Biorepair, Waterpik) с НДС 20%
 * и подарочные сертификаты (3000 / 5000 / 10000 ₽) с фискализацией аванса по 54-ФЗ.
 *
 * Эргономика: 1-рядный компактный тулбар (32-36px), быстрое добавление в чек,
 * поиск по названию, артикулу или штрихкоду EAN-13, точные фискальные теги (1212/1199).
 */

import React, { useMemo, useState } from "react";
import {
	Search,
	ShoppingBag,
	X,
	Plus,
	Check,
	Gift,
	Sparkles,
	Tag,
	Barcode,
	ShieldCheck,
	Package,
} from "lucide-react";
import {
	RECEPTION_RETAIL_CATALOG,
	type RetailProductCategory,
	type RetailProductItem,
} from "@dental/shared";

export interface RetailProductsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAddProduct: (item: RetailProductItem, quantity: number) => void;
	readonly onAddMultipleProducts?: (
		items: ReadonlyArray<{ item: RetailProductItem; quantity: number }>,
	) => void;
	readonly patientName?: string | undefined;
	readonly initialCategory?: RetailProductCategory | "all" | undefined;
}

interface CategoryFilterOption {
	readonly id: RetailProductCategory | "all";
	readonly label: string;
	readonly icon?: React.ReactNode;
}

const CATEGORY_OPTIONS: readonly CategoryFilterOption[] = [
	{ id: "all", label: "Весь ассортимент" },
	{ id: "brushes", label: "Щетки Curaprox" },
	{ id: "pastes", label: "Пасты Marvis / Biorepair" },
	{ id: "irrigators", label: "Ирригаторы Waterpik" },
	{ id: "floss_and_rinses", label: "Нити и ополаскиватели" },
	{ id: "certificates", label: "Подарочные сертификаты" },
];

export const RetailProductsModal: React.FC<RetailProductsModalProps> = ({
	isOpen,
	onClose,
	onAddProduct,
	onAddMultipleProducts,
	patientName,
	initialCategory = "all",
}) => {
	if (!isOpen) return null;

	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedCategory, setSelectedCategory] = useState<RetailProductCategory | "all">(
		initialCategory,
	);
	const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
	const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);

	// Filtering catalog by category and search query (name, brand, sku, barcode)
	const filteredProducts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return RECEPTION_RETAIL_CATALOG.filter((item) => {
			if (selectedCategory !== "all" && item.category !== selectedCategory) {
				return false;
			}
			if (!query) return true;
			return (
				item.name.toLowerCase().includes(query) ||
				item.brand.toLowerCase().includes(query) ||
				item.sku.toLowerCase().includes(query) ||
				item.barcode.toLowerCase().includes(query) ||
				item.descriptionRu.toLowerCase().includes(query)
			);
		});
	}, [searchQuery, selectedCategory]);

	const handleQuantityChange = (itemId: string, delta: number) => {
		setSelectedQuantities((prev) => {
			const current = prev[itemId] || 1;
			const next = Math.max(1, Math.min(99, current + delta));
			return { ...prev, [itemId]: next };
		});
	};

	const handleQuickAdd = (item: RetailProductItem) => {
		const qty = selectedQuantities[item.id] || 1;
		onAddProduct(item, qty);
		setAddedSuccessId(item.id);
		setTimeout(() => setAddedSuccessId(null), 1200);
	};

	const totalSelectedItemsCount = Object.keys(selectedQuantities).length;

	const handleAddAllSelected = () => {
		if (!onAddMultipleProducts) return;
		const toAdd: Array<{ item: RetailProductItem; quantity: number }> = [];
		for (const [id, qty] of Object.entries(selectedQuantities)) {
			const item = RECEPTION_RETAIL_CATALOG.find((p) => p.id === id);
			if (item && qty > 0) {
				toAdd.push({ item, quantity: qty });
			}
		}
		if (toAdd.length > 0) {
			onAddMultipleProducts(toAdd);
			setSelectedQuantities({});
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
			data-testid="retail-products-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Витрина стойки ресепшена"
		>
			<div
				className="w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-2xl border border-[var(--line)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)] font-sans"
				onClick={(e) => e.stopPropagation()}
			>
				{/* 1. Header (Compact 48px) */}
				<header className="px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-strong,var(--paper,#ffffff))] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
							<ShoppingBag size={18} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h2 className="text-sm sm:text-base font-black truncate leading-tight">
									Витрина стойки ресепшена
								</h2>
								<span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
									54-ФЗ НДС 20% / Аванс
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] truncate">
								{patientName ? `Добавление товаров в чек пациента: ${patientName}` : "Curaprox · Marvis · Biorepair · Waterpik · Сертификаты"}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors shrink-0"
						aria-label="Закрыть витрину"
						data-testid="btn-close-retail-modal"
					>
						<X size={18} />
					</button>
				</header>

				{/* 2. Compact 1-Row Toolbar (Canonical Search + Filter Chips) */}
				<div className="px-4 sm:px-6 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
					{/* Search Input with barcode indicator */}
					<div className="dente-search-wrap retail-search-wrap shrink-0 relative">
						<Search
							size={14}
							className="dente-search-icon"
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по товарам..."
							className="dente-search-input"
							data-testid="input-retail-search"
							autoFocus
						/>
						{searchQuery ? (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={13} />
							</button>
						) : (
							<span className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--muted,#64748b)] items-center gap-0.5 pointer-events-none">
								<Barcode size={12} /> EAN-13
							</span>
						)}
					</div>

					{/* Category Selector Filter Chips (Canonical DENTE filter chips system) */}
					<div className="dente-filter-chips flex-1 min-w-0 overflow-x-auto scrollbar-none py-0.5 flex items-center gap-1.5 flex-nowrap">
						{CATEGORY_OPTIONS.map((cat) => {
							const isActive = selectedCategory === cat.id;
							return (
								<button
									key={cat.id}
									type="button"
									onClick={() => setSelectedCategory(cat.id)}
									className={`dente-filter-chip ${isActive ? "active" : ""}`}
									data-active={isActive}
									data-testid={`filter-cat-${cat.id}`}
								>
									{cat.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* 3. Product Grid Body */}
				<div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-3">
					{filteredProducts.length === 0 ? (
						<div className="py-12 text-center text-xs text-[var(--muted,#64748b)] space-y-2">
							<Package size={36} className="mx-auto text-slate-400 opacity-60" />
							<p className="font-semibold">Товары по запросу не найдены</p>
							<p className="text-[11px]">
								Попробуйте изменить поисковый запрос или выбрать другую категорию витрины
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{filteredProducts.map((product) => {
								const currentQty = selectedQuantities[product.id] || 1;
								const isAdded = addedSuccessId === product.id;
								const isCertificate = product.category === "certificates";

								return (
									<div
										key={product.id}
										className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
											isAdded
												? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30"
												: "border-[var(--line)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:border-teal-300 hover:shadow-xs"
										}`}
										data-testid={`product-card-${product.id}`}
									>
										{/* Card Header: Brand, SKU, VAT Badge */}
										<div className="space-y-1">
											<div className="flex items-center justify-between gap-1 text-[11px]">
												<span className="font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-400">
													{product.brand}
												</span>
												<div className="flex items-center gap-1">
													<span
														className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
															isCertificate
																? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
																: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
														}`}
														title={
															isCertificate
																? "Подарочный сертификат: Аванс по 54-ФЗ (Тег 1212 = 10, Без НДС)"
																: "Розничный товар: НДС 20% (ст. 164 НК РФ, Тег 1212 = 1, Тег 1199 = 1)"
														}
													>
														{isCertificate ? "АВАНС / БЕЗ НДС" : "НДС 20%"}
													</span>
												</div>
											</div>

											{/* Product Name */}
											<h3 className="font-bold text-xs sm:text-[13px] leading-snug line-clamp-2 text-[var(--ink,#0f172a)] min-h-[36px]">
												{product.name}
											</h3>

											{/* Product Description */}
											<p className="text-[11px] text-[var(--muted,#64748b)] line-clamp-2 leading-relaxed">
												{product.descriptionRu}
											</p>

											{/* Barcode & SKU metadata */}
											<div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--muted,#64748b)] pt-0.5">
												<span>Арт: {product.sku}</span>
												<span className="flex items-center gap-0.5">
													<Barcode size={11} /> {product.barcode}
												</span>
											</div>
										</div>

										{/* Card Footer: Price & 1-Click Action */}
										<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between gap-2">
											<div>
												<span className="text-[10px] text-[var(--muted,#64748b)] block">Цена:</span>
												<span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
													{product.priceRub.toLocaleString("ru-RU")} ₽
												</span>
											</div>

											<div className="flex items-center gap-1.5">
												{/* Quantity Stepper (Compact 28px) */}
												<div className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] p-0.5">
													<button
														type="button"
														onClick={() => handleQuantityChange(product.id, -1)}
														className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
														aria-label="Уменьшить количество"
													>
														-
													</button>
													<span className="w-6 text-center font-mono text-xs font-bold">
														{currentQty}
													</span>
													<button
														type="button"
														onClick={() => handleQuantityChange(product.id, 1)}
														className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
														aria-label="Увеличить количество"
													>
														+
													</button>
												</div>

												{/* Quick Add Button */}
												<button
													type="button"
													onClick={() => handleQuickAdd(product)}
													className="h-7 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
													style={{
														background: isAdded
															? "var(--teal, #0d9488)"
															: isCertificate
																? "#d97706"
																: "var(--teal, #0d9488)",
														color: "#ffffff",
													}}
													data-testid={`btn-add-product-${product.id}`}
													title={isCertificate ? "Добавить сертификат в чек" : "Добавить в чек (НДС 20%)"}
												>
													{isAdded ? (
														<>
															<Check size={13} className="shrink-0 animate-in zoom-in" />
															<span>В чеке</span>
														</>
													) : isCertificate ? (
														<>
															<Gift size={13} className="shrink-0" />
															<span>В чек</span>
														</>
													) : (
														<>
															<Plus size={13} className="shrink-0" />
															<span>В чек</span>
														</>
													)}
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* 4. Footer (Compact 44px) */}
				<footer className="px-4 sm:px-6 py-2.5 border-t border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3 text-xs shrink-0">
					<div className="flex items-center gap-2 text-[var(--muted,#64748b)]">
						<ShieldCheck size={14} className="text-teal-600 shrink-0" />
						<span className="hidden sm:inline">
							54-ФЗ: товары витрины пробиваются со ставкой <strong>НДС 20%</strong> (ст. 164 НК РФ). Медуслуги — <strong>Без НДС</strong>.
						</span>
						<span className="sm:hidden text-[11px]">
							Товары: НДС 20% · Услуги: Без НДС
						</span>
					</div>

					<div className="flex items-center gap-2">
						{onAddMultipleProducts && totalSelectedItemsCount > 1 && (
							<button
								type="button"
								onClick={handleAddAllSelected}
								className="h-8 px-3 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95"
							>
								Добавить выбранные ({totalSelectedItemsCount})
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							className="h-8 px-3.5 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
						>
							Готово
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
