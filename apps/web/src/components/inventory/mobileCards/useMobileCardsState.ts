import { useCallback, useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../inventoryDataMappers.js";

export function useMobileCardsState(
	items: readonly InventoryItem[],
	onDeductItem?: ((item: InventoryItem, quantity: number, isOverdraft: boolean) => void) | undefined,
	onReceiveItem?: ((item: InventoryItem, quantity: number) => void) | undefined,
) {
	const [activeSheetItem, setActiveSheetItem] = useState<InventoryItem | null>(null);
	const [sheetQuantity, setSheetQuantity] = useState<number>(1);
	const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
	const [barcodeInputValue, setBarcodeInputValue] = useState<string>("");
	const [isScanInputOpen, setIsScanInputOpen] = useState<boolean>(false);
	const scanInputRef = useRef<HTMLInputElement>(null);

	const openSheet = useCallback((item: InventoryItem) => {
		setActiveSheetItem(item);
		setSheetQuantity(1);
		setIsScanInputOpen(false);
		setBarcodeInputValue("");
		setActiveMenuId(null);
	}, []);

	const closeSheet = useCallback(() => {
		setActiveSheetItem(null);
		setIsScanInputOpen(false);
		setBarcodeInputValue("");
	}, []);

	const handleStepQuantity = useCallback((delta: number) => {
		setSheetQuantity((prev) => Math.max(1, prev + delta));
	}, []);

	const handleExecuteDeductInSheet = useCallback(() => {
		if (!activeSheetItem) return;
		const stock = Number(activeSheetItem.stockQuantity ?? 0);
		const isOverdraft = stock <= 0;
		if (onDeductItem) {
			onDeductItem(activeSheetItem, sheetQuantity, isOverdraft);
		} else {
			showToast(
				isOverdraft
					? `Списано ${sheetQuantity} ед. «${activeSheetItem.name}» (расход сверх остатка / списание с дефицитом)`
					: `Списано ${sheetQuantity} ед. «${activeSheetItem.name}» по FEFO`,
				isOverdraft ? "info" : "success",
			);
		}
		closeSheet();
	}, [activeSheetItem, sheetQuantity, onDeductItem, closeSheet]);

	const handleExecuteReceiveInSheet = useCallback(() => {
		if (!activeSheetItem) return;
		if (onReceiveItem) {
			onReceiveItem(activeSheetItem, sheetQuantity);
		} else {
			showToast(`Оприходовано ${sheetQuantity} ед. «${activeSheetItem.name}» на склад`, "success");
		}
		closeSheet();
	}, [activeSheetItem, sheetQuantity, onReceiveItem, closeSheet]);

	const handleBarcodeInputKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				e.preventDefault();
				const raw = barcodeInputValue.trim();
				if (!raw) return;
				if (activeSheetItem) {
					if (
						activeSheetItem.barcode &&
						(activeSheetItem.barcode === raw || raw.includes(activeSheetItem.barcode))
					) {
						showToast(`Штрихкод ${raw} успешно подтверждён для «${activeSheetItem.name}»`, "success");
					} else {
						const found = items.find((it) => it.barcode === raw || it.sku === raw);
						if (found) {
							setActiveSheetItem(found);
							showToast(`Найден материал «${found.name}» по штрихкоду ${raw}`, "info");
						} else {
							showToast(`Штрихкод ${raw} сопоставлен с «${activeSheetItem.name}»`, "info");
						}
					}
				}
				setBarcodeInputValue("");
				setIsScanInputOpen(false);
			}
		},
		[activeSheetItem, barcodeInputValue, items],
	);

	const handleOpenScanInput = useCallback(() => {
		setIsScanInputOpen(true);
		setTimeout(() => {
			scanInputRef.current?.focus();
		}, 50);
	}, []);

	return {
		activeSheetItem,
		sheetQuantity,
		setSheetQuantity,
		activeMenuId,
		setActiveMenuId,
		barcodeInputValue,
		setBarcodeInputValue,
		isScanInputOpen,
		setIsScanInputOpen,
		scanInputRef,
		openSheet,
		closeSheet,
		handleStepQuantity,
		handleExecuteDeductInSheet,
		handleExecuteReceiveInSheet,
		handleBarcodeInputKeyDown,
		handleOpenScanInput,
	};
}
