/**
 * useMdlpHidScanner — Аппаратный перехват 2D USB/HID сканера и буфера обмена (Ctrl+V).
 * Обеспечивает мгновенный приём DataMatrix кодов (0.1 сек) без потери фокуса.
 * Мандат 8b: <= 120 строк.
 */

import { useEffect, useRef } from "react";
import { createChestnyZnakScannedItem, type ChestnyZnakScannedItem } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { submitMdlpBarcodeScan } from "../mdlpScanningPresets.js";

export interface UseMdlpHidScannerProps {
	readonly isOpen: boolean;
	readonly inputRef: React.RefObject<HTMLInputElement | null>;
	readonly setBarcodeInput: React.Dispatch<React.SetStateAction<string>>;
	readonly setScannedItems: React.Dispatch<React.SetStateAction<readonly ChestnyZnakScannedItem[]>>;
	readonly resetXml: () => void;
	readonly playBeep: (success: boolean) => void;
}

export function useMdlpHidScanner({
	isOpen,
	inputRef,
	setBarcodeInput,
	setScannedItems,
	resetXml,
	playBeep,
}: UseMdlpHidScannerProps) {
	const bufferRef = useRef("");
	const lastKeyTimeRef = useRef(Date.now());

	useEffect(() => {
		if (!isOpen) return;

		const processBarcode = (rawCode: string, source: "сканером" | "из буфера") => {
			const trimmed = rawCode.trim();
			if (trimmed.length < 10) return;
			const newItem = createChestnyZnakScannedItem(trimmed, { costRub: 450 });
			setScannedItems((prev) => [newItem, ...prev]);
			setBarcodeInput("");
			resetXml();
			const isVerified = newItem.status === "verified";
			playBeep(isVerified);
			submitMdlpBarcodeScan(trimmed, true).catch(() => null);
			if (isVerified) {
				showToast(`Отсканировано ${source}: ${newItem.tradeName}`, "success");
			} else if (newItem.status === "warning") {
				showToast(`Внимание: ${newItem.statusReason}`, "warning");
			} else {
				showToast(`Ошибка маркировки: ${newItem.statusReason}`, "error");
			}
			inputRef.current?.focus();
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target && (target.id === "mdlp-doc-num-input" || target.id === "mdlp-doc-date-input" || target.tagName === "TEXTAREA")) {
				return;
			}

			const now = Date.now();
			const delta = now - lastKeyTimeRef.current;
			lastKeyTimeRef.current = now;

			if (e.key === "Enter") {
				if (bufferRef.current.length >= 10) {
					e.preventDefault();
					const code = bufferRef.current;
					bufferRef.current = "";
					processBarcode(code, "сканером");
				} else {
					bufferRef.current = "";
				}
				return;
			}

			if (e.key.length === 1) {
				// Если задержка > 120ms при непустом буфере, это медленный ручной ввод — сбрасываем
				if (delta > 120 && bufferRef.current.length > 0) {
					bufferRef.current = "";
				}
				bufferRef.current += e.key;
			}
		};

		const handlePaste = (e: ClipboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target && (target.id === "mdlp-doc-num-input" || target.id === "mdlp-doc-date-input" || target.tagName === "TEXTAREA")) {
				return;
			}
			const text = e.clipboardData?.getData("text")?.trim();
			if (text && text.length >= 10) {
				e.preventDefault();
				processBarcode(text, "из буфера");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("paste", handlePaste);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("paste", handlePaste);
		};
	}, [isOpen, inputRef, setBarcodeInput, setScannedItems, resetXml, playBeep]);
}
