/**
 * DENTE Dental CRM — Comparison Row & Price Delta Presentation
 * Unified SSOT Presentation Module (Mandates 8b, 8zi, 8e, 8am)
 */

import { ArrowRight, Check, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";
import type { IngestedMappingItem } from "../types";
import { calculateItemPriceDiff, type ItemPriceDiffResult } from "./usePriceDiffPanesState";

export interface PriceDiffComparisonRowProps {
	readonly item: IngestedMappingItem;
	readonly diffResult?: ItemPriceDiffResult | undefined;
	readonly formatPrice: (rub: number) => string;
	readonly isSelected?: boolean | undefined;
	readonly onToggleSelect?: (() => void) | undefined;
	readonly onModifyDelta?: ((deltaRub: number) => void) | undefined;
	readonly onSetZero?: (() => void) | undefined;
}

export const PriceDiffComparisonRow: React.FC<PriceDiffComparisonRowProps> = ({
	item,
	diffResult,
	formatPrice,
	isSelected = item.isApproved,
	onToggleSelect,
	onModifyDelta,
	onSetZero,
}) => {
	const diff = diffResult ?? calculateItemPriceDiff(item);
	const isWarranty = item.priceRub === 0;

	const renderDeltaBadge = () => {
		if (diff.trend === "new") {
			return (
				<span className="pricelist-diff-action-tag create" title="Новая позиция каталога">
					<Sparkles size={11} style={{ display: "inline", marginRight: 3 }} />
					Новая
				</span>
			);
		}
		if (diff.trend === "increase") {
			return (
				<span
					className="pricelist-diff-confidence-badge medium"
					title={`Повышение цены на ${formatPrice(diff.deltaRub)} (+${diff.deltaPercent}%)`}
				>
					<TrendingUp size={11} style={{ display: "inline", marginRight: 3 }} />
					{`+${formatPrice(diff.deltaRub)} (+${diff.deltaPercent}%)`}
				</span>
			);
		}
		if (diff.trend === "decrease") {
			return (
				<span
					className="pricelist-diff-confidence-badge high"
					title={`Снижение цены на ${formatPrice(Math.abs(diff.deltaRub))} (${diff.deltaPercent}%)`}
				>
					<TrendingDown size={11} style={{ display: "inline", marginRight: 3 }} />
					{`${formatPrice(diff.deltaRub)} (${diff.deltaPercent}%)`}
				</span>
			);
		}
		return (
			<span className="pricelist-diff-action-tag" title="Цена не изменилась">
				Без изменений
			</span>
		);
	};

	return (
		<div
			className={`pricelist-diff-mapped-row ${!isSelected ? "is-dismissed" : ""}`}
			data-testid={`diff-comparison-row-${item.id}`}
		>
			<div className="pricelist-diff-mapped-header">
				<div className="pricelist-diff-badges-wrap">
					<span className="pricelist-diff-statutory-code" title={item.statutoryTitle804n}>
						{item.code804n}
					</span>
					{renderDeltaBadge()}
				</div>

				<div className="pricelist-diff-mapped-title-block">
					<div className="pricelist-diff-commercial-title" title={item.cleanedTitle}>
						{item.cleanedTitle}
					</div>
					<div className="pricelist-diff-statutory-title" title={item.statutoryTitle804n}>
						{item.statutoryTitle804n}
					</div>
				</div>
			</div>

			<div className="pricelist-diff-price-col">
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.375rem",
						fontSize: "0.8125rem",
						fontWeight: 700,
					}}
				>
					{diff.oldPriceRub > 0 ? (
						<span style={{ color: "var(--muted)", textDecoration: "line-through" }}>
							{formatPrice(diff.oldPriceRub)}
						</span>
					) : (
						<span style={{ color: "var(--muted)" }}>—</span>
					)}
					<ArrowRight size={12} style={{ color: "var(--muted)" }} />
					<span style={{ color: isWarranty ? "var(--ok-fg)" : "var(--ink)" }}>
						{isWarranty ? "0 ₽ (Гарантия)" : formatPrice(item.priceRub)}
					</span>
				</div>

				{onModifyDelta && onSetZero && (
					<div className="pricelist-diff-price-modifiers">
						<button
							type="button"
							className="pricelist-diff-delta-btn"
							onClick={() => onModifyDelta(-100)}
							title="Уменьшить цену на 100 ₽"
						>
							-100 ₽
						</button>
						<button
							type="button"
							className="pricelist-diff-delta-btn"
							onClick={() => onModifyDelta(100)}
							title="Увеличить цену на 100 ₽"
						>
							+100 ₽
						</button>
						<button
							type="button"
							className={`pricelist-diff-delta-btn ${isWarranty ? "btn-warranty" : ""}`}
							onClick={onSetZero}
							title="Установить 0 ₽ (Гарантийный случай / бесплатно)"
						>
							0 ₽
						</button>
					</div>
				)}
			</div>

			{onToggleSelect && (
				<div className="pricelist-diff-row-actions">
					<button
						type="button"
						className={`pricelist-diff-icon-btn ${isSelected ? "approved" : ""}`}
						onClick={onToggleSelect}
						title={isSelected ? "Услуга включена в прейскурант" : "Услуга исключена"}
						aria-label={isSelected ? "Исключить услугу" : "Включить услугу"}
					>
						<Check size={13} />
					</button>
				</div>
			)}
		</div>
	);
};
