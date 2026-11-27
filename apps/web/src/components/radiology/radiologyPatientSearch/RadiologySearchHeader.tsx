/**
 * RadiologySearchHeader.tsx — Layer 4: Шапка рентгенологического поиска и быстрый поисковый инпут
 * Соответствует Apple HIG и DENTE-эргономике (0 наездов иконки, чистый русский язык, 0 эмодзи).
 */

import React from "react";
import { CalendarDays, Search, X } from "lucide-react";

export interface RadiologySearchHeaderProps {
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly onSearchTrigger: () => void;
	readonly onClose: () => void;
}

export const RadiologySearchHeader: React.FC<RadiologySearchHeaderProps> = ({
	searchQuery,
	onSearchQueryChange,
	onSearchTrigger,
	onClose,
}) => {
	return (
		<>
			{/* 1. Лаконичный заголовок в стиле Apple HIG / DENTE */}
			<div className="flex items-center justify-between px-5 py-3.5 bg-[var(--paper)] text-[var(--ink)] border-b border-[var(--line)] shrink-0">
				<div className="flex items-center gap-2.5">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]">
						<CalendarDays className="w-4 h-4" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 id="tactile-search-title" className="text-sm font-semibold text-[var(--ink)]">
								Снимки визиографа по датам и визитам
							</h2>
							<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)]">
								Визиограф RVG
							</span>
						</div>
						<p className="text-xs text-[var(--ink-muted)] leading-tight">
							Быстрый выбор прицельных снимков по дате приёма, зубу и врачу
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					aria-label="Закрыть модальное окно фильтра"
					data-testid="btn-close-tactile-search"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* 2. Быстрый поиск (Зуб, Врач, Заметка) */}
			<div className="flex items-center gap-2 px-5 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
				<div className="dente-search-wrap flex-1">
					<Search className="dente-search-icon" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						placeholder="Поиск по зубу (например: 16, 26, 46), врачу или приёму..."
						className="dente-search-input"
						data-testid="tactile-search-query-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchQueryChange("")}
							className="dente-search-clear"
							title="Очистить строку поиска"
							aria-label="Очистить поиск"
						>
							✕
						</button>
					)}
				</div>
				<button
					type="button"
					onClick={onSearchTrigger}
					className="h-9 px-3.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
					data-testid="btn-search-trigger"
				>
					<Search className="w-4 h-4" />
					<span>Найти</span>
				</button>
			</div>
		</>
	);
};
