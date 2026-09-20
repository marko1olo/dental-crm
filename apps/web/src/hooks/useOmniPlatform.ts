/**
 * DENTE CRM — React Hook for Omni-Platform Awareness
 *
 * Provides reactive platform context, pointer type, form factor, and ergonomics.
 * Automatically synchronizes `data-platform`, `data-pointer`, and `data-form-factor` on <html>.
 */

import { useEffect, useState } from "react";
import {
	getOmniPlatformInfo,
	syncPlatformDomAttributes,
	type OmniPlatformInfo,
} from "../lib/omniPlatformAdapter";

export function useOmniPlatform(): OmniPlatformInfo {
	const [info, setInfo] = useState<OmniPlatformInfo>(() => {
		const initial = getOmniPlatformInfo();
		syncPlatformDomAttributes(initial);
		return initial;
	});

	useEffect(() => {
		if (typeof window === "undefined") return;

		const updateInfo = () => {
			const updated = getOmniPlatformInfo();
			syncPlatformDomAttributes(updated);
			setInfo((prev) => {
				// Compare primary scalar fields to avoid unnecessary re-renders
				if (
					prev.environment === updated.environment &&
					prev.pointerType === updated.pointerType &&
					prev.formFactor === updated.formFactor &&
					prev.safeArea.top === updated.safeArea.top &&
					prev.safeArea.bottom === updated.safeArea.bottom &&
					prev.safeArea.left === updated.safeArea.left &&
					prev.safeArea.right === updated.safeArea.right
				) {
					return prev;
				}
				return updated;
			});
		};

		// 1. Listen to window resize and orientation
		window.addEventListener("resize", updateInfo, { passive: true });
		window.addEventListener("orientationchange", updateInfo, { passive: true });

		// 2. Listen to pointer coarse / fine transition (e.g. tablet docked to keyboard/mouse)
		let pointerCoarseQuery: MediaQueryList | null = null;
		let standaloneQuery: MediaQueryList | null = null;

		if (window.matchMedia) {
			try {
				pointerCoarseQuery = window.matchMedia("(pointer: coarse)");
				pointerCoarseQuery.addEventListener?.("change", updateInfo);
			} catch {
				// Old browser fallback
			}

			try {
				standaloneQuery = window.matchMedia("(display-mode: standalone)");
				standaloneQuery.addEventListener?.("change", updateInfo);
			} catch {
				// Old browser fallback
			}
		}

		return () => {
			window.removeEventListener("resize", updateInfo);
			window.removeEventListener("orientationchange", updateInfo);
			pointerCoarseQuery?.removeEventListener?.("change", updateInfo);
			standaloneQuery?.removeEventListener?.("change", updateInfo);
		};
	}, []);

	return info;
}
