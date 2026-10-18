import React from "react";
import { Search, X } from "lucide-react";
import { MarketingRoiChannelTableRow } from "./marketingModules/MarketingRoiChannelTableRow";
import type { ChannelPerformanceRow } from "./marketingModules/marketingTypes";

export type { ChannelPerformanceRow };

export interface MarketingRoiChannelsTabProps {
	readonly uniqueCategories: readonly string[];
	readonly categoryFilter: string;
	readonly onCategoryFilterChange: (category: string) => void;
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly filteredChannels: readonly ChannelPerformanceRow[];
}

export function MarketingRoiChannelsTab({
	uniqueCategories,
	categoryFilter,
	onCategoryFilterChange,
	searchQuery,
	onSearchQueryChange,
	filteredChannels,
}: MarketingRoiChannelsTabProps) {
	return (
		<div className="space-y-4" data-testid="channels-view">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs font-semibold text-[var(--muted,#94a3b8)]">Категория:</span>
					<div className="dente-filter-chips">
						{uniqueCategories.map((cat) => (
							<button
								key={cat}
								type="button"
								onClick={() => onCategoryFilterChange(cat)}
								className={`dente-filter-chip ${categoryFilter === cat ? "active" : ""}`}
								data-active={categoryFilter === cat}
							>
								{cat === "all" ? "Все каналы" : cat}
							</button>
						))}
					</div>
				</div>

				<div className="dente-search-wrap min-w-[240px]">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						placeholder="Поиск канала или заметки..."
						className="dente-search-input"
						data-testid="search-channels-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchQueryChange("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>
			</div>

			<div className="marketing-roi-table-container">
				<table className="marketing-roi-table">
					<thead>
						<tr>
							<th>Рекламный канал</th>
							<th>Категория</th>
							<th className="text-right">Затраты (₽)</th>
							<th className="text-center">Звонки</th>
							<th className="text-center">Записи</th>
							<th className="text-center">Оплачено</th>
							<th className="text-right">Выручка (₽)</th>
							<th className="text-right">CAC (₽)</th>
							<th className="text-right">Прибыль (₽)</th>
							<th className="text-center">ROMI (%)</th>
						</tr>
					</thead>
					<tbody>
						{filteredChannels.length === 0 ? (
							<tr>
								<td colSpan={10} className="text-center py-10 text-[var(--muted,#94a3b8)] text-xs font-semibold" data-testid="channels-empty-state">
									Нет данных по рекламным каналам за выбранный период
								</td>
							</tr>
						) : (
							filteredChannels.map((ch) => <MarketingRoiChannelTableRow key={ch.id} ch={ch} />)
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
