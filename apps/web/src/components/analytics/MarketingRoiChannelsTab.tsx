/**
 * Вкладка детальной таблицы эффективности рекламных каналов и ROMI.
 */

import { Search } from "lucide-react";
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
					<div className="flex items-center gap-1 flex-wrap">
						{uniqueCategories.map((cat) => (
							<button
								key={cat}
								type="button"
								onClick={() => onCategoryFilterChange(cat)}
								className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-all ${
									categoryFilter === cat
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
										: "bg-[var(--paper-soft,#0f172a)] text-[var(--muted,#94a3b8)] border-[var(--line,rgba(204,251,241,0.15))] hover:text-white"
								}`}
							>
								{cat === "all" ? "Все каналы" : cat}
							</button>
						))}
					</div>
				</div>

				<div className="relative min-w-[240px]">
					<Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted,#94a3b8)]" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						placeholder="Поиск канала или заметки..."
						className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--paper-soft,#0f172a)] text-[var(--ink,#f8fafc)] border border-[var(--line,rgba(204,251,241,0.15))] outline-none focus:border-[var(--teal,#0d9488)]"
						data-testid="search-channels-input"
					/>
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
												<div className="text-[11px] text-[var(--muted,#94a3b8)]">
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
											<div className="text-[10px] text-[var(--muted,#94a3b8)]">
												CPL: {ch.cplFormatted}
											</div>
										</td>
										<td className="text-center font-mono">
											{ch.bookedAppointmentsCount}
											<div className="text-[10px] text-[var(--muted,#94a3b8)]">
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
