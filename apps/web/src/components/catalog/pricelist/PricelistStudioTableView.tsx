/**
 * apps/web/src/components/catalog/pricelist/PricelistStudioTableView.tsx
 *
 * Десктопная таблица услуг студии прейскуранта DENTE CRM.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 250).
 * Цвета строго var(--primary) (Мандат 8am).
 */

import React from "react";
import { Check, Edit2, Package } from "lucide-react";
import type { PricelistStudioItem } from "./pricelistCatalogTypes";
import {
	calculateMarginPercent,
	formatKopecksToRubles,
	getCategoryDisplayLabel,
	getMatchedTag,
	kopecksToRublesExact,
} from "../pricelistCatalogData";

export interface PricelistStudioTableViewProps {
	readonly items: readonly PricelistStudioItem[];
	readonly searchQuery: string;
	readonly editingPriceId: string | null;
	readonly inlinePriceInput: string;
	readonly onStartEditPrice: (item: PricelistStudioItem) => void;
	readonly onInlinePriceInputChange: (val: string) => void;
	readonly onInlinePriceSave: (itemId: string) => void;
	readonly onCancelEditPrice: () => void;
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

export const PricelistStudioTableView: React.FC<PricelistStudioTableViewProps> = ({
	items,
	searchQuery,
	editingPriceId,
	inlinePriceInput,
	onStartEditPrice,
	onInlinePriceInputChange,
	onInlinePriceSave,
	onCancelEditPrice,
	onOpenEdit,
	onToggleActive,
}) => {
	return (
		<table className="pricelist-table-view">
			<thead>
				<tr>
					<th style={{ width: "95px" }}>Код</th>
					<th>Наименование процедуры</th>
					<th style={{ width: "130px" }}>Категория</th>
					<th style={{ width: "90px", textAlign: "right" }}>Время</th>
					<th style={{ width: "140px", textAlign: "right" }}>Цена</th>
					<th style={{ width: "90px", textAlign: "right" }}>Маржа</th>
					<th style={{ width: "110px", textAlign: "center" }}>Действия</th>
				</tr>
			</thead>
			<tbody>
				{items.map((item) => {
					const isEditingPrice = editingPriceId === item.id;
					const margin = calculateMarginPercent(item.priceKopecks, item.costKopecks);
					const matchedTag = searchQuery.trim() ? getMatchedTag(item, searchQuery) : null;
					return (
						<tr
							key={item.id}
							className="pricelist-table-row"
							style={{ opacity: item.isActive ? 1 : 0.55 }}
						>
							<td>
								<span className="pricelist-item-code-badge" title="Код позиции в каталоге клиники">
									<HighlightMatch text={item.code} query={searchQuery} />
								</span>
							</td>
							<td>
								<div className="pricelist-item-title flex items-center gap-1.5 flex-wrap">
									{item.isBundle && (
										<Package size={14} className="text-[var(--primary)] shrink-0" />
									)}
									<span>
										<HighlightMatch text={item.title} query={searchQuery} />
									</span>
									{matchedTag && (
										<span className="pricelist-tag-match-chip" title={`Найдено по тегу / синониму: ${matchedTag}`}>
											#{matchedTag}
										</span>
									)}
								</div>
							</td>
							<td>
								<span className="text-xs text-[var(--muted)]">
									{getCategoryDisplayLabel(item.category)}
								</span>
							</td>
							<td style={{ textAlign: "right" }} className="text-xs text-[var(--muted)]">
								{item.durationMin} мин
							</td>
							<td style={{ textAlign: "right" }}>
								{isEditingPrice ? (
									<input
										type="text"
										autoFocus
										className="pricelist-price-input"
										value={inlinePriceInput}
										onChange={(e) => onInlinePriceInputChange(e.target.value)}
										onBlur={() => onInlinePriceSave(item.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter") onInlinePriceSave(item.id);
											if (e.key === "Escape") onCancelEditPrice();
										}}
									/>
								) : (
									<div
										className="pricelist-price-cell"
										onClick={() => onStartEditPrice(item)}
										title="Нажмите для изменения цены"
									>
										<span>{formatKopecksToRubles(item.priceKopecks)}</span>
										<Edit2 size={12} className="text-[var(--muted)]" />
									</div>
								)}
							</td>
							<td style={{ textAlign: "right" }}>
								<span
									className="text-xs font-semibold"
									style={{ color: margin >= 70 ? "var(--primary)" : "inherit" }}
								>
									{margin}%
								</span>
							</td>
							<td style={{ textAlign: "center" }}>
								<div className="flex items-center justify-center gap-1">
									<button
										type="button"
										className="pricelist-btn pricelist-btn-icon"
										style={{ width: "32px", height: "32px" }}
										onClick={() => onOpenEdit(item)}
										title="Редактировать услугу"
									>
										<Edit2 size={14} />
									</button>
									<button
										type="button"
										className="pricelist-btn pricelist-btn-icon"
										style={{
											width: "32px",
											height: "32px",
											color: item.isActive ? "var(--primary)" : "var(--muted)",
										}}
										onClick={() => onToggleActive(item.id)}
										title={item.isActive ? "Выключить" : "Включить"}
									>
										<Check size={14} />
									</button>
								</div>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
};
