/**
 * useDicomClickOutside.ts — Хук закрытия выпадающих панелей при клике вне их области
 * Mandate 8b: строго <= 120 строк.
 */

import { useEffect, type RefObject } from "react";

interface Refs {
	measureMenuRef: RefObject<HTMLDivElement | null>;
	windowPanelRef: RefObject<HTMLDivElement | null>;
	clippingPanelRef: RefObject<HTMLDivElement | null>;
	setIsMeasureMenuOpen: (v: boolean) => void;
	setIsWindowPanelOpen: (v: boolean) => void;
	setIsClippingPanelOpen: (v: boolean) => void;
}

export function useDicomClickOutside({
	measureMenuRef,
	windowPanelRef,
	clippingPanelRef,
	setIsMeasureMenuOpen,
	setIsWindowPanelOpen,
	setIsClippingPanelOpen,
}: Refs) {
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (measureMenuRef.current && !measureMenuRef.current.contains(target)) {
				setIsMeasureMenuOpen(false);
			}
			if (
				windowPanelRef.current &&
				!windowPanelRef.current.contains(target) &&
				!(target as HTMLElement).closest("#btn-ez3d-window-panel") &&
				!(target as HTMLElement).closest("#btn-dicom-window-panel")
			) {
				setIsWindowPanelOpen(false);
			}
			if (
				clippingPanelRef.current &&
				!clippingPanelRef.current.contains(target) &&
				!(target as HTMLElement).closest("#btn-ez3d-clipping-panel") &&
				!(target as HTMLElement).closest("#btn-dicom-clipping-panel")
			) {
				setIsClippingPanelOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [measureMenuRef, windowPanelRef, clippingPanelRef, setIsMeasureMenuOpen, setIsWindowPanelOpen, setIsClippingPanelOpen]);
}
