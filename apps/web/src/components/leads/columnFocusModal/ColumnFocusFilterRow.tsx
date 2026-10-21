/**
 * DENTE Dental CRM — Column Focus Filter & Search Row
 * Mandate 8b (<= 120 lines)
 */

import { Download, Search, X } from "lucide-react";
import React from "react";
import type { LeadSortOption } from "../leadsKanbanTypes";
import type { ColumnFocusFilterRowProps } from "./filterTypes";

export const ColumnFocusFilterRow: React.FC<ColumnFocusFilterRowProps> = ({
	searchQuery,
	onSearchQueryChange,
	urgencyFilter,
	onUrgencyFilterChange,
	metrics,
	sortOption,
	onSortOptionChange,
	onExportCsv,
}) => {
	return (
		<div className="expanded-focus-toolbar">
			<div className="dente-search-wrap expanded-focus-search-box min-w-[260px] max-w-[340px] flex-1">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					placeholder="Поиск по имени, телефону, жалобе..."
					value={searchQuery}
					onChange={(e) => onSearchQueryChange(e.target.value)}
					className="dente-search-input"
					aria-label="Поиск по имени, телефону или жалобе"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchQueryChange("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={12} />
					</button>
				)}
			</div>

			<div
				className="expanded-focus-urgency-tabs dente-segmented-bar"
				role="tablist"
			>
				<button
					type="button"
					className={`expanded-focus-tab dente-segmented-item ${urgencyFilter === "all" ? "is-active active" : ""}`}
					onClick={() => onUrgencyFilterChange("all")}
				>
					Все ({metrics.totalCount})
				</button>
				<button
					type="button"
					className={`expanded-focus-tab dente-segmented-item expanded-focus-tab--fresh ${urgencyFilter === "fresh" ? "is-active active" : ""}`}
					onClick={() => onUrgencyFilterChange("fresh")}
				>
					Свежие ({metrics.freshCount})
				</button>
				<button
					type="button"
					className={`expanded-focus-tab dente-segmented-item expanded-focus-tab--warning ${urgencyFilter === "warning" ? "is-active active" : ""}`}
					onClick={() => onUrgencyFilterChange("warning")}
				>
					Внимание ({metrics.warningCount})
				</button>
				{metrics.breachedCount > 0 && (
					<button
						type="button"
						className={`expanded-focus-tab dente-segmented-item expanded-focus-tab--breached ${urgencyFilter === "breached" ? "is-active active" : ""}`}
						onClick={() => onUrgencyFilterChange("breached")}
					>
						Просрочен SLA ({metrics.breachedCount})
					</button>
				)}
			</div>

			<div className="expanded-focus-sort-cluster">
				<span className="text-[11.5px] text-[var(--muted)] font-medium">
					Сортировка:
				</span>
				<select
					value={sortOption}
					onChange={(e) => onSortOptionChange(e.target.value as LeadSortOption)}
					className="expanded-focus-select"
				>
					<option value="sla_urgent">Срочные по SLA</option>
					<option value="created_desc">Сначала новые</option>
					<option value="created_asc">Сначала старые</option>
					<option value="revenue_desc">По выручке (макс)</option>
					<option value="name_asc">По имени (А-Я)</option>
				</select>
			</div>

			<button
				type="button"
				onClick={() => onExportCsv(false)}
				className="expanded-focus-csv-btn"
				title="Экспортировать обращения этапа в Excel CSV"
				data-testid="focus-csv-export-btn"
			>
				<Download size={13} />
				<span>CSV Экспорт</span>
			</button>
		</div>
	);
};
