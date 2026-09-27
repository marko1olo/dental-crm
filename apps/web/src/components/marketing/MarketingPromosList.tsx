/**
 * MarketingPromosList.tsx — Left Column: Active & Archived Clinic Promotions Catalog.
 * Governed by Mandate 8c, 8d, 8e (Compact Desktop Ergonomics, Quiet Telemetry).
 */

import React, { useMemo, useState } from "react";
import { Plus, Search, Tag, CheckCircle2, Archive, Sparkles } from "lucide-react";
import type { MarketingPromo, PromoStatus } from "./marketingTypes";

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

	const activeCount = useMemo(
		() => promos.filter((p) => p.status === "active").length,
		[promos],
	);
	const archivedCount = useMemo(
		() => promos.filter((p) => p.status === "archived").length,
		[promos],
	);

	const filteredPromos = useMemo(() => {
		const lowerQuery = searchQuery.trim().toLowerCase();
		return promos.filter((promo) => {
			if (promo.status !== activeTab) return false;
			if (!lowerQuery) return true;
			return (
				promo.title.toLowerCase().includes(lowerQuery) ||
				promo.promoCode.toLowerCase().includes(lowerQuery) ||
				promo.category.toLowerCase().includes(lowerQuery) ||
				promo.discountText.toLowerCase().includes(lowerQuery)
			);
		});
	}, [promos, activeTab, searchQuery]);

	return (
		<div className="marketing-promos-col" data-testid="marketing-promos-list">
			{/* Top Bar: Segmented Switcher & New Promo CTA */}
			<div className="marketing-col-header">
				<div className="marketing-segmented-control" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "active"}
						className={`marketing-seg-btn ${activeTab === "active" ? "marketing-seg-btn--active" : ""}`}
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
						className={`marketing-seg-btn ${activeTab === "archived" ? "marketing-seg-btn--active" : ""}`}
						onClick={() => setActiveTab("archived")}
						data-testid="tab-promos-archived"
					>
						<Archive size={13} />
						<span>Архив ({archivedCount})</span>
					</button>
				</div>

				<button
					type="button"
					className="secondary-button marketing-add-btn"
					onClick={onOpenNewPromoModal}
					title="Создать новую промо-акцию клиники"
					data-testid="btn-new-promo"
				>
					<Plus size={14} />
					<span>Новая</span>
				</button>
			</div>

			{/* Search input */}
			<div className="marketing-search-box">
				<Search size={14} className="marketing-search-icon" aria-hidden="true" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по названию или промокоду…"
					className="marketing-search-input"
					data-testid="marketing-promos-search"
				/>
				{searchQuery && (
					<button
						type="button"
						className="marketing-search-clear"
						onClick={() => setSearchQuery("")}
						aria-label="Очистить поиск"
					>
						✕
					</button>
				)}
			</div>

			{/* Cards List */}
			<div className="marketing-promos-scroll">
				{filteredPromos.length === 0 ? (
					<div className="marketing-empty-list">
						<Tag size={28} className="marketing-empty-icon" />
						<p className="marketing-empty-text">
							{searchQuery
								? "Акции по данному запросу не найдены"
								: activeTab === "active"
									? "Нет активных акций"
									: "Архив акций пуст"}
						</p>
					</div>
				) : (
					filteredPromos.map((promo) => {
						const isSelected = promo.id === selectedPromoId;
						return (
							<div
								key={promo.id}
								className={`marketing-promo-card ${isSelected ? "marketing-promo-card--selected" : ""}`}
								onClick={() => onSelectPromo(promo.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSelectPromo(promo.id);
									}
								}}
								role="button"
								tabIndex={0}
								data-testid={`promo-card-${promo.id}`}
							>
								<div className="marketing-promo-card__top">
									<div className="marketing-code-chip">
										<Tag size={11} aria-hidden="true" />
										<span>{promo.promoCode}</span>
									</div>
									<span
										className={`marketing-status-pill ${
											promo.status === "active"
												? "marketing-status-pill--active"
												: "marketing-status-pill--archived"
										}`}
									>
										{promo.status === "active" ? promo.badge : "В архиве"}
									</span>
								</div>

								<h4 className="marketing-promo-card__title">{promo.title}</h4>

								<div className="marketing-promo-card__discount">
									<Sparkles size={12} className="text-teal" aria-hidden="true" />
									<span>{promo.discountText}</span>
								</div>

								<div className="marketing-promo-card__meta">
									<span className="marketing-promo-category">{promo.category}</span>
									<span className="marketing-promo-validity">до {promo.validUntil}</span>
								</div>

								<div className="marketing-promo-card__stats-strip">
									<div className="marketing-mini-stat">
										<span className="marketing-mini-stat__val">{promo.stats.reach}</span>
										<span className="marketing-mini-stat__lbl">охват</span>
									</div>
									<div className="marketing-mini-stat-sep" />
									<div className="marketing-mini-stat">
										<span className="marketing-mini-stat__val">{promo.stats.conversionPercent}%</span>
										<span className="marketing-mini-stat__lbl">конверсия</span>
									</div>
									<div className="marketing-mini-stat-sep" />
									<div className="marketing-mini-stat">
										<span className="marketing-mini-stat__val">
											{(promo.stats.revenueRub / 1000).toFixed(0)}k ₽
										</span>
										<span className="marketing-mini-stat__lbl">выручка</span>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};
