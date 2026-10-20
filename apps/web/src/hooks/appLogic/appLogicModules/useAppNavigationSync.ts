import { useCallback, useEffect, useState } from "react";
import { viewFromHash } from "../../../utils/routeUtils";
import type { AppView, SettingsTab } from "../../../utils/routeUtils";
import type { AppLogicNavigationSyncState } from "./appLogicStateTypes";

export interface UseAppNavigationSyncProps {
	dashboard?: any;
	currentView: AppView;
	setCurrentView: (view: AppView | ((prev: AppView) => AppView)) => void;
	setSettingsTab?: (tab: SettingsTab | string | ((prev: string) => string)) => void;
}

/**
 * Синхронизация глубоких ссылок роутинга (deep-links), хешей URL и истории браузера.
 * Предотвращает рассинхрон между вкладками и кнопками браузера Вперёд/Назад.
 */
export function useAppNavigationSync({
	currentView,
	setCurrentView,
	setSettingsTab,
}: UseAppNavigationSyncProps): AppLogicNavigationSyncState {
	const [currentHash, setCurrentHash] = useState<string>(() => {
		return typeof window !== "undefined" ? window.location.hash : "";
	});

	const syncViewFromHash = useCallback(
		(hash: string) => {
			const resolved = viewFromHash(hash);
			if (resolved) {
				setCurrentView(resolved);
				const parts = hash.replace(/^#/, "").split("/");
				if (resolved === "settings" && parts[1] && setSettingsTab) {
					setSettingsTab(parts[1]);
				}
			}
		},
		[setCurrentView, setSettingsTab],
	);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleHashChange = () => {
			const hash = window.location.hash;
			setCurrentHash(hash);
			syncViewFromHash(hash);
		};

		window.addEventListener("hashchange", handleHashChange);
		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [syncViewFromHash]);

	const navigateWithDeepLink = useCallback(
		(view: AppView, tab?: SettingsTab | string) => {
			setCurrentView(view);
			if (tab && setSettingsTab) {
				setSettingsTab(tab);
			}
			if (typeof window !== "undefined") {
				const targetHash = tab && view === "settings" ? `#settings/${tab}` : `#${view}`;
				if (window.location.hash !== targetHash) {
					window.location.hash = targetHash;
				}
			}
		},
		[setCurrentView, setSettingsTab],
	);

	return {
		currentHash,
		syncViewFromHash,
		navigateWithDeepLink,
	};
}
