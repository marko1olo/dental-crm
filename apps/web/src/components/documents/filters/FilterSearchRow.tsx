import type React from "react";
import { Search, X } from "lucide-react";

export interface FilterSearchRowProps {
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly availableKinds: ReadonlyArray<{ readonly kind: string; readonly label: string }>;
	readonly kindFilter: string;
	readonly onKindFilterChange: (kind: string) => void;
	readonly hasActiveFilters: boolean;
	readonly onResetFilters: () => void;
	readonly filteredCount: number;
	readonly totalCount: number;
}

export function FilterSearchRow({
	searchQuery,
	onSearchChange,
	availableKinds,
	kindFilter,
	onKindFilterChange,
	hasActiveFilters,
	onResetFilters,
	filteredCount,
	totalCount,
}: FilterSearchRowProps): React.JSX.Element {
	const safeQuery = searchQuery ?? "";

	return (
		<div className="document-search-row">
			<div className="document-search-input-wrapper dente-search-wrap">
				<Search size={15} className="document-search-icon dente-search-icon" aria-hidden="true" />
				<input
					type="text"
					className="document-search-input dente-search-input"
					style={{ paddingLeft: "38px" }}
					placeholder="Быстрый поиск (ФИО, № карты, врач, статус ЭЦП, чек, ИНН)..."
					value={safeQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					aria-label="Поиск по документам"
				/>
				{safeQuery.length > 0 && (
					<button
						type="button"
						className="document-search-clear-btn dente-search-clear"
						onClick={() => onSearchChange("")}
						aria-label="Очистить поисковый запрос"
					>
						<X size={14} aria-hidden="true" />
					</button>
				)}
			</div>

			{availableKinds.length > 0 && (
				<select
					value={kindFilter}
					onChange={(e) => onKindFilterChange(e.target.value)}
					className="document-registry-kind-select"
					aria-label="Фильтр по виду документа"
				>
					<option value="all">Все виды документов</option>
					{availableKinds.map((k) => (
						<option key={k.kind} value={k.kind}>
							{k.label}
						</option>
					))}
				</select>
			)}

			{hasActiveFilters && (
				<button
					type="button"
					className="secondary-button button-sm document-reset-filters-btn"
					onClick={onResetFilters}
				>
					Сбросить фильтры
				</button>
			)}

			<div className="document-results-count" role="status" aria-live="polite">
				Найдено: <strong>{filteredCount}</strong> из {totalCount}
			</div>
		</div>
	);
}
