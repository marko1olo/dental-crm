/**
 * MarketingPromoCard.tsx — Single Promo Card in Marketing List.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, 8am (Unified Design System).
 */

import React from "react";
import { Tag, Sparkles } from "lucide-react";
import type { MarketingPromo } from "./marketingTypes";

export interface MarketingPromoCardProps {
	readonly promo: MarketingPromo;
	readonly isSelected: boolean;
	readonly onSelect: (id: string) => void;
}

export const MarketingPromoCard: React.FC<MarketingPromoCardProps> = ({
	promo,
	isSelected,
	onSelect,
}) => {
	return (
		<div
			className={`marketing-promo-card ${isSelected ? "marketing-promo-card--selected" : ""}`}
			onClick={() => onSelect(promo.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(promo.id);
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
				<Sparkles size={12} className="text-[var(--primary)]" aria-hidden="true" />
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
};
