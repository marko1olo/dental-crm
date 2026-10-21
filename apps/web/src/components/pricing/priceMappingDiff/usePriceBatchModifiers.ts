import { useState } from "react";
import {
	applyDeltaToItem,
	applyMarkupToItems,
	applyPriceToItem,
	applyRoundingToItems,
	applyZeroToItems,
} from "./batchPriceHelpers";
import type { IngestedMappingItem } from "./itemTypes";

export function usePriceBatchModifiers(
	items: readonly IngestedMappingItem[],
	onItemsChange?: ((items: readonly IngestedMappingItem[]) => void) | undefined,
) {
	const [editingRowPriceId, setEditingRowPriceId] = useState<string | null>(
		null,
	);
	const [editingRowPriceBuffer, setEditingRowPriceBuffer] =
		useState<string>("");

	const handleModifyRowDelta = (rowId: string, deltaRub: number) => {
		if (onItemsChange) {
			onItemsChange(applyDeltaToItem(items, rowId, deltaRub));
		}
	};

	const handleSetRowZeroPrice = (rowId: string) => {
		if (onItemsChange) {
			onItemsChange(applyPriceToItem(items, rowId, 0));
		}
	};

	const handleStartEditPrice = (id: string, initialVal: number) => {
		setEditingRowPriceId(id);
		setEditingRowPriceBuffer(String(initialVal));
	};

	const handleCancelEditPrice = () => {
		setEditingRowPriceId(null);
	};

	const handleCommitRowPrice = (rowId: string, rawVal: string) => {
		if (!onItemsChange) {
			setEditingRowPriceId(null);
			return;
		}
		const cleanDigits = rawVal.replace(/\s+/g, "").replace(/[^\d]/g, "");
		const parsed = parseInt(cleanDigits, 10);
		if (!Number.isNaN(parsed) && parsed >= 0) {
			onItemsChange(applyPriceToItem(items, rowId, parsed));
		}
		setEditingRowPriceId(null);
	};

	const handleBatchMarkup = (percent: number) => {
		if (onItemsChange) {
			onItemsChange(applyMarkupToItems(items, percent));
		}
	};

	const handleBatchRounding = (roundTo: number = 100) => {
		if (onItemsChange) {
			onItemsChange(applyRoundingToItems(items, roundTo));
		}
	};

	const handleBatchSetZero = () => {
		if (onItemsChange) {
			onItemsChange(applyZeroToItems(items));
		}
	};

	return {
		editingRowPriceId,
		editingRowPriceBuffer,
		setEditingRowPriceBuffer,
		handleModifyRowDelta,
		handleSetRowZeroPrice,
		handleStartEditPrice,
		handleCancelEditPrice,
		handleCommitRowPrice,
		handleBatchMarkup,
		handleBatchRounding,
		handleBatchSetZero,
	};
}
