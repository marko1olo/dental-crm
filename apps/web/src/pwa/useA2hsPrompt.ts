/**
 * DENTE CRM — Add to Home Screen (A2HS) Installation Hook
 * (DOMAIN: PWA INSTALLATION, BEFOREINSTALLPROMPT INTERCEPTION & APPLE HEALTH UX)
 */

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
	prompt(): Promise<void>;
}

export const A2HS_DISMISSED_STORAGE_KEY = "dente_a2hs_dismissed_at_ms";
const DEFAULT_COOLDOWN_DAYS = 7;

export interface UseA2hsPromptResult {
	isInstallable: boolean;
	isInstalled: boolean;
	isIos: boolean;
	isPromptOpen: boolean;
	openPrompt: () => void;
	closePrompt: () => void;
	dismissForCooldown: (days?: number) => void;
	installApp: () => Promise<boolean>;
}

export function useA2hsPrompt(): UseA2hsPromptResult {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
	const [isInstalled, setIsInstalled] = useState<boolean>(false);
	const [isIos, setIsIos] = useState<boolean>(false);
	const [isPromptOpen, setIsPromptOpen] = useState<boolean>(false);

	// Check environment and standalone mode
	useEffect(() => {
		if (typeof window === "undefined" || typeof navigator === "undefined") return;

		const isStandaloneMode =
			window.matchMedia("(display-mode: standalone)").matches ||
			// @ts-expect-error - iOS Safari standalone property
			Boolean(navigator.standalone);

		setIsInstalled(isStandaloneMode);

		const isAppleIos =
			/iPad|iPhone|iPod/.test(navigator.userAgent) &&
			// @ts-expect-error - MSStream check for IE
			!window.MSStream;

		setIsIos(isAppleIos);

		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e as BeforeInstallPromptEvent);
		};

		const handleAppInstalled = () => {
			setIsInstalled(true);
			setDeferredPrompt(null);
			setIsPromptOpen(false);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		window.addEventListener("appinstalled", handleAppInstalled);

		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
			window.removeEventListener("appinstalled", handleAppInstalled);
		};
	}, []);

	const openPrompt = useCallback(() => {
		setIsPromptOpen(true);
	}, []);

	const closePrompt = useCallback(() => {
		setIsPromptOpen(false);
	}, []);

	const dismissForCooldown = useCallback((days = DEFAULT_COOLDOWN_DAYS) => {
		setIsPromptOpen(false);
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				const expiryMs = Date.now() + days * 24 * 60 * 60 * 1000;
				window.localStorage.setItem(A2HS_DISMISSED_STORAGE_KEY, String(expiryMs));
			}
		} catch {
			// ignore
		}
	}, []);

	const installApp = useCallback(async (): Promise<boolean> => {
		if (!deferredPrompt) {
			return false;
		}

		try {
			await deferredPrompt.prompt();
			const choiceResult = await deferredPrompt.userChoice;
			if (choiceResult.outcome === "accepted") {
				setIsInstalled(true);
				setDeferredPrompt(null);
				setIsPromptOpen(false);
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}, [deferredPrompt]);

	const isInstallable = (!isInstalled && (Boolean(deferredPrompt) || isIos));

	return {
		isInstallable,
		isInstalled,
		isIos,
		isPromptOpen,
		openPrompt,
		closePrompt,
		dismissForCooldown,
		installApp,
	};
}
