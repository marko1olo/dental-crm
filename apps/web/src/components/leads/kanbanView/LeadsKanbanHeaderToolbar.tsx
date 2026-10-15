/**
 * DENTE Dental CRM — Leads Kanban Header Toolbar
 *
 * Mandate 8s (Modular Architecture & Anti-Bloat):
 * Strict 1-row (32–36px) toolbar:
 * Left Island: Title "Воронка обращений" + leads counter badge + Funnel/All segmented bar.
 * Right Island: Search input (32px), Channel select (32px), Primary CTA "+ Новое обращение" (32px),
 * and Secondary dropdown menu button "..." containing Funnel Analytics and CRM Leak Detector.
 */

import React, { useEffect, useRef, useState } from "react";
import { BarChart3, Filter, MoreHorizontal, Plus, RotateCcw, Search, X } from "lucide-react";
import type { LeadsKanbanHeaderToolbarProps } from "./types";

export const LeadsKanbanHeaderToolbar: React.FC<
	LeadsKanbanHeaderToolbarProps
> = ({
	searchQuery,
	setSearchQuery,
	sourceFilter,
	setSourceFilter,
	uniqueSources,
	viewMode,
	setViewMode,
	secondaryLeadsCount = 0,
	totalLeadsCount,
	onNewLead,
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsMenuOpen(false);
			}
		};
		if (isMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMenuOpen]);

	return (
		<div className="leads-desktop-toolbar mb-4">
			{/* Left Island: Title + Counter + Segmented Toggle */}
			<div className="leads-toolbar-left flex items-center gap-2.5">
				<h2 className="m-0 text-base font-bold text-[var(--ink)] flex items-center gap-2 whitespace-nowrap">
					<span>Воронка обращений</span>
					{totalLeadsCount !== undefined && (
						<span className="leads-header-count-badge" title="Всего обращений в базе">
							{totalLeadsCount}
						</span>
					)}
				</h2>

				{/* Segmented Funnel (4) / All stages (6) selector */}
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
			</div>

			{/* Right Island: Search + Source filter + Primary CTA + Secondary menu */}
			<div className="leads-toolbar-right flex items-center gap-2">
				{/* Search input */}
				<div className="dente-search-wrap w-64 h-9 min-h-[36px] rounded-xl">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Имя или телефон..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dente-search-input h-9 min-h-[36px] !pl-[38px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)]"
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

				{/* Marketing Source Filter */}
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

				{/* Primary CTA: Новое обращение */}
				<button
					className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-medium text-xs sm:text-sm shadow-xs px-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
					onClick={onNewLead}
					type="button"
					data-testid="btn-new-lead"
					aria-label="Создать новое обращение"
				>
					<Plus size={14} />
					<span>Новое обращение</span>
				</button>

				{/* Secondary Actions: More menu (...) */}
				<div className="leads-more-menu-container relative inline-flex" ref={menuRef}>
					<button
						className="leads-more-menu-btn h-9 w-9 min-h-[36px] min-w-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center cursor-pointer"
						onClick={() => setIsMenuOpen((prev) => !prev)}
						type="button"
						aria-label="Дополнительные функции воронки"
						data-testid="btn-leads-more-menu"
						title="Дополнительные функции воронки"
					>
						<MoreHorizontal size={16} />
					</button>

					{isMenuOpen && (
						<div
							className="leads-more-menu-dropdown absolute right-0 top-[calc(100%+4px)] z-50 min-w-[210px] bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl shadow-lg p-1.5 flex flex-col gap-1"
							role="menu"
						>
							<button
								className="leads-more-menu-item flex items-center gap-2.5 w-full h-8 px-2.5 rounded-lg border-none bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium text-left cursor-pointer transition-colors"
								onClick={() => {
									setIsMenuOpen(false);
									onOpenAnalytics();
								}}
								type="button"
								role="menuitem"
								data-testid="btn-open-analytics"
							>
								<BarChart3 size={15} className="text-[var(--primary)] shrink-0" />
								<span>Аналитика воронки</span>
							</button>

							<button
								className="leads-more-menu-item flex items-center gap-2.5 w-full h-8 px-2.5 rounded-lg border-none bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium text-left cursor-pointer transition-colors"
								onClick={() => {
									setIsMenuOpen(false);
									onOpenLeakDetector();
								}}
								type="button"
								role="menuitem"
								data-testid="btn-open-leak-detector"
							>
								<RotateCcw size={15} className="text-[var(--primary)] shrink-0" />
								<span>Детектор оттока (&gt;210 дней)</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
