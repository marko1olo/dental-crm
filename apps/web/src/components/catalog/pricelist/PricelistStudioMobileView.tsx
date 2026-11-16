/**
 * apps/web/src/components/catalog/pricelist/PricelistStudioMobileView.tsx
 *
 * Мобильное сенсорное представление каталога услуг (Apple HIG).
 * Декомпозирован строго по Мандату 8b (лимит строк <= 180).
 * Тач-мишени >= 44x44px (Мандат 8ze), семантические токены (Мандат 8am).
 */

import React from "react";
import { Check, Edit2 } from "lucide-react";
import type { PricelistStudioItem } from "./pricelistCatalogTypes";
import {
	formatKopecksToRubles,
	getCategoryDisplayLabel,
	getMatchedTag,
} from "../pricelistCatalogData";

export interface PricelistStudioMobileViewProps {
	readonly items: readonly PricelistStudioItem[];
	readonly searchQuery: string;
	readonly onOpenEdit: (item: PricelistStudioItem) => void;
	readonly onToggleActive: (itemId: string) => void;
}

const HighlightMatch: React.FC<{ readonly text: string; readonly query: string }> = ({
	text,
	query,
}) => {
	const trimmed = query.trim();
	if (!trimmed) return <>{text}</>;
	const escaped = trimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
	const regex = new RegExp(`(${escaped})`, "gi");
	const parts = text.split(regex);
	return (
		<>
			{parts.map((part, i) =>
				part.toLowerCase() === trimmed.toLowerCase() ? (
					<mark key={i} className="pricelist-match-highlight">
						{part}
					</mark>
				) : (
					part
				),
			)}
		</>
	);
};

export const PricelistStudioMobileView: React.FC<PricelistStudioMobileViewProps> = ({
	items,
	searchQuery,
	onOpenEdit,
	onToggleActive,
}) => {
	return (
		<div className="pricelist-mobile-card-list">
			{items.map((item) => {
				const matchedTag = searchQuery.trim() ? getMatchedTag(item, searchQuery) : null;
				return (
					<div
						key={item.id}
						className="pricelist-mobile-card"
						style={{ opacity: item.isActive ? 1 : 0.6 }}
					>
						<div className="flex items-start justify-between gap-3 w-full">
							<div className="min-w-0 flex-1 pr-1">
								<div className="flex items-center gap-1.5 mb-1 flex-wrap">
									<span className="pricelist-item-code-badge font-mono shrink-0">
										<HighlightMatch text={item.code} query={searchQuery} />
									</span>
									{item.isBundle && (
										<span className="text-[11px] font-semibold text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-md shrink-0">
											Комплекс
										</span>
									)}
									{matchedTag && (
										<span className="pricelist-tag-match-chip font-mono">
											#{matchedTag}
										</span>
									)}
								</div>
								<h4 className="font-semibold text-sm text-[var(--ink)] leading-snug break-words">
									<HighlightMatch text={item.title} query={searchQuery} />
								</h4>
							</div>
							<button
								type="button"
								className="pricelist-price-cell text-base font-bold text-[var(--ink)] font-mono tabular-nums shrink-0 min-h-[44px] h-11 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] cursor-pointer whitespace-nowrap"
								onClick={() => onOpenEdit(item)}
								title="Нажмите для редактирования"
							>
								{formatKopecksToRubles(item.priceKopecks)}
							</button>
						</div>
						<div className="flex items-center justify-between pt-2.5 border-t border-[var(--line)] text-xs text-[var(--muted)]">
							<span className="truncate pr-2">
								{getCategoryDisplayLabel(item.category)} · {item.durationMin} мин
							</span>
							<div className="flex items-center gap-1.5 shrink-0">
								<button
									type="button"
									className="pricelist-btn dente-btn-secondary text-xs px-3.5 min-h-[44px] h-11 rounded-xl font-medium inline-flex items-center justify-center cursor-pointer"
									onClick={() => onOpenEdit(item)}
								>
									<Edit2 size={13} className="mr-1 text-current inline" />
									<span>Изменить</span>
								</button>
								<button
									type="button"
									className="pricelist-btn pricelist-btn-icon dente-btn-secondary min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl cursor-pointer"
									style={{
										color: item.isActive ? "var(--primary)" : "var(--muted)",
									}}
									onClick={() => onToggleActive(item.id)}
									title={item.isActive ? "Выключить услугу" : "Включить услугу"}
									aria-label={item.isActive ? "Выключить услугу" : "Включить услугу"}
								>
									<Check size={16} className="text-current" />
								</button>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};
