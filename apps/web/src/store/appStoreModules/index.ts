import { create } from "zustand";
import { usePatientStore } from "../patientStore";
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

// Единый SSOT выбранного пациента (Мандат 8zq/8bn): двусторонняя синхронизация
// без split-brain между usePatientStore.selectedPatientId и useAppStore.activePatientId.
// Инициализация отложена через queueMicrotask во избежание TDZ цикла ESM
// (patientStore -> visitStore -> billingInvoiceSlice -> appStoreModules -> patientStore).
let patientSelectionBridgeInitialized = false;
function initPatientSelectionBridge(): void {
	if (patientSelectionBridgeInitialized) return;
	patientSelectionBridgeInitialized = true;

	const initialSelectedPatientId = usePatientStore.getState().selectedPatientId;
	if (useAppStore.getState().activePatientId !== initialSelectedPatientId) {
		useAppStore.setState({ activePatientId: initialSelectedPatientId });
	}

	usePatientStore.subscribe((state, prevState) => {
		if (state.selectedPatientId !== prevState.selectedPatientId) {
			if (useAppStore.getState().activePatientId !== state.selectedPatientId) {
				useAppStore.setState({ activePatientId: state.selectedPatientId });
			}
		}
	});

	useAppStore.subscribe((state, prevState) => {
		if (state.activePatientId !== prevState.activePatientId) {
			if (usePatientStore.getState().selectedPatientId !== state.activePatientId) {
				usePatientStore.getState().setSelectedPatientId(state.activePatientId);
			}
		}
	});
}

queueMicrotask(initPatientSelectionBridge);

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
