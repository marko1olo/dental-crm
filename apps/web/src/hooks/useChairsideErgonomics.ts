/**
 * useChairsideErgonomics.ts — React Hook for Chairside Clinical Ergonomics & Hardware.
 *
 * Coordinates:
 * - Ctrl+V clipboard image paste anywhere
 * - Alt+H / Ctrl+Shift+H / Alt+Р patient privacy shield toggle
 * - USB 2D hardware barcode / DataMatrix sniffer
 * - Procedural tactile acoustic earcons
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
	setupClipboardImagePaste,
	setupHardwareBarcodeSniffer,
	setupPrivacyShieldHotkey,
	togglePatientPrivacyShield,
	isPatientPrivacyShieldActive,
	type PastedImageDetail,
	type ScannedBarcodeDetail,
} from "../lib/chairsideErgonomics";

export interface UseChairsideErgonomicsReturn {
	readonly lastPastedImage: PastedImageDetail | null;
	readonly isPastedToastOpen: boolean;
	readonly dismissPastedToast: () => void;
	readonly lastScannedBarcode: ScannedBarcodeDetail | null;
	readonly isBarcodeToastOpen: boolean;
	readonly dismissBarcodeToast: () => void;
	readonly isPrivacyShieldActive: boolean;
	readonly isPrivacyToastOpen: boolean;
	readonly dismissPrivacyToast: () => void;
	readonly togglePrivacyShield: (force?: boolean) => void;
	readonly attachPastedImageToVisit: () => void;
	readonly copyPastedImageDataUrl: () => Promise<boolean>;
}

export function useChairsideErgonomics(): UseChairsideErgonomicsReturn {
	const [lastPastedImage, setLastPastedImage] = useState<PastedImageDetail | null>(null);
	const [isPastedToastOpen, setIsPastedToastOpen] = useState<boolean>(false);

	const [lastScannedBarcode, setLastScannedBarcode] = useState<ScannedBarcodeDetail | null>(null);
	const [isBarcodeToastOpen, setIsBarcodeToastOpen] = useState<boolean>(false);

	const [isPrivacyActive, setIsPrivacyActive] = useState<boolean>(() => isPatientPrivacyShieldActive());
	const [isPrivacyToastOpen, setIsPrivacyToastOpen] = useState<boolean>(false);

	const pasteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const barcodeToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const privacyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const dismissPastedToast = useCallback(() => {
		setIsPastedToastOpen(false);
	}, []);

	const dismissBarcodeToast = useCallback(() => {
		setIsBarcodeToastOpen(false);
	}, []);

	const dismissPrivacyToast = useCallback(() => {
		setIsPrivacyToastOpen(false);
	}, []);

	const togglePrivacy = useCallback((force?: boolean) => {
		const next = togglePatientPrivacyShield(force);
		setIsPrivacyActive(next);
		setIsPrivacyToastOpen(true);
		if (privacyToastTimerRef.current) clearTimeout(privacyToastTimerRef.current);
		privacyToastTimerRef.current = setTimeout(() => setIsPrivacyToastOpen(false), 4000);
	}, []);

	// Attach pasted image to active visit
	const attachPastedImageToVisit = useCallback(() => {
		if (!lastPastedImage) return;

		window.dispatchEvent(
			new CustomEvent("dente:attach-photo-to-visit", {
				detail: {
					url: lastPastedImage.dataUrl,
					name: lastPastedImage.name,
					size: lastPastedImage.size,
					type: lastPastedImage.type,
					width: lastPastedImage.width,
					height: lastPastedImage.height,
				},
				bubbles: true,
			}),
		);

		setIsPastedToastOpen(false);
	}, [lastPastedImage]);

	const copyPastedImageDataUrl = useCallback(async (): Promise<boolean> => {
		if (!lastPastedImage?.dataUrl) return false;
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(lastPastedImage.dataUrl);
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}, [lastPastedImage]);

	useEffect(() => {
		const handlePastedDetail = (detail: PastedImageDetail) => {
			setLastPastedImage(detail);
			setIsPastedToastOpen(true);
			if (pasteToastTimerRef.current) clearTimeout(pasteToastTimerRef.current);
			pasteToastTimerRef.current = setTimeout(() => {
				setIsPastedToastOpen(false);
			}, 10000);
		};

		const handleScannedDetail = (detail: ScannedBarcodeDetail) => {
			setLastScannedBarcode(detail);
			// Mandate 8e, 8n, 8v: Chairside doctor isolation.
			// DataMatrix medication codes must be 100% invisible to the doctor at chairside.
			// They route automatically in the background to the senior nurse disposal queue without popups.
			if (detail.type === "datamatrix") {
				window.dispatchEvent(
					new CustomEvent("dente:mdlp-background-disposal-queued", {
						detail,
						bubbles: true,
					}),
				);
				return;
			}
			setIsBarcodeToastOpen(true);
			if (barcodeToastTimerRef.current) clearTimeout(barcodeToastTimerRef.current);
			barcodeToastTimerRef.current = setTimeout(() => {
				setIsBarcodeToastOpen(false);
			}, 6000);
		};

		// 1. Setup clipboard paste listener
		const cleanupPaste = setupClipboardImagePaste();

		// 2. Setup hardware barcode sniffer
		const cleanupBarcode = setupHardwareBarcodeSniffer();

		// 3. Setup Privacy Shield hotkey
		const cleanupPrivacyHotkey = setupPrivacyShieldHotkey();

		// Listen to custom events for native & external triggers
		const handlePasteEvent = (e: Event) => {
			const custom = e as CustomEvent<PastedImageDetail>;
			if (custom.detail) handlePastedDetail(custom.detail);
		};
		const handleBarcodeEvent = (e: Event) => {
			const custom = e as CustomEvent<ScannedBarcodeDetail>;
			if (custom.detail) handleScannedDetail(custom.detail);
		};
		const handlePrivacyEvent = (e: Event) => {
			const custom = e as CustomEvent<{ active: boolean }>;
			if (custom.detail) {
				setIsPrivacyActive(custom.detail.active);
				setIsPrivacyToastOpen(true);
				if (privacyToastTimerRef.current) clearTimeout(privacyToastTimerRef.current);
				privacyToastTimerRef.current = setTimeout(() => {
					setIsPrivacyToastOpen(false);
				}, 4000);
			}
		};

		window.addEventListener("dente:clipboard-image-pasted", handlePasteEvent);
		window.addEventListener("dente:barcode-scanned", handleBarcodeEvent);
		window.addEventListener("dente:privacy-shield-toggled", handlePrivacyEvent);

		return () => {
			cleanupPaste();
			cleanupBarcode();
			cleanupPrivacyHotkey();
			window.removeEventListener("dente:clipboard-image-pasted", handlePasteEvent);
			window.removeEventListener("dente:barcode-scanned", handleBarcodeEvent);
			window.removeEventListener("dente:privacy-shield-toggled", handlePrivacyEvent);
			if (pasteToastTimerRef.current) clearTimeout(pasteToastTimerRef.current);
			if (barcodeToastTimerRef.current) clearTimeout(barcodeToastTimerRef.current);
			if (privacyToastTimerRef.current) clearTimeout(privacyToastTimerRef.current);
		};
	}, []);

	return {
		lastPastedImage,
		isPastedToastOpen,
		dismissPastedToast,
		lastScannedBarcode,
		isBarcodeToastOpen,
		dismissBarcodeToast,
		isPrivacyShieldActive: isPrivacyActive,
		isPrivacyToastOpen,
		dismissPrivacyToast,
		togglePrivacyShield: togglePrivacy,
		attachPastedImageToVisit,
		copyPastedImageDataUrl,
	};
}
