import React, { useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	cleanScannerBarcodeString,
	createCarpuleQueueItem,
	isGs1DataMatrixCandidate,
	parseGs1DataMatrixWithPku,
	processScannerInput,
	type Gs1DataMatrixParseResult,
	type MdlpCarpuleQueueItem,
} from "@dental/shared";

export function useMdlpScannerHandlers({
	patientId,
	patientName,
	visitId,
	doctorId,
	doctorName,
	cabinetId,
	scannerAutoMode,
	barcodeInput,
	setBarcodeInput,
	setLastScanned,
	setItems,
	scannerInputRef,
}: {
	patientId?: string | undefined;
	patientName: string;
	visitId?: string | undefined;
	doctorId?: string | undefined;
	doctorName: string;
	cabinetId: string;
	scannerAutoMode: boolean;
	barcodeInput: string;
	setBarcodeInput: (v: string) => void;
	setLastScanned: (res: Gs1DataMatrixParseResult) => void;
	setItems: React.Dispatch<React.SetStateAction<MdlpCarpuleQueueItem[]>>;
	scannerInputRef: React.RefObject<HTMLInputElement | null>;
}) {
	const handleAddBarcode = useCallback((rawCode: string) => {
		if (!rawCode || rawCode.trim().length === 0) {
			showToast("Введите или отсканируйте 2D DataMatrix код карпулы анестетика", "warning");
			return;
		}
		const cleaned = cleanScannerBarcodeString(rawCode);
		const parsed = parseGs1DataMatrixWithPku(cleaned);
		setLastScanned(parsed);
		if (!parsed.isValid) {
			showToast(parsed.errors[0] || "Некорректный формат кода маркировки DataMatrix Честный ЗНАК", "warning");
			return;
		}
		const defaultCost = parsed.recognizedDrug
			? parsed.recognizedDrug.vasoconstrictor === "1:100000" ? 450 : 420
			: parsed.pkuInfo?.standardPriceRub ?? 380;
		const newItem = createCarpuleQueueItem(cleaned, {
			costRub: defaultCost, patientId, patientName, visitId, doctorId, doctorName, cabinetId,
		});
		setItems((prev) => {
			if (newItem.sgtin && prev.some((p) => p.sgtin === newItem.sgtin)) {
				showToast(`Препарат с SGTIN ${newItem.sgtin} уже есть в очереди списания`, "info");
				return prev;
			}
			return [newItem, ...prev];
		});
		setBarcodeInput("");
		scannerInputRef.current?.focus();
	}, [patientId, patientName, visitId, doctorId, doctorName, cabinetId, setItems, setBarcodeInput, setLastScanned, scannerInputRef]);

	const handleScannerInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setBarcodeInput(value);
		if (scannerAutoMode && isGs1DataMatrixCandidate(value)) {
			const scannerRes = processScannerInput(value);
			if (scannerRes.isCompleteBarcode && scannerRes.parsed.isValid) {
				handleAddBarcode(scannerRes.cleanedInput);
				showToast(`2D-сканер: ${scannerRes.parsed.recognizedDrug?.tradeName ?? scannerRes.parsed.gtin} добавлен в очередь`, "info");
			}
		}
	}, [scannerAutoMode, handleAddBarcode, setBarcodeInput]);

	const handleScannerPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
		const pasted = e.clipboardData.getData("text");
		if (isGs1DataMatrixCandidate(pasted)) {
			e.preventDefault();
			const scannerRes = processScannerInput(pasted);
			if (scannerRes.parsed.isValid) {
				handleAddBarcode(scannerRes.cleanedInput);
				showToast(`Штрихкод из буфера: ${scannerRes.parsed.recognizedDrug?.tradeName ?? scannerRes.parsed.gtin} добавлен`, "info");
			} else {
				setBarcodeInput(pasted);
			}
		}
	}, [handleAddBarcode, setBarcodeInput]);

	const handleBarcodeInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			handleAddBarcode(barcodeInput);
		}
	}, [barcodeInput, handleAddBarcode]);

	return {
		handleAddBarcode,
		handleScannerInputChange,
		handleScannerPaste,
		handleBarcodeInputKeyDown,
	};
}
