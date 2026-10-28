import { logger } from "../../utils/logger";
import { isLocalOrLanHostname } from "../../utils/networkConnectivity";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import {
	STORAGE_KEY_ACTIVE_BASE_URL,
	activeApiBaseUrl,
	setActiveBaseUrlState,
} from "./lanStorageState";
import { discoverLocalClinicServer } from "./lanProbeCore";
import { lanHeartbeatManager } from "./lanHeartbeatEngine";

export function getActiveApiBaseUrl(): string {
	return activeApiBaseUrl;
}

export function setActiveApiBaseUrl(url: string): void {
	const hasChanged = activeApiBaseUrl !== url;
	setActiveBaseUrlState(url);
	if (hasChanged) {
		const currentStored = safeLocalStorageGetItem(STORAGE_KEY_ACTIVE_BASE_URL);
		if (currentStored !== url) {
			try {
				safeLocalStorageSetItem(STORAGE_KEY_ACTIVE_BASE_URL, url, true);
			} catch (err: unknown) {
				logger.warn("[LanDiscovery] Failed to persist active API base URL:", err);
			}
		}
	}
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(new CustomEvent("dente:api-base-url-changed", { detail: { url } }));
		} catch (err: unknown) {
			logger.warn("[LanDiscovery] Failed to dispatch api-base-url-changed event:", err);
		}
	}
}

export function isUsingLocalFallbackServer(): boolean {
	return activeApiBaseUrl !== "/api" && activeApiBaseUrl.includes("://");
}

export async function switchApiToLocalLanServer(): Promise<boolean> {
	const server = await discoverLocalClinicServer({ forceRefresh: true });
	if (server) {
		const targetApiUrl = `${server.baseUrl}/api`;
		setActiveApiBaseUrl(targetApiUrl);
		logger.info(`[LanDiscovery] Switched API endpoint to Local Clinic Server: ${targetApiUrl}`);
		return true;
	}
	return false;
}

export function resetApiToCloud(): void {
	setActiveApiBaseUrl("/api");
	logger.info("[LanDiscovery] Restored API endpoint to Cloud / Default Proxy");
}

export function createLanFailoverFetch(
	baseFetch: typeof fetch = typeof fetch !== "undefined" ? fetch : (() => Promise.reject(new Error("fetch undefined"))) as unknown as typeof fetch,
): typeof fetch {
	return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		try {
			const res = await baseFetch(input, init);
			lanHeartbeatManager.setCloudReachable(true);
			return res;
		} catch (networkErr) {
			const urlStr =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: (input as Request).url;

			const isLocalOrLan =
				urlStr.startsWith("/") ||
				isLocalOrLanHostname(new URL(urlStr, "http://localhost").hostname);

			if (urlStr.startsWith("/api") || !isLocalOrLan) {
				logger.warn("[LanDiscovery] Cloud request failed, switching to fast LAN discovery heartbeat...", networkErr);
				lanHeartbeatManager.setCloudReachable(false);
				const discovered = await discoverLocalClinicServer({ forceRefresh: true });
				if (discovered) {
					const targetUrl = urlStr.startsWith("/api")
						? `${discovered.baseUrl}${urlStr}`
						: urlStr.replace(/^https?:\/\/[^/]+/, discovered.baseUrl);
					logger.info(`[LanDiscovery] Retrying request on local clinic server: ${targetUrl}`);
					setActiveApiBaseUrl(`${discovered.baseUrl}/api`);
					return await baseFetch(targetUrl, init);
				}
			}
			throw networkErr;
		}
	}) as typeof fetch;
}
