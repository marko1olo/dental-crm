import { useState } from "react";
import { syncInlinePriceToBackend } from "./pricelistDbSync";
import {
	type BatchRepriceApiOptions,
	requestBatchRepriceApi,
} from "./serviceBatchRepriceApi";
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
	type DoctorSpecialty,
	type PriceTierKind,
	type ServiceCategory,
	type ServicePricelistItem,
} from "./servicePricelistPresets";

export function usePricelistPriceInteractions(
	items: readonly ServicePricelistItem[],
	activeTier: PriceTierKind,
	selectedItemIds: Set<string>,
	selectedCategory: ServiceCategory | "all",
	selectedSpecialty: DoctorSpecialty | "all",
	updateAndPersist: (next: readonly ServicePricelistItem[]) => void,
	setItems: (next: readonly ServicePricelistItem[]) => void,
	showToast: (msg: string) => void,
	adminSecret?: string,
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
			void syncInlinePriceToBackend(itemId, res.parsed, adminSecret);
		}
		setEditingPriceCellId(null);
	};

	const handleSetZeroWarrantyPrice = (itemId: string) => {
		updateAndPersist(setZeroWarrantyPrice(items, itemId));
		showToast("Установлена гарантийная цена (0 ₽)");
		void syncInlinePriceToBackend(itemId, 0, adminSecret);
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
		updateAndPersist(updated);
		showToast(
			`Применена наценка ${percent > 0 ? `+${percent}%` : `${percent}%`} (${PRICE_TIER_LABELS[activeTier]})`,
		);

		// Асинхронный SQL апдейт в PostgreSQL через Fastify API (Мандат 8n)
		const repricePayload: BatchRepriceApiOptions = {
			percentChange: percent,
			roundMode: rounding,
			...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
			...(selectedSpecialty !== "all" ? { specialty: selectedSpecialty } : {}),
			...(selectedItemIds.size > 0 ? { serviceIds: Array.from(selectedItemIds) } : {}),
		};
		void requestBatchRepriceApi(repricePayload, adminSecret);
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
