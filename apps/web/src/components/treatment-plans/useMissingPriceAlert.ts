import { useState, useRef, useEffect } from "react";
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

	const handleSetWarrantyZeroPrice = () => {
		setError(null);
		setIsEditing(false);
		if (onUpdatePrice) onUpdatePrice(item.id, 0);
		if (onUpdateItem) onUpdateItem(createWarrantyPlanItem(item));
	};

	const handleKeepAgreedPrice = () => {
		setError(null);
		setIsEditing(false);
		if (onKeepAgreedPrice) onKeepAgreedPrice(item.id);
		if (onUpdateItem) onUpdateItem(createAgreedPricePlanItem(item));
	};

	const handleSavePrice = () => {
		const cleanVal = inputPrice.trim().replace(/\s+/g, "").replace(",", ".");
		const parsedNum = Number(cleanVal);

		if (cleanVal === "" || Number.isNaN(parsedNum) || parsedNum < 0) {
			setError("Введите корректную сумму в рублях (или 0 для гарантии)");
			return;
		}

		setError(null);
		setIsEditing(false);

		const updatedPrice = Math.round(parsedNum * 100) / 100;
		if (onUpdatePrice) onUpdatePrice(item.id, updatedPrice);
		if (onUpdateItem) onUpdateItem(createPriceUpdatedPlanItem(item, updatedPrice));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSavePrice();
		} else if (e.key === "Escape") {
			e.preventDefault();
			setInputPrice(item.priceRub > 0 ? String(item.priceRub) : "");
			setError(null);
			setIsEditing(false);
		}
	};

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
