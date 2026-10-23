/**
 * MarketingPromosList.tsx — Left Column: Active & Archived Clinic Promotions Catalog.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8c, 8e, 8am (Unified Design System).
 */

import React, { useMemo, useState } from "react";
import { Plus, Search, Tag, CheckCircle2, Archive, X } from "lucide-react";
import type { MarketingPromo, PromoStatus } from "./marketingTypes";
import { MarketingPromoCard } from "./MarketingPromoCard";

export interface MarketingPromosListProps {
	readonly promos: readonly MarketingPromo[];
	readonly selectedPromoId: string | null;
	readonly onSelectPromo: (promoId: string) => void;
	readonly onOpenNewPromoModal: () => void;
}

export const MarketingPromosList: React.FC<MarketingPromosListProps> = ({
	promos,
	selectedPromoId,
	onSelectPromo,
	onOpenNewPromoModal,
}) => {
	const [activeTab, setActiveTab] = useState<PromoStatus>("active");
	const [searchQuery, setSearchQuery] = useState("");

	const activeCount = useMemo(() => promos.filter((p) => p.status === "active").length, [promos]);
	const archivedCount = useMemo(() => promos.filter((p) => p.status === "archived").length, [promos]);

	const filteredPromos = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return promos.filter((p) => {
			if (p.status !== activeTab) return false;
			if (!q) return true;
			return p.title.toLowerCase().includes(q) || p.promoCode.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.discountText.toLowerCase().includes(q);
		});
	}, [promos, activeTab, searchQuery]);

	return (
		<div className="marketing-promos-col" data-testid="marketing-promos-list">
			<div className="marketing-col-header">
				<div className="marketing-segmented-control dente-segmented-bar h-8 rounded-lg" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "active"}
						className={`marketing-seg-btn dente-segmented-item ${activeTab === "active" ? "marketing-seg-btn--active active" : ""}`}
						onClick={() => setActiveTab("active")}
						data-testid="tab-promos-active"
					>
						<CheckCircle2 size={13} />
						<span>Активные ({activeCount})</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "archived"}
						className={`marketing-seg-btn dente-segmented-item ${activeTab === "archived" ? "marketing-seg-btn--active active" : ""}`}
						onClick={() => setActiveTab("archived")}
						data-testid="tab-promos-archived"
					>
						<Archive size={13} />
						<span>Архив ({archivedCount})</span>
					</button>
				</div>

				<button
					type="button"
					className="primary-button marketing-add-btn h-9 min-h-[36px] rounded-xl px-3"
					onClick={onOpenNewPromoModal}
					title="Создать новую промо-акцию клиники"
					data-testid="btn-new-promo"
				>
					<Plus size={14} />
					<span>Новая</span>
				</button>
			</div>

			<div className="dente-search-wrap marketing-search-box h-9 min-h-[36px] rounded-xl">
				<Search size={14} className="dente-search-icon marketing-search-icon" aria-hidden="true" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по названию или промокоду…"
					className="dente-search-input marketing-search-input h-9 min-h-[36px] !pl-[38px] rounded-xl bg-[var(--paper)] border border-[var(--line)]"
					data-testid="marketing-promos-search"
				/>
				{searchQuery && (
					<button type="button" className="dente-search-clear marketing-search-clear" onClick={() => setSearchQuery("")} aria-label="Очистить поиск">
						<X size={14} />
					</button>
				)}
			</div>

			<div className="marketing-promos-scroll">
				{filteredPromos.length === 0 ? (
					<div className="marketing-empty-list">
						<Tag size={28} className="marketing-empty-icon" />
						<p className="marketing-empty-text">
							{searchQuery ? "Акции по запросу не найдены" : promos.length === 0 ? "Акции клиники пока не созданы" : activeTab === "active" ? "Нет активных акций" : "Архив акций пуст"}
						</p>
					</div>
				) : (
					filteredPromos.map((promo) => (
						<MarketingPromoCard key={promo.id} promo={promo} isSelected={promo.id === selectedPromoId} onSelect={onSelectPromo} />
					))
				)}
			</div>
		</div>
	);
};
