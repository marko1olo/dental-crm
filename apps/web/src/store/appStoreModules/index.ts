import { create } from "zustand";
import { createModalsAndSelectionSlice } from "./createModalsAndSelectionSlice";
import { createNavigationAndThemeSlice } from "./createNavigationAndThemeSlice";
import { createNotificationsAndSyncSlice } from "./createNotificationsAndSyncSlice";
import type { AppStore } from "./types";

export const useAppStore = create<AppStore>((...a) => ({
	...createNavigationAndThemeSlice(...a),
	...createModalsAndSelectionSlice(...a),
	...createNotificationsAndSyncSlice(...a),
}));

if (typeof window !== "undefined") {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	(window as any).__APP_STORE__ = useAppStore;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	(window as any).__useAppStore = useAppStore;
}

export * from "../inventoryStore.js";
export * from "./createModalsAndSelectionSlice";
export * from "./createNavigationAndThemeSlice";
export * from "./createNotificationsAndSyncSlice";
export * from "./initialAppState";
export * from "./types";
