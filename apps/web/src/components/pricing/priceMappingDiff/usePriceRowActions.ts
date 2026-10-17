import { useState } from 'react';
import type { ExistingCatalogReference, IngestedMappingItem } from './itemTypes';

export function usePriceRowActions(
	items: readonly IngestedMappingItem[],
	existingCatalog: readonly ExistingCatalogReference[],
	onItemsChange?: ((items: readonly IngestedMappingItem[]) => void) | undefined,
) {
	const [activeLinkRowId, setActiveLinkRowId] = useState<string | null>(null);
	const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

	const handleToggleApproveRow = (rowId: string) => {
		if (!onItemsChange) return;
		const updated = items.map((it) =>
			it.id === rowId ? { ...it, isApproved: !it.isApproved } : it,
		);
		onItemsChange(updated);
	};

	const handleSetCreateNew = (rowId: string) => {
		if (!onItemsChange) return;
		const updated = items.map((it) =>
			it.id === rowId
				? {
						...it,
						suggestedAction: 'create_new' as const,
						matchedExistingServiceId: null,
						isApproved: true,
				  }
				: it,
		);
		onItemsChange(updated);
		setActiveLinkRowId(null);
	};

	const handleSetLinkExisting = (
		rowId: string,
		targetServiceId: string,
		catalog: readonly ExistingCatalogReference[] = existingCatalog,
	) => {
		if (!onItemsChange) return;
		const targetService = catalog.find((s) => s.id === targetServiceId);
		const updated = items.map((it) =>
			it.id === rowId
				? {
						...it,
						suggestedAction: 'link_existing' as const,
						matchedExistingServiceId: targetServiceId,
						matchedExistingTitle: targetService?.title ?? it.matchedExistingTitle,
						matchedExistingPriceRub:
							targetService?.basePriceRub ?? it.matchedExistingPriceRub,
						isApproved: true,
				  }
				: it,
		);
		onItemsChange(updated);
		setActiveLinkRowId(null);
	};

	return {
		activeLinkRowId,
		setActiveLinkRowId,
		hoveredRowId,
		setHoveredRowId,
		handleToggleApproveRow,
		handleSetCreateNew,
		handleSetLinkExisting,
	};
}
