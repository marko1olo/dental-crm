/**
 * DENTE Dental CRM — State & Coordinator Hook for Price List Mapping Diff
 * Layer 3: Reactive State, Proportional Scroll Synchronization & Business Logic
 */

import { useId, useState } from 'react';
import type {
	PriceListMappingDiffViewProps,
	PriceMappingDiffFilterTab,
} from './types';
import { useSynchronizedScroll } from './useSynchronizedScroll';
import { usePriceDiffStats } from './usePriceDiffStats';
import { usePriceBatchModifiers } from './usePriceBatchModifiers';
import { usePriceRowActions } from './usePriceRowActions';

export function usePriceMappingDiff({
	items,
	onItemsChange,
	onAcceptAll,
	onApply,
	existingCatalog = [],
}: PriceListMappingDiffViewProps) {
	const [filterTab, setFilterTab] = useState<PriceMappingDiffFilterTab>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const searchInputId = useId();

	const scrollState = useSynchronizedScroll();
	const statsState = usePriceDiffStats(items, filterTab, searchTerm);
	const modifiersState = usePriceBatchModifiers(items, onItemsChange);
	const rowActionsState = usePriceRowActions(items, existingCatalog, onItemsChange);

	const handleAcceptAllClick = () => {
		if (onAcceptAll) {
			onAcceptAll();
		} else if (onItemsChange) {
			const updated = items.map((it) => ({ ...it, isApproved: true }));
			onItemsChange(updated);
		}
	};

	const handleDeselectAll = () => {
		if (onItemsChange) {
			const updated = items.map((it) => ({ ...it, isApproved: false }));
			onItemsChange(updated);
		}
	};

	const handleApply = () => {
		const approved = items.filter((i) => i.isApproved);
		if (approved.length === 0) {
			if (items.length > 0) {
				const allApproved = items.map((it) => ({ ...it, isApproved: true }));
				if (onItemsChange) onItemsChange(allApproved);
				if (onApply) onApply(allApproved);
			}
			return;
		}
		if (onApply) onApply(approved);
	};

	return {
		filterTab,
		setFilterTab,
		searchTerm,
		setSearchTerm,
		searchInputId,
		...scrollState,
		...modifiersState,
		...statsState,
		...rowActionsState,
		handleAcceptAllClick,
		handleDeselectAll,
		handleApply,
	};
}
