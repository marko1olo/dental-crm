/**
 * DENTE Dental CRM — Controls, Toolbar & Summary Bar for Price Diff View
 * Unified SSOT Presentation Module (Mandates 8b, 8zi)
 */

import { AlertTriangle, Check, CheckCheck, Percent, RotateCcw, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import React from "react";
import type {
	PriceDiffStats,
	PriceDiffSummaryBarProps,
	PriceDiffToolbarProps,
	PriceMappingDiffFilterTab,
} from "./types";

export const PriceDiffFilterNav: React.FC<{
	readonly stats: PriceDiffStats;
	readonly filterTab: PriceMappingDiffFilterTab;
	readonly onFilterTabChange: (tab: PriceMappingDiffFilterTab) => void;
}> = ({ stats, filterTab, onFilterTabChange }) => {
	return (
		<div className="pricelist-diff-toolbar-left">
			<div
				className="pricelist-diff-stat-chip accent"
				title="Всего распознано / С кодами услуг / Средняя уверенность"
			>
				<Sparkles size={12} />
				<span>{`Всего: ${stats.total} | Коды: ${stats.exactCount} | ${stats.avgConfidence}%`}</span>
			</div>

			{stats.attentionCount > 0 && (
				<div
					className="pricelist-diff-stat-chip warning"
					title="Позиции с низкой уверенностью: требуют ручного выбора"
				>
					<AlertTriangle size={12} />
					<span>{`Внимание: ${stats.attentionCount}`}</span>
				</div>
			)}

			<nav
				className="pricelist-diff-filters"
				role="tablist"
				aria-label="Фильтры сопоставления"
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
					className={`pricelist-diff-filter-btn ${filterTab === "update" ? "active" : ""}`}
					onClick={() => onFilterTabChange("update")}
				>
					{`Обновление (${stats.updateCount})`}
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
	);
};

export const PriceDiffBatchGroup: React.FC<{
	readonly onBatchMarkup: (percent: number) => void;
	readonly onBatchRounding: (roundTo?: number) => void;
	readonly onBatchSetZero: () => void;
}> = ({ onBatchMarkup, onBatchRounding, onBatchSetZero }) => {
	return (
		<div className="pricelist-diff-toolbar-middle">
			<div className="pricelist-diff-batch-group">
				<span
					className="pricelist-diff-batch-label"
					title="Пакетные операции с ценами выбранных позиций"
				>
					Пакетное изменение цен:
				</span>
				<button
					type="button"
					className="pricelist-diff-batch-btn"
					onClick={() => onBatchMarkup(5)}
					title="Прибавить 5% к ценам"
					data-testid="batch-markup-5"
				>
					+5%
				</button>
				<button
					type="button"
					className="pricelist-diff-batch-btn"
					onClick={() => onBatchMarkup(10)}
					title="Прибавить 10% к ценам"
					data-testid="batch-markup-10"
				>
					+10%
				</button>
				<button
					type="button"
					className="pricelist-diff-batch-btn warranty"
					onClick={onBatchSetZero}
					title="Установить 0 ₽ (Гарантия) для выбранных услуг"
					data-testid="batch-set-zero"
				>
					0 ₽ (Гарантия)
				</button>
				<button
					type="button"
					className="pricelist-diff-batch-btn"
					onClick={() => onBatchRounding(100)}
					title="Округлить цены до 100 ₽"
					data-testid="batch-round-100"
				>
					До 100 ₽
				</button>
				<button
					type="button"
					className="pricelist-diff-batch-btn"
					onClick={() => onBatchRounding(500)}
					title="Округлить цены до 500 ₽"
					data-testid="batch-round-500"
				>
					До 500 ₽
				</button>
			</div>
		</div>
	);
};

export const PriceDiffSearchActions: React.FC<{
	readonly searchTerm: string;
	readonly onSearchTermChange: (term: string) => void;
	readonly searchInputId: string;
	readonly stats: PriceDiffStats;
	readonly onAcceptAll: () => void;
	readonly onDeselectAll: () => void;
}> = ({
	searchTerm,
	onSearchTermChange,
	searchInputId,
	stats,
	onAcceptAll,
	onDeselectAll,
}) => {
	return (
		<div className="pricelist-diff-toolbar-right">
			<div className="dente-search-wrap pricelist-diff-search-box">
				<Search
					size={14}
					className="dente-search-icon pricelist-diff-search-icon"
				/>
				<input
					id={searchInputId}
					type="text"
					className="dente-search-input pricelist-diff-search-input"
					placeholder="Поиск..."
					value={searchTerm}
					onChange={(e) => onSearchTermChange(e.target.value)}
					data-testid="pricelist-diff-search"
				/>
				{searchTerm && (
					<button
						type="button"
						className="dente-search-clear pricelist-diff-search-clear"
						onClick={() => onSearchTermChange("")}
						aria-label="Очистить поиск"
					>
						<X size={12} />
					</button>
				)}
			</div>

			<button
				type="button"
				className="pricelist-diff-btn pricelist-diff-btn-success"
				onClick={onAcceptAll}
				title="Принять все сопоставления в один клик"
				data-testid="btn-select-all"
			>
				<CheckCheck size={13} />
				<span>{`Принять всё (${stats.total})`}</span>
			</button>

			{stats.approvedCount > 0 && stats.approvedCount < stats.total && (
				<button
					type="button"
					className="pricelist-diff-btn"
					onClick={onDeselectAll}
					title="Снять отметки выбора"
					data-testid="btn-deselect-all"
				>
					<span>Снять выбор</span>
				</button>
			)}
		</div>
	);
};

export const PriceDiffToolbar: React.FC<PriceDiffToolbarProps> = ({
	stats,
	filterTab,
	onFilterTabChange,
	searchTerm,
	onSearchTermChange,
	searchInputId,
	onBatchMarkup,
	onBatchRounding,
	onBatchSetZero,
	onAcceptAll,
	onDeselectAll,
}) => {
	return (
		<header
			className="pricelist-diff-toolbar"
			data-testid="pricelist-diff-toolbar"
		>
			<PriceDiffFilterNav
				stats={stats}
				filterTab={filterTab}
				onFilterTabChange={onFilterTabChange}
			/>

			<PriceDiffBatchGroup
				onBatchMarkup={onBatchMarkup}
				onBatchRounding={onBatchRounding}
				onBatchSetZero={onBatchSetZero}
			/>

			<PriceDiffSearchActions
				searchTerm={searchTerm}
				onSearchTermChange={onSearchTermChange}
				searchInputId={searchInputId}
				stats={stats}
				onAcceptAll={onAcceptAll}
				onDeselectAll={onDeselectAll}
			/>
		</header>
	);
};

export const PriceDiffSummaryBar: React.FC<PriceDiffSummaryBarProps> = ({
	approvedCount,
	totalCount,
	isLoading = false,
	onApply,
	onCancel,
}) => {
	const countToLoad = approvedCount || totalCount;

	return (
		<footer className="pricelist-diff-footer">
			<div className="pricelist-diff-footer-summary">
				{`Будет добавлено / обновлено ${approvedCount} услуг в каталог клиники`}
			</div>

			<div className="pricelist-diff-footer-actions">
				{onCancel && (
					<button
						type="button"
						className="pricelist-diff-btn shrink-0 min-w-fit px-3 text-xs sm:text-sm"
						onClick={onCancel}
					>
						Отмена
					</button>
				)}

				<button
					type="button"
					className="pricelist-diff-btn pricelist-diff-btn-primary shrink-0 min-w-fit px-3 text-xs sm:text-sm"
					onClick={onApply}
					title="Загрузить все утверждённые услуги в каталог клиники"
				>
					<Check size={13} className="shrink-0" />
					{isLoading ? (
						<span>Загрузка...</span>
					) : (
						<span>
							<span className="sm:hidden">{`Загрузить (${countToLoad})`}</span>
							<span className="hidden sm:inline">
								{`Загрузить в прейскурант (${countToLoad})`}
							</span>
						</span>
					)}
				</button>
			</div>
		</footer>
	);
};
