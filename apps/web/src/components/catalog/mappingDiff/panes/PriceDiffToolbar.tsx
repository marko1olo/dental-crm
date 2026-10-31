/**
 * DENTE Dental CRM — Compact Toolbar & Filter Navigation for Price Diff
 * Unified SSOT Presentation Module (Mandates 8b, 8zi, 8am, 8e)
 */

import {
	AlertTriangle,
	CheckCheck,
	Filter,
	Search,
	Sparkles,
	TrendingDown,
	TrendingUp,
	X,
} from "lucide-react";
import React from "react";
import type { ExtendedDiffFilter } from "./usePriceDiffPanesState";

export interface PanesToolbarStats {
	readonly total: number;
	readonly approvedCount: number;
	readonly exactCount: number;
	readonly newCount: number;
	readonly updateCount: number;
	readonly attentionCount: number;
	readonly increasedCount: number;
	readonly decreasedCount: number;
	readonly unchangedCount: number;
	readonly avgConfidence: number;
	readonly totalDeltaRub: number;
}

export interface PriceDiffPanesToolbarProps {
	readonly stats: PanesToolbarStats;
	readonly filterTab: ExtendedDiffFilter;
	readonly onFilterTabChange: (tab: ExtendedDiffFilter) => void;
	readonly searchTerm: string;
	readonly onSearchTermChange: (term: string) => void;
	readonly searchInputId?: string | undefined;
	readonly onAcceptAll?: (() => void) | undefined;
	readonly onDeselectAll?: (() => void) | undefined;
}

export const PriceDiffToolbar: React.FC<PriceDiffPanesToolbarProps> = ({
	stats,
	filterTab,
	onFilterTabChange,
	searchTerm,
	onSearchTermChange,
	searchInputId = "panes-diff-search",
	onAcceptAll,
	onDeselectAll,
}) => {
	return (
		<header
			className="pricelist-diff-toolbar"
			data-testid="panes-diff-toolbar"
			role="toolbar"
			aria-label="Фильтры сопоставления прейскуранта"
		>
			<div className="pricelist-diff-toolbar-left">
				<div
					className="pricelist-diff-stat-chip accent"
					title="Распознано услуг / Точные коды / Средняя клиническая уверенность"
				>
					<Sparkles size={12} />
					<span>{`Всего: ${stats.total} | Коды: ${stats.exactCount} | ${stats.avgConfidence}%`}</span>
				</div>

				{stats.attentionCount > 0 && (
					<div
						className="pricelist-diff-stat-chip warning"
						title="Позиции с низкой уверенностью: требуют внимания врача или управляющего"
					>
						<AlertTriangle size={12} />
						<span>{`Внимание: ${stats.attentionCount}`}</span>
					</div>
				)}

				<nav
					className="pricelist-diff-filters"
					role="tablist"
					aria-label="Фильтры списка"
				>
					<button
						type="button"
						className={`pricelist-diff-filter-btn ${filterTab === "all" ? "active" : ""}`}
						onClick={() => onFilterTabChange("all")}
					>
						{`Все (${stats.total})`}
					</button>
					<button
						type="button"
						className={`pricelist-diff-filter-btn ${filterTab === "new" ? "active" : ""}`}
						onClick={() => onFilterTabChange("new")}
					>
						{`Новые (${stats.newCount})`}
					</button>
					<button
						type="button"
						className={`pricelist-diff-filter-btn ${filterTab === "changed" ? "active" : ""}`}
						onClick={() => onFilterTabChange("changed")}
						title={`Повышено: ${stats.increasedCount}, Снижено: ${stats.decreasedCount}`}
					>
						<TrendingUp size={11} style={{ display: "inline", marginRight: 3 }} />
						{`Изменены (${stats.increasedCount + stats.decreasedCount})`}
					</button>
					<button
						type="button"
						className={`pricelist-diff-filter-btn ${filterTab === "update" ? "active" : ""}`}
						onClick={() => onFilterTabChange("update")}
					>
						{`Обновления (${stats.updateCount})`}
					</button>
					{stats.attentionCount > 0 && (
						<button
							type="button"
							className={`pricelist-diff-filter-btn ${filterTab === "attention" ? "active" : ""}`}
							onClick={() => onFilterTabChange("attention")}
						>
							{`Проверить (${stats.attentionCount})`}
						</button>
					)}
				</nav>
			</div>

			<div className="pricelist-diff-toolbar-right">
				<div className="dente-search-wrap pricelist-diff-search-box">
					<Search size={14} className="dente-search-icon pricelist-diff-search-icon" />
					<input
						id={searchInputId}
						type="text"
						className="dente-search-input pricelist-diff-search-input"
						placeholder="Поиск по услугам..."
						value={searchTerm}
						onChange={(e) => onSearchTermChange(e.target.value)}
						data-testid="panes-diff-search-input"
					/>
					{searchTerm && (
						<button
							type="button"
							className="dente-search-clear pricelist-diff-search-clear"
							onClick={() => onSearchTermChange("")}
							aria-label="Очистить строку поиска"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{onAcceptAll && (
					<button
						type="button"
						className="pricelist-diff-btn pricelist-diff-btn-success"
						onClick={onAcceptAll}
						title="Принять все сопоставления прейскуранта в 1 клик"
						data-testid="panes-btn-accept-all"
					>
						<CheckCheck size={13} />
						<span>{`Принять всё (${stats.total})`}</span>
					</button>
				)}

				{onDeselectAll && stats.approvedCount > 0 && stats.approvedCount < stats.total && (
					<button
						type="button"
						className="pricelist-diff-btn"
						onClick={onDeselectAll}
						title="Снять выбор со всех позиций"
					>
						<span>Снять выбор</span>
					</button>
				)}
			</div>
		</header>
	);
};
