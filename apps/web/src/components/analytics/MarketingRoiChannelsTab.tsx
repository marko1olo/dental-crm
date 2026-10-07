/**
 * Вкладка детальной таблицы эффективности рекламных каналов и ROMI.
 */

import { Search, X } from "lucide-react";
import React from "react";

export interface ChannelPerformanceRow {
	id: string;
	channelKey: string;
	nameRu: string;
	categoryRu: string;
	adSpendFormatted: string;
	callsCount: number;
	cplFormatted: string;
	bookedAppointmentsCount: number;
	cpaFormatted: string;
	paidPlansCount: number;
	revenueFormatted: string;
	cacFormatted: string;
	profitFormatted: string;
	profitKopecks: number;
	romiFormatted: string;
	romiStatus: string;
	notes?: string | undefined;
}

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
			{/* Filter and Search Bar */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs font-semibold text-[var(--muted,#94a3b8)]">Категория:</span>
					<div className="dente-filter-chips">
						{uniqueCategories.map((cat) => (
							<button
								key={cat}
								type="button"
								onClick={() => onCategoryFilterChange(cat)}
								className={`dente-filter-chip ${
									categoryFilter === cat ? "active" : ""
								}`}
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

			{/* Table */}
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
								<td
									colSpan={10}
									className="text-center py-10 text-[var(--muted,#94a3b8)] text-xs font-semibold"
									data-testid="channels-empty-state"
								>
									Нет данных по рекламным каналам за выбранный период
								</td>
							</tr>
						) : (
							filteredChannels.map((ch) => {
								let statusClass = "status-profitable";
								if (ch.romiStatus === "super_profitable") {
									statusClass = "status-super-profitable";
								} else if (ch.romiStatus === "loss") {
									statusClass = "status-loss";
								} else if (ch.romiStatus === "organic") {
									statusClass = "status-organic";
								} else if (ch.romiStatus === "break_even") {
									statusClass = "status-break-even";
								}

								return (
									<tr key={ch.id} data-testid={`channel-row-${ch.channelKey}`}>
										<td>
											<div className="font-bold text-[var(--ink,#f8fafc)]">{ch.nameRu}</div>
											{ch.notes && (
												<div className="text-xs text-[var(--muted,#94a3b8)]">
													{ch.notes}
												</div>
											)}
										</td>
										<td>
											<span className="marketing-roi-chip">{ch.categoryRu}</span>
										</td>
										<td className="text-right font-mono font-bold">
											{ch.adSpendFormatted}
										</td>
										<td className="text-center font-mono">
											{ch.callsCount}
											<div className="text-xs text-[var(--muted,#94a3b8)]">
												CPL: {ch.cplFormatted}
											</div>
										</td>
										<td className="text-center font-mono">
											{ch.bookedAppointmentsCount}
											<div className="text-xs text-[var(--muted,#94a3b8)]">
												CPA: {ch.cpaFormatted}
											</div>
										</td>
										<td className="text-center font-mono font-bold text-teal-400">
											{ch.paidPlansCount}
										</td>
										<td className="text-right font-mono font-bold">
											{ch.revenueFormatted}
										</td>
										<td className="text-right font-mono text-emerald-400 font-bold">
											{ch.cacFormatted}
										</td>
										<td className="text-right font-mono font-bold">
											<span
												className={
													ch.profitKopecks >= 0 ? "text-emerald-400" : "text-rose-400"
												}
											>
												{ch.profitFormatted}
											</span>
										</td>
										<td className="text-center">
											<span className={`marketing-roi-status-badge ${statusClass}`}>
												{ch.romiFormatted}
											</span>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
