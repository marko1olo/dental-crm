/**
 * DENTE Dental CRM — Strict 1-Row Toolbar for Price List Mapping Diff
 * Layer 4: Presentation Subcomponent (Hick's Law 32-36px, Mandates 8d & 8p)
 */

import React from 'react';
import type { PriceDiffToolbarProps } from './types';
import { PriceDiffFilterNav } from './PriceDiffFilterNav';
import { PriceDiffBatchGroup } from './PriceDiffBatchGroup';
import { PriceDiffSearchActions } from './PriceDiffSearchActions';

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
		<header className="pricelist-diff-toolbar" data-testid="pricelist-diff-toolbar">
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
