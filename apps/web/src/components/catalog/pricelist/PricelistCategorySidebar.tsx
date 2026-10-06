import React from 'react';
import {
	CATEGORY_LABELS,
	type Order804nCategory,
} from './servicePricelistPresets';

export interface PricelistCategorySidebarProps {
	readonly selectedCategory: Order804nCategory | 'all';
	readonly onSelectCategory: (category: Order804nCategory | 'all') => void;
	readonly categoryCounts: Record<string, number>;
}

export const PricelistCategorySidebar: React.FC<PricelistCategorySidebarProps> = ({
	selectedCategory,
	onSelectCategory,
	categoryCounts,
}) => {
	return (
		<nav className="pricelist-category-sidebar" aria-label="Разделы каталога услуг">
			<button
				type="button"
				className={`category-nav-btn ${selectedCategory === 'all' ? 'active' : ''}`}
				onClick={() => onSelectCategory('all')}
			>
				<span>Все разделы</span>
				<span className="category-nav-count">{categoryCounts.all || 0}</span>
			</button>

			{(Object.keys(CATEGORY_LABELS) as Order804nCategory[]).map((catKey) => {
				const count = categoryCounts[catKey] || 0;
				if (count === 0 && selectedCategory !== catKey) return null;
				return (
					<button
						key={catKey}
						type="button"
						className={`category-nav-btn ${selectedCategory === catKey ? 'active' : ''}`}
						onClick={() => onSelectCategory(catKey)}
					>
						<span>{CATEGORY_LABELS[catKey]}</span>
						<span className="category-nav-count">{count}</span>
					</button>
				);
			})}
		</nav>
	);
};
