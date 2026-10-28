import { logger } from "../../utils/logger";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import type { DiscoveredLanServer } from "./types";

export const STORAGE_KEY_LAN_SERVER = "dente_lan_server_url";
export const STORAGE_KEY_ACTIVE_BASE_URL = "dente_active_api_base_url";

export let cachedDiscoveredServer: DiscoveredLanServer | null = null;
export let activeApiBaseUrl: string =
	safeLocalStorageGetItem(STORAGE_KEY_ACTIVE_BASE_URL) || "/api";

export function setCachedDiscoveredServer(server: DiscoveredLanServer | null): void {
	cachedDiscoveredServer = server;
}

export function setActiveBaseUrlState(url: string): void {
	activeApiBaseUrl = url;
}

export function getStorage(): Storage | null {
	try {
		if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
		if (typeof globalThis !== "undefined" && (globalThis as { localStorage?: Storage }).localStorage) {
			return (globalThis as { localStorage: Storage }).localStorage;
		}
	} catch (err: unknown) {
		logger.warn("[LanDiscovery] Failed to access storage:", err);
	}
	return null;
}

export function persistDiscoveredServer(bestServer: DiscoveredLanServer): void {
	cachedDiscoveredServer = bestServer;
	const currentStored = safeLocalStorageGetItem(STORAGE_KEY_LAN_SERVER);
	if (currentStored !== bestServer.baseUrl) {
		try {
			safeLocalStorageSetItem(STORAGE_KEY_LAN_SERVER, bestServer.baseUrl, true);
			const storage = getStorage();
			if (storage) {
				storage.setItem(STORAGE_KEY_LAN_SERVER, bestServer.baseUrl);
			}
		} catch (err: unknown) {
			logger.warn("[LanDiscovery] Failed to persist best server to storage:", err);
		}
	}
	logger.info(
		`[LanDiscovery] Found active Clinic LAN Server at ${bestServer.baseUrl} (${bestServer.latencyMs}ms)`,
	);
}
