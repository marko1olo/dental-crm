import type React from "react";
import { pushDestructiveActionWithRollback } from "../../../services/undo/globalUndoRollbackStack.js";
import { showToast } from "../../GlobalToast.js";
import {
	convertGhostItemToImplant,
	estimatorDismissalKeys,
	type PlanItem,
	type PlanPriceCatalogItem,
} from "../treatmentEstimatorPricing";

export function useEstimatorActions(
	patientId: string,
	items: PlanItem[],
	setItems: React.Dispatch<React.SetStateAction<PlanItem[]>>,
	setDismissedSuggestions: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>,
	serviceCatalog: readonly unknown[] | undefined,
) {
	const handleReplaceWithImplant = (toothNumber: number) => {
		const catalog = (Array.isArray(serviceCatalog) ? serviceCatalog : []) as readonly PlanPriceCatalogItem[];
		setItems((prev) => prev.map((it) => (it.toothNumber === toothNumber ? convertGhostItemToImplant(it, catalog) : it)));
		showToast(`Позиция по зубу #${toothNumber} заменена на имплантацию`, "success", 3500);
	};

	const handleRestoreToothStatus = (toothNumber: number) => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-odontogram-update", { detail: { patientId, states: [{ toothNumber, state: "Caries" }] } }));
		}
		showToast(`Статус зуба #${toothNumber} восстановлен на формуле (врачебная автономия)`, "success", 3500);
	};

	const handleRemoveItemByTooth = (toothNumber: number) => {
		const removed = items.filter((it) => it.toothNumber === toothNumber);
		setItems((prev) => prev.filter((it) => it.toothNumber !== toothNumber));
		for (const r of removed) {
			const keys = estimatorDismissalKeys(r);
			if (keys.length > 0) setDismissedSuggestions((prev) => new Set([...prev, ...keys]));
		}
		showToast(`Услуги по зубу #${toothNumber} удалены из плана лечения`, "info", 3000);
	};

	const removeItem = (idx: number) => {
		const removed = items[idx];
		if (!removed) return;
		setItems((prev) => prev.filter((_, i) => i !== idx));
		const keys = estimatorDismissalKeys(removed);
		if (keys.length > 0) setDismissedSuggestions((prev) => new Set([...prev, ...keys]));

		const toothBadge = removed.toothNumber ? ` [зуб ${removed.toothNumber}]` : "";
		pushDestructiveActionWithRollback({
			entityType: "estimator_item",
			description: `Услуга «${removed.name}»${toothBadge} удалена из сметы`,
			item: removed,
			index: idx,
			onRollback: (item, index) => {
				setItems((prev) => {
					const next = [...prev];
					next.splice(index, 0, item as PlanItem);
					return next;
				});
				if (keys.length > 0) setDismissedSuggestions((prev) => new Set([...prev].filter((k) => !keys.includes(k))));
			},
		});
	};

	const setPhase = (idx: number, phase: number) => {
		setItems((prev) => {
			const next = [...prev];
			if (next[idx]) next[idx] = { ...next[idx], phase };
			return next;
		});
	};

	const handlePriceChange = (idx: number, newPrice: number | null) => {
		setItems((prev) => {
			const next = [...prev];
			const cur = next[idx];
			if (!cur) return prev;
			next[idx] = { ...cur, price: newPrice, issue: newPrice !== null ? null : (cur.issue ?? null) };
			return next;
		});
		if (newPrice === 0) showToast("Установлена гарантийная цена 0 ₽ (Мандат 8e)", "info", 2500);
		else if (newPrice !== null) showToast(`Установлена цена врача: ${newPrice} ₽`, "success", 2500);
	};

	return { handleReplaceWithImplant, handleRestoreToothStatus, handleRemoveItemByTooth, removeItem, setPhase, handlePriceChange };
}
