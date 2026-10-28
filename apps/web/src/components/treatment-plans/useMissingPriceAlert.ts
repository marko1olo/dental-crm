/**
 * useMissingPriceAlert.ts — Хук спокойного инлайн-редактирования цены процедуры этапа лечения.
 * Валидация строго в целочисленных копейках (amountKopecks) без float-ошибок (Мандат 8e).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { TreatmentPlanItem } from "./types";
import {
	createWarrantyPlanItem,
	createAgreedPricePlanItem,
	createPriceUpdatedPlanItem,
} from "./missingPriceItemUtils";

export interface UseMissingPriceAlertProps {
	readonly item: TreatmentPlanItem;
	readonly onUpdatePrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onKeepAgreedPrice?: ((itemId: string) => void) | undefined;
}

export function parseKopecksFromRubString(val: string): { kopecks: number; rub: number } | null {
	const clean = val.trim().replace(/\s+/g, "").replace(",", ".");
	if (clean === "") return null;
	const num = Number(clean);
	if (Number.isNaN(num) || num < 0 || !Number.isFinite(num)) return null;
	const kopecks = Math.round(num * 100);
	return { kopecks, rub: kopecks / 100 };
}

export function useMissingPriceAlert({
	item,
	onUpdatePrice,
	onUpdateItem,
	onKeepAgreedPrice,
}: UseMissingPriceAlertProps) {
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [inputPrice, setInputPrice] = useState<string>(
		item.priceRub > 0 ? String(item.priceRub) : "",
	);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const isMissingPrice = item.isWarranty
		? false
		: (item.requiresManualPricing ?? (item.priceRub === 0));

	const handleSetWarrantyZeroPrice = useCallback(() => {
		setError(null);
		setIsEditing(false);
		if (onUpdatePrice) onUpdatePrice(item.id, 0);
		if (onUpdateItem) onUpdateItem(createWarrantyPlanItem(item));
	}, [item, onUpdatePrice, onUpdateItem]);

	const handleKeepAgreedPrice = useCallback(() => {
		setError(null);
		setIsEditing(false);
		if (onKeepAgreedPrice) onKeepAgreedPrice(item.id);
		if (onUpdateItem) onUpdateItem(createAgreedPricePlanItem(item));
	}, [item, onKeepAgreedPrice, onUpdateItem]);

	const handleSavePrice = useCallback(() => {
		const parsed = parseKopecksFromRubString(inputPrice);
		if (!parsed) {
			setError("Укажите корректную сумму в рублях (или 0 ₽ для гарантии)");
			return;
		}

		setError(null);
		setIsEditing(false);

		const updatedPriceRub = parsed.rub;
		if (onUpdatePrice) onUpdatePrice(item.id, updatedPriceRub);
		if (onUpdateItem) {
			const updated = createPriceUpdatedPlanItem(item, updatedPriceRub);
			(updated as any).amountKopecks = parsed.kopecks;
			onUpdateItem(updated);
		}
	}, [inputPrice, item, onUpdatePrice, onUpdateItem]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleSavePrice();
			} else if (e.key === "Escape") {
				e.preventDefault();
				setInputPrice(item.priceRub > 0 ? String(item.priceRub) : "");
				setError(null);
				setIsEditing(false);
			}
		},
		[handleSavePrice, item.priceRub],
	);

	return {
		isEditing,
		setIsEditing,
		inputPrice,
		setInputPrice,
		error,
		setError,
		inputRef,
		isMissingPrice,
		handleSetWarrantyZeroPrice,
		handleKeepAgreedPrice,
		handleSavePrice,
		handleKeyDown,
	};
}
