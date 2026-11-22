import { create } from "zustand";
import { createModalsAndSelectionSlice } from "./createModalsAndSelectionSlice";
import { createNavigationAndThemeSlice } from "./createNavigationAndThemeSlice";
import { createNotificationsAndSyncSlice } from "./createNotificationsAndSyncSlice";
import type { AppStore } from "./types";
export type { AppStore, AppState } from "./types";
export * from "./types";

export const useAppStore = create<AppStore>((...a) => ({
	...createNavigationAndThemeSlice(...a),
	...createModalsAndSelectionSlice(...a),
	...createNotificationsAndSyncSlice(...a),
}));

declare global {
	interface Window {
		__APP_STORE__?: typeof useAppStore;
		__useAppStore?: typeof useAppStore;
	}
}

if (typeof window !== "undefined") {
	window.__APP_STORE__ = useAppStore;
	window.__useAppStore = useAppStore;
}

export * from "../inventoryStore.js";
export * from "./createModalsAndSelectionSlice";
export * from "./createNavigationAndThemeSlice";
export * from "./createNotificationsAndSyncSlice";
export * from "./initialAppState";
export * from "./types";
