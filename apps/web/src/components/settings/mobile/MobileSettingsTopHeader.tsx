import React from "react";
import { Search, ShieldCheck, X } from "lucide-react";
import { SETTING_CATEGORIES } from "./mobileSettingsTypes";

interface MobileSettingsTopHeaderProps {
	presetLabel: string;
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	selectedCategory: string;
	setSelectedCategory: (val: string) => void;
}

export const MobileSettingsTopHeader: React.FC<MobileSettingsTopHeaderProps> = ({
	presetLabel,
	searchQuery,
	setSearchQuery,
	selectedCategory,
	setSelectedCategory,
}) => {
	return (
		<>
			<div className="px-4 pt-3 pb-1 flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)] m-0">
						Конфигурация клиники
					</p>
					<span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)] max-w-full">
						<ShieldCheck size={12} className="shrink-0" />
						<span className="truncate">{presetLabel}</span>
					</span>
				</div>
				<h1 className="text-[22px] font-extrabold text-[var(--ink)] tracking-tight leading-tight m-0">
					Настройки
				</h1>
			</div>

			<div className="px-4 py-1.5">
				<div className="dente-search-wrap">
					<Search size={14} className="dente-search-icon" aria-hidden="true" />
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по параметрам клиники..."
						className="dente-search-input"
						data-testid="input-mobile-settings-search"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			<div className="px-4 pb-2 overflow-x-auto">
				<div
					className="dente-filter-chips flex-nowrap"
					style={{ flexWrap: "nowrap", overflowX: "auto" }}
					role="group"
					aria-label="Категории настроек"
				>
					{SETTING_CATEGORIES.map((cat) => (
						<button
							key={cat.id}
							type="button"
							onClick={() => setSelectedCategory(cat.id)}
							className={`dente-filter-chip shrink-0 whitespace-nowrap ${selectedCategory === cat.id ? "active" : ""}`}
							data-active={selectedCategory === cat.id}
						>
							<span>{cat.label}</span>
						</button>
					))}
				</div>
			</div>
		</>
	);
};
