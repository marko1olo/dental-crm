/**
 * DENTE Dental CRM — Leads Kanban Header & Filter Controls
 *
 * Mandate 8s (Modular Architecture & Anti-Bloat)
 */

import type React from "react";
import { BarChart3, Filter, Plus, RotateCcw, Search, X } from "lucide-react";

export interface LeadsKanbanHeaderProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	sourceFilter: string;
	setSourceFilter: (val: string) => void;
	uniqueSources: string[];
	viewMode: "funnel" | "all";
	setViewMode: (val: "funnel" | "all") => void;
	secondaryLeadsCount?: number;
	onNewLead: () => void;
	onOpenAnalytics: () => void;
	onOpenLeakDetector: () => void;
	borderColor?: string;
	colBg?: string;
}

export const LeadsKanbanHeader: React.FC<LeadsKanbanHeaderProps> = ({
	searchQuery,
	setSearchQuery,
	sourceFilter,
	setSourceFilter,
	uniqueSources,
	viewMode,
	setViewMode,
	secondaryLeadsCount = 0,
	onNewLead,
	onOpenAnalytics,
	onOpenLeakDetector,
	borderColor = "var(--line)",
	colBg = "var(--paper-soft)",
}) => {
	return (
		<div className="flex flex-col gap-3 mb-5">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: 12,
				}}
			>
				<div className="flex items-center gap-2.5 flex-wrap">
					<h2 className="m-0 text-lg font-bold text-[var(--ink)] flex items-center gap-2">
						Воронка обращений
					</h2>

					{/* Segmented Funnel / All stages selector */}
					<div
						className="leads-viewmode-segmented dente-segmented-bar"
						role="tablist"
						aria-label="Выбор отображения этапов воронки"
					>
						<button
							type="button"
							role="tab"
							aria-selected={viewMode === "funnel"}
							className={`leads-viewmode-segmented-btn dente-segmented-item ${viewMode === "funnel" ? "is-active active" : ""}`}
							onClick={() => setViewMode("funnel")}
							data-testid="leads-viewmode-funnel-btn"
							title="Показать 4 ключевых этапа воронки пациентов"
						>
							<span>Воронка (4)</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={viewMode === "all"}
							className={`leads-viewmode-segmented-btn dente-segmented-item ${viewMode === "all" ? "is-active active" : ""}`}
							onClick={() => setViewMode("all")}
							data-testid="leads-viewmode-all-btn"
							title="Показать все 6 колонок включая недозвоны и отказы"
						>
							<span>Все этапы (6)</span>
							{secondaryLeadsCount > 0 && (
								<span className="leads-viewmode-badge">
									{secondaryLeadsCount}
								</span>
							)}
						</button>
					</div>

					<button
						className="primary-button h-8 min-h-[32px] text-[13px] font-semibold px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98] inline-flex items-center gap-1.5"
						onClick={onNewLead}
						type="button"
						aria-label="Создать новое обращение"
					>
						<Plus size={14} /> Новый лид
					</button>
					<button
						className="secondary-button h-8 min-h-[32px] text-[13px] font-medium px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98] inline-flex items-center gap-1.5"
						onClick={onOpenAnalytics}
						type="button"
						aria-label="Открыть сквозную аналитику воронки"
					>
						<BarChart3 size={14} className="text-[var(--teal)]" /> Аналитика воронки
					</button>
					<button
						className="secondary-button h-8 min-h-[32px] text-[13px] font-medium px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98] inline-flex items-center gap-1.5"
						onClick={onOpenLeakDetector}
						type="button"
						aria-label="Открыть детектор оттока пациентов (210 дней)"
					>
						<RotateCcw size={14} className="text-[var(--teal)]" /> Детектор оттока
					</button>
				</div>

				<div className="flex items-center gap-2.5">
					<div className="dente-search-wrap w-60">
						<Search
							size={14}
							className="dente-search-icon"
						/>
						<input
							type="text"
							placeholder="Поиск по имени или телефону..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="dente-search-input"
							aria-label="Поиск по имени или телефону"
						/>
						{searchQuery && (
							<button
								type="button"
								className="dente-search-clear"
								onClick={() => setSearchQuery("")}
								aria-label="Очистить поиск"
							>
								<X size={13} />
							</button>
						)}
					</div>
					<div style={{ position: "relative" }}>
						<Filter
							size={14}
							color="var(--muted)"
							style={{ position: "absolute", left: 10, top: 9 }}
						/>
						<select
							value={sourceFilter}
							onChange={(e) => setSourceFilter(e.target.value)}
							className="h-8 text-[12.5px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] pl-8 pr-3 outline-none cursor-pointer hover:border-[var(--line-strong,var(--line))]"
							style={{
								minWidth: 140,
							}}
							aria-label="Фильтр по каналу обращения"
						>
							<option value="">Все каналы</option>
							{uniqueSources.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Channel Filter Chips: WhatsApp, Звонки, Сайт, ВК etc. */}
			{uniqueSources.length > 0 && (
				<div className="dente-filter-chips" role="radiogroup" aria-label="Фильтры каналов лидов">
					<button
						type="button"
						onClick={() => setSourceFilter("")}
						className={`dente-filter-chip ${!sourceFilter ? "active" : ""}`}
						style={{ minWidth: "max-content" }}
					>
						Все каналы
					</button>
					{uniqueSources.map((source) => (
						<button
							key={source}
							type="button"
							onClick={() => setSourceFilter(source === sourceFilter ? "" : source)}
							className={`dente-filter-chip ${sourceFilter === source ? "active" : ""}`}
							style={{ minWidth: "max-content" }}
						>
							{source}
						</button>
					))}
				</div>
			)}
		</div>
	);
};
