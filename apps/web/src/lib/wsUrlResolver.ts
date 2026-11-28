/**
 * apps/web/src/lib/wsUrlResolver.ts
 *
 * Dynamic WebSocket URL resolver for clinic workstations, LAN tablets, and Capacitor PWA.
 * Eliminates hardcoded localhost:4100 / 127.0.0.1:4100 URLs (Mandate 8n / LAN Wi-Fi).
 */

import {
	STORAGE_KEY_ACTIVE_BASE_URL,
	STORAGE_KEY_LAN_SERVER,
} from "../services/lanDiscovery/lanStorageState";
import { safeLocalStorageGetItem } from "./safeLocalStorage";

export interface WsLocationLike {
	readonly protocol: string;
	readonly host: string;
	readonly hostname: string;
	readonly port?: string | undefined;
	readonly search?: string | undefined;
}

export interface ResolveWsUrlOptions {
	readonly envWsUrl?: string | undefined;
	readonly envApiOrigin?: string | undefined;
	readonly lanServerUrl?: string | null | undefined;
	readonly activeBaseUrl?: string | null | undefined;
	readonly location?: WsLocationLike | null | undefined;
}

function readImportMetaEnvValue(key: "VITE_WS_URL" | "VITE_API_ORIGIN"): string | undefined {
	try {
		const raw = import.meta.env?.[key];
		return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
	} catch {
		return undefined;
	}
}

function normalizeWsPath(wsPath: string): string {
	if (!wsPath) return "/api/ws/schedule";
	return wsPath.startsWith("/") ? wsPath : `/${wsPath}`;
}

function convertOriginToWsUrl(rawOrigin: string, wsPath: string): string | null {
	const trimmed = rawOrigin.trim();
	if (!trimmed) return null;
	try {
		const parsed = new URL(trimmed);
		const scheme =
			parsed.protocol === "https:" || parsed.protocol === "wss:"
				? "wss:"
				: parsed.protocol === "http:" || parsed.protocol === "ws:"
					? "ws:"
					: null;
		if (!scheme || !parsed.host) return null;
		return `${scheme}//${parsed.host}${normalizeWsPath(wsPath)}`;
	} catch {
		return null;
	}
}

function resolveLanOriginForWs(options?: ResolveWsUrlOptions): string | null {
	const activeBase =
		options && "activeBaseUrl" in options
			? options.activeBaseUrl?.trim()
			: safeLocalStorageGetItem(STORAGE_KEY_ACTIVE_BASE_URL)?.trim();
	if (activeBase && activeBase !== "/api" && /^https?:\/\//i.test(activeBase)) {
		return activeBase.replace(/\/api\/?$/, "");
	}

	const lanServer =
		options && "lanServerUrl" in options
			? options.lanServerUrl?.trim()
			: safeLocalStorageGetItem(STORAGE_KEY_LAN_SERVER)?.trim();
	if (lanServer && /^https?:\/\//i.test(lanServer)) {
		return lanServer.replace(/\/+$/, "");
	}

	const loc =
		options && "location" in options
			? options.location
			: typeof window !== "undefined"
				? window.location
				: null;
	if (loc?.search) {
		const paramServer = new URLSearchParams(loc.search).get("clinic_server")?.trim();
		if (paramServer && /^https?:\/\//i.test(paramServer)) {
			return paramServer.replace(/\/+$/, "");
		}
	}

	return null;
}

/**
 * Resolves primary WebSocket URL for the requested endpoint path (e.g. `/api/ws/schedule` or `/api/ws/telephony`).
 * Priority:
 * 1. Explicit `VITE_WS_URL` (normalizing `/api/ws/*` path if needed)
 * 2. Configured LAN server (`dente_active_api_base_url` / `dente_lan_server_url` / `?clinic_server=`)
 * 3. Current `window.location.host` (preserving `https:` -> `wss:`, `http:` -> `ws:`, mapping Vite `:5173` proxy or prod same-origin)
 */
export function resolveClinicWsUrl(
	wsPath: string = "/api/ws/schedule",
	options?: ResolveWsUrlOptions,
): string {
	const normalizedPath = normalizeWsPath(wsPath);
	const configuredWsUrl =
		options && "envWsUrl" in options
			? options.envWsUrl?.trim()
			: readImportMetaEnvValue("VITE_WS_URL");

	if (configuredWsUrl) {
		try {
			const parsed = new URL(configuredWsUrl);
			const scheme =
				parsed.protocol === "https:" || parsed.protocol === "wss:"
					? "wss:"
					: "ws:";
			if (
				parsed.pathname === "/" ||
				parsed.pathname === "" ||
				parsed.pathname.startsWith("/api/ws/")
			) {
				return `${scheme}//${parsed.host}${normalizedPath}`;
			}
			return configuredWsUrl;
		} catch {
			return configuredWsUrl;
		}
	}

	const lanOrigin = resolveLanOriginForWs(options);
	if (lanOrigin) {
		const lanWs = convertOriginToWsUrl(lanOrigin, normalizedPath);
		if (lanWs) return lanWs;
	}

	const loc =
		options && "location" in options
			? options.location
			: typeof window !== "undefined"
				? window.location
				: null;

	if (!loc || !loc.host || (loc.protocol !== "http:" && loc.protocol !== "https:")) {
		return "";
	}

	const scheme = loc.protocol === "https:" ? "wss:" : "ws:";
	return `${scheme}//${loc.host}${normalizedPath}`;
}

/**
 * Resolves direct API WebSocket fallback URL when Vite dev server (:5173) runs without WS proxy.
 * Uses `VITE_API_ORIGIN`, configured LAN server, or current `window.location.hostname:4100`
 * (never hardcoded `127.0.0.1` for LAN tablet clients).
 */
export function resolveClinicFallbackWsUrl(
	wsPath: string = "/api/ws/telephony",
	options?: ResolveWsUrlOptions,
): string {
	const normalizedPath = normalizeWsPath(wsPath);
	const configuredWsUrl =
		options && "envWsUrl" in options
			? options.envWsUrl?.trim()
			: readImportMetaEnvValue("VITE_WS_URL");
	if (configuredWsUrl) {
		return "";
	}

	const configuredApiOrigin =
		options && "envApiOrigin" in options
			? options.envApiOrigin?.trim()
			: readImportMetaEnvValue("VITE_API_ORIGIN");
	if (configuredApiOrigin) {
		const explicitWs = convertOriginToWsUrl(configuredApiOrigin, normalizedPath);
		if (explicitWs) return explicitWs;
	}

	const lanOrigin = resolveLanOriginForWs(options);
	if (lanOrigin) {
		const lanWs = convertOriginToWsUrl(lanOrigin, normalizedPath);
		if (lanWs) return lanWs;
	}

	const loc =
		options && "location" in options
			? options.location
			: typeof window !== "undefined"
				? window.location
				: null;
	if (!loc || !loc.hostname || (loc.protocol !== "http:" && loc.protocol !== "https:")) {
		return "";
	}

	const scheme = loc.protocol === "https:" ? "wss:" : "ws:";
	// Only add :4100 fallback when running via Vite dev ports (5173 / 4173)
	if (loc.port === "5173" || loc.port === "4173") {
		return `${scheme}//${loc.hostname}:4100${normalizedPath}`;
	}
	return `${scheme}//${loc.host}${normalizedPath}`;
}
