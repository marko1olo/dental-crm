import { Search, Trash2, X, Zap } from "lucide-react";
import React from "react";

export interface WarehouseManagerToolbarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly categoryFilter: string;
	readonly onCategoryChange: (cat: string) => void;
	readonly onApplyPreset: (id: string) => void;
	readonly onClearAll: () => void;
	readonly writeoffCount: number;
}

export const WarehouseManagerToolbar: React.FC<WarehouseManagerToolbarProps> = ({
	searchQuery,
	onSearchChange,
	categoryFilter,
	onCategoryChange,
	onApplyPreset,
	onClearAll,
	writeoffCount,
}) => {
	return (
		<div className="min-h-[36px] h-auto py-1 px-5 bg-[var(--paper,#ffffff)] border-b border-[var(--border,#e2e8f0)] flex flex-wrap items-center gap-2 text-xs shrink-0">
			<div className="dente-search-wrap relative flex-1 min-w-[180px] max-w-xs">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					className="dente-search-input"
					placeholder="Поиск по названию или SKU..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					data-testid="warehouse-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						className="dente-search-clear"
						onClick={() => onSearchChange("")}
						aria-label="Очистить поиск"
					>
						<X size={12} />
					</button>
				)}
			</div>

			<select
				className="h-8 min-h-[32px] px-2.5 text-xs rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
				value={categoryFilter}
				onChange={(e) => onCategoryChange(e.target.value)}
				aria-label="Фильтр по категориям"
			>
				<option value="all">Все категории</option>
				<option value="Анестезия">Анестезия</option>
				<option value="СИЗ">СИЗ</option>
				<option value="Терапия">Терапия</option>
				<option value="Стерилизация">Стерилизация</option>
				<option value="Гигиена">Гигиена</option>
			</select>

			<div className="h-4 w-px bg-[var(--border,#cbd5e1)] mx-1" />

			<div className="dente-filter-chips flex items-center gap-1.5 flex-wrap">
				<span className="text-[var(--muted,#64748b)] font-semibold flex items-center gap-1 shrink-0 text-xs">
					<Zap size={13} className="text-amber-500" />
					Пресеты:
				</span>

				<button
					type="button"
					className="dente-filter-chip text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
					onClick={() => onApplyPreset("anesthesia-17")}
					data-testid="preset-anesthesia-btn"
					title="10 карпул Артикаина 1.7 мл + 10 карпульных игл 30G"
				>
					Стандартная анестезия 1.7 мл
				</button>

				<button
					type="button"
					className="dente-filter-chip text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
					onClick={() => onApplyPreset("filling-standard")}
					data-testid="preset-filling-btn"
					title="СИЗ + Крафт + Композит + Адгезив + Микробраши"
				>
					Пломбирование зуба
				</button>

				<button
					type="button"
					className="dente-filter-chip text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
					onClick={() => onApplyPreset("hygiene-prof")}
					data-testid="preset-hygiene-btn"
					title="Air-Flow + Паста + Щетки + Оптрагейт"
				>
					Профгигиена
				</button>
			</div>

			{writeoffCount > 0 && (
				<button
					type="button"
					className="h-8 min-h-[32px] px-2 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto flex items-center gap-1 shrink-0 cursor-pointer"
					onClick={onClearAll}
					title="Очистить выбранные"
				>
					<Trash2 size={13} />
					Очистить ({writeoffCount})
				</button>
			)}
		</div>
	);
};
