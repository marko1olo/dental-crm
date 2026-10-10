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
			<div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white border-b border-emerald-500/30 shrink-0">
				<div className="flex items-center gap-2.5">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 text-white border border-white/20">
						<CalendarDays className="w-4 h-4" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 id="tactile-search-title" className="text-sm font-bold tracking-wide">
								СНИМКИ ВИЗИОГРАФА ПО ДАТАМ И ВИЗИТАМ
							</h2>
							<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
								Визиограф RVG
							</span>
						</div>
						<p className="text-[11px] text-emerald-100/90 leading-tight">
							Быстрый выбор прицельных снимков по дате приёма, зубу и врачу
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="flex items-center justify-center w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-black/20 transition-colors cursor-pointer"
					aria-label="Закрыть модальное окно фильтра"
					data-testid="btn-close-tactile-search"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* 2. Быстрый поиск (Зуб, Врач, Заметка) */}
			<div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-[#090f1d] border-b border-slate-200 dark:border-slate-800 shrink-0">
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
					className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
					data-testid="btn-search-trigger"
				>
					<Search className="w-3.5 h-3.5" />
					<span>Найти</span>
				</button>
			</div>
		</>
	);
};
