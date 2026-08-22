import type React from "react";
import { Search, X, Filter, FileSignature, ShieldCheck } from "lucide-react";

export type DocumentStatusFilter = "all" | "draft" | "issued" | "voided";
export type DocumentEdsFilter = "all" | "signed_eds" | "signed_paper" | "unsigned";

export interface DocumentRegistryFilterBarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly statusFilter: DocumentStatusFilter;
	readonly onStatusFilterChange: (status: DocumentStatusFilter) => void;
	readonly edsFilter: DocumentEdsFilter;
	readonly onEdsFilterChange: (eds: DocumentEdsFilter) => void;
	readonly kindFilter: string;
	readonly onKindFilterChange: (kind: string) => void;
	readonly totalCount: number;
	readonly filteredCount: number;
	readonly onResetFilters: () => void;
	readonly availableKinds?: ReadonlyArray<{ readonly kind: string; readonly label: string }>;
}

export function DocumentRegistryFilterBar({
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	edsFilter,
	onEdsFilterChange,
	kindFilter,
	onKindFilterChange,
	totalCount,
	filteredCount,
	onResetFilters,
	availableKinds = [],
}: DocumentRegistryFilterBarProps): React.JSX.Element {
	const hasActiveFilters =
		searchQuery.trim().length > 0 ||
		statusFilter !== "all" ||
		edsFilter !== "all" ||
		kindFilter !== "all";

	return (
		<div
			className="document-registry-filter-bar"
			aria-label="Фильтры и поиск по реестру документов"
		>
			{/* SEARCH ROW */}
			<div className="document-search-row">
				<div className="document-search-input-wrapper">
					<Search size={16} className="document-search-icon" aria-hidden="true" />
					<input
						type="text"
						className="document-search-input"
						placeholder="Быстрый поиск (ФИО, № карты, врач, статус ЭЦП, чек, ИНН)..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						aria-label="Поиск по документам"
					/>
					{searchQuery.length > 0 && (
						<button
							type="button"
							className="document-search-clear-btn"
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
						className="text-button document-reset-filters-btn"
						onClick={onResetFilters}
					>
						Сбросить фильтры
					</button>
				)}

				<div className="document-results-count" role="status" aria-live="polite">
					Найдено: <strong>{filteredCount}</strong> из {totalCount}
				</div>
			</div>

			{/* STATUS AND SIGNATURE FILTER PILLS */}
			<div className="document-filters-row">
				<div className="document-filter-group" role="group" aria-label="Фильтр по статусу документа">
					<span className="document-filter-label">Статус:</span>
					<button
						type="button"
						className={`document-filter-chip ${statusFilter === "all" ? "active" : ""}`}
						onClick={() => onStatusFilterChange("all")}
					>
						Все
					</button>
					<button
						type="button"
						className={`document-filter-chip ${statusFilter === "issued" ? "active" : ""}`}
						onClick={() => onStatusFilterChange("issued")}
					>
						Выдано
					</button>
					<button
						type="button"
						className={`document-filter-chip ${statusFilter === "draft" ? "active" : ""}`}
						onClick={() => onStatusFilterChange("draft")}
					>
						Черновики
					</button>
					<button
						type="button"
						className={`document-filter-chip ${statusFilter === "voided" ? "active" : ""}`}
						onClick={() => onStatusFilterChange("voided")}
					>
						Аннулировано
					</button>
				</div>

				<div className="document-filter-group" role="group" aria-label="Фильтр по статусу подписи">
					<span className="document-filter-label document-filter-label--eds">Подпись:</span>
					<button
						type="button"
						className={`document-filter-chip ${edsFilter === "all" ? "active" : ""}`}
						onClick={() => onEdsFilterChange("all")}
					>
						Любая
					</button>
					<button
						type="button"
						className={`document-filter-chip ${edsFilter === "signed_eds" ? "active" : ""}`}
						onClick={() => onEdsFilterChange("signed_eds")}
						title="Подписано квалифицированной электронной подписью (УКЭП / КриптоПро)"
					>
						ЭЦП / УКЭП
					</button>
					<button
						type="button"
						className={`document-filter-chip ${edsFilter === "signed_paper" ? "active" : ""}`}
						onClick={() => onEdsFilterChange("signed_paper")}
						title="Бумажная собственноручная подпись"
					>
						Бумага
					</button>
					<button
						type="button"
						className={`document-filter-chip ${edsFilter === "unsigned" ? "active" : ""}`}
						onClick={() => onEdsFilterChange("unsigned")}
						title="Без подтвержденной подписи"
					>
						Без подписи
					</button>
				</div>
			</div>
		</div>
	);
}
