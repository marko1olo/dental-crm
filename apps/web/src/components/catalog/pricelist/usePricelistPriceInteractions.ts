import { useState } from "react";
import {
	batchPriceMarkup,
	commitInlinePrice,
	setZeroWarrantyPrice,
} from "./pricelistManagerPriceActions";
import {
	formatRubles,
	type PriceRoundingMode,
} from "./servicePricelistEngine";
import {
	PRICE_TIER_LABELS,
	type PriceTierKind,
	type ServiceCategory,
	type ServicePricelistItem,
} from "./servicePricelistPresets";

export function usePricelistPriceInteractions(
	items: readonly ServicePricelistItem[],
	activeTier: PriceTierKind,
	selectedItemIds: Set<string>,
	selectedCategory: ServiceCategory | "all",
	selectedSpecialty: string,
	updateAndPersist: (next: readonly ServicePricelistItem[]) => void,
	setItems: (next: readonly ServicePricelistItem[]) => void,
	showToast: (msg: string) => void,
) {
	const [editingPriceCellId, setEditingPriceCellId] = useState<string | null>(
		null,
	);
	const [editingPriceBuffer, setEditingPriceBuffer] = useState<string>("");

	const handleCommitInlinePrice = (itemId: string, raw: string) => {
		const res = commitInlinePrice(items, itemId, raw, activeTier);
		if (res) {
			updateAndPersist(res.updatedItems);
			showToast(`Цена обновлена: ${formatRubles(res.parsed)}`);
		}
		setEditingPriceCellId(null);
	};

	const handleSetZeroWarrantyPrice = (itemId: string) => {
		updateAndPersist(setZeroWarrantyPrice(items, itemId));
		showToast("Установлена гарантийная цена (0 ₽)");
	};

	const handleApplyBatchMarkup = (
		percent: number,
		rounding: PriceRoundingMode,
	) => {
		const updated = batchPriceMarkup(
			items,
			percent,
			rounding,
			selectedItemIds,
			selectedCategory,
			selectedSpecialty,
			activeTier,
		);
		setItems(updated);
		showToast(
			`Применена наценка ${percent > 0 ? `+${percent}%` : `${percent}%`} (${PRICE_TIER_LABELS[activeTier]})`,
		);
	};

	return {
		editingPriceCellId,
		setEditingPriceCellId,
		editingPriceBuffer,
		setEditingPriceBuffer,
		handleCommitInlinePrice,
		handleSetZeroWarrantyPrice,
		handleApplyBatchMarkup,
	};
}
