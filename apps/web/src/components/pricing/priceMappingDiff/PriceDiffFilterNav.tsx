import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import type { PriceDiffStats, PriceMappingDiffFilterTab } from './itemTypes';

export interface PriceDiffFilterNavProps {
	readonly stats: PriceDiffStats;
	readonly filterTab: PriceMappingDiffFilterTab;
	readonly onFilterTabChange: (tab: PriceMappingDiffFilterTab) => void;
}

export const PriceDiffFilterNav: React.FC<PriceDiffFilterNavProps> = ({
	stats,
	filterTab,
	onFilterTabChange,
}) => {
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
					className={`pricelist-diff-filter-btn ${filterTab === 'all' ? 'active' : ''}`}
					onClick={() => onFilterTabChange('all')}
				>
					{`Все (${stats.total})`}
				</button>
				<button
					type="button"
					className={`pricelist-diff-filter-btn ${filterTab === 'new' ? 'active' : ''}`}
					onClick={() => onFilterTabChange('new')}
				>
					{`Новые (${stats.newCount})`}
				</button>
				<button
					type="button"
					className={`pricelist-diff-filter-btn ${filterTab === 'update' ? 'active' : ''}`}
					onClick={() => onFilterTabChange('update')}
				>
					{`Обновление (${stats.updateCount})`}
				</button>
				{stats.attentionCount > 0 && (
					<button
						type="button"
						className={`pricelist-diff-filter-btn ${filterTab === 'attention' ? 'active' : ''}`}
						onClick={() => onFilterTabChange('attention')}
					>
						{`Проверить (${stats.attentionCount})`}
					</button>
				)}
			</nav>
		</div>
	);
};
