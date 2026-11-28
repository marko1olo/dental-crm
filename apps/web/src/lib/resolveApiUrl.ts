import { resolveConfiguredLanBaseOrigin } from "./apiAuthFetch";

const DEFAULT_LOCAL_API_ORIGIN = "http://127.0.0.1:3000";

function isHttpOrigin(origin: string | undefined | null): origin is string {
	return Boolean(origin && (origin.startsWith("http://") || origin.startsWith("https://")));
}

/**
 * Resolves a backend API path to an absolute HTTP(S) URL.
 * Works safely across standard web origins, non-HTTP Electron/file:// shells,
 * jsdom/about:blank environments, and Node unit tests.
 */
export function resolveApiOrigin(explicitBaseUrl?: string | null): string {
	const trimmedExplicit = explicitBaseUrl?.trim().replace(/\/+$/, "");
	if (isHttpOrigin(trimmedExplicit)) {
		return trimmedExplicit;
	}

	const lanOrigin = resolveConfiguredLanBaseOrigin()?.trim().replace(/\/+$/, "");
	if (isHttpOrigin(lanOrigin)) {
		return lanOrigin;
	}

	if (typeof window !== "undefined" && isHttpOrigin(window.location?.origin)) {
		return window.location.origin.replace(/\/+$/, "");
	}

	return DEFAULT_LOCAL_API_ORIGIN;
}

export function resolveApiUrl(path: string, explicitBaseUrl?: string | null): string {
	const trimmed = path.trim();
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}
	const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	return `${resolveApiOrigin(explicitBaseUrl)}${normalizedPath}`;
}
