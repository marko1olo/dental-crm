/**
 * apps/web/src/components/billing/RetailProductsModal.tsx
 *
 * DENTE Dental CRM — Reception Retail Showcase Modal.
 * Decomposed facade delegating to ./retail/ in strict compliance with Mandate 8b.
 * Strictly <= 120 lines.
 */

import React, { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { RECEPTION_RETAIL_CATALOG, type RetailProductCategory, type RetailProductItem } from "@dental/shared";
import type { RetailProductsModalProps } from "./retail/retailTypes.js";
import { RetailModalHeader, RetailModalFooter } from "./retail/RetailModalHeaderFooter.js";
import { RetailToolbar } from "./retail/RetailToolbar.js";
import { RetailProductCard } from "./retail/RetailProductCard.js";

export type { RetailProductsModalProps };

export const RetailProductsModal: React.FC<RetailProductsModalProps> = ({
	isOpen, onClose, onAddProduct, onAddMultipleProducts, patientName, initialCategory = "all",
}) => {
	if (!isOpen) return null;

	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedCategory, setSelectedCategory] = useState<RetailProductCategory | "all">(initialCategory);
	const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
	const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);

	const filteredProducts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return RECEPTION_RETAIL_CATALOG.filter((item) => {
			if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
			if (!query) return true;
			return (
				item.name.toLowerCase().includes(query) || item.brand.toLowerCase().includes(query) ||
				item.sku.toLowerCase().includes(query) || item.barcode.toLowerCase().includes(query) ||
				item.descriptionRu.toLowerCase().includes(query)
			);
		});
	}, [searchQuery, selectedCategory]);

	const handleQuantityChange = (itemId: string, delta: number) => {
		setSelectedQuantities((prev) => ({
			...prev, [itemId]: Math.max(1, Math.min(99, (prev[itemId] || 1) + delta)),
		}));
	};

	const handleQuickAdd = (item: RetailProductItem) => {
		onAddProduct(item, selectedQuantities[item.id] || 1);
		setAddedSuccessId(item.id);
		setTimeout(() => setAddedSuccessId(null), 1200);
	};

	const handleAddAllSelected = () => {
		if (!onAddMultipleProducts) return;
		const toAdd: Array<{ item: RetailProductItem; quantity: number }> = [];
		for (const [id, qty] of Object.entries(selectedQuantities)) {
			const item = RECEPTION_RETAIL_CATALOG.find((p) => p.id === id);
			if (item && qty > 0) toAdd.push({ item, quantity: qty });
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
			data-testid="retail-products-modal" role="dialog" aria-modal="true" aria-label="Витрина стойки ресепшена"
		>
			<div
				className="w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-2xl border border-[var(--line)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)] font-sans"
				onClick={(e) => e.stopPropagation()}
			>
				<RetailModalHeader patientName={patientName} onClose={onClose} />
				<RetailToolbar
					searchQuery={searchQuery} setSearchQuery={setSearchQuery}
					selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
				/>

				<div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-3">
					{filteredProducts.length === 0 ? (
						<div className="py-12 text-center text-xs text-[var(--muted,#64748b)] space-y-2">
							<Package size={36} className="mx-auto text-slate-400 opacity-60" />
							<p className="font-semibold">Товары по запросу не найдены</p>
							<p className="text-[11px]">Попробуйте изменить поисковый запрос или выбрать другую категорию</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
							{filteredProducts.map((product) => (
								<RetailProductCard
									key={product.id} product={product}
									currentQty={selectedQuantities[product.id] || 1}
									isAdded={addedSuccessId === product.id}
									onQuantityChange={handleQuantityChange}
									onQuickAdd={handleQuickAdd}
								/>
							))}
						</div>
					)}
				</div>

				<RetailModalFooter
					totalSelectedItemsCount={Object.keys(selectedQuantities).length}
					onAddAllSelected={handleAddAllSelected}
					onClose={onClose}
				/>
			</div>
		</div>
	);
};

export default RetailProductsModal;
