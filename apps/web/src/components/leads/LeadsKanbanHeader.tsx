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
		<div className="mb-4">
			<div className="flex items-center justify-between gap-2 flex-nowrap">
				<div className="flex items-center gap-2 min-w-0">
					<h2 className="m-0 text-base font-bold text-[var(--ink)] whitespace-nowrap shrink-0">
						Воронка обращений
					</h2>

					{/* Segmented Funnel / All stages selector */}
					<div
						className="leads-viewmode-segmented dente-segmented-bar h-8 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] p-0.5 inline-flex items-center gap-0.5 shrink-0"
						role="tablist"
						aria-label="Выбор отображения этапов воронки"
					>
						<button
							type="button"
							role="tab"
							aria-selected={viewMode === "funnel"}
							className={`leads-viewmode-segmented-btn dente-segmented-item h-[26px] px-2.5 rounded-md text-xs font-medium transition-all ${viewMode === "funnel" ? "is-active active bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
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
							className={`leads-viewmode-segmented-btn dente-segmented-item h-[26px] px-2.5 rounded-md text-xs font-medium transition-all ${viewMode === "all" ? "is-active active bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
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
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-medium text-xs sm:text-sm shadow-xs px-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
						onClick={onNewLead}
						type="button"
						aria-label="Создать новое обращение"
					>
						<Plus size={14} /> Новый лид
					</button>
					<button
						className="secondary-button h-9 min-h-[36px] text-xs sm:text-sm font-medium px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
						onClick={onOpenAnalytics}
						type="button"
						aria-label="Открыть сквозную аналитику воронки"
					>
						<BarChart3 size={14} className="text-[var(--primary)]" /> Аналитика
					</button>
					<button
						className="secondary-button h-9 min-h-[36px] text-xs sm:text-sm font-medium px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
						onClick={onOpenLeakDetector}
						type="button"
						aria-label="Открыть детектор оттока пациентов (210 дней)"
					>
						<RotateCcw size={14} className="text-[var(--primary)]" /> Отток
					</button>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<div className="dente-search-wrap w-48 xl:w-56 h-9 min-h-[36px] rounded-xl">
						<Search
							size={14}
							className="dente-search-icon"
						/>
						<input
							type="text"
							placeholder="Имя или телефон..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="dente-search-input h-9 min-h-[36px] !pl-[38px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)]"
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
					<div className="relative inline-flex items-center shrink-0">
						<Filter
							size={13}
							className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ink-muted)]"
						/>
						<select
							value={sourceFilter}
							onChange={(e) => setSourceFilter(e.target.value)}
							className="h-9 min-h-[36px] min-w-[136px] text-xs sm:text-sm font-medium rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] pl-8 pr-3 outline-none cursor-pointer hover:border-[var(--line-strong,var(--line))] transition-colors"
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
		</div>
	);
};
